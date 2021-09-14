Take ["Asset", "FileTree", "IPC", "Job", "Log", "Memory", "Paths", "Ports", "Read", "Write"], (Asset, FileTree, IPC, Job, Log, Memory, Paths, Ports, Read, Write)->

  Ports.on "New Asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Memory "assets.#{id}", Asset.new path # Update Memory
    Write.sync.mkdir path # Update Disk
    IPC.send "open-asset", id
    return id

  Ports.on "Delete Asset", (assetId)->
    return unless asset = Memory "assets.#{assetId}"
    Memory "assets.#{assetId}", null # Update Memory
    Write.sync.rm asset.path # Update Disk

  Ports.on "Rename Asset", (assetId, v)->
    return unless asset = Memory "assets.#{assetId}"
    Memory "assets.#{assetId}.name", v # Update Memory
    Write.sync.array Paths.names(asset), [v] # Update Disk

  Ports.on "Add Tag", (assetId, tag)->
    return unless asset = Memory "assets.#{assetId}"
    Memory.update "assets.#{assetId}.tags", (tags)-> # Update Memory
      Array.sortAlphabetic tags.concat tag
    Write.sync.mkdir Paths.tag asset, tag # Update Disk

  Ports.on "Remove Tag", (assetId, tag)->
    return unless asset = Memory "assets.#{assetId}"
    Memory.mutate "assets.#{assetId}.tags", (tags)-> # Update Memory
      Array.pull tags, tag
    Write.sync.rm Paths.tag asset, tag # Update Disk

  Ports.on "Add Files", (assetId, newFiles)->
    return unless asset = Memory "assets.#{assetId}"
    assetFilesPath = Paths.files asset
    Write.sync.mkdir assetFilesPath
    for file in newFiles
      Write.async.copyInto file, assetFilesPath
    null

  Ports.on "Delete File", (assetId, relpath)->
    return unless asset = Memory "assets.#{assetId}"
    return unless file = FileTree.find asset.files, "relpath", relpath
    # Updating Memory would be complex, so we'll just let watch-assets catch this one
    Write.sync.rm file.path # Update Disk

  Ports.on "Rename File", (assetId, relpath, v)->
    return unless asset = Memory "assets.#{assetId}"
    return unless file = FileTree.find asset.files, "relpath", relpath
    # Updating Memory would be complex, so we'll just let watch-assets catch this one
    Write.sync.rename file.path, v # Update Disk

  Ports.on "Set Thumbnail", (assetId, relpath)->
    return unless asset = Memory "assets.#{assetId}"
    return unless file = FileTree.find asset.files, "relpath", relpath
    return if file.name is asset.newShot
    # We'll just let watch-assets handle updating newShot in Memory
    # Update Disk
    newShotsFolder = Paths.newShots asset
    Write.sync.rm newShotsFolder
    Write.sync.mkdir newShotsFolder
    Write.sync.copyFile file.path, Read.path newShotsFolder, Read.last file.path

  Ports.on "Rebuild Thumbnail", (assetId)->
    return unless asset = Memory "assets.#{assetId}"
    Job 1, "Rebuild Asset Thumbnail", asset, true

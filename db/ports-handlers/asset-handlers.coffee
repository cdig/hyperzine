Take ["Asset", "FileTree", "IPC", "Log", "Memory", "Paths", "Ports", "Read", "Write"], (Asset, FileTree, IPC, Log, Memory, Paths, Ports, Read, Write)->

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
    if asset = Memory "assets.#{assetId}"
      Memory "assets.#{assetId}", null # Update Memory
      Write.sync.rm asset.path # Update Disk

  Ports.on "Rename Asset", (assetId, v)->
    if asset = Memory "assets.#{assetId}"
      Memory "assets.#{assetId}.name", v # Update Memory
      Write.sync.array Paths.names(asset), [v] # Update Disk

  Ports.on "Add Tag", (assetId, tag)->
    if asset = Memory "assets.#{assetId}"
      tags = Memory "assets.#{asset.id}.tags"
      tags.push tag
      Memory "assets.#{asset.id}.tags", Array.sortAlphabetic tags # Update Memory
      Write.sync.mkdir Paths.tag asset, tag # Update Disk

  Ports.on "Remove Tag", (assetId, tag)->
    if asset = Memory "assets.#{assetId}"
      tags = Memory "assets.#{asset.id}.tags"
      Array.pull tags, tag
      Memory "assets.#{asset.id}.tags", tags # Update Memory
      Write.sync.rm Paths.tag asset, tag # Update Disk

  Ports.on "Delete File", (assetId, relpath)->
    if asset = Memory "assets.#{assetId}"
      if file = FileTree.find asset.files, "relpath", relpath
        # Updating Memory would be complex, so we'll just let watch-assets catch this one
        Write.sync.rm file.path # Update Disk
        # TODO — job to clean up now-useless thumbnails?

  Ports.on "Rename File", (assetId, relpath, v)->
    if asset = Memory "assets.#{assetId}"
      if file = FileTree.find asset.files, "relpath", relpath
        # Not sure if it'd be complex to update Memory or not. Hmm.
        Write.sync.rename file.path, v # Update Disk
        # TODO — job to clean up now-useless thumbnails?

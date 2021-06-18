Take ["Debounced", "Log", "Memory", "Read", "Write"], (Debounced, Log, Memory, Read, Write)->

  enabled = false
  changed = {}
  permittedKeys = name: "Name", shot: "Shot", tags: "Tags"#, files: "Files"

  update = Debounced.raf ()->
    for id, changes of changed
      if changes? then updateAsset id, changes else deleteAsset id
    changed = {}

  deleteAsset = (id)->
    return unless id?.length > 0
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, id
    if Read(path)?
      Write.sync.rm path

  updateAsset = (id, changes)->
    for k, v of changes
      folder = permittedKeys[k]
      continue unless folder # The change was an asset property that doesn't get saved
      if v?
        updateProperty id, folder, v
      else
        deleteProperty id, folder
    null

  updateProperty = (id, folder, v)->
    v = [v] unless v instanceof Array
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, id, folder
    Write.sync.array path, v

  deleteProperty = (id, folder)->
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, id, folder
    current = Read path
    return unless current?.length > 0
    path = Read.path path, current[0] if current.length is 1
    Write.sync.rm path

  Memory.subscribe "assets", false, (assets, changedAssets)->
    return unless enabled # Persisting changes will be paused during big loads
    changed = Object.merge changed, changedAssets
    update()

  Make "WriteAssets", WriteAssets =
    enable: (enable = true)-> enabled = enable

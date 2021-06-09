Take ["Debounced", "Log", "Memory", "Ports", "Read", "Write"], (Debounced, Log, Memory, Ports, Read, Write)->

  Ports.on "new-asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Write.sync.mkdir path
    return id

  enabled = false
  changed = {}
  permittedKeys = name: "Name", shot: "Shot"#, tags: "Tags", files: "Files"
  validName = (name)-> -1 is name.search /[^\w &-(),]/

  update = Debounced 500, ()->
    for id, changes of changed
      if changes? then updateAsset id, changes else deleteAsset id
    changed = {}

  deleteAsset = (id)->
    Log "TODO Delete #{id}"

  updateAsset = (id, changes)->
    for k, v of changes
      Log "Write Assets #{id}/#{k}/#{v}"
      folder = permittedKeys[k]
      if not folder # The change was an asset property that doesn't get saved
        # Log "No persist #{id} . #{k}"
        continue
      if v?
        updateProperty id, folder, v
      else
        deleteProperty id, folder
    null

  deleteProperty = (id, folder)->
    assetsFolder = Memory "assetsFolder"
    kPath = Read.path assetsFolder, id, folder
    if Read(kPath)?
      try
        Write.sync.rm kPath
        Log "rm #{id}/#{folder}"
      catch
        throw Error "Failed to rm #{kPath}"

  updateProperty = (id, folder, v)->
    assetsFolder = Memory "assetsFolder"
    unless validName v
      Log "Can't write value #{v} to the filesystem (see console.log)"
      console.log id
      console.log folder
      console.log v
      return

    kPath = Read.path assetsFolder, id, folder
    vPath = Read.path kPath, v
    # Log "kPath #{Read.path id, folder}"
    # Log "vPath #{vPath}"

    # Clear any old value
    deleteProperty id, folder

    try
      Write.sync.mkdir vPath
      Log "mkdir #{id}/#{folder}/#{v}"
    catch
      throw "Failed to mkdir #{vPath}"
    null


  Memory.subscribe "assets", false, (assets, changedAssets)->
    return unless enabled # Persisting changes will be paused during big loads
    changed = Object.merge changed, changedAssets
    update()

  Make "WriteAssets",
    enable: (enable = true)-> enabled = enable

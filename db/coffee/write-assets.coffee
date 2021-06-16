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
  permittedKeys = name: "Name", shot: "Shot", tags: "Tags"#, files: "Files"
  validName = (name)-> -1 is name.search /[^\w &-(),]/

  update = Debounced 2000, ()->
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

  deleteProperty = (id, folder)->
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, id, folder
    current = Read path
    return unless current?.length > 0
    path = Read.path path, current[0] if current.length is 1
    Write.sync.rm path

  updateProperty = (id, folder, v)->
    if v instanceof Array
      writeArray id, folder, v
    else
      writeString id, folder, v


  writeArray = (id, folder, arr)->
    assetsFolder = Memory "assetsFolder"
    kPath = Read.path assetsFolder, id, folder

    # We don't need to do the write if the FS is already correct
    current = await Read.async kPath
    return if Array.equal arr, current

    # Remove anything that's in the folder but not in our new array
    for v in current when v not in arr
      Write.sync.rm Read.path kPath, v

    # Save anything that's in our new array but not in the folder
    for v in arr when v not in current

      vPath = Read.path kPath, v

      if validName v
        Write.sync.mkdir vPath
      else
        Log "Can't write value #{v} to the filesystem (see console)"
        console.log id, folder, v

    null


  writeString = (id, folder, v)->
    assetsFolder = Memory "assetsFolder"

    unless validName v
      Log "Can't write value #{v} to the filesystem (see console)"
      console.log id, folder, v
      return

    kPath = Read.path assetsFolder, id, folder
    vPath = Read.path kPath, v

    # We don't need to do the write if the FS is already correct
    current = await Read.async kPath
    return if Array.equal current, [v]

    # Clear old value
    deleteProperty id, folder

    Write.sync.mkdir vPath
    null


  Memory.subscribe "assets", false, (assets, changedAssets)->
    return unless enabled # Persisting changes will be paused during big loads
    changed = Object.merge changed, changedAssets
    update()

  Make "WriteAssets",
    enable: (enable = true)-> enabled = enable

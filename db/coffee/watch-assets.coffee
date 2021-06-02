Take ["Asset", "Config", "Debounced", "Log", "IPC", "Memory", "Read"], (Asset, Config, Debounced, Log, IPC, Memory, Read)->

  watcher = null

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  changed = {}

  update = Debounced ()->
    assetsFolder = Memory "assetsFolder"

    touchedAssets = {}

    for fullPath of changed
      pathWithinAssetsFolder = fullPath.replace assetsFolder, ""
      assetId = Array.first Read.split pathWithinAssetsFolder
      touchedAssets[assetId] = true

    for assetId of touchedAssets
      Memory "assets.#{assetId}", await Asset.load Read.path assetsFolder, assetId

    changed = {}
    null

  change = (eventType, fullPath)->
    changed[fullPath] = true
    update()

  Memory.subscribe "assetsFolder", true, (assetsFolder)->
    watcher?.close()
    if assetsFolder?
      watcher = Read.watch assetsFolder, {recursive: true, persistent: false}, change

Take ["Asset", "Config", "Debounced", "Log", "IPC", "Memory", "Read"], (Asset, Config, Debounced, Log, IPC, Memory, Read)->

  watcher = null

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  changed = {}

  update = Debounced ()->
    Log "TODO: Implement port-based asset update IPC"
    # for assetId, assetPath of changed
    #   if Read assetPath
    #     asset = Asset assetPath
    #     IPC.assetChanged asset
    #   else
    #     IPC.assetDeleted assetId
    null

  change = (eventType, filename)->
    assetId = filename.replace(assetsFolderPath, "").split(Read.sep)[0]
    assetPath = Read.path assetsFolderPath, assetId
    changed[assetId] = assetPath
    update()

  Make "WatchAssets", WatchAssets = ()->
    assetsFolderPath = Memory "assetsFolderPath"
    watcher?.close()
    watcher = Read.watch assetsFolderPath, {recursive: true, persistent: false}, change

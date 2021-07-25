Take ["Asset", "Debounced", "Job", "Log", "Memory", "Read"], (Asset, Debounced, Job,Log, Memory, Read)->

  watcher = null

  validFileName = (v)->
    return false unless v?.length > 0
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  touchedAssets = {}

  update = Debounced 200, ()->
    for assetId of touchedAssets
      Job 50, "Watched Asset Reload", assetId
    touchedAssets = {}

  Job.handler "Watched Asset Reload", (assetId)->
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, assetId
    if await Read.isFolder path
      asset = Memory "assets.#{assetId}"
      asset ?= Asset.new path
      await Asset.loadFields asset
    else
      asset = null
    Memory "assets.#{assetId}", asset

  change = (eventType, fullPath)->
    return if Memory "Pause Watching"
    assetsFolder = Memory "assetsFolder"
    pathWithinAssetsFolder = fullPath.replace assetsFolder, ""
    assetId = Array.first Read.split pathWithinAssetsFolder
    return unless validFileName assetId
    Log "Watch #{eventType} #{pathWithinAssetsFolder}"
    # We'll just reload the whole asset. This is simpler than trying to track exactly which paths have changed,
    # and the performance overhead will be effectively invisible (likely less than 1ms even on giant assets).
    touchedAssets[assetId] = true
    update()

  Memory.subscribe "assetsFolder", true, (assetsFolder)->
    watcher?.close()
    touchedAssets = {} # Clear any changes queued up for the debounced update, since they'll no longer resolve properly
    if assetsFolder?
      watcher = Read.watch assetsFolder, {recursive: true, persistent: false}, change

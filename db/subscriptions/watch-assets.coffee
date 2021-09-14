Take ["Asset", "ADSR", "Job", "Log", "Memory", "Read"], (Asset, ADSR, Job, Log, Memory, Read)->

  watcher = null

  validFileName = (v)->
    return false unless v?.length > 0
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good

  touchedAssets = {}

  update = ADSR 100, 1000, ()->
    for assetId of touchedAssets
      Job 50, "Watched Asset Reload", assetId
    touchedAssets = {}

  Job.handler "Watched Asset Reload", (assetId)->
    assetsFolder = Memory "assetsFolder"
    path = Read.path assetsFolder, assetId
    if await Read.isFolder path
      asset = Memory.clone "assets.#{assetId}"
      asset ?= Asset.new path
      Log "Reloading Asset: #{assetId}", color: "hsl(333, 50%, 50%)"
      prevNewShot = asset.newShot
      await Asset.loadFields asset
      Log asset.newShot, background: "hsl(150, 60%, 60%)"
      Log prevNewShot, background: "hsl(250, 100%, 80%)"
      if asset.newShot isnt prevNewShot
        await Job 1, "Rebuild Asset Thumbnail", asset, true
      await Job 1, "Rebuild File Thumbnails", asset, true
    else
      asset = null
    Memory "assets.#{assetId}", asset

  change = (eventType, fullPath)->
    assetsFolder = Memory "assetsFolder"
    pathWithinAssetsFolder = fullPath.replace assetsFolder, ""
    assetId = Array.first Read.split pathWithinAssetsFolder
    return unless validFileName assetId
    return unless validFileName Array.last Read.split fullPath
    # Log "Disk Watcher: #{pathWithinAssetsFolder}", color: "hsl(333, 50%, 50%)"
    # We'll just reload the whole asset. This is simpler than trying to track exactly which paths have changed,
    # and the performance overhead will be effectively invisible (likely less than 1ms even on giant assets).
    touchedAssets[assetId] = true
    update()


  setup = ()->
    watcher?.close()
    touchedAssets = {} # Clear any changes queued up for the debounced update, since they'll no longer resolve properly
    assetsFolder = Memory "assetsFolder"
    paused = Memory "Pause Watching"
    Log "Watcher paused: #{paused}"
    if assetsFolder? and not paused
      watcher = Read.watch assetsFolder, {recursive: true, persistent: false}, change


  Memory.subscribe "Pause Watching", false, setup
  Memory.subscribe "assetsFolder", true, setup

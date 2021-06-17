Take ["Asset", "Log", "Memory", "Read", "WriteAssets"], (Asset, Log, Memory, Read, WriteAssets)->

  Memory.subscribe "assetsFolder", true, (assetsFolder)->
    return unless assetsFolder?

    assets = {}
    logAssetLoadTime = Log.time.custom "Loading Assets from #{assetsFolder}"

    if assetFolderNames = Read assetsFolder

      Log.time "Scan Asset Folders", scanAssetFolders = ()->
        for assetFolderName in assetFolderNames
          assetPath = Read.path assetsFolder, assetFolderName
          asset = Asset.read assetPath
          assets[asset.id] = asset
        null

      load = (k)->
        new Promise loadPromise = (resolve)->
          requestAnimationFrame loadRaf = ()->
            await Log.time.async "Build #{k}", loadLog = ()->
              for id, asset of assets
                asset[name] = Asset.build[name] asset
              for id, asset of assets
                asset[k] = await asset[k]
              null
            resolve()

      for name in ["name", "shot", "tags", "files"]
        await load name

      Log.time "Build Search", searchlog = ()->
        for id, asset of assets
          asset.search = Asset.build.search asset

      logAssetLoadTime "Spent Loading #{Object.keys(assets).length} Assets"

    else
      Log "No Assets Found"

    # Pause persisting asset changes to disk
    WriteAssets.enable false

    Memory "assets", assets

    # Later, after all Memory notifications will have gone out, resume persisting asset changes
    requestAnimationFrame WriteAssets.enable

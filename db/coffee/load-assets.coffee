Take ["Asset", "Config", "Log", "Read"], (Asset, Config, Log, Read)->

  Make "LoadAssets", LoadAssets = ()->
    assets = {}
    assetsFolderPath = Config "pathToAssetsFolder"
    logAssetLoadTime = Log.time.custom "Loading Assets"

    return Log("No Assets Found") unless assetFolders = Read assetsFolderPath

    Log.time "Scan Asset Folders", scanAssetFolders = ()->
      for assetFolder in assetFolders
        assetPath = Read.path assetsFolderPath, assetFolder
        asset = Asset assetPath
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

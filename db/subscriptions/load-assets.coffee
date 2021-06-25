Take ["Asset", "DBState", "Log", "Memory", "Read", "WriteAssets"], (Asset, DBState, Log, Memory, Read, WriteAssets)->

  Memory.subscribe "assetsFolder", true, (assetsFolder)->
    return unless assetsFolder?

    # Pause persisting asset changes to disk
    WriteAssets.enable false

    assets = {}

    # To start, load all asset data cached from the last run
    # Currently disabled until we can get rid of a flash when the real load finishes.
    # assets = DBState "assets"
    # Memory "assets", Object.clone assets

    logAssetLoadTime = Log.time.custom "Loading Assets from #{assetsFolder}"

    if assetFolderNames = Read assetsFolder

      Log.time "Scan Asset Folders", scanAssetFolders = ()->
        confirmed = {}

        for assetFolderName in assetFolderNames
          assetPath = Read.path assetsFolder, assetFolderName
          asset = Asset.read assetPath
          assets[asset.id] = asset
          confirmed[asset.id] = true # Track which assets we've verified exist

        # Delete any assets that no longer exist
        for assetId of assets when not confirmed[assetId]
          delete assets[assetId]
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

    Memory "assets", assets

    # Later, after all Memory notifications will have gone out, resume persisting asset changes
    requestAnimationFrame WriteAssets.enable

    # Persist a simplified version of assets to the disk, to speed load times
    simplifiedAssets = {}
    for id, asset of assets
      {id, name, path, number, creator, shot, tags} = asset
      a = simplifiedAssets[id] = {id, name, path, number, creator, shot, tags}
      {name, ext, path, count} = asset.files
      a.files = {name, ext, path, count}
      a.files.children = []
    DBState "assets", simplifiedAssets

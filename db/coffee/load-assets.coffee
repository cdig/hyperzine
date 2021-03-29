Take ["Asset", "Log", "Read"], (Asset, Log, Read)->

  Make "LoadAssets", LoadAssets = (assetsFolderPath)->
    assets = {}

    if assetFolders = Read.folder assetsFolderPath
      Log.time "Read assetsFolderPath", ()->
        for assetFolder in assetFolders
          assetPath = path.join assetsFolderPath, assetFolder
          asset = Asset assetPath
          assets[asset.id] = asset

      Log.time "makeName", ()-> Asset.makeName asset for id, asset of assets
      Log.time "makeShot", ()-> Asset.makeShot asset for id, asset of assets
      Log.time "makeTags", ()-> Asset.makeTags asset for id, asset of assets
      Log.time "makeFiles", ()-> Asset.makeFiles asset for id, asset of assets
      Log.time "makeSearch", ()-> Asset.makeSearch asset for id, asset of assets

    assets

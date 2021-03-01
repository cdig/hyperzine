Take ["Asset", "Read"], (Asset, Read)->

  Make "LoadAssets", LoadAssets = (assetsFolderPath)->
    assets = {}

    if assetFolders = Read.folder assetsFolderPath
      for assetFolder in assetFolders
        assetPath = path.join assetsFolderPath, assetFolder
        asset = Asset assetPath
        assets[asset.id] = asset

    assets

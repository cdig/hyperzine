fs = require "fs"

Take ["Asset", "Settings", "Globals"], (Asset, Settings)->

  handleError = (err)->
    StateMachine err
    Pub "Render"


  readAssetDataFolder = (asset, folderName, cb)->
    path = [Settings.pathToAssetsFolder, asset.id, folderName].join "/"
    fs.readdir path, (err, fileNames)->
      if err
        asset.errors.push "readAssetDataFolder #{folderName}": err
      else
        cb fileNames
        Pub "Search"
        Pub "Render"


  buildAssetList = (asset, folderName)->
    readAssetDataFolder asset, folderName, (fileNames)->
      Asset.setList asset, folderName.toLowerCase(), fileNames

  buildAssetValue = (asset, folderName)->
    readAssetDataFolder asset, folderName, (fileNames)->
      if fileNames?.length > 0
        Asset.setValue asset, folderName.toLowerCase(), fileNames[0]


  loadAsset = (id)->
    asset = Asset.new id
    buildAssetValue asset, "Name"
    buildAssetValue asset, "Shot"
    buildAssetList asset, "Files"
    buildAssetList asset, "Tags"


  Make "LoadAssets", (cb)->
    fs.readdir Settings.pathToAssetsFolder, (err, assetFolders)->
      return handleError "LoadAssets Error: #{err}" if err
      return handleError "LoadAssets Error: No assets" unless assetFolders?.length > 0

      loadAsset assetFolder for assetFolder, i in assetFolders when i < Settings.loadAssetLimit

      cb()

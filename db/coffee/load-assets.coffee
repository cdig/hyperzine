fs = require "fs"
path = require "path"

Take [], ()->

  validFileName = (v)->
    return false if v.indexOf(".") is 0 # Exclude dotfiles
    return true # Everything else is good


  readFolder = (folderPath)->
    try
      fileNames = fs.readdirSync folderPath
      fileNames.filter validFileName
    catch
      []


  searchPrep = (input)->
    (input or "").toLowerCase().replace /-_/g, " "


  Make "LoadAssets", (assetsFolderPath)->
    assets = {}

    for assetFolder in readFolder assetsFolderPath
      assetPath = path.join assetsFolderPath, assetFolder

      asset =
        id: assetFolder
        creator: assetFolder.split(" ").slice(0, -1).join " "
        name: readFolder(path.join assetPath, "Name")[0]
        shot: readFolder(path.join assetPath, "Shot")[0]
        files: readFolder path.join assetPath, "Files"
        tags: readFolder path.join assetPath, "Tags"

      asset.search =
        name: searchPrep asset.name
        files: searchPrep asset.files.join " "
        tags: searchPrep asset.tags.join " "

      assets[asset.id] = asset
      
    assets

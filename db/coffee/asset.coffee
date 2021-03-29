path = require "path"

Take ["FileTree", "Read"], (FileTree, Read)->

  searchPrep = (input)->
    (input or "").toLowerCase().replace /-_/g, " "

  Asset = (assetPath)->
    id: assetId = Array.last assetPath.split(path.sep)
    path: assetPath
    creator: assetId.split(" ").slice(0, -1).join " "

  Asset.makeName = (asset)-> asset.name = Read.folder(path.join asset.path, "Name")?[0]
  Asset.makeShot = (asset)-> asset.shot = Read.folder(path.join asset.path, "Shot")?[0]
  Asset.makeTags = (asset)-> asset.tags = Read.folder(path.join asset.path, "Tags") or []
  Asset.makeFiles = (asset)-> asset.files = FileTree.build asset.path, "Files"
  Asset.makeSearch = (asset)-> asset.search =
    name: searchPrep asset.name
    tags: searchPrep asset.tags.join " "
    files: searchPrep Array.unique(FileTree.flatNames(asset.files).pop()).join " "

  Make "Asset", Asset

path = require "path"

Take ["FileTree", "Read"], (FileTree, Read)->

  searchPrep = (input)->
    (input or "").toLowerCase().replace /-_/g, " "

  Make "Asset", Asset = (assetPath)->
    assetId = Array.last assetPath.split(path.sep)

    asset =
      id: assetId
      creator: assetId.split(" ").slice(0, -1).join " "
      name: Read.folder(path.join assetPath, "Name")?[0]
      shot: Read.folder(path.join assetPath, "Shot")?[0]
      tags: Read.folder(path.join assetPath, "Tags") or []
      files: FileTree.build assetPath, "Files"

    asset.search =
      name: searchPrep asset.name
      tags: searchPrep asset.tags.join " "
      files: searchPrep Array.unique(FileTree.flatNames(asset.files).pop()).join " "

    asset

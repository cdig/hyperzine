path = require "path"

Take ["Read"], (Read)->

  searchPrep = (input)->
    (input or "").toLowerCase().replace /-_/g, " "


  Make "Asset", Asset = (assetPath)->
    assetId = Array.last assetPath.split(path.sep)

    asset =
      id: assetId
      creator: assetId.split(" ").slice(0, -1).join " "
      name: Read.folder(path.join assetPath, "Name")?[0]
      shot: Read.folder(path.join assetPath, "Shot")?[0]
      files: Read.folder(path.join assetPath, "Files") or []
      tags: Read.folder(path.join assetPath, "Tags") or []

    asset.search =
      name: searchPrep asset.name
      files: searchPrep asset.files.join " "
      tags: searchPrep asset.tags.join " "

    asset

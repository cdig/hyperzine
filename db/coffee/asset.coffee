Take ["FileTree", "Read"], (FileTree, Read)->

  first = (v)-> v?[0]
  arrayPun = (v)-> v or []
  searchPrep = (input)-> (input or "").toLowerCase().replace /[^\w\d]/g, " "

  Asset = (assetPath)->
    asset =
      id: assetId = Array.last Read.split assetPath
      path: assetPath
      creator: assetId.split(" ").slice(0, -1).join " "

  Asset.build =
    name: (asset)-> Read.async(Read.path asset.path, "Name").then first
    shot: (asset)-> Read.async(Read.path asset.path, "Shot").then first
    tags: (asset)-> Read.async(Read.path asset.path, "Tags").then arrayPun
    files: (asset)-> Read.exists(Read.path asset.path, "Files").then (yep)-> if yep then FileTree.build asset.path, "Files"

    search: (asset)->
      search =
        name: searchPrep asset.name
        tags: searchPrep asset.tags.join " "
      if asset.files?
        a = FileTree.flatNames asset.files
        search.files = Array.unique(a)
      search

  Make "Asset", Asset

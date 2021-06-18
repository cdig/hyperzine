Take ["FileTree", "Ports", "Memory", "Read"], (FileTree, Ports, Memory, Read)->

  first = (v)-> v?[0]
  arrayPun = (v)-> v or []
  searchPrep = (input)-> (input or "").toLowerCase().replace /[^\w\d]/g, " "

  Make "Asset", Asset =
    read: (path)->
      id: id = Array.last Read.split path
      path: path
      number: Array.last id.split(" ")
      creator: id.split(" ")[0...-1].join " "

    build:
      name: (asset)-> Read.async(Read.path asset.path, "Name").then first
      shot: (asset)-> Read.async(Read.path asset.path, "Shot").then first
      tags: (asset)-> Read.async(Read.path asset.path, "Tags").then arrayPun
      files: (asset)-> FileTree.build asset.path, "Files"
      search: (asset)->
        name: searchPrep asset.name
        tags: searchPrep asset.tags.join " "
        files: Array.unique(FileTree.flatNames(asset.files)).map searchPrep

    loadFields: (id)->
      assetsFolder = Memory "assetsFolder"
      path = Read.path assetsFolder, id
      if await Read.isFolder path
        if asset = Memory "assets.#{id}"
          # We need to clone the asset, so that the below mutations don't mess with
          # Memory's ability to detect changes.
          asset = Object.clone asset
        else
          asset = Asset.read path
        asset.name = await Asset.build.name asset
        asset.shot = await Asset.build.shot asset
        asset.tags = await Asset.build.tags asset
        asset.files = await Asset.build.files asset
        asset.search = Asset.build.search asset
        asset
      else
        null

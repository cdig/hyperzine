Take ["FileTree", "Paths", "Ports", "Memory", "Read"], (FileTree, Paths, Ports, Memory, Read)->

  first = (v)-> v?[0]
  arrayPun = (v)-> v or []
  searchPrep = (input)-> (input or "").toLowerCase().replace /[^\w\d]/g, " "

  Make "Asset", Asset =
    new: (path)->
      asset =
        id: id = Read.last path
        name: id
        path: path
        number: Array.last id.split(" ")
        creator: id.split(" ")[0...-1].join " "
        shot: null
        tags: []
        files: FileTree.new path, "Files"
        thumbnails: {}
      asset.search = Asset.build.search asset
      asset

    # This preps an asset for caching to disk. Only keep the modicum of properties needed
    # to quickly get an asset ready for use in the Browser right when Hyperzine launches.
    # Additional asset data will be loaded (more slowly / lazily) once Hyperzine is running.
    # This lives here because this file is the hub of knowledge about what props assets ought to have.
    dehydrate: (asset)->
      id: asset.id
      name: asset.name
      tags: asset.tags
      search: asset.search
      files:
        count: asset.files.count

    loadFields: (asset)->
      asset.name = await Asset.build.name asset
      asset.shot = await Asset.build.shot asset
      asset.tags = await Asset.build.tags asset
      asset.files = await Asset.build.files asset
      asset.thumbnails = await Asset.build.thumbnails asset
      asset.search = Asset.build.search asset
      asset

    build:
      name: (asset)->
        name = await Read.async(Read.path asset.path, "Name").then first
        (name or asset.id).trim()
      shot: (asset)-> Read.async(Read.path asset.path, "Shot").then first
      tags: (asset)->
        assetTags = await Read.async(Read.path asset.path, "Tags").then arrayPun
        Memory "tags.#{tag}", tag for tag in assetTags
        assetTags
      files: (asset)-> FileTree.build asset.path, "Files"
      thumbnails: (asset)->
        thumbs = await Read.async(Paths.thumbnails(asset)).then arrayPun
        Array.mapToObject thumbs, (thumb)-> Paths.thumbnail asset, thumb
      search: (asset)->
        id: searchPrep asset.id
        name: searchPrep asset.name
        tags: searchPrep asset.tags.join " "
        files: Array.unique(FileTree.flatNames(asset.files)).map searchPrep

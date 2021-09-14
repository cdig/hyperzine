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
        hash: String.hash id
        shot: null
        newShot: null
        tags: []
        files: FileTree.newEmpty path, "Files"
        thumbnails: {}
        _loading: false
      asset.search = Asset.load.search asset
      asset

    rehydrate: (assetsFolder, asset)->
      # id - included in dehydrated asset
      # name - included in dehydrated asset
      asset.path = Read.path assetsFolder, asset.id
      asset.number = Array.last asset.id.split(" ")
      asset.creator = asset.id.split(" ")[0...-1].join " "
      asset.hash = String.hash asset.id
      # shot - not needed by browser for initial render
      # newShot - not needed by browser for initial render
      # tags - included in dehydrated asset
      # files - included in dehydrated asset
      asset.thumbnails = {}
      # search - included in dehydrated asset
      asset

    # This preps an asset for caching to disk. Only keep the modicum of properties needed
    # to quickly get an asset ready for use in the Browser right when Hyperzine launches.
    # Additional asset data will be loaded (more slowly / lazily) once Hyperzine is running.
    # This lives here because this file is the hub of knowledge about what props assets ought to have.
    dehydrate: (asset)->
      id: asset.id
      name: asset.name
      # path - will be rehydrated on load
      # number - will be rehydrated on load
      # creator - will be rehydrated on load
      # shot - not needed by browser for initial render
      # newShot - not needed by browser for initial render
      tags: asset.tags
      files:
        count: asset.files.count
      # thumbnails - not needed by browser for initial render
      search: asset.search

    loadFields: (asset)->
      asset.name = await Asset.load.name asset
      asset.shot = await Asset.load.shot asset
      asset.newShot = await Asset.load.newShot asset
      asset.tags = await Asset.load.tags asset
      asset.files = await Asset.load.files asset
      asset.thumbnails = await Asset.load.thumbnails asset
      asset.search = Asset.load.search asset
      asset

    load:
      name: (asset)->
        name = await Read.async(Paths.names asset).then first
        (name or asset.id).trim()
      shot: (asset)->
        Read.async(Paths.shots asset).then first
      newShot: (asset)->
        Read.async(Paths.newShots asset).then first
      tags: (asset)->
        assetTags = await Read.async(Paths.tags asset).then arrayPun
        Memory "tags.#{tag}", tag for tag in assetTags
        assetTags
      files: (asset)->
        FileTree.newPopulated asset.path, "Files"
      thumbnails: (asset)->
        thumbs = await Read.async(Paths.thumbnails(asset)).then arrayPun
        Array.mapToObject thumbs, (thumb)-> Paths.thumbnail asset, thumb
      search: (asset)->
        id: searchPrep asset.id
        name: searchPrep asset.name
        tags: searchPrep asset.tags.join " "
        files: Array.unique(FileTree.flat(asset.files, "basename")).map searchPrep
        exts: Array.unique(FileTree.flat(asset.files, "ext")).map searchPrep

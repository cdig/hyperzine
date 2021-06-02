Take ["FileTree", "Ports", "Memory", "Read", "Write"], (FileTree, Ports, Memory, Read, Write)->

  first = (v)-> v?[0]
  arrayPun = (v)-> v or []
  searchPrep = (input)-> (input or "").toLowerCase().replace /[^\w\d]/g, " "

  Ports.on "new-asset", ()->
    assetsFolder = Memory "assetsFolder"
    number = Memory "nextAssetNumber"
    creator = Memory "localName"
    id = creator + " " + number
    path = Read.path assetsFolder, id
    Write.sync.mkdir path
    return id

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
        files: Array.unique FileTree.flatNames asset.files

    load: (path)->
      if await Read.isFolder path
        asset = Asset.read path
        asset.name = await Asset.build.name asset
        asset.shot = await Asset.build.shot asset
        asset.tags = await Asset.build.tags asset
        asset.files = await Asset.build.files asset
        asset.search = Asset.build.search asset
        asset
      else
        null

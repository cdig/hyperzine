Take ["FileTree", "Memory", "Read", "Write"], (FileTree, Memory, Read, Write)->

  first = (v)-> v?[0]
  arrayPun = (v)-> v or []
  searchPrep = (input)-> (input or "").toLowerCase().replace /[^\w\d]/g, " "

  Make "Asset", Asset =
    new: ()->
      dataFolder = Memory "dataFolder"
      assetFolder = Read.path dataFolder, "Assets"
      nextId = Memory "localName"

    read: (assetPath)->
      id: assetId = Array.last Read.split assetPath
      path: assetPath
      number: Array.last assetId.split(" ")
      creator: assetId.split(" ")[0...-1].join " "

    build:
      name: (asset)-> Read.async(Read.path asset.path, "Name").then first
      shot: (asset)-> Read.async(Read.path asset.path, "Shot").then first
      tags: (asset)-> Read.async(Read.path asset.path, "Tags").then arrayPun
      files: (asset)-> FileTree.build asset.path, "Files"
      search: (asset)->
        name: searchPrep asset.name
        tags: searchPrep asset.tags.join " "
        files: Array.unique FileTree.flatNames asset.files

path = require "path"

Take [], ()->

  pathToAssetsFolder = "/Users/admin/work/Dropbox/System/Hyperzine/Assets"

  Make "Paths", Paths =
    asset: (asset)-> path.join pathToAssetsFolder, asset.id
    file: (asset, file)-> path.join Paths.asset(asset), "Files", file
    shot: (asset)-> path.join Paths.asset(asset), "Shot", asset.shot
    name: (asset)-> path.join Paths.asset(asset), "Name", asset.name
    tag: (asset, tag)-> path.join Paths.asset(asset), "Tags", tag

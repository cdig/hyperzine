path = require "path"

Take [], ()->

  pathToAssetsFolder = null

  Make "Paths", Paths =
    setConfig: (configData)-> pathToAssetsFolder = configData.pathToAssetsFolder

    asset: (asset)->       path.join pathToAssetsFolder, asset.id
    files: (asset)->       path.join Paths.asset(asset), "Files"
    shot: (asset)->        path.join Paths.asset(asset), "Shot", asset.shot
    name: (asset)->        path.join Paths.asset(asset), "Name", asset.name
    tags: (asset)->        path.join Paths.asset(asset), "Tags"
    tag: (asset, tag)->    path.join Paths.tags(asset), tag

    # This is temporarily here until we have a better home
    displayName: (asset)-> (asset.name or asset.id).replace /[-_]/g, " "

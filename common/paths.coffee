Take ["Read"], (Read)->

  pathToAssetsFolder = null

  Make "Paths", Paths =
    # TODO: This needs to be replaced
    setConfig: (configData)-> pathToAssetsFolder = configData.pathToAssetsFolder

    asset: (asset)->    Read.path pathToAssetsFolder, asset.id
    files: (asset)->    Read.path Paths.asset(asset), "Files"
    shot: (asset)->     Read.path Paths.asset(asset), "Shot", asset.shot
    name: (asset)->     Read.path Paths.asset(asset), "Name", asset.name
    tags: (asset)->     Read.path Paths.asset(asset), "Tags"
    tag: (asset, tag)-> Read.path Paths.tags(asset), tag

    # This is temporarily here until we have a better home
    displayName: (asset)-> (asset.name or asset.id).replace /[-_]/g, " "

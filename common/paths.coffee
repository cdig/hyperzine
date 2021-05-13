Take ["Read", "Memory"], (Read, Memory)->


  Make "Paths", Paths =
    asset: (asset)->    Read.path Memory("assetsFolderPath"), asset.id
    files: (asset)->    Read.path Paths.asset(asset), "Files"
    shot: (asset)->     Read.path Paths.asset(asset), "Shot", asset.shot
    name: (asset)->     Read.path Paths.asset(asset), "Name", asset.name
    tags: (asset)->     Read.path Paths.asset(asset), "Tags"
    tag: (asset, tag)-> Read.path Paths.tags(asset), tag

    # This is temporarily here until we have a better home
    displayName: (asset)-> (asset.name or asset.id).replace /[-_]/g, " "

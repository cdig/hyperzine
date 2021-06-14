Take ["Memory", "Read"], (Memory, Read)->

  Make "Paths", Paths =
    asset: (asset)->      Read.path Memory("assetsFolder"), asset.id
    name: (asset)->       Read.path Paths.asset(asset), "Name", asset.name
    shot: (asset)->       Read.path Paths.asset(asset), "Shot", asset.shot
    files: (asset)->      Read.path Paths.asset(asset), "Files"
    file: (asset, file)-> Read.path Paths.files(asset), file
    tags: (asset)->       Read.path Paths.asset(asset), "Tags"
    tag: (asset, tag)->   Read.path Paths.tags(asset), tag

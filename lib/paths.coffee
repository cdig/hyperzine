Take ["Read"], (Read)->

  Make "Paths", Paths =
    file: (asset, file)->      Read.path Paths.files(asset), file
    files: (asset)->           Read.path asset.path, "Files"
    name: (asset)->            Read.path asset.path, "Name", asset.name
    shot: (asset)->            Read.path asset.path, "Shot", asset.shot
    tag: (asset, tag)->        Read.path Paths.tags(asset), tag
    tags: (asset)->            Read.path asset.path, "Tags"
    thumbnail: (asset, file)-> Read.path Paths.thumbnails(asset), file
    thumbnails: (asset)->      Read.path asset.path, "Thumbnail Cache"

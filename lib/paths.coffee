Take ["Read"], (Read)->

  Make "Paths", Paths =
    file: (asset, filename)->      Read.path Paths.files(asset), filename
    files: (asset)->               Read.path asset.path, "Files"
    name: (asset)->                Read.path asset.path, "Name", asset.name
    shot: (asset)->                Read.path asset.path, "Shot", asset.shot
    tag: (asset, tag)->            Read.path Paths.tags(asset), tag
    tags: (asset)->                Read.path asset.path, "Tags"
    thumbnail: (asset, filename)-> Read.path Paths.thumbnails(asset), filename
    thumbnails: (asset)->          Read.path asset.path, "Thumbnail Cache"

Take ["FileTree", "Memory", "Read"], (FileTree, Memory, Read)->

  Make "Paths", Paths =
    asset: (asset)->    Read.path Memory("assetsFolder"), asset.id
    files: (asset)->    Read.path Paths.asset(asset), "Files"
    name: (asset)->     Read.path Paths.asset(asset), "Name", asset.name
    tags: (asset)->     Read.path Paths.asset(asset), "Tags"
    tag: (asset, tag)-> Read.path Paths.tags(asset), tag

    shot: (asset)->
      # This loads high-quality shots, but it's too slow to be worthwhile for now
      # if asset.files?.count > 0
      #   shot = asset.shot.replace /\.(png|jpg)\.png/, ".$1"
      #   for child in asset.files.children
      #     if child.name is shot
      #       return Read.path Paths.asset(asset), "Files", shot

      Read.path Paths.asset(asset), "Shot", asset.shot

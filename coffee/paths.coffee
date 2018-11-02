Take ["Settings"], (Settings)->
  Make "Paths", Paths =
    asset: (asset)->
      [Settings.pathToAssetsFolder, asset.id].join "/"
    file: (asset, file)->
      [Paths.asset(asset), "Files", file].join "/"
    shot: (asset)->
      [Paths.asset(asset), "Shot", asset.shot].join "/"
    name: (asset)->
      [Paths.asset(asset), "Name", asset.name].join "/"
    tag: (asset, tag)->
      [Paths.asset(asset), "Tags", tag].join "/"

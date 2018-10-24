Take ["Asset", "Settings", "Globals"], (Asset, Settings)->

  Make "AssetCard", (asset)->

    name = Preact.h "asset-name", null, Asset.displayName asset

    img = if asset.shot?
      Preact.h "img", src: [Settings.pathToAssetsFolder, asset.id, "Shot", asset.shot].join "/"

    tagList = if asset.tags.length > 0
      Preact.h "tag-list", null, (Preact.h "div", null, v for v in asset.tags)

    Preact.h "asset-card", {onclick: ()-> Asset.edit asset},
      name
      img
      tagList

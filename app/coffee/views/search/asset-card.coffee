Take ["Asset", "Paths", "Globals"], (Asset, Paths)->

  Make "AssetCard", (asset)->

    name = Preact.h "asset-name", null, Asset.displayName asset

    img = if asset.shot?
      Preact.h "img", src: Paths.shot asset

    tagList = if asset.tags.length > 0
      Preact.h "tag-list", null, (Preact.h "div", null, v for v in asset.tags)

    Preact.h "asset-card", {onclick: ()-> Pub "Edit Asset", asset},
      name
      img
      tagList

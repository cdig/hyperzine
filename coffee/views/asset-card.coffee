Take ["Settings", "Globals"], (Settings)->
  Make "AssetCard", (asset)->

    imgPath = if asset.shot?
      [Settings.pathToAssetsFolder, asset.id, "Shot", asset.shot].join "/"
    else
      "placeholder.png"

    name = asset.name or "#{asset.id} (Loading)"

    Preact.h "asset-card", null,
      Preact.h "img", src: imgPath
      Preact.h "asset-name", null, name

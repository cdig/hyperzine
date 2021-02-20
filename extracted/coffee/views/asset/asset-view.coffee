Take ["Asset", "LocalStorage", "Tag", "TagView", "Settings"], (Asset, LocalStorage, Tag, TagView, Settings)->

  clickSave = (asset, filename)-> (e)->
    Pub "Save File", asset, filename

  hover = (asset, filename)-> (e)->
    Pub "Set Asset Hover Preview", filename

  preview = (asset)->
    path = if LocalStorage.assetHoverPreview
      "Files/" + LocalStorage.assetHoverPreview
    else if asset.shot
      "Shot/" + LocalStorage.assetHoverPreview

    if path?
      Preact.h "img", src: [Settings.pathToAssetsFolder, asset.id, path].join "/"
    else
      Preact.h "div", null, "No Preview"


  Make "AssetView", (asset)->
    Preact.h "asset-view", {style: "display: #{display}"},
      Preact.h "asset-editor", null,
        Preact.h "h1", {"asset-name":""}, Asset.displayName asset
        Preact.h "asset-details", null,
          Preact.h "detail-list", {tags:""},
            Preact.h "h2", null, "Tags"

            # for tag in Tag.all()
            #   TagView asset, tag, (tag in asset.tags)
          Preact.h "detail-list", {files:""},
            Preact.h "h2", null, "Files"
            for v in asset.files
              Preact.h "div", null,
                Preact.h "span", {icon:""}, "👁"
                Preact.h "span", {icon:"", onclick: clickSave(asset, v)}, "💾"
                Preact.h "span", {text:"", onmouseover: hover(asset, v)}, v
          Preact.h "detail-list", {info:""},
            Preact.h "h2", null, "Info"
            Preact.h "h4", null, "ID: " + asset.id
            Preact.h "h4", null, "Preview:"
            preview asset

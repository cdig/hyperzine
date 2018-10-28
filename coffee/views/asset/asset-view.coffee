Take ["Asset", "DB", "Tag", "TagView", "Settings"], (Asset, DB, Tag, TagView, Settings)->

  Make "AssetView", ()->
    asset = Asset.activeAsset()
    Preact.h "asset-view", null,
      Preact.h "asset-editor", null,
        Preact.h "h1", {"asset-name":""}, Asset.displayName asset
        Preact.h "asset-details", null,
          Preact.h "detail-list", {info:""},
            Preact.h "h2", null, "Info"
            Preact.h "h4", null, "ID: " + asset.id
            if asset.shot?
              Preact.h "h4", null, "Preview:"
              Preact.h "img", src: [Settings.pathToAssetsFolder, asset.id, "Shot", asset.shot].join "/"
          Preact.h "detail-list", {files:""},
            Preact.h "h2", null, "Files"
            for v in asset.files
              Preact.h "div", null,
                Preact.h "span", {icon:""}, "👁"
                Preact.h "span", {icon:""}, "💾"
                Preact.h "span", {text:""}, v
          Preact.h "detail-list", {tags:""},
            Preact.h "h2", null, "Tags"
            for tag in Tag.all()
              TagView asset, tag, (tag in asset.tags)

Take ["Asset", "DB"], (Asset, DB)->

  Make "AssetView", ()->
    asset = DB.activeAsset
    Preact.h "asset-view", null,
      Preact.h "asset-editor", null,
        Preact.h "h1", {"asset-name":""}, Asset.displayName asset
        Preact.h "asset-details", null,
          Preact.h "detail-list", null,
            Preact.h "h2", null, "Files"
            (Preact.h "div", null, v for v in asset.files)
          Preact.h "detail-list", null,
            Preact.h "h2", null, "Tags"
            (Preact.h "div", null, v for v in asset.tags)

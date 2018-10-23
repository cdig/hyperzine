Take ["AssetCard", "DB", "LoadMore", "Globals"], (AssetCard, DB, LoadMore)->

  Make "AssetList", ()->
    Preact.h "asset-list", null, DB.filteredAssets[0...DB.assetListLimit].map(AssetCard),
      LoadMore()

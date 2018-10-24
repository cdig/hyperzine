Take ["AssetCard", "DB", "Globals"], (AssetCard, DB)->

  Make "AssetList", ()->
    Preact.h "asset-list", null, DB.filteredAssets[0...DB.assetListLimit].map(AssetCard)

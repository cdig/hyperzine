Take ["AssetCard", "DB", "Search", "Globals"], (AssetCard, DB, Search)->

  Make "AssetList", ()->
    Preact.h "asset-list", null, Search.filteredAssets[0...Search.assetListLimit].map(AssetCard)

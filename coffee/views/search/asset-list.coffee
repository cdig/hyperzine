Take ["AssetCard", "DB", "Search", "Globals"], (AssetCard, DB, Search)->

  Make "AssetList", ()->
    assetCards = Search.filteredAssets[0...Search.assetListLimit].map(AssetCard)

    Preact.h "asset-list", null, assetCards

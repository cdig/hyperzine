Take ["AssetCard", "DB", "Globals"], (AssetCard, DB)->

  loadMore = ()->
    DB.assetListLimit += 200
    Pub "Render"

  Make "LoadMore", ()->
    if DB.filteredAssets.length > DB.assetListLimit
      Preact.h "button", {onclick: loadMore}, "Load More Results"

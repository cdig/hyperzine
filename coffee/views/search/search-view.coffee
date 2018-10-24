Take ["AssetList", "ResultCount", "SearchBar"], (AssetList, ResultCount, SearchBar)->

  Make "SearchView", ()->

    Preact.h "search-view", null,
      SearchBar()
      AssetList()

Take ["Asset", "DB", "SearchTermCleaner", "Globals"], (Asset, DB, SearchTermCleaner)->
  DB.filteredAssets = []

  searchRequested = false

  requestSearch = ()->
    unless searchRequested
      searchRequested = true
      requestAnimationFrame search
    return false

  search = ()->
    searchRequested = false
    queryTokens = SearchTermCleaner(DB.searchInput).split " "

    DB.assetListLimit = 50
    DB.filteredAssets = []

    if queryTokens[0] isnt "" or queryTokens.length > 1
      for id, asset of Asset.all()
        matchesAllTokens = true

        for token in queryTokens
          matchesThisToken = false

          if not matchesThisToken and asset.search.name? and asset.search.name.indexOf(token) >= 0
            matchesThisToken = true

          if not matchesThisToken and asset.search.tags?
            if asset.search.tags.indexOf(token) >= 0
              matchesThisToken = true

          if not matchesThisToken and asset.search.files?
            if asset.search.files.indexOf(token) >= 0
              matchesThisToken = true

          matchesAllTokens = false unless matchesThisToken

        DB.filteredAssets.push asset if matchesAllTokens

    DB.resultCount = if DB.filteredAssets.length > 0
      DB.filteredAssets.length
    else
      DB.assetCount

    Pub "Search Updated"

    true


  Sub "Search", requestSearch

Take ["Asset", "DB", "SearchTermCleaner", "Globals"], (Asset, DB, SearchTermCleaner)->
  filteredAssets = []

  update = Debounced ()->
    queryTokens = SearchTermCleaner(DB.searchInput).split " "

    Search.assetListLimit = 50
    Search.filteredAssets = []

    if queryTokens[0] is "" and queryTokens.length is 1
      # Search.filteredAssets = (asset for id, asset of Asset.all())

    else
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

        Search.filteredAssets.push asset if matchesAllTokens

    Search.resultCount = if Search.filteredAssets.length > 0
      Search.filteredAssets.length
    else
      Asset.count()

    Pub "Search Updated"

    true


  moreResults = Debounced 100, ()->
    if Search.filteredAssets.length > Search.assetListLimit
      Search.assetListLimit += 50
      Pub "Render"
      moreResults()


  Make "Search", Search =
    update: update
    moreResults: moreResults
    filteredAssets: filteredAssets
    assetListLimit: 50
    resultCount: 0

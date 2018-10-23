Take ["Asset", "DB", "SearchTermCleaner", "Globals"], (Asset, DB, SearchTermCleaner)->
  DB.filteredAssets = []


  Sub "Search", ()->
    queryTokens = SearchTermCleaner(DB.searchInput).split " "

    DB.assetListLimit = 100
    DB.filteredAssets = []

    if queryTokens[0] isnt "" or queryTokens.length > 1
      for id, asset of Asset.all()
        matches = false
        for token in queryTokens
          if asset.search.name? and asset.search.name.indexOf(token) >= 0
            matches = true
            break
          if asset.search.tags?
            for tag in asset.search.tags
              if tag.indexOf(token) >= 0
                matches = true
                break
          if asset.search.files?
            for file in asset.search.files
              if file.indexOf(token) >= 0
                matches = true
                break
        DB.filteredAssets.push asset if matches

    true

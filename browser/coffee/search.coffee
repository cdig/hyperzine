Take [], ()->

  subsort = (a, b)->
    a.name - b.name

  Make "Search", Search = (assets, input)->
    return assets unless input?
    input = input.join " " if input instanceof Array
    queryTokens = input.toLowerCase().replace(/[-_]+/g, " ").split " "

    queryTokens = queryTokens.filter (t)-> t isnt ""

    return assets if queryTokens.length is 0

    rankedMatches = {}

    for id, asset of assets
      points = 0

      for token in queryTokens
        tokenPoints = 0
        tokenPoints += 2 if asset.search.name.indexOf(token) isnt -1
        tokenPoints += 1 if asset.search.tags.indexOf(token) isnt -1

        if nFiles = asset.search.files?.length
          for file in asset.search.files
            tokenPoints += 1/nFiles if file.indexOf(token) isnt -1

        if tokenPoints > 0 # asset did match this token
          points += tokenPoints
        else  # asset didn't match this token
          points = 0
          break

      if points > 0 # asset did match all the tokens
        (rankedMatches[points] ?= []).push asset
        asset._points = points

    filteredAssets = []

    for k in Object.keys(rankedMatches).sort().reverse()
      filteredAssets.push rankedMatches[k].sort subsort

    filteredAssets.flat()

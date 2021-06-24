Take [], ()->

  sortByName = (a, b)->
    a.name.localeCompare b.name

  bail = (assets)->
    Object.values(assets).sort sortByName

  matchesToken = (value, token)-> value?.length > 0 and token?.length > 0 and -1 isnt value.indexOf token

  tokenizeQuery = (input)->
    tokens = input
      .toLowerCase()
      .split " "

      .map (token)->
        if token.charAt(0) isnt "-"
          token.split /[-_]+/g # positive tokens are split on common dash-like punctuations
        else
          token # negated tokens are not split on common dash-like punctuation
      .flat()
      .map (t)-> t.replace /[^\w\d-_]*/g, ""
      .filter (t)-> t not in ["", "-"]

    # Remove redundant tokens, including mixed negations
    output = {}
    for token in tokens
      normalizedToken = token.replace /^-/, ""
      output[normalizedToken] ?= token
    Object.values output



  computePoints = (asset, queryTokens)->
    points = 0

    for token in queryTokens
      if "-" is token.charAt 0
        token = token[1..]
        # If the asset matches any negative token, it fails the entire query
        return 0 if matchesToken asset.id, token
        return 0 if matchesToken asset.search.name, token
        return 0 if matchesToken asset.search.tags, token
        return 0 for file in asset.search.files when matchesToken file, token

      else
        tokenPoints = 0
        tokenPoints += 2 if matchesToken asset.id, token
        tokenPoints += 2 if matchesToken asset.search.name, token
        tokenPoints += 1 if matchesToken asset.search.tags, token

        frac = 1/asset.search.files.length
        tokenPoints += frac for file in asset.search.files when matchesToken file, token

        # If the asset doesn't match every positive token, it fails the entire query
        return 0 if tokenPoints is 0

        points += tokenPoints

    return points


  Make "Search", Search = (assets, input)->
    return bail assets unless input?

    input = input.join " " if input instanceof Array
    queryTokens = tokenizeQuery input

    return bail assets if queryTokens.length is 0

    rankedMatches = {}

    for id, asset of assets
      points = computePoints asset, queryTokens
      if points > 0 # asset matched all positive tokens, and no negative tokens
        (rankedMatches[points] ?= []).push asset
        asset._points = points

    sortedAssets = []

    for key in Object.keys(rankedMatches).sort().reverse()
      sortedRank = rankedMatches[key].sort sortByName
      sortedAssets = sortedAssets.concat sortedRank

    return sortedAssets

  Tests "Search", ()->

    Test "split queries on spaces, internal dashes, and underscores",
      ["f00", "bar", "2baz", "bash"],
      tokenizeQuery "f00-BAR_2baz bash"

    Test "preserve leading dashes",
      tokenizeQuery "-f00"
      ["-f00"]

    Test "remove duplicate tokens, including redundant negations",
      tokenizeQuery "foo -bar foo -bar -foo bar"
      ["foo", "-bar"]

    Test "remove floating negatives",
      tokenizeQuery "- foo - -"
      ["foo"]

    Test "only split leading dashes on space",
      tokenizeQuery "-f00-BAR_2baz bash"
      ["-f00-bar_2baz", "bash"]

    Test "remove punctuation, even when negated",
      tokenizeQuery "(foo) [bar]!@_#$%-^&*() -[baz]!@_baz#$%^&*()"
      ["foo", "bar", "-baz_baz"]

    Test "remove punctuation, even when negated",
      tokenizeQuery "(foo) [bar]!@_#$%-^&*() -[baz]!@_baz#$%^&*()"
      ["foo", "bar", "-baz_baz"]

    Test "empty value does not match",
      matchesToken "", "foo"
      false

    Test "empty token does not match",
      matchesToken "foo", ""
      false

    Test "different token and value do not match",
      matchesToken "foo", "bar"
      false

    Test "same token does match",
      matchesToken "foo", "foo"
      true

    Test "zero points for an empty asset",
      computePoints {search:{name:"",tags:"",files:[]}}, ["foo"]
      0

    Test "positive points for a basic match",
      computePoints {search:{name:"foo",tags:"",files:[]}}, ["foo"]
      2

    Test "more points for a better match",
      computePoints {search:{name:"foo",tags:"foo",files:["foo"]}}, ["foo"]
      4

    Test "zero points for an partial match",
      computePoints {search:{name:"foo",tags:"foo",files:["foo"]}}, ["foo", "bar"]
      0

    Test "zero points for a negative match",
      computePoints {search:{name:"foo",tags:"foo",files:["foo"]}}, ["-foo"]
      0

    Test "zero points for a mixed match",
      computePoints {search:{name:"foo",tags:"foo",files:["bar"]}}, ["foo", "-bar"]
      0

    Test "positive points for a negative miss",
      computePoints {search:{name:"foo",tags:"",files:[]}}, ["foo", "-bar"]
      2

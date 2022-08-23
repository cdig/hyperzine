Take ["Env"], (Env)->

  sortByName = (a, b)->
    a.name.localeCompare b.name

  bail = (assets)->
    Object.values(assets).sort sortByName

  matchesToken = (value, token)-> value?.length > 0 and token?.length > 0 and -1 isnt value.indexOf token
  matchesOp = (ref, op)-> not op? or op is ref

  tokenizeQueryText = (input)->
    tokens = input
      .split /[\- —_:]+/g # input is split on typical separator chars
      .map (t)-> t.replace /[^\w\d]*/g, "" # remove special chars
      .filter (t)-> t isnt "" # remove empty tokens
    Array.unique tokens

  computePoints = (asset, queryText, queryTokens, queryTags)->
    points = 0

    debugger if asset.id is "ChrisRazer 28"

    # We'll do any exact-match checking up here
    return 100 if asset.search.id is queryText
    return 50 if asset.search.name is queryText

    for queryToken in queryTokens
      tokenPoints = 0
      tokenPoints += 2 if matchesToken asset.search.id, queryToken
      tokenPoints += 2 if matchesToken asset.search.name, queryToken

      for tag in asset.search.tags
        for tagPart in tag.split " "
          tokenPoints += 1 if matchesToken tagPart, queryToken

      frac = 1/asset.search.files.length
      for file in asset.search.files when matchesToken file, queryToken
        tokenPoints += frac

      frac = 1/asset.search.exts.length
      for ext in asset.search.exts when matchesToken ext, queryToken
        tokenPoints += frac

      # If the asset doesn't match every queryToken, it fails the entire query
      return 0 if tokenPoints is 0

      points += tokenPoints

    for queryTag in queryTags
      tagPoints = 0

      for tag in asset.search.tags
        tagPoints += 2 if matchesToken tag, queryTag

      # If the asset doesn't match every queryTag, it fails the entire query
      return 0 if tagPoints is 0

      points += tagPoints

    return points


  Make "Search", Search = (assets, input)->
    return bail assets unless input?

    queryText = input.text.toLowerCase()
    queryTokens = tokenizeQueryText queryText
    queryTags = input.tags.map (t)-> t.toLowerCase()

    return bail assets unless queryTokens.length > 0 or queryTags.length > 0

    rankedMatches = {}

    for id, asset of assets
      points = computePoints asset, queryText, queryTokens, queryTags

      if points > 0 # asset matched all tokens
        points = Math.roundTo points, .1
        asset._points = points
        (rankedMatches[points] ?= []).push asset

    sortedAssets = []

    for key in Array.sortNumericDescending Object.keys(rankedMatches).map (v)-> +v
      sortedRank = rankedMatches[key].sort sortByName
      sortedAssets = sortedAssets.concat sortedRank

    return sortedAssets

  # TESTS

  if Env.isDev then Tests "Search", ()->

    Test "split queries on common separators",
      ["f00", "BAR", "2baz", "bash"],
      tokenizeQueryText "-f00-BAR_2baz  -  bash"

    Test "remove duplicate tokens",
      tokenizeQueryText "foo-bar foo -bar foo bar"
      ["foo", "bar"]

    Test "remove punctuation",
      tokenizeQueryText "(foo) [bar]!@_#$%-^&*() -[baz]!@_baz#$%^&*()"
      ["foo", "bar", "baz"]

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

    Test "value containing token does match",
      matchesToken "foo", "f"
      true

    Test "value containing only part of the token does not",
      matchesToken "f", "foo"
      false

    Test "null op always matches",
      matchesOp "foo", null
      true

    Test "same op does match",
      matchesOp "foo", "foo"
      true

    Test "different op does not match",
      matchesOp "foo", "bar"
      false

    Test "zero points for an empty asset",
      computePoints {search:{id:"X",name:"X",tags:[],files:[],exts:[]}}, "foo", ["foo"], []
      0

    Test "positive points for a basic match",
      computePoints {search:{id:"X",name:"foo",tags:[],files:[],exts:[]}}, "f", ["f"], []
      2

    Test "positive points for a tag match",
      computePoints {search:{id:"X",name:"X",tags:["baz"],files:[],exts:[]}}, "", [], ["baz"]
      2

    Test "partial points for a partial tag match",
      computePoints {search:{id:"X",name:"X",tags:["bazinga"],files:[],exts:[]}}, "baz", ["baz"], []
      1

    Test "more points for a better match",
      computePoints {search:{id:"X",name:"foo bar",tags:["bar"],files:["foo"],exts:[]}}, "foo", ["foo"], ["bar"]
      5

    Test "more points for an exact match",
      computePoints {search:{id:"exactly 123",name:"X",tags:[],files:[],exts:[]}}, "exactly 123", ["exactly", "123"], []
      100

    Test "zero points for a partial match",
      computePoints {search:{id:"X",name:"foo",tags:[],files:["foo"],exts:[]}}, "foo bar", ["foo", "bar"], []
      0

    Test "zero points for a partial match with tags too",
      computePoints {search:{id:"X",name:"foo",tags:["bar"],files:["foo"],exts:[]}}, "foo baz", ["foo", "baz"], ["bar"]
      0

    Test "zero points for a partial match with only tags",
      computePoints {search:{id:"X",name:"X",tags:["foo", "bar"],files:[],exts:[]}}, "", [""], ["foo", "baz"]
      0

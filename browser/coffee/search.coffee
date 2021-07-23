Take ["Env"], (Env)->

  sortByName = (a, b)->
    a.name.localeCompare b.name

  bail = (assets)->
    Object.values(assets).sort sortByName

  matchesToken = (value, token)-> value?.length > 0 and token?.length > 0 and -1 isnt value.indexOf token
  matchesOp = (ref, op)-> not op? or op is ref

  tokenizeQuery = (input)->
    tokens = input
      .toLowerCase()
      .split " "

      .map (token)->
        if token.charAt(0) is "-" or token.indexOf(":-") isnt -1
          token # negated tokens are not split on common dash-like punctuation
        else
          token.split /[-_]+/g # positive tokens are split on common dash-like punctuations
      .flat()
      .map (t)-> t.replace /[^\w\d-_:]*/g, ""
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

      if token.indexOf(":") isnt -1
        [op, token] = token.split ":"

      # Ignore empty operators
      continue if op is "" or token is ""

      if "-" is token.charAt(0) or "-" is op?.charAt(0)
        token = token[1..]
        # If the asset matches any negative token, it fails the entire query
        return 0 if matchesOp("id", op) and matchesToken asset.id, token
        return 0 if matchesOp("name", op) and matchesToken asset.search.name, token
        return 0 if matchesOp("tag", op) and matchesToken asset.search.tags, token
        if matchesOp "file", op
          for file in asset.search.files when matchesToken file, token
            return 0
        if matchesOp "ext", op
          for ext in asset.search.exts when matchesToken ext, token
            return 0

      else
        tokenPoints = 0
        tokenPoints += 2 if matchesOp("id", op) and matchesToken asset.search.id, token
        tokenPoints += 2 if matchesOp("name", op) and matchesToken asset.search.name, token
        tokenPoints += 1 if matchesOp("tag", op) and matchesToken asset.search.tags, token
        if matchesOp "file", op
          frac = 1/asset.search.files.length
          for file in asset.search.files when matchesToken file, token
            tokenPoints += frac
        if matchesOp "ext", op
          frac = 1/asset.search.exts.length
          for ext in asset.search.exts when matchesToken ext, token
            tokenPoints += frac

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

  if Env.isDev then Tests "Search", ()->

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
      computePoints {search:{id:"",name:"",tags:"",files:[],exts:[]}}, ["foo"]
      0

    Test "positive points for a basic match",
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["foo"]
      2

    Test "more points for a better match",
      computePoints {search:{id:"",name:"foo",tags:"foo",files:["foo"],exts:[]}}, ["foo"]
      4

    Test "zero points for an partial match",
      computePoints {search:{id:"",name:"foo",tags:"foo",files:["foo"],exts:[]}}, ["foo", "bar"]
      0

    Test "zero points for a negative match",
      computePoints {search:{id:"",name:"foo",tags:"foo",files:["foo"],exts:[]}}, ["-foo"]
      0

    Test "zero points for a mixed match",
      computePoints {search:{id:"",name:"foo",tags:"foo",files:["bar"],exts:[]}}, ["foo", "-bar"]
      0

    Test "positive points for a negative miss",
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["foo", "-bar"]
      2

    Test "positive points for a match with an operator",
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["name:foo"]
      2

    Test "zero points for a negative match with an operator",
      computePoints {search:{id:"test",name:"foo",tags:"",files:[],exts:[]}}, ["test", "name:-foo"]
      0

    Test "ignore empty operators when scoring",
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["foo", "name:", ":foo", ":"]
      2

    Test "tags, files, and exts also match once each",
      computePoints {search:{id:"foo",name:"foo",tags:"",files:["foo"],exts:["foo"]}}, ["name:foo", "file:foo", "ext:foo"]
      computePoints {search:{id:"foo",name:"foo",tags:"",files:["bar"],exts:["baz"]}}, ["name:foo", "file:bar", "ext:baz"]
      4

    Test "zero points for misses with an operator",
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["name:bar"]
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["file:foo"]
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["id:foo"]
      computePoints {search:{id:"",name:"foo",tags:"",files:[],exts:[]}}, ["ext:foo"]
      0

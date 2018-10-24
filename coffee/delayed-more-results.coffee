Take ["Search", "Globals"], (Search)->

  moreResultsRequested = false

  requestMoreResults = ()->
    unless moreResultsRequested
      moreResultsRequested = true
      setTimeout moreResults, 100
    return false


  moreResults = ()->
    moreResultsRequested = false
    if Search.filteredAssets.length > Search.assetListLimit
      Search.assetListLimit += 50
      Pub "Render"
      requestMoreResults()


  Sub "Search Updated", requestMoreResults

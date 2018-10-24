Take ["DB", "Globals"], (DB)->

  moreResultsRequested = false

  requestMoreResults = ()->
    unless moreResultsRequested
      moreResultsRequested = true
      setTimeout moreResults, 100
    return false


  moreResults = ()->
    moreResultsRequested = false
    if DB.filteredAssets.length > DB.assetListLimit
      DB.assetListLimit += 50
      Pub "Render"
      requestMoreResults()


  Sub "Search Updated", requestMoreResults

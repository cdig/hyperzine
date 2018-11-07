Take ["AssetList"], (AssetList)->

  Make "SearchView", ()->
    display = if StateMachine() is "Search" then "block" else "none"
    
    Preact.h "search-view", {style: "display: #{display}"},
      AssetList()

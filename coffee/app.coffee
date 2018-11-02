Take ["DB", "LoadAssets", "Globals"], (DB, LoadAssets)->
  LoadAssets ()->
    StateMachine DB.appState or "Search"

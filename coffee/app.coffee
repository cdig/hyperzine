Take ["DB", "LoadAssets", "Globals"], (DB, LoadAssets)->
  LoadAssets ()->
    if DB.activeAssetId?
      StateMachine "Asset"
    else
      StateMachine "Search"

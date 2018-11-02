Take ["DB", "Globals"], (DB)->
  Sub "Edit Asset", (asset)->
    DB.activeAssetId = asset?.id
    StateMachine "Asset"

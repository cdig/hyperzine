Take ["Globals"], ()->
  newAsset = ()->
    StateMachine "New Asset"

  Make "NewAssetButton", ()->
    Preact.h "button", {"new-asset":"", onclick: newAsset}, "New Asset"

Take ["Globals"], ()->

  Make "NewAssetView", ()->
    display = if StateMachine() is "New Asset" then "block" else "none"

    Preact.h "new-asset-view", {style: "display: #{display}"}, "New Asset"

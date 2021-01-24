Take ["Globals"], ()->
  click = ()->
    Pub "To New Asset View"

  Make "NewAssetButton", ()->
    Preact.h "button", {"new-asset":"", onclick: click}, "New Asset"

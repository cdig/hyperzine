Take ["Globals"], ()->
  Make "NewAssetButton", ()->
    Preact.h "button", {"new-asset":"", onclick: ()-> Pub "New Asset"}, "New Asset"

Take ["DOOM", "Paths"], (DOOM, Paths)->

  displayName = (asset)->
    (asset.name or asset.id).replace /[-_]/g, " "

  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card", null,
      onclick: ()-> Pub "Edit Asset", asset

    card._asset = asset

    name = DOOM.create "asset-name", card,
      textContent: displayName asset

    if asset.shot?
      DOOM.create "img", card, src: Paths.shot asset

    taglist = DOOM.create "tag-list", card
    card._points = DOOM.create "div", taglist, textContent: 0
    for v in asset.tags
      DOOM.create "div", taglist, textContent: v

    card

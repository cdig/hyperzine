Take ["DOOM", "Frustration", "Paths"], (DOOM, Frustration, Paths)->

  displayName = (asset)->
    (asset.name or asset.id).replace /[-_]/g, " "

  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card", null,
      onclick: ()-> Pub "Edit Asset", asset

    card._asset = asset

    assetImage = DOOM.create "asset-image", card

    if asset.shot?
      DOOM.create "img", assetImage, src: Paths.shot asset
    else
      noImg = DOOM.create "no-img", assetImage, textContent: Frustration()

    name = DOOM.create "asset-name", card,
      textContent: displayName asset

    taglist = DOOM.create "tag-list", card
    card._points = DOOM.create "div", taglist, textContent: 0
    for v in asset.tags
      DOOM.create "div", taglist, textContent: v

    card

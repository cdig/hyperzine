{ shell } = require "electron"

Take ["DOOM", "Frustration", "Paths"], (DOOM, Frustration, Paths)->

  displayName = (asset)->
    (asset.name or asset.id).replace /[-_]/g, " "
  console.log "YO"
  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card"

    card._asset = asset

    assetImage = DOOM.create "asset-image", card

    if asset.shot?
      img = DOOM.create "img", assetImage, src: Paths.shot asset
    else
      img = DOOM.create "no-img", assetImage, textContent: Frustration()

    img.addEventListener "click", ()->
      console.log "YO"
      # Pub "Edit Asset", asset
      shell.showItemInFolder Paths.asset asset

    name = DOOM.create "asset-name", card,
      textContent: displayName asset

    taglist = DOOM.create "tag-list", card
    for v in asset.tags
      DOOM.create "div", taglist, textContent: v

    card

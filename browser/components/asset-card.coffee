{ shell } = require "electron"

Take ["DOOM", "Frustration", "IPC", "Paths"], (DOOM, Frustration, IPC, Paths)->

  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card"

    card._asset = asset

    assetImage = DOOM.create "asset-image", card

    if asset.shot?
      img = DOOM.create "img", assetImage, src: Paths.shot asset
    else
      img = DOOM.create "no-img", assetImage, textContent: Frustration()

    img.addEventListener "click", ()->
      # shell.showItemInFolder Paths.files asset
      IPC.openAsset asset.id

    name = DOOM.create "asset-name", card,
      textContent: Paths.displayName asset

    taglist = DOOM.create "tag-list", card
    for v in asset.tags
      DOOM.create "div", taglist, textContent: v

    card

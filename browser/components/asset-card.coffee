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
      IPC.openAsset asset.id

    assetName = DOOM.create "asset-name", card,
      textContent: Paths.displayName asset

    metaList = DOOM.create "meta-list", card

    fileCount = DOOM.create "file-count", metaList,
      textContent: asset.files.length

    for v in asset.tags
      DOOM.create "tag-item", metaList, textContent: v

    card

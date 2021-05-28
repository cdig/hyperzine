Take ["DOOM", "Frustration", "IPC", "OnScreen", "Paths", "DOMContentLoaded"], (DOOM, Frustration, IPC, OnScreen, Paths)->


  build = (card, asset)->
    assetImage = DOOM.create "asset-image", card

    if asset.shot?
      img = DOOM.create "img", assetImage, src: Paths.shot asset
    else
      img = DOOM.create "no-img", assetImage, textContent: Frustration()

    img.addEventListener "click", ()->
      IPC.send "open-asset", asset.id

    assetName = DOOM.create "asset-name", card,
      textContent: asset.name or asset.id

    metaList = DOOM.create "meta-list", card

    fileCount = DOOM.create "file-count", metaList,
      textContent: asset.files.count

    for v in asset.tags
      DOOM.create "tag-item", metaList, textContent: v


  onScreen = (card, visible)->
    if visible and not card._built
      card._built = true
      build card, card._asset



  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card"
    card._asset = asset
    OnScreen card, onScreen
    card

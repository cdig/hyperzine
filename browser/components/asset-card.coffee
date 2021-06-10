Take ["DOOM", "Frustration", "IPC", "Log", "Memory", "OnScreen", "Paths", "DOMContentLoaded"], (DOOM, Frustration, IPC, Log, Memory, OnScreen, Paths)->

  cards = {}


  unloadImage = (card, asset)->
    if card._img
      DOOM.remove card._img
      card._img = null


  loadImage = (card, asset)->
    unloadImage card, asset # Clear any old image

    if asset.shot?
      img = DOOM.create "img", card._assetImageElm, src: Paths.shot asset

    else
      card._hash ?= String.hash asset.id
      img = DOOM.create "no-img", card._assetImageElm, textContent: Frustration card._hash
      img.style.setProperty "--hue", card._hash % 360

    img.onclick = ()-> IPC.send "open-asset", asset.id
    card._img = img


  build = (card, asset)->
    card._asset = asset
    frag = new DocumentFragment()

    assetImage = DOOM.create "asset-image", frag
    card._assetImageElm = assetImage

    assetName = DOOM.create "asset-name", frag,
      textContent: asset.name or asset.id

    metaList = DOOM.create "meta-list", frag

    fileCount = DOOM.create "file-count", metaList,
      textContent: String.pluralize asset.files.count, "%% File"

    for v in asset.tags
      DOOM.create "tag-item", metaList, textContent: v

    if card._visible
      loadImage card, card._asset

    card.replaceChildren frag


  onScreen = (card, visible)->
    if visible and not card._visible
      loadImage card, card._asset
    if not visible and card._visible
      unloadImage card, card._asset
    card._visible = visible


  update = (card, asset)-> cb = (updatedAsset)->
    if updatedAsset?
      build card, updatedAsset
    else
      card.remove()
      delete cards[asset.id]
      Memory.unsubscribe "assets.#{asset.id}", cb


  Make "AssetCard", AssetCard = (asset)->
    return card if card = cards[asset.id]
    card = cards[asset.id] = DOOM.create "asset-card"
    build card, asset
    OnScreen card, onScreen
    Memory.subscribe "assets.#{asset.id}", false, update card, asset
    card

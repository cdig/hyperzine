Take ["DB", "DOOM", "Frustration", "IPC", "Log", "Memory", "OnScreen", "Paths", "Read", "DOMContentLoaded"], (DB, DOOM, Frustration, IPC, Log, Memory, OnScreen, Paths, Read)->
  { nativeImage } = require "electron"

  cards = {}


  unloadImage = (card, asset)->
    if card._img
      DOOM.remove card._img
      card._img = null

  loadImage = (card, asset)->
    unloadImage card, asset # Clear any old image

    if asset.shot?
      path = Paths.shot asset

      if asset.files?.count > 0
        shot = asset.shot.replace /\.png/, ""
        for child in asset.files.children
          if child.name is shot
            thumbPath = Read.path Paths.asset(asset), "Files", shot
            break

        loading = DOOM.create "div", card._assetImageElm, class: "loading", textContent: "Loading"
        thumbPath = await DB.send "create-thumbnail", thumbPath

        path = thumbPath if thumbPath

    if path
      img = DOOM.create "img", null, src: path
    else
      card._hash ?= String.hash asset.id
      img = DOOM.create "no-img", null, textContent: Frustration card._hash
      img.style.setProperty "--hue", card._hash % 360

    card._assetImageElm.replaceChildren img

    img.onclick = ()-> IPC.send "open-asset", asset.id
    card._img = img


  build = (card, asset)->
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
    card._built = true


  onScreen = (card, visible)->
    if visible and not card._visible
      build card, card._asset unless card._built
      loadImage card, card._asset
    if not visible and card._visible
      unloadImage card, card._asset
    card._visible = visible


  update = (card, asset)-> cb = (updatedAsset)->
    if updatedAsset?
      card._built = false
      build card, updatedAsset if card._visible
    else
      card.remove()
      delete cards[asset.id]
      Memory.unsubscribe "assets.#{asset.id}", cb


  Make "AssetCard", AssetCard = (asset)->
    return card if card = cards[asset.id]
    card = cards[asset.id] = DOOM.create "asset-card"
    card._asset = asset
    OnScreen card, onScreen
    Memory.subscribe "assets.#{asset.id}", false, update card, asset
    card

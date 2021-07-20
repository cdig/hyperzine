Take ["DB", "DOOM", "Frustration", "IPC", "Log", "Memory", "MemoryField", "OnScreen", "Paths", "PubSub", "Read", "State", "TagList", "Validations", "DOMContentLoaded"], (DB, DOOM, Frustration, IPC, Log, Memory, MemoryField, OnScreen, Paths, {Sub}, Read, State, TagList, Validations)->
  cards = {}


  unloadImage = (card)->
    card._img?.style?.display = "none"
    card._loaded = false


  loadImage = (card)->
    asset = card._asset

    if card._loaded
      card._img.style.display = "inline-block"
      return

    card._loaded = true
    size = if DOOM(document.body, "hideLabels") is "" then 128 else 512
    path = Paths.thumbnail asset, "#{size}.jpg"
    img = DOOM.create "img", null, src: path
    img.addEventListener "error", ()-> frustration card, asset
    card._assetImageElm.replaceChildren img
    card._img = img


  frustration = (card, asset)->
    console.log "ERROR"
    card._hash ?= String.hash asset.id
    img = DOOM.create "no-img", null, class: "frustration"
    DOOM.create "span", img, textContent: Frustration card._hash
    hue = 71 * card._hash % 360
    img.style.setProperty "--lit",    d3.lch  90, 30, hue
    img.style.setProperty "--shaded", d3.lch  50, 70, hue
    img.style.setProperty "--shadow", d3.lch  30, 90, hue
    img.style.setProperty "--glow",   d3.lch 120, 60, hue
    img.style.setProperty "--bg",     d3.lch 120, 20, hue
    card._assetImageElm.replaceChildren img
    card._img = img


  build = (card)->
    card._built = true

    frag = new DocumentFragment()
    asset = card._asset

    card._assetImageElm ?= DOOM.create "asset-image", null, click: ()-> IPC.send "open-asset", asset.id
    frag.append card._assetImageElm

    label = DOOM.create "asset-label", frag

    assetName = DOOM.create "asset-name", label, class: "basic-field"
    MemoryField "assets.#{asset.id}.name", assetName, validate: Validations.asset.name

    tagList = DOOM.create "tag-list", label

    fileCount = DOOM.create "file-count", tagList,
      textContent: String.pluralize asset.files.count, "%% File"

    tagList.append TagList asset, click: (tag, elm)->
      current = State "search"
      if not current
        State "search", tag
      else if current.indexOf(tag) is -1
        State "search", [current, tag].join " "

    card.replaceChildren frag


  unbuild = (card)->
    unloadImage card
    card._built = false
    card.replaceChildren()


  update = (card)->
    build card if card._visible and not card._built
    loadImage card if card._visible and not card._loaded
    unloadImage card if not card._visible and card._loaded and (not card._index? or card._index > 100)

    # The last part of this conditional (about _index) stops the results that are up near the search bar
    # from flickering as you type in a search (due to OnScreen quickly alternating between invisible and visible).
    # unbuild card if not card._visible and card._loaded and (not card._index? or card._index > 100)


  onScreen = (card, visible)->
    card._visible = visible
    update card


  assetChanged = (card, assetId)-> cb = (asset)->
    if asset?
      card._asset = asset
      card._loaded = false
      card._built = false
      update card
    else
      card.remove()
      delete cards[assetId]
      Memory.unsubscribe "assets.#{assetId}", cb

  rebuildCard = (card, assetId)-> ()->
    assetChanged(card, assetId) Memory "assets.#{assetId}"

  Make.async "AssetCard", AssetCard = (asset, index)->
    card = cards[asset.id]
    if not card?
      card = cards[asset.id] = DOOM.create "asset-card"
      card._asset = asset
      OnScreen card, onScreen
      Memory.subscribe "assets.#{asset.id}", false, assetChanged card, asset.id
      # This is for testing whether we see flashing
      # setInterval rebuildCard(card, asset.id), 500
    card._index = index
    card


  AssetCard.unbuildCards = ()->
    for assetId, card of cards when card._built and not card._visible
      unbuild card

  Sub "Unbuild Cards", AssetCard.unbuildCards

  AssetCard.clearIndexes = ()->
    for assetId, card of cards
      card._index = null

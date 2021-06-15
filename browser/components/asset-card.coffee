Take ["DB", "DOOM", "Frustration", "IPC", "Log", "Memory", "OnScreen", "Paths", "PubSub", "Read", "DOMContentLoaded"], (DB, DOOM, Frustration, IPC, Log, Memory, OnScreen, Paths, {Sub}, Read)->
  cards = {}


  unloadImage = (card)->
    card._assetImageElm.replaceChildren()
    card._loaded = false


  loadImage = (card)->
    asset = card._asset

    unloadImage card, asset # Clear any old image

    card._loaded = true

    if asset.shot?
      path = Paths.shot asset

      if asset.files?.count > 0
        shotSourceName = asset.shot.replace /\.png/, ""
        for child in asset.files.children when child.name is shotSourceName
          shotSourcePath = Paths.file asset, shotSourceName
          break

    if shotSourcePath
      loading = DOOM.create "div", null, class: "loading", textContent: "Loading"

      size = if DOOM(document.body, "hideLabels") is "" then 128 else 512
      thumbPath = card._thumbPath ?= await DB.send "create-thumbnail", shotSourcePath, size

      # In the time it took to create the thumbnail, the card might have scrolled
      # offscreen and unloaded. In that case, we should just bail now.
      # If the card scrolled off and then back on, loadImage might be called multiple times.
      # This is fine, since loadImage is idempotent and create-thumbnail is memoized.
      return unless card._loaded

      # create-thumbnail will return null if it fails, in which case we can just load the old low-res asset.shot image
      path = thumbPath if thumbPath

    if path
      img = DOOM.create "img", null, src: path

    else
      card._hash ?= String.hash asset.id
      img = DOOM.create "no-img", null
      DOOM.create "span", img, textContent: Frustration card._hash
      img.style.setProperty "--hue", card._hash % 360

    img.onclick = ()-> IPC.send "open-asset", asset.id
    card._assetImageElm.replaceChildren img


  build = (card)->
    card._built = true

    frag = new DocumentFragment()
    asset = card._asset

    card._assetImageElm = DOOM.create "asset-image", frag

    label = DOOM.create "asset-label", frag

    DOOM.create "asset-name", label, textContent: asset.name or asset.id

    metaList = DOOM.create "meta-list", label

    fileCount = DOOM.create "file-count", metaList,
      textContent: String.pluralize asset.files.count, "%% File"

    for v in asset.tags
      DOOM.create "tag-item", metaList, textContent: v

    card.replaceChildren frag


  unbuild = (card)->
    unloadImage card
    card._built = false
    card.replaceChildren()


  update = (card)->
    build card if card._visible and not card._built
    loadImage card if card._visible and not card._loaded
    unloadImage card if not card._visible and card._loaded
    # unbuild card if not card._visible and card._loaded


  onScreen = (card, visible)->
    card._visible = visible
    update card


  assetChanged = (card, assetId)-> cb = (asset)->
    if asset?
      card._asset = asset
      card._built = false
      update card
    else
      card.remove()
      delete cards[assetId]
      Memory.unsubscribe "assets.#{assetId}", cb


  Sub "Unbuild Cards", ()->
    for assetId, card of cards when card._built and not card._visible
      unbuild card


  Make "AssetCard", AssetCard = (asset)->
    return card if card = cards[asset.id]
    card = cards[asset.id] = DOOM.create "asset-card"
    card._asset = asset
    OnScreen card, onScreen
    Memory.subscribe "assets.#{asset.id}", false, assetChanged card, asset.id
    card

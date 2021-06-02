Take ["DOOM", "Frustration", "IPC", "Log", "Memory", "OnScreen", "Paths", "DOMContentLoaded"], (DOOM, Frustration, IPC, Log, Memory, OnScreen, Paths)->


  build = (card, asset)->
    card._asset = asset
    asset._card = card

    frag = new DocumentFragment()

    assetImage = DOOM.create "asset-image", frag

    if asset.shot?
      img = DOOM.create "img", assetImage, src: Paths.shot asset
    else
      hash = String.hash asset.id
      img = DOOM.create "no-img", assetImage, textContent: Frustration hash
      img.style.setProperty "--hue", hash % 360

    img.onclick = ()-> IPC.send "open-asset", asset.id

    assetName = DOOM.create "asset-name", frag,
      textContent: asset.name or asset.id

    metaList = DOOM.create "meta-list", frag

    fileCount = DOOM.create "file-count", metaList,
      textContent: asset.files.count

    for v in asset.tags
      DOOM.create "tag-item", metaList, textContent: v

    card.replaceChildren frag


  onScreen = (card, visible)->
    if visible and not card._built
      card._built = true
      build card, card._asset


  update = (card, asset)-> cb = (updatedAsset)->
    if updatedAsset?
      build card, updatedAsset
    else
      card.remove()
      card._asset._card = null
      Log "UNSUB"
      Memory.unsubscribe "assets.#{asset.id}", cb


  Make "AssetCard", AssetCard = (asset)->
    card = DOOM.create "asset-card"
    build card, asset
    OnScreen card, onScreen
    Memory.subscribe "assets.#{asset.id}", false, update card, asset
    card

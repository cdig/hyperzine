Take ["AssetCard", "Debounced", "DOOM", "Frustration", "Iterated", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, Debounced, DOOM, Frustration, Iterated, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  noAssets = document.querySelector "no-assets"
  rainbowClouds = document.querySelector "rainbow-clouds"
  assetCount = document.querySelector "asset-count"

  renderCount = 1
  assetsToRender = []
  lastQuery = null

  Render = Debounced ()->
    Log "Render"
    assets = Memory "assets"
    return unless assets?

    query = State "search"

    if query isnt lastQuery
      lastQuery = query
      elm.scrollTo 0, 0
      AssetCard.unbuildCards()

    AssetCard.clearIndexes()

    assetsToRender = Search assets, query

    hasResults = assetsToRender.length > 0

    elm.replaceChildren()

    update() if hasResults

    DOOM assetCount, innerHTML: String.pluralize(assetsToRender.length, "%% <span>Asset") + "</span>"

    DOOM noAssets, display: if hasResults then "none" else "block"
    DOOM rainbowClouds, display: if hasResults then "none" else "block"
    rainbowClouds.style.animationPlayState = if hasResults then "paused" else "playing"

    # Log renderCount
    DOOM noAssets.querySelector("h1"), textContent: Frustration renderCount unless hasResults
    renderCount++

  update = Iterated 5, (more)->
    frag = new DocumentFragment()
    for asset, i in assetsToRender when asset
      card = AssetCard asset, i
      assetsToRender[i] = null
      DOOM.append frag, card
      break unless more()
    DOOM.append elm, frag


  Make "Render", Render

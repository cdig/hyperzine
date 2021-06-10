Take ["AssetCard", "DOOM", "Frustration", "Iterated", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, DOOM, Frustration, Iterated, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  noAssets = document.querySelector "no-assets"
  rainbowClouds = document.querySelector "rainbow-clouds"
  assetCount = document.querySelector "asset-count"

  renderCount = 1
  assetsToRender = []
  lastQuery = null

  Render = ()->
    assets = Memory "assets"
    return unless assets?

    renderCount++

    assets = Object.values assets

    query = State "search"

    if query isnt lastQuery
      lastQuery = query
      elm.scrollTo 0, 0

    assetsToRender = Search assets, query
    hasResults = assetsToRender.length > 0

    elm.replaceChildren()
    update() if hasResults

    DOOM assetCount, innerHTML: String.pluralize(assetsToRender.length, "%% <span>Asset") + "</span>"

    DOOM noAssets, display: if hasResults then "none" else "block"
    DOOM rainbowClouds, display: if hasResults then "none" else "block"
    rainbowClouds.style.animationPlayState = if hasResults then "paused" else "playing"
    DOOM noAssets.querySelector("h1"), textContent: Frustration renderCount unless hasResults

  update = Iterated 3, (more)->
    frag = new DocumentFragment()
    for asset, i in assetsToRender when asset
      card = AssetCard asset
      assetsToRender[i] = null
      DOOM.append frag, card
      break unless more()
    DOOM.append elm, frag

  Make "Render", Render

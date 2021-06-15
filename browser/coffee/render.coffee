Take ["AssetCard", "Debounced", "DOOM", "Frustration", "Iterated", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, Debounced, DOOM, Frustration, Iterated, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  noAssets = document.querySelector "no-assets"
  rainbowClouds = document.querySelector "rainbow-clouds"
  assetCount = document.querySelector "asset-count"

  renderCount = 1
  assetsToRender = {}
  count = null
  lastQuery = null

  Render = Debounced ()->
    assets = Memory "assets"
    return unless assets?

    # Log renderCount
    # renderCount++

    query = State "search"

    if query isnt lastQuery
      lastQuery = query
      elm.scrollTo 0, 0

    # Search will return a clone of assets that we are safe to mutate
    [assetsToRender, count] = Search assets, query

    hasResults = count > 0

    elm.replaceChildren()

    update() if hasResults

    DOOM assetCount, innerHTML: String.pluralize(count, "%% <span>Asset") + "</span>"

    DOOM noAssets, display: if hasResults then "none" else "block"
    DOOM rainbowClouds, display: if hasResults then "none" else "block"
    rainbowClouds.style.animationPlayState = if hasResults then "paused" else "playing"
    DOOM noAssets.querySelector("h1"), textContent: Frustration renderCount unless hasResults

  update = Iterated 500, (more)->
    frag = new DocumentFragment()
    for id, asset of assetsToRender when asset
      card = AssetCard asset
      assetsToRender[id] = null
      DOOM.append frag, card
      break unless more()
    DOOM.append elm, frag


  Make "Render", Render

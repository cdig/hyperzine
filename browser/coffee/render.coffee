Take ["AssetCard", "DOOM", "Frustration", "Iterated", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, DOOM, Frustration, Iterated, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  noAssets = document.querySelector "no-assets"
  rainbowClouds = document.querySelector "rainbow-clouds"
  assetCount = document.querySelector "asset-count"

  renderCount = 1
  assetsToRender = []

  # Render = ()-> Log.time "Render #{renderCount++}", ()->
  Render = ()->
    assets = Memory "assets"
    return unless assets?

    assets = Object.values assets

    query = State "search"
    # filteredAssets = Log.time "Search", ()-> Search assets, query
    filteredAssets = Search assets, query
    DOOM assetCount, textContent: String.pluralize filteredAssets.length, "%% Asset"

    elm.replaceChildren() # Empty the asset list
    assetsToRender = []

    if filteredAssets.length
      assetsToRender = [].concat filteredAssets
      update()

    noResults = filteredAssets.length is 0
    DOOM noAssets, display: if noResults then "block" else "none"
    DOOM rainbowClouds, display: if noResults then "block" else "none"
    rainbowClouds.style.animationPlayState = if noResults then "playing" else "paused"
    DOOM noAssets.querySelector("h1"), textContent: Frustration() if noResults

    # elm.scroll(0,0)

  update = Iterated 2, (more)->
    frag = new DocumentFragment() # Build a frag to hold all the assets we want to show
    for asset, i in assetsToRender when asset
      card = AssetCard asset
      assetsToRender[i] = null # done
      DOOM.append frag, card
      break unless more()

    DOOM.append elm, frag
    console.log elm.childElementCount



  Make "Render", Render

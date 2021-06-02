Take ["AssetCard", "DOOM", "Frustration", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, DOOM, Frustration, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  noAssets = document.querySelector "no-assets"
  rainbowClouds = document.querySelector "rainbow-clouds"
  assetCount = document.querySelector "asset-count"

  renderCount = 1

  Render = ()-> Log.time "Render #{renderCount++}", ()->
    assets = Memory "assets"
    return unless assets?

    assets = Object.values assets

    query = State "search"
    filteredAssets = Log.time "Search", ()-> Search assets, query
    DOOM assetCount, textContent: String.pluralize filteredAssets.length, "%% Asset"

    elm.replaceChildren() # Empty the asset list
    frag = new DocumentFragment() # Build a frag to hold all the assets we want to show

    for asset in filteredAssets
      AssetCard asset unless asset._card?
      DOOM.append frag, asset._card

    noResults = filteredAssets.length is 0
    DOOM noAssets, display: if noResults then "block" else "none"
    DOOM rainbowClouds, display: if noResults then "block" else "none"
    rainbowClouds.style.animationPlayState = if noResults then "playing" else "paused"
    DOOM noAssets.querySelector("h1"), textContent: Frustration() if noResults

    DOOM.append elm, frag
    # elm.scroll(0,0)

  # Render.deleteAssetCard = (asset)->
  #   if asset?._card?
  #     DOOM.remove asset._card
  #     delete asset._card


  Make "Render", Render

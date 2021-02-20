Take ["Assets", "AssetCard", "PubSub", "Search", "State"], (Assets, AssetCard, {Pub}, Search, State)->
  root = null
  elm = document.querySelector "asset-list"


  Make "Render", Render = ()->
    start = performance.now()

    assets = Object.values Assets()
    filteredAssets = Search assets, State.search
    filteredAssets = filteredAssets[0...50]

    for asset in assets when asset._card?
      DOOM asset._card, display: "none"

    for asset in filteredAssets
      asset._card ?= AssetCard asset
      DOOM.append elm, asset._card
      DOOM asset._card, display: "block"
      DOOM asset._card._points, textContent: asset._points or 0

    Pub "Results", filteredAssets

    console.log performance.now() - start

Take ["Assets", "AssetCard", "PubSub", "Search", "State"], (Assets, AssetCard, {Pub}, Search, State)->
  root = null
  elm = document.querySelector "asset-list"

  Render = ()->
    # start = performance.now()

    assets = Object.values Assets()
    filteredAssets = Search assets, State.search
    filteredAssets = filteredAssets[0...50]

    for asset in assets when asset._card?
      DOOM asset._card, display: "none"

    for asset in filteredAssets
      asset._card ?= AssetCard asset
      DOOM.append elm, asset._card
      DOOM asset._card, display: "block"

    Pub "Results", filteredAssets

    # console.log performance.now() - start


  Render.deleteAssetCard = (asset)->
    if asset?._card?
      DOOM.remove asset._card
      delete asset._card


  Make "Render", Render

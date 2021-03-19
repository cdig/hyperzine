Take ["Assets", "AssetCard", "DOOM", "PubSub", "Search", "State"], (Assets, AssetCard, DOOM, {Pub}, Search, State)->
  elm = document.querySelector "asset-list"

  Render = ()->
    # start = performance.now()

    assets = Object.values Assets()

    filteredAssets = Search assets, State.search
    Pub "ResultsCount", filteredAssets.length

    filteredAssets = filteredAssets[0...50]

    for asset in assets when asset._card?
      DOOM asset._card, display: "none"

    for asset in filteredAssets
      asset._card ?= AssetCard asset
      DOOM.append elm, asset._card
      DOOM asset._card, display: "block"

    # console.log performance.now() - start


  Render.deleteAssetCard = (asset)->
    if asset?._card?
      DOOM.remove asset._card
      delete asset._card


  Make "Render", Render

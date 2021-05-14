Take ["AssetCard", "DOOM", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, DOOM, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  assetCount = document.querySelector "[asset-count]"

  Render = ()->
    assets = Object.values Memory "assets"

    filteredAssets = Search assets, State "search"
    DOOM assetCount, textContent: filteredAssets.length + " Assets"

    filteredAssets = filteredAssets[0...50]

    for asset in assets when asset._card?
      DOOM asset._card, display: "none"

    for asset in filteredAssets
      asset._card ?= AssetCard asset
      DOOM.append elm, asset._card
      DOOM asset._card, display: "block"

    elm.scroll(0,0)


  # Render.deleteAssetCard = (asset)->
  #   if asset?._card?
  #     DOOM.remove asset._card
  #     delete asset._card


  Make "Render", Render

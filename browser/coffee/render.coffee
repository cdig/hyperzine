Take ["AssetCard", "DOOM", "Log", "Memory", "Search", "State", "DOMContentLoaded"], (AssetCard, DOOM, Log, Memory, Search, State)->
  elm = document.querySelector "asset-list"
  assetCount = document.querySelector "asset-count"

  Render = ()->
    assets = Memory "assets"
    return unless assets?

    assets = Object.values assets

    filteredAssets = Search assets, State "search"
    DOOM assetCount, textContent: String.pluralize filteredAssets.length, "%% Asset"

    elm.replaceChildren() # Empty the asset list
    frag = new DocumentFragment() # Build a frag to hold all the assets we want to show

    for asset in filteredAssets
      asset._card ?= AssetCard asset
      DOOM.append frag, asset._card

    DOOM.append elm, frag
    # elm.scroll(0,0)

  # Render.deleteAssetCard = (asset)->
  #   if asset?._card?
  #     DOOM.remove asset._card
  #     delete asset._card


  Make "Render", Render

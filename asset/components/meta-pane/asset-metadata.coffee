Take ["DOOM", "State", "DOMContentLoaded"], (DOOM, State)->
  assetMetadata = document.querySelector "asset-metadata"
  assetId = assetMetadata.querySelector "[asset-id] span"

  Make "AssetMetadata", AssetMetadata =
    render: ()->
      DOOM assetId, textContent: State("asset").id

Take ["AssetMetadata", "DOOM", "Paths", "State", "DOMContentLoaded"], (AssetMetadata, DOOM, Paths, State)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "[asset-name]"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"

  Make "MetaPane", MetaPane =
    render: ()->
      DOOM assetName, textContent: Paths.displayName State "asset"
      AssetMetadata.render()

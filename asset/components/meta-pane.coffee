Take ["DOOM", "Paths", "State", "DOMContentLoaded"], (DOOM, Paths, State)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "[asset-name]"
  assetMetadata = metaPane.querySelector "asset-metadata"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"

  Make "MetaPane", MetaPane =
    render: ()->
      DOOM assetName, textContent: Paths.displayName State.asset

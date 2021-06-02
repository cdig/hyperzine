Take ["AssetMetadata", "DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], (AssetMetadata, DOOM, Memory, Paths, State)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "[asset-name]"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"

  assetName.addEventListener "blur", (e)-> setAssetName()

  assetName.addEventListener "keydown", (e)->
    if e.keyCode is 13
      e.preventDefault()
      setAssetName()
      assetName.blur()

  assetName.addEventListener "input", (e)->
    assetName.className = if assetNameValid() then "field" else "field invalid"
    setAssetName()

  assetNameValid = ()->
    return -1 is assetName.textContent.trim().search /[:/\\]/

  setAssetName = ()->
    asset = State "asset"
    v = assetName.textContent.trim()
    return unless v.length and assetNameValid()
    Memory "assets.#{asset.id}.name", v


  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"
      DOOM assetName, textContent: asset.name or asset.id
      AssetMetadata.render()

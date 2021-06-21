Take ["MetaTools", "DOOM", "Memory", "Paths", "State", "TagList", "DOMContentLoaded"], (MetaTools, DOOM, Memory, Paths, State, TagList)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "[asset-name]"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"
  tagList = metaPane.querySelector "tag-list"

  assetName.addEventListener "focus", (e)->
    assetName._focused = true

  assetName.addEventListener "blur", (e)->
    assetName._focused = false
    setAssetName()

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

  removeTag = (tag)-> (e)->
    asset = State "asset"
    tags = Memory "assets.#{asset.id}.tags"
    tags = [].concat tags
    Array.pull tags, tag
    Memory "assets.#{asset.id}.tags", tags

  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"

      if not assetName._focused
        DOOM assetName, textContent: asset.name or asset.id

      tagList.replaceChildren TagList asset, removeTag

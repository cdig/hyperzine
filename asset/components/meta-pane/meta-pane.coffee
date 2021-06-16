Take ["MetaTools", "DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], (MetaTools, DOOM, Memory, Paths, State)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "[asset-name]"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"
  tagList = metaPane.querySelector "tag-list"

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

  remove = (tag)-> (e)->
    asset = State "asset"
    tags = Memory "assets.#{asset.id}.tags"
    tags = [].concat tags
    Array.pull tags, tag
    Memory "assets.#{asset.id}.tags", tags

  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"
      DOOM assetName, textContent: asset.name or asset.id

      tagList.replaceChildren()
      frag = new DocumentFragment()
      for tag in asset.tags
        tagItem = DOOM.create "tag-item", frag, textContent: tag
        DOOM.create "span", tagItem, textContent: "x", click: remove tag
      tagList.append frag

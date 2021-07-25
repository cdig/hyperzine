Take ["DB", "DOOM", "Memory", "MemoryField", "MetaTools", "Paths", "State", "TagList", "Validations", "DOMContentLoaded"], (DB, DOOM, Memory, MemoryField, MetaTools, Paths, State, TagList, Validations)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "asset-name"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"
  tagList = metaPane.querySelector "tag-list"

  removeTag = (tag)->
    asset = State "asset"
    DB.send "Remove Tag", asset.id, tag

  renameAsset = (v)->
    asset = State "asset"
    DB.send "Rename Asset", asset.id, v

  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"
      tagList.replaceChildren TagList asset, removeFn: removeTag
      MemoryField "assets.#{asset.id}.name", assetName,
        saveOnInput: true
        validate: Validations.asset.name
        update: renameAsset

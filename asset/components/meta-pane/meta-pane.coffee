Take ["DOOM", "Memory", "MemoryField", "MetaTools", "Paths", "State", "TagList", "Validations", "DOMContentLoaded"], (DOOM, Memory, MemoryField, MetaTools, Paths, State, TagList, Validations)->
  metaPane = document.querySelector "meta-pane"
  assetName = metaPane.querySelector "asset-name"
  addNote = metaPane.querySelector "[add-note]"
  assetHistory = metaPane.querySelector "[asset-history]"
  tagList = metaPane.querySelector "tag-list"

  removeTag = (tag)-> (e)->
    asset = State "asset"
    tags = Memory "assets.#{asset.id}.tags"
    tags = [].concat tags
    Array.pull tags, tag
    Memory "assets.#{asset.id}.tags", tags

  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"
      MemoryField "assets.#{asset.id}.name", assetName, saveOnInput: true, validate: Validations.asset.name
      tagList.replaceChildren TagList asset, removeTag

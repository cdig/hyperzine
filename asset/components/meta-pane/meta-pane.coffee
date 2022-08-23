Take ["DB", "ADSR", "DOOM", "Memory", "MemoryField", "MetaTools", "Notes", "Paths", "State", "TagList", "Validations"], (DB, ADSR, DOOM, Memory, MemoryField, MetaTools, Notes, Paths, State, TagList, Validations)->
  metaPane = document.querySelector "meta-pane"
  assetThumbnail = metaPane.querySelector "asset-thumbnail"
  assetName = metaPane.querySelector "asset-name"
  tagList = metaPane.querySelector "tag-list"

  removeTag = (tag)->
    asset = State "asset"
    DB.send "Remove Tag", asset.id, tag

  renameAsset = ADSR 300, 0, (v)->
    asset = State "asset"
    DB.send "Rename Asset", asset.id, v

  Make "MetaPane", MetaPane =
    render: ()->
      asset = State "asset"
      Notes.render()
      tagList.replaceChildren TagList asset.tags, removeFn: removeTag
      MemoryField "assets.#{asset.id}.name", assetName,
        validate: Validations.asset.name
        update: renameAsset
      img = DOOM.create "img", null,
        src: Paths.thumbnail asset, "512.jpg?cachebust=#{Math.randInt 0, 10000}"
      img.addEventListener "load", ()->
        assetThumbnail.replaceChildren img

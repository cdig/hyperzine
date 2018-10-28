Take ["DB", "SearchTermCleaner", "Tag", "Globals"], (DB, SearchTermCleaner, Tag)->

  assets = {}
  assetCount = 0

  Make "Asset",
    all: ()-> assets
    assetCount: ()-> assetCount

    new: (id)->
      assetCount++
      [creator, ...] = id.split " "
      asset = {id, creator, search: {}, errors: [], tags: [], files: [], name: null, shot: null}
      assets[id] = asset

    displayName: (asset)->
      (asset.name or asset.id).replace /[-_]/g, " "

    edit: (asset)->
      DB.activeAssetId = asset?.id
      StateMachine "Asset"
      Pub "Render"

    activeAsset: ()->
      assets[DB.activeAssetId]

    setValue: (asset, key, value)->
      asset[key] = value
      asset.search[key] = SearchTermCleaner value

    setList: (asset, key, list)->
      asset[key] = list
      asset.search[key] = SearchTermCleaner list.join " "
      if key is "tags"
        list.map Tag.add

    toggleTag: (asset, tag)->
      if tag in asset.tags
        Util.Array.pull asset.tags, tag
      else
        asset.tags.push tag

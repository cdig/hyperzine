Take ["DB", "SearchTermCleaner", "Globals"], (DB, SearchTermCleaner)->

  DB.assets = {}
  DB.assetCount = 0

  Make "Asset",
    all: ()-> DB.assets

    new: (id)->
      DB.assetCount++
      [creator, ...] = id.split " "
      asset = {id, creator, search: {}, errors: [], tags: [], files: [], name: null, shot: null}
      DB.assets[id] = asset

    displayName: (asset)->
      (asset.name or asset.id).replace /[-_]/g, " "

    edit: (asset)->
      DB.activeAsset = asset
      if asset? then StateMachine("Asset") else StateMachine("Search")
      Pub "Render"

    setValue: (asset, key, value)->
      asset[key] = value
      asset.search[key] = SearchTermCleaner value

    setList: (asset, key, list)->
      asset[key] = list
      asset.search[key] = SearchTermCleaner list.join " "

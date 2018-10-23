Take ["DB", "SearchTermCleaner", "Globals"], (DB, SearchTermCleaner)->

  DB.assets = {}

  Make "Asset",
    all: ()-> DB.assets

    new: (id)->
      [creator, ...] = id.split " "
      asset = {id, creator, search: {}, errors: [], tags: [], files: [], name: null, shot: null}
      DB.assets[id] = asset

    setValue: (asset, key, value)->
      asset[key] = value
      asset.search[key] = SearchTermCleaner value

    setList: (asset, key, list)->
      asset[key] = list
      asset.search[key] = SearchTermCleaner list.join " "

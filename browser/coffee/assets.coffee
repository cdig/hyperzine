Take [], ()->
  assets = {}

  Make "Assets", (a)->
    if a?
      for k, v of a
        assets[k] = v
    assets

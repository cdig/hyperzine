Take ["Asset", "Debounced", "DBState", "Log", "Memory"], (Asset, Debounced, DBState, Log, Memory)->

  Memory.subscribe "assets", false, (assets)->
    return unless assets?
    return if Memory "Read Only"
    return if Memory "Pause Caching"
    Log.time "Saving Cached Assets", ()->
      DBState "assets", Object.mapValues assets, Asset.dehydrate

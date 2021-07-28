Take ["Asset", "ADSR", "DBState", "Log", "Memory"], (Asset, ADSR, DBState, Log, Memory)->

  Memory.subscribe "assets", false, ADSR 300, 10000, (assets)->
    return unless assets?
    return if Memory "Read Only"
    return if Memory "Pause Caching"
    Log.time "Updating Fast-Load Asset Cached", ()->
      DBState "assets", Object.mapValues assets, Asset.dehydrate

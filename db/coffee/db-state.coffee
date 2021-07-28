# This file manages data that needs to be persisted to the local filesystem, just for the DB process.
# The typical use of this system is to cache data that'll speed up launching the app.
# DBState is its own data store. It does not put its data into State or Memory.

Take ["ADSR", "Env", "Log", "Read", "Write"], (ADSR, Env, Log, Read, Write)->

  # This lists all the keys we'll persist in the DBState file, with their default values
  state =
    assets: {}

  save = ADSR 20, 2000, ()->
    Log.time "Saving DBState", ()->
      # TODO: This should totally be async
      Write.sync.json Env.dbStatePath, state, quiet: true

  Make.async "DBState", DBState = (k, v)->
    throw Error "Unknown DBState key: #{k}" unless state[k]?
    if v isnt undefined
      if v? then state[k] = v else delete state[k]
      save()
    state[k]

  DBState.init = ()-> Log.time "Loading DBState", ()->
    try
      json = Read.file Env.dbStatePath
      data = JSON.parse json
      for k, v of data
        # Only accept keys we explicitly list in the defaults.
        # This lets us drop obsolete values.
        if state[k]?
          state[k] = v

# This file manages any state that needs to be persisted to the local filesystem
# just for the DB process.

Take ["Debounced", "Env", "Read", "Write"], (Debounced, Env, Read, Write)->

  # This lists all the keys we'll persist in the DB state file, with their default values
  state =
    assets: {}

  save = Debounced 2000, ()->
    # TODO: This should totally be async
    Write.sync.json Env.dbStatePath, state

  Make.async "DBState", DBState = (k, v)->
    throw Error "Unknown DBState key: #{k}" unless state[k]?
    if v isnt undefined
      if v? then state[k] = v else delete state[k]
      save()
    state[k]

  DBState.init = ()->
    try
      json = Read.file Env.dbStatePath
      data = JSON.parse json
      for k, v of data
        # Only accept keys we explicitly list in the defaults.
        # This lets us drop obsolete values.
        if state[k]?
          state[k] = v

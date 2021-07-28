# This file manages any state that needs to be persisted to the local filesystem
# just for the main process.

Take ["ADSR", "Env", "Log", "Read", "Write"], (ADSR, Env, Log, Read, Write)->

  # This lists all the keys we'll persist in the main state file, with their default values
  state =
    windowBounds: asset: [], browser: [], db: [], "setup-assistant": []

  save = ADSR 0, 2000, ()->
    Write.sync.json Env.mainStatePath, state, quiet: true

  Make.async "MainState", MainState = (k, v)->
    throw Error "Unknown MainState key: #{k}" unless state[k]?
    if v isnt undefined
      if v? then state[k] = v else delete state[k]
      save()
    state[k]

  MainState.init = ()->
    try
      json = Read.file Env.mainStatePath
      data = JSON.parse json
      for k, v of data
        # Only accept keys we explicitly list in the defaults.
        # This lets us drop obsolete values.
        if state[k]?
          state[k] = v

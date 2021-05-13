Take ["Debounced", "Write"], (Debounced, Write)->

  save = Debounced ()->
    Write.sync.json configData.configPath, configData

  Config = ()->
    # Not sure what this is gonna be, but this is here just so it compiles

  Make "Config", Config

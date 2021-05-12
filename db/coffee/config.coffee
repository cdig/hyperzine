Take ["Debounced"], (Debounced)->

  save = Debounced ()->
    fs.writeFileSync configData.configPath, JSON.stringify configData

  Config = ()->
    # Not sure what this is gonna be, but this is here just so it compiles

  Make "Config", Config

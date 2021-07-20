Take ["LoadAssets", "Log", "Memory", "Read", "Write"], (LoadAssets, Log, Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    assetsFolder = Read.path dataFolder, "Assets"
    if Memory.change "assetsFolder", assetsFolder
      Log "assetsFolder: #{assetsFolder}"
      Write.sync.mkdir assetsFolder
      LoadAssets()

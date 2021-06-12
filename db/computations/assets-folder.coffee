Take ["Memory", "Read", "Write"], (Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    assetsFolder = Read.path dataFolder, "Assets"
    if Memory.change "assetsFolder", assetsFolder
      Write.sync.mkdir assetsFolder

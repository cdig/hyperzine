Take ["Memory", "Read", "Write"], (Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    assetsFolder = Read.path dataFolder, "Assets"
    Memory "assetsFolder", assetsFolder
    Write.sync.mkdir assetsFolder

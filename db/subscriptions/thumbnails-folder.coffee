Take ["Memory", "Read", "Write"], (Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    thumbnailsFolder = Read.path dataFolder, "Thumbnails"
    Memory "thumbnailsFolder", thumbnailsFolder
    Write.sync.mkdir thumbnailsFolder

Take ["Memory", "Read", "Write"], (Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    tagsFolder = Read.path dataFolder, "Tags"
    if Memory.change "tagsFolder", tagsFolder
      Write.sync.mkdir tagsFolder

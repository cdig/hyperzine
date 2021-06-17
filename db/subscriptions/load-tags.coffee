Take ["Memory", "Read"], (Memory, Read)->

  Make "LoadTags", LoadTags = ()->
    return unless tagsFolder = Memory "tagsFolder"
    tags = {}
    for tag in Read tagsFolder
      tags[tag] = tag
    Memory "tags", tags

  Memory.subscribe "tagsFolder", true, LoadTags

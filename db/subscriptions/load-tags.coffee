Take ["Memory", "Read"], (Memory, Read)->

  sorter = new Intl.Collator('en').compare

  Make "LoadTags", LoadTags = ()->
    return unless tagsFolder = Memory "tagsFolder"
    tags = {}
    for tag in Array.sortAlphabetic Read tagsFolder
      tags[tag] = tag
    Memory "tags", tags

  Memory.subscribe "tagsFolder", true, LoadTags

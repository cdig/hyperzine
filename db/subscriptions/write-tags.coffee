Take ["Debounced", "Log", "Memory", "Ports", "Read", "Write"], (Debounced, Log, Memory, Ports, Read, Write)->

  Memory.subscribe "tags", false, Debounced 200, ()->
    return unless tagsFolder = Memory "tagsFolder"
    return unless tags = Memory "tags"
    Write.sync.array tagsFolder, Object.keys tags

Take ["Debounced", "LoadTags", "Memory", "Read"], (Debounced, LoadTags, Memory, Read)->

  watcher = null

  Memory.subscribe "tagsFolder", true, (tagsFolder)->
    watcher?.close()
    if tagsFolder?
      # We'll just reload all the tags. This is simpler than trying to track exactly which paths have changed.
      watcher = Read.watch tagsFolder, {recursive: true, persistent: false}, Debounced 200, LoadTags

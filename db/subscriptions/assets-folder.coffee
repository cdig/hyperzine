Take ["LoadAssets", "Memory", "Read", "Write"], (LoadAssets, Memory, Read, Write)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    assetsFolder = Read.path dataFolder, "Assets"
    Memory "assetsFolder", assetsFolder
    Write.sync.mkdir assetsFolder

    # TODO: This function does a ton of long-running async stuff, so if the dataFolder
    # changes, we might end up with multiple overlapping loads that fight.
    # Need to find a way to guard against that.
    console.log "dataFolder", dataFolder
    LoadAssets()

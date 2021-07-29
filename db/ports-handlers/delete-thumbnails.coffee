Take ["Job", "LoadAssets", "Log", "Memory", "Paths", "Ports", "Read", "Thumbnail", "Write"], (Job, LoadAssets, Log, Memory, Paths, Ports, Read, Thumbnail, Write)->

  Ports.on "delete-thumbnails", ()->
    assets = Memory "assets"

    Log "Deleting all thumbnails", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = false
    Memory "Pause Caching", true
    Memory "Pause Watching", true

    promises = for id, asset of assets
      Job 10, "Delete Thumbnails", asset

    await Promise.all promises

    Log "All Thumbnails Deleted", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = true
    Memory "Pause Caching", false
    Memory "Pause Watching", false
    LoadAssets() # Catch up on changes


  Job.handler "Delete Thumbnails", (asset)->
    Write.sync.rm Paths.thumbnails asset
    Write.sync.rm Paths.newShots asset
    null

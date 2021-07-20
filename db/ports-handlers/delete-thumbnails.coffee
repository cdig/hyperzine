Take ["Job", "Log", "Memory", "Paths", "Ports", "Read", "Thumbnail", "Write"], (Job, Log, Memory, Paths, Ports, Read, Thumbnail, Write)->

  Ports.on "delete-thumbnails", ()->
    assets = Memory "assets"
    Log "Deleting all thumbnails"
    for id, asset of assets
      Job 10, "Delete Thumbnails", asset


  Job.handler "Delete Thumbnails", (asset)->
    path = Paths.thumbnails asset
    Write.sync.rm path if Read.sync.exists path
    null

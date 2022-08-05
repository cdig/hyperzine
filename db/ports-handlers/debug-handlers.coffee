Take ["Job", "Log", "Memory", "Ports"], (Job, Log, Memory, Ports)->

  Ports.on "Rebuild All Thumbnails", ()->
    for id, asset of Memory "assets"
      Job "Rebuild Asset Thumbnail", asset, true

Take ["Log", "Memory", "Ports", "Thumbnail"], (Log, Memory, Ports, Thumbnail)->

  Ports.on "create-file-thumbnail", (assetId, path, size, destName)->
    if asset = Memory "assets.#{assetId}"
      Thumbnail asset, path, size, destName

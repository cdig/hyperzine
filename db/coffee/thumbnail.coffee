Take ["Log", "Memory", "Ports", "Read", "Write"], (Log, Memory, Ports, Read, Write)->
  { nativeImage } = require "electron"

  loaded = {}

  load = (source, dest, ext)->
    nativeImage.createThumbnailFromPath source, {width: 640, height: 640}
      .then (image)->
        return unless image
        buf = if ext is "png"
          image.toPNG()
        else
          image.toJPEG 93
        Write.sync.file dest, buf
        return dest
      .catch (e)->
        Log.err "Error when creating thumbnail"
        Log.err e
        return null

  Ports.on "create-thumbnail", (source)->
    # Path to source file, relative to assets folder
    subpath = source.replace Memory("assetsFolder"), ""

    assetId = Array.first Read.split subpath
    ext = Array.last subpath.split "."

    hash = String.hash subpath
    thumbs = Read.path Memory("dataFolder"), "Thumbnails"
    dest = Read.path thumbs, "#{hash}.#{ext}"

    return dest if await Read.exists dest

    # This will error if the thumbs folder already exists — this is fine
    try Write.sync.mkdir thumbs

    # Load the source, make a thumbnail, and save it as a jpg to the thumbs folder
    loaded[source] ?= load source, dest, ext


  # Renderer requests a thumbnail, providing a file path

  # Check if the thumbnail already exists — if so, return the path to it
  # If it doesn't exist, enqueue it and start running the queue

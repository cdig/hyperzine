Take ["Env", "Memory", "NativeThumbnail", "Ports", "Read", "SipsThumbnail"], (Env, Memory, NativeThumbnail, Ports, Read, SipsThumbnail)->
  { nativeImage } = require "electron"

  promises = {}


  Ports.on "create-thumbnail", (source)->
    # Path to source file, relative to assets folder
    subpath = source.replace Memory("assetsFolder"), ""

    ext = Array.last(subpath.split ".").toLowerCase()

    # For now, we'll only support these formats, so the sake of simplicity.
    # We can add support for converting other formats to jpg or png in later betas.
    return null unless ext in ["jpg", "jpeg", "png"]

    hash = String.hash subpath
    dest = Read.path Memory("thumbnailsFolder"), "#{hash}.#{ext}"

    return dest if await Read.exists dest

    if Env.isMac
      return promises[source] ?= SipsThumbnail source, dest, ext
    else
      return promises[source] ?= NativeThumbnail source, dest, ext

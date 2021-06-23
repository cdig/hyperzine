Take ["Env", "Memory", "NativeThumbnail", "Ports", "Read", "SipsThumbnail"], (Env, Memory, NativeThumbnail, Ports, Read, SipsThumbnail)->
  promises = {}

  sipsFormats = {"3fr","arw","astc","avci","bmp","cr2","cr3","crw","dcr","dds","dng","dxo","erf","exr","fff","gif","heic","heics","heif","icns","ico","iiq","jp2","jpeg","jpg","ktx","mos","mpo","mrw","nef","nrw","orf","orf","orf","pbm","pdf","pef","pic","pict","png","psd","pvr","raf","raw","rw2","rwl","sgi","sr2","srf","srw","tga","tiff","webp"}

  Ports.on "create-thumbnail", (source, size)->

    # Path to source file, relative to assets folder
    subpath = source.replace Memory("assetsFolder"), ""

    sourceExt = Array.last(subpath.split ".").toLowerCase()

    # We're going to be asked to preview a few known formats pretty often,
    # and we don't yet have any way to preview them.
    return if sourceExt is "swf"

    destExt = if sourceExt is "png" then "png" else "jpg"

    hash = String.hash subpath
    dest = Read.path Memory("thumbnailsFolder"), "#{hash}-#{size}.#{destExt}"

    # If we have previously generated a thumbnail, we're done!
    return dest if await Read.exists dest

    if Env.isMac and sipsFormats[sourceExt]?
      return promises[source] ?= SipsThumbnail source, dest, size, destExt
    else
      return promises[source] ?= NativeThumbnail source, dest, size, destExt

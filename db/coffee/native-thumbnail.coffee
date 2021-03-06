Take ["Iterated", "Write"], (Iterated, Write)->
  { nativeImage } = require "electron"

  iterating = {}

  iterate = Iterated 2, (more)->
    for source, v of iterating when v?
      {dest, ext, image, resolve} = v

      iterating[source] = null

      buf = if ext is "png"
        image.toPNG()
      else
        image.toJPEG 93

      Write.sync.file dest, buf

      resolve dest

      return unless more()?

    iterating = {}

  Make "NativeThumbnail", NativeThumbnail = (source, dest, size, ext)->
    new Promise (resolve)->
      try
        image = await nativeImage.createThumbnailFromPath source, {width: size, height: size}
        iterating[source] = {dest, ext, image, resolve}
        iterate()
      catch
        resolve null

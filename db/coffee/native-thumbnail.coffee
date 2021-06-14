Take ["Iterated", "Write"], (Iterated, Write)->
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

  Make "NativeThumbnail", NativeThumbnail = (source, dest, ext)->
    new Promise (resolve)->
      try
        image = await nativeImage.createThumbnailFromPath source, {width: 640, height: 640}
        iterating[source] = {dest, ext, image, resolve}
        iterate()
      catch
        return null

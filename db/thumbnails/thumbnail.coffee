Take ["Env", "Job", "Log", "Memory", "Paths", "Write"], (Env, Job, Log, Memory, Paths, Write)->

  sipsFormats = {"3fr","arw","astc","avci","bmp","cr2","cr3","crw","dcr","dds","dng","dxo","erf","exr","fff","gif","heic","heics","heif","icns","ico","iiq","jp2","jpeg","jpg","ktx","mos","mpo","mrw","nef","nrw","orf","orf","orf","pbm","pdf","pef","pic","pict","png","psd","pvr","raf","raw","rw2","rwl","sgi","sr2","srf","srw","tga","tiff","webp"}
  promises = {}

  Make.async "Thumbnail", Thumbnail = (asset, sourcePath, size, isForAsset = false)->
    ext = Array.last(sourcePath.split ".").toLowerCase()

    # We're going to be asked to preview a few known formats pretty often,
    # and we don't yet have any way to preview them.
    return if ext is "swf"

    assetsFolder = Memory "assetsFolder"
    subpath = sourcePath.replace assetsFolder, ""

    destName = if isForAsset
      "#{size}.jpg"
    else
      "#{String.hash(subpath)}-#{size}.jpg"

    destPath = Paths.thumbnail asset, destName

    Write.sync.mkdir Paths.thumbnails asset

    handler = if Env.isMac and sipsFormats[ext]? then "SipsThumbnail" else "NativeThumbnail"
    Job 2, handler, sourcePath, destPath, size


  childProcess = null

  Job.handler "SipsThumbnail", (source, dest, size)->
    new Promise (resolve)->
      childProcess ?= require "child_process"
      childProcess.exec "sips -s format jpeg -s formatOptions 91 -Z #{size} \"#{source}\" --out \"#{dest}\"", (err)->
        if err?
          Log.err err
          resolve null
        else
          resolve dest


  nativeImage = null

  Job.handler "NativeThumbnail", (source, dest, size)->
    new Promise (resolve)->
      try
        nativeImage ?= require("electron").nativeImage
        image = await nativeImage.createThumbnailFromPath source, {width: size, height: size}
        buf = image.toJPEG 91
        Write.sync.file dest, buf # TODO: Should be async
        resolve dest
      catch err
        if err.message.indexOf("unable to retrieve thumbnail preview image for the given path") > 0
          # This error is just the normal result when Electron fails to generate a preview.
          # Nothing to worry about, not even worth logging.
        else
          Log.err err
        resolve null

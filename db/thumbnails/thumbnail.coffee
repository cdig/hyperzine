Take ["Env", "Job", "Log", "Memory", "Paths", "Write"], (Env, Job, Log, Memory, Paths, Write)->

  promises = {}

  Make.async "Thumbnail", Thumbnail = (asset, sourcePath, size, destName)->
    ext = Array.last(sourcePath.split ".").toLowerCase()

    # We're going to be asked to preview a few known formats pretty often,
    # and we don't yet have any way to preview them. The caller should use an icon instead.
    return if Paths.ext.icon[ext]

    assetsFolder = Memory "assetsFolder"
    subpath = sourcePath.replace assetsFolder, ""

    destName ?= "#{size}.jpg"

    destPath = Paths.thumbnail asset, destName

    Write.sync.mkdir Paths.thumbnails asset

    handler = if Env.isMac and Paths.ext.sips[ext]? then "SipsThumbnail" else "NativeThumbnail"
    Job 2, handler, sourcePath, destPath, size


  childProcess = null

  Job.handler "SipsThumbnail", (source, dest, size)->
    new Promise (resolve)->
      childProcess ?= require "child_process"
      childProcess.exec "sips -s format jpeg -s formatOptions 91 -Z #{size} \"#{source}\" --out \"#{dest}\"", (err)->
        if err?
          Log.err err unless err.message.indexOf("Cannot extract image from file.") > -1 # This error is just the normal result when SIPS fails to generate a preview. Nothing to worry about, not even worth logging.
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
        Log.err err unless err.message.indexOf("unable to retrieve thumbnail preview image for the given path") > -1 # This error is just the normal result when Electron fails to generate a preview. Nothing to worry about, not even worth logging.
        resolve null

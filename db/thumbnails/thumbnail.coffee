Take ["Env", "IPC", "Job", "Log", "Memory", "Paths", "Read", "Write"], (Env, IPC, Job, Log, Memory, Paths, Read, Write)->

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
    Job 2, handler, sourcePath, destPath, size, subpath


  childProcess = null

  Job.handler "SipsThumbnail", (source, dest, size, subpath)->
    new Promise (resolve)->
      Log "Sips Thumbnail: #{source}"
      childProcess ?= require "child_process"
      childProcess.exec "sips -s format jpeg -s formatOptions 91 -Z #{size} \"#{source}\" --out \"#{dest}\"", (err)->
        if err?
          handleErr subpath, err
          resolve null
        else
          resolve dest


  nativeImage = null

  Job.handler "NativeThumbnail", (source, dest, size, subpath)->
    new Promise (resolve)->
      Log "Native Thumbnail: #{source}"
      try
        nativeImage ?= require("electron").nativeImage
        image = await nativeImage.createThumbnailFromPath source, {width: size, height: size}
        buf = image.toJPEG 91
        Write.sync.file dest, buf # TODO: Should be async
        resolve dest
      catch err
        handleErr subpath, err
        resolve null


  errCount = 0
  importantErrorMessages = [
    # Add messages to this list if we want to alert the user about them.
    # If one of these messages occurs, that usually means either the file is corrupt
    # (so the user ought to investiage and fix the file if possible), or the file
    # is in a format that we can't generate a thumbnail for (in which case the file
    # extension should be added to Paths.ext.icon)
    "Unable to render destination image"
  ]
  unimportantErrorMessages = [
    # Add messages to this list if we don't want to bother alerting the user about them
    "Unable to retrieve thumbnail preview image for the given path"
    "Cannot extract image from file"
    "Failed to get thumbnail from local thumbnail cache reference"
  ]

  handleErr = (subpath, err)->
    Log.err "Error generating thumbnail for #{subpath}:\n #{err.toString()}"

    for message in unimportantErrorMessages
      if -1 isnt err.message.toLowerCase().indexOf message.toLowerCase()
        return

    return if ++errCount > 3

    for message in importantErrorMessages
      if -1 isnt err.message.toLowerCase().indexOf message.toLowerCase()
        alert = message
        break

    alert ?= err.message

    IPC.send "alert", message: "An error occurred while generating a thumbnail. Please capture a screenshot of this popup and send it to Ivan. \n\n The source file: #{subpath} \n\n The error: #{alert}"

    if errCount is 3
      IPC.send "alert", message: "It seems like this is happening a lot, so we won't tell you about any more failures. To see them all, open the Debug Log."

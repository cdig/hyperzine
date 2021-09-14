Take ["Job", "Log", "Paths", "Read", "Thumbnail", "Write"], (Job, Log, Paths, Read, Thumbnail, Write)->

  Job.handler "Rebuild Asset Thumbnail", (asset, overwrite = false)->
    msg = "Thumbnails for #{asset.id} —"

    if not overwrite
      has128 = Read.sync.exists Paths.thumbnail asset, "128.jpg"
      has512 = Read.sync.exists Paths.thumbnail asset, "512.jpg"
      if has128 and has512
        Log "#{msg} already exist :)", color: "hsl(330, 55%, 50%)" # violet
        return

    if asset.newShot?
      path = Paths.newShot asset
      has128 = await Thumbnail asset, path, 128
      has512 = await Thumbnail asset, path, 512
      Log "#{msg} using new shot <3", "hsl(220, 50%, 50%)" # blue
      return

    # No specified shot, attempt to use a random file.
    if asset.files?.count > 0
      for file in asset.files.children
        Log "#{msg} trying files... #{file.name}"
        if await Thumbnail asset, file.path, 128
          if await Thumbnail asset, file.path, 512
            Log "#{msg} used file #{file.name} :}", color: "hsl(180, 100%, 29%)" # teal
            return captureNewShot asset, file.path # success

    Log "#{msg} no dice :(", color: "hsl(25, 100%, 59%)" # orange
    null


  captureNewShot = (asset, shotFile)->
    # We want to show which file was used to generate the thumbnail.
    # The simplest thing is just to make a copy of the source file and save it.
    # That way, we don't need to worry about what happens if the source file is renamed
    # or deleted or whatever — we have our copy of the shot, and the user can see what
    # file was used (because the filename will be there too — good enough) and if the
    # user deleted that original file and wants the shot to change, they can just change
    # the shot, good enough.
    newShotsFolder = Paths.newShots asset
    Write.sync.mkdir newShotsFolder
    for file in Read newShotsFolder
      Write.sync.rm file
    Write.sync.copyFile shotFile, Read.path newShotsFolder, Read.last shotFile

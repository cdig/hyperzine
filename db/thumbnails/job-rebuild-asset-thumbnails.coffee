Take ["Job", "Log", "Paths", "Read", "Thumbnail", "Write"], (Job, Log, Paths, Read, Thumbnail, Write)->

  Job.handler "Rebuild Asset Thumbnails", (asset, overwrite = false)->
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

    if asset.shot?

      # Attempt to upgrade the shot using the original file.
      if asset.files?.count > 0
        shotSourceName = asset.shot.replace /\.png/, ""
        for file in asset.files.children when file.name is shotSourceName
          Log "#{msg} trying to upgrade #{shotSourceName}"
          path = Paths.file asset, shotSourceName
          has128 = await Thumbnail asset, path, 128
          has512 = await Thumbnail asset, path, 512
          Log "#{msg} upgraded :)", color: "hsl(153, 80%, 41%)" # mint
          return captureNewShot asset, path if has128 and has512

    # We couldn't upgrade the shot. Attempt to use a random file.
    if asset.files?.count > 0
      for file in asset.files.children
        Log "#{msg} trying files... #{file.name}"
        if await Thumbnail asset, file.path, 128
          if await Thumbnail asset, file.path, 512
            Log "#{msg} used file #{file.name} :}", color: "hsl(180, 100%, 29%)" # teal
            return captureNewShot asset, file.path # success

    # We couldn't use a random file. As a last-ditch attempt, try to use the old shot.
    if asset.shot?
      path = Paths.shot asset
      has128 = await Thumbnail asset, path, 128
      has512 = await Thumbnail asset, path, 512
      Log "#{msg} using old shot :/", "hsl(220, 50%, 50%)" # blue
      return captureNewShot asset, path if has128 and has512


    Log "#{msg} no dice :(", color: "hsl(25, 100%, 59%)" # orange
    null


  captureNewShot = (asset, shotFile)->
    # Eventually, we'll want to show which file was used to generate the thumbnail.
    # The simplest thing is just to make a copy of the source file and save it.
    # That way, we don't need to worry about what happens if the source file is renamed
    # or deleted or whatever — we have our copy of the shot, and the user can see what
    # file was used (because the filename will be there too — good enough) and if the
    # user deleted that original file and wants the shot to change, they can just change
    # the shot, good enough.
    newShotsFolder = Paths.newShots asset
    Write.sync.rm newShotsFolder
    Write.sync.mkdir newShotsFolder
    Write.sync.copyFile shotFile, Read.path newShotsFolder, Read.last shotFile

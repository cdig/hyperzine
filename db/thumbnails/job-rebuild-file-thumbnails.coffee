Take ["Job", "Log", "Paths", "Read", "Thumbnail"], (Job, Log, Paths, Read, Thumbnail)->

  Job.handler "Rebuild File Thumbnails", (asset, file)->
    msg = "Thumbnail for #{asset.id}/#{file.relpath} —"
    size = 256
    destName = Paths.thumbnailName file, size

    if Read.sync.exists Paths.thumbnail asset, destName
      Log "#{msg} already exists :)", color: "hsl(330, 55%, 50%)" # violet
    else
      if await Thumbnail asset, file.path, size, destName
        Log "#{msg} created :)", color: "hsl(180, 100%, 29%)" # mint
      else
        Log "#{msg} will use an icon :/", color: "hsl(180, 100%, 29%)" # teal

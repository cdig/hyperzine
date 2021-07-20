Take ["Job", "Log", "Memory", "Paths", "Ports", "Read", "Thumbnail", "Write"], (Job, Log, Memory, Paths, Ports, Read, Thumbnail, Write)->

  Ports.on "rebuild-thumbnails", ()->
    assets = Memory "assets"

    Log "Rebuilding All Thumbnails", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = false

    promises = for id, asset of assets
      Job 1, "Rebuild Thumbnails", asset

    await Promise.all promises

    Log "All Thumbnails Rebuilt", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = true


  Job.handler "Rebuild Thumbnails", (asset)->
    has128 = Read.sync.exists Paths.thumbnail asset, "128.jpg"
    has512 = Read.sync.exists Paths.thumbnail asset, "512.jpg"
    if has128 and has512
      Log "Thumbnails for #{asset.id} — already exist :)", color: "hsl(330, 55%, 50%)" # violet
      return

    if asset.shot?

      # Attempt to upgrade the shot using the original file.
      if asset.files?.count > 0
        shotSourceName = asset.shot.replace /\.png/, ""
        for file in asset.files.children when file.name is shotSourceName
          Log "Thumbnails for #{asset.id} — trying to upgrade #{shotSourceName}"
          path = Paths.file asset, shotSourceName
          has128 = await Thumbnail asset, path, 128, true
          has512 = await Thumbnail asset, path, 512, true
          Log "Thumbnails for #{asset.id} — upgraded :)", color: "hsl(153, 80%, 41%)" # mint
          return markPath asset, path if has128 and has512

    # We couldn't upgrade the shot. Attempt to use a random file.
    if asset.files?.count > 0
      for file in asset.files.children
        Log "Thumbnail for #{asset.id} — trying files... #{file.name}"
        if await Thumbnail asset, file.path, 128, true
          if await Thumbnail asset, file.path, 512, true
            Log "Thumbnail for #{asset.id} — used file #{file.name}", color: "hsl(180, 100%, 29%)" # teal
            return markPath asset, file.path # success

    # We couldn't use a random file. As a last-ditch attempt, try to use the original shot.
    if asset.shot?
      path = Paths.shot asset
      has128 = await Thumbnail asset, path, 128, true
      has512 = await Thumbnail asset, path, 512, true
      Log "Thumbnails for #{asset.id} — upgraded :)", "hsl(220, 50%, 50%)" # blue
      return markPath asset, path if has128 and has512


    Log "Thumbnail for #{asset.id} — no dice :(", color: "hsl(25, 100%, 59%)" # orange
    null


  markPath = (asset, path)->
    # Eventually, we'll want to show which file was used to generate the thumbnail.
    # So, we'll capture that info now, for future use.
    newShotPath = Read.path asset.path, "Shot (New)"
    path = path.replace asset.path, ""
    Write.sync.array newShotPath, [path]

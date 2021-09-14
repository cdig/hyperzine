Take ["FileTree", "Job", "Log", "Memory", "Paths", "Read", "Thumbnail", "Write"], (FileTree, Job, Log, Memory, Paths, Read, Thumbnail, Write)->

  Job.handler "Rebuild File Thumbnails", (asset)->
    return unless asset?

    needed = {}
    for file in FileTree.flat asset.files
      thumb = Paths.thumbnailName file, 256
      needed[thumb] = file

    if existing = Read Paths.thumbnails asset
      existing = Array.mapToObject existing
      delete existing["128.jpg"] # We're only interested in thumbs for files, not the asset itself.
      delete existing["512.jpg"]
      toCreate = Object.subtractKeys existing, needed
      toDelete = Object.subtractKeys needed, existing
    else
      toCreate = needed
      toDelete = {}

    for thumb of toDelete
      Write.sync.rm Paths.thumbnail asset, thumb

    promises = for thumb, file of toCreate when file.ext? and not Paths.ext.icon[file.ext]
      Thumbnail asset, file.path, 256, thumb

    await Promise.all promises

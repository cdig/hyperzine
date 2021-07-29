Take ["Job", "LoadAssets", "Log", "Memory", "Paths", "Ports", "Thumbnails", "Write"], (Job, LoadAssets, Log, Memory, Paths, Ports, Thumbnails, Write)->

  Ports.on "rebuild-thumbnails", rebuildThumbnails = ()->
    assets = Memory "assets"

    Log "Rebuilding Thumbnails", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = false
    Memory "Pause Caching", true
    Memory "Pause Watching", true

    promises = for id, asset of assets

      assetPromise = Job 1, "Rebuild Asset Thumbnails", asset

      p = for file in asset.files.children when file.ext? and not Paths.ext.icon[file.ext]
        Job 1, "Rebuild File Thumbnails", asset, file

      Promise.all p.concat assetPromise

    await Promise.all promises

    Log "Thumbnails Rebuilt", background: "hsl(153, 80%, 41%)", color: "#000"
    Write.logging = true
    Memory "Pause Caching", false
    Memory "Pause Watching", false
    LoadAssets() # Catch up on changes

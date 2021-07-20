Take ["Asset", "DBState", "Log", "Memory", "Read", "WriteAssets"], (Asset, DBState, Log, Memory, Read, WriteAssets)->

  # LoadAssets does a ton of long-running async stuff, so if the dataFolder
  # changes while it's running, we'll be asked to start over again.
  running = false
  requested = false

  restart = ()->
    running = false
    requested = false
    Log "Restarting LoadAssets"
    LoadAssets()


  Make.async "LoadAssets", LoadAssets = ()->
    if not running
      running = true
      requestAnimationFrame load
    else
      requested = true


  load = ()->
    Log "LoadAssets"

    assets = {}
    assetsFolder = Memory "assetsFolder"

    # Pause persisting asset changes to disk while we make rapid changes.
    WriteAssets.enable false

    Log.time "Rehydrating DBState Assets", ()->
      # To start, load all asset data cached from the last run.
      # This should be everything needed to get the Browser minimally ready for read-only use
      # (albeit with stale data).
      assets = DBState "assets"

      needSave = false

      for id, asset of assets
        Asset.rehydrate assetsFolder, asset
        asset._loading = true
        needSave = true

      Memory "assets", assets if needSave

    # Now that we've got the cached asset data loaded, we need to do 2 things with the real assets folder:
    # 1. Fast-load assets created since our last run.
    # 2. Clear assets deleted since our last run.
    # Once we have these things taken care of, the Browser will be in a fully correct state, though still read-only.

    created = {} # Track the assets that are new, so we can skip reloading them down below.

    # This should all take around 3s on a first run, and only a few ms on subsequent runs.
    await Log.time.async "Fast-Loading New Assets", fastload = ()->

      confirmed = {} # Track the real assets we've seen, so we can clear any cached assets that were deleted.
      promises = []
      needSave = false

      for assetFolderName in Read assetsFolder

        # First, build a new basic asset from the asset folder's name and path.
        asset = Asset.new Read.path assetsFolder, assetFolderName

        # If this is a new asset, we can load the rest of its data and save it.
        if not assets[asset.id]?
          created[asset.id] = true
          assets[asset.id] = asset
          promises.push Asset.loadFields asset
          needSave = true

        # Mark that we've seen this asset.
        confirmed[asset.id] = true

      for p in promises
        await p

      # 2. Clear any assets we didn't see during our loop over the assets folder.
      for assetId of assets when not confirmed[assetId]
        delete assets[assetId]
        needSave = true

      Memory "assets", assets if needSave

    return restart() if requested

    # Now that we're done loading all the new assets, we can go back and re-load all the other
    # assets, to catch any changes we might have missed since Hyperzine last ran, and to fill-in
    # any of the details that weren't included in the cache.
    await Log.time.async "Reloading Not-New Assets", deltaload = ()->

      needSave = false

      promises = for id, asset of assets

        # Skip any assets that we already loaded, since they're already presumably up-to-date
        # (and watch-assets.coffee will catch any changes that happen while we're running)
        continue if created[id]?

        needSave = true
        promise = Asset.loadFields asset

      for p in promises
        asset = await p
        asset._loading = false

      # Saving this because it seems to be faster than the above in some cases.
      # We can test it more later.
      # load = (k)->
      #   new Promise loadPromise = (resolve)->
      #     requestAnimationFrame loadRaf = ()->
      #       await Log.time.async "Build #{k}", loadLog = ()->
      #         for id, asset of assets when not created[id]?
      #           asset[k] = Asset.load[k] asset
      #         for id, asset of assets when not created[id]?
      #           asset[k] = await asset[k]
      #         null
      #       resolve()
      #
      # for k in ["name", "shot", "tags", "files"]
      #   await load k
      #
      # Log.time "Build Search", searchlog = ()->
      #   for id, asset of assets when not created[id]?
      #     asset.search = Asset.load.search asset
      #     needSave = true

      Memory "assets", assets if needSave

    return restart() if requested

    # Later, after all Memory notifications will have gone out, resume persisting asset changes
    # requestAnimationFrame WriteAssets.enable

    # Finally, save a simplified version of assets to the disk, to speed future launch times.
    Log.time "Saving Cached Assets", ()->
      DBState "assets", Object.mapValues assets, Asset.dehydrate

    # Done
    return restart() if requested
    running = false

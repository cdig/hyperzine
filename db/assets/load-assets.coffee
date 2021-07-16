Take ["Asset", "DBState", "Log", "Memory", "Read", "WriteAssets"], (Asset, DBState, Log, Memory, Read, WriteAssets)->

  running = false

  Make.async "LoadAssets", LoadAssets = ()->

    # Temporary hack to prevent overlapping loads
    return if running
    running = true

    Log "LoadAssets"

    assetsFolder = Memory "assetsFolder"

    # Pause persisting asset changes to disk while we make rapid changes.
    WriteAssets.enable false

    # To start, load all asset data cached from the last run.
    # This should be everything needed to get the Browser minimally ready for read-only use
    # (albeit with stale data).
    assets = DBState "assets"

    # We clone the assets object before committing it to Memory, so that when we mutate assets later on
    # and then commit it to Memory again, we don't accidentally defeat Memory's notEquivalent call.
    # This should take 1 or 2 ms at most, hopefully.
    Log.time "Cloning DBState assets into Memory", ()->
      Memory "assets", Object.clone assets

    # Now that we've got the cached asset data loaded, we need to do 2 things with the real assets folder:
    # 1. Fast-load assets created since our last run.
    # 2. Clear assets deleted since our last run.
    # Once we have these things taken care of, the Browser will be in a fully correct state, though still read-only.

    created = {} # Track the assets that are new, so we can skip reloading them down below.

    # This should all take around 3s on a first run, and only a few ms on subsequent runs.
    await Log.time.async "Fast-loading new assets", fastload = ()->

      confirmed = {} # Track the real assets we've seen, so we can clear any cached assets that were deleted.

      assetFolderNames = Read assetsFolder

      for assetFolderName in assetFolderNames

        # First, build a new basic asset from the asset folder's name and path.
        asset = Asset.new Read.path assetsFolder, assetFolderName

        # If this is a new asset, we can load the rest of its data and save it.
        if not assets[asset.id]?
          await Asset.loadFields asset
          created[asset.id] = true
          assets[asset.id] = asset

        # Mark that we've seen this asset.
        confirmed[asset.id] = true

      # 2. Clear any assets we didn't see during our loop over the assets folder.
      for assetId of assets when not confirmed[assetId]
        delete assets[assetId]

      null

    # Take another snapshot of our asset data, and save it to Memory for Browser to use
    Log.time "Cloning DBState assets into Memory (again)", ()->
      Memory "assets", Object.clone assets

    # Now that we're done loading all the new assets, we can go back and re-load all the other
    # assets, to catch any changes we might have missed since Hyperzine last ran.
    await Log.time.async "Reloading old assets", deltaload = ()->

      for id, asset of assets

        # Skip any assets that we already loaded, since they're already presumably up-to-date
        # (and watch-assets.coffee will catch any changes that happen while we're running)
        continue if created[id]?

        # If this is a new asset, we can load the rest of its data and save it.
        await Asset.loadFields asset

      null

    # Yet another snapshot of our asset data
    Log.time "Cloning DBState assets into Memory (again again)", ()->
      Memory "assets", Object.clone assets

    # Later, after all Memory notifications will have gone out, resume persisting asset changes
    # requestAnimationFrame WriteAssets.enable

    # Finally, save a simplified version of assets to the disk, to speed future launch times.
    Log.time "Saving Cached Assets", ()->
      DBState "assets", Object.mapValues assets, Asset.dehydrate

    # Done
    running = false


    # load = (k)->
    #   new Promise loadPromise = (resolve)->
    #     requestAnimationFrame loadRaf = ()->
    #       await Log.time.async "Build #{k}", loadLog = ()->
    #         for id, asset of assets
    #           asset[name] = Asset.build[name] asset
    #         for id, asset of assets
    #           asset[k] = await asset[k]
    #         null
    #       resolve()
    #
    # for name in ["name", "shot", "tags", "files"]
    #   await load name
    #
    # Log.time "Build Search", searchlog = ()->
    #   for id, asset of assets
    #     asset.search = Asset.build.search asset
    #
    # logAssetLoadTime "Spent Loading #{Object.keys(assets).length} Assets"

    # Finally, we can do a much slower, more granular scan over the asset folder.
    # This should be idempotent, since it'll overlap with user edits,
    # with dropbox-driven changes, etc.
    # The point of this scan is to do more intensive per-asset processing that
    # we wouldn't want to do during the initial (fast) load.

    # This should do some sort of deep "refresh" of the asset,
    # similar to what might be done whenever the filesystem watcher
    # notifies us of a change. This should probably create jobs,
    # which would run at the lowest priority.

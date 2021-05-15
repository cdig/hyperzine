time = performance.now()

Take ["Log", "Memory", "PubSub", "Render"], (Log, Memory, {Pub, Sub}, Render)->

  Log.time.formatted "Browser Window Open", time

  Sub "Render", Render

  Memory.subscribe "assets", true, (assets)->
    Log.time "Initial render", Render

  # IPC.on "asset-changed", (event, asset)->
  #   Render.deleteAssetCard Assets.update asset
  #   Render()
  #
  # IPC.on "asset-deleted", (event, assetId)->
  #   Render.deleteAssetCard Assets.delete assetId

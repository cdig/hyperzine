Take ["Memory", "PubSub", "Render"], (Memory, {Pub, Sub}, Render)->

  Sub "Render", Render

  Memory.subscribe "assets", true, Render

  # IPC.on "asset-changed", (event, asset)->
  #   Render.deleteAssetCard Assets.update asset
  #   Render()
  #
  # IPC.on "asset-deleted", (event, assetId)->
  #   Render.deleteAssetCard Assets.delete assetId

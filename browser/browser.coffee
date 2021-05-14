Take ["Env", "IPC", "Log", "Memory", "PubSub", "Render", "DOMContentLoaded"], (Env, IPC, Log, Memory, {Pub, Sub}, Render)->

  # Sub "Render", Render

  IPC.on "find", ()-> Pub "find"

  Memory.subscribe "assets", true, (assets)->
    console.log "assets!"

    # Log.time "Build assets", ()-> Assets assets
    # Log.time "Initial render", Render

  # IPC.on "asset-changed", (event, asset)->
  #   Render.deleteAssetCard Assets.update asset
  #   Render()
  #
  # IPC.on "asset-deleted", (event, assetId)->
  #   Render.deleteAssetCard Assets.delete assetId
  #
  #
  # IPC.send "browser-init"

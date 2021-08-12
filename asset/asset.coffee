Take ["IPC", "Log", "Memory", "PubSub", "Render", "State"], (IPC, Log, Memory, {Sub}, Render, State)->

  assetId = await IPC.invoke "whats-my-asset"

  Memory.subscribe "assets.#{assetId}", true, (asset)->
    return if asset?._loading # Don't show stale data while initially re-loading a cached asset

    if asset?
      State "asset", asset
      Render()
    else
      # When the asset is null, we don't clear the old asset data out of State,
      # because that might cause some tricky undefined property errors given
      # how much asynchronous stuff we do (like thumbnails).
      # It's fine to just keep the stale asset data around and alter the UI.

    DOOM document.body, noData: if asset? then null else ""

  Memory.subscribe "assets.#{assetId}.name", true, (name)->
    IPC.send "set-window-title", name if name?

  Sub "Render", Render

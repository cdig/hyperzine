# Take "GearView", (GearView)->
#   GearView 24, 0#, class: "paused"

Take ["IPC", "Memory", "PubSub", "Render", "State"], (IPC, Memory, {Sub}, Render, State)->

  assetId = await IPC.invoke "whats-my-asset"

  closeTimeout = null
  closeWindow = ()-> IPC.send "close-window"

  Memory.subscribe "assets.#{assetId}", true, (asset)->
    if asset?
      clearTimeout closeTimeout
      State "asset", asset
      Render()
    else
      # Delay closing, since the asset window might have been opened preemptively
      # while the asset is still being created and saved to disk (by a "new-asset" call)
      closeTimeout = setTimeout closeWindow, 2000

  Memory.subscribe "assets.#{assetId}.name", true, (name)->
    IPC.send "set-window-title", name if name?

  Sub "Render", Render

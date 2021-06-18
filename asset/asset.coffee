# Take "GearView", (GearView)->
#   GearView 24, 0#, class: "paused"

Take ["IPC", "Memory", "PubSub", "Render", "State"], (IPC, Memory, {Sub}, Render, State)->

  assetId = await IPC.invoke "whats-my-asset"

  Memory.subscribe "assets.#{assetId}", true, (asset)->
    if asset?
      State "asset", asset
      Render()
    else
      IPC.send "close-window"

  Memory.subscribe "assets.#{assetId}.name", true, (name)->
    IPC.send "set-window-title", name if name?

  Sub "Render", Render

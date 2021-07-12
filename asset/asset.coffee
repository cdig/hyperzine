Take ["IPC", "Memory", "PubSub", "Render", "State"], (IPC, Memory, {Sub}, Render, State)->

  assetId = await IPC.invoke "whats-my-asset"

  Memory.subscribe "assets.#{assetId}", true, (asset)->
    State "asset", asset
    Render()

  Memory.subscribe "assets.#{assetId}.name", true, (name)->
    IPC.send "set-window-title", name if name?

  Sub "Render", Render

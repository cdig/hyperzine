Take ["IPC", "Memory", "Render", "State"], (IPC, Memory, Render, State)->

  assetId = await IPC.invoke "whats-my-asset"

  Memory.subscribe "assets.#{assetId}", true, (asset)->
    if asset?
      State "asset", asset
      Render()
    else
      IPC.send "close-window"

  Memory.subscribe "assets.#{assetId}.name", true, (name)->
    if name?
      IPC.send "set-asset-name", name

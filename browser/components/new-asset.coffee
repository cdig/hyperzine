Take ["DB", "DOOM", "IPC", "Log", "Memory", "DOMContentLoaded"], (DB, DOOM, IPC, Log, Memory)->

  elm = document.querySelector "[new-asset]"

  elm.onclick = ()->
    assetId = await DB.send "new-asset"

    Memory.subscribe "assets.#{assetId}", true, listener = (asset)->
      return unless asset?
      Memory.unsubscribe "assets.#{assetId}", listener
      IPC.send "open-asset", assetId

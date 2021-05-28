Take ["DB", "DOOM", "IPC", "Log", "DOMContentLoaded"], (DB, DOOM, IPC, Log)->

  elm = document.querySelector "[new-asset]"

  elm.onclick = ()->
    assetId = await DB.invoke "asset"

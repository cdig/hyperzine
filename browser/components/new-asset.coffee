Take ["DB", "DOOM", "IPC", "Log", "Memory", "DOMContentLoaded"], (DB, DOOM, IPC, Log, Memory)->

  elm = document.querySelector "[new-asset]"

  elm.onclick = ()->
    DB.send "New Asset"

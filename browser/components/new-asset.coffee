Take ["DB", "DOOM", "IPC", "Log", "Memory"], (DB, DOOM, IPC, Log, Memory)->

  elm = document.querySelector "[new-asset]"

  elm.onclick = ()->
    DB.send "New Asset"

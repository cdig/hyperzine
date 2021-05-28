Take ["DOOM", "IPC", "DOMContentLoaded"], (DOOM, IPC)->

  elm = document.querySelector "[new-asset]"

  DOOM elm, click: ()->
    IPC.send "new-asset"

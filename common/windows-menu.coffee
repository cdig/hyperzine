Take ["IPC", "Log"], (IPC, Log)->

  min = document.querySelector "windows-menu #min"
  max = document.querySelector "windows-menu #max"
  restore = document.querySelector "windows-menu #restore"
  close = document.querySelector "windows-menu #close"
  return unless min and max and restore and close

  min.addEventListener "click", (e)->
    IPC.send "minimize-window"

  max.addEventListener "click", (e)->
    IPC.send "maximize-window"

  restore.addEventListener "click", (e)->
    IPC.send "unmaximize-window"

  close.addEventListener "click", (e)->
    IPC.send "close-window"

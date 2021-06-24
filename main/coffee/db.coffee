Take ["Window", "DBWindowReady"], (Window)->

  Make "DB", DB =
    send: (fn, ...args)-> Window.getDB().webContents.send "DB", fn, ...args

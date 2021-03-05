{ app } = require "electron"

app.on "browser-window-focus", (event, win)-> win.webContents.send "focus"
app.on "browser-window-blur", (event, win)-> win.webContents.send "blur"

{ app } = require "electron"
fs = require "fs"

Take ["Config", "State", "Window"], (Config, State, Window)->

  app.on "activate", initBrowser = ()->
    unless BrowserWindow.getAllWindows().length > 1
      Window.new "browser", true, title: "Hyperzine"

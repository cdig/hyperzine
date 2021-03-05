{ app } = require "electron"
fs = require "fs"

Take ["Config", "State", "Window"], (Config, State, Window)->

  promptForConfigData = (cb)->
    dialog.showMessageBox
      message: "Hyperzine uses a config file to store some local data. At the moment, this config file either doesn't exist, couldn't be loaded, or contains erroneous data.\n\nWould you like to generate a new config file? This will overwrite any existing config file."
      buttons: ["Generate", "Quit"]
      defaultId: 0
    .then ({response})->
      switch response
        when 0 then generateConfig cb
        when 1 then app.quit()


  app.on "ready", launch = ()->
    Window.new "db", true, title: "DB", backgroundThrottling: false, show: false
    initBrowser()

    if Config.load()
      launch()
    else
      promptForConfigData launch

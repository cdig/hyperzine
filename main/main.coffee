{ app } = require "electron"

Take ["AboutPanel", "Config", "IPC", "Menu", "Window"], (AboutPanel, Config, IPC, Menu, Window)->

  AboutPanel.setup()
  IPC.setup()

  app.on "ready", ()->
    Menu.setup()

    if Config.setup()
      Window.setup()
      Window.db()
      Window.browser()
      app.on "activate", Window.browser
    else
      app.quit()

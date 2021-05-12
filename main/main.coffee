{ app } = require "electron"

Take ["IPC", "Menu", "Window"], (IPC, Menu, Window)->

  # Wait for ready before doing anything substantial.
  await app.whenReady()

  # For now, we just roll with a static menu bar. In the future, we might want to change it
  # depending on which window is active.
  Menu.setup()

  # The first window we open is the DB, which handles all filesystem access and stores global state.
  # The instant the DB opens, it'll be ready to receive ports from other windows and help them.
  # The DB window should never be reloaded or closed, until the app quits, or it'll lose all the ports,
  # and we haven't designed the other windows to function (even temporarily) without a port to the db.
  # We queue it so that the below IPC listeners will be ready when the window actually opens.
  # (We could just call them first, but it reads better this way)
  queueMicrotask Window.open.db

  # When the DB window first wakes up, it'll attempt to load saved user preferences.
  # If the DB fails to load this data, we need to open the Setup Assistant.
  # The Setup Assistant will collect user preferences and save them via the DB.
  IPC.once "open-setup-assistant", Window.open.setupAssistant

  # Wait until either the DB has loaded the saved prefs, or the Setup Assistant has finished
  await IPC.promise.once "config-ready"

  # Everything is ready — open a browser window.
  # Eventually, we might want to restore whichever windows were open when we last quit
  # Window.open.browser() # DISABLED FOR TESTING DB

  # Whenever we switch to the app, let the window manager know.
  # app.on "activate", Window.activate

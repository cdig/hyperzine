{ app } = require "electron"

Take ["IPC", "Menu", "Window"], (IPC, Menu, Window)->

  # Wait for ready before doing anything substantial.
  await app.whenReady()

  # For now, we just roll with a static menu bar. In the future, we might want to change it
  # depending on which window is active.
  Menu.setup()

  # When the DB window first wakes up, it'll attempt to load saved user preferences.
  # If the DB fails to load this data, we need to open the Setup Assistant.
  # The Setup Assistant will collect user preferences and save them via the DB.
  IPC.once "db-need-setup", Window.open.setupAssistant

  # Set up a promise that'll be resolved once the DB window has successfully loaded config,
  # after the Setup Assistant has run (if necessary).
  dbReady = IPC.promise.once "db-ready"

  # The first window we open is the DB, which handles all filesystem access and stores global state.
  # The instant the DB opens, it'll be ready to receive ports from other windows and help them.
  # The DB window should never be reloaded or closed, until the app quits, or it'll lose all the ports,
  # and we haven't designed the other windows to function (even temporarily) without a port to the db.
  Window.open.db()

  # Once the DB has the user prefs loaded, we can continue.
  await dbReady

  # The last setup step is to open a browser window.
  # Window.open.browser()

  # Now, whenever we switch to the app, let the window manager know.
  # app.on "activate", Window.activate

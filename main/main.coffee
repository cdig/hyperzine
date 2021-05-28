{ app } = require "electron"

Take ["Env", "Handlers", "IPC", "Menu", "Window"], (Env, Handlers, IPC, Menu, Window)->

  # Here's our custom config for the About box
  app.setAboutPanelOptions
    applicationName: "Hyperzine #{Env.version.replace /(\d\.\d)\.0/, "$1"}"
    applicationVersion: [
      "Electron #{Env.versions.electron.split(".")[0]}"
      "Chrome #{Env.versions.chrome.split(".")[0]}"
      "Node #{Env.versions.node.split(".")[0]}"
    ].join " • "
    version: ""
    copyright: "Created by Ivan Reese\n© CD Industrial Group Inc."

  # Wait for ready before doing anything substantial.
  await app.whenReady()

  # For now, we just roll with a static menu bar. In the future, we might want to change it
  # depending on which window is active.
  Menu.setup()

  # There's about to be a lot of inter-process communication (IPC). Much of it is going to be
  # windows asking the main process to do things on their behalf. So let's set up those handlers.
  Handlers.setup()

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
  Window.open.browser()

  # Whenever we switch to the app, let the window manager know.
  app.on "activate", Window.activate

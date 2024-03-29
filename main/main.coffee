Take ["Env", "Handlers", "IPC", "Log", "Menu", "MainState", "Updates", "Window"], (Env, Handlers, IPC, Log, Menu, MainState, Updates, Window)->
  { app } = require "electron"

  # Windows will launch the app multiple times during an update. We just need to quit.
  return app.quit() if require "electron-squirrel-startup"

  # Only continue launching if there's no other instance of the app that's already running
  if not app.requestSingleInstanceLock()
    app.quit()
  else
    app.on "second-instance", (event, commandLine, workingDirectory)->
      Window.activate()

  # Just guessing that these might be nice. Haven't tested them at all.
  app.commandLine.appendSwitch "disable-renderer-backgrounding"
  app.commandLine.appendSwitch "force_low_power_gpu"

  # Here's our custom config for the About box
  app.setAboutPanelOptions
    applicationName: "Hyperzine #{Env.version.replace /(\d\.\d)\.0/, "$1"}"
    applicationVersion: [
      "Electron #{Env.versions.electron.split(".")[0]}"
      "Chrome #{Env.versions.chrome.split(".")[0]}"
      "Node #{Env.versions.node.split(".")[0]}"
    ].join " • "
    version: ""
    copyright: "© CD Industrial Group Inc."

  # While we're waiting for electron to get ready, we can load our persisted main state (if any).
  MainState.init()
  Window.init()

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

  # When the DB window is open, we can begin logging lots of stuff
  await IPC.promise.once "db-open"
  Log "Env.version: #{Env.version}"
  Log "Env.isDev: #{Env.isDev}"
  Log "Env.isMac: #{Env.isMac}"
  Log "Env.userData: #{Env.userData}"
  Log "Env.home: #{Env.home}"

  # When the DB window first wakes up, it'll attempt to load saved user preferences.
  # If the DB fails to load this data, we need to open the Setup Assistant.
  # The Setup Assistant will collect user preferences and save them via the DB.
  IPC.once "open-setup-assistant", Window.open.setupAssistant

  # Wait until either the DB has loaded the saved prefs, or the Setup Assistant has finished
  await IPC.promise.once "config-ready"

  Window.setupDone()

  # Everything is ready — open a browser window.
  # Eventually, we might want to restore whichever windows were open when we last quit
  Window.open.browser()

  # Whenever we switch to the app, let the window manager know.
  app.on "activate", Window.activate

  # Replace the default "exit" behaviour — we implement our own in window.coffee
  app.on "window-all-closed", ()->

  # Set up automatic updates
  Updates.setup()

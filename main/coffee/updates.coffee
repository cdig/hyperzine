Take ["Env", "Log", "Window"], (Env, Log, Window)->
  { app, autoUpdater, dialog } = require "electron"

  Make "Updates", Updates =
    setup: ()->
      return if Env.isDev

      doCheckForUpdates = true

      autoUpdater.setFeedURL
        url: "https://update.electronjs.org/cdig/hyperzine/#{process.platform}-#{process.arch}/#{app.getVersion()}"

      autoUpdater.on "checking-for-update", ()-> Log "Checking for update"
      autoUpdater.on "update-not-available", ()-> Log "Update not available"
      autoUpdater.on "update-available", ()-> doCheckForUpdates = false; Log "Downloading update..."
      autoUpdater.on "error", (err)-> doCheckForUpdates = false; Log.err err

      autoUpdater.on "update-downloaded", (e, releaseNotes, releaseName)->
        Log "Update Downloaded: #{releaseName}"
        res = await dialog.showMessageBox
          type: "info"
          buttons: ["Restart Hyperzine", "Later"]
          defaultId: 0
          title: "Application Update"
          message: "Hyperzine has been updated to #{releaseName.replace("v", "version ")}.\n\nWould you like to restart and use the updated version now?"
        Log "Response: #{res.response}"
        if res.response is 0
          Window.aboutToQuit()
          autoUpdater.quitAndInstall()
          Log "Quitting"

      checkForUpdates = ()->
        autoUpdater.checkForUpdates() if doCheckForUpdates

      checkForUpdates()
      setInterval checkForUpdates, 60 * 60 * 1000

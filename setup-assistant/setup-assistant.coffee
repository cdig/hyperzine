Take ["GearView", "IPC", "Log"], (GearView, IPC, Log)->

  gearsElm = GearView 60, -99
  gearsElm.className = "spin"

  document.querySelector("[quit-button]").onclick = ()->
    IPC.send "quit"

  # initConfig = ()->
  #   response = dialog.showMessageBoxSync
  #     message: "Welcome to Hyperzine"
  #     buttons: ["Begin Setup", "Quit"]
  #     defaultId: 0
  #
  #   if response is 0
  #     Config.init()
  #   else
  #     app.quit()
  #
  #
  # damagedConfig = ()->
  #   dialog.showMessageBoxSync
  #     message: "A Hyperzine config file exists, but is damaged. To avoid losing your preferences, please ask Ivan for help. Hyperzine will now quit."
  #     buttons: ["Okay"]
  #     # defaultId: 0 # Test if we need this, or if the default is automatic when there's only one button
  #   app.quit()
  #
  #
  # pathToAssetsFolder = ()->
  #   dialog.showMessageBoxSync
  #     message: "On the next screen, please select your Dropbox folder and click Open."
  #     buttons: ["Will Do"]
  #     defaultId: 0
  #
  #   filePaths = dialog.showOpenDialogSync
  #     defaultPath: path.join app.getPath("home")
  #     properties: ["openDirectory"]
  #
  #   unless filePaths
  #     return app.quit()
  #
  #   unless folder = filePaths[0]
  #     dialog.showErrorBox "Failed to Generate Config File", "Nothing was selected."
  #     return app.quit()
  #
  #   unless Array.last(folder.split(path.sep)).toLowerCase().indexOf("dropbox") is 0
  #     dialog.showErrorBox "Failed to Generate Config File", "You didn't select a Dropbox folder."
  #     return app.quit()
  #
  #   Config "pathToAssetsFolder", path.join folder, "System", "Hyperzine", "Assets"
  #
  #
  # user = ()->
  #   dialog.showMessageBoxSync
  #     message: "Please enter a user name. It should be unique to this computer."
  #     buttons: ["Will Do"]
  #     defaultId: 0
  #
  #   filePaths = dialog.showOpenDialogSync
  #     defaultPath: path.join app.getPath("home")
  #     properties: ["openDirectory"]
  #
  #   unless filePaths
  #     return app.quit()
  #
  #   unless folder = filePaths[0]
  #     dialog.showErrorBox "Failed to Generate Config File", "Nothing was selected."
  #     return app.quit()
  #
  #   unless Array.last(folder.split(path.sep)).toLowerCase().indexOf("dropbox") is 0
  #     dialog.showErrorBox "Failed to Generate Config File", "You didn't select a Dropbox folder."
  #     return app.quit()
  #
  #   Config "pathToAssetsFolder", path.join folder, "System", "Hyperzine", "Assets"

  Log "Setup Assistant"

  # db = await IPC.bindDB
  # initConfig() unless Config.read()
  # damagedConfig() unless Config.parse()
  # pathToAssetsFolder() unless Config "pathToAssetsFolder"
  # user() unless Config "user"
  # cb()

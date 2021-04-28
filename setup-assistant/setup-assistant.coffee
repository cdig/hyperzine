Take ["DOOM", "Env", "IPC", "Log", "Read", "DOMContentLoaded"], (DOOM, Env, IPC, Log, Read)->

  assetPath = Read.path(Env.home, "Dropbox", "System", "Hyperzine")
  localName = Env.computerName

  time = parseInt getComputedStyle(document.documentElement).getPropertyValue "--time"

  click = (n, fn)->
    document.querySelector(n).onclick = fn

  wait = (s)->
    new Promise (resolve)->
      setTimeout resolve, time * 1000

  to = (n)-> ()->
    document.body.className = n
    if elm = document.querySelector("[is-showing]")
      DOOM elm, isShowing: null, pointerEvents: null
    elm = document.getElementById n
    DOOM elm, isShowing: ""
    await wait() unless Env.isDev
    DOOM elm, pointerEvents: "auto"

  updateDisplayedAssetPath = ()->
    displayPath = assetPath
    displayPath = displayPath.replace Env.home, "" unless displayPath is Env.home
    displayPath = displayPath.slice 1 if displayPath.charAt(0) is Read.sep
    document.querySelector("[asset-path]").textContent = displayPath

  updateDisplayedLocalName = ()->
    document.querySelector("[local-name]").textContent = localName

  # Screens #######################################################################################

  # Init
  updateDisplayedAssetPath()
  updateDisplayedLocalName()
  do to "welcome"

  # Welcome
  click "[quit-button]", ()-> IPC.send "quit"
  click "#welcome [next-button]", to "data-folder"

  # Asset Storage
  click "#data-folder [back-button]", to "welcome"

  click "#data-folder [select-folder]", ()->
    res = await IPC.invoke "showOpenDialog",
      defaultPath: Env.home
      properties: ["openDirectory", "createDirectory"]
    unless res.cancelled
      assetPath = res.filePaths[0]
      updateDisplayedAssetPath()
      document.querySelector("[path-reason]").textContent = "This is the folder you selected:"
      IPC.send "set-storage-path"

  click "#data-folder [next-button]", ()->
    do to if await Read.isFolder assetPath then "existing-assets" else "path-error"

  # Path Error
  click "#path-error [back-button]", to "data-folder"

  # Existing Assets
  click "#existing-assets [back-button]", to "data-folder"
  click "#existing-assets [next-button]", to "local-name"

  # Local Name
  click "#local-name [back-button]", to "existing-assets"
  click "#local-name [next-button]", ()->
    # check whether any assets already exist using the local name. If so, show a warning. Otherwise...
    do to "setup-done"

  # Setup Done
  click "#setup-done [back-button]", to "local-name"
  click "#setup-done [next-button]", ()-> # DONE

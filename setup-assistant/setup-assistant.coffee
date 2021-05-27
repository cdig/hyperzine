Take ["DOOM", "Env", "IPC", "Log", "Memory", "Read", "DOMContentLoaded"], (DOOM, Env, IPC, Log, Memory, Read)->

  q = (k)-> document.querySelector k # Ugh so repetitive

  elms =
    pathReason: q "[path-reason]"
    dataFolder: q "[data-folder]"
    localName: q "[local-name]"
    existingAssets: q "[existing-assets]"

  click = (n, fn)->
    q(n).onclick = fn

  wait = ()->
    new Promise (resolve)->
      waitTime = parseInt document.documentElement.computedStyleMap().get("--time")[0]
      setTimeout resolve, waitTime * 1000

  to = (n)-> ()->
    document.body.className = n
    if elm = q("[is-showing]")
      DOOM elm, isShowing: null, pointerEvents: null
    elm = document.getElementById n
    DOOM elm, isShowing: ""
    await wait()# unless Env.isDev
    DOOM elm, pointerEvents: "auto"

  # Block newlines in typable fields (needs to be keydown to avoid flicker)
  window.addEventListener "keydown", (e)-> e.preventDefault() if e.keyCode is 13

  # Alternative to clicking buttons (needs to be keyup to avoid inadvertant key repeat)
  window.addEventListener "keydown", (e)-> q("[is-showing] [next-button]")?.click() if e.keyCode is 13


  # Screens #######################################################################################

  # Init
  do to "welcome"

  # Welcome
  click "[quit-button]", ()->
    IPC.send if Memory "setupDone" then "close-window" else "quit"

  Memory.subscribe "setupDone", true, (v)->
    q("[quit-button]").textContent = if v then "Close" else "Quit"

  click "#welcome [next-button]", to "data-folder"

  # Data Folder
  click "#data-folder [back-button]", to "welcome"

  click "#data-folder [select-folder]", ()->
    res = await IPC.invoke "showOpenDialog",
      defaultPath: Env.home
      properties: ["openDirectory", "createDirectory"]
    unless res.cancelled
      newFolder = res.filePaths[0]
      Memory.change "dataFolder", newFolder

  Memory.subscribe "dataFolder", true, (v)->
    return unless v?
    display = v
    display = display.replace Env.home, "" unless display is Env.home
    display = display.slice 1 if display.charAt(0) is Read.sep
    elms.dataFolder.textContent = display
    elms.pathReason.textContent = if v is Env.defaultDataFolder
      "This Dropbox folder is the default:"
    else
      "This is the folder you selected:"
    elms.existingAssets.textContent = "Scanning asset folder…"

  click "#data-folder [next-button]", ()->
    do to if await Read.isFolder Memory "dataFolder" then "existing-assets" else "path-error"

  # Path Error
  click "#path-error [back-button]", to "data-folder"

  # Existing Assets
  click "#existing-assets [back-button]", to "data-folder"

  Memory.subscribe "assets", true, (v)->
    return unless v?
    count = Object.keys(v).length
    elms.existingAssets.textContent = String.pluralize count, "Found %% Asset"

  click "#existing-assets [next-button]", to "local-name"

  # Local Name
  click "#local-name [back-button]", to "existing-assets"

  Memory.subscribe "localName", true, (v)->
    elms.localName.textContent = v

  localNameValid = ()->
    return -1 is elms.localName.textContent.trim().search /[^\w ]/

  setLocalName = ()->
    v = elms.localName.textContent.trim()
    return unless v.length and localNameValid()
    # check whether any assets already exist using the local name. If so, show a warning. Otherwise...
    Memory "localName", v
    do to "setup-done"

  elms.localName.addEventListener "input", (e)->
    elms.localName.className = if localNameValid() then "field" else "field invalid"

  click "#local-name [next-button]", setLocalName

  # Setup Done
  click "#setup-done [back-button]", to "local-name"
  click "#setup-done [next-button]", ()->
    Memory "setupDone", true
    IPC.send "config-ready"
    IPC.send "close-window"

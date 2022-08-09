{ shell } = require "electron"

Take ["DOOM", "Env", "IPC", "Log", "Memory", "Read"], (DOOM, Env, IPC, Log, Memory, Read)->

  previousInputValue = null

  q = (k)-> document.querySelector k # Ugh so repetitive

  elms =
    pathReason: q "[path-reason]"
    dataFolder: q "[data-folder]"
    localName: q "[local-name]"
    apiToken: q "[api-token]"
    existingAssets: q "[existing-assets]"

  inputs = []

  focus = (e)-> previousInputValue = e.currentTarget.textContent

  for n in ["localName"]
    inputs.push elm = elms[n]
    elm.addEventListener "focus", focus

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
    clearFocus()
    await wait()# unless Env.isDev
    DOOM elm, pointerEvents: "auto"

  inputIsFocused = ()->
    document.activeElement in inputs

  clearFocus = ()->
    document.activeElement.blur()
    window.getSelection().empty()

  resetValue = ()->
    document.activeElement.textContent = previousInputValue

  # Block newlines in typable fields (needs to be keydown to avoid flicker)
  window.addEventListener "keydown", (e)->
    e.preventDefault() if e.keyCode is 13

  # Alternative to clicking buttons (needs to be keyup to avoid inadvertant key repeat)
  window.addEventListener "keydown", (e)->
    switch e.keyCode
      when 13
        q("[is-showing] [next-button]")?.click()

      when 27
        if inputIsFocused()
          resetValue()
          clearFocus()
        else
          q("[is-showing] [back-button]")?.click()


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
    return -1 is elms.localName.textContent.trim().search /[^\w\d ]/

  elms.localName.addEventListener "input", (e)->
    elms.localName.className = if localNameValid() then "field" else "field invalid"

  click "#local-name [next-button]", ()->
    v = elms.localName.textContent.trim()
    return unless v.length and localNameValid()
    # TODO: check whether any assets already exist using the local name. If so, show a warning. Otherwise...
    Memory.change "localName", v
    do to "api-token"

  # API Token
  click "#api-token [back-button]", to "local-name"

  fieldHint = "Paste API Token Here"

  apiTokenValid = ()->
    v = elms.apiToken.textContent.trim()
    v isnt "" and v isnt fieldHint

  updateApiTokenButtons = (e)->
    valid = apiTokenValid()
    DOOM q("#api-token [get-a-token]"), display: if valid then "none" else "block"
    DOOM q("#api-token [next-button]"), display: if valid then "block" else "none"

  elms.apiToken.addEventListener "focus", ()-> elms.apiToken.textContent = "" unless apiTokenValid()
  elms.apiToken.addEventListener "blur", ()-> elms.apiToken.textContent = fieldHint unless apiTokenValid()
  elms.apiToken.addEventListener "input", updateApiTokenButtons
  elms.apiToken.addEventListener "change", updateApiTokenButtons

  Memory.subscribe "apiToken", true, (v)->
    elms.apiToken.textContent = v or fieldHint
    updateApiTokenButtons()

  click "#api-token [get-a-token]", ()->
    shell.openExternal("https://www.lunchboxsessions.com/admin/api-tokens")

  click "#api-token [next-button]", ()->
    Memory.change "apiToken", elms.apiToken.textContent.trim()
    do to "setup-done"

  # Setup Done
  click "#setup-done [back-button]", to "api-token"
  click "#setup-done [next-button]", ()->
    Memory.change "setupDone", true
    IPC.send "config-ready"
    IPC.send "close-window"

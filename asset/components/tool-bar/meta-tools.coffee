Take ["DB", "DOOM", "Env", "HoldToRun", "IPC", "Memory", "Paths", "State", "Write"], (DB, DOOM, Env, HoldToRun, IPC, Memory, Paths, State, Write)->
  { shell } = require "electron"

  pinUnpin = document.querySelector "[pin-unpin]"
  deleteAsset = document.querySelector "[delete-asset]"
  showInFinder = document.querySelector "[show-in-finder]"

  if !Env.isMac
    showInFinder.querySelector("span").textContent = "in Explorer"

  showInFinder.onclick = ()->
    shell.showItemInFolder State("asset").path

  HoldToRun deleteAsset, 1000, ()->
    asset = State "asset"
    DB.send "Delete Asset", asset.id
    IPC.send "close-window"

  render = ()->
    DOOM pinUnpin, textContent: if State("asset").pinned then "Unpin" else "Pin"

  Make.async "MetaTools", MetaTools =
    render: render

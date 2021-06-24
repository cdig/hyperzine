Take ["DOOM", "HoldToRun", "IPC", "Memory", "Paths", "State", "Write", "DOMContentLoaded"], (DOOM, HoldToRun, IPC, Memory, Paths, State, Write)->
  { shell } = require "electron"

  pinUnpin = document.querySelector "[pin-unpin]"
  deleteAsset = document.querySelector "[delete-asset]"
  showInFinder = document.querySelector "[show-in-finder]"

  showInFinder.onclick = ()->
    shell.showItemInFolder Paths.asset State "asset"

  HoldToRun deleteAsset, 1000, ()->
    asset = State("asset")
    Write.sync.rm asset.path
    IPC.send "close-window"

  render = ()->
    DOOM pinUnpin, textContent: if State("asset").pinned then "Unpin" else "Pin"

  Make.async "MetaTools", MetaTools =
    render: render

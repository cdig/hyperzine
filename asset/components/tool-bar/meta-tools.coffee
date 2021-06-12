Take ["DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], (DOOM, Memory, Paths, State)->
  { shell } = require "electron"

  pinUnpin = document.querySelector "[pin-unpin]"
  showInFinder = document.querySelector "[show-in-finder]"

  showInFinder.onclick = ()->
    shell.showItemInFolder Paths.asset State "asset"

  render = ()->
    DOOM pinUnpin, textContent: if State("asset").pinned then "Unpin" else "Pin"

  Make.async "MetaTools", MetaTools =
    render: render

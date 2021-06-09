Take ["DOOM", "FilesPane", "Log", "MetaPane", "Paths", "State", "DOMContentLoaded"], (DOOM, FilesPane, Log, MetaPane, Paths, State)->
  { shell } = require "electron"

  windowTop = document.querySelector "window-top"
  titleBar = windowTop.querySelector "title-bar"
  assetName = titleBar.querySelector "[asset-name]"
  pinUnpin = document.querySelector "[pin-unpin]"
  showInFinder = document.querySelector "[show-in-finder]"

  showInFinder.addEventListener "click", ()->
    shell.showItemInFolder Paths.asset State "asset"

  Render = ()->
    asset = State "asset"

    DOOM pinUnpin, textContent: if asset.pinned then "Unpin" else "Pin"
    DOOM assetName, textContent: asset.name or asset.id
    FilesPane.render()
    MetaPane.render()

  Make "Render", Render

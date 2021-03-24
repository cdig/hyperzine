{ shell } = require "electron"
Take ["DOOM", "FilesPane", "MetaPane", "Paths", "State", "DOMContentLoaded"], (DOOM, FilesPane, MetaPane, Paths, State)->

  windowTop = document.querySelector "window-top"
  titleBar = windowTop.querySelector "title-bar"
  assetName = titleBar.querySelector "[asset-name]"
  pinUnpin = document.querySelector "[pin-unpin]"
  showInFinder = document.querySelector "[show-in-finder]"

  showInFinder.addEventListener "click", ()->
    shell.showItemInFolder Paths.files State.asset

  Render = ()->
    # start = performance.now()

    # DOOM pinUnpin, textContent: if State.asset.pinned then "Unpin" else "Pin"
    DOOM assetName, textContent: State.asset.id + " • " + Paths.displayName State.asset
    FilesPane.render()
    # MetaPane.render()
    # console.log performance.now() - start

  Make "Render", Render

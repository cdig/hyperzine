{ shell } = require "electron"

Take ["DOOM", "FilesPane", "MetaPane", "Paths", "State", "DOMContentLoaded"], (DOOM, FilesPane, MetaPane, Paths, State)->

  windowTop = document.querySelector "window-top"
  titleBar = windowTop.querySelector "title-bar"
  assetName = titleBar.querySelector "[asset-name]"
  toolBar = windowTop.querySelector "tool-bar"
  showInFinder = toolBar.querySelector "[show-in-finder]"

  showInFinder.addEventListener "click", ()->
    shell.showItemInFolder Paths.files State.asset

  Render = ()->
    # start = performance.now()
    DOOM assetName, textContent: Paths.displayName State.asset
    FilesPane.render()
    MetaPane.render()
    # console.log performance.now() - start

  Make "Render", Render

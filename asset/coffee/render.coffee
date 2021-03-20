Take ["DOOM", "FilesPane", "MetaPane", "Paths", "PubSub", "State", "DOMContentLoaded"], (DOOM, FilesPane, MetaPane, Paths, {Pub}, State)->

  windowTop = document.querySelector "window-top"
  titleBar = windowTop.querySelector "title-bar"
  assetName = titleBar.querySelector "[asset-name]"
  showInFinder = document.querySelector "[show-in-finder]"

  showInFinder.addEventListener "click", ()->
    Pub "Show In Finder"

  Render = ()->
    # start = performance.now()
    DOOM assetName, textContent: State.asset.id + " • " + Paths.displayName State.asset
    FilesPane.render()
    MetaPane.render()
    # console.log performance.now() - start

  Make "Render", Render

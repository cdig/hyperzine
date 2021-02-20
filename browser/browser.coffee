{ ipcRenderer } = require "electron"

Take ["Assets", "PubSub", "Render", "DOMContentLoaded"], (Assets, {Sub}, Render)->

  update = (assets)->
    Assets assets
    Render()

  Sub "Render", Render

  ipcRenderer.invoke("browser-assets").then update
  ipcRenderer.on "assets", (event, assets)-> update assets

{ ipcRenderer } = require "electron"

Take [], ()->

  ipcRenderer.on "focus", ()-> document.documentElement.classList.remove "blur"
  ipcRenderer.on "blur", ()-> document.documentElement.classList.add "blur"

  Make "IPC", IPC =
    getConfig: (cb)->
      ipcRenderer.invoke("config-data").then cb
    onAssets: (cb)->
      ipcRenderer.invoke("browser-assets").then cb
      ipcRenderer.on "assets", (event, assets)-> cb assets

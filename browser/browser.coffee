Take ["Assets", "IPC", "Paths", "PubSub", "Render", "DOMContentLoaded"], (Assets, IPC, Paths, {Sub}, Render)->

  requestIdleCallback ()->

    IPC.getConfig (configData)->
      Paths.setConfig configData

      Sub "Render", Render

      IPC.onAssets (assets)->
        Assets assets
        Render()

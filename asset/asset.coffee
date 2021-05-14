Take ["IPC", "Log", "Paths", "PubSub", "Render", "State", "DOMContentLoaded"], (IPC, Log, Paths, {Pub, Sub}, Render, State)->

  requestIdleCallback ()->

    IPC.getConfig (configData)->
      Paths.setConfig configData

      Sub "Render", Render

      IPC.init
        load: (asset)->
          State.asset = asset
          Render()

        assetChanged: (asset)->
          if asset.id is State.asset.id
            State.asset = asset
            Render()

        assetDeleted: (assetId)->
          if assetId is State.asset.id
            IPC.closeWindow()

        find: ()-> Pub "Find"

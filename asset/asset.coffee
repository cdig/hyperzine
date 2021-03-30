Take ["IPC", "Log", "Paths", "PubSub", "Render", "State", "DOMContentLoaded"], (IPC, Log, Paths, {Pub, Sub}, Render, State)->

  requestIdleCallback ()->

    IPC.getConfig (configData)->
      Paths.setConfig configData

      Sub "Render", Render

      IPC.init
        load: (asset, info)->
          State.asset = asset
          Make "Info", info
          Render()

        assetChanged: (asset)->
          if asset.id is State.asset.id
            State.asset = asset
            Render()

        assetDeleted: (assetId)->
          if assetId is State.asset.id
            IPC.closeWindow()

        find: ()-> Pub "Find"

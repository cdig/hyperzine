Take ["Assets", "IPC", "Log", "Paths", "PubSub", "Render", "DOMContentLoaded"], (Assets, IPC, Log, Paths, {Pub, Sub}, Render)->

  requestIdleCallback ()->

    IPC.getConfig (configData)->
      Paths.setConfig configData

      Sub "Render", Render

      IPC.init
        loadInfo: (info)->
          Make "Info", info

        loadAssets: (assets)->
          Log.time "Build assets", ()-> Assets assets
          Log.time "Initial render", Render

        assetChanged: (asset)->
          Render.deleteAssetCard Assets.update asset
          Render()

        assetDeleted: (assetId)->
          Render.deleteAssetCard Assets.delete assetId

        find: ()-> Pub "Find"

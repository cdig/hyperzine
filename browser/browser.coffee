Take ["Assets", "IPC", "Paths", "PubSub", "Render", "DOMContentLoaded"], (Assets, IPC, Paths, {Sub}, Render)->

  requestIdleCallback ()->

    IPC.getConfig (configData)->
      Paths.setConfig configData

      Sub "Render", Render

      IPC.init
        loadInfo: (info)->
          Make "Info", info

        loadAssets: (assets)->
          Assets assets
          Render()

        assetChanged: (asset)->
          Render.deleteAssetCard Assets.update asset
          Render()

        assetDeleted: (assetId)->
          Render.deleteAssetCard Assets.delete assetId

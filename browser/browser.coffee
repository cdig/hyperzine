Take ["Env", "IPC", "Log", "DOMContentLoaded"], (Env, IPC, Log)->

  Log "Browser Open"

  # requestIdleCallback ()->
  #
  #   IPC.getConfig (configData)->
  #     Paths.setConfig configData
  #
  #     Sub "Render", Render
  #
  #     IPC.init
  #       loadInfo: (info)->
  #         Make "Info", info
  #
  #       loadAssets: (assets)->
  #         Log.time "Build assets", ()-> Assets assets
  #         Log.time "Initial render", Render
  #
  #       assetChanged: (asset)->
  #         Render.deleteAssetCard Assets.update asset
  #         Render()
  #
  #       assetDeleted: (assetId)->
  #         Render.deleteAssetCard Assets.delete assetId
  #
  #       find: ()-> Pub "Find"

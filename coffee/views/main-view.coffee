Take ["AssetView", "NewAssetView", "SearchView", "SettingsView", "Globals"], (AssetView, NewAssetView, SearchView, SettingsView)->
  Make "MainView", ()->
    state = StateMachine()

    Preact.h "main", null,
      switch state
        when "Default" then null

        when "Asset"     then AssetView()
        when "New Asset" then NewAssetView()
        when "Search"    then SearchView()
        when "Settings"  then SettingsView()

        when "LoadAssets Error" then Preact.h "h1", null, "LoadAssets Error"

        else Preact.h "h1", null, "Unknown State: #{StateMachine()}"

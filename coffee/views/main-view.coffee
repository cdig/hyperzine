# React = preactCompat
# ReactDOM = preactCompat

console.log require "preact-compat"

# console.log require "react-select"

Take ["AssetView", "NewAssetView", "SearchView", "SettingsView", "Globals"], (AssetView, NewAssetView, SearchView, SettingsView)->
  Make "MainView", ()->
    state = StateMachine()

    Preact.h "main", null,
      SearchView()
      AssetView()
      NewAssetView()
      SettingsView()

        # when "LoadAssets Error" then Preact.h "h1", null, "LoadAssets Error"
        #
        # else Preact.h "h1", null, "Unknown State: #{StateMachine()}"

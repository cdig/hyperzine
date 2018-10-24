Take ["AssetView", "SearchView", "Globals"], (AssetView, SearchView)->
  Make "MainView", ()->
    Preact.h "main", null,

      switch StateMachine()
        when "LoadAssets Error"
          Preact.h "h1", null, "LoadAssets Error"

        when "Search"
          SearchView()

        when "Asset"
          AssetView()

        when "Default"
          Preact.h "h1", null, "Loading"

        else
          Preact.h "h1", null, "Unknown State: #{StateMachine()}"

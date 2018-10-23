Take ["SearchView", "Globals"], (SearchView)->
  Make "Main", ()->

    switch StateMachine()
      when "LoadAssets Error"
        Preact.h "h1", null, "LoadAssets Error"

      when "Search"
        SearchView()

      when "Default"
        Preact.h "h1", null, "Loading"

      else
        Preact.h "h1", null, "Unknown State: #{StateMachine()}"

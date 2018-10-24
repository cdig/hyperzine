Take ["Asset", "ResultCount", "Globals"], (Asset, ResultCount, NavView)->
  Make "NavView", ()->

    backToSearch = unless StateMachine() is "Search"
      Preact.h "button", {onclick: ()-> Asset.edit null}, "Back to Search"

    Preact.h "nav", null,
      Preact.h "div", {left:""},
        backToSearch
      Preact.h "div", {center:""},
        ResultCount()
      Preact.h "div", {right:""},
        Preact.h "button", {settings:"", onclick: ()-> Asset.edit null}, "Settings"

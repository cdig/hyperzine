Take ["Asset", "GearView", "NewAssetButton", "ResultCount", "SearchBar", "Globals"], (Asset, GearView, NewAssetButton, ResultCount, SearchBar)->

  settingsClick = ()->
    Pub "Toggle Settings View"

  Make "NavView", ()->
    Preact.h "nav", null,
      Preact.h "div", {left:""},
        Preact.h "h2", null, "Hyperzine"
        GearView()
      Preact.h "div", {center:""},
        NewAssetButton()
        SearchBar()
        ResultCount()
      Preact.h "div", {right:""},
        Preact.h "button", {settings:"", onclick: settingsClick}, "Settings"

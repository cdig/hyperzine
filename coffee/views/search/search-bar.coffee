Take ["Asset", "DB", "Globals"], (Asset, DB)->
  DB.searchInput ?= ""

  focus = ()->
    Asset.edit()

  change = (e)->
    DB.searchInput = e.target.value
    Pub "Search"
    Pub "Render"

  Make "SearchBar", ()->
    Preact.h "search-bar", null,
      Preact.h "input", type: "search", placeholder: "Search", value: DB.searchInput, onfocus: focus, onchange: change, oninput: change

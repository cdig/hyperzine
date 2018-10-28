Take ["Asset", "DB", "Globals"], (Asset, DB)->
  DB.searchInput ?= ""

  focus = ()-> Pub "To Search View"
  change = (e)-> Pub "Set Search Input", e.target.value

  Make "SearchBar", ()->
    Preact.h "search-bar", null,
      Preact.h "input", type: "search", placeholder: "Search", value: DB.searchInput, onfocus: focus, onchange: change, oninput: change

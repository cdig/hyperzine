Take ["DB"], (DB)->
  DB.searchInput ?= ""

  change = (e)->
    DB.searchInput = e.target.value
    Pub "Search"
    Pub "Render"

  Make "SearchBar", ()->

    Preact.h "search-bar", null,
      Preact.h "input", type: "search", placeholder: "Search Assets", value: DB.searchInput, onchange: change, oninput: change

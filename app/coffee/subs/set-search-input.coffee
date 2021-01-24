Take ["DB", "Globals"], (DB)->

  Sub "Set Search Input", (v)->
    DB.searchInput = v
    Pub "Search"
    Pub "Render"

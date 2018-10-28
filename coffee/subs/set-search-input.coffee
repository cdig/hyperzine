Take ["DB", "Globals"], (DB)->

  Sub "Set Search Input", ()->
    DB.searchInput = e.target.value
    Pub "Search"
    Pub "Render"

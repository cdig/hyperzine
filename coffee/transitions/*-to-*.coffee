Take ["DB", "Globals"], (DB)->

  StateMachine "*", "*", (from, to)->
    DB.appState = to
    Pub "Render"

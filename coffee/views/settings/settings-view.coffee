Take ["Globals"], (DB)->

  Make "SettingsView", ()->
    display = if StateMachine() is "Settings" then "block" else "none"

    Preact.h "settings-view", {style: "display: #{display}"}, "Settings"

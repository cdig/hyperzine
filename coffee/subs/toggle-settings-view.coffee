Take ["Globals"], ()->

  Sub "Toggle Settings View", ()->
    if StateMachine() isnt "Settings"
      StateMachine "Settings"
    else
      StateMachine.back()

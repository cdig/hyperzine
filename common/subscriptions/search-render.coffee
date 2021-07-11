Take ["PubSub", "State"], ({Pub}, State)->

  State.subscribe "search", false, ()->
    Pub "Render"

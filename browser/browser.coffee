Take ["Log", "Memory", "PubSub", "Render"], (Log, Memory, {Pub, Sub}, Render)->

  Sub "Render", Render
  Memory.subscribe "assets", true, Render

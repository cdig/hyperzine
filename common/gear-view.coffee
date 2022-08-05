Take ["DOOM"], (DOOM)->

  Make "GearView", (depth = 30, offset = -10, attrs = {})->
    gearsElm = document.querySelector "gear-view"

    gearElm = gearsElm
    for i in [0..depth]
      gearElm = DOOM.create "span", gearElm # For special effects
      gearElm = DOOM.create "div", gearElm, style: "animation-delay: #{offset}s"

    DOOM gearsElm, attrs

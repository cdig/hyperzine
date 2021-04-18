Take ["DOOM"], (DOOM)->

  Make "GearView", (depth = 30, offset)->
    offset ?= Math.rand(.2, 1) * Math.sign Math.rand()

    gearsElm = document.querySelector "gear-view"
    gearElm = gearsElm
    for i in [0..depth]
      gearElm = DOOM.create "span", gearElm # For special effects
      gearElm = DOOM.create "div", gearElm, style: "animation-delay: #{offset}s"
    gearsElm

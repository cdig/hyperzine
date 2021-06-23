Take ["DOOM", "DOMContentLoaded"], (DOOM)->

  isDown = null
  timeout = null

  down = (elm, time, cb)-> (e)->
    if not isDown? and e.button is 0
      isDown = elm
      DOOM isDown, holdActive: "", holdLonger: null
      timeout = setTimeout run(cb), time

  up = ()->
    if isDown?
      DOOM isDown, holdActive: null, holdLonger: ""
      clearTimeout timeout
      isDown = null

  run = (cb)-> ()->
    isDown = null
    cb()

  window.addEventListener "mouseup", up

  Make "HoldToRun", HoldToRun = (elm, time, cb)->
    DOOM elm, holdToRun: ""
    elm.style.setProperty "--hold-time", time + "ms"
    elm.onmousedown = down elm, time, cb

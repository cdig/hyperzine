Take ["DB", "Globals"], (DB)->

  StateMachine "Search", "Asset", (from, to)->
    requestAnimationFrame ()->
      if elm = document.querySelector "asset-view"
        elm.scrollTo top: 0

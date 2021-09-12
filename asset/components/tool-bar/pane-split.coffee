Take [], ()->
  Split = require "split-grid"

  paneSplit = document.querySelector "pane-split"
  container = document.querySelector "main"

  Split
    columnGutters: [
      track: 1
      element: paneSplit
    ]

  # On double click, reset the split to the center
  lastClickTime = 0
  paneSplit.addEventListener "mousedown", ()->
    # Split-grid puts a preventDefault call on mousedown, so we have to implement our own dblclick logic
    if performance.now() < lastClickTime + 300
      container.style["grid-template-columns"] = "1fr 6px 1fr" # Must mirror the value in main.scss
    lastClickTime = performance.now()

Take [], ()->

  Split = require "split-grid"
  Split
    columnGutters: [
      track: 1
      element: document.querySelector "pane-split"
    ]

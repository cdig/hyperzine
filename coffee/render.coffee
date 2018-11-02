Take ["DB", "RootView", "Globals"], (DB, RootView)->

  root = null
  renderRequested = false

  requestRender = ()->
    unless renderRequested
      renderRequested = true
      requestAnimationFrame render
    return false

  render = ()->
    renderRequested = false
    root = Preact.render RootView(), document.body, root

    Pub "After Render"

  Make "Render", requestRender

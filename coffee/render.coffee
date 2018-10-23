Take ["DB", "Main", "Globals"], (DB, Main)->

  mainElm = document.body.querySelector "main"
  root = null

  renderRequested = false
  requestRender = ()->
    unless renderRequested
      renderRequested = true
      requestAnimationFrame render
    return false

  render = ()->
    renderRequested = false

    root = Preact.render Main(), mainElm, root

    # DOOM.empty mainElm
    # DOOM.append mainElm, RenderTemplate Main()

  Make "Render", requestRender
  Sub "Render", requestRender
  Sub "Asset Updated", requestRender
  StateMachine "*", "*", requestRender

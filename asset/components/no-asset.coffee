Take ["DOOM", "State"], (DOOM, State)->

  elm = document.querySelector "no-asset"

  Make "NoAsset", NoAsset =
    render: ()->
      DOOM elm, display: if State("asset")? then "none" else "block"

Take ["DOOM", "State"], (DOOM, State)->

  elm = document.querySelector "no-asset"

  Make "NoAsset", NoAsset =
    render: ()->
      asset = State "asset"
      DOOM elm, display: if not asset? then "block" else "none"

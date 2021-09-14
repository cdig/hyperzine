Take ["DB", "DOOM", "Env", "Log", "State", "DOMContentLoaded"], (DB, DOOM, Env, Log, State)->

  return unless Env.isDev

  button = document.querySelector "[magic-button]"
  DOOM button, display: "block"

  button.addEventListener "click", ()->
    if asset = State "asset"
      DB.send "Rebuild Thumbnail", asset.id

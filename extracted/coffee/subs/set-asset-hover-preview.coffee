Take ["DB", "Globals"], (DB)->

  Sub "Set Asset Hover Preview", (v)->
    DB.assetHoverPreview = v
    Pub "Render"

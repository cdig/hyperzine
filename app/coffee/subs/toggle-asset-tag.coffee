Take ["Asset", "Globals"], (Asset)->

  Sub "Toggle Asset Tag", (asset, tag)->
    Asset.toggleTag asset, tag
    Pub "Search"
    Pub "Render"

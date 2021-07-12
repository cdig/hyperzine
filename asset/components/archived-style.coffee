Take ["DOOM", "State"], (DOOM, State)->

  Make "ArchivedStyle", ArchivedStyle =
    render: ()->
      asset = State "asset"
      isArchived = asset?.tags? and ("Archived" in asset.tags)
      State "archived", isArchived
      DOOM document.documentElement, isArchived: if isArchived then "" else null

Take ["DOOM", "FilesPane", "FileTools", "Memory", "MetaPane", "MetaTools", "State", "DOMContentLoaded"], (DOOM, FilesPane, FileTools, Memory, MetaPane, MetaTools, State)->

  Render = ()->
    FileTools.render()
    MetaTools.render()
    FilesPane.render()
    MetaPane.render()

    asset = State "asset"
    DOOM document.documentElement, isArchived: if "Archived" in asset.tags then "" else null


  Make "Render", Render

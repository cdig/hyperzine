Take ["FilesPane", "FileTools", "MetaPane", "MetaTools", "DOMContentLoaded"], (FilesPane, FileTools, MetaPane, MetaTools)->

  Render = ()->
    FileTools.render()
    MetaTools.render()
    FilesPane.render()
    MetaPane.render()

  Make "Render", Render

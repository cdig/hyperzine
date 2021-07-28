Take ["ArchivedStyle", "FilesPane", "FileTools", "MetaPane", "MetaTools", "NoAsset", "State", "DOMContentLoaded"], (ArchivedStyle, FilesPane, FileTools, MetaPane, MetaTools, NoAsset, State)->

  Make "Render", Render = ()->
    # These subsystems are designed to work whether an asset is loaded or not
    ArchivedStyle.render()
    NoAsset.render()

    if State "asset"
      # These subsystems haven't yet been updated to work if an asset isn't loaded
      FileTools.render()
      MetaTools.render()
      FilesPane.render()
      MetaPane.render()

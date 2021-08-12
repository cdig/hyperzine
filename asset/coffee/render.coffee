Take ["ArchivedStyle", "FileList", "FileTools", "MetaPane", "MetaTools", "State", "DOMContentLoaded"], (ArchivedStyle, FileList, FileTools, MetaPane, MetaTools, State)->

  Make "Render", Render = ()->
    return unless State "asset"

    ArchivedStyle.render()
    FileList.render()
    FileTools.render()
    MetaTools.render()
    MetaPane.render()

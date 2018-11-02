remote = require("electron").remote
dialog = remote.dialog

Take [], ()->

  Sub "Save Files", (assets)->
    win = remote.getCurrentWindow()
    path = dialog.showSaveDialog win

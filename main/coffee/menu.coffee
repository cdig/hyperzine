{ app, Menu, shell } = require "electron"

Take ["State", "Window"], (Window)->

  template = []

  if State.isMac then template.push
    label: app.name
    submenu: [
      { role: "about" }
      { type: "separator" }
      { role: "services" }
      { type: "separator" }
      { role: "hide" }
      { role: "hideothers" }
      { role: "unhide" }
      { type: "separator" }
      { role: "quit" }
    ]

  template.push
    label: "File"
    submenu: [
      { label: "New Asset", enabled: false, accelerator: "CmdOrCtrl+N" }
      { label: "New Browser Window", accelerator: "CmdOrCtrl+Shift+N", click: ()-> Window.new "browser"}
      { type: "separator" }
      ...(if State.isDev
        [{ label: "Export App Folder", click: AppFolder.export }]
      else
        [{ label: "Open App Update", click: AppFolder.import }]
      )
      { label: "Show Config File", click: ()-> shell.showItemInFolder Config.path() }
      { type: "separator" }
      { role: if State.isMac then "close" else "quit" }
    ]

  template.push
    label: "Edit"
    submenu: [
      { role: "undo" }
      { role: "redo" }
      { type: "separator" }
      { role: "cut" }
      { role: "copy" }
      { role: "paste" }
      { role: "delete" }
      { role: "selectAll" }
      { type: "separator" }
    ]

  template.push
    label: "View"
    submenu: [
      ...(if State.isDev then [
        { role: "reload" }
        { role: "forceReload" }
        { role: "toggleDevTools" }
        { type: "separator" }
      ] else [])
      { role: "togglefullscreen" }
    ]

  template.push { role: "windowMenu" }
    # label: "Window"
    # submenu: [
    #   { role: "minimize" }
    #   { role: "zoom" }
    #   ...(if State.isMac then [
    #     { type: "separator" }
    #     { role: "front" }
    #     { type: "separator" }
    #     { role: "window" }
    #   ] else [
    #     { role: "close" }
    #   ])
    # ]

  template.push
    role: "help"
    submenu: [
      { label: "Report a Problem or Feature Request…", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues/new" }
      { label: "All Open Issues", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues" }
      { label: "Beep for Good Luck", click: ()-> shell.beep() }
    ]


  app.on "ready", ()->
    Menu.setApplicationMenu Menu.buildFromTemplate template

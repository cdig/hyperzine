{ app, Menu, shell } = require "electron"

Take ["AppFolder", "Env", "IPC", "Window"], (AppFolder, Env, IPC, Window)->

  template = []

  if Env.isMac then template.push
    label: app.name
    submenu: [
      { role: "about" }
      { type: "separator" }
      { label: "Preferences", accelerator: "CmdOrCtrl+,", click: Window.open.setupAssistant }
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
      { label: "New Browser Window", accelerator: "CmdOrCtrl+Shift+N", click: Window.open.browser }
      { type: "separator" }
      ...(if Env.isDev
        [{ label: "Export App Folder", click: AppFolder.export }]
      else
        [{ label: "Open App Update…", click: AppFolder.import }]
      )
      { label: "Show Config File", click: ()-> shell.showItemInFolder Env.configPath }
      { type: "separator" }
      { role: if Env.isMac then "close" else "quit" }
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
      { label: "Find", accelerator: "CmdOrCtrl+F", click: ()-> IPC.toFocusedWindow "find" }
      { type: "separator" }
    ]

  template.push
    label: "View"
    submenu: [
      ...(if Env.isDev then [
        { role: "reload" }
        { role: "forceReload" }
        { role: "toggleDevTools" }
        { type: "separator" }
      ] else [])
      { role: "togglefullscreen" }
    ]

  template.push
    role: "windowMenu"
    submenu: [
      { role: "minimize" }
      { role: "zoom" }
      ...(if Env.isMac then [
        { type: "separator" }
        { role: "front" }
      ] else [
        { role: "close" }
      ])
      { type: "separator" }
      { label: "Show Debug Log", accelerator: "CmdOrCtrl+Shift+D", click: Window.open.db }
    ]

  template.push
    role: "help"
    submenu: [
      { label: "Report a Problem or Feature Request…", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues/new" }
      { label: "All Open Issues", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues" }
      { label: "Beep for Good Luck", click: ()-> shell.beep() }
    ]

  Make "Menu", setup: ()->
    Menu.setApplicationMenu Menu.buildFromTemplate template

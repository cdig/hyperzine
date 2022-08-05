Take ["Env", "IPC", "Window"], (Env, IPC, Window)->
  { app, Menu, shell } = require "electron"

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
      { label: "New Asset", accelerator: "CmdOrCtrl+N", click: ()-> Take("DB")?.send "New Asset" }
      { label: "New Browser Window", accelerator: "CmdOrCtrl+Shift+N", click: Window.open.browser }
      { type: "separator" }
      { label: "Show Config File", click: ()-> shell.showItemInFolder Env.configPath }
      { type: "separator" }
      ...(if Env.isDev then [
        { label: "Rebuild All Thumbnails", click: ()-> Take("DB")?.send "Rebuild All Thumbnails" }
      ] else [])
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
      ...(if !Env.isMac then [
        { type: "separator" }
        { label: "Settings", accelerator: "CmdOrCtrl+,", click: Window.open.setupAssistant }
      ] else [])
    ]

  template.push
    label: "View"
    submenu: [
      ...(if Env.isDev or !Env.isMac then [
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
      ...(if !Env.isMac then [
        { role: "about" }
        { type: "separator" }
      ] else [])
      { label: "Hyperzine Guide", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/wiki/Hyperzine-Guide" }
      { type: "separator" }
      { label: "Report a Problem or Feature Request…", click: ()-> shell.openExternal "https://github.com/cdig/hyperzine/issues/new" }
      { label: "Beep for Good Luck", click: ()-> shell.beep() }
    ]

  Make "Menu", setup: ()->
    Menu.setApplicationMenu Menu.buildFromTemplate template

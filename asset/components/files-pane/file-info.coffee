Take ["DB", "DOOM", "EditableField", "HoldToRun", "Log", "Paths", "State", "Validations"], (DB, DOOM, EditableField, HoldToRun, Log, Paths, State, Validations)->
  { shell } = require "electron"

  Make.async "FileInfo", FileInfo = (parent, file)->

    info = DOOM.create "div", parent, class: "info"

    fileName = DOOM.create "div", info, class: "name"
    field = DOOM.create "div", fileName, class: "basic-field", textContent: file.name
    EditableField field, renameFile(file), validate: Validations.file

    tools = DOOM.create "div", info, class: "tools"
    meta = DOOM.create "div", info, class: "meta"

    show = DOOM.create "div", tools, class: "tool"
    DOOM.create "svg", show,
      class: "icon buttonish"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-file'></use>"
      click: ()-> shell.showItemInFolder file.path

    remove = DOOM.create "div", tools, class: "tool"
    DOOM.create "svg", remove,
      class: "icon"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-ex'></use>"
    HoldToRun remove, 400, deleteFile file

    if file.ext? and not Paths.ext.icon[file.ext]
      setThumbnailElm = DOOM.create "div", tools, class: "tool"
      parent._setThumbnailSvg = DOOM.create "svg", setThumbnailElm,
        class: "icon"
        viewBox: "0 0 200 200"
        innerHTML: "<use xlink:href='#i-eye'></use>"
        click: setThumbnail file

    if file.count?
      DOOM.create "span", meta, textContent: file.count + " Items"


  FileInfo.update = (asset, file, elm)->
    if elm._setThumbnailSvg?
      DOOM elm._setThumbnailSvg, isShot: if asset.newShot is file.name then "" else null


  deleteFile = (file)-> ()->
    if asset = State "asset"
      DB.send "Delete File", asset.id, file.relpath

  renameFile = (file)-> (v)->
    if asset = State "asset"
      DB.send "Rename File", asset.id, file.relpath, v

  setThumbnail = (file)-> ()->
    if asset = State "asset"
      DB.send "Set Thumbnail", asset.id, file.relpath

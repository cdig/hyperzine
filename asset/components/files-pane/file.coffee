Take ["DB", "DOOM", "HoldToRun", "IPC", "Log", "EditableField", "OnScreen", "Paths", "PubSub", "Read", "State", "Validations", "Write", "DOMContentLoaded"], (DB, DOOM, HoldToRun, IPC, Log, EditableField, OnScreen, Paths, {Pub}, Read, State, Validations, Write)->
  { shell } = require "electron"

  loadThumbnail = (thumbnail, file, meta)->

    if file.count?
      img = DOOM.create "no-img", thumbnail, class: "icon"
      DOOM.create "span", img, textContent: if thumbnail._show_children then "📂" else "📁"
      DOOM.create "span", meta, textContent: file.count + " Items"

    else if Paths.ext.video[file.ext]?
      img = DOOM.create "video", thumbnail,
        autoplay: ""
        muted: ""
        controls: ""
        controlslist: "nodownload nofullscreen noremoteplayback"
        disablepictureinpicture: ""
        disableremoteplayback: ""
        loop: ""
        src: file.path

      img.addEventListener "loadedmetadata", ()->
        img.muted = true # It seems the attr isn't working, so we gotta do this
        if img.duration
          makeBubble meta, "Length", Math.round(img.duration) + "s"

    else if Paths.ext.icon[file.ext]?
      loadIcon file, img = DOOM.create "img"

    else if asset = State "asset"
      size = 256
      thumbName = Paths.thumbnailName file, size
      src = Paths.thumbnail asset, thumbName
      img = DOOM.create "img", null, src: src

      img.addEventListener "error", ()->
        src = await DB.send "create-file-thumbnail", asset.id, file.path, size, thumbName
        if src
          DOOM img, src: null # gotta clear it first or DOOM's cache will defeat the following
          DOOM img, {src}
        else
          loadIcon file, img

    thumbnail.replaceChildren img if img?


  loadIcon = (file, img)->
    src = await IPC.invoke "get-file-icon", file.path
    DOOM img, {src, class: "icon"}


  # unloadThumbnail = (thumbnail)->
  #   thumbnail.replaceChildren()


  onscreen = (file, meta)-> (thumbnail, visible)->
    # thumbnail._visible = visible
    if visible and not thumbnail._loaded
      thumbnail._loaded = true
      loadThumbnail thumbnail, file, meta
    # else
    #   unloadThumbnail thumbnail

  deleteFile = (file)-> ()->
    if asset = State "asset"
      DB.send "Delete File", asset.id, file.relpath

  renameFile = (file)-> (v)->
    if asset = State "asset"
      DB.send "Rename File", asset.id, file.relpath, v

  setThumbnail = (file)-> ()->
    if asset = State "asset"
      DB.send "Set Thumbnail", asset.id, file.relpath

  Make.async "File", File = (file, depth)->
    elm = DOOM.create "div", null, class: "file"

    thumbnail = DOOM.create "div", elm,
      class: "thumbnail"
      draggable: "true"
      marginLeft: 2 * depth + "em"

    thumbnail.ondragstart = (e)->
      e.preventDefault()
      IPC.send "drag-file", file.path

    if file.count
      elm._show_children = false
      thumbnail.onclick = ()->
        elm._show_children = !elm._show_children
        Pub "Render"

    info = DOOM.create "div", elm, class: "info"

    fileName = DOOM.create "div", info, class: "name basic-field", textContent: file.name
    EditableField fileName, renameFile(file), validate: Validations.file

    tools = DOOM.create "div", info, class: "tools"
    meta = DOOM.create "div", info, class: "meta"

    show = DOOM.create "div", tools
    DOOM.create "svg", show,
      class: "icon buttonish"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-arrow' transform='rotate(90)' transform-origin='100 100'></use>"
      click: ()-> shell.showItemInFolder file.path

    remove = DOOM.create "div", tools
    DOOM.create "svg", remove,
      class: "icon"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-ex'></use>"

    if file.ext? and not Paths.ext.icon[file.ext]
      thumb = DOOM.create "div", tools
      elm._thumbSvg = DOOM.create "svg", thumb,
        class: "icon"
        viewBox: "0 0 200 200"
        innerHTML: "<use xlink:href='#i-eye'></use>"
        click: setThumbnail file

    HoldToRun remove, 400, deleteFile file

    OnScreen thumbnail, onscreen file, meta

    elm

  File.update = (asset, file, elm)->
    if elm._thumbSvg?
      DOOM elm._thumbSvg, isShot: if asset.newShot is file.name then "" else null

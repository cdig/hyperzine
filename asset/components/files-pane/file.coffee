Take ["DB", "DOOM", "HoldToRun", "IPC", "Log", "EditableField", "OnScreen", "PubSub", "Read", "Validations", "Write", "DOMContentLoaded"], (DB, DOOM, HoldToRun, IPC, Log, EditableField, OnScreen, {Pub}, Read, Validations, Write)->
  { nativeImage, shell } = require "electron"

  isVideo = (file)->
    name = file.name.toLowerCase()
    for ext in ["avchd", "avi", "m4p", "m4v", "mov", "mp2", "mp4", "mpe", "mpeg", "mpg", "mpv", "ogg", "qt", "webm", "wmv"]
      return true if name.endsWith ext
    false

  loadThumbnail = (thumbnail, file, meta)->
    filePath = file.path
    type = null

    if file.count?
      type = "folder"
      img = DOOM.create "no-img", thumbnail, class: "icon"
      DOOM.create "span", img, textContent: "📁"
      DOOM.create "span", meta, textContent: file.count + " Items"

    else if isVideo file
      type = "video"

      img = DOOM.create "video", thumbnail,
        autoplay: ""
        muted: ""
        controls: ""
        controlslist: "nodownload nofullscreen noremoteplayback"
        disablepictureinpicture: ""
        disableremoteplayback: ""
        loop: ""
        src: filePath

      img.addEventListener "loadedmetadata", ()->
        img.muted = true # It seems the attr isn't working, so we gotta do this
        if img.duration
          makeBubble meta, "Length", Math.round(img.duration) + "s"

    else
      loading = DOOM.create "no-img", thumbnail, class: "loading", innerHTML: "<span>•••</span>"
      src = await DB.send "create-thumbnail", file.path, 256

      if src
        img = DOOM.create "img", null, src: src
      else
        src = await IPC.invoke "get-file-icon", file.path
        img = DOOM.create "img", null, src: src, class: "icon"

      thumbnail.replaceChildren img


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
    Write.sync.rm file.path

  renameFile = (file)-> (v)->
    Write.sync.rename file.path, v

  Make "File", (file, depth)->
    elm = DOOM.create "div", null,
      class: "file"
      paddingLeft: 5 * depth + "em"

    thumbnail = DOOM.create "div", elm,
      class: "thumbnail"
      draggable: "true"

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

    HoldToRun remove, 400, deleteFile file

    OnScreen thumbnail, onscreen file, meta

    elm

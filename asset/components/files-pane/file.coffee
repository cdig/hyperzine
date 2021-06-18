Take ["DB", "DOOM", "IPC", "Log", "OnScreen", "PubSub", "DOMContentLoaded"], (DB, DOOM, IPC, Log, OnScreen, {Pub})->
  { nativeImage, shell } = require "electron"

  isImage = (file)->
    name = file.name.toLowerCase()
    for ext in ["jpg","jpeg","png","gif"]
      return true if name.endsWith ext
    false

  isVideo = (file)->
    name = file.name.toLowerCase()
    for ext in ["webm","mpg","mp2","mpeg","mpe","mpv","ogg","mp4","m4p","m4v","avi","wmv","mov","qt","avchd"]
      return true if name.endsWith ext
    false

  loadThumbnail = (thumbnail, file, meta)->
    filePath = file.path
    type = null

    if file.count?
      type = "folder"
      img = DOOM.create "no-img", thumbnail
      DOOM.create "span", img, textContent: "📁"
      makeBubble meta, file.count + " Items"

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
      loading = DOOM.create "div", thumbnail, class: "loading", textContent: "Loading"
      src = await DB.send "create-thumbnail", file.path, 512
      src ?= await IPC.invoke "get-file-icon", file.path
      img = DOOM.create "img", null, src: src
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


  makeBubble = (elm, label, value)->
    b = DOOM.create "div", elm, class: "bubble", textContent: label or ""
    DOOM.create "span", b, textContent: value or ""
    b


  Make "File", (file, depth)->
    elm = DOOM.create "div", null,
      class: "file"
      marginLeft: "#{depth+1}em"

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

    DOOM.create "div", info, class: "name", textContent: file.name

    meta = DOOM.create "div", info, class: "meta"
    tools = DOOM.create "div", info, class: "tools"

    show = DOOM.create "svg", tools,
      class: "icon"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-eye'></use>"
      click: ()-> shell.showItemInFolder file.path

    remove = DOOM.create "svg", tools,
      class: "icon"
      viewBox: "0 0 200 200"
      innerHTML: "<use xlink:href='#i-ex'></use>"
      disabled: ""

    OnScreen thumbnail, onscreen file, meta

    elm

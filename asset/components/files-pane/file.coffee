Take ["DB", "DOOM", "IPC", "Log", "OnScreen", "DOMContentLoaded"], (DB, DOOM, IPC, Log, OnScreen)->
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
    # else if isImage file
    #   type = "image"
    #   img = DOOM.create "img", thumbnail, src: filePath
    else if isVideo file
      type = "video"
      img = DOOM.create "video", thumbnail,
        autoplay: ""
        muted: ""
        loop: ""
        src: filePath
    else
      loading = DOOM.create "div", thumbnail, class: "loading", textContent: "Loading"
      src = await DB.send "create-thumbnail", file.path, 512
      src ?= await IPC.invoke "get-file-icon", file.path
      img = DOOM.create "img", null, src: src
      thumbnail.replaceChildren img

      # .then (image)->
      #   type = "nativeImage"
      #
      # .catch ()->
      #   if file.name.indexOf(".") > 0
      #     type = "document"
      #     name = Array.last file.name.toUpperCase().split(".")
      #   else
      #     type = "unknown"
      #     name = ""
      #   img = DOOM.create "no-img", null
      #   DOOM.create "span", img, textContent: name
      # .finally ()->
      #   # return unless thumbnail._visible
      #

    # switch type
    #   when "video"
    #     img.addEventListener "loadedmetadata", ()->
    #       img.muted = true # It seems the attr isn't working, so we gotta do this
    #       if img.duration
    #         makeBubble meta, Math.round(img.duration) + "s"
    #   when "folder"
    #     makeBubble meta, file.count + " Items"


  # unloadThumbnail = (thumbnail)->
  #   thumbnail.replaceChildren()


  onscreen = (file, meta)-> (thumbnail, visible)->
    # thumbnail._visible = visible
    if visible and not thumbnail._loaded
      thumbnail._loaded = true
      loadThumbnail thumbnail, file, meta
    # else
    #   unloadThumbnail thumbnail


  makeBubble = (elm, text)->
    b = DOOM.create "div", elm, class: "bubble"
    DOOM.create "span", b, textContent: text
    b


  Make "File", (file, depth)->
    elm = DOOM.create "div", null,
      class: "file"
      marginLeft: "#{depth+1}em"
      draggable: "true"

    thumbnail = DOOM.create "div", elm, class: "thumbnail"

    OnScreen thumbnail, onscreen file, meta

    thumbnail.ondragstart = (e)->
      e.preventDefault()
      IPC.send "drag-file", file.path

    info = DOOM.create "div", elm, class: "info"

    DOOM.create "div", info, class: "name", textContent: file.name

    meta = DOOM.create "div", info, class: "meta"

    show = DOOM.create "div", meta,
      class: "i-eye"
      click: ()-> shell.showItemInFolder file.path

    elm

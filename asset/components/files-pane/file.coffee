Take ["DB", "DOOM", "HoldToRun", "IPC", "Log", "EditableField", "OnScreen", "Paths", "PubSub", "Read", "State", "Validations", "Write", "DOMContentLoaded"], (DB, DOOM, HoldToRun, IPC, Log, EditableField, OnScreen, Paths, {Pub}, Read, State, Validations, Write)->
  { shell } = require "electron"

  loadThumbnail = (thumbnail, file, meta)->

    if file.count?
      img = DOOM.create "no-img", null, class: "icon"
      DOOM.create "span", img, textContent: if DOOM(thumbnail.parentElement, "showChildren")? then "📂" else "📁"
      thumbnail.replaceChildren img
      return

    # Show an icon while we wait for the image to be ready
    await loadIcon file, thumbnail

    if Paths.ext.video[file.ext]?
      img = DOOM.create "video", null,
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
          meta._duration ?= DOOM.create "span", meta
          DOOM meta._duration, textContent: Math.round(img.duration) + "s"
        else
          DOOM.remove meta._duration
          delete meta._duration
        thumbnail.replaceChildren img

    else if Paths.ext.icon[file.ext]?
      # Just use the icon

    else if asset = State "asset"
      thumbName = Paths.thumbnailName file, 256
      img = DOOM.create "img", null, src: Paths.thumbnail asset, thumbName
      img.onerror = ()->
        src = await DB.send "create-file-thumbnail", asset.id, file.path, 256, thumbName
        if src
          DOOM img, src: null # gotta clear it first or DOOM's cache will defeat the following
          DOOM img, src: src
          delete img.onerror # Prevent repeat failures if the src path is valid but the thumbnail is not
      img.onload = ()-> thumbnail.replaceChildren img


  loadIcon = (file, thumbnail)->
    thumbnail.replaceChildren DOOM.create "img", null,
      class: "icon"
      src: await IPC.invoke "get-file-icon", file.path


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
    elm = DOOM.create "div", null,
      class: if file.count then "file folder" else "file"

    thumbnail = DOOM.create "div", elm,
      class: "thumbnail"
      draggable: "true"
      marginLeft: 2 * depth + "em"

    thumbnail.ondragstart = (e)->
      e.preventDefault()
      IPC.send "drag-file", file.path

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

    if file.count
      DOOM.create "span", meta, textContent: file.count + " Items"
      thumbnail.onclick = ()->
        DOOM elm, showChildren: if DOOM(elm, "showChildren")? then null else ""
        loadThumbnail thumbnail, file # This doesn't seem to update on Render, so just do it manually
        Pub "Render"

      # I don't think this works?
      # cb = ([e])->
      #   console.log  e.intersectionRatio < 1
      #   e.target.toggleAttribute "is-stuck", e.intersectionRatio < 1
      # observer = new IntersectionObserver cb, threshold: [1]
      # observer.observe elm


    HoldToRun remove, 400, deleteFile file

    OnScreen thumbnail, onscreen file, meta

    elm

  File.update = (asset, file, elm)->
    if elm._thumbSvg?
      DOOM elm._thumbSvg, isShot: if asset.newShot is file.name then "" else null

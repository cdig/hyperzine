Take ["DB", "DOOM", "HoldToRun", "IPC", "Log", "EditableField", "OnScreen", "Paths", "PubSub", "Read", "State", "Validations", "Write", "DOMContentLoaded"], (DB, DOOM, HoldToRun, IPC, Log, EditableField, OnScreen, Paths, {Pub}, Read, State, Validations, Write)->

  Make.async "FileThumbnail", (parent, file)->
    elm = DOOM.create "div", parent,
      class: "thumbnail"
      draggable: "true"

    elm.ondragstart = (e)->
      e.preventDefault()
      IPC.send "drag-file", file.path

    if file.count?
      elm.onclick = (e)->
        State.update "fileList.#{file.relpath}.showChildren", (v)-> !v
        # show = if DOOM(elm, "showChildren")? then null else ""
        # DOOM elm, showChildren: show
        # makeThumbnail elm, file # This doesn't seem to update on Render, so just do it manually
        # Pub "Render"

    # When the thumbnail first appears on screen, build its graphic
    OnScreen elm, onscreen file


  onscreen = (file)-> (thumbnail, visible)->
    return unless visible

    # We only need to do this setup step the first time the thumbnail becomes visible
    OnScreen.off thumbnail

    # Create the right kind of graphic for this type of file
    fn = switch
      when file.count? then makeFolderGraphic
      when Paths.ext.video[file.ext]? then makeVideoGraphic
      when Paths.ext.icon[file.ext]? then makeIconGraphic
      else makeImageGraphic
    fn thumbnail, file


  makeFolderGraphic = (thumbnail, file)->
    thumbnail.replaceChildren DOOM.create "div", null,
      class: "emoji"
      innerHTML: "<span class='open'>📂</span><span class='closed'>📁</span>"


  makeVideoGraphic = (thumbnail, file)->
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
      # We need a way to put the duration into State, and add a hook over in FileInfo that'll pick up on this info and re-render itself
      # if img.duration
      #   meta._duration ?= DOOM.create "span", meta
      #   DOOM meta._duration, textContent: Math.round(img.duration) + "s"
      # else
      #   DOOM.remove meta._duration
      #   delete meta._duration
      thumbnail.replaceChildren img


  makeImageGraphic = (thumbnail, file)->
    asset = State "asset"
    thumbName = Paths.thumbnailName file, 256
    img = DOOM.create "img", null, src: Paths.thumbnail asset, thumbName
    img.onerror = ()->
      # There'll be a short delay before the thumbnail is ready, especially if we're creating a bunch of
      # file thumbnails all at once. So, we'll quickly show an icon as a placeholder in the meantime.
      await makeIconGraphic thumbnail, file
      src = await DB.send "create-file-thumbnail", asset.id, file.path, 256, thumbName
      if src
        # Prevent repeat failures if the src path is valid but the thumbnail is not
        img.onerror = ()-> makeErrorGraphic thumbnail, file
        DOOM img, src: null # gotta clear it first or DOOM's cache will defeat the following
        DOOM img, src: src
    img.onload = ()-> thumbnail.replaceChildren img


  makeIconGraphic = (thumbnail, file)->
    thumbnail.replaceChildren DOOM.create "img", null,
      class: "icon"
      src: await IPC.invoke "get-file-icon", file.path


  makeErrorGraphic = (thumbnail, file)->
    thumbnail.replaceChildren DOOM.create "div", null, class: "emoji", textContent: "⚠️"

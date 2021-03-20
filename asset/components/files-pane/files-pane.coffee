{ nativeImage } = require "electron"

Take ["DOOM", "Paths", "State", "DOMContentLoaded"], (DOOM, Paths, State)->

  filesToolbar = document.querySelector "tool-bar"
  fileCount = filesToolbar.querySelector "[file-count]"
  searchBox = filesToolbar.querySelector "search-box"

  filesPane = document.querySelector "files-pane"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

  isImage = (file)->
    file = file.toLowerCase()
    for ext in ["jpg","jpeg","png","gif"]
      return true if file.endsWith ext
    false

  isVideo = (file)->
    file = file.toLowerCase()
    for ext in ["webm","mpg","mp2","mpeg","mpe","mpv","ogg","mp4","m4p","m4v","avi","wmv","mov","qt","avchd"]
      return true if file.endsWith ext
    false

  makeFileElm = (file)->

    elm = DOOM.create "div", fileList, class: "file"

    if isImage file
      img = DOOM.create "img", elm, src: Paths.file State.asset, file
    else if isVideo file
      img = DOOM.create "video", elm,
        autoplay: ""
        muted: ""
        loop: ""
        src: Paths.file State.asset, file
    else
      loading = DOOM.create "div", elm, class: "loading"
      try
        nativeImage.createThumbnailFromPath Paths.file(State.asset, file), {width: 320, height: 320}
          .then (image)->
            img = DOOM.create "img", null, src: image.toDataURL()
            DOOM.remove loading
            DOOM.prepend elm, img
      catch
        img = DOOM.create "no-img", assetImage, textContent: Frustration()

    info = DOOM.create "div", elm, class: "info"

    DOOM.create "div", info, class: "name", textContent: file

    meta = DOOM.create "div", info

    if isVideo file
      img.addEventListener "loadedmetadata", ()->
        img.muted = true # It seems the attr isn't working, so we gotta do this
        if img.duration
          b = DOOM.create "div", meta, class: "bubble"
          DOOM.create "span", b, textContent: Math.round(img.duration) + "s"

    elm


  fileSort = (a, b)-> a.localeCompare b


  Make "FilesPane", FilesPane =
    render: ()->

      DOOM fileCount, textContent: String.pluralize State.asset.files.length, "%% File"

      for file in State.asset.files.sort fileSort
        fileElm = fileElms[file] ?= makeFileElm file

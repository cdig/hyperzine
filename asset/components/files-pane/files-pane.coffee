{ nativeImage, shell } = require "electron"
Take ["DOOM", "Paths", "State", "DOMContentLoaded"], (DOOM, Paths, State)->

  filesToolbar = document.querySelector "tool-bar"
  fileCount = filesToolbar.querySelector "[file-count]"
  searchBox = filesToolbar.querySelector "search-box"

  filesPane = document.querySelector "files-pane"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

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

  makeBubble = (elm, text)->
    b = DOOM.create "div", elm, class: "bubble"
    DOOM.create "span", b, textContent: text
    b


  makeFileElm = (file, depth)->
    elm = DOOM.create "div", fileList,
      class: "file"
      marginLeft: "#{depth+1}em"

    elm.addEventListener "click", ()-> shell.showItemInFolder file.path

    filePath = file.path
    type = null

    if file.count?
      type = "folder"
      img = DOOM.create "no-img", elm, textContent: "📁"
    else if isImage file
      type = "image"
      img = DOOM.create "img", elm, src: filePath
    else if isVideo file
      type = "video"
      img = DOOM.create "video", elm,
        autoplay: ""
        muted: ""
        loop: ""
        src: filePath
    else
      loading = DOOM.create "div", elm, class: "loading"
      nativeImage.createThumbnailFromPath filePath, {width: 320, height: 320}
        .then (image)->
          type = "nativeImage"
          img = DOOM.create "img", null, src: image.toDataURL()
        .catch ()->
          if file.name.indexOf(".") > 0
            type = "document"
            name = Array.last file.name.toUpperCase().split(".")
          else
            type = "unknown"
            name = ""
          img = DOOM.create "no-img", null, textContent: name
        .finally ()->
          DOOM.remove loading
          DOOM.prepend elm, img

    info = DOOM.create "div", elm, class: "info"

    DOOM.create "div", info, class: "name", textContent: file.name

    meta = DOOM.create "div", info

    switch type
      when "video"
        img.addEventListener "loadedmetadata", ()->
          img.muted = true # It seems the attr isn't working, so we gotta do this
          if img.duration
            makeBubble meta, Math.round(img.duration) + "s"
      when "folder"
        makeBubble meta, file.count + " Items"

    elm


  fileSort = (a, b)-> a.name.localeCompare b.name

  makeFileElms = (tree, depth = 0)->
    for child in tree.children.sort fileSort
      fileElm = fileElms[child.name] ?= makeFileElm child, depth
      if child.children? and depth < 1
        makeFileElms child, depth+1
    null



  Make "FilesPane", FilesPane =
    render: ()->

      DOOM fileCount, textContent: String.pluralize State("asset").files.count, "%% File"

      makeFileElms State("asset").files

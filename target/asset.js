// asset/asset.coffee
var indexOf = [].indexOf;

Take(["IPC", "Log", "Memory", "PubSub", "Render", "State"], async function(IPC, Log, Memory, {Sub}, Render, State) {
  var assetId;
  assetId = (await IPC.invoke("whats-my-asset"));
  Memory.subscribe(`assets.${assetId}`, true, function(asset) {
    if (asset != null ? asset._loading : void 0) { // Don't show stale data while initially re-loading a cached asset
      return;
    }
    if (asset != null) {
      State("asset", asset);
      Render();
    } else {

    }
    // When the asset is null, we don't clear the old asset data out of State,
    // because that might cause some tricky undefined property errors given
    // how much asynchronous stuff we do (like thumbnails).
    // It's fine to just keep the stale asset data around and alter the UI.
    return DOOM(document.body, {
      noData: asset != null ? null : ""
    });
  });
  Memory.subscribe(`assets.${assetId}.name`, true, function(name) {
    if (name != null) {
      return IPC.send("set-window-title", name);
    }
  });
  return Sub("Render", Render);
});

// asset/coffee/render.coffee
Take(["ArchivedStyle", "FileList", "FileTools", "MetaPane", "MetaTools", "State", "DOMContentLoaded"], function(ArchivedStyle, FileList, FileTools, MetaPane, MetaTools, State) {
  var Render;
  return Make("Render", Render = function() {
    if (!State("asset")) {
      return;
    }
    ArchivedStyle.render();
    FileList.render();
    FileTools.render();
    MetaTools.render();
    return MetaPane.render();
  });
});

// asset/components/archived-style.coffee
Take(["DOOM", "State"], function(DOOM, State) {
  var ArchivedStyle;
  return Make("ArchivedStyle", ArchivedStyle = {
    render: function() {
      var asset, isArchived;
      asset = State("asset");
      isArchived = ((asset != null ? asset.tags : void 0) != null) && (indexOf.call(asset.tags, "Archived") >= 0);
      State("archived", isArchived);
      return DOOM(document.documentElement, {
        isArchived: isArchived ? "" : null
      });
    }
  });
});

// asset/components/files-pane/file-info.coffee
Take(["DB", "DOOM", "EditableField", "HoldToRun", "Log", "Paths", "State", "Validations", "DOMContentLoaded"], function(DB, DOOM, EditableField, HoldToRun, Log, Paths, State, Validations) {
  var FileInfo, deleteFile, renameFile, setThumbnail, shell;
  ({shell} = require("electron"));
  Make.async("FileInfo", FileInfo = function(parent, file) {
    var field, fileName, info, meta, remove, setThumbnailElm, show, tools;
    info = DOOM.create("div", parent, {
      class: "info"
    });
    fileName = DOOM.create("div", info, {
      class: "name"
    });
    field = DOOM.create("div", fileName, {
      class: "basic-field",
      textContent: file.name
    });
    EditableField(field, renameFile(file), {
      validate: Validations.file
    });
    tools = DOOM.create("div", info, {
      class: "tools"
    });
    meta = DOOM.create("div", info, {
      class: "meta"
    });
    show = DOOM.create("div", tools, {
      class: "tool"
    });
    DOOM.create("svg", show, {
      class: "icon buttonish",
      viewBox: "0 0 200 200",
      innerHTML: "<use xlink:href='#i-file'></use>",
      click: function() {
        return shell.showItemInFolder(file.path);
      }
    });
    remove = DOOM.create("div", tools, {
      class: "tool"
    });
    DOOM.create("svg", remove, {
      class: "icon",
      viewBox: "0 0 200 200",
      innerHTML: "<use xlink:href='#i-ex'></use>"
    });
    HoldToRun(remove, 400, deleteFile(file));
    if ((file.ext != null) && !Paths.ext.icon[file.ext]) {
      setThumbnailElm = DOOM.create("div", tools, {
        class: "tool"
      });
      parent._setThumbnailSvg = DOOM.create("svg", setThumbnailElm, {
        class: "icon",
        viewBox: "0 0 200 200",
        innerHTML: "<use xlink:href='#i-eye'></use>",
        click: setThumbnail(file)
      });
    }
    if (file.count != null) {
      return DOOM.create("span", meta, {
        textContent: file.count + " Items"
      });
    }
  });
  FileInfo.update = function(asset, file, elm) {
    if (elm._setThumbnailSvg != null) {
      return DOOM(elm._setThumbnailSvg, {
        isShot: asset.newShot === file.name ? "" : null
      });
    }
  };
  deleteFile = function(file) {
    return function() {
      var asset;
      if (asset = State("asset")) {
        return DB.send("Delete File", asset.id, file.relpath);
      }
    };
  };
  renameFile = function(file) {
    return function(v) {
      var asset;
      if (asset = State("asset")) {
        return DB.send("Rename File", asset.id, file.relpath, v);
      }
    };
  };
  return setThumbnail = function(file) {
    return function() {
      var asset;
      if (asset = State("asset")) {
        return DB.send("Set Thumbnail", asset.id, file.relpath);
      }
    };
  };
});

// asset/components/files-pane/file-list.coffee
Take(["DOOM", "File", "State", "DOMContentLoaded"], function(DOOM, File, State) {
  var FileList, fileElms, fileList, makeTreeElm, toggle;
  fileList = document.querySelector("file-list");
  fileElms = {};
  Make.async("FileList", FileList = {
    render: function() {
      var asset, file, frag, j, len, ref, ref1, search;
      if (!(asset = State("asset"))) {
        return;
      }
      frag = new DocumentFragment();
      search = (ref = State("search")) != null ? ref.toLowerCase() : void 0;
      ref1 = asset.files.children;
      for (j = 0, len = ref1.length; j < len; j++) {
        file = ref1[j];
        makeTreeElm(asset, file, frag, search);
      }
      return fileList.replaceChildren(frag);
    }
  });
  makeTreeElm = function(asset, tree, parent, search, depth = 0) {
    var child, childIsVisible, childrenElm, fileElm, hasVisibleContents, isVisible, j, len, matchesSearch, name1, noSearch, ref, treeElm;
    treeElm = DOOM.create("div", parent, {
      class: "tree"
    });
    // We want to cache and reuse File elms because they need to load thumbnails, and that's async.
    fileElm = fileElms[name1 = tree.relpath] != null ? fileElms[name1] : fileElms[name1] = File(tree);
    File.update(asset, tree, fileElm);
    treeElm.appendChild(fileElm);
    noSearch = (search == null) || (search.length <= 0);
    matchesSearch = tree.name.toLowerCase().search(search) >= 0;
    hasVisibleContents = false;
    if (tree.children != null) {
      childrenElm = DOOM.create("div", treeElm, {
        class: "children"
      });
      ref = tree.children;
      for (j = 0, len = ref.length; j < len; j++) {
        child = ref[j];
        childIsVisible = makeTreeElm(asset, child, childrenElm, search, depth + 1);
        if (childIsVisible) {
          hasVisibleContents = true;
        }
      }
      if (hasVisibleContents) {
        toggle(treeElm, childrenElm)(true);
      }
      State.subscribe(`fileList.${tree.relpath}.showChildren`, toggle(treeElm, childrenElm));
    }
    isVisible = noSearch || matchesSearch || hasVisibleContents;
    DOOM(treeElm, {
      display: isVisible ? "block" : "none"
    });
    return isVisible;
  };
  return toggle = function(treeElm, childrenElm) {
    return function(showChildren) {
      var v;
      v = showChildren ? "" : null;
      return DOOM(treeElm, {
        showChildren: v
      });
    };
  };
});

// asset/components/files-pane/file-thumbnail.coffee
Take(["DB", "DOOM", "HoldToRun", "IPC", "Log", "EditableField", "OnScreen", "Paths", "PubSub", "Read", "State", "Validations", "Write", "DOMContentLoaded"], function(DB, DOOM, HoldToRun, IPC, Log, EditableField, OnScreen, Paths, {Pub}, Read, State, Validations, Write) {
  var makeErrorGraphic, makeFolderGraphic, makeIconGraphic, makeImageGraphic, makeVideoGraphic, onscreen;
  Make.async("FileThumbnail", function(parent, file) {
    var elm;
    elm = DOOM.create("div", parent, {
      class: "thumbnail",
      draggable: "true"
    });
    elm.ondragstart = function(e) {
      e.preventDefault();
      return IPC.send("drag-file", file.path);
    };
    elm.onclick = function(e) {
      if (file.count != null) {
        return State.update(`fileList.${file.relpath}.showChildren`, function(v) {
          return !v;
        });
      } else {
        // show = if DOOM(elm, "showChildren")? then null else ""
        // DOOM elm, showChildren: show
        // makeThumbnail elm, file # This doesn't seem to update on Render, so just do it manually
        // Pub "Render"
        return IPC.send("preview-file", file.path);
      }
    };
    // When the thumbnail first appears on screen, build its graphic
    return OnScreen(elm, onscreen(file));
  });
  onscreen = function(file) {
    return function(thumbnail, visible) {
      var fn;
      if (!visible) {
        return;
      }
      // We only need to do this setup step the first time the thumbnail becomes visible
      OnScreen.off(thumbnail);
      // Create the right kind of graphic for this type of file
      fn = (function() {
        switch (false) {
          case file.count == null:
            return makeFolderGraphic;
          case Paths.ext.video[file.ext] == null:
            return makeVideoGraphic;
          case Paths.ext.icon[file.ext] == null:
            return makeIconGraphic;
          default:
            return makeImageGraphic;
        }
      })();
      return fn(thumbnail, file);
    };
  };
  makeFolderGraphic = function(thumbnail, file) {
    return thumbnail.replaceChildren(DOOM.create("div", null, {
      class: "emoji",
      innerHTML: "<span class='open'>📂</span><span class='closed'>📁</span>"
    }));
  };
  makeVideoGraphic = function(thumbnail, file) {
    var img;
    img = DOOM.create("video", null, {
      autoplay: "",
      muted: "",
      controls: "",
      controlslist: "nodownload nofullscreen noremoteplayback",
      disablepictureinpicture: "",
      disableremoteplayback: "",
      loop: "",
      src: file.path
    });
    return img.addEventListener("loadedmetadata", function() {
      img.muted = true; // It seems the attr isn't working, so we gotta do this
      // We need a way to put the duration into State, and add a hook over in FileInfo that'll pick up on this info and re-render itself
      // if img.duration
      //   meta._duration ?= DOOM.create "span", meta
      //   DOOM meta._duration, textContent: Math.round(img.duration) + "s"
      // else
      //   DOOM.remove meta._duration
      //   delete meta._duration
      return thumbnail.replaceChildren(img);
    });
  };
  makeImageGraphic = function(thumbnail, file) {
    var asset, img, thumbName;
    asset = State("asset");
    thumbName = Paths.thumbnailName(file, 256);
    img = DOOM.create("img", null, {
      src: Paths.thumbnail(asset, thumbName)
    });
    img.onerror = async function() {
      var src;
      // There'll be a short delay before the thumbnail is ready, especially if we're creating a bunch of
      // file thumbnails all at once. So, we'll quickly show an icon as a placeholder in the meantime.
      await makeIconGraphic(thumbnail, file);
      src = (await DB.send("create-file-thumbnail", asset.id, file.path, 256, thumbName));
      if (src) {
        // Prevent repeat failures if the src path is valid but the thumbnail is not
        img.onerror = function() {
          return makeErrorGraphic(thumbnail, file);
        };
        DOOM(img, {
          src: null // gotta clear it first or DOOM's cache will defeat the following
        });
        return DOOM(img, {
          src: src
        });
      }
    };
    return img.onload = function() {
      return thumbnail.replaceChildren(img);
    };
  };
  makeIconGraphic = async function(thumbnail, file) {
    return thumbnail.replaceChildren(DOOM.create("img", null, {
      class: "icon",
      src: (await IPC.invoke("get-file-icon", file.path))
    }));
  };
  return makeErrorGraphic = function(thumbnail, file) {
    return thumbnail.replaceChildren(DOOM.create("div", null, {
      class: "emoji",
      textContent: "⚠️"
    }));
  };
});

// asset/components/files-pane/file.coffee
Take(["DOOM", "FileInfo", "FileThumbnail", "Log", "DOMContentLoaded"], function(DOOM, FileInfo, FileThumbnail, Log) {
  var File;
  Make.async("File", File = function(file) {
    var elm;
    elm = DOOM.create("div", null, {
      class: file.count != null ? "file folder" : "file"
    });
    FileThumbnail(elm, file);
    FileInfo(elm, file);
    return elm;
  });
  return File.update = FileInfo.update;
});

// asset/components/meta-pane/meta-pane.coffee
Take(["DB", "ADSR", "DOOM", "Memory", "MemoryField", "MetaTools", "Paths", "State", "TagList", "Validations", "DOMContentLoaded"], function(DB, ADSR, DOOM, Memory, MemoryField, MetaTools, Paths, State, TagList, Validations) {
  var MetaPane, addNote, assetHistory, assetName, assetThumbnail, metaPane, removeTag, renameAsset, tagList;
  metaPane = document.querySelector("meta-pane");
  assetThumbnail = metaPane.querySelector("asset-thumbnail");
  assetName = metaPane.querySelector("asset-name");
  addNote = metaPane.querySelector("[add-note]");
  assetHistory = metaPane.querySelector("[asset-history]");
  tagList = metaPane.querySelector("tag-list");
  removeTag = function(tag) {
    var asset;
    asset = State("asset");
    return DB.send("Remove Tag", asset.id, tag);
  };
  renameAsset = ADSR(300, 0, function(v) {
    var asset;
    asset = State("asset");
    return DB.send("Rename Asset", asset.id, v);
  });
  return Make("MetaPane", MetaPane = {
    render: function() {
      var asset, img;
      asset = State("asset");
      tagList.replaceChildren(TagList(asset, {
        removeFn: removeTag
      }));
      MemoryField(`assets.${asset.id}.name`, assetName, {
        validate: Validations.asset.name,
        update: renameAsset
      });
      img = DOOM.create("img", null, {
        src: Paths.thumbnail(asset, `512.jpg?cachebust=${Math.randInt(0, 10000)}`)
      });
      return img.addEventListener("load", function() {
        return assetThumbnail.replaceChildren(img);
      });
    }
  });
});

// asset/components/meta-pane/tag-entry.coffee
Take(["DB", "ADSR", "DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], function(DB, ADSR, DOOM, Memory, Paths, State) {
  var focused, highlightIndex, highlightNext, highlightPrev, input, setValue, suggestionList, update;
  input = document.querySelector("tag-entry input");
  suggestionList = document.querySelector("tag-entry suggestion-list");
  focused = false;
  highlightIndex = 0;
  update = ADSR(1, 1, function() {
    var asset, frag, hasInput, i, j, len, matches, ref, show, tag, truncElm, truncatedMatches, value;
    hasInput = ((ref = input.value) != null ? ref.length : void 0) > 0;
    matches = [];
    if (hasInput) {
      asset = State("asset");
      value = input.value.toLowerCase();
      for (tag in Memory("tags")) {
        if (!tag.toLowerCase().startsWith(value)) {
          continue;
        }
        if (indexOf.call(asset.tags, tag) >= 0) {
          continue;
        }
        matches.push(tag);
      }
      matches = Array.sortAlphabetic(matches);
      truncatedMatches = matches.slice(0, 10);
      frag = new DocumentFragment();
      highlightIndex = (highlightIndex + truncatedMatches.length + 1) % (truncatedMatches.length + 1);
      for (i = j = 0, len = truncatedMatches.length; j < len; i = ++j) {
        tag = truncatedMatches[i];
        (function(tag, i) {
          var tagElm;
          tagElm = DOOM.create("div", frag, {
            rainbowBefore: i + 1 === highlightIndex ? "" : null
          });
          DOOM.create("span", tagElm, {
            textContent: tag
          });
          tagElm.addEventListener("mousemove", function(e) {
            highlightIndex = i + 1;
            return update();
          });
          return tagElm.addEventListener("mousedown", function(e) {
            return setValue(tag);
          });
        })(tag, i);
      }
      if (matches.length > truncatedMatches.length) {
        truncElm = DOOM.create("span", frag, {
          class: "truncated",
          textContent: "…"
        });
      }
      suggestionList.replaceChildren(frag);
    }
    show = focused && hasInput && matches.length > 0;
    suggestionList.style.display = show ? "block" : "none";
    if (!show) {
      return highlightIndex = 0;
    }
  });
  setValue = function(value) {
    var asset;
    if ((value != null ? value.length : void 0) > 0) {
      asset = State("asset");
      DB.send("Add Tag", asset.id, value);
      Memory(`tags.${value}`, value);
      return input.value = "";
    }
  };
  highlightNext = function() {
    highlightIndex++;
    return update();
  };
  highlightPrev = function() {
    highlightIndex--;
    return update();
  };
  input.addEventListener("mousemove", function(e) {
    highlightIndex = 0;
    return update();
  });
  input.addEventListener("focus", function(e) {
    focused = true;
    highlightIndex = 0;
    return update();
  });
  input.addEventListener("blur", function(e) {
    focused = false;
    return update();
  });
  input.addEventListener("change", update);
  input.addEventListener("input", update);
  return input.addEventListener("keydown", function(e) {
    var highlighted, value;
    switch (e.keyCode) {
      case 13: // return
        e.preventDefault();
        value = (highlighted = suggestionList.querySelector("[rainbow-before]")) ? highlighted.textContent : input.value;
        setValue(value);
        highlightIndex = 0;
        return update();
      case 27: // esc
        highlightIndex = 0;
        input.value = "";
        return input.blur();
      case 38: // up
        e.preventDefault();
        return highlightPrev();
      case 40: // down
        e.preventDefault();
        return highlightNext();
      default:
        highlightIndex = 0;
        return update();
    }
  });
});

// asset/components/title-bar/meta.coffee
Take(["ADSR", "DOOM", "Env", "Memory", "SizeOnDisk", "State", "DOMContentLoaded"], function(ADSR, DOOM, Env, Memory, SizeOnDisk, State) {
  var exec, meta;
  ({exec} = require("child_process"));
  meta = document.querySelector("title-bar .meta");
  // TODO: This should be moved to a background process, perhaps DB, or perhaps somewhere else,
  // since the child_process.exec takes about 50ms to run.
  return State.subscribe("asset", false, ADSR(0, 5000, async function(asset) {
    var elm, frag, size;
    if (asset != null) {
      if (Env.isMac) {
        size = (await new Promise(function(resolve) {
          return exec(`du -sh '${asset.path}'`, function(err, val) {
            return resolve(err || (val.split("\t")[0] + "B").replace("BB", "B"));
          });
        }));
      } else {
        size = (await SizeOnDisk.pretty(asset.path));
      }
      frag = new DocumentFragment();
      elm = DOOM.create("div", frag, {
        textContent: "ID"
      });
      DOOM.create("span", elm, {
        textContent: State("asset").id
      });
      elm = DOOM.create("div", frag, {
        textContent: "Size"
      });
      DOOM.create("span", elm, {
        textContent: size
      });
      return meta.replaceChildren(frag);
    }
  }));
});

// asset/components/tool-bar/add-files.coffee
Take(["DB", "Env", "IPC", "Log", "Paths", "State", "Write", "DOMContentLoaded"], function(DB, Env, IPC, Log, Paths, State, Write) {
  var elm;
  elm = document.querySelector("[add-files]");
  return elm.onclick = async function() {
    var asset, res;
    if (Env.isMac) {
      res = (await IPC.invoke("showOpenDialog", {
        properties: ["openDirectory", "openFile", "multiSelections"]
      }));
    } else {
      res = (await IPC.invoke("showOpenDialog", {
        properties: [
          "openFile",
          "multiSelections" // TODO: Windows can't do a mixed file+directory open dialog!? https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options
        ]
      }));
    }
    if (!res.cancelled) {
      asset = State("asset");
      return DB.send("Add Files", asset.id, res.filePaths);
    }
  };
});

// asset/components/tool-bar/file-tools.coffee
Take(["DOOM", "Memory", "State", "DOMContentLoaded"], function(DOOM, Memory, State) {
  var FileTools, fileCount, fileTools, render, searchBox;
  fileTools = document.querySelector("file-tools");
  fileCount = fileTools.querySelector("[file-count]");
  searchBox = fileTools.querySelector("search-box");
  render = function() {
    return DOOM(fileCount, {
      innerHTML: String.pluralize(State("asset").files.count, "%% <span>File") + "</span>"
    });
  };
  return Make.async("FileTools", FileTools = {
    render: render
  });
});

// asset/components/tool-bar/magic-button.coffee
Take(["DB", "DOOM", "Env", "Log", "State", "DOMContentLoaded"], function(DB, DOOM, Env, Log, State) {
  var button;
  if (!Env.isDev) {
    return;
  }
  button = document.querySelector("[magic-button]");
  DOOM(button, {
    display: "block"
  });
  return button.addEventListener("click", function() {
    var asset;
    if (asset = State("asset")) {
      return DB.send("Rebuild Thumbnail", asset.id);
    }
  });
});

// asset/components/tool-bar/meta-tools.coffee
Take(["DB", "DOOM", "Env", "HoldToRun", "IPC", "Memory", "Paths", "State", "Write", "DOMContentLoaded"], function(DB, DOOM, Env, HoldToRun, IPC, Memory, Paths, State, Write) {
  var MetaTools, deleteAsset, pinUnpin, render, shell, showInFinder;
  ({shell} = require("electron"));
  pinUnpin = document.querySelector("[pin-unpin]");
  deleteAsset = document.querySelector("[delete-asset]");
  showInFinder = document.querySelector("[show-in-finder]");
  if (!Env.isMac) {
    showInFinder.querySelector("span").textContent = "in Explorer";
  }
  showInFinder.onclick = function() {
    return shell.showItemInFolder(State("asset").path);
  };
  HoldToRun(deleteAsset, 1000, function() {
    var asset;
    asset = State("asset");
    DB.send("Delete Asset", asset.id);
    return IPC.send("close-window");
  });
  render = function() {
    return DOOM(pinUnpin, {
      textContent: State("asset").pinned ? "Unpin" : "Pin"
    });
  };
  return Make.async("MetaTools", MetaTools = {
    render: render
  });
});

// asset/components/tool-bar/pane-split.coffee
Take([], function() {
  var Split, container, lastClickTime, paneSplit;
  Split = require("split-grid");
  paneSplit = document.querySelector("pane-split");
  container = document.querySelector("main");
  Split({
    columnGutters: [
      {
        track: 1,
        element: paneSplit
      }
    ]
  });
  // On double click, reset the split to the center
  lastClickTime = 0;
  return paneSplit.addEventListener("mousedown", function() {
    // Split-grid puts a preventDefault call on mousedown, so we have to implement our own dblclick logic
    if (performance.now() < lastClickTime + 300) {
      container.style["grid-template-columns"] = "1fr 6px 1fr"; // Must mirror the value in main.scss
    }
    return lastClickTime = performance.now();
  });
});

// asset/components/tool-bar/thumbnail-size.coffee
Take(["ADSR", "DOOM", "Memory", "DOMContentLoaded"], function(ADSR, DOOM, Memory) {
  var newSize, oldSize, scroller, slider, update;
  newSize = 1;
  oldSize = 1;
  slider = document.querySelector("[thumbnail-size]");
  scroller = document.querySelector("file-list");
  update = ADSR(1, 1, function() {
    var scale;
    if (newSize === oldSize) {
      return;
    }
    document.body.style.setProperty("--asset-thumbnail-size", newSize + "em");
    scale = newSize / oldSize;
    oldSize = newSize;
    scroller.scrollTop *= scale;
    return Memory("assetThumbnailSize", newSize);
  });
  update();
  slider.oninput = slider.onchange = function(e) {
    newSize = slider.value;
    Memory("assetThumbnailSize", newSize);
    return update();
  };
  return Memory.subscribe("assetThumbnailSize", true, function(v) {
    if (v == null) {
      return;
    }
    newSize = v;
    if (slider.value !== newSize) {
      slider.value = newSize;
    }
    return update();
  });
});

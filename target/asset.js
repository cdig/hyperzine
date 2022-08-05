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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQW9CO0FBQUEsSUFBQTs7QUFDcEIsSUFBQSxDQUFLLENBQUMsS0FBRCxFQUFRLEtBQVIsRUFBZSxRQUFmLEVBQXlCLFFBQXpCLEVBQW1DLFFBQW5DLEVBQTZDLE9BQTdDLENBQUwsRUFBNEQsTUFBQSxRQUFBLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxNQUFYLEVBQW1CLENBQUMsR0FBRCxDQUFuQixFQUEwQixNQUExQixFQUFrQyxLQUFsQyxDQUFBO0FBRTVELE1BQUE7RUFBRSxPQUFBLEdBQVUsQ0FBQSxNQUFNLEdBQUcsQ0FBQyxNQUFKLENBQVcsZ0JBQVgsQ0FBTjtFQUVWLE1BQU0sQ0FBQyxTQUFQLENBQWlCLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQWpCLEVBQXNDLElBQXRDLEVBQTRDLFFBQUEsQ0FBQyxLQUFELENBQUE7SUFDMUMsb0JBQVUsS0FBSyxDQUFFLGlCQUFqQjtBQUFBLGFBQUE7O0lBRUEsSUFBRyxhQUFIO01BQ0UsS0FBQSxDQUFNLE9BQU4sRUFBZSxLQUFmO01BQ0EsTUFBQSxDQUFBLEVBRkY7S0FBQSxNQUFBO0FBQUE7S0FGSjs7Ozs7V0FXSSxJQUFBLENBQUssUUFBUSxDQUFDLElBQWQsRUFBb0I7TUFBQSxNQUFBLEVBQVcsYUFBSCxHQUFlLElBQWYsR0FBeUI7SUFBakMsQ0FBcEI7RUFaMEMsQ0FBNUM7RUFjQSxNQUFNLENBQUMsU0FBUCxDQUFpQixDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxLQUFBLENBQWpCLEVBQTJDLElBQTNDLEVBQWlELFFBQUEsQ0FBQyxJQUFELENBQUE7SUFDL0MsSUFBcUMsWUFBckM7YUFBQSxHQUFHLENBQUMsSUFBSixDQUFTLGtCQUFULEVBQTZCLElBQTdCLEVBQUE7O0VBRCtDLENBQWpEO1NBR0EsR0FBQSxDQUFJLFFBQUosRUFBYyxNQUFkO0FBckIw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QSxHQUFRO0lBQ2hCLE9BQUEsR0FBVTtJQUNWLFFBQVEsQ0FBQyxTQUFULElBQXNCO1dBQ3RCLE1BQUEsQ0FBTyxvQkFBUCxFQUE2QixPQUE3QjtFQU5rQixDQUFYO0VBUVQsTUFBQSxDQUFBO0VBRUEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsTUFBTSxDQUFDLFFBQVAsR0FBa0IsUUFBQSxDQUFDLENBQUQsQ0FBQTtJQUNqQyxPQUFBLEdBQVUsTUFBTSxDQUFDO0lBQ2pCLE1BQUEsQ0FBTyxvQkFBUCxFQUE2QixPQUE3QjtXQUNBLE1BQUEsQ0FBQTtFQUhpQztTQUtuQyxNQUFNLENBQUMsU0FBUCxDQUFpQixvQkFBakIsRUFBdUMsSUFBdkMsRUFBNkMsUUFBQSxDQUFDLENBQUQsQ0FBQTtJQUMzQyxJQUFjLFNBQWQ7QUFBQSxhQUFBOztJQUNBLE9BQUEsR0FBVTtJQUNWLElBQThCLE1BQU0sQ0FBQyxLQUFQLEtBQWdCLE9BQTlDO01BQUEsTUFBTSxDQUFDLEtBQVAsR0FBZSxRQUFmOztXQUNBLE1BQUEsQ0FBQTtFQUoyQyxDQUE3QztBQXZCbUQsQ0FBckQiLCJzb3VyY2VzQ29udGVudCI6WyIjIGFzc2V0L2Fzc2V0LmNvZmZlZVxuVGFrZSBbXCJJUENcIiwgXCJMb2dcIiwgXCJNZW1vcnlcIiwgXCJQdWJTdWJcIiwgXCJSZW5kZXJcIiwgXCJTdGF0ZVwiXSwgKElQQywgTG9nLCBNZW1vcnksIHtTdWJ9LCBSZW5kZXIsIFN0YXRlKS0+XG5cbiAgYXNzZXRJZCA9IGF3YWl0IElQQy5pbnZva2UgXCJ3aGF0cy1teS1hc3NldFwiXG5cbiAgTWVtb3J5LnN1YnNjcmliZSBcImFzc2V0cy4je2Fzc2V0SWR9XCIsIHRydWUsIChhc3NldCktPlxuICAgIHJldHVybiBpZiBhc3NldD8uX2xvYWRpbmcgIyBEb24ndCBzaG93IHN0YWxlIGRhdGEgd2hpbGUgaW5pdGlhbGx5IHJlLWxvYWRpbmcgYSBjYWNoZWQgYXNzZXRcblxuICAgIGlmIGFzc2V0P1xuICAgICAgU3RhdGUgXCJhc3NldFwiLCBhc3NldFxuICAgICAgUmVuZGVyKClcbiAgICBlbHNlXG4gICAgICAjIFdoZW4gdGhlIGFzc2V0IGlzIG51bGwsIHdlIGRvbid0IGNsZWFyIHRoZSBvbGQgYXNzZXQgZGF0YSBvdXQgb2YgU3RhdGUsXG4gICAgICAjIGJlY2F1c2UgdGhhdCBtaWdodCBjYXVzZSBzb21lIHRyaWNreSB1bmRlZmluZWQgcHJvcGVydHkgZXJyb3JzIGdpdmVuXG4gICAgICAjIGhvdyBtdWNoIGFzeW5jaHJvbm91cyBzdHVmZiB3ZSBkbyAobGlrZSB0aHVtYm5haWxzKS5cbiAgICAgICMgSXQncyBmaW5lIHRvIGp1c3Qga2VlcCB0aGUgc3RhbGUgYXNzZXQgZGF0YSBhcm91bmQgYW5kIGFsdGVyIHRoZSBVSS5cblxuICAgIERPT00gZG9jdW1lbnQuYm9keSwgbm9EYXRhOiBpZiBhc3NldD8gdGhlbiBudWxsIGVsc2UgXCJcIlxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgXCJhc3NldHMuI3thc3NldElkfS5uYW1lXCIsIHRydWUsIChuYW1lKS0+XG4gICAgSVBDLnNlbmQgXCJzZXQtd2luZG93LXRpdGxlXCIsIG5hbWUgaWYgbmFtZT9cblxuICBTdWIgXCJSZW5kZXJcIiwgUmVuZGVyXG5cblxuXG4jIGFzc2V0L2NvZmZlZS9yZW5kZXIuY29mZmVlXG5UYWtlIFtcIkFyY2hpdmVkU3R5bGVcIiwgXCJGaWxlTGlzdFwiLCBcIkZpbGVUb29sc1wiLCBcIk1ldGFQYW5lXCIsIFwiTWV0YVRvb2xzXCIsIFwiU3RhdGVcIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoQXJjaGl2ZWRTdHlsZSwgRmlsZUxpc3QsIEZpbGVUb29scywgTWV0YVBhbmUsIE1ldGFUb29scywgU3RhdGUpLT5cblxuICBNYWtlIFwiUmVuZGVyXCIsIFJlbmRlciA9ICgpLT5cbiAgICByZXR1cm4gdW5sZXNzIFN0YXRlIFwiYXNzZXRcIlxuXG4gICAgQXJjaGl2ZWRTdHlsZS5yZW5kZXIoKVxuICAgIEZpbGVMaXN0LnJlbmRlcigpXG4gICAgRmlsZVRvb2xzLnJlbmRlcigpXG4gICAgTWV0YVRvb2xzLnJlbmRlcigpXG4gICAgTWV0YVBhbmUucmVuZGVyKClcblxuXG5cbiMgYXNzZXQvY29tcG9uZW50cy9hcmNoaXZlZC1zdHlsZS5jb2ZmZWVcblRha2UgW1wiRE9PTVwiLCBcIlN0YXRlXCJdLCAoRE9PTSwgU3RhdGUpLT5cblxuICBNYWtlIFwiQXJjaGl2ZWRTdHlsZVwiLCBBcmNoaXZlZFN0eWxlID1cbiAgICByZW5kZXI6ICgpLT5cbiAgICAgIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgICBpc0FyY2hpdmVkID0gYXNzZXQ/LnRhZ3M/IGFuZCAoXCJBcmNoaXZlZFwiIGluIGFzc2V0LnRhZ3MpXG4gICAgICBTdGF0ZSBcImFyY2hpdmVkXCIsIGlzQXJjaGl2ZWRcbiAgICAgIERPT00gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCBpc0FyY2hpdmVkOiBpZiBpc0FyY2hpdmVkIHRoZW4gXCJcIiBlbHNlIG51bGxcblxuXG5cbiMgYXNzZXQvY29tcG9uZW50cy9maWxlcy1wYW5lL2ZpbGUtaW5mby5jb2ZmZWVcblRha2UgW1wiREJcIiwgXCJET09NXCIsIFwiRWRpdGFibGVGaWVsZFwiLCBcIkhvbGRUb1J1blwiLCBcIkxvZ1wiLCBcIlBhdGhzXCIsIFwiU3RhdGVcIiwgXCJWYWxpZGF0aW9uc1wiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChEQiwgRE9PTSwgRWRpdGFibGVGaWVsZCwgSG9sZFRvUnVuLCBMb2csIFBhdGhzLCBTdGF0ZSwgVmFsaWRhdGlvbnMpLT5cbiAgeyBzaGVsbCB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcblxuICBNYWtlLmFzeW5jIFwiRmlsZUluZm9cIiwgRmlsZUluZm8gPSAocGFyZW50LCBmaWxlKS0+XG5cbiAgICBpbmZvID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgcGFyZW50LCBjbGFzczogXCJpbmZvXCJcblxuICAgIGZpbGVOYW1lID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgaW5mbywgY2xhc3M6IFwibmFtZVwiXG4gICAgZmllbGQgPSBET09NLmNyZWF0ZSBcImRpdlwiLCBmaWxlTmFtZSwgY2xhc3M6IFwiYmFzaWMtZmllbGRcIiwgdGV4dENvbnRlbnQ6IGZpbGUubmFtZVxuICAgIEVkaXRhYmxlRmllbGQgZmllbGQsIHJlbmFtZUZpbGUoZmlsZSksIHZhbGlkYXRlOiBWYWxpZGF0aW9ucy5maWxlXG5cbiAgICB0b29scyA9IERPT00uY3JlYXRlIFwiZGl2XCIsIGluZm8sIGNsYXNzOiBcInRvb2xzXCJcbiAgICBtZXRhID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgaW5mbywgY2xhc3M6IFwibWV0YVwiXG5cbiAgICBzaG93ID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgdG9vbHMsIGNsYXNzOiBcInRvb2xcIlxuICAgIERPT00uY3JlYXRlIFwic3ZnXCIsIHNob3csXG4gICAgICBjbGFzczogXCJpY29uIGJ1dHRvbmlzaFwiXG4gICAgICB2aWV3Qm94OiBcIjAgMCAyMDAgMjAwXCJcbiAgICAgIGlubmVySFRNTDogXCI8dXNlIHhsaW5rOmhyZWY9JyNpLWZpbGUnPjwvdXNlPlwiXG4gICAgICBjbGljazogKCktPiBzaGVsbC5zaG93SXRlbUluRm9sZGVyIGZpbGUucGF0aFxuXG4gICAgcmVtb3ZlID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgdG9vbHMsIGNsYXNzOiBcInRvb2xcIlxuICAgIERPT00uY3JlYXRlIFwic3ZnXCIsIHJlbW92ZSxcbiAgICAgIGNsYXNzOiBcImljb25cIlxuICAgICAgdmlld0JveDogXCIwIDAgMjAwIDIwMFwiXG4gICAgICBpbm5lckhUTUw6IFwiPHVzZSB4bGluazpocmVmPScjaS1leCc+PC91c2U+XCJcbiAgICBIb2xkVG9SdW4gcmVtb3ZlLCA0MDAsIGRlbGV0ZUZpbGUgZmlsZVxuXG4gICAgaWYgZmlsZS5leHQ/IGFuZCBub3QgUGF0aHMuZXh0Lmljb25bZmlsZS5leHRdXG4gICAgICBzZXRUaHVtYm5haWxFbG0gPSBET09NLmNyZWF0ZSBcImRpdlwiLCB0b29scywgY2xhc3M6IFwidG9vbFwiXG4gICAgICBwYXJlbnQuX3NldFRodW1ibmFpbFN2ZyA9IERPT00uY3JlYXRlIFwic3ZnXCIsIHNldFRodW1ibmFpbEVsbSxcbiAgICAgICAgY2xhc3M6IFwiaWNvblwiXG4gICAgICAgIHZpZXdCb3g6IFwiMCAwIDIwMCAyMDBcIlxuICAgICAgICBpbm5lckhUTUw6IFwiPHVzZSB4bGluazpocmVmPScjaS1leWUnPjwvdXNlPlwiXG4gICAgICAgIGNsaWNrOiBzZXRUaHVtYm5haWwgZmlsZVxuXG4gICAgaWYgZmlsZS5jb3VudD9cbiAgICAgIERPT00uY3JlYXRlIFwic3BhblwiLCBtZXRhLCB0ZXh0Q29udGVudDogZmlsZS5jb3VudCArIFwiIEl0ZW1zXCJcblxuXG4gIEZpbGVJbmZvLnVwZGF0ZSA9IChhc3NldCwgZmlsZSwgZWxtKS0+XG4gICAgaWYgZWxtLl9zZXRUaHVtYm5haWxTdmc/XG4gICAgICBET09NIGVsbS5fc2V0VGh1bWJuYWlsU3ZnLCBpc1Nob3Q6IGlmIGFzc2V0Lm5ld1Nob3QgaXMgZmlsZS5uYW1lIHRoZW4gXCJcIiBlbHNlIG51bGxcblxuXG4gIGRlbGV0ZUZpbGUgPSAoZmlsZSktPiAoKS0+XG4gICAgaWYgYXNzZXQgPSBTdGF0ZSBcImFzc2V0XCJcbiAgICAgIERCLnNlbmQgXCJEZWxldGUgRmlsZVwiLCBhc3NldC5pZCwgZmlsZS5yZWxwYXRoXG5cbiAgcmVuYW1lRmlsZSA9IChmaWxlKS0+ICh2KS0+XG4gICAgaWYgYXNzZXQgPSBTdGF0ZSBcImFzc2V0XCJcbiAgICAgIERCLnNlbmQgXCJSZW5hbWUgRmlsZVwiLCBhc3NldC5pZCwgZmlsZS5yZWxwYXRoLCB2XG5cbiAgc2V0VGh1bWJuYWlsID0gKGZpbGUpLT4gKCktPlxuICAgIGlmIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgICBEQi5zZW5kIFwiU2V0IFRodW1ibmFpbFwiLCBhc3NldC5pZCwgZmlsZS5yZWxwYXRoXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvZmlsZXMtcGFuZS9maWxlLWxpc3QuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJGaWxlXCIsIFwiU3RhdGVcIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoRE9PTSwgRmlsZSwgU3RhdGUpLT5cbiAgZmlsZUxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwiZmlsZS1saXN0XCJcblxuICBmaWxlRWxtcyA9IHt9XG5cbiAgTWFrZS5hc3luYyBcIkZpbGVMaXN0XCIsIEZpbGVMaXN0ID1cbiAgICByZW5kZXI6ICgpLT5cbiAgICAgIHJldHVybiB1bmxlc3MgYXNzZXQgPSBTdGF0ZSBcImFzc2V0XCJcblxuICAgICAgZnJhZyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KClcbiAgICAgIHNlYXJjaCA9IFN0YXRlKFwic2VhcmNoXCIpPy50b0xvd2VyQ2FzZSgpXG5cbiAgICAgIGZvciBmaWxlIGluIGFzc2V0LmZpbGVzLmNoaWxkcmVuXG4gICAgICAgIG1ha2VUcmVlRWxtIGFzc2V0LCBmaWxlLCBmcmFnLCBzZWFyY2hcblxuICAgICAgZmlsZUxpc3QucmVwbGFjZUNoaWxkcmVuIGZyYWdcblxuXG4gIG1ha2VUcmVlRWxtID0gKGFzc2V0LCB0cmVlLCBwYXJlbnQsIHNlYXJjaCwgZGVwdGggPSAwKS0+XG5cbiAgICB0cmVlRWxtID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgcGFyZW50LCBjbGFzczogXCJ0cmVlXCJcblxuICAgICMgV2Ugd2FudCB0byBjYWNoZSBhbmQgcmV1c2UgRmlsZSBlbG1zIGJlY2F1c2UgdGhleSBuZWVkIHRvIGxvYWQgdGh1bWJuYWlscywgYW5kIHRoYXQncyBhc3luYy5cbiAgICBmaWxlRWxtID0gZmlsZUVsbXNbdHJlZS5yZWxwYXRoXSA/PSBGaWxlIHRyZWVcbiAgICBGaWxlLnVwZGF0ZSBhc3NldCwgdHJlZSwgZmlsZUVsbVxuICAgIHRyZWVFbG0uYXBwZW5kQ2hpbGQgZmlsZUVsbVxuXG4gICAgbm9TZWFyY2ggPSAobm90IHNlYXJjaD8pIG9yIChzZWFyY2gubGVuZ3RoIDw9IDApXG4gICAgbWF0Y2hlc1NlYXJjaCA9IHRyZWUubmFtZS50b0xvd2VyQ2FzZSgpLnNlYXJjaChzZWFyY2gpID49IDBcbiAgICBoYXNWaXNpYmxlQ29udGVudHMgPSBmYWxzZVxuXG4gICAgaWYgdHJlZS5jaGlsZHJlbj9cbiAgICAgIGNoaWxkcmVuRWxtID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgdHJlZUVsbSwgY2xhc3M6IFwiY2hpbGRyZW5cIlxuICAgICAgZm9yIGNoaWxkIGluIHRyZWUuY2hpbGRyZW5cbiAgICAgICAgY2hpbGRJc1Zpc2libGUgPSBtYWtlVHJlZUVsbSBhc3NldCwgY2hpbGQsIGNoaWxkcmVuRWxtLCBzZWFyY2gsIGRlcHRoKzFcbiAgICAgICAgaGFzVmlzaWJsZUNvbnRlbnRzID0gdHJ1ZSBpZiBjaGlsZElzVmlzaWJsZVxuICAgICAgdG9nZ2xlKHRyZWVFbG0sIGNoaWxkcmVuRWxtKSB0cnVlIGlmIGhhc1Zpc2libGVDb250ZW50c1xuICAgICAgU3RhdGUuc3Vic2NyaWJlIFwiZmlsZUxpc3QuI3t0cmVlLnJlbHBhdGh9LnNob3dDaGlsZHJlblwiLCB0b2dnbGUgdHJlZUVsbSwgY2hpbGRyZW5FbG1cblxuICAgIGlzVmlzaWJsZSA9IG5vU2VhcmNoIG9yIG1hdGNoZXNTZWFyY2ggb3IgaGFzVmlzaWJsZUNvbnRlbnRzXG4gICAgRE9PTSB0cmVlRWxtLCBkaXNwbGF5OiBpZiBpc1Zpc2libGUgdGhlbiBcImJsb2NrXCIgZWxzZSBcIm5vbmVcIlxuXG4gICAgcmV0dXJuIGlzVmlzaWJsZVxuXG5cbiAgdG9nZ2xlID0gKHRyZWVFbG0sIGNoaWxkcmVuRWxtKS0+IChzaG93Q2hpbGRyZW4pLT5cbiAgICB2ID0gaWYgc2hvd0NoaWxkcmVuIHRoZW4gXCJcIiBlbHNlIG51bGxcbiAgICBET09NIHRyZWVFbG0sIHNob3dDaGlsZHJlbjogdlxuXG5cblxuIyBhc3NldC9jb21wb25lbnRzL2ZpbGVzLXBhbmUvZmlsZS10aHVtYm5haWwuY29mZmVlXG5UYWtlIFtcIkRCXCIsIFwiRE9PTVwiLCBcIkhvbGRUb1J1blwiLCBcIklQQ1wiLCBcIkxvZ1wiLCBcIkVkaXRhYmxlRmllbGRcIiwgXCJPblNjcmVlblwiLCBcIlBhdGhzXCIsIFwiUHViU3ViXCIsIFwiUmVhZFwiLCBcIlN0YXRlXCIsIFwiVmFsaWRhdGlvbnNcIiwgXCJXcml0ZVwiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChEQiwgRE9PTSwgSG9sZFRvUnVuLCBJUEMsIExvZywgRWRpdGFibGVGaWVsZCwgT25TY3JlZW4sIFBhdGhzLCB7UHVifSwgUmVhZCwgU3RhdGUsIFZhbGlkYXRpb25zLCBXcml0ZSktPlxuXG4gIE1ha2UuYXN5bmMgXCJGaWxlVGh1bWJuYWlsXCIsIChwYXJlbnQsIGZpbGUpLT5cbiAgICBlbG0gPSBET09NLmNyZWF0ZSBcImRpdlwiLCBwYXJlbnQsXG4gICAgICBjbGFzczogXCJ0aHVtYm5haWxcIlxuICAgICAgZHJhZ2dhYmxlOiBcInRydWVcIlxuXG4gICAgZWxtLm9uZHJhZ3N0YXJ0ID0gKGUpLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgSVBDLnNlbmQgXCJkcmFnLWZpbGVcIiwgZmlsZS5wYXRoXG5cbiAgICBlbG0ub25jbGljayA9IChlKS0+XG4gICAgICBpZiBmaWxlLmNvdW50P1xuICAgICAgICAgIFN0YXRlLnVwZGF0ZSBcImZpbGVMaXN0LiN7ZmlsZS5yZWxwYXRofS5zaG93Q2hpbGRyZW5cIiwgKHYpLT4gIXZcbiAgICAgICAgICAjIHNob3cgPSBpZiBET09NKGVsbSwgXCJzaG93Q2hpbGRyZW5cIik/IHRoZW4gbnVsbCBlbHNlIFwiXCJcbiAgICAgICAgICAjIERPT00gZWxtLCBzaG93Q2hpbGRyZW46IHNob3dcbiAgICAgICAgICAjIG1ha2VUaHVtYm5haWwgZWxtLCBmaWxlICMgVGhpcyBkb2Vzbid0IHNlZW0gdG8gdXBkYXRlIG9uIFJlbmRlciwgc28ganVzdCBkbyBpdCBtYW51YWxseVxuICAgICAgICAgICMgUHViIFwiUmVuZGVyXCJcbiAgICAgIGVsc2VcbiAgICAgICAgSVBDLnNlbmQgXCJwcmV2aWV3LWZpbGVcIiwgZmlsZS5wYXRoXG5cbiAgICAjIFdoZW4gdGhlIHRodW1ibmFpbCBmaXJzdCBhcHBlYXJzIG9uIHNjcmVlbiwgYnVpbGQgaXRzIGdyYXBoaWNcbiAgICBPblNjcmVlbiBlbG0sIG9uc2NyZWVuIGZpbGVcblxuXG4gIG9uc2NyZWVuID0gKGZpbGUpLT4gKHRodW1ibmFpbCwgdmlzaWJsZSktPlxuICAgIHJldHVybiB1bmxlc3MgdmlzaWJsZVxuXG4gICAgIyBXZSBvbmx5IG5lZWQgdG8gZG8gdGhpcyBzZXR1cCBzdGVwIHRoZSBmaXJzdCB0aW1lIHRoZSB0aHVtYm5haWwgYmVjb21lcyB2aXNpYmxlXG4gICAgT25TY3JlZW4ub2ZmIHRodW1ibmFpbFxuXG4gICAgIyBDcmVhdGUgdGhlIHJpZ2h0IGtpbmQgb2YgZ3JhcGhpYyBmb3IgdGhpcyB0eXBlIG9mIGZpbGVcbiAgICBmbiA9IHN3aXRjaFxuICAgICAgd2hlbiBmaWxlLmNvdW50PyB0aGVuIG1ha2VGb2xkZXJHcmFwaGljXG4gICAgICB3aGVuIFBhdGhzLmV4dC52aWRlb1tmaWxlLmV4dF0/IHRoZW4gbWFrZVZpZGVvR3JhcGhpY1xuICAgICAgd2hlbiBQYXRocy5leHQuaWNvbltmaWxlLmV4dF0/IHRoZW4gbWFrZUljb25HcmFwaGljXG4gICAgICBlbHNlIG1ha2VJbWFnZUdyYXBoaWNcbiAgICBmbiB0aHVtYm5haWwsIGZpbGVcblxuXG4gIG1ha2VGb2xkZXJHcmFwaGljID0gKHRodW1ibmFpbCwgZmlsZSktPlxuICAgIHRodW1ibmFpbC5yZXBsYWNlQ2hpbGRyZW4gRE9PTS5jcmVhdGUgXCJkaXZcIiwgbnVsbCxcbiAgICAgIGNsYXNzOiBcImVtb2ppXCJcbiAgICAgIGlubmVySFRNTDogXCI8c3BhbiBjbGFzcz0nb3Blbic+8J+Tgjwvc3Bhbj48c3BhbiBjbGFzcz0nY2xvc2VkJz7wn5OBPC9zcGFuPlwiXG5cblxuICBtYWtlVmlkZW9HcmFwaGljID0gKHRodW1ibmFpbCwgZmlsZSktPlxuICAgIGltZyA9IERPT00uY3JlYXRlIFwidmlkZW9cIiwgbnVsbCxcbiAgICAgIGF1dG9wbGF5OiBcIlwiXG4gICAgICBtdXRlZDogXCJcIlxuICAgICAgY29udHJvbHM6IFwiXCJcbiAgICAgIGNvbnRyb2xzbGlzdDogXCJub2Rvd25sb2FkIG5vZnVsbHNjcmVlbiBub3JlbW90ZXBsYXliYWNrXCJcbiAgICAgIGRpc2FibGVwaWN0dXJlaW5waWN0dXJlOiBcIlwiXG4gICAgICBkaXNhYmxlcmVtb3RlcGxheWJhY2s6IFwiXCJcbiAgICAgIGxvb3A6IFwiXCJcbiAgICAgIHNyYzogZmlsZS5wYXRoXG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lciBcImxvYWRlZG1ldGFkYXRhXCIsICgpLT5cbiAgICAgIGltZy5tdXRlZCA9IHRydWUgIyBJdCBzZWVtcyB0aGUgYXR0ciBpc24ndCB3b3JraW5nLCBzbyB3ZSBnb3R0YSBkbyB0aGlzXG4gICAgICAjIFdlIG5lZWQgYSB3YXkgdG8gcHV0IHRoZSBkdXJhdGlvbiBpbnRvIFN0YXRlLCBhbmQgYWRkIGEgaG9vayBvdmVyIGluIEZpbGVJbmZvIHRoYXQnbGwgcGljayB1cCBvbiB0aGlzIGluZm8gYW5kIHJlLXJlbmRlciBpdHNlbGZcbiAgICAgICMgaWYgaW1nLmR1cmF0aW9uXG4gICAgICAjICAgbWV0YS5fZHVyYXRpb24gPz0gRE9PTS5jcmVhdGUgXCJzcGFuXCIsIG1ldGFcbiAgICAgICMgICBET09NIG1ldGEuX2R1cmF0aW9uLCB0ZXh0Q29udGVudDogTWF0aC5yb3VuZChpbWcuZHVyYXRpb24pICsgXCJzXCJcbiAgICAgICMgZWxzZVxuICAgICAgIyAgIERPT00ucmVtb3ZlIG1ldGEuX2R1cmF0aW9uXG4gICAgICAjICAgZGVsZXRlIG1ldGEuX2R1cmF0aW9uXG4gICAgICB0aHVtYm5haWwucmVwbGFjZUNoaWxkcmVuIGltZ1xuXG5cbiAgbWFrZUltYWdlR3JhcGhpYyA9ICh0aHVtYm5haWwsIGZpbGUpLT5cbiAgICBhc3NldCA9IFN0YXRlIFwiYXNzZXRcIlxuICAgIHRodW1iTmFtZSA9IFBhdGhzLnRodW1ibmFpbE5hbWUgZmlsZSwgMjU2XG4gICAgaW1nID0gRE9PTS5jcmVhdGUgXCJpbWdcIiwgbnVsbCwgc3JjOiBQYXRocy50aHVtYm5haWwgYXNzZXQsIHRodW1iTmFtZVxuICAgIGltZy5vbmVycm9yID0gKCktPlxuICAgICAgIyBUaGVyZSdsbCBiZSBhIHNob3J0IGRlbGF5IGJlZm9yZSB0aGUgdGh1bWJuYWlsIGlzIHJlYWR5LCBlc3BlY2lhbGx5IGlmIHdlJ3JlIGNyZWF0aW5nIGEgYnVuY2ggb2ZcbiAgICAgICMgZmlsZSB0aHVtYm5haWxzIGFsbCBhdCBvbmNlLiBTbywgd2UnbGwgcXVpY2tseSBzaG93IGFuIGljb24gYXMgYSBwbGFjZWhvbGRlciBpbiB0aGUgbWVhbnRpbWUuXG4gICAgICBhd2FpdCBtYWtlSWNvbkdyYXBoaWMgdGh1bWJuYWlsLCBmaWxlXG4gICAgICBzcmMgPSBhd2FpdCBEQi5zZW5kIFwiY3JlYXRlLWZpbGUtdGh1bWJuYWlsXCIsIGFzc2V0LmlkLCBmaWxlLnBhdGgsIDI1NiwgdGh1bWJOYW1lXG4gICAgICBpZiBzcmNcbiAgICAgICAgIyBQcmV2ZW50IHJlcGVhdCBmYWlsdXJlcyBpZiB0aGUgc3JjIHBhdGggaXMgdmFsaWQgYnV0IHRoZSB0aHVtYm5haWwgaXMgbm90XG4gICAgICAgIGltZy5vbmVycm9yID0gKCktPiBtYWtlRXJyb3JHcmFwaGljIHRodW1ibmFpbCwgZmlsZVxuICAgICAgICBET09NIGltZywgc3JjOiBudWxsICMgZ290dGEgY2xlYXIgaXQgZmlyc3Qgb3IgRE9PTSdzIGNhY2hlIHdpbGwgZGVmZWF0IHRoZSBmb2xsb3dpbmdcbiAgICAgICAgRE9PTSBpbWcsIHNyYzogc3JjXG4gICAgaW1nLm9ubG9hZCA9ICgpLT4gdGh1bWJuYWlsLnJlcGxhY2VDaGlsZHJlbiBpbWdcblxuXG4gIG1ha2VJY29uR3JhcGhpYyA9ICh0aHVtYm5haWwsIGZpbGUpLT5cbiAgICB0aHVtYm5haWwucmVwbGFjZUNoaWxkcmVuIERPT00uY3JlYXRlIFwiaW1nXCIsIG51bGwsXG4gICAgICBjbGFzczogXCJpY29uXCJcbiAgICAgIHNyYzogYXdhaXQgSVBDLmludm9rZSBcImdldC1maWxlLWljb25cIiwgZmlsZS5wYXRoXG5cblxuICBtYWtlRXJyb3JHcmFwaGljID0gKHRodW1ibmFpbCwgZmlsZSktPlxuICAgIHRodW1ibmFpbC5yZXBsYWNlQ2hpbGRyZW4gRE9PTS5jcmVhdGUgXCJkaXZcIiwgbnVsbCwgY2xhc3M6IFwiZW1vamlcIiwgdGV4dENvbnRlbnQ6IFwi4pqg77iPXCJcblxuXG5cbiMgYXNzZXQvY29tcG9uZW50cy9maWxlcy1wYW5lL2ZpbGUuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJGaWxlSW5mb1wiLCBcIkZpbGVUaHVtYm5haWxcIiwgXCJMb2dcIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoRE9PTSwgRmlsZUluZm8sIEZpbGVUaHVtYm5haWwsIExvZyktPlxuXG4gIE1ha2UuYXN5bmMgXCJGaWxlXCIsIEZpbGUgPSAoZmlsZSktPlxuICAgIGVsbSA9IERPT00uY3JlYXRlIFwiZGl2XCIsIG51bGwsXG4gICAgICBjbGFzczogaWYgZmlsZS5jb3VudD8gdGhlbiBcImZpbGUgZm9sZGVyXCIgZWxzZSBcImZpbGVcIlxuXG4gICAgRmlsZVRodW1ibmFpbCBlbG0sIGZpbGVcbiAgICBGaWxlSW5mbyBlbG0sIGZpbGVcblxuICAgIGVsbVxuXG4gIEZpbGUudXBkYXRlID0gRmlsZUluZm8udXBkYXRlXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvbWV0YS1wYW5lL21ldGEtcGFuZS5jb2ZmZWVcblRha2UgW1wiREJcIiwgXCJBRFNSXCIsIFwiRE9PTVwiLCBcIk1lbW9yeVwiLCBcIk1lbW9yeUZpZWxkXCIsIFwiTWV0YVRvb2xzXCIsIFwiUGF0aHNcIiwgXCJTdGF0ZVwiLCBcIlRhZ0xpc3RcIiwgXCJWYWxpZGF0aW9uc1wiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChEQiwgQURTUiwgRE9PTSwgTWVtb3J5LCBNZW1vcnlGaWVsZCwgTWV0YVRvb2xzLCBQYXRocywgU3RhdGUsIFRhZ0xpc3QsIFZhbGlkYXRpb25zKS0+XG4gIG1ldGFQYW5lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIm1ldGEtcGFuZVwiXG4gIGFzc2V0VGh1bWJuYWlsID0gbWV0YVBhbmUucXVlcnlTZWxlY3RvciBcImFzc2V0LXRodW1ibmFpbFwiXG4gIGFzc2V0TmFtZSA9IG1ldGFQYW5lLnF1ZXJ5U2VsZWN0b3IgXCJhc3NldC1uYW1lXCJcbiAgYWRkTm90ZSA9IG1ldGFQYW5lLnF1ZXJ5U2VsZWN0b3IgXCJbYWRkLW5vdGVdXCJcbiAgYXNzZXRIaXN0b3J5ID0gbWV0YVBhbmUucXVlcnlTZWxlY3RvciBcIlthc3NldC1oaXN0b3J5XVwiXG4gIHRhZ0xpc3QgPSBtZXRhUGFuZS5xdWVyeVNlbGVjdG9yIFwidGFnLWxpc3RcIlxuXG4gIHJlbW92ZVRhZyA9ICh0YWcpLT5cbiAgICBhc3NldCA9IFN0YXRlIFwiYXNzZXRcIlxuICAgIERCLnNlbmQgXCJSZW1vdmUgVGFnXCIsIGFzc2V0LmlkLCB0YWdcblxuICByZW5hbWVBc3NldCA9IEFEU1IgMzAwLCAwLCAodiktPlxuICAgIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgREIuc2VuZCBcIlJlbmFtZSBBc3NldFwiLCBhc3NldC5pZCwgdlxuXG4gIE1ha2UgXCJNZXRhUGFuZVwiLCBNZXRhUGFuZSA9XG4gICAgcmVuZGVyOiAoKS0+XG4gICAgICBhc3NldCA9IFN0YXRlIFwiYXNzZXRcIlxuICAgICAgdGFnTGlzdC5yZXBsYWNlQ2hpbGRyZW4gVGFnTGlzdCBhc3NldCwgcmVtb3ZlRm46IHJlbW92ZVRhZ1xuICAgICAgTWVtb3J5RmllbGQgXCJhc3NldHMuI3thc3NldC5pZH0ubmFtZVwiLCBhc3NldE5hbWUsXG4gICAgICAgIHZhbGlkYXRlOiBWYWxpZGF0aW9ucy5hc3NldC5uYW1lXG4gICAgICAgIHVwZGF0ZTogcmVuYW1lQXNzZXRcbiAgICAgIGltZyA9IERPT00uY3JlYXRlIFwiaW1nXCIsIG51bGwsXG4gICAgICAgIHNyYzogUGF0aHMudGh1bWJuYWlsIGFzc2V0LCBcIjUxMi5qcGc/Y2FjaGVidXN0PSN7TWF0aC5yYW5kSW50IDAsIDEwMDAwfVwiXG4gICAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lciBcImxvYWRcIiwgKCktPlxuICAgICAgICBhc3NldFRodW1ibmFpbC5yZXBsYWNlQ2hpbGRyZW4gaW1nXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvbWV0YS1wYW5lL3RhZy1lbnRyeS5jb2ZmZWVcblRha2UgW1wiREJcIiwgXCJBRFNSXCIsIFwiRE9PTVwiLCBcIk1lbW9yeVwiLCBcIlBhdGhzXCIsIFwiU3RhdGVcIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoREIsIEFEU1IsIERPT00sIE1lbW9yeSwgUGF0aHMsIFN0YXRlKS0+XG5cbiAgaW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwidGFnLWVudHJ5IGlucHV0XCJcbiAgc3VnZ2VzdGlvbkxpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwidGFnLWVudHJ5IHN1Z2dlc3Rpb24tbGlzdFwiXG5cbiAgZm9jdXNlZCA9IGZhbHNlXG4gIGhpZ2hsaWdodEluZGV4ID0gMFxuXG4gIHVwZGF0ZSA9IEFEU1IgMSwgMSwgKCktPlxuICAgIGhhc0lucHV0ID0gaW5wdXQudmFsdWU/Lmxlbmd0aCA+IDBcblxuICAgIG1hdGNoZXMgPSBbXVxuXG4gICAgaWYgaGFzSW5wdXRcbiAgICAgIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgICB2YWx1ZSA9IGlucHV0LnZhbHVlLnRvTG93ZXJDYXNlKClcbiAgICAgIGZvciB0YWcgb2YgTWVtb3J5IFwidGFnc1wiXG4gICAgICAgIGNvbnRpbnVlIHVubGVzcyB0YWcudG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoIHZhbHVlXG4gICAgICAgIGNvbnRpbnVlIGlmIHRhZyBpbiBhc3NldC50YWdzXG4gICAgICAgIG1hdGNoZXMucHVzaCB0YWdcblxuICAgICAgbWF0Y2hlcyA9IEFycmF5LnNvcnRBbHBoYWJldGljIG1hdGNoZXNcbiAgICAgIHRydW5jYXRlZE1hdGNoZXMgPSBtYXRjaGVzWy4uLjEwXVxuXG4gICAgICBmcmFnID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKVxuICAgICAgaGlnaGxpZ2h0SW5kZXggPSAoaGlnaGxpZ2h0SW5kZXggKyB0cnVuY2F0ZWRNYXRjaGVzLmxlbmd0aCsxKSAlICh0cnVuY2F0ZWRNYXRjaGVzLmxlbmd0aCsxKVxuXG4gICAgICBmb3IgdGFnLCBpIGluIHRydW5jYXRlZE1hdGNoZXNcbiAgICAgICAgZG8gKHRhZywgaSktPlxuICAgICAgICAgIHRhZ0VsbSA9IERPT00uY3JlYXRlIFwiZGl2XCIsIGZyYWcsIHJhaW5ib3dCZWZvcmU6IGlmIGkrMSBpcyBoaWdobGlnaHRJbmRleCB0aGVuIFwiXCIgZWxzZSBudWxsXG4gICAgICAgICAgRE9PTS5jcmVhdGUgXCJzcGFuXCIsIHRhZ0VsbSwgdGV4dENvbnRlbnQ6IHRhZ1xuICAgICAgICAgIHRhZ0VsbS5hZGRFdmVudExpc3RlbmVyIFwibW91c2Vtb3ZlXCIsIChlKS0+XG4gICAgICAgICAgICBoaWdobGlnaHRJbmRleCA9IGkgKyAxXG4gICAgICAgICAgICB1cGRhdGUoKVxuICAgICAgICAgIHRhZ0VsbS5hZGRFdmVudExpc3RlbmVyIFwibW91c2Vkb3duXCIsIChlKS0+XG4gICAgICAgICAgICBzZXRWYWx1ZSB0YWdcblxuICAgICAgaWYgbWF0Y2hlcy5sZW5ndGggPiB0cnVuY2F0ZWRNYXRjaGVzLmxlbmd0aFxuICAgICAgICB0cnVuY0VsbSA9IERPT00uY3JlYXRlIFwic3BhblwiLCBmcmFnLCBjbGFzczogXCJ0cnVuY2F0ZWRcIiwgdGV4dENvbnRlbnQ6IFwi4oCmXCJcblxuICAgICAgc3VnZ2VzdGlvbkxpc3QucmVwbGFjZUNoaWxkcmVuIGZyYWdcblxuICAgIHNob3cgPSBmb2N1c2VkIGFuZCBoYXNJbnB1dCBhbmQgbWF0Y2hlcy5sZW5ndGggPiAwXG4gICAgc3VnZ2VzdGlvbkxpc3Quc3R5bGUuZGlzcGxheSA9IGlmIHNob3cgdGhlbiBcImJsb2NrXCIgZWxzZSBcIm5vbmVcIlxuICAgIGhpZ2hsaWdodEluZGV4ID0gMCB1bmxlc3Mgc2hvd1xuXG4gIHNldFZhbHVlID0gKHZhbHVlKS0+XG4gICAgaWYgdmFsdWU/Lmxlbmd0aCA+IDBcbiAgICAgIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgICBEQi5zZW5kIFwiQWRkIFRhZ1wiLCBhc3NldC5pZCwgdmFsdWVcbiAgICAgIE1lbW9yeSBcInRhZ3MuI3t2YWx1ZX1cIiwgdmFsdWVcbiAgICAgIGlucHV0LnZhbHVlID0gXCJcIlxuXG5cbiAgaGlnaGxpZ2h0TmV4dCA9ICgpLT5cbiAgICBoaWdobGlnaHRJbmRleCsrXG4gICAgdXBkYXRlKClcblxuICBoaWdobGlnaHRQcmV2ID0gKCktPlxuICAgIGhpZ2hsaWdodEluZGV4LS1cbiAgICB1cGRhdGUoKVxuXG4gIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIgXCJtb3VzZW1vdmVcIiwgKGUpLT5cbiAgICBoaWdobGlnaHRJbmRleCA9IDBcbiAgICB1cGRhdGUoKVxuXG4gIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIgXCJmb2N1c1wiLCAoZSktPlxuICAgIGZvY3VzZWQgPSB0cnVlXG4gICAgaGlnaGxpZ2h0SW5kZXggPSAwXG4gICAgdXBkYXRlKClcblxuICBpbnB1dC5hZGRFdmVudExpc3RlbmVyIFwiYmx1clwiLCAoZSktPlxuICAgIGZvY3VzZWQgPSBmYWxzZVxuICAgIHVwZGF0ZSgpXG5cbiAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lciBcImNoYW5nZVwiLCB1cGRhdGVcbiAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lciBcImlucHV0XCIsIHVwZGF0ZVxuXG4gIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIgXCJrZXlkb3duXCIsIChlKS0+XG4gICAgc3dpdGNoIGUua2V5Q29kZVxuICAgICAgd2hlbiAxMyAjIHJldHVyblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICAgICB2YWx1ZSA9IGlmIGhpZ2hsaWdodGVkID0gc3VnZ2VzdGlvbkxpc3QucXVlcnlTZWxlY3RvciBcIltyYWluYm93LWJlZm9yZV1cIlxuICAgICAgICAgIGhpZ2hsaWdodGVkLnRleHRDb250ZW50XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpbnB1dC52YWx1ZVxuXG5cbiAgICAgICAgc2V0VmFsdWUgdmFsdWVcblxuICAgICAgICBoaWdobGlnaHRJbmRleCA9IDBcbiAgICAgICAgdXBkYXRlKClcblxuICAgICAgd2hlbiAyNyAjIGVzY1xuICAgICAgICBoaWdobGlnaHRJbmRleCA9IDBcbiAgICAgICAgaW5wdXQudmFsdWUgPSBcIlwiXG4gICAgICAgIGlucHV0LmJsdXIoKVxuXG4gICAgICB3aGVuIDM4ICMgdXBcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGhpZ2hsaWdodFByZXYoKVxuXG4gICAgICB3aGVuIDQwICMgZG93blxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgaGlnaGxpZ2h0TmV4dCgpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgaGlnaGxpZ2h0SW5kZXggPSAwXG4gICAgICAgIHVwZGF0ZSgpXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvdGl0bGUtYmFyL21ldGEuY29mZmVlXG5UYWtlIFtcIkFEU1JcIiwgXCJET09NXCIsIFwiRW52XCIsIFwiTWVtb3J5XCIsIFwiU2l6ZU9uRGlza1wiLCBcIlN0YXRlXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKEFEU1IsIERPT00sIEVudiwgTWVtb3J5LCBTaXplT25EaXNrLCBTdGF0ZSktPlxuICB7IGV4ZWMgfSA9IHJlcXVpcmUgXCJjaGlsZF9wcm9jZXNzXCJcblxuICBtZXRhID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcInRpdGxlLWJhciAubWV0YVwiXG5cbiAgIyBUT0RPOiBUaGlzIHNob3VsZCBiZSBtb3ZlZCB0byBhIGJhY2tncm91bmQgcHJvY2VzcywgcGVyaGFwcyBEQiwgb3IgcGVyaGFwcyBzb21ld2hlcmUgZWxzZSxcbiAgIyBzaW5jZSB0aGUgY2hpbGRfcHJvY2Vzcy5leGVjIHRha2VzIGFib3V0IDUwbXMgdG8gcnVuLlxuICBTdGF0ZS5zdWJzY3JpYmUgXCJhc3NldFwiLCBmYWxzZSwgQURTUiAwLCA1MDAwLCAoYXNzZXQpLT4gaWYgYXNzZXQ/XG4gICAgaWYgRW52LmlzTWFjXG4gICAgICBzaXplID0gYXdhaXQgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgICAgZXhlYyBcImR1IC1zaCAnI3thc3NldC5wYXRofSdcIiwgKGVyciwgdmFsKS0+XG4gICAgICAgICAgcmVzb2x2ZSBlcnIgb3IgKHZhbC5zcGxpdChcIlxcdFwiKVswXSArIFwiQlwiKS5yZXBsYWNlKFwiQkJcIiwgXCJCXCIpXG4gICAgZWxzZVxuICAgICAgc2l6ZSA9IGF3YWl0IFNpemVPbkRpc2sucHJldHR5IGFzc2V0LnBhdGhcblxuICAgIGZyYWcgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpXG5cbiAgICBlbG0gPSBET09NLmNyZWF0ZSBcImRpdlwiLCBmcmFnLCB0ZXh0Q29udGVudDogXCJJRFwiXG4gICAgRE9PTS5jcmVhdGUgXCJzcGFuXCIsIGVsbSwgdGV4dENvbnRlbnQ6IFN0YXRlKFwiYXNzZXRcIikuaWRcblxuICAgIGVsbSA9IERPT00uY3JlYXRlIFwiZGl2XCIsIGZyYWcsIHRleHRDb250ZW50OiBcIlNpemVcIlxuICAgIERPT00uY3JlYXRlIFwic3BhblwiLCBlbG0sIHRleHRDb250ZW50OiBzaXplXG5cbiAgICBtZXRhLnJlcGxhY2VDaGlsZHJlbiBmcmFnXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvdG9vbC1iYXIvYWRkLWZpbGVzLmNvZmZlZVxuVGFrZSBbXCJEQlwiLCBcIkVudlwiLCBcIklQQ1wiLCBcIkxvZ1wiLCBcIlBhdGhzXCIsIFwiU3RhdGVcIiwgXCJXcml0ZVwiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChEQiwgRW52LCBJUEMsIExvZywgUGF0aHMsIFN0YXRlLCBXcml0ZSktPlxuXG4gIGVsbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJbYWRkLWZpbGVzXVwiXG5cbiAgZWxtLm9uY2xpY2sgPSAoKS0+XG4gICAgaWYgRW52LmlzTWFjXG4gICAgICByZXMgPSBhd2FpdCBJUEMuaW52b2tlIFwic2hvd09wZW5EaWFsb2dcIixcbiAgICAgICAgcHJvcGVydGllczogW1wib3BlbkRpcmVjdG9yeVwiLCBcIm9wZW5GaWxlXCIsIFwibXVsdGlTZWxlY3Rpb25zXCJdXG4gICAgZWxzZVxuICAgICAgcmVzID0gYXdhaXQgSVBDLmludm9rZSBcInNob3dPcGVuRGlhbG9nXCIsXG4gICAgICAgIHByb3BlcnRpZXM6IFtcIm9wZW5GaWxlXCIsIFwibXVsdGlTZWxlY3Rpb25zXCJdICMgVE9ETzogV2luZG93cyBjYW4ndCBkbyBhIG1peGVkIGZpbGUrZGlyZWN0b3J5IG9wZW4gZGlhbG9nIT8gaHR0cHM6Ly93d3cuZWxlY3Ryb25qcy5vcmcvZG9jcy9sYXRlc3QvYXBpL2RpYWxvZyNkaWFsb2dzaG93b3BlbmRpYWxvZ2Jyb3dzZXJ3aW5kb3ctb3B0aW9uc1xuICAgIHVubGVzcyByZXMuY2FuY2VsbGVkXG4gICAgICBhc3NldCA9IFN0YXRlIFwiYXNzZXRcIlxuICAgICAgREIuc2VuZCBcIkFkZCBGaWxlc1wiLCBhc3NldC5pZCwgcmVzLmZpbGVQYXRoc1xuXG5cblxuIyBhc3NldC9jb21wb25lbnRzL3Rvb2wtYmFyL2ZpbGUtdG9vbHMuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJNZW1vcnlcIiwgXCJTdGF0ZVwiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChET09NLCBNZW1vcnksIFN0YXRlKS0+XG5cbiAgZmlsZVRvb2xzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcImZpbGUtdG9vbHNcIlxuICBmaWxlQ291bnQgPSBmaWxlVG9vbHMucXVlcnlTZWxlY3RvciBcIltmaWxlLWNvdW50XVwiXG4gIHNlYXJjaEJveCA9IGZpbGVUb29scy5xdWVyeVNlbGVjdG9yIFwic2VhcmNoLWJveFwiXG5cbiAgcmVuZGVyID0gKCktPlxuICAgIERPT00gZmlsZUNvdW50LCBpbm5lckhUTUw6IFN0cmluZy5wbHVyYWxpemUoU3RhdGUoXCJhc3NldFwiKS5maWxlcy5jb3VudCwgXCIlJSA8c3Bhbj5GaWxlXCIpICsgXCI8L3NwYW4+XCJcblxuICBNYWtlLmFzeW5jIFwiRmlsZVRvb2xzXCIsIEZpbGVUb29scyA9XG4gICAgcmVuZGVyOiByZW5kZXJcblxuXG5cbiMgYXNzZXQvY29tcG9uZW50cy90b29sLWJhci9tYWdpYy1idXR0b24uY29mZmVlXG5UYWtlIFtcIkRCXCIsIFwiRE9PTVwiLCBcIkVudlwiLCBcIkxvZ1wiLCBcIlN0YXRlXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKERCLCBET09NLCBFbnYsIExvZywgU3RhdGUpLT5cblxuICByZXR1cm4gdW5sZXNzIEVudi5pc0RldlxuXG4gIGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJbbWFnaWMtYnV0dG9uXVwiXG4gIERPT00gYnV0dG9uLCBkaXNwbGF5OiBcImJsb2NrXCJcblxuICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lciBcImNsaWNrXCIsICgpLT5cbiAgICBpZiBhc3NldCA9IFN0YXRlIFwiYXNzZXRcIlxuICAgICAgREIuc2VuZCBcIlJlYnVpbGQgVGh1bWJuYWlsXCIsIGFzc2V0LmlkXG5cblxuXG4jIGFzc2V0L2NvbXBvbmVudHMvdG9vbC1iYXIvbWV0YS10b29scy5jb2ZmZWVcblRha2UgW1wiREJcIiwgXCJET09NXCIsIFwiRW52XCIsIFwiSG9sZFRvUnVuXCIsIFwiSVBDXCIsIFwiTWVtb3J5XCIsIFwiUGF0aHNcIiwgXCJTdGF0ZVwiLCBcIldyaXRlXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKERCLCBET09NLCBFbnYsIEhvbGRUb1J1biwgSVBDLCBNZW1vcnksIFBhdGhzLCBTdGF0ZSwgV3JpdGUpLT5cbiAgeyBzaGVsbCB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcblxuICBwaW5VbnBpbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJbcGluLXVucGluXVwiXG4gIGRlbGV0ZUFzc2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIltkZWxldGUtYXNzZXRdXCJcbiAgc2hvd0luRmluZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIltzaG93LWluLWZpbmRlcl1cIlxuXG4gIGlmICFFbnYuaXNNYWNcbiAgICBzaG93SW5GaW5kZXIucXVlcnlTZWxlY3RvcihcInNwYW5cIikudGV4dENvbnRlbnQgPSBcImluIEV4cGxvcmVyXCJcblxuICBzaG93SW5GaW5kZXIub25jbGljayA9ICgpLT5cbiAgICBzaGVsbC5zaG93SXRlbUluRm9sZGVyIFN0YXRlKFwiYXNzZXRcIikucGF0aFxuXG4gIEhvbGRUb1J1biBkZWxldGVBc3NldCwgMTAwMCwgKCktPlxuICAgIGFzc2V0ID0gU3RhdGUgXCJhc3NldFwiXG4gICAgREIuc2VuZCBcIkRlbGV0ZSBBc3NldFwiLCBhc3NldC5pZFxuICAgIElQQy5zZW5kIFwiY2xvc2Utd2luZG93XCJcblxuICByZW5kZXIgPSAoKS0+XG4gICAgRE9PTSBwaW5VbnBpbiwgdGV4dENvbnRlbnQ6IGlmIFN0YXRlKFwiYXNzZXRcIikucGlubmVkIHRoZW4gXCJVbnBpblwiIGVsc2UgXCJQaW5cIlxuXG4gIE1ha2UuYXN5bmMgXCJNZXRhVG9vbHNcIiwgTWV0YVRvb2xzID1cbiAgICByZW5kZXI6IHJlbmRlclxuXG5cblxuIyBhc3NldC9jb21wb25lbnRzL3Rvb2wtYmFyL3BhbmUtc3BsaXQuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG4gIFNwbGl0ID0gcmVxdWlyZSBcInNwbGl0LWdyaWRcIlxuXG4gIHBhbmVTcGxpdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJwYW5lLXNwbGl0XCJcbiAgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIm1haW5cIlxuXG4gIFNwbGl0XG4gICAgY29sdW1uR3V0dGVyczogW1xuICAgICAgdHJhY2s6IDFcbiAgICAgIGVsZW1lbnQ6IHBhbmVTcGxpdFxuICAgIF1cblxuICAjIE9uIGRvdWJsZSBjbGljaywgcmVzZXQgdGhlIHNwbGl0IHRvIHRoZSBjZW50ZXJcbiAgbGFzdENsaWNrVGltZSA9IDBcbiAgcGFuZVNwbGl0LmFkZEV2ZW50TGlzdGVuZXIgXCJtb3VzZWRvd25cIiwgKCktPlxuICAgICMgU3BsaXQtZ3JpZCBwdXRzIGEgcHJldmVudERlZmF1bHQgY2FsbCBvbiBtb3VzZWRvd24sIHNvIHdlIGhhdmUgdG8gaW1wbGVtZW50IG91ciBvd24gZGJsY2xpY2sgbG9naWNcbiAgICBpZiBwZXJmb3JtYW5jZS5ub3coKSA8IGxhc3RDbGlja1RpbWUgKyAzMDBcbiAgICAgIGNvbnRhaW5lci5zdHlsZVtcImdyaWQtdGVtcGxhdGUtY29sdW1uc1wiXSA9IFwiMWZyIDZweCAxZnJcIiAjIE11c3QgbWlycm9yIHRoZSB2YWx1ZSBpbiBtYWluLnNjc3NcbiAgICBsYXN0Q2xpY2tUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcblxuXG5cbiMgYXNzZXQvY29tcG9uZW50cy90b29sLWJhci90aHVtYm5haWwtc2l6ZS5jb2ZmZWVcblRha2UgW1wiQURTUlwiLCBcIkRPT01cIiwgXCJNZW1vcnlcIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoQURTUiwgRE9PTSwgTWVtb3J5KS0+XG5cbiAgbmV3U2l6ZSA9IDFcbiAgb2xkU2l6ZSA9IDFcblxuICBzbGlkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwiW3RodW1ibmFpbC1zaXplXVwiXG4gIHNjcm9sbGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcImZpbGUtbGlzdFwiXG5cbiAgdXBkYXRlID0gQURTUiAxLCAxLCAoKS0+XG4gICAgcmV0dXJuIHVubGVzcyBuZXdTaXplIGlzbnQgb2xkU2l6ZVxuICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuc2V0UHJvcGVydHkgXCItLWFzc2V0LXRodW1ibmFpbC1zaXplXCIsIG5ld1NpemUgKyBcImVtXCJcbiAgICBzY2FsZSA9IG5ld1NpemUvb2xkU2l6ZVxuICAgIG9sZFNpemUgPSBuZXdTaXplXG4gICAgc2Nyb2xsZXIuc2Nyb2xsVG9wICo9IHNjYWxlXG4gICAgTWVtb3J5IFwiYXNzZXRUaHVtYm5haWxTaXplXCIsIG5ld1NpemVcblxuICB1cGRhdGUoKVxuXG4gIHNsaWRlci5vbmlucHV0ID0gc2xpZGVyLm9uY2hhbmdlID0gKGUpLT5cbiAgICBuZXdTaXplID0gc2xpZGVyLnZhbHVlXG4gICAgTWVtb3J5IFwiYXNzZXRUaHVtYm5haWxTaXplXCIsIG5ld1NpemVcbiAgICB1cGRhdGUoKVxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgXCJhc3NldFRodW1ibmFpbFNpemVcIiwgdHJ1ZSwgKHYpLT5cbiAgICByZXR1cm4gdW5sZXNzIHY/XG4gICAgbmV3U2l6ZSA9IHZcbiAgICBzbGlkZXIudmFsdWUgPSBuZXdTaXplIHVubGVzcyBzbGlkZXIudmFsdWUgaXMgbmV3U2l6ZVxuICAgIHVwZGF0ZSgpXG4iXX0=
//# sourceURL=coffeescript
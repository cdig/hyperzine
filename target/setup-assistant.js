  // setup-assistant/coffee/gear-view.coffee
  // We keep this separate from the main setup-assistant.coffee so that it can run immediately, and not wait on other systems like IPC
var shell,
  indexOf = [].indexOf;

Take(["GearView"], function(GearView) {
  return GearView(60, -99);
});

// setup-assistant/setup-assistant.coffee
({shell} = require("electron"));

Take(["DOOM", "Env", "IPC", "Log", "Memory", "Read"], function(DOOM, Env, IPC, Log, Memory, Read) {
  var apiTokenValid, clearFocus, click, elm, elms, fieldHint, focus, i, inputIsFocused, inputs, len, localNameValid, n, previousInputValue, q, ref, resetValue, to, updateApiTokenButtons, wait;
  previousInputValue = null;
  q = function(k) {
    return document.querySelector(k); // Ugh so repetitive
  };
  elms = {
    pathReason: q("[path-reason]"),
    dataFolder: q("[data-folder]"),
    localName: q("[local-name]"),
    apiToken: q("[api-token]"),
    existingAssets: q("[existing-assets]")
  };
  inputs = [];
  focus = function(e) {
    return previousInputValue = e.currentTarget.textContent;
  };
  ref = ["localName"];
  for (i = 0, len = ref.length; i < len; i++) {
    n = ref[i];
    inputs.push(elm = elms[n]);
    elm.addEventListener("focus", focus);
  }
  click = function(n, fn) {
    return q(n).onclick = fn;
  };
  wait = function() {
    return new Promise(function(resolve) {
      var waitTime;
      waitTime = parseInt(document.documentElement.computedStyleMap().get("--time")[0]);
      return setTimeout(resolve, waitTime * 1000);
    });
  };
  to = function(n) {
    return async function() {
      document.body.className = n;
      if (elm = q("[is-showing]")) {
        DOOM(elm, {
          isShowing: null,
          pointerEvents: null
        });
      }
      elm = document.getElementById(n);
      DOOM(elm, {
        isShowing: ""
      });
      clearFocus();
      await wait(); // unless Env.isDev
      return DOOM(elm, {
        pointerEvents: "auto"
      });
    };
  };
  inputIsFocused = function() {
    var ref1;
    return ref1 = document.activeElement, indexOf.call(inputs, ref1) >= 0;
  };
  clearFocus = function() {
    document.activeElement.blur();
    return window.getSelection().empty();
  };
  resetValue = function() {
    return document.activeElement.textContent = previousInputValue;
  };
  // Block newlines in typable fields (needs to be keydown to avoid flicker)
  window.addEventListener("keydown", function(e) {
    if (e.keyCode === 13) {
      return e.preventDefault();
    }
  });
  // Alternative to clicking buttons (needs to be keyup to avoid inadvertant key repeat)
  window.addEventListener("keydown", function(e) {
    var ref1, ref2;
    switch (e.keyCode) {
      case 13:
        return (ref1 = q("[is-showing] [next-button]")) != null ? ref1.click() : void 0;
      case 27:
        if (inputIsFocused()) {
          resetValue();
          return clearFocus();
        } else {
          return (ref2 = q("[is-showing] [back-button]")) != null ? ref2.click() : void 0;
        }
    }
  });
  // Screens #######################################################################################

  // Init
  to("welcome")();
  // Welcome
  click("[quit-button]", function() {
    return IPC.send(Memory("setupDone") ? "close-window" : "quit");
  });
  Memory.subscribe("setupDone", true, function(v) {
    return q("[quit-button]").textContent = v ? "Close" : "Quit";
  });
  click("#welcome [next-button]", to("data-folder"));
  // Data Folder
  click("#data-folder [back-button]", to("welcome"));
  click("#data-folder [select-folder]", async function() {
    var newFolder, res;
    res = (await IPC.invoke("showOpenDialog", {
      defaultPath: Env.home,
      properties: ["openDirectory", "createDirectory"]
    }));
    if (!res.cancelled) {
      newFolder = res.filePaths[0];
      return Memory.change("dataFolder", newFolder);
    }
  });
  Memory.subscribe("dataFolder", true, function(v) {
    var display;
    if (v == null) {
      return;
    }
    display = v;
    if (display !== Env.home) {
      display = display.replace(Env.home, "");
    }
    if (display.charAt(0) === Read.sep) {
      display = display.slice(1);
    }
    elms.dataFolder.textContent = display;
    elms.pathReason.textContent = v === Env.defaultDataFolder ? "This Dropbox folder is the default:" : "This is the folder you selected:";
    return elms.existingAssets.textContent = "Scanning asset folder…";
  });
  click("#data-folder [next-button]", async function() {
    return to((await Read.isFolder(Memory("dataFolder"))) ? "existing-assets" : "path-error")();
  });
  // Path Error
  click("#path-error [back-button]", to("data-folder"));
  // Existing Assets
  click("#existing-assets [back-button]", to("data-folder"));
  Memory.subscribe("assets", true, function(v) {
    var count;
    if (v == null) {
      return;
    }
    count = Object.keys(v).length;
    return elms.existingAssets.textContent = String.pluralize(count, "Found %% Asset");
  });
  click("#existing-assets [next-button]", to("local-name"));
  // Local Name
  click("#local-name [back-button]", to("existing-assets"));
  Memory.subscribe("localName", true, function(v) {
    return elms.localName.textContent = v;
  });
  localNameValid = function() {
    return -1 === elms.localName.textContent.trim().search(/[^\w\d ]/);
  };
  elms.localName.addEventListener("input", function(e) {
    return elms.localName.className = localNameValid() ? "field" : "field invalid";
  });
  click("#local-name [next-button]", function() {
    var v;
    v = elms.localName.textContent.trim();
    if (!(v.length && localNameValid())) {
      return;
    }
    // TODO: check whether any assets already exist using the local name. If so, show a warning. Otherwise...
    Memory.change("localName", v);
    return to("api-token")();
  });
  // API Token
  click("#api-token [back-button]", to("local-name"));
  fieldHint = "Paste API Token Here";
  apiTokenValid = function() {
    var v;
    v = elms.apiToken.textContent.trim();
    return v !== "" && v !== fieldHint;
  };
  updateApiTokenButtons = function(e) {
    var valid;
    valid = apiTokenValid();
    DOOM(q("#api-token [get-a-token]"), {
      display: valid ? "none" : "block"
    });
    return DOOM(q("#api-token [next-button]"), {
      display: valid ? "block" : "none"
    });
  };
  elms.apiToken.addEventListener("focus", function() {
    if (!apiTokenValid()) {
      return elms.apiToken.textContent = "";
    }
  });
  elms.apiToken.addEventListener("blur", function() {
    if (!apiTokenValid()) {
      return elms.apiToken.textContent = fieldHint;
    }
  });
  elms.apiToken.addEventListener("input", updateApiTokenButtons);
  elms.apiToken.addEventListener("change", updateApiTokenButtons);
  Memory.subscribe("apiToken", true, function(v) {
    elms.apiToken.textContent = v || fieldHint;
    return updateApiTokenButtons();
  });
  click("#api-token [get-a-token]", function() {
    return shell.openExternal("https://www.lunchboxsessions.com/admin/api-tokens");
  });
  click("#api-token [next-button]", function() {
    Memory.change("apiToken", elms.apiToken.textContent.trim());
    return to("setup-done")();
  });
  // Setup Done
  click("#setup-done [back-button]", to("api-token"));
  return click("#setup-done [next-button]", function() {
    Memory.change("setupDone", true);
    IPC.send("config-ready");
    return IPC.send("close-window");
  });
});

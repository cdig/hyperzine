// setup-assistant/coffee/gear-view.coffee
// We keep this separate from the main setup-assistant.coffee so that it can run immediately, and not wait on other systems like IPC
var indexOf = [].indexOf;

Take(["GearView"], function(GearView) {
  return GearView(60, -99);
});

// setup-assistant/setup-assistant.coffee
Take(["DOOM", "Env", "IPC", "Log", "Memory", "Read", "DOMContentLoaded"], function(DOOM, Env, IPC, Log, Memory, Read) {
  var clearFocus, click, elm, elms, focus, i, inputIsFocused, inputs, len, localNameValid, n, previousInputValue, q, ref, resetValue, to, wait;
  previousInputValue = null;
  q = function(k) {
    return document.querySelector(k); // Ugh so repetitive
  };
  elms = {
    pathReason: q("[path-reason]"),
    dataFolder: q("[data-folder]"),
    localName: q("[local-name]"),
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
    return -1 === elms.localName.textContent.trim().search(/[^\w ]/);
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
    return to("setup-done")();
  });
  // Setup Done
  click("#setup-done [back-button]", to("local-name"));
  return click("#setup-done [next-button]", function() {
    Memory.change("setupDone", true);
    IPC.send("config-ready");
    return IPC.send("close-window");
  });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ21JOztBQUFBLElBQUE7O0FBQ25JLElBQUEsQ0FBSyxDQUFDLFVBQUQsQ0FBTCxFQUFtQixRQUFBLENBQUMsUUFBRCxDQUFBO1NBQ2pCLFFBQUEsQ0FBUyxFQUFULEVBQWEsQ0FBQyxFQUFkO0FBRGlCLENBQW5CLEVBRG1JOzs7QUFPbkksSUFBQSxDQUFLLENBQUMsTUFBRCxFQUFTLEtBQVQsRUFBZ0IsS0FBaEIsRUFBdUIsS0FBdkIsRUFBOEIsUUFBOUIsRUFBd0MsTUFBeEMsRUFBZ0Qsa0JBQWhELENBQUwsRUFBMEUsUUFBQSxDQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksR0FBWixFQUFpQixHQUFqQixFQUFzQixNQUF0QixFQUE4QixJQUE5QixDQUFBO0FBRTFFLE1BQUEsVUFBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUEsY0FBQSxFQUFBLE1BQUEsRUFBQSxHQUFBLEVBQUEsY0FBQSxFQUFBLENBQUEsRUFBQSxrQkFBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLEVBQUEsRUFBQTtFQUFFLGtCQUFBLEdBQXFCO0VBRXJCLENBQUEsR0FBSSxRQUFBLENBQUMsQ0FBRCxDQUFBO1dBQU0sUUFBUSxDQUFDLGFBQVQsQ0FBdUIsQ0FBdkIsRUFBTjtFQUFBO0VBRUosSUFBQSxHQUNFO0lBQUEsVUFBQSxFQUFZLENBQUEsQ0FBRSxlQUFGLENBQVo7SUFDQSxVQUFBLEVBQVksQ0FBQSxDQUFFLGVBQUYsQ0FEWjtJQUVBLFNBQUEsRUFBVyxDQUFBLENBQUUsY0FBRixDQUZYO0lBR0EsY0FBQSxFQUFnQixDQUFBLENBQUUsbUJBQUY7RUFIaEI7RUFLRixNQUFBLEdBQVM7RUFFVCxLQUFBLEdBQVEsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFNLGtCQUFBLEdBQXFCLENBQUMs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UUFBQSxDQUFBLENBQUE7QUFDZixXQUFPLENBQUMsQ0FBRCxLQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQTNCLENBQUEsQ0FBaUMsQ0FBQyxNQUFsQyxDQUF5QyxRQUF6QztFQURFO0VBR2pCLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWYsQ0FBZ0MsT0FBaEMsRUFBeUMsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQWYsR0FBOEIsY0FBQSxDQUFBLENBQUgsR0FBeUIsT0FBekIsR0FBc0M7RUFEMUIsQ0FBekM7RUFHQSxLQUFBLENBQU0sMkJBQU4sRUFBbUMsUUFBQSxDQUFBLENBQUE7QUFDckMsUUFBQTtJQUFJLENBQUEsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUEzQixDQUFBO0lBQ0osTUFBYyxDQUFDLENBQUMsTUFBRixJQUFhLGNBQUEsQ0FBQSxFQUEzQjtBQUFBLGFBQUE7S0FESjs7SUFHSSxNQUFNLENBQUMsTUFBUCxDQUFjLFdBQWQsRUFBMkIsQ0FBM0I7V0FDRyxFQUFBLENBQUcsWUFBSDtFQUw4QixDQUFuQyxFQWpJRjs7RUF5SUUsS0FBQSxDQUFNLDJCQUFOLEVBQW1DLEVBQUEsQ0FBRyxZQUFILENBQW5DO1NBQ0EsS0FBQSxDQUFNLDJCQUFOLEVBQW1DLFFBQUEsQ0FBQSxDQUFBO0lBQ2pDLE1BQU0sQ0FBQyxNQUFQLENBQWMsV0FBZCxFQUEyQixJQUEzQjtJQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsY0FBVDtXQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsY0FBVDtFQUhpQyxDQUFuQztBQTVJd0UsQ0FBMUUiLCJzb3VyY2VzQ29udGVudCI6WyIjIHNldHVwLWFzc2lzdGFudC9jb2ZmZWUvZ2Vhci12aWV3LmNvZmZlZVxuIyBXZSBrZWVwIHRoaXMgc2VwYXJhdGUgZnJvbSB0aGUgbWFpbiBzZXR1cC1hc3Npc3RhbnQuY29mZmVlIHNvIHRoYXQgaXQgY2FuIHJ1biBpbW1lZGlhdGVseSwgYW5kIG5vdCB3YWl0IG9uIG90aGVyIHN5c3RlbXMgbGlrZSBJUENcblRha2UgW1wiR2VhclZpZXdcIl0sIChHZWFyVmlldyktPlxuICBHZWFyVmlldyA2MCwgLTk5XG5cblxuXG4jIHNldHVwLWFzc2lzdGFudC9zZXR1cC1hc3Npc3RhbnQuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJFbnZcIiwgXCJJUENcIiwgXCJMb2dcIiwgXCJNZW1vcnlcIiwgXCJSZWFkXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKERPT00sIEVudiwgSVBDLCBMb2csIE1lbW9yeSwgUmVhZCktPlxuXG4gIHByZXZpb3VzSW5wdXRWYWx1ZSA9IG51bGxcblxuICBxID0gKGspLT4gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBrICMgVWdoIHNvIHJlcGV0aXRpdmVcblxuICBlbG1zID1cbiAgICBwYXRoUmVhc29uOiBxIFwiW3BhdGgtcmVhc29uXVwiXG4gICAgZGF0YUZvbGRlcjogcSBcIltkYXRhLWZvbGRlcl1cIlxuICAgIGxvY2FsTmFtZTogcSBcIltsb2NhbC1uYW1lXVwiXG4gICAgZXhpc3RpbmdBc3NldHM6IHEgXCJbZXhpc3RpbmctYXNzZXRzXVwiXG5cbiAgaW5wdXRzID0gW11cblxuICBmb2N1cyA9IChlKS0+IHByZXZpb3VzSW5wdXRWYWx1ZSA9IGUuY3VycmVudFRhcmdldC50ZXh0Q29udGVudFxuXG4gIGZvciBuIGluIFtcImxvY2FsTmFtZVwiXVxuICAgIGlucHV0cy5wdXNoIGVsbSA9IGVsbXNbbl1cbiAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lciBcImZvY3VzXCIsIGZvY3VzXG5cbiAgY2xpY2sgPSAobiwgZm4pLT5cbiAgICBxKG4pLm9uY2xpY2sgPSBmblxuXG4gIHdhaXQgPSAoKS0+XG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgIHdhaXRUaW1lID0gcGFyc2VJbnQgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNvbXB1dGVkU3R5bGVNYXAoKS5nZXQoXCItLXRpbWVcIilbMF1cbiAgICAgIHNldFRpbWVvdXQgcmVzb2x2ZSwgd2FpdFRpbWUgKiAxMDAwXG5cbiAgdG8gPSAobiktPiAoKS0+XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc05hbWUgPSBuXG4gICAgaWYgZWxtID0gcShcIltpcy1zaG93aW5nXVwiKVxuICAgICAgRE9PTSBlbG0sIGlzU2hvd2luZzogbnVsbCwgcG9pbnRlckV2ZW50czogbnVsbFxuICAgIGVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIG5cbiAgICBET09NIGVsbSwgaXNTaG93aW5nOiBcIlwiXG4gICAgY2xlYXJGb2N1cygpXG4gICAgYXdhaXQgd2FpdCgpIyB1bmxlc3MgRW52LmlzRGV2XG4gICAgRE9PTSBlbG0sIHBvaW50ZXJFdmVudHM6IFwiYXV0b1wiXG5cbiAgaW5wdXRJc0ZvY3VzZWQgPSAoKS0+XG4gICAgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBpbiBpbnB1dHNcblxuICBjbGVhckZvY3VzID0gKCktPlxuICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuYmx1cigpXG4gICAgd2luZG93LmdldFNlbGVjdGlvbigpLmVtcHR5KClcblxuICByZXNldFZhbHVlID0gKCktPlxuICAgIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQudGV4dENvbnRlbnQgPSBwcmV2aW91c0lucHV0VmFsdWVcblxuICAjIEJsb2NrIG5ld2xpbmVzIGluIHR5cGFibGUgZmllbGRzIChuZWVkcyB0byBiZSBrZXlkb3duIHRvIGF2b2lkIGZsaWNrZXIpXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyIFwia2V5ZG93blwiLCAoZSktPlxuICAgIGUucHJldmVudERlZmF1bHQoKSBpZiBlLmtleUNvZGUgaXMgMTNcblxuICAjIEFsdGVybmF0aXZlIHRvIGNsaWNraW5nIGJ1dHRvbnMgKG5lZWRzIHRvIGJlIGtleXVwIHRvIGF2b2lkIGluYWR2ZXJ0YW50IGtleSByZXBlYXQpXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyIFwia2V5ZG93blwiLCAoZSktPlxuICAgIHN3aXRjaCBlLmtleUNvZGVcbiAgICAgIHdoZW4gMTNcbiAgICAgICAgcShcIltpcy1zaG93aW5nXSBbbmV4dC1idXR0b25dXCIpPy5jbGljaygpXG5cbiAgICAgIHdoZW4gMjdcbiAgICAgICAgaWYgaW5wdXRJc0ZvY3VzZWQoKVxuICAgICAgICAgIHJlc2V0VmFsdWUoKVxuICAgICAgICAgIGNsZWFyRm9jdXMoKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgcShcIltpcy1zaG93aW5nXSBbYmFjay1idXR0b25dXCIpPy5jbGljaygpXG5cblxuICAjIFNjcmVlbnMgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiAgIyBJbml0XG4gIGRvIHRvIFwid2VsY29tZVwiXG5cbiAgIyBXZWxjb21lXG4gIGNsaWNrIFwiW3F1aXQtYnV0dG9uXVwiLCAoKS0+XG4gICAgSVBDLnNlbmQgaWYgTWVtb3J5IFwic2V0dXBEb25lXCIgdGhlbiBcImNsb3NlLXdpbmRvd1wiIGVsc2UgXCJxdWl0XCJcblxuICBNZW1vcnkuc3Vic2NyaWJlIFwic2V0dXBEb25lXCIsIHRydWUsICh2KS0+XG4gICAgcShcIltxdWl0LWJ1dHRvbl1cIikudGV4dENvbnRlbnQgPSBpZiB2IHRoZW4gXCJDbG9zZVwiIGVsc2UgXCJRdWl0XCJcblxuICBjbGljayBcIiN3ZWxjb21lIFtuZXh0LWJ1dHRvbl1cIiwgdG8gXCJkYXRhLWZvbGRlclwiXG5cbiAgIyBEYXRhIEZvbGRlclxuICBjbGljayBcIiNkYXRhLWZvbGRlciBbYmFjay1idXR0b25dXCIsIHRvIFwid2VsY29tZVwiXG5cbiAgY2xpY2sgXCIjZGF0YS1mb2xkZXIgW3NlbGVjdC1mb2xkZXJdXCIsICgpLT5cbiAgICByZXMgPSBhd2FpdCBJUEMuaW52b2tlIFwic2hvd09wZW5EaWFsb2dcIixcbiAgICAgIGRlZmF1bHRQYXRoOiBFbnYuaG9tZVxuICAgICAgcHJvcGVydGllczogW1wib3BlbkRpcmVjdG9yeVwiLCBcImNyZWF0ZURpcmVjdG9yeVwiXVxuICAgIHVubGVzcyByZXMuY2FuY2VsbGVkXG4gICAgICBuZXdGb2xkZXIgPSByZXMuZmlsZVBhdGhzWzBdXG4gICAgICBNZW1vcnkuY2hhbmdlIFwiZGF0YUZvbGRlclwiLCBuZXdGb2xkZXJcblxuICBNZW1vcnkuc3Vic2NyaWJlIFwiZGF0YUZvbGRlclwiLCB0cnVlLCAodiktPlxuICAgIHJldHVybiB1bmxlc3Mgdj9cbiAgICBkaXNwbGF5ID0gdlxuICAgIGRpc3BsYXkgPSBkaXNwbGF5LnJlcGxhY2UgRW52LmhvbWUsIFwiXCIgdW5sZXNzIGRpc3BsYXkgaXMgRW52LmhvbWVcbiAgICBkaXNwbGF5ID0gZGlzcGxheS5zbGljZSAxIGlmIGRpc3BsYXkuY2hhckF0KDApIGlzIFJlYWQuc2VwXG4gICAgZWxtcy5kYXRhRm9sZGVyLnRleHRDb250ZW50ID0gZGlzcGxheVxuICAgIGVsbXMucGF0aFJlYXNvbi50ZXh0Q29udGVudCA9IGlmIHYgaXMgRW52LmRlZmF1bHREYXRhRm9sZGVyXG4gICAgICBcIlRoaXMgRHJvcGJveCBmb2xkZXIgaXMgdGhlIGRlZmF1bHQ6XCJcbiAgICBlbHNlXG4gICAgICBcIlRoaXMgaXMgdGhlIGZvbGRlciB5b3Ugc2VsZWN0ZWQ6XCJcbiAgICBlbG1zLmV4aXN0aW5nQXNzZXRzLnRleHRDb250ZW50ID0gXCJTY2FubmluZyBhc3NldCBmb2xkZXLigKZcIlxuXG4gIGNsaWNrIFwiI2RhdGEtZm9sZGVyIFtuZXh0LWJ1dHRvbl1cIiwgKCktPlxuICAgIGRvIHRvIGlmIGF3YWl0IFJlYWQuaXNGb2xkZXIgTWVtb3J5IFwiZGF0YUZvbGRlclwiIHRoZW4gXCJleGlzdGluZy1hc3NldHNcIiBlbHNlIFwicGF0aC1lcnJvclwiXG5cbiAgIyBQYXRoIEVycm9yXG4gIGNsaWNrIFwiI3BhdGgtZXJyb3IgW2JhY2stYnV0dG9uXVwiLCB0byBcImRhdGEtZm9sZGVyXCJcblxuICAjIEV4aXN0aW5nIEFzc2V0c1xuICBjbGljayBcIiNleGlzdGluZy1hc3NldHMgW2JhY2stYnV0dG9uXVwiLCB0byBcImRhdGEtZm9sZGVyXCJcblxuICBNZW1vcnkuc3Vic2NyaWJlIFwiYXNzZXRzXCIsIHRydWUsICh2KS0+XG4gICAgcmV0dXJuIHVubGVzcyB2P1xuICAgIGNvdW50ID0gT2JqZWN0LmtleXModikubGVuZ3RoXG4gICAgZWxtcy5leGlzdGluZ0Fzc2V0cy50ZXh0Q29udGVudCA9IFN0cmluZy5wbHVyYWxpemUgY291bnQsIFwiRm91bmQgJSUgQXNzZXRcIlxuXG4gIGNsaWNrIFwiI2V4aXN0aW5nLWFzc2V0cyBbbmV4dC1idXR0b25dXCIsIHRvIFwibG9jYWwtbmFtZVwiXG5cbiAgIyBMb2NhbCBOYW1lXG4gIGNsaWNrIFwiI2xvY2FsLW5hbWUgW2JhY2stYnV0dG9uXVwiLCB0byBcImV4aXN0aW5nLWFzc2V0c1wiXG5cbiAgTWVtb3J5LnN1YnNjcmliZSBcImxvY2FsTmFtZVwiLCB0cnVlLCAodiktPlxuICAgIGVsbXMubG9jYWxOYW1lLnRleHRDb250ZW50ID0gdlxuXG4gIGxvY2FsTmFtZVZhbGlkID0gKCktPlxuICAgIHJldHVybiAtMSBpcyBlbG1zLmxvY2FsTmFtZS50ZXh0Q29udGVudC50cmltKCkuc2VhcmNoIC9bXlxcdyBdL1xuXG4gIGVsbXMubG9jYWxOYW1lLmFkZEV2ZW50TGlzdGVuZXIgXCJpbnB1dFwiLCAoZSktPlxuICAgIGVsbXMubG9jYWxOYW1lLmNsYXNzTmFtZSA9IGlmIGxvY2FsTmFtZVZhbGlkKCkgdGhlbiBcImZpZWxkXCIgZWxzZSBcImZpZWxkIGludmFsaWRcIlxuXG4gIGNsaWNrIFwiI2xvY2FsLW5hbWUgW25leHQtYnV0dG9uXVwiLCAoKS0+XG4gICAgdiA9IGVsbXMubG9jYWxOYW1lLnRleHRDb250ZW50LnRyaW0oKVxuICAgIHJldHVybiB1bmxlc3Mgdi5sZW5ndGggYW5kIGxvY2FsTmFtZVZhbGlkKClcbiAgICAjIFRPRE86IGNoZWNrIHdoZXRoZXIgYW55IGFzc2V0cyBhbHJlYWR5IGV4aXN0IHVzaW5nIHRoZSBsb2NhbCBuYW1lLiBJZiBzbywgc2hvdyBhIHdhcm5pbmcuIE90aGVyd2lzZS4uLlxuICAgIE1lbW9yeS5jaGFuZ2UgXCJsb2NhbE5hbWVcIiwgdlxuICAgIGRvIHRvIFwic2V0dXAtZG9uZVwiXG5cbiAgIyBTZXR1cCBEb25lXG4gIGNsaWNrIFwiI3NldHVwLWRvbmUgW2JhY2stYnV0dG9uXVwiLCB0byBcImxvY2FsLW5hbWVcIlxuICBjbGljayBcIiNzZXR1cC1kb25lIFtuZXh0LWJ1dHRvbl1cIiwgKCktPlxuICAgIE1lbW9yeS5jaGFuZ2UgXCJzZXR1cERvbmVcIiwgdHJ1ZVxuICAgIElQQy5zZW5kIFwiY29uZmlnLXJlYWR5XCJcbiAgICBJUEMuc2VuZCBcImNsb3NlLXdpbmRvd1wiXG4iXX0=
//# sourceURL=coffeescript
// node_modules/take-and-make/source/take-and-make.coffee
// Since this is typically the first bit of code included in our big compiled and
// concatenated JS files, this is a great place to demand strictness. CoffeeScript
// does not add strict on its own, but it will permit and enforce it.
"use strict";
var DebugTakeMake, Make, Take, Test, Tests,
  splice = [].splice,
  indexOf = [].indexOf;

if (!((typeof Take !== "undefined" && Take !== null) || (typeof Make !== "undefined" && Make !== null))) {
  // We declare our globals such that they're visible everywhere within the current scope.
  // This allows for namespacing — all things within a given scope share a copy of Take & Make.
  Take = null;
  Make = null;
  DebugTakeMake = null;
  (function() {
    var addListener, allNeedsAreMet, alreadyChecking, alreadyWaitingToNotify, asynchronousResolve, checkWaitingTakers, clone, made, microtasksNeeded, microtasksUsed, notify, notifyTakers, register, resolve, synchronousResolve, takersToNotify, waitingTakers;
    made = {};
    waitingTakers = [];
    takersToNotify = [];
    alreadyWaitingToNotify = false;
    alreadyChecking = false;
    microtasksNeeded = 0;
    microtasksUsed = 0;
    Make = function(name, value = name) {
      if (name == null) {
        // Debug — call Make() in the console to see what we've regstered
        return clone(made);
      }
      // Synchronous register, returns value
      return register(name, value);
    };
    Take = function(needs, callback) {
      if (needs == null) {
        // Debug — call Take() in the console to see what we're waiting for
        return waitingTakers.slice();
      }
      // Synchronous and asynchronous resolve, returns value or object of values
      return resolve(needs, callback);
    };
    // A variation of Make that defers committing the value
    Make.async = function(name, value = name) {
      return queueMicrotask(function() {
        return Make(name, value);
      });
    };
    // A variation of Take that returns a promise
    Take.async = function(needs) {
      return new Promise(function(res) {
        return Take(needs, function() {
          // Resolve the promise with a value or object of values
          return res(synchronousResolve(needs));
        });
      });
    };
    DebugTakeMake = function() {
      var base, j, l, len1, len2, need, output, ref, waiting;
      output = {
        microtasksNeeded: microtasksNeeded,
        microtasksUsed: microtasksUsed,
        unresolved: {}
      };
      for (j = 0, len1 = waitingTakers.length; j < len1; j++) {
        waiting = waitingTakers[j];
        ref = waiting.needs;
        for (l = 0, len2 = ref.length; l < len2; l++) {
          need = ref[l];
          if (made[need] == null) {
            if ((base = output.unresolved)[need] == null) {
              base[need] = 0;
            }
            output.unresolved[need]++;
          }
        }
      }
      return output;
    };
    register = function(name, value) {
      if (name === "") {
        throw new Error("You may not Make(\"\") an empty string.");
      }
      if (made[name] != null) {
        throw new Error(`You may not Make() the same name twice: ${name}`);
      }
      made[name] = value;
      checkWaitingTakers();
      return value;
    };
    checkWaitingTakers = function() {
      var index, j, len1, taker;
      if (alreadyChecking) { // Prevent recursion from Make() calls inside notify()
        return;
      }
      alreadyChecking = true;
// Depends on `waitingTakers`
// Comments below are to help reason through the (potentially) recursive behaviour
      for (index = j = 0, len1 = waitingTakers.length; j < len1; index = ++j) {
        taker = waitingTakers[index];
        if (allNeedsAreMet(taker.needs)) { // Depends on `made`
          waitingTakers.splice(index, 1); // Mutates `waitingTakers`
          notify(taker); // Calls to Make() or Take() will mutate `made` or `waitingTakers`
          alreadyChecking = false;
          return checkWaitingTakers(); // Restart: `waitingTakers` (and possibly `made`) were mutated
        }
      }
      return alreadyChecking = false;
    };
    allNeedsAreMet = function(needs) {
      return needs.every(function(name) {
        return made[name] != null;
      });
    };
    resolve = function(needs, callback) {
      if (callback != null) {
        // We always try to resolve both synchronously and asynchronously
        asynchronousResolve(needs, callback);
      }
      return synchronousResolve(needs);
    };
    asynchronousResolve = function(needs, callback) {
      var taker;
      if (needs === "") {
        needs = [];
      } else if (typeof needs === "string") {
        needs = [needs];
      }
      taker = {
        needs: needs,
        callback: callback
      };
      if (allNeedsAreMet(needs)) {
        takersToNotify.push(taker);
        microtasksNeeded++;
        if (!alreadyWaitingToNotify) {
          alreadyWaitingToNotify = true;
          queueMicrotask(notifyTakers); // Preserve asynchrony
          return microtasksUsed++;
        }
      } else {
        return waitingTakers.push(taker);
      }
    };
    synchronousResolve = function(needs) {
      var j, len1, n, o;
      if (typeof needs === "string") {
        return made[needs];
      } else {
        o = {};
        for (j = 0, len1 = needs.length; j < len1; j++) {
          n = needs[j];
          o[n] = made[n];
        }
        return o;
      }
    };
    notifyTakers = function() {
      var j, len1, taker, takers;
      alreadyWaitingToNotify = false;
      takers = takersToNotify;
      takersToNotify = [];
      for (j = 0, len1 = takers.length; j < len1; j++) {
        taker = takers[j];
        notify(taker);
      }
      return null;
    };
    notify = function(taker) {
      var resolvedNeeds;
      resolvedNeeds = taker.needs.map(function(name) {
        return made[name];
      });
      return taker.callback.apply(null, resolvedNeeds);
    };
    // IE11 doesn't support Object.assign({}, obj), so we just use our own
    clone = function(obj) {
      var k, out, v;
      out = {};
      for (k in obj) {
        v = obj[k];
        out[k] = v;
      }
      return out;
    };
    // We want to add a few handy one-time events.
    // However, we don't know if we'll be running in a browser, or in node.
    // Thus, we look for the presence of a "window" object as our clue.
    if (typeof window !== "undefined" && window !== null) {
      addListener = function(eventName) {
        var handler;
        return window.addEventListener(eventName, handler = function(eventObject) {
          window.removeEventListener(eventName, handler);
          Make(eventName, eventObject);
          return void 0; // prevent unload from opening a popup
        });
      };
      addListener("beforeunload");
      addListener("click");
      addListener("unload");
      // Since we have a window object, it's probably safe to assume we have a document object
      switch (document.readyState) {
        case "loading":
          addListener("DOMContentLoaded");
          addListener("load");
          break;
        case "interactive":
          Make("DOMContentLoaded");
          addListener("load");
          break;
        case "complete":
          Make("DOMContentLoaded");
          Make("load");
          break;
        default:
          throw new Error(`Unknown document.readyState: ${document.readyState}. Cannot setup Take&Make.`);
      }
    }
    // Finally, we're ready to hand over control to module systems
    if (typeof module !== "undefined" && module !== null) {
      return module.exports = {
        Take: Take,
        Make: Make,
        DebugTakeMake: DebugTakeMake
      };
    }
  })();
}

// submodule/bucket/adsr.coffee
// ADSR
// This gives your function an "attack" phase and a "release" phase
// (borrowing terminology from ADSR on synthesizers).
// The attack phase is a debounce — your function will run just once after the attack phase ends,
// no matter how many times it's called until then.
// When the function runs, it'll use the args from the most recent time it was called.
// The release is a throttle — if your function is called during the release phase,
// then after the release phase ends the attack phase will start over again.
// This is useful if you want a function that will run shortly after it's called (good for fast reactions)
// but doesn't run again until a while later (good for reducing strain).
// Attack and release are specified in ms, and are optional.
// If you pass a time of 0 ms for either the attack, release, or both, the phase will last until the next microtask.
// If you pass a time less than 5 ms, the phase will last until the next animation frame.
// It's idiomatic to pass a time of 1 ms if you want the next frame.
// We also keep a count of how many functions are currently waiting, and support adding watchers
// that will run a callback when the count changes, just in case you want to (for example)
// wait for them all to finish before quitting / closing, or monitor their performance.
Take([], function() {
  var ADSR, active, afterAttack, afterDelay, afterRelease, updateWatchers, watchers;
  active = new Map();
  watchers = [];
  Make.async("ADSR", ADSR = function(...arg1) {
    var attack, fn, ref, release;
    ref = arg1, [...arg1] = ref, [fn] = splice.call(arg1, -1);
    [attack = 0, release = 0] = arg1;
    return function(...args) {
      if (!active.has(fn)) {
        afterDelay(attack, afterAttack(fn, attack, release));
        ADSR.count++;
        updateWatchers();
      }
      return active.set(fn, {args}); // Always use the most recent args
    };
  });
  ADSR.count = 0;
  ADSR.watcher = function(watcher) {
    return watchers.push(watcher);
  };
  afterAttack = function(fn, attack, release) {
    return function() {
      var args;
      ({args} = active.get(fn));
      active.set(fn, {});
      fn(...args);
      return afterDelay(release, afterRelease(fn, attack, release));
    };
  };
  afterRelease = function(fn, attack, release) {
    return function() {
      var args;
      ({args} = active.get(fn));
      if (args) {
        return afterDelay(attack, afterAttack(fn, attack, release));
      } else {
        active.delete(fn);
        ADSR.count--;
        return updateWatchers();
      }
    };
  };
  afterDelay = function(delay = 0, cb) {
    if (delay === 0) {
      return queueMicrotask(cb);
    } else if (delay < 5) {
      return requestAnimationFrame(cb);
    } else {
      return setTimeout(cb, delay);
    }
  };
  return updateWatchers = function() {
    var j, len1, watcher;
    for (j = 0, len1 = watchers.length; j < len1; j++) {
      watcher = watchers[j];
      watcher(ADSR.count);
    }
    return null;
  };
});

// submodule/bucket/monkey-patch.coffee
// Monkey Patch
// The JS standard library leaves a lot to be desired, so let's carefully (see bottom of file)
// modify the built-in classes to add a few helpful methods.
(function() {
  var className, classPatches, globalclass, key, monkeyPatches, results, value;
  monkeyPatches = {
    Array: {
      type: function(v) {
        return v instanceof Array;
      },
      // Sorting
      numericSortAscending: function(a, b) {
        return a - b;
      },
      numericSortDescending: function(a, b) {
        return b - a;
      },
      sortAlphabetic: function(arr) {
        return arr.sort(Array.alphabeticSort != null ? Array.alphabeticSort : Array.alphabeticSort = new Intl.Collator('en').compare);
      },
      sortNumericAscending: function(arr) {
        return arr.sort(Array.numericSortAscending);
      },
      sortNumericDescending: function(arr) {
        return arr.sort(Array.numericSortDescending);
      },
      // Accessing
      first: function(arr) {
        return arr[0];
      },
      second: function(arr) {
        return arr[1];
      },
      last: function(arr) {
        return arr[arr.length - 1];
      },
      rest: function(arr) {
        return arr.slice(1);
      },
      butLast: function(arr) {
        return arr.slice(0, -1);
      },
      // Misc
      clone: function(arr) {
        return arr.map(Function.clone);
      },
      empty: function(arr) {
        return (arr == null) || arr.length === 0;
      },
      equal: function(a, b) {
        var ai, bi, i, j, len1;
        if (Object.is(a, b)) {
          return true;
        }
        if (!(Array.type(a) && Array.type(b) && a.length === b.length)) {
          return false;
        }
        for (i = j = 0, len1 = a.length; j < len1; i = ++j) {
          ai = a[i];
          bi = b[i];
          if (Function.equal(ai, bi)) {
            continue;
          } else {
            return false;
          }
        }
        return true;
      },
      mapToObject: function(arr, fn = Function.identity) {
        var j, k, len1, o;
        o = {};
        for (j = 0, len1 = arr.length; j < len1; j++) {
          k = arr[j];
          o[k] = fn(k);
        }
        return o;
      },
      pull: function(arr, elms) {
        var elm, i, j, len1;
        if (!((arr != null) && (elms != null))) {
          return;
        }
        if (!Array.type(elms)) {
          elms = [elms];
        }
        for (j = 0, len1 = elms.length; j < len1; j++) {
          elm = elms[j];
          while ((i = arr.indexOf(elm)) > -1) {
            arr.splice(i, 1);
          }
        }
        return arr;
      },
      search: function(arr, key) {
        var j, len1, v;
        for (j = 0, len1 = arr.length; j < len1; j++) {
          v = arr[j];
          if (Array.type(v)) {
            if (Array.search(v, key)) {
              return true;
            }
          } else if (Object.type(v)) {
            if (Object.search(v, key)) {
              return true;
            }
          }
        }
        return false;
      },
      shuffle: function(arr) {
        var i, item, j, len1, newArr;
        newArr = [];
        for (i = j = 0, len1 = arr.length; j < len1; i = ++j) {
          item = arr[i];
          newArr.splice(Math.randInt(0, newArr.length), 0, item);
        }
        return newArr;
      },
      unique: function(elements) {
        return Array.from(new Set([].concat(elements)));
      }
    },
    Function: {
      type: function(v) {
        return v instanceof Function;
      },
      identity: function(v) {
        return v;
      },
      exists: function(e) {
        return e != null;
      },
      notExists: function(e) {
        return e == null;
      },
      is: function(a, b) {
        return a === b;
      },
      isnt: function(a, b) {
        return a !== b;
      },
      equal: function(a, b) {
        if (Object.is(a, b)) {
          return true;
        } else if (Array.type(a) && Array.type(b)) {
          if (Array.equal(a, b)) {
            return true;
          }
        } else if (Object.type(a) && Object.type(b)) {
          if (Object.equal(a, b)) {
            return true;
          }
        } else {
          return false;
        }
      },
      equivalent: function(a, b) {
        return a == b || Function.equal(a, b); // Like equal, but also equates null & undefined, -0 & 0, etc
      },
      notEqual: function(a, b) {
        return !Function.equal(a, b);
      },
      notEquivalent: function(a, b) {
        return !Function.equivalent(a, b);
      },
      clone: function(v) {
        if (v == null) {
          return v;
        } else if (Function.type(v)) {
          throw new Error("If you need to clone functions, use a custom cloner");
        } else if (Promise.type(v)) {
          throw new Error("If you need to clone promises, use a custom cloner");
        } else if (Array.type(v)) {
          return Array.clone(v);
        } else if (Object.type(v)) {
          return Object.clone(v);
        } else {
          return v;
        }
      }
    },
    Math: {
      TAU: Math.PI * 2,
      zero: function(v) {
        return Math.EPSILON > Math.abs(v);
      },
      nonzero: function(v) {
        return !Math.zero(v);
      },
      add: function(a, b) {
        return a + b;
      },
      div: function(a, b) {
        return a / b;
      },
      mod: function(a, b) {
        return a % b;
      },
      mul: function(a, b) {
        return a * b;
      },
      sub: function(a, b) {
        return a - b;
      },
      avg: function(a, b) {
        return (a + b) / 2;
      },
      clip: function(v, ...arg1) {
        var max, min, ref;
        ref = arg1, [...arg1] = ref, [max] = splice.call(arg1, -1);
        [min = 0] = arg1;
        if (max === void 0) {
          max = 1;
        }
        return Math.min(max, Math.max(min, v));
      },
      sat: function(v) {
        return Math.clip(v);
      },
      lerpN: function(input, outputMin = 0, outputMax = 1, clip = false) {
        input *= outputMax - outputMin;
        input += outputMin;
        if (clip) {
          input = Math.clip(input, outputMin, outputMax);
        }
        return input;
      },
      lerp: function(input, inputMin = 0, inputMax = 1, outputMin = 0, outputMax = 1, clip = true) {
        if (inputMin === inputMax) { // Avoids a divide by zero
          return outputMin;
        }
        if (inputMin > inputMax) {
          [inputMin, inputMax, outputMin, outputMax] = [inputMax, inputMin, outputMax, outputMin];
        }
        if (clip) {
          input = Math.clip(input, inputMin, inputMax);
        }
        input -= inputMin;
        input /= inputMax - inputMin;
        return Math.lerpN(input, outputMin, outputMax, false);
      },
      rand: function(min = -1, max = 1) {
        return Math.lerpN(Math.random(), min, max);
      },
      randInt: function(min, max) {
        return Math.round(Math.rand(min, max));
      },
      roundTo: function(input, precision) {
        var p;
        // Using the reciprocal avoids floating point errors. Eg: 3/10 is fine, but 3*0.1 is wrong.
        p = 1 / precision;
        return Math.round(input * p) / p;
      }
    },
    Object: {
      type: function(v) {
        return "[object Object]" === Object.prototype.toString.call(v);
      },
      // This should probably be a function on Array, as a mirror of Object.keys / Object.values.
      // In general, functions that take an array go on Array, even if they return a different type.
      by: function(k, arr) { // Object.by "name", [{name:"a"}, {name:"b"}] => {a:{name:"a"}, b:{name:"b"}}
        var j, len1, o, obj;
        o = {};
        for (j = 0, len1 = arr.length; j < len1; j++) {
          obj = arr[j];
          o[obj[k]] = obj;
        }
        return o;
      },
      clone: function(obj) {
        return Object.mapValues(obj, Function.clone);
      },
      count: function(obj) {
        return Object.keys(obj).length;
      },
      equal: function(a, b) {
        var av, bv, k, ref;
        if (Object.is(a, b)) {
          return true;
        }
        if (!(((a != null) && (b != null)) && (({}.constructor === (ref = a.constructor) && ref === b.constructor)))) {
          return false;
        }
        if (Object.keys(a).length !== Object.keys(b).length) {
          return false;
        }
        for (k in a) {
          av = a[k];
          bv = b[k];
          if (Function.equal(av, bv)) {
            continue;
          } else {
            return false;
          }
        }
        return true;
      },
      mapKeys: function(obj, fn = Function.identity) {
        var k, o;
        o = {};
        for (k in obj) {
          o[k] = fn(k);
        }
        return o;
      },
      mapValues: function(obj, fn = Function.identity) {
        var k, o, v;
        o = {};
        for (k in obj) {
          v = obj[k];
          o[k] = fn(v);
        }
        return o;
      },
      merge: function(...objs) {
        var j, k, len1, obj, out, v;
        out = {};
        for (j = 0, len1 = objs.length; j < len1; j++) {
          obj = objs[j];
          if (obj != null) {
            for (k in obj) {
              v = obj[k];
              // DO NOT add any additional logic for merging other types (like arrays),
              // or existing apps will break (Hyperzine, Hest, etc.)
              // If you want to deep merge other types, write a custom merge function.
              out[k] = Object.type(v) ? Object.merge(out[k], v) : v;
            }
          }
        }
        return out;
      },
      rmerge: function(...objs) {
        return Object.merge(...objs.reverse());
      },
      search: function(obj, key) {
        var k, v;
        if (obj[key] != null) {
          return true;
        }
        for (k in obj) {
          v = obj[k];
          if (Array.type(v)) {
            if (Array.search(v, key)) {
              return true;
            }
          } else if (Object.type(v)) {
            if (Object.search(v, key)) {
              return true;
            }
          }
        }
        return false;
      },
      subtractKeys: function(a, b) {
        var k, o;
        o = Object.mapKeys(a); // shallow clone
        for (k in b) {
          delete o[k];
        }
        return o;
      }
    },
    Promise: {
      type: function(v) {
        return v instanceof Promise;
      },
      timeout: function(t) {
        return new Promise(function(resolve) {
          return setTimeout(resolve, t);
        });
      }
    },
    String: {
      type: function(v) {
        return "string" === typeof v;
      },
      // https://stackoverflow.com/a/52171480/313576, public domain
      hash: function(str, seed = 0) {
        var c, ch, h1, h2, j, len1;
        if (str == null) {
          return 0;
        }
        h1 = 0xdeadbeef ^ seed;
        h2 = 0x41c6ce57 ^ seed;
        for (j = 0, len1 = str.length; j < len1; j++) {
          c = str[j];
          ch = c.charCodeAt(0);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
      },
      pluralize: function(count, string, suffix = "s") {
        if (count === 1) {
          suffix = "";
        }
        return (string + suffix).replace("%%", count);
      },
      toKebabCase: function(v) {
        return v.replace(/([A-Z])/g, "-$1").toLowerCase();
      }
    }
  };
// Init
  results = [];
  for (className in monkeyPatches) {
    classPatches = monkeyPatches[className];
    globalclass = globalThis[className];
    results.push((function() {
      var results1;
      results1 = [];
      for (key in classPatches) {
        value = classPatches[key];
        if (globalclass[key] != null) {
          results1.push(console.log(`Can't monkey patch ${className}.${key} because it already exists.`));
        } else {
          results1.push(globalclass[key] = value);
        }
      }
      return results1;
    })());
  }
  return results;
})();

// submodule/bucket/test.coffee
Tests = Test = null;

(function() {
  var context;
  context = null;
  Tests = function(name, test) {
    context = function() {
      console.group(`%c${name}`, "color: red");
      return context = null;
    };
    test();
    console.groupEnd();
    return context = null;
  };
  return Test = function(name, ...stuff) {
    var i, j, l, len1, len2, ref, results, thing;
// If we've been passed any functions, run them and capture the return values.
    for (i = j = 0, len1 = stuff.length; j < len1; i = ++j) {
      thing = stuff[i];
      if (Function.type(thing)) {
        stuff[i] = thing();
      }
    }
    // If there's only one thing in stuff, just compare it with true
    if (stuff.length === 1) {
      stuff.unshift(true);
    }
    ref = Array.butLast(stuff);
    // Now, all things in stuff must all be equivalent. Or else.
    // (This test framework is super casual, so we just check each neighbouring pair)
    results = [];
    for (i = l = 0, len2 = ref.length; l < len2; i = ++l) {
      thing = ref[i];
      if (!Function.equivalent(thing, stuff[i + 1])) {
        if (typeof context === "function") {
          context();
        }
        console.group(`%c${name}`, "font-weight:normal;");
        console.log("this:", thing);
        console.log("isnt:", stuff[i + 1]);
        results.push(console.groupEnd());
      } else {
        results.push(void 0);
      }
    }
    return results;
  };
})();

// lib/file-tree.coffee
Take(["Read"], function(Read) {
  var FileTree, populateTree, sort;
  sort = function(a, b) {
    return a.name.localeCompare(b.name);
  };
  populateTree = async function(tree) {
    var dirents;
    if ((await Read.exists(tree.path))) {
      dirents = (await Read.withFileTypes(tree.path));
      dirents.sort(sort);
      tree.children = (await Promise.all(dirents.map(async function(dirent) {
        var childFile, childTree, parts;
        if (dirent.isDirectory()) {
          childTree = FileTree.newEmpty(tree.path, dirent.name);
          childTree.relpath = Read.path(tree.relpath, dirent.name);
          await populateTree(childTree);
          tree.count += childTree.count;
          return childTree;
        } else {
          tree.count += 1;
          parts = dirent.name.split(".");
          return childFile = {
            name: dirent.name,
            basename: Array.butLast(parts).join("."),
            ext: parts.length > 1 ? Array.last(parts).toLowerCase() : null,
            path: Read.path(tree.path, dirent.name),
            relpath: Read.path(tree.relpath, dirent.name)
          };
        }
      })));
    }
    return tree;
  };
  return Make("FileTree", FileTree = {
    newEmpty: function(parentPath, name) {
      return {
        name: name,
        basename: name,
        ext: null,
        path: Read.path(parentPath, name), // absolute path on the local HD
        relpath: name, // path relative to the parent of the tree root
        count: 0,
        children: []
      };
    },
    newPopulated: async function(parentPath, name) {
      var root;
      root = FileTree.newEmpty(parentPath, name);
      await populateTree(root);
      return root;
    },
    flat: function(tree, k, into = []) {
      var child, j, len1, ref;
      ref = tree.children;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        child = ref[j];
        if (k == null) { // collecting children
          into.push(child);
        } else if (child[k] != null) {
          into.push(child[k]);
        }
        if (child.children) {
          FileTree.flat(child, k, into);
        }
      }
      return into;
    },
    find: function(tree, k, v) {
      var child, j, len1, ref, res;
      if (tree[k] === v) {
        return tree;
      }
      if (tree.children) {
        ref = tree.children;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          child = ref[j];
          if (res = FileTree.find(child, k, v)) {
            return res;
          }
        }
      }
      return null;
    }
  });
});

// lib/frustration.coffee
Take([], function() {
  var arr;
  arr = ["•_•` ", "`•_•`", " `•_•", "  o.o", " o.o ", "o.o  ", "•√•  ", " •√• ", "  •√•", "  °e°", " °o° ", "°3°  ", "v_v  ", " v_v ", "  v_v", " `•ω•", "`•ω•`", "•ω•` ", "‘^‘  ", " '^' ", "  `^`", "  T∞T", " T∞T ", "T∞T  ", "¡^¡  ", " ¡^¡ ", "  ¡^¡", "  ;_;", " ;_; ", ";_;  "];
  return Make("Frustration", function(i) {
    if (i != null) {
      i %= arr.length;
    } else {
      i = Math.rand(0, arr.length);
    }
    return arr[i | 0];
  });
});

// lib/iterated.coffee
Take([], function() {
  var Iterated;
  return Make("Iterated", Iterated = function(...arg1) {
    var didRunThisFrame, iteratedFunction, more, nextFrame, nextFrameRequested, ranOutOfTime, ref, requestNextFrame, run, runAgainNextFrame, startTime, timeLimit;
    ref = arg1, [...arg1] = ref, [iteratedFunction] = splice.call(arg1, -1);
    [timeLimit = 5] = arg1;
    nextFrameRequested = false;
    runAgainNextFrame = false;
    didRunThisFrame = false;
    ranOutOfTime = false;
    startTime = null;
    run = function() {
      if (didRunThisFrame) {
        // Only run once per frame. If we've already run, mark that we want to run again next frame.
        return runAgainNextFrame = true;
      }
      didRunThisFrame = true;
      // Whenever we run, we need to do some additional work next frame.
      requestNextFrame();
      // Defer the execution of the function *slightly*, to improve batching behaviour
      // when an iterated function is called repeatedly inside a loop (eg: by lib/job.coffee).
      queueMicrotask(function() {
        // Now we can actually run the iterated function!
        startTime = performance.now();
        return iteratedFunction(more);
      });
      // Iterated functions are just for side effects — a return value is not needed.
      return null;
    };
    requestNextFrame = function() {
      if (nextFrameRequested) {
        return;
      }
      nextFrameRequested = true;
      return requestAnimationFrame(nextFrame);
    };
    // Whenever someone calls run(), we *always* need to do some cleanup work, and me might
    // also need to call run() again ourselves if there's more iterated work to be done.
    nextFrame = function() {
      var doRun;
      doRun = runAgainNextFrame;
      nextFrameRequested = false;
      runAgainNextFrame = false;
      didRunThisFrame = false;
      ranOutOfTime = false;
      if (doRun) {
        return run();
      }
    };
    // This function will tell the caller whether they're safe to do more work this frame.
    // They'll call it repeatedly in a loop (while doing other work) until either they
    // run out of time and break out of the loop, or run out of work to do and just stop
    // calling us.
    more = function(customLimit) {
      ranOutOfTime = performance.now() - startTime > (customLimit || timeLimit);
      if (ranOutOfTime) {
        // Mark that we want to actually do a run() next frame, not just the usual cleanup.
        runAgainNextFrame = true;
        // We always need to request a new frame, since the call to more() might come
        // long after the last call to run() if the iterated function is doing something async.
        requestNextFrame();
      }
      return !ranOutOfTime;
    };
    return run;
  });
});

// lib/job.coffee
Take([], function() {
  var Job, bail, handlers, lastN, lastTime, run, running, updateWatchers, watchers;
  handlers = {};
  watchers = [];
  running = false;
  lastTime = null;
  lastN = [];
  Make.async("Job", Job = function(priority, type, ...args) {
    // Priority is optional, and defaults to 0
    if (String.type(priority)) {
      return Job(0, priority, type, ...args);
    }
    if (handlers[type] == null) {
      throw Error(`No handler for job type: ${type}`);
    }
    return new Promise(function(resolve) {
      var base;
      if ((base = Job.queues)[priority] == null) {
        base[priority] = [];
      }
      Job.queues[priority].push({type, args, resolve});
      Job.count++;
      return Job.runJobs();
    });
  });
  Job.queues = [];
  Job.count = 0;
  Job.delay = 0;
  Job.handler = function(type, handler) {
    if (handlers[type]) {
      throw Error(`A job handler for ${type} already exists`);
    }
    return handlers[type] = handler;
  };
  Job.watcher = function(watcher) {
    return watchers.push(watcher);
  };
  Job.runJobs = function() {
    if (running) {
      return;
    }
    running = true;
    lastTime = performance.now();
    Job.delay = 16;
    updateWatchers();
    return requestAnimationFrame(run);
  };
  run = function() {
    var args, dirty, j, priority, queue, ref, resolve, time, type;
    dirty = false;
    ref = Job.queues;
    for (priority = j = ref.length - 1; j >= 0; priority = j += -1) {
      queue = ref[priority];
      while ((queue != null ? queue.length : void 0) > 0) {
        dirty = true;
        ({time, type, args, resolve} = queue.shift());
        Job.count--;
        resolve(handlers[type](...args)); // We can't await, or else if a Job creates a new Job inside itself, we'll get stuck
        Job.delay = (performance.now() - lastTime) * 0.1 + Job.delay * 0.9;
        if (Job.delay > 30) { // Don't let the frame rate crater
          return bail();
        }
      }
    }
    running = false;
    if (dirty) {
      // If any jobs ran this frame, we should run at least one more time, in case any jobs that we ran created new jobs at a higher priority.
      Job.runJobs();
    }
    return updateWatchers();
  };
  bail = function() {
    lastTime = performance.now();
    requestAnimationFrame(run);
    return updateWatchers();
  };
  return updateWatchers = function() {
    var j, len1, watcher;
    for (j = 0, len1 = watchers.length; j < len1; j++) {
      watcher = watchers[j];
      watcher(Job.count, Job.delay);
    }
    return null;
  };
});

// lib/log-initialization-time.coffee
(async function() {
  var Log, performance, time;
  if (typeof performance === "undefined" || performance === null) {
    ({performance} = require("perf_hooks"));
  }
  time = performance.now();
  Log = (await Take.async("Log"));
  return Log("Initialization Time", null, time);
})();

// lib/log.coffee
Take([], function() {
  var DB, Env, IPC, Log, Printer, performance;
  if (typeof performance === "undefined" || performance === null) {
    ({performance} = require("perf_hooks"));
  }
  // We can't / shouldn't Take anything, since Log might need to be used *anywhere*
  DB = Env = IPC = Printer = null;
  Make.async("Log", Log = function(msg, attrs, time) {
    if (Env == null) {
      Env = Take("Env");
    }
    // Send logs to the local printer
    if (Printer != null ? Printer : Printer = Take("Printer")) {
      Printer(msg, attrs, time);
    }
    // If we have a port to the DB, send logs to the DB Printer
    if (DB != null ? DB : DB = Take("DB")) {
      DB.send("printer", msg, attrs, time);
    }
    // If we're in dev, and in a render process, send logs to the main process Printer
    if ((Env != null ? Env.isDev : void 0) && (Env != null ? Env.isRender : void 0) && (IPC != null ? IPC : IPC = Take("IPC"))) {
      IPC.send("printer", msg, attrs, time);
    }
    return msg;
  });
  Log.time = function(msg, fn) {
    var start, v;
    start = performance.now();
    v = fn();
    Log.time.formatted(msg, performance.now() - start);
    return v;
  };
  Log.time.async = async function(msg, fn) {
    var start, v;
    start = performance.now();
    v = (await fn());
    Log.time.formatted(msg, performance.now() - start);
    return v;
  };
  Log.time.custom = function(preMsg) {
    var start;
    if (preMsg) {
      Log(preMsg);
    }
    start = performance.now();
    return function(postMsg) {
      return Log.time.formatted(postMsg, performance.now() - start);
    };
  };
  Log.time.formatted = function(msg, time) {
    return Log(time.toFixed(1).padStart(6) + " " + msg);
  };
  return Log.err = function(msg) {
    return Log(msg, {
      color: "#F00"
    });
  };
});

// lib/paths.coffee
Take(["Read"], function(Read) {
  var Paths;
  return Make("Paths", Paths = {
    files: function(asset) {
      return Read.path(asset.path, "Files");
    },
    names: function(asset) {
      return Read.path(asset.path, "Name");
    },
    shots: function(asset) {
      return Read.path(asset.path, "Shot");
    },
    newShots: function(asset) {
      return Read.path(asset.path, "Shot (New)");
    },
    tags: function(asset) {
      return Read.path(asset.path, "Tags");
    },
    thumbnails: function(asset) {
      return Read.path(asset.path, "Thumbnail Cache");
    },
    file: function(asset, filename) {
      return Read.path(Paths.files(asset), filename);
    },
    name: function(asset) {
      return Read.path(Paths.names(asset), asset.name);
    },
    shot: function(asset) {
      return Read.path(Paths.shots(asset), asset.shot);
    },
    newShot: function(asset) {
      return Read.path(Paths.newShots(asset), asset.newShot);
    },
    thumbnail: function(asset, filename) {
      return Read.path(Paths.thumbnails(asset), filename);
    },
    tag: function(asset, tag) {
      return Read.path(Paths.tags(asset), tag);
    },
    thumbnailName: function(file, size) {
      return `${String.hash(file.relpath)}-${size}.jpg`;
    },
    ext: {
      icon: {
        "as": "as",
        "cptx": "cptx",
        "css": "css",
        "dwg": "dwg",
        "exe": "exe",
        "fla": "fla",
        "idlk": "idlk",
        "indb": "indb",
        "indd": "indd",
        "swf": "swf",
        null: true,
        undefined: true // Include null / undefined because we want those to get an icon, not a thumbnail
      },
      sips: {"3fr": "3fr", "arw": "arw", "astc": "astc", "avci": "avci", "bmp": "bmp", "cr2": "cr2", "cr3": "cr3", "crw": "crw", "dcr": "dcr", "dds": "dds", "dng": "dng", "dxo": "dxo", "erf": "erf", "exr": "exr", "fff": "fff", "gif": "gif", "heic": "heic", "heics": "heics", "heif": "heif", "icns": "icns", "ico": "ico", "iiq": "iiq", "jp2": "jp2", "jpeg": "jpeg", "jpg": "jpg", "ktx": "ktx", "mos": "mos", "mpo": "mpo", "mrw": "mrw", "nef": "nef", "nrw": "nrw", "orf": "orf", "orf": "orf", "orf": "orf", "pbm": "pbm", "pdf": "pdf", "pef": "pef", "pic": "pic", "pict": "pict", "png": "png", "psd": "psd", "pvr": "pvr", "raf": "raf", "raw": "raw", "rw2": "rw2", "rwl": "rwl", "sgi": "sgi", "sr2": "sr2", "srf": "srf", "srw": "srw", "tga": "tga", "tiff": "tiff", "webp": "webp"},
      video: {"avchd": "avchd", "avi": "avi", "m4p": "m4p", "m4v": "m4v", "mov": "mov", "mp2": "mp2", "mp4": "mp4", "mpe": "mpe", "mpeg": "mpeg", "mpg": "mpg", "mpv": "mpv", "ogg": "ogg", "qt": "qt", "webm": "webm", "wmv": "wmv"}
    }
  });
});

// lib/printer.coffee
Take([], function() {
  var Printer, performance;
  if (typeof window !== "undefined" && window !== null ? window.isDB : void 0) { // DB has its own Printer
    return;
  }
  if (typeof performance === "undefined" || performance === null) {
    ({performance} = require("perf_hooks"));
  }
  return Make("Printer", Printer = function(msg, attrs, time) {
    time = (time || performance.now()).toFixed(0).padStart(5);
    return console.log(time + "  " + msg);
  });
});

// lib/pub-sub.coffee
Take([], function() {
  var Pub, Sub, subs;
  subs = {};
  Sub = function(name, cb) {
    return (subs[name] != null ? subs[name] : subs[name] = []).push(cb);
  };
  Pub = function(name, ...args) {
    var handler, j, len1, ref;
    if (subs[name] != null) {
      ref = subs[name];
      for (j = 0, len1 = ref.length; j < len1; j++) {
        handler = ref[j];
        handler(...args);
      }
    }
    return null;
  };
  return Make("PubSub", {Pub, Sub});
});

// lib/read.coffee
// TODO: Clear up the naming so that everything is explicitly Read.sync.foo or Read.async.foo
Take([], function() {
  var Read, filterValidDirentName, fs, path, validDirentName, validFileName;
  fs = require("fs");
  path = require("path");
  validFileName = function(v) {
    if (0 === v.indexOf(".")) { // Exclude dotfiles
      return false;
    }
    if (-1 !== v.search(/[<>:;,?"*|\/\\]/)) { // Exclude names we won't be able to roundtrip
      return false;
    }
    return true; // Everything else is good
  };
  validDirentName = function(v) {
    return validFileName(v.name);
  };
  filterValidDirentName = function(vs) {
    return vs.filter(validDirentName);
  };
  Read = function(folderPath) {
    var fileNames;
    try {
      fileNames = fs.readdirSync(folderPath);
      return fileNames.filter(validFileName);
    } catch (error) {
      return null;
    }
  };
  // Temporary hack until we fully switch Read over to split sync and async.
  // Note that we can't just say Read.sync = Read, or that breaks Read.sync.exists!
  Read.sync = function(p) {
    return Read(p);
  };
  Read.sync.exists = function(path) {
    return fs.existsSync(path);
  };
  Read.async = function(folderPath) {
    return new Promise(function(resolve) {
      return fs.readdir(folderPath, function(err, fileNames) {
        if (err != null) {
          return resolve(null);
        } else {
          return resolve(fileNames.filter(validFileName));
        }
      });
    });
  };
  Read.withFileTypes = function(folderPath) {
    return fs.promises.readdir(folderPath, {
      withFileTypes: true
    }).then(filterValidDirentName);
  };
  Read.isFolder = function(folderPath) {
    if (!(folderPath != null ? folderPath.length : void 0)) {
      return false;
    }
    return new Promise(function(resolve) {
      return fs.stat(folderPath, function(err, stat) {
        return resolve(stat != null ? stat.isDirectory() : void 0);
      });
    });
  };
  Read.stat = function(path) {
    return new Promise(function(resolve) {
      return fs.stat(path, function(err, stat) {
        return resolve(stat);
      });
    });
  };
  Read.exists = function(filePath) {
    if (!(filePath != null ? filePath.length : void 0)) {
      return false;
    }
    return new Promise(function(resolve) {
      return fs.access(filePath, function(err) {
        return resolve(err == null);
      });
    });
  };
  Read.file = function(filePath) {
    var file;
    try {
      return file = fs.readFileSync(filePath);
    } catch (error) {
      return null;
    }
  };
  Read.sep = path.sep;
  Read.watch = fs.watch;
  Read.path = function(...segs) {
    return segs.join(path.sep);
  };
  Read.split = function(p) {
    return Array.pull(p.split(path.sep), "");
  };
  Read.last = function(p) {
    return Array.last(Read.split(p));
  };
  Read.parentPath = function(p) {
    return Read.path(...Array.butLast(Read.split(p)));
  };
  return Make("Read", Read);
});

// lib/size-on-disk.coffee
Take(["Read"], function(Read) {
  var SizeOnDisk;
  Make.async("SizeOnDisk", SizeOnDisk = function(path) {
    return new Promise(async function(resolve) {
      var childName, children, j, len1, size, sizes, stats, total;
      stats = (await Read.stat(path));
      if (stats == null) {
        return resolve(0);
      } else if (!stats.isDirectory()) {
        return resolve(stats.size);
      } else {
        total = 0;
        children = (await Read.async(path));
        sizes = (function() {
          var j, len1, results;
          results = [];
          for (j = 0, len1 = children.length; j < len1; j++) {
            childName = children[j];
            results.push(SizeOnDisk(Read.path(path, childName)));
          }
          return results;
        })();
        for (j = 0, len1 = sizes.length; j < len1; j++) {
          size = sizes[j];
          total += (await size);
        }
        return resolve(total);
      }
    });
  });
  return SizeOnDisk.pretty = async function(path) {
    var exp, len, size, suffix;
    size = (await SizeOnDisk(path));
    len = size.toString().length;
    switch (false) {
      case !(len < 3):
        suffix = "B";
        exp = 0;
        break;
      case !(len < 7):
        suffix = "KB";
        exp = 1;
        break;
      case !(len < 11):
        suffix = "MB";
        exp = 2;
        break;
      default:
        suffix = "GB";
        exp = 3;
    }
    return (size / Math.pow(1000, exp)).toFixed(1) + " " + suffix;
  };
});

// lib/state.coffee
Take([], function() {
  var State, conditionalSet, getAt, localNotify, runCbs, runCbsAbove, runCbsWithin, state, subscriptions;
  state = {};
  subscriptions = {
    _cbs: []
  };
  getAt = function(node, path) {
    var j, k, len1, part, parts;
    if (path === "") {
      return [
        {
          "": node
        },
        ""
      ];
    }
    parts = path.split(".");
    k = parts.pop();
    for (j = 0, len1 = parts.length; j < len1; j++) {
      part = parts[j];
      node = node[part] != null ? node[part] : node[part] = {};
    }
    return [node, k];
  };
  Make.async("State", State = function(path = "", v, {immutable = false} = {}) {
    var k, node, old;
    [node, k] = getAt(state, path);
    if (v === void 0) { // Just a read
      return node[k];
    }
    if (!immutable) {
      
      // It's not safe to take something out of State, mutate it, and commit it again.
      // The immutable option tells us the caller promises they're not doing that.
      // Otherwise, we clone values before reading or writing them.
      v = Function.clone(v);
    }
    if (!immutable && v === node[k] && (Object.type(v) || Array.type(v))) {
      throw "Did you take something out of State, mutate it, and commit it again?";
    }
    if (path === "") {
      throw Error("You're not allowed to set the State root");
    }
    old = node[k];
    if (v != null) {
      node[k] = v;
    } else {
      delete node[k];
    }
    if (Function.notEquivalent(v, old)) {
      queueMicrotask(function() {
        return localNotify(path, v);
      });
    }
    return v;
  });
  conditionalSet = function(path, v, pred) {
    var doSet, k, node;
    [node, k] = getAt(state, path);
    doSet = pred(node[k], v);
    if (doSet) {
      State(path, v);
    }
    return doSet;
  };
  // These are useful because they return true if a change was made
  State.change = function(path, v) {
    return conditionalSet(path, v, Function.notEquivalent);
  };
  State.default = function(path, v) {
    return conditionalSet(path, v, Function.notExists);
  };
  // This is useful because it reduces the need to update State in a loop,
  // which triggers a lot of (possibly pointless) notifications.
  // Reminder that Object.merge doesn't handle arrays, so maybe
  // limit the use of this function to primitives (since it implies immutable).
  State.merge = function(path, v) {
    return State(path, Object.merge(v, State(path)), {
      immutable: true
    });
  };
  // These are useful because it offers a nice syntax for updating existing values in State,
  // with support for async, either mutably or immutably.
  State.update = async function(path, fn) {
    return State(path, (await fn(State(path))), {
      immutable: true
    });
  };
  State.mutate = async function(path, fn) {
    return State.clone(path, (await fn(State(path))), {
      immutable: true
    });
  };
  // This is a convenience function for reading something from State that is pre-cloned
  // (if necessary) to avoid mutability issues.
  State.clone = function(path) {
    return Function.clone(State(path));
  };
  State.subscribe = function(...arg1) {
    var base, cb, k, node, path, ref, runNow, weak;
    ref = arg1, [...arg1] = ref, [cb] = splice.call(arg1, -1);
    [path = "", runNow = true, weak = false] = arg1;
    if (!String.type(path)) { // Avoid errors if you try say subscribe(runNow, cb)
      throw "Invalid subscribe path";
    }
    [node, k] = getAt(subscriptions, path);
    ((base = (node[k] != null ? node[k] : node[k] = {}))._cbs != null ? base._cbs : base._cbs = []).push(cb);
    cb._state_weak = weak; // ... this is fine 🐕☕️🔥
    if (runNow) {
      return cb(State(path));
    }
  };
  State.unsubscribe = function(...arg1) {
    var cb, k, node, path, ref;
    ref = arg1, [...arg1] = ref, [cb] = splice.call(arg1, -1);
    [path = ""] = arg1;
    [node, k] = getAt(subscriptions, path);
    if (indexOf.call(node[k]._cbs, cb) < 0) {
      throw Error("Unsubscribe failed");
    }
    Array.pull(node[k]._cbs, cb);
    return null;
  };
  localNotify = function(path, v) {
    var changes, k, node;
    [node, k] = getAt(subscriptions, path);
    runCbsWithin(node[k], v);
    runCbs(node[k], v, v);
    changes = runCbsAbove(path, v);
    return runCbs(subscriptions, state, changes);
  };
  runCbsWithin = function(parent, v) {
    var _v, child, k;
    if (!Object.type(parent)) {
      return;
    }
    for (k in parent) {
      child = parent[k];
      if (!(k !== "_cbs")) {
        continue;
      }
      _v = v != null ? v[k] : void 0;
      runCbsWithin(child, _v);
      runCbs(child, _v, _v);
    }
    return null;
  };
  runCbsAbove = function(path, changes) {
    var changesAbove, k, node, p, parts, pathAbove;
    parts = path.split(".");
    p = parts.pop();
    changesAbove = {};
    changesAbove[p] = changes;
    if (!(parts.length > 0)) {
      return changesAbove;
    }
    pathAbove = parts.join(".");
    [node, k] = getAt(subscriptions, pathAbove);
    runCbs(node[k], State(pathAbove), changesAbove);
    return runCbsAbove(pathAbove, changesAbove);
  };
  return runCbs = function(node, v, changed) {
    var cb, dead, j, l, len1, len2, ref;
    if (node != null ? node._cbs : void 0) {
      dead = [];
      ref = node._cbs;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        cb = ref[j];
        if (cb._state_weak && (v == null)) {
          dead.push(cb);
        } else {
          cb(v, changed);
        }
      }
      for (l = 0, len2 = dead.length; l < len2; l++) {
        cb = dead[l];
        Array.pull(node._cbs, cb);
      }
    }
    return null;
  };
});

// lib/write.coffee
Take(["Env", "Log", "Read"], function(Env, Log, Read) {
  var Memory, Write, fs, logWrite, validPath;
  fs = require("fs");
  validPath = function(v) {
    var valid;
    valid = true;
    v = v.replace(/^\\*[A-Z]:/, ""); // Ignore the drive letter on Windows
    if (-1 !== v.search(/[<>:;,?"*|]/)) { // Exclude names we won't be able to roundtrip
      valid = false;
    }
    if (v.length <= 1) {
      valid = false;
    }
    if (!valid) {
      Log.err(`${v} is not a valid file path`);
    }
    return valid;
  };
  Make.async("Write", Write = function() {
    throw "Not Implemented";
  });
  Write.logging = true;
  Write.sync = {};
  Write.async = {};
  Memory = null;
  logWrite = function(fn, p, opts = {}) {
    if (opts.quiet) {
      return;
    }
    if (!Write.logging) {
      return;
    }
    if (Memory != null ? Memory : Memory = Take("Memory")) {
      if (p !== Memory("assetsFolder")) {
        p = p.replace(Memory("assetsFolder") + Read.sep, "");
      }
      if (p !== Memory("dataFolder")) {
        p = p.replace(Memory("dataFolder") + Read.sep, "");
      }
    }
    if (p !== Env.home) {
      p = p.replace(Env.home + Read.sep, "");
    }
    return Log(`WRITE ${fn} ${p}`);
  };
  Write.sync.file = function(path, data, opts) {
    var valid;
    if (valid = validPath(path)) {
      logWrite("file", path, opts);
      fs.writeFileSync(path, data);
    }
    return valid;
  };
  Write.sync.mkdir = function(path, opts) {
    var valid;
    if (fs.existsSync(path)) {
      return true;
    }
    if (valid = validPath(path)) {
      logWrite("mkdir", path, opts);
      fs.mkdirSync(path, {
        recursive: true
      });
    }
    return valid;
  };
  Write.sync.rename = function(path, newName, opts) {
    var newPath, valid;
    newPath = Read.sep + Read.path(Read.parentPath(path), newName);
    if (path === newPath) {
      return true;
    }
    if (valid = validPath(path) && validPath(newPath)) {
      logWrite("rename", `${path} -> ${newPath}`, opts);
      fs.renameSync(path, newPath);
    }
    return valid;
  };
  Write.sync.rm = function(path, opts) {
    var valid;
    if (!fs.existsSync(path)) {
      return true;
    }
    if (valid = validPath(path)) {
      logWrite("rm", path, opts);
      fs.rmSync(path, {
        recursive: true
      });
    }
    return valid;
  };
  Write.sync.copyFile = function(src, dest, opts) {
    var valid;
    if (valid = validPath(src) && validPath(dest)) {
      logWrite("copyFile", `${src} -> ${dest}`, opts);
      fs.copyFileSync(src, dest);
    }
    return valid;
  };
  Write.sync.json = function(path, data, opts) {
    return Write.sync.file(path, JSON.stringify(data), opts);
  };
  Write.sync.array = function(path, arr, opts) {
    var current, j, l, len1, len2, v;
    current = Read(path);
    if (current == null) {
      current = [];
    }
    if (Array.equal(arr, current)) {
      return;
    }
    for (j = 0, len1 = current.length; j < len1; j++) {
      v = current[j];
      if (indexOf.call(arr, v) < 0) {
        // Remove anything that's in the folder but not in our new array
        Write.sync.rm(Read.path(path, v), opts);
      }
    }
    for (l = 0, len2 = arr.length; l < len2; l++) {
      v = arr[l];
      if (indexOf.call(current, v) < 0) {
        // Save anything that's in our new array but not in the folder
        Write.sync.mkdir(Read.path(path, v), opts);
      }
    }
    return null;
  };
  return Write.async.copyInto = async function(src, destFolder, opts) {
    var _valid, childDestFolder, item, j, len1, ref, srcName, valid;
    srcName = Read.last(src);
    if ((await Read.isFolder(src))) {
      childDestFolder = Read.path(destFolder, srcName);
      Write.sync.mkdir(childDestFolder, opts);
      valid = true;
      ref = Read(src);
      for (j = 0, len1 = ref.length; j < len1; j++) {
        item = ref[j];
        _valid = Write.async.copyInto(Read.path(src, item), childDestFolder, opts);
        valid && (valid = _valid);
      }
      return valid;
    } else {
      return Write.sync.copyFile(src, Read.path(destFolder, srcName), opts);
    }
  };
});

// main/coffee/db.coffee
Take(["Window", "DBWindowReady"], function(Window) {
  var DB;
  return Make("DB", DB = {
    send: function(fn, ...args) {
      return Window.getDB().webContents.send("mainPort", fn, ...args);
    }
  });
});

// main/coffee/env.coffee
Take([], function() {
  var Env, app, childProcess, os, path;
  ({app} = require("electron"));
  childProcess = require("child_process");
  os = require("os");
  path = require("path");
  Env = {
    isDev: !app.isPackaged,
    isMac: process.platform === "darwin",
    isDef: process.defaultApp,
    isMain: true,
    isRender: false,
    userData: app.getPath("userData"),
    home: app.getPath("home"),
    version: app.getVersion(),
    versions: process.versions
  };
  Env.computerName = Env.isMac ? childProcess.execSync("scutil --get ComputerName").toString().replace("\n", "") : os.hostname();
  // Persisted user preferences and other per-install app state that will be managed by the DB window
  Env.configPath = path.join(Env.userData, "Config.json");
  // Persisted per-install app state that will be managed by the DB process
  Env.dbStatePath = path.join(Env.userData, "DB State.json");
  // Persisted per-install app state that will be managed by the Main process
  Env.mainStatePath = path.join(Env.userData, "Main State.json");
  // Where the assets and other globally-shared data managed by Hyperzine will live
  Env.defaultDataFolder = path.join(Env.home, "Dropbox", "System", "Hyperzine");
  return Make("Env", Env);
});

// main/coffee/ipc-handlers.coffee
Take(["Env", "IPC", "Log", "Printer", "Window"], function(Env, IPC, Log, Printer, Window) {
  var BrowserWindow, Handlers, MessageChannelMain, app, dialog;
  ({app, BrowserWindow, dialog, MessageChannelMain} = require("electron"));
  return Make("Handlers", Handlers = {
    setup: function() {
      // SYSTEM
      IPC.handle("env", function() {
        return Env;
      });
      IPC.on("quit", function({sender}, msg) {
        return app.quit();
      });
      IPC.on("fatal", function({sender}, msg) {
        dialog.showErrorBox("Fatal Error", msg);
        return app.quit();
      });
      IPC.on("alert", function({sender}, opts) { // See: https://www.electronjs.org/docs/latest/api/dialog/#dialogshowmessageboxbrowserwindow-options
        return dialog.showMessageBox(opts);
      });
      IPC.on("printer", function(e, ...args) {
        return Printer(...args);
      });
      IPC.on("bind-db", function({processId, sender}) {
        var db, port1, port2;
        db = Window.getDB();
        ({port1, port2} = new MessageChannelMain());
        sender.postMessage("port", {
          id: processId
        }, [port1]);
        return db.webContents.postMessage("port", {
          id: processId
        }, [port2]);
      });
      // WINDOWING
      IPC.on("close-window", function({sender}) {
        var ref;
        return (ref = BrowserWindow.fromWebContents(sender)) != null ? ref.close() : void 0;
      });
      IPC.on("minimize-window", function({sender}) {
        var ref;
        return (ref = BrowserWindow.fromWebContents(sender)) != null ? ref.minimize() : void 0;
      });
      IPC.on("maximize-window", function({sender}) {
        var ref;
        return (ref = BrowserWindow.fromWebContents(sender)) != null ? ref.maximize() : void 0;
      });
      IPC.on("unmaximize-window", function({sender}) {
        var ref;
        return (ref = BrowserWindow.fromWebContents(sender)) != null ? ref.unmaximize() : void 0;
      });
      IPC.on("set-window-title", function({sender}, name) {
        return BrowserWindow.fromWebContents(sender).setTitle(name);
      });
      IPC.handle("showOpenDialog", function({sender}, opts) {
        return dialog.showOpenDialog(BrowserWindow.fromWebContents(sender), opts);
      });
      IPC.on("open-asset", function(e, assetId) {
        return Window.open.asset(assetId);
      });
      IPC.handle("whats-my-asset", function({sender}) {
        var win;
        win = BrowserWindow.fromWebContents(sender);
        return Window.data[win.webContents.id].assetId;
      });
      // FEATURES
      IPC.on("drag-file", async function({sender}, path) {
        return sender.startDrag({
          file: path,
          icon: (await app.getFileIcon(path))
        });
      });
      IPC.handle("get-file-icon", async function({sender}, path) {
        var img;
        img = (await app.getFileIcon(path));
        return img.toDataURL();
      });
      return IPC.on("preview-file", function({sender}, path) {
        var win;
        win = BrowserWindow.fromWebContents(sender);
        return win.previewFile(path);
      });
    }
  });
});

// main/coffee/ipc.coffee
Take(["Window"], function(Window) {
  var BrowserWindow, IPC, ipcMain;
  ({BrowserWindow, ipcMain} = require("electron"));
  return Make("IPC", IPC = {
    on: function(channel, cb) {
      return ipcMain.on(channel, cb);
    },
    once: function(channel, cb) {
      return ipcMain.once(channel, cb);
    },
    handle: function(channel, cb) {
      return ipcMain.handle(channel, cb);
    },
    promise: {
      once: function(channel) {
        return new Promise(function(resolve) {
          return ipcMain.once(channel, function(e, arg) {
            return resolve(arg);
          });
        });
      },
      handle: function(channel) {
        return new Promise(function(resolve) {
          return ipcMain.handle(channel, function(e, arg) {
            return resolve(arg);
          });
        });
      }
    },
    // Send a message to the frontmost window
    toFocusedWindow: function(msg) {
      var win;
      win = BrowserWindow.getFocusedWindow();
      if (win == null) {
        win = BrowserWindow.getAllWindows()[0];
      }
      if (win == null) {
        win = Window.open.browser(); // No windows, so open a new window
      }
      return win.webContents.send(msg);
    }
  });
});

// main/coffee/main-state.coffee
// This file manages any state that needs to be persisted to the local filesystem
// just for the main process.
Take(["ADSR", "Env", "Log", "Read", "Write"], function(ADSR, Env, Log, Read, Write) {
  var MainState, save, state;
  // This lists all the keys we'll persist in the main state file, with their default values
  state = {
    windowBounds: {
      asset: [],
      browser: [],
      db: [],
      "setup-assistant": []
    }
  };
  save = ADSR(0, 2000, function() {
    return Write.sync.json(Env.mainStatePath, state, {
      quiet: true
    });
  });
  Make.async("MainState", MainState = function(k, v) {
    if (state[k] == null) {
      throw Error(`Unknown MainState key: ${k}`);
    }
    if (v !== void 0) {
      if (v != null) {
        state[k] = v;
      } else {
        delete state[k];
      }
      save();
    }
    return state[k];
  });
  return MainState.init = function() {
    var data, json, k, results, v;
    try {
      json = Read.file(Env.mainStatePath);
      data = JSON.parse(json);
      results = [];
      for (k in data) {
        v = data[k];
        // Only accept keys we explicitly list in the defaults.
        // This lets us drop obsolete values.
        if (state[k] != null) {
          results.push(state[k] = v);
        } else {
          results.push(void 0);
        }
      }
      return results;
    } catch (error) {}
  };
});

// main/coffee/menu.coffee
Take(["Env", "IPC", "Window"], function(Env, IPC, Window) {
  var Menu, app, shell, template;
  ({app, Menu, shell} = require("electron"));
  template = [];
  if (Env.isMac) {
    template.push({
      label: app.name,
      submenu: [
        {
          role: "about"
        },
        {
          type: "separator"
        },
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: Window.open.setupAssistant
        },
        {
          type: "separator"
        },
        {
          role: "services"
        },
        {
          type: "separator"
        },
        {
          role: "hide"
        },
        {
          role: "hideothers"
        },
        {
          role: "unhide"
        },
        {
          type: "separator"
        },
        {
          role: "quit"
        }
      ]
    });
  }
  template.push({
    label: "File",
    submenu: [
      {
        label: "New Asset",
        accelerator: "CmdOrCtrl+N",
        click: function() {
          var ref;
          return (ref = Take("DB")) != null ? ref.send("New Asset") : void 0;
        }
      },
      {
        label: "New Browser Window",
        accelerator: "CmdOrCtrl+Shift+N",
        click: Window.open.browser
      },
      {
        type: "separator"
      },
      {
        label: "Show Config File",
        click: function() {
          return shell.showItemInFolder(Env.configPath);
        }
      },
      {
        type: "separator"
      },
      {
        role: Env.isMac ? "close" : "quit"
      }
    ]
  });
  template.push({
    label: "Edit",
    submenu: [
      {
        role: "undo"
      },
      {
        role: "redo"
      },
      {
        type: "separator"
      },
      {
        role: "cut"
      },
      {
        role: "copy"
      },
      {
        role: "paste"
      },
      {
        role: "delete"
      },
      {
        role: "selectAll"
      },
      {
        type: "separator"
      },
      {
        label: "Find",
        accelerator: "CmdOrCtrl+F",
        click: function() {
          return IPC.toFocusedWindow("find");
        }
      },
      {
        type: "separator"
      },
      ...(!Env.isMac ? [
        {
          type: "separator"
        },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: Window.open.setupAssistant
        }
      ] : [])
    ]
  });
  template.push({
    label: "View",
    submenu: [
      ...(Env.isDev || !Env.isMac ? [
        {
          role: "reload"
        },
        {
          role: "forceReload"
        },
        {
          role: "toggleDevTools"
        },
        {
          type: "separator"
        }
      ] : []),
      {
        role: "togglefullscreen"
      }
    ]
  });
  template.push({
    role: "windowMenu",
    submenu: [
      {
        role: "minimize"
      },
      {
        role: "zoom"
      },
      ...(Env.isMac ? [
        {
          type: "separator"
        },
        {
          role: "front"
        }
      ] : [
        {
          role: "close"
        }
      ]),
      {
        type: "separator"
      },
      {
        label: "Show Debug Log",
        accelerator: "CmdOrCtrl+Shift+D",
        click: Window.open.db
      }
    ]
  });
  template.push({
    role: "help",
    submenu: [
      ...(!Env.isMac ? [
        {
          role: "about"
        },
        {
          type: "separator"
        }
      ] : []),
      {
        label: "Hyperzine Guide",
        click: function() {
          return shell.openExternal("https://github.com/cdig/hyperzine/wiki/Hyperzine-Guide");
        }
      },
      {
        type: "separator"
      },
      {
        label: "Report a Problem or Feature Request…",
        click: function() {
          return shell.openExternal("https://github.com/cdig/hyperzine/issues/new");
        }
      },
      {
        label: "Beep for Good Luck",
        click: function() {
          return shell.beep();
        }
      }
    ]
  });
  return Make("Menu", {
    setup: function() {
      return Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
  });
});

// main/coffee/updates.coffee
Take(["Env", "Log", "Window"], function(Env, Log, Window) {
  var Updates, app, autoUpdater, dialog;
  ({app, autoUpdater, dialog} = require("electron"));
  return Make("Updates", Updates = {
    setup: function() {
      var checkForUpdates, doCheckForUpdates;
      if (Env.isDev) {
        return;
      }
      doCheckForUpdates = true;
      autoUpdater.setFeedURL({
        url: `https://update.electronjs.org/cdig/hyperzine/${process.platform}-${process.arch}/${app.getVersion()}`
      });
      autoUpdater.on("checking-for-update", function() {
        return Log("Checking for update");
      });
      autoUpdater.on("update-not-available", function() {
        return Log("Update not available");
      });
      autoUpdater.on("update-available", function() {
        doCheckForUpdates = false;
        return Log("Downloading update...");
      });
      autoUpdater.on("error", function(err) {
        doCheckForUpdates = false;
        return Log.err(err);
      });
      autoUpdater.on("update-downloaded", async function(e, releaseNotes, releaseName) {
        var res;
        Log(`Update Downloaded: ${releaseName}`);
        res = (await dialog.showMessageBox({
          type: "info",
          buttons: ["Restart Hyperzine", "Later"],
          defaultId: 0,
          title: "Application Update",
          message: `Hyperzine has been updated to ${releaseName.replace("v", "version ")}.\n\nWould you like to restart and use the updated version now?`
        }));
        Log(`Response: ${res.response}`);
        if (res.response === 0) {
          Window.aboutToQuit();
          autoUpdater.quitAndInstall();
          return Log("Quitting");
        }
      });
      checkForUpdates = function() {
        if (doCheckForUpdates) {
          return autoUpdater.checkForUpdates();
        }
      };
      checkForUpdates();
      return setInterval(checkForUpdates, 60 * 60 * 1000);
    }
  });
});

// main/coffee/window.coffee
Take(["Env", "MainState"], function(Env, MainState) {
  var BrowserWindow, Window, aboutToQuit, app, checkBounds, checkForExit, clearIndex, db, defaultBounds, defaultWindow, dialog, getBounds, getNextIndex, nativeTheme, newWindow, openAsset, openBrowser, openDb, openSetupAssistant, screen, setupAssistant, setupDone, updateBounds, windowBounds, windowData, windowIndexes;
  ({app, BrowserWindow, dialog, nativeTheme, screen} = require("electron"));
  defaultWindow = {
    title: "Hyperzine",
    titleBarStyle: Env.isMac ? "hiddenInset" : "hidden",
    // titleBarOverlay: if Env.isMac then false else
    //   color: "#333"
    //   symbolColor: "#fff"
    minWidth: 340,
    minHeight: 340,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      scrollBounce: true,
      backgroundThrottling: false,
      nativeWindowOpen: false // This is changing to true by default in Electron 15
    }
  };
  defaultBounds = {
    asset: {
      width: 960,
      height: 540
    },
    browser: {
      width: 1280,
      height: 720
    },
    db: {
      width: 640,
      height: 480
    },
    "setup-assistant": {
      width: 480,
      height: 540
    }
  };
  windowIndexes = {};
  windowBounds = null;
  windowData = {};
  // Single instance windows
  db = null;
  setupAssistant = null;
  // Local state
  setupDone = false;
  aboutToQuit = false;
  app.on("before-quit", function() {
    return aboutToQuit = true;
  });
  // We want to track whether this window is the 1st, 2nd, 3rd (etc) instance of its type.
  // That way, whenever we open a new window, we can assign it to the most recently used
  // position for that instance of that type of window. Closing a window will leave a null
  // in the list of windows, which will be filled next time that type of window is opened.
  // Here, "index" means the 1st, 2nd, 3rd (etc) instance
  getNextIndex = function(type) {
    var index, indexes;
    indexes = windowIndexes[type] != null ? windowIndexes[type] : windowIndexes[type] = [];
    index = indexes.indexOf(null); // Find the position of the first null, if any
    if (index < 0) { // No nulls, so add to the end of the list
      index = indexes.length;
    }
    windowIndexes[type][index] = true; // Save that this index is now being used
    return index;
  };
  clearIndex = function(type, index) {
    return windowIndexes[type][index] = null;
  };
  getBounds = function(type, index) {
    var bounds, cursor, display;
    // We do some special logic to position windows based on the position of the
    // mouse cursor, to avoid frustration when working with multiple monitors.
    // We regard the mouse to be occupying the "current" monitor.
    cursor = screen.getCursorScreenPoint();
    display = screen.getDisplayNearestPoint(cursor).bounds;
    // The Setup Assistant is handled specially.
    // It should always appear centered on the current monitor.
    if (type === "setup-assistant") {
      bounds = defaultBounds[type];
      bounds.x = display.x + display.width / 2 - bounds.width / 2;
      bounds.y = display.y + display.height / 2 - bounds.height / 2;
      return bounds;
    }
    // For other types of windows, we'll first try to load the
    // last-used position for this instance (by index) of this type of window
    bounds = windowBounds[type][index];
    if (bounds != null) {
      return bounds;
    }
    // We don't have a last-used position, so let's set up a new one.
    bounds = defaultBounds[type];
    if (type === "db") {
      // By default, the db should appear in the top left of the current monitor.
      bounds.x = display.x;
      bounds.y = display.y;
    } else if (type === "browser" && index === 0) {
      // The first instance of the browser window should appear centered on the current monitor.
      bounds.x = display.x + display.width / 2 - bounds.width / 2;
      bounds.y = display.y + display.height / 2 - bounds.height / 2;
    } else {
      // All other windows should appear near the mouse cursor.
      bounds.x = cursor.x - 74;
      bounds.y = cursor.y - 16;
    }
    return bounds;
  };
  checkBounds = function(win) {
    var bounds, j, len1, otherBounds, otherWindow, ref;
    bounds = win.getBounds();
    ref = BrowserWindow.getAllWindows();
    for (j = 0, len1 = ref.length; j < len1; j++) {
      otherWindow = ref[j];
      if (!(otherWindow !== win && otherWindow !== db)) {
        continue;
      }
      otherBounds = otherWindow.getBounds();
      if (bounds.x === otherBounds.x && bounds.y === otherBounds.y) {
        bounds.x += 22;
        bounds.y += 22;
        // We've moved our window, so we need to start checking all over again
        // TODO: There's a small risk of an infine loop here if the behaviour of
        // setBounds followed by getBounds changes and starts clipping to the window.
        // Also, we aren't matching OSX behaviour, which is to wrap.
        win.setBounds(bounds);
        checkBounds(win);
        return;
      }
    }
  };
  updateBounds = function(type, index, win) {
    windowBounds[type][index] = win.getBounds();
    return MainState("windowBounds", windowBounds);
  };
  newWindow = function(type, {tools}, props = {}) {
    var background, bounds, deferPaint, index, win;
    if (props.show !== false) {
      deferPaint = true;
      props.show = false;
    }
    index = getNextIndex(type);
    bounds = getBounds(type, index);
    background = {
      backgroundColor: nativeTheme.shouldUseDarkColors ? "#1b1b1b" : "#f2f2f2"
    };
    win = new BrowserWindow(Object.assign({}, defaultWindow, bounds, background, props));
    checkBounds(win);
    updateBounds(type, index, win);
    win.loadFile(`target/${type}.html`).catch(function(err) {
      return dialog.showMessageBox({
        message: err.message
      });
    });
    if (deferPaint) {
      win.once("ready-to-show", win.show);
    }
    win.on("move", function(e) {
      return updateBounds(type, index, win);
    });
    win.on("resize", function(e) {
      return updateBounds(type, index, win);
    });
    win.on("closed", function(e) {
      return clearIndex(type, index);
    });
    win.on("closed", function(e) {
      return checkForExit();
    });
    // Notify IPC handlers in common/window-events.coffee when certain window events happen
    win.on("focus", function(e) {
      return win.webContents.send("focus");
    });
    win.on("blur", function(e) {
      return win.webContents.send("blur");
    });
    win.on("maximize", function(e) {
      return win.webContents.send("maximize");
    });
    win.on("unmaximize", function(e) {
      return win.webContents.send("unmaximize");
    });
    return win;
  };
  openAsset = function(assetId) {
    var win;
    win = newWindow("asset", {
      tools: false
    }, {
      title: "Asset"
    });
    windowData[win.webContents.id] = {
      assetId: assetId
    };
    return win;
  };
  openBrowser = function() {
    return newWindow("browser", {
      tools: false
    }, {
      title: "Browser",
      minWidth: 400
    });
  };
  openDb = function() {
    if (db != null) {
      db.show();
    } else {
      db = newWindow("db", {
        tools: false
      }, {
        title: "Debug Log",
        show: false //or Env.isDev
      });
      db.on("close", function(e) {
        if (!aboutToQuit) {
          e.preventDefault();
          return db.hide();
        }
      });
      Make("DBWindowReady");
    }
    return db;
  };
  openSetupAssistant = function() {
    if (setupAssistant != null) {
      setupAssistant.show();
    } else {
      setupAssistant = newWindow("setup-assistant", {
        tools: false
      }, {
        title: "Setup Assistant",
        resizable: false,
        fullscreenable: false,
        frame: false,
        titleBarStyle: "default"
      });
      setupAssistant.on("close", function(e) {
        return setupAssistant = null;
      });
    }
    return setupAssistant;
  };
  checkForExit = function() {
    if (!Env.isMac && BrowserWindow.getAllWindows().length <= 1) {
      return app.quit();
    }
  };
  return Make("Window", Window = {
    init: function() {
      return windowBounds = MainState("windowBounds");
    },
    data: windowData,
    getDB: function() {
      if (db == null) {
        throw Error("DB window doesn't exist");
      }
      return db;
    },
    open: {
      asset: openAsset,
      browser: openBrowser,
      db: openDb,
      setupAssistant: openSetupAssistant
    },
    activate: function() {
      var win;
      if (BrowserWindow.getAllWindows().length === 0) {
        Window.open.db();
      } else if (setupDone) {
        Window.open.browser();
      } else {
        Window.open.setupAssistant();
      }
      win = Array.last(BrowserWindow.getAllWindows());
      if (win.isMinimized()) {
        win.restore();
      }
      return win.focus();
    },
    setupDone: function() {
      return setupDone = true;
    },
    aboutToQuit: function() {
      return aboutToQuit = true;
    }
  });
});

// main/main.coffee
Take(["Env", "Handlers", "IPC", "Log", "Menu", "MainState", "Updates", "Window"], async function(Env, Handlers, IPC, Log, Menu, MainState, Updates, Window) {
  var app;
  ({app} = require("electron"));
  if (require("electron-squirrel-startup")) {
    // Windows will launch the app multiple times during an update. We just need to quit.
    return app.quit();
  }
  // Only continue launching if there's no other instance of the app that's already running
  if (!app.requestSingleInstanceLock()) {
    app.quit();
  } else {
    app.on("second-instance", function(event, commandLine, workingDirectory) {
      return Window.activate();
    });
  }
  // Just guessing that these might be nice. Haven't tested them at all.
  app.commandLine.appendSwitch("disable-renderer-backgrounding");
  app.commandLine.appendSwitch("force_low_power_gpu");
  // Here's our custom config for the About box
  app.setAboutPanelOptions({
    applicationName: `Hyperzine ${Env.version.replace(/(\d\.\d)\.0/, "$1")}`,
    applicationVersion: [`Electron ${Env.versions.electron.split(".")[0]}`, `Chrome ${Env.versions.chrome.split(".")[0]}`, `Node ${Env.versions.node.split(".")[0]}`].join(" • "),
    version: "",
    copyright: "Created by Ivan Reese\n© CD Industrial Group Inc."
  });
  // While we're waiting for electron to get ready, we can load our persisted main state (if any).
  MainState.init();
  Window.init();
  // Wait for ready before doing anything substantial.
  await app.whenReady();
  // For now, we just roll with a static menu bar. In the future, we might want to change it
  // depending on which window is active.
  Menu.setup();
  // There's about to be a lot of inter-process communication (IPC). Much of it is going to be
  // windows asking the main process to do things on their behalf. So let's set up those handlers.
  Handlers.setup();
  // The first window we open is the DB, which handles all filesystem access and stores global state.
  // The instant the DB opens, it'll be ready to receive ports from other windows and help them.
  // The DB window should never be reloaded or closed, until the app quits, or it'll lose all the ports,
  // and we haven't designed the other windows to function (even temporarily) without a port to the db.
  // We queue it so that the below IPC listeners will be ready when the window actually opens.
  // (We could just call them first, but it reads better this way)
  queueMicrotask(Window.open.db);
  // When the DB window is open, we can begin logging lots of stuff
  await IPC.promise.once("db-open");
  Log(`Env.version: ${Env.version}`);
  Log(`Env.isDev: ${Env.isDev}`);
  Log(`Env.isMac: ${Env.isMac}`);
  Log(`Env.userData: ${Env.userData}`);
  Log(`Env.home: ${Env.home}`);
  // When the DB window first wakes up, it'll attempt to load saved user preferences.
  // If the DB fails to load this data, we need to open the Setup Assistant.
  // The Setup Assistant will collect user preferences and save them via the DB.
  IPC.once("open-setup-assistant", Window.open.setupAssistant);
  // Wait until either the DB has loaded the saved prefs, or the Setup Assistant has finished
  await IPC.promise.once("config-ready");
  Window.setupDone();
  // Everything is ready — open a browser window.
  // Eventually, we might want to restore whichever windows were open when we last quit
  Window.open.browser();
  // Whenever we switch to the app, let the window manager know.
  app.on("activate", Window.activate);
  // Replace the default "exit" behaviour — we implement our own in window.coffee
  app.on("window-all-closed", function() {});
  // Set up automatic updates
  return Updates.setup();
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR29FOzs7O0FBQ3BFO0FBRG9FLElBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUE7RUFBQTs7O0FBSXBFLE1BQU8sOENBQUEsSUFBUywrQ0FBaEI7OztFQUlFLElBQUEsR0FBTztFQUNQLElBQUEsR0FBTztFQUNQLGFBQUEsR0FBZ0I7RUFFYixDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBRUwsUUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGVBQUEsRUFBQSxzQkFBQSxFQUFBLG1CQUFBLEVBQUEsa0JBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLGdCQUFBLEVBQUEsY0FBQSxFQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLE9BQUEsRUFBQSxrQkFBQSxFQUFBLGNBQUEsRUFBQTtJQUFJLElBQUEsR0FBTyxDQUFBO0lBQ1AsYUFBQSxHQUFnQjtJQUNoQixjQUFBLEdBQWlCO0lBQ2pCLHNCQUFBLEdBQXlCO0lBQ3pCLGVBQUEsR0FBa0I7SUFDbEIsZ0JBQUEsR0FBbUI7SUFDbkIsY0FBQSxHQUFpQjtJQUVqQixJQUFBLEdBQU8sUUFBQSxDQUFDLElBQUQsRUFBTyxRQUFRLElBQWYsQ0FBQTtNQUVMLElBQXlCLFlBQXpCOztBQUFBLGVBQU8sS0FBQSxDQUFNLElBQU4sRUFBUDtPQUROOzthQUlNLFFBQUEsQ0FBUyxJQUFULEVBQWUsS0FBZjtJQUxLO0lBUVAsSUFBQSxHQUFPLFFBQUEsQ0FBQyxLQUFELEVBQVEsUUFBUixDQUFBO01BRUwsSUFBb0MsYUFBcEM7O0FBQUEsZUFBTyxhQUFhLENBQUMsS0FBZCxDQUFBLEVBQVA7T0FETjs7YUFJTSxPQUFBLENBQVEsS0FBUixFQUFlLFFBQWY7SUFMSyxFQWhCWDs7SUF5QkksSUFBSSxDQUFDLEtBQUwsR0FBYSxRQUFBLENBQUMsSUFBRCxFQUFPLFFBQVEsSUFBZixDQUFBO2FBQ1gsY0FBQSxDQUFlLFFBQUEsQ0FBQSxDQUFBO2VBQ2IsSUFBQSxDQUFLLElBQUwsRUFBVyxLQUFYO01BRGEsQ0FBZjtJQURXLEVBekJqQjs7SUErQkksSUFBSSxDQUFDLEtBQUwsR0FBYSxRQUFBLENBQUMsS0FBRCxDQUFBO2FBQ1gsSUFBSSxPQUFKLENBQVksUUFBQSxDQUFDLEdBQUQsQ0FBQTtlQUNWLElBQUEsQ0FBSyxLQUFMLEVBQVksUUFBQSxDQUFBLENBQUEsRUFBQTs7aUJBRVYsR0FBQSxDQUFJLGtCQUFBLENBQW1CLEtBQW5CLENBQUo7UUFGVSxDQUFaO01BRFUsQ0FBWjtJQURXO0lBT2IsYUFBQSxHQUFnQixRQUFBLENBQUEsQ0FBQTtBQUNwQixVQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxHQUFBLEVBQUE7TUFBTSxNQUFBLEdBQ0U7UUFBQSxnQkFBQSxFQUFrQixnQkFBbEI7UUFDQSxjQUFBLEVBQWdCLGNBRGhCO1FBRUEsVUFBQSxFQUFZLENBQUE7TUFGWjtNQUdGLEtBQUEsaURBQUE7O0FBQ0U7UUFBQSxLQUFBLHVDQUFBOztVQUNFLElBQU8sa0JBQVA7O2tCQUNtQixDQUFDLElBQUQsSUFBVTs7WUFDM0IsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFELENBQWpCLEdBRkY7O1FBREY7TUFERjtBQUtBLGFBQU87SUFWTztJQWFoQixRQUFBLEdBQVcsUUFBQSxDQUFDLElBQUQsRUFBTyxLQUFQLENBQUE7TUFDVCxJQUE4RCxJQUFBLEtBQVEsRUFBdEU7UUFBQSxNQUFNLElBQUksS0FBSixDQUFVLHlDQUFWLEVBQU47O01BQ0EsSUFBc0Usa0JBQXRFO1FBQUEsTUFBTSxJQUFJLEtBQUosQ0FBVSxDQUFBLHdDQUFBLENBQUEsQ0FBMkMsSUFBM0MsQ0FBQSxDQUFWLEVBQU47O01BQ0EsSUFBSSxDQUFDLElBQUQsQ0FBSixHQUFhO01BQ2Isa0JBQUEsQ0FBQTthQUNBO0lBTFM7SUFRWCxrQkFBQSxHQUFxQixRQUFBLENBQUEsQ0FBQTtBQUN6QixVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBO01BQU0sSUFBVSxlQUFWO0FBQUEsZUFBQTs7TUFDQSxlQUFBLEdBQWtCLEtBRHhCOzs7TUFLTSxLQUFBLGlFQUFBOztRQUNFLElBQUcsY0FBQSxDQUFlLEtBQUssQ0FBQyxLQUFyQixDQUFIO1VBQ0UsYUFBYSxDQUFDLE1BQWQsQ0FBcUIsS0FBckIsRUFBNEIsQ0FBNUIsRUFBVjtVQUNVLE1BQUEsQ0FBTyxLQUFQLEVBRFY7VUFFVSxlQUFBLEdBQWtCO0FBQ2xCLGlCQUFPLGtCQUFBLENBQUEsRUFKVDs7TUFERjthQU9BLGVBQUEsR0FBa0I7SUFiQztJQWdCckIsY0FBQSxHQUFpQixRQUFBLENBQUMsS0FBRCxDQUFBO0FBQ2YsYUFBTyxLQUFLLENBQUMsS0FBTixDQUFZLFFBQUEsQ0FBQyxJQUFELENBQUE7ZUFBUztNQUFULENBQVo7SUFEUTtJQUlqQixPQUFBLEdBQVUsUUFBQSxDQUFDLEtBQUQsRUFBUSxRQUFSLENBQUE7TUFFUixJQUF1QyxnQkFBdkM7O1FBQUEsbUJBQUEsQ0FBb0IsS0FBcEIsRUFBMkIsUUFBM0IsRUFBQTs7YUFDQSxrQkFBQSxDQUFtQixLQUFuQjtJQUhRO0lBTVYsbUJBQUEsR0FBc0IsUUFBQSxDQUFDLEtBQUQsRUFBUSxRQUFSLENBQUE7QUFDMUIsVUFBQTtNQUFNLElBQUcsS0FBQSxLQUFTLEVBQVo7UUFDRSxLQUFBLEdBQVEsR0FEVjtPQUFBLE1BRUssSUFBRyxPQUFPLEtBQVAsS0FBZ0IsUUFBbkI7UUFDSCxLQUFBLEdBQVEsQ0FBQyxLQUFELEVBREw7O01BR0wsS0FBQSxHQUFRO1FBQUEsS0FBQSxFQUFPLEtBQVA7UUFBYyxRQUFBLEVBQVU7TUFBeEI7TUFFUixJQUFHLGNBQUEsQ0FBZSxLQUFmLENBQUg7UUFDRSxjQUFjLENBQUMsSUFBZixDQUFvQixLQUFwQjtRQUNBLGdCQUFBO1FBQ0EsS0FBTyxzQkFBUDtVQUNFLHNCQUFBLEdBQXlCO1VBQ3pCLGNBQUEsQ0FBZSxZQUFmLEVBRFY7aUJBRVUsY0FBQSxHQUhGO1NBSEY7T0FBQSxNQUFBO2VBUUUsYUFBYSxDQUFDLElBQWQsQ0FBbUIsS0FBbkIsRUFSRjs7SUFSb0I7SUFtQnRCLGtCQUFBLEdBQXFCLFFBQUEsQ0FBQyxLQUFELENBQUE7QUFDekIsVUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLENBQUEsRUFBQTtNQUFNLElBQUcsT0FBTyxLQUFQLEtBQWdCLFFBQW5CO0FBQ0UsZUFBTyxJQUFJLENBQUMsS0FBRCxFQURiO09BQUEsTUFBQTtRQUdFLENBQUEsR0FBSSxDQUFBO1FBQ0osS0FBQSx5Q0FBQTs7VUFBQSxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sSUFBSSxDQUFDLENBQUQ7UUFBWDtBQUNBLGVBQU8sRUFMVDs7SUFEbUI7SUFTckIsWUFBQSxHQUFlLFFBQUEsQ0FBQSxDQUFBO0FBQ25CLFVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUE7TUFBTSxzQkFBQSxHQUF5QjtNQUN6QixNQUFBLEdBQVM7TUFDVCxjQUFBLEdBQWlCO01BQ2pCLEtBQUEsMENBQUE7O1FBQUEsTUFBQSxDQUFPLEtBQVA7TUFBQTthQUNBO0lBTGE7SUFRZixNQUFBLEdBQVMsUUFBQSxDQUFDLEtBQUQsQ0FBQTtBQUNiLFVBQUE7TUFBTSxhQUFBLEdBQWdCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBWixDQUFnQixRQUFBLENBQUMsSUFBRCxDQUFBO2VBQVMsSUFBSSxDQUFDLElBQUQ7TUFBYixDQUFoQjthQUNoQixLQUFLLENBQUMsUUFBUSxDQUFDLEtBQWYsQ0FBcUIsSUFBckIsRUFBMkIsYUFBM0I7SUFGTyxFQXpIYjs7SUErSEksS0FBQSxHQUFRLFFBQUEsQ0FBQyxHQUFELENBQUE7QUFDWixVQUFBLENBQUEsRUFBQSxHQUFBLEVBQUE7TUFBTSxHQUFBLEdBQU0sQ0FBQTtNQUNOLEtBQUEsUUFBQTs7UUFBQSxHQUFHLENBQUMsQ0FBRCxDQUFILEdBQVM7TUFBVDthQUNBO0lBSE0sRUEvSFo7Ozs7SUF3SUksSUFBRyxnREFBSDtNQUVFLFdBQUEsR0FBYyxRQUFBLENBQUMsU0FBRCxDQUFBO0FBQ3BCLFlBQUE7ZUFBUSxNQUFNLENBQUMsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsT0FBQSxHQUFVLFFBQUEsQ0FBQyxXQUFELENBQUE7VUFDM0MsTUFBTSxDQUFDLG1CQUFQLENBQTJCLFNBQTNCLEVBQXNDLE9BQXRDO1VBQ0EsSUFBQSxDQUFLLFNBQUwsRUFBZ0IsV0FBaEI7QUFDQSxpQkFBTyxPQUhvQztRQUFBLENBQTdDO01BRFk7TUFNZCxXQUFBLENBQVksY0FBWjtNQUNBLFdBQUEsQ0FBWSxPQUFaO01BQ0EsV0FBQSxDQUFZLFFBQVosRUFSTjs7QUFXTSxjQUFPLFFBQVEsQ0FBQyxVQUFoQjtBQUFBLGFBQ08sU0FEUDtVQUVJLFdBQUEsQ0FBWSxrQkFBWjtVQUNBLFdBQUEsQ0FBWSxNQUFaO0FBRkc7QUFEUCxhQUlPLGFBSlA7VUFLSSxJQUFBLENBQUssa0JBQUw7VUFDQSxXQUFBLENBQVksTUFBWjtBQUZHO0FBSlAsYUFPTyxVQVBQO1VBUUksSUFBQSxDQUFLLGtCQUFMO1VBQ0EsSUFBQSxDQUFLLE1BQUw7QUFGRztBQVBQO1VBV0ksTUFBTSxJQUFJLEtBQUosQ0FBVSxDQUFBLDZCQUFBLENBQUEsQ0FBZ0MsUUFBUSxDQUFDLFVBQXpDLENBQUEseUJBQUEsQ0FBVjtBQVhWLE9BYkY7S0F4SUo7O0lBb0tJLElBQUcsZ0RBQUg7YUFDRSxNQUFNLENBQUMsT0FBUCxHQUFpQjtRQUNmLElBQUEsRUFBTSxJQURTO1FBRWYsSUFBQSxFQUFNLElBRlM7UUFHZixhQUFBLEVBQWU7TUFIQSxFQURuQjs7RUF0S0MsQ0FBQSxJQVJMO0NBSm9FOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThNcEUsSUFBQSxDQUFLLEVBQUwsRUFBUyxRQUFBLENBQUEsQ0FBQTtBQUVULE1BQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsVUFBQSxFQUFBLFlBQUEsRUFBQSxjQUFBLEVBQUE7RUFBRSxNQUFBLEdBQVMsSUFBSSxHQUFKLENBQUE7RUFDVCxRQUFBLEdBQVc7RUFFWCxJQUFJLENBQUMsS0FBTCxDQUFXLE1BQVgsRUFBbUIsSUFBQSxHQUFPLFFBQUEsQ0FBQSxPQUFBLENBQUE7QUFBb0MsUUFBQSxNQUFBLEVBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQTtrQ0FBTDtJQUEzQixDQUFDLE1BQUEsR0FBUyxDQUFWLEVBQWEsT0FBQSxHQUFVLENBQXZCO1dBQWlDLFFBQUEsQ0FBQSxHQUFJLElBQUosQ0FBQTtNQUM3RCxJQUFHLENBQUksTUFBTSxDQUFDLEdBQVAsQ0FBVyxFQUFYLENBQVA7UUFDRSxVQUFBLENBQVcsTUFBWCxFQUFtQixXQUFBLENBQVksRUFBWixFQUFnQixNQUFoQixFQUF3QixPQUF4QixDQUFuQjtRQUNBLElBQUksQ0FBQyxLQUFMO1FBQ0EsY0FBQSxDQUFBLEVBSEY7O2FBSUEsTUFBTSxDQUFDLEdBQVAsQ0FBVyxFQUFYLEVBQWUsQ0FBQyxJQUFELENBQWYsRUFMNkQ7SUFBQTtFQUFyQyxDQUExQjtFQU9BLElBQUksQ0FBQyxLQUFMLEdBQWE7RUFFYixJQUFJLENBQUMsT0FBTCxHQUFlLFFBQUEsQ0FBQyxPQUFELENBQUE7V0FDYixRQUFRLENBQUMsSUFBVCxDQUFjLE9BQWQ7RUFEYTtFQUdmLFdBQUEsR0FBYyxRQUFBLENBQUMsRUFBRCxFQUFLLE1BQUwsRUFBYSxPQUFiLENBQUE7V0FBd0IsUUFBQSxDQUFBLENBQUE7QUFDeEMsVUFBQTtNQUFJLENBQUEsQ0FBQyxJQUFELENBQUEsR0FBUyxNQUFNLENBQUMsR0FBUCxDQUFXLEVBQVgsQ0FBVDtNQUNBLE1BQU0sQ0FBQyxHQUFQLENBQVcsRUFBWCxFQUFlLENBQUEsQ0FBZjtNQUNBLEVBQUEsQ0FBRyxHQUFHLElBQU47YUFDQSxVQUFBLENBQVcsT0FBWCxFQUFvQixZQUFBLENBQWEsRUFBYixFQUFpQixNQUFqQixFQUF5QixPQUF6QixDQUFwQjtJQUpvQztFQUF4QjtFQU1kLFlBQUEsR0FBZSxRQUFBLENBQUMsRUFBRCxFQUFLLE1BQUwsRUFBYSxPQUFiLENBQUE7V0FBd0IsUUFBQSxDQUFBLENBQUE7QUFDekMsVUFBQTtNQUFJLENBQUEsQ0FBQyxJQUFELENBQUEsR0FBUyxNQUFNLENBQUMsR0FBUCxDQUFXLEVBQVgsQ0FBVDtNQUNBLElBQUcsSUFBSDtlQUNFLFVBQUEsQ0FBVyxNQUFYLEVBQW1CLFdBQUEsQ0FBWSxFQUFaLEVBQWdCLE1BQWhCLEVBQXdCLE9BQXhCLENBQW5CLEVBREY7T0FBQSxNQUFBO1FBR0UsTUFBTSxDQUFDLE1BQVAsQ0FBYyxFQUFkO1FBQ0EsSUFBSSxDQUFDLEtBQUw7ZUFDQSxjQUFBLENBQUEsRUFMRjs7SUFGcUM7RUFBeEI7RUFTZixVQUFBLEdBQWEsUUFBQSxDQUFDLFFBQVEsQ0FBVCxFQUFZLEVBQVosQ0FBQTtJQUNYLElBQUcsS0FBQSxLQUFTLENBQVo7YUFDRSxjQUFBLENBQWUsRUFBZixFQURGO0tBQUEsTUFFSyxJQUFHLEtBQUEsR0FBUSxDQUFYO2FBQ0gscUJBQUEsQ0FBc0IsRUFBdEIsRUFERztLQUFBLE1BQUE7YUFHSCxVQUFBLENBQVcsRUFBWCxFQUFlLEtBQWYsRUFIRzs7RUFITTtTQVFiLGNBQUEsR0FBaUIsUUFBQSxDQUFBLENBQUE7QUFDbkIsUUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBO0lBQUksS0FBQSw0Q0FBQTs7TUFBQSxPQUFBLENBQVEsSUFBSSxDQUFDLEtBQWI7SUFBQTtXQUNBO0VBRmU7QUF4Q1YsQ0FBVCxFQTlNb0U7Ozs7OztBQWlRakUsQ0FBQSxRQUFBLENBQUEsQ0FBQTtBQUNILE1BQUEsU0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUEsR0FBQSxFQUFBLGFBQUEsRUFBQSxPQUFBLEVBQUE7RUFBRSxhQUFBLEdBRUU7SUFBQSxLQUFBLEVBQ0U7TUFBQSxJQUFBLEVBQU0sUUFBQSxDQUFDLENBQUQsQ0FBQTtlQUFNLENBQUEsWUFBYTtNQUFuQixDQUFOOztNQUdBLG9CQUFBLEVBQXNCLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO2VBQVMsQ0FBQSxHQUFJO01BQWIsQ0FIdEI7TUFJQSxxQkFBQSxFQUF1QixRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtlQUFTLENBQUEsR0FBSTtNQUFiLENBSnZCO01BS0EsY0FBQSxFQUFnQixRQUFBLENBQUMsR0FBRCxDQUFBO2VBQVEsR0FBRyxDQUFDLElBQUosZ0NBQVMsS0FBSyxDQUFDLGlCQUFOLEtBQUssQ0FBQyxpQkFBa0IsSUFBSSxJQUFJLENBQUMsUUFBVCxDQUFrQixJQUFsQixDQUF1QixDQUFDLE9BQXpEO01BQVIsQ0FMaEI7TUFNQSxvQkFBQSxFQUFzQixRQUFBLENBQUMsR0FBRCxDQUFBO2VBQVEsR0FBRyxDQUFDLElBQUosQ0FBUyxLQUFLLENBQUMsb0JBQWY7TUFBUixDQU50QjtNQU9BLHFCQUFBLEVBQXVCLFFBQUEsQ0FBQyxHQUFELENBQUE7ZUFBUSxHQUFHLENBQUMsSUFBSixDQUFTLEtBQUssQ0FBQyxxQkFBZjtNQUFSLENBUHZCOztNQVVBLEtBQUEsRUFBTyxRQUFBLENBQUMsR0FBRCxDQUFBO2VBQVEsR0FBRyxDQUFDLENBQUQ7TUFBWCxDQVZQO01BV0EsTUFBQSxFQUFRLFFBQUEsQ0FBQyxHQUFELENBQUE7ZUFBUSxHQUFHLENBQUMsQ0FBRDtNQUFYLENBWFI7TUFZQSxJQUFBLEVBQU0sUUFBQSxDQUFDLEdBQUQsQ0FBQTtlQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBSixHQUFXLENBQVo7TUFBWCxDQVpOO01BYUEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxHQUFELENBQUE7ZUFBUSxHQUFHO01BQVgsQ0FiTjtNQWNBLE9BQUEsRUFBUyxRQUFBLENBQUMsR0FBRCxDQUFBO2VBQVEsR0FBRztNQUFYLENBZFQ7O01Ba0JBLEtBQUEsRUFBTyxRQUFBLENBQUMsR0FBRCxDQUFBO2VBQ0wsR0FBRyxDQUFDLEdBQUosQ0FBUSxRQUFRLENBQUMsS0FBakI7TUFESyxDQWxCUDtNQXFCQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEdBQUQsQ0FBQTtlQUNELGFBQUosSUFBWSxHQUFHLENBQUMsTUFBSixLQUFjO01BRHJCLENBckJQO01Bd0JBLEtBQUEsRUFBTyxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtBQUNiLFlBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO1FBQVEsSUFBZSxNQUFNLENBQUMsRUFBUCxDQUFVLENBQVYsRUFBYSxDQUFiLENBQWY7QUFBQSxpQkFBTyxLQUFQOztRQUNBLE1BQW9CLEtBQUssQ0FBQyxJQUFOLENBQVcsQ0FBWCxDQUFBLElBQWtCLEtBQUssQ0FBQyxJQUFOLENBQVcsQ0FBWCxDQUFsQixJQUFvQyxDQUFDLENBQUMsTUFBRixLQUFZLENBQUMsQ0FBQyxPQUF0RTtBQUFBLGlCQUFPLE1BQVA7O1FBQ0EsS0FBQSw2Q0FBQTs7VUFDRSxFQUFBLEdBQUssQ0FBQyxDQUFDLENBQUQ7VUFDTixJQUFHLFFBQVEsQ0FBQyxLQUFULENBQWUsRUFBZixFQUFtQixFQUFuQixDQUFIO0FBQ0UscUJBREY7V0FBQSxNQUFBO0FBR0UsbUJBQU8sTUFIVDs7UUFGRjtBQU1BLGVBQU87TUFURixDQXhCUDtNQW1DQSxXQUFBLEVBQWEsUUFBQSxDQUFDLEdBQUQsRUFBTSxLQUFLLFFBQVEsQ0FBQyxRQUFwQixDQUFBO0FBQ25CLFlBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7UUFBUSxDQUFBLEdBQUksQ0FBQTtRQUNKLEtBQUEsdUNBQUE7O1VBQUEsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQUEsQ0FBRyxDQUFIO1FBQVA7ZUFDQTtNQUhXLENBbkNiO01Bd0NBLElBQUEsRUFBTSxRQUFBLENBQUMsR0FBRCxFQUFNLElBQU4sQ0FBQTtBQUNaLFlBQUEsR0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7UUFBUSxNQUFjLGFBQUEsSUFBUyxlQUF2QjtBQUFBLGlCQUFBOztRQUNBLEtBQXFCLEtBQUssQ0FBQyxJQUFOLENBQVcsSUFBWCxDQUFyQjtVQUFBLElBQUEsR0FBTyxDQUFDLElBQUQsRUFBUDs7UUFDQSxLQUFBLHdDQUFBOztBQUNFLGlCQUFNLENBQUMsQ0FBQSxHQUFJLEdBQUcsQ0FBQyxPQUFKLENBQVksR0FBWixDQUFMLENBQUEsR0FBd0IsQ0FBQyxDQUEvQjtZQUNFLEdBQUcsQ0FBQyxNQUFKLENBQVcsQ0FBWCxFQUFjLENBQWQ7VUFERjtRQURGO2VBR0E7TUFOSSxDQXhDTjtNQWdEQSxNQUFBLEVBQVEsUUFBQSxDQUFDLEdBQUQsRUFBTSxHQUFOLENBQUE7QUFDZCxZQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7UUFBUSxLQUFBLHVDQUFBOztVQUNFLElBQUcsS0FBSyxDQUFDLElBQU4sQ0FBVyxDQUFYLENBQUg7WUFDRSxJQUFlLEtBQUssQ0FBQyxNQUFOLENBQWEsQ0FBYixFQUFnQixHQUFoQixDQUFmO0FBQUEscUJBQU8sS0FBUDthQURGO1dBQUEsTUFFSyxJQUFHLE1BQU0sQ0FBQyxJQUFQLENBQVksQ0FBWixDQUFIO1lBQ0gsSUFBZSxNQUFNLENBQUMsTUFBUCxDQUFjLENBQWQsRUFBaUIsR0FBakIsQ0FBZjtBQUFBLHFCQUFPLEtBQVA7YUFERzs7UUFIUDtBQUtBLGVBQU87TUFORCxDQWhEUjtNQXdEQSxPQUFBLEVBQVMsUUFBQSxDQUFDLEdBQUQsQ0FBQTtBQUNmLFlBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBO1FBQVEsTUFBQSxHQUFTO1FBQ1QsS0FBQSwrQ0FBQTs7VUFDRSxNQUFNLENBQUMsTUFBUCxDQUFjLElBQUksQ0FBQyxPQUFMLENBQWEsQ0FBYixFQUFnQixNQUFNLENBQUMsTUFBdkIsQ0FBZCxFQUE4QyxDQUE5QyxFQUFpRCxJQUFqRDtRQURGO0FBRUEsZUFBTztNQUpBLENBeERUO01BOERBLE1BQUEsRUFBUSxRQUFBLENBQUMsUUFBRCxDQUFBO2VBQ04sS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFJLEdBQUosQ0FBUSxFQUFFLENBQUMsTUFBSCxDQUFVLFFBQVYsQ0FBUixDQUFYO01BRE07SUE5RFIsQ0FERjtJQW1FQSxRQUFBLEVBQ0U7TUFBQSxJQUFBLEVBQU0sUUFBQSxDQUFDLENBQUQsQ0FBQTtlQUFNLENBQUEsWUFBYTtNQUFuQixDQUFOO01BQ0EsUUFBQSxFQUFVLFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFBTTtNQUFOLENBRFY7TUFHQSxNQUFBLEVBQVEsUUFBQSxDQUFDLENBQUQsQ0FBQTtlQUFNO01BQU4sQ0FIUjtNQUlBLFNBQUEsRUFBVyxRQUFBLENBQUMsQ0FBRCxDQUFBO2VBQU87TUFBUCxDQUpYO01BS0EsRUFBQSxFQUFJLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO2VBQVMsQ0FBQSxLQUFLO01BQWQsQ0FMSjtNQU1BLElBQUEsRUFBTSxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtlQUFTLENBQUEsS0FBTztNQUFoQixDQU5OO01BT0EsS0FBQSxFQUFPLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO1FBQ0wsSUFBRyxNQUFNLENBQUMsRUFBUCxDQUFVLENBQVYsRUFBYSxDQUFiLENBQUg7aUJBQ0UsS0FERjtTQUFBLE1BRUssSUFBRyxLQUFLLENBQUMsSUFBTixDQUFXLENBQVgsQ0FBQSxJQUFrQixLQUFLLENBQUMsSUFBTixDQUFXLENBQVgsQ0FBckI7VUFDSCxJQUFRLEtBQUssQ0FBQyxLQUFOLENBQVksQ0FBWixFQUFlLENBQWYsQ0FBUjttQkFBQSxLQUFBO1dBREc7U0FBQSxNQUVBLElBQUcsTUFBTSxDQUFDLElBQVAsQ0FBWSxDQUFaLENBQUEsSUFBbUIsTUFBTSxDQUFDLElBQVAsQ0FBWSxDQUFaLENBQXRCO1VBQ0gsSUFBUSxNQUFNLENBQUMsS0FBUCxDQUFhLENBQWIsRUFBZ0IsQ0FBaEIsQ0FBUjttQkFBQSxLQUFBO1dBREc7U0FBQSxNQUFBO2lCQUdILE1BSEc7O01BTEEsQ0FQUDtNQWdCQSxVQUFBLEVBQVksUUFBQSxDQUFDLENBQUQsRUFBSSxDQUFKLENBQUE7ZUFBUyxNQUFBLElBQVksUUFBUSxDQUFDLEtBQVQsQ0FBZSxDQUFmLEVBQWtCLENBQWxCLEVBQXJCO01BQUEsQ0FoQlo7TUFpQkEsUUFBQSxFQUFVLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO2VBQVMsQ0FBQyxRQUFRLENBQUMsS0FBVCxDQUFlLENBQWYsRUFBa0IsQ0FBbEI7TUFBVixDQWpCVjtNQWtCQSxhQUFBLEVBQWUsUUFBQSxDQUFDLENBQUQsRUFBSSxDQUFKLENBQUE7ZUFBUyxDQUFDLFFBQVEsQ0FBQyxVQUFULENBQW9CLENBQXBCLEVBQXVCLENBQXZCO01BQVYsQ0FsQmY7TUFvQkEsS0FBQSxFQUFPLFFBQUEsQ0FBQyxDQUFELENBQUE7UUFDTCxJQUFPLFNBQVA7aUJBQ0UsRUFERjtTQUFBLE1BRUssSUFBRyxRQUFRLENBQUMsSUFBVCxDQUFjLENBQWQsQ0FBSDtVQUNILE1BQU0sSUFBSSxLQUFKLENBQVUscURBQVYsRUFESDtTQUFBLE1BRUEsSUFBRyxPQUFPLENBQUMsSUFBUixDQUFhLENBQWIsQ0FBSDtVQUNILE1BQU0sSUFBSSxLQUFKLENBQVUsb0RBQVYsRUFESDtTQUFBLE1BRUEsSUFBRyxLQUFLLENBQUMsSUFBTixDQUFXLENBQVgsQ0FBSDtpQkFDSCxLQUFLLENBQUMsS0FBTixDQUFZLENBQVosRUFERztTQUFBLE1BRUEsSUFBRyxNQUFNLENBQUMsSUFBUCxDQUFZLENBQVosQ0FBSDtpQkFDSCxNQUFNLENBQUMsS0FBUCxDQUFhLENBQWIsRUFERztTQUFBLE1BQUE7aUJBR0gsRUFIRzs7TUFUQTtJQXBCUCxDQXBFRjtJQXVHQSxJQUFBLEVBRUU7TUFBQSxHQUFBLEVBQUssSUFBSSxDQUFDLEVBQUwsR0FBVSxDQUFmO01BRUEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFBTSxJQUFJLENBQUMsT0FBTCxHQUFlLElBQUksQ0FBQyxHQUFMLENBQVMsQ0FBVDtNQUFyQixDQUZOO01BR0EsT0FBQSxFQUFTLFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFBTSxDQUFJLElBQUksQ0FBQyxJQUFMLENBQVUsQ0FBVjtNQUFWLENBSFQ7TUFLQSxHQUFBLEVBQUssUUFBQSxDQUFDLENBQUQsRUFBSSxDQUFKLENBQUE7ZUFBUyxDQUFBLEdBQUk7TUFBYixDQUxMO01BTUEsR0FBQSxFQUFLLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO2VBQVMsQ0FBQSxHQUFJO01BQWIsQ0FOTDtNQU9BLEdBQUEsRUFBSyxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtlQUFTLENBQUEsR0FBSTtNQUFiLENBUEw7TUFRQSxHQUFBLEVBQUssUUFBQSxDQUFDLENBQUQsRUFBSSxDQUFKLENBQUE7ZUFBUyxDQUFBLEdBQUk7TUFBYixDQVJMO01BU0EsR0FBQSxFQUFLLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO2VBQVMsQ0FBQSxHQUFJO01BQWIsQ0FUTDtNQVdBLEdBQUEsRUFBSyxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtlQUFTLENBQUMsQ0FBQSxHQUFJLENBQUwsQ0FBQSxHQUFRO01BQWpCLENBWEw7TUFhQSxJQUFBLEVBQU0sUUFBQSxDQUFDLENBQUQsRUFBQSxPQUFBLENBQUE7QUFBNEIsWUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBO3NDQUFWO1FBQVgsQ0FBQyxHQUFBLEdBQU0sQ0FBUDtZQUFXO1VBQUEsTUFBTTs7ZUFBSyxJQUFJLENBQUMsR0FBTCxDQUFTLEdBQVQsRUFBYyxJQUFJLENBQUMsR0FBTCxDQUFTLEdBQVQsRUFBYyxDQUFkLENBQWQ7TUFBN0IsQ0FiTjtNQWNBLEdBQUEsRUFBSyxRQUFBLENBQUMsQ0FBRCxDQUFBO2VBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxDQUFWO01BQVAsQ0FkTDtNQWdCQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEtBQUQsRUFBUSxZQUFZLENBQXBCLEVBQXVCLFlBQVksQ0FBbkMsRUFBc0MsT0FBTyxLQUE3QyxDQUFBO1FBQ0wsS0FBQSxJQUFTLFNBQUEsR0FBWTtRQUNyQixLQUFBLElBQVM7UUFDVCxJQUFpRCxJQUFqRDtVQUFBLEtBQUEsR0FBUSxJQUFJLENBQUMsSUFBTCxDQUFVLEtBQVYsRUFBaUIsU0FBakIsRUFBNEIsU0FBNUIsRUFBUjs7QUFDQSxlQUFPO01BSkYsQ0FoQlA7TUFzQkEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxLQUFELEVBQVEsV0FBVyxDQUFuQixFQUFzQixXQUFXLENBQWpDLEVBQW9DLFlBQVksQ0FBaEQsRUFBbUQsWUFBWSxDQUEvRCxFQUFrRSxPQUFPLElBQXpFLENBQUE7UUFDSixJQUFvQixRQUFBLEtBQVksUUFBaEM7QUFBQSxpQkFBTyxVQUFQOztRQUNBLElBQTJGLFFBQUEsR0FBVyxRQUF0RztVQUFBLENBQUMsUUFBRCxFQUFXLFFBQVgsRUFBcUIsU0FBckIsRUFBZ0MsU0FBaEMsQ0FBQSxHQUE2QyxDQUFDLFFBQUQsRUFBVyxRQUFYLEVBQXFCLFNBQXJCLEVBQWdDLFNBQWhDLEVBQTdDOztRQUNBLElBQStDLElBQS9DO1VBQUEsS0FBQSxHQUFRLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBVixFQUFpQixRQUFqQixFQUEyQixRQUEzQixFQUFSOztRQUNBLEtBQUEsSUFBUztRQUNULEtBQUEsSUFBUyxRQUFBLEdBQVc7QUFDcEIsZUFBTyxJQUFJLENBQUMsS0FBTCxDQUFXLEtBQVgsRUFBa0IsU0FBbEIsRUFBNkIsU0FBN0IsRUFBd0MsS0FBeEM7TUFOSCxDQXRCTjtNQThCQSxJQUFBLEVBQU0sUUFBQSxDQUFDLE1BQU0sQ0FBQyxDQUFSLEVBQVcsTUFBTSxDQUFqQixDQUFBO2VBQXNCLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLE1BQUwsQ0FBQSxDQUFYLEVBQTBCLEdBQTFCLEVBQStCLEdBQS9CO01BQXRCLENBOUJOO01BK0JBLE9BQUEsRUFBUyxRQUFBLENBQUMsR0FBRCxFQUFNLEdBQU4sQ0FBQTtlQUFhLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFWLEVBQWUsR0FBZixDQUFYO01BQWIsQ0EvQlQ7TUFpQ0EsT0FBQSxFQUFTLFFBQUEsQ0FBQyxLQUFELEVBQVEsU0FBUixDQUFBO0FBQ2YsWUFBQSxDQUFBOztRQUNRLENBQUEsR0FBSSxDQUFBLEdBQUk7ZUFDUixJQUFJLENBQUMsS0FBTCxDQUFXLEtBQUEsR0FBUSxDQUFuQixDQUFBLEdBQXdCO01BSGpCO0lBakNULENBekdGO0lBZ0pBLE1BQUEsRUFDRTtNQUFBLElBQUEsRUFBTSxRQUFBLENBQUMsQ0FBRCxDQUFBO2VBQU0saUJBQUEsS0FBcUIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBMUIsQ0FBK0IsQ0FBL0I7TUFBM0IsQ0FBTjs7O01BSUEsRUFBQSxFQUFJLFFBQUEsQ0FBQyxDQUFELEVBQUksR0FBSixDQUFBLEVBQUE7QUFDVixZQUFBLENBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBO1FBQVEsQ0FBQSxHQUFJLENBQUE7UUFDSixLQUFBLHVDQUFBOztVQUFBLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBRCxDQUFKLENBQUQsR0FBWTtRQUFaO0FBQ0EsZUFBTztNQUhMLENBSko7TUFTQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEdBQUQsQ0FBQTtlQUNMLE1BQU0sQ0FBQyxTQUFQLENBQWlCLEdBQWpCLEVBQXNCLFFBQVEsQ0FBQyxLQUEvQjtNQURLLENBVFA7TUFZQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEdBQUQsQ0FBQTtlQUNMLE1BQU0sQ0FBQyxJQUFQLENBQVksR0FBWixDQUFnQixDQUFDO01BRFosQ0FaUDtNQWVBLEtBQUEsRUFBTyxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtBQUNiLFlBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxDQUFBLEVBQUE7UUFBUSxJQUFlLE1BQU0sQ0FBQyxFQUFQLENBQVUsQ0FBVixFQUFhLENBQWIsQ0FBZjtBQUFBLGlCQUFPLEtBQVA7O1FBQ0EsTUFBb0IsQ0FBQyxXQUFBLElBQU8sV0FBUixDQUFBLElBQWdCLENBQUMsQ0FBQSxDQUFBLENBQUUsQ0FBQyxXQUFILFlBQWtCLENBQUMsQ0FBQyxZQUFwQixPQUFBLEtBQW1DLENBQUMsQ0FBQyxXQUFyQyxDQUFELEVBQXBDO0FBQUEsaUJBQU8sTUFBUDs7UUFDQSxJQUFvQixNQUFNLENBQUMsSUFBUCxDQUFZLENBQVosQ0FBYyxDQUFDLE1BQWYsS0FBeUIsTUFBTSxDQUFDLElBQVAsQ0FBWSxDQUFaLENBQWMsQ0FBQyxNQUE1RDtBQUFBLGlCQUFPLE1BQVA7O1FBQ0EsS0FBQSxNQUFBOztVQUNFLEVBQUEsR0FBSyxDQUFDLENBQUMsQ0FBRDtVQUNOLElBQUcsUUFBUSxDQUFDLEtBQVQsQ0FBZSxFQUFmLEVBQW1CLEVBQW5CLENBQUg7QUFDRSxxQkFERjtXQUFBLE1BQUE7QUFHRSxtQkFBTyxNQUhUOztRQUZGO0FBTUEsZUFBTztNQVZGLENBZlA7TUEyQkEsT0FBQSxFQUFTLFFBQUEsQ0FBQyxHQUFELEVBQU0sS0FBSyxRQUFRLENBQUMsUUFBcEIsQ0FBQTtBQUNmLFlBQUEsQ0FBQSxFQUFBO1FBQVEsQ0FBQSxHQUFJLENBQUE7UUFDSixLQUFBLFFBQUE7VUFBQSxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBQSxDQUFHLENBQUg7UUFBUDtlQUNBO01BSE8sQ0EzQlQ7TUFnQ0EsU0FBQSxFQUFXLFFBQUEsQ0FBQyxHQUFELEVBQU0sS0FBSyxRQUFRLENBQUMsUUFBcEIsQ0FBQTtBQUNqQixZQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7UUFBUSxDQUFBLEdBQUksQ0FBQTtRQUNKLEtBQUEsUUFBQTs7VUFBQSxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBQSxDQUFHLENBQUg7UUFBUDtlQUNBO01BSFMsQ0FoQ1g7TUFxQ0EsS0FBQSxFQUFPLFFBQUEsQ0FBQSxHQUFDLElBQUQsQ0FBQTtBQUNiLFlBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQTtRQUFRLEdBQUEsR0FBTSxDQUFBO1FBQ04sS0FBQSx3Q0FBQTs7Y0FBcUI7WUFDbkIsS0FBQSxRQUFBO3lCQUFBOzs7O2NBSUUsR0FBRyxDQUFDLENBQUQsQ0FBSCxHQUFZLE1BQU0sQ0FBQyxJQUFQLENBQVksQ0FBWixDQUFILEdBQ1AsTUFBTSxDQUFDLEtBQVAsQ0FBYSxHQUFHLENBQUMsQ0FBRCxDQUFoQixFQUFxQixDQUFyQixDQURPLEdBR1A7WUFQSjs7UUFERjtlQVNBO01BWEssQ0FyQ1A7TUFrREEsTUFBQSxFQUFRLFFBQUEsQ0FBQSxHQUFDLElBQUQsQ0FBQTtlQUNOLE1BQU0sQ0FBQyxLQUFQLENBQWEsR0FBQSxJQUFJLENBQUMsT0FBTCxDQUFBLENBQWI7TUFETSxDQWxEUjtNQXFEQSxNQUFBLEVBQVEsUUFBQSxDQUFDLEdBQUQsRUFBTSxHQUFOLENBQUE7QUFDZCxZQUFBLENBQUEsRUFBQTtRQUFRLElBQWUsZ0JBQWY7QUFBQSxpQkFBTyxLQUFQOztRQUNBLEtBQUEsUUFBQTs7VUFDRSxJQUFHLEtBQUssQ0FBQyxJQUFOLENBQVcsQ0FBWCxDQUFIO1lBQ0UsSUFBZSxLQUFLLENBQUMsTUFBTixDQUFhLENBQWIsRUFBZ0IsR0FBaEIsQ0FBZjtBQUFBLHFCQUFPLEtBQVA7YUFERjtXQUFBLE1BRUssSUFBRyxNQUFNLENBQUMsSUFBUCxDQUFZLENBQVosQ0FBSDtZQUNILElBQWUsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFkLEVBQWlCLEdBQWpCLENBQWY7QUFBQSxxQkFBTyxLQUFQO2FBREc7O1FBSFA7QUFLQSxlQUFPO01BUEQsQ0FyRFI7TUE4REEsWUFBQSxFQUFjLFFBQUEsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFBO0FBQ3BCLFlBQUEsQ0FBQSxFQUFBO1FBQVEsQ0FBQSxHQUFJLE1BQU0sQ0FBQyxPQUFQLENBQWUsQ0FBZixFQUFaO1FBQ1EsS0FBQSxNQUFBO1VBQUEsT0FBTyxDQUFDLENBQUMsQ0FBRDtRQUFSO2VBQ0E7TUFIWTtJQTlEZCxDQWpKRjtJQXFOQSxPQUFBLEVBQ0U7TUFBQSxJQUFBLEVBQU0sUUFBQSxDQUFDLENBQUQsQ0FBQTtlQUFNLENBQUEsWUFBYTtNQUFuQixDQUFOO01BRUEsT0FBQSxFQUFTLFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFBTSxJQUFJLE9BQUosQ0FBWSxRQUFBLENBQUMsT0FBRCxDQUFBO2lCQUFZLFVBQUEsQ0FBVyxPQUFYLEVBQW9CLENBQXBCO1FBQVosQ0FBWjtNQUFOO0lBRlQsQ0F0TkY7SUEyTkEsTUFBQSxFQUNFO01BQUEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFBTSxRQUFBLEtBQVksT0FBTztNQUF6QixDQUFOOztNQUdBLElBQUEsRUFBTSxRQUFBLENBQUMsR0FBRCxFQUFNLE9BQU8sQ0FBYixDQUFBO0FBQ1osWUFBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBO1FBQVEsSUFBZ0IsV0FBaEI7QUFBQSxpQkFBTyxFQUFQOztRQUNBLEVBQUEsR0FBSyxVQUFBLEdBQWE7UUFDbEIsRUFBQSxHQUFLLFVBQUEsR0FBYTtRQUNsQixLQUFBLHVDQUFBOztVQUNFLEVBQUEsR0FBSyxDQUFDLENBQUMsVUFBRixDQUFhLENBQWI7VUFDTCxFQUFBLEdBQUssSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFBLEdBQUssRUFBZixFQUFtQixVQUFuQjtVQUNMLEVBQUEsR0FBSyxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQUEsR0FBSyxFQUFmLEVBQW1CLFVBQW5CO1FBSFA7UUFJQSxFQUFBLEdBQUssSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFBLEdBQUssQ0FBQyxFQUFBLEtBQUssRUFBTixDQUFmLEVBQTBCLFVBQTFCLENBQUEsR0FBd0MsSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFBLEdBQUssQ0FBQyxFQUFBLEtBQUssRUFBTixDQUFmLEVBQTBCLFVBQTFCO1FBQzdDLEVBQUEsR0FBSyxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQUEsR0FBSyxDQUFDLEVBQUEsS0FBSyxFQUFOLENBQWYsRUFBMEIsVUFBMUIsQ0FBQSxHQUF3QyxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQUEsR0FBSyxDQUFDLEVBQUEsS0FBSyxFQUFOLENBQWYsRUFBMEIsVUFBMUI7QUFDN0MsZUFBTyxVQUFBLEdBQWEsQ0FBQyxPQUFBLEdBQVUsRUFBWCxDQUFiLEdBQThCLENBQUMsRUFBQSxLQUFLLENBQU47TUFWakMsQ0FITjtNQWVBLFNBQUEsRUFBVyxRQUFBLENBQUMsS0FBRCxFQUFRLE1BQVIsRUFBZ0IsU0FBUyxHQUF6QixDQUFBO1FBQ1QsSUFBZSxLQUFBLEtBQVMsQ0FBeEI7VUFBQSxNQUFBLEdBQVMsR0FBVDs7ZUFDQSxDQUFDLE1BQUEsR0FBUyxNQUFWLENBQWlCLENBQUMsT0FBbEIsQ0FBMEIsSUFBMUIsRUFBZ0MsS0FBaEM7TUFGUyxDQWZYO01BbUJBLFdBQUEsRUFBYSxRQUFBLENBQUMsQ0FBRCxDQUFBO2VBQ1gsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxVQUFWLEVBQXFCLEtBQXJCLENBQTJCLENBQUMsV0FBNUIsQ0FBQTtNQURXO0lBbkJiO0VBNU5GLEVBRko7O0FBdVBFO0VBQUEsS0FBQSwwQkFBQTs7SUFDRSxXQUFBLEdBQWMsVUFBVSxDQUFDLFNBQUQ7OztBQUN4QjtNQUFBLEtBQUEsbUJBQUE7O1FBQ0UsSUFBRyx3QkFBSDt3QkFDRSxPQUFPLENBQUMsR0FBUixDQUFZLENBQUEsbUJBQUEsQ0FBQSxDQUFzQixTQUF0QixDQUFBLENBQUEsQ0FBQSxDQUFtQyxHQUFuQyxDQUFBLDJCQUFBLENBQVosR0FERjtTQUFBLE1BQUE7d0JBR0UsV0FBVyxDQUFDLEdBQUQsQ0FBWCxHQUFtQixPQUhyQjs7TUFERixDQUFBOzs7RUFGRixDQUFBOztBQXhQQyxDQUFBLElBalFpRTs7O0FBb2dCcEUsS0FBQSxHQUFRLElBQUEsR0FBTzs7QUFFWixDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQ0gsTUFBQTtFQUFFLE9BQUEsR0FBVTtFQUVWLEtBQUEsR0FBUSxRQUFBLENBQUMsSUFBRCxFQUFPLElBQVAsQ0FBQTtJQUNOLE9BQUEsR0FBVSxRQUFBLENBQUEsQ0FBQTtNQUFLLE9BQU8sQ0FBQyxLQUFSLENBQWMsQ0FBQSxFQUFBLENBQUEsQ0FBSyxJQUFMLENBQUEsQ0FBZCxFQUEyQixZQUEzQjthQUF5QyxPQUFBLEdBQVU7SUFBeEQ7SUFDVixJQUFBLENBQUE7SUFDQSxPQUFPLENBQUMsUUFBUixDQUFBO1dBQ0EsT0FBQSxHQUFVO0VBSko7U0FNUixJQUFBLEdBQU8sUUFBQSxDQUFDLElBQUQsRUFBQSxHQUFVLEtBQVYsQ0FBQTtBQUVULFFBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsT0FBQSxFQUFBLEtBQUE7O0lBQ0ksS0FBQSxpREFBQTs7VUFBMkIsUUFBUSxDQUFDLElBQVQsQ0FBYyxLQUFkO1FBQ3pCLEtBQUssQ0FBQyxDQUFELENBQUwsR0FBVyxLQUFBLENBQUE7O0lBRGIsQ0FESjs7SUFLSSxJQUFHLEtBQUssQ0FBQyxNQUFOLEtBQWdCLENBQW5CO01BQ0UsS0FBSyxDQUFDLE9BQU4sQ0FBYyxJQUFkLEVBREY7O0FBS0E7OztBQUFBO0lBQUEsS0FBQSwrQ0FBQTs7TUFDRSxLQUFPLFFBQVEsQ0FBQyxVQUFULENBQW9CLEtBQXBCLEVBQTJCLEtBQUssQ0FBQyxDQUFBLEdBQUUsQ0FBSCxDQUFoQyxDQUFQOztVQUNFOztRQUNBLE9BQU8sQ0FBQyxLQUFSLENBQWMsQ0FBQSxFQUFBLENBQUEsQ0FBSyxJQUFMLENBQUEsQ0FBZCxFQUEyQixxQkFBM0I7UUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLE9BQVosRUFBcUIsS0FBckI7UUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLE9BQVosRUFBcUIsS0FBSyxDQUFDLENBQUEsR0FBRSxDQUFILENBQTFCO3FCQUNBLE9BQU8sQ0FBQyxRQUFSLENBQUEsR0FMRjtPQUFBLE1BQUE7NkJBQUE7O0lBREYsQ0FBQTs7RUFaSztBQVROLENBQUEsSUF0Z0JpRTs7O0FBc2lCcEUsSUFBQSxDQUFLLENBQUMsTUFBRCxDQUFMLEVBQWUsUUFBQSxDQUFDLElBQUQsQ0FBQTtBQUVmLE1BQUEsUUFBQSxFQUFBLFlBQUEsRUFBQTtFQUFFLElBQUEsR0FBTyxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtXQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBUCxDQUFxQixDQUFDLENBQUMsSUFBdkI7RUFBVDtFQUVQLFlBQUEsR0FBZSxNQUFBLFFBQUEsQ0FBQyxJQUFELENBQUE7QUFDakIsUUFBQTtJQUFJLElBQUcsQ0FBQSxNQUFNLElBQUksQ0FBQyxNQUFMLENBQVksSUFBSSxDQUFDLElBQWpCLENBQU4sQ0FBSDtNQUNFLE9BQUEsR0FBVSxDQUFBLE1BQU0sSUFBSSxDQUFDLGFBQUwsQ0FBbUIsSUFBSSxDQUFDLElBQXhCLENBQU47TUFDVixPQUFPLENBQUMsSUFBUixDQUFhLElBQWI7TUFDQSxJQUFJLENBQUMsUUFBTCxHQUFnQixDQUFBLE1BQU0sT0FBTyxDQUFDLEdBQVIsQ0FBWSxPQUFPLENBQUMsR0FBUixDQUFZLE1BQUEsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUNwRCxZQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUE7UUFBUSxJQUFHLE1BQU0sQ0FBQyxXQUFQLENBQUEsQ0FBSDtVQUNFLFNBQUEsR0FBWSxRQUFRLENBQUMsUUFBVCxDQUFrQixJQUFJLENBQUMsSUFBdkIsRUFBNkIsTUFBTSxDQUFDLElBQXBDO1VBQ1osU0FBUyxDQUFDLE9BQVYsR0FBb0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFJLENBQUMsT0FBZixFQUF3QixNQUFNLENBQUMsSUFBL0I7VUFDcEIsTUFBTSxZQUFBLENBQWEsU0FBYjtVQUNOLElBQUksQ0FBQyxLQUFMLElBQWMsU0FBUyxDQUFDO2lCQUN4QixVQUxGO1NBQUEsTUFBQTtVQU9FLElBQUksQ0FBQyxLQUFMLElBQWM7VUFDZCxLQUFBLEdBQVEsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFaLENBQWtCLEdBQWxCO2lCQUNSLFNBQUEsR0FDRTtZQUFBLElBQUEsRUFBTSxNQUFNLENBQUMsSUFBYjtZQUNBLFFBQUEsRUFBVSxLQUFLLENBQUMsT0FBTixDQUFjLEtBQWQsQ0FBb0IsQ0FBQyxJQUFyQixDQUEwQixHQUExQixDQURWO1lBRUEsR0FBQSxFQUFRLEtBQUssQ0FBQyxNQUFOLEdBQWUsQ0FBbEIsR0FBeUIsS0FBSyxDQUFDLElBQU4sQ0FBVyxLQUFYLENBQWlCLENBQUMsV0FBbEIsQ0FBQSxDQUF6QixHQUE4RCxJQUZuRTtZQUdBLElBQUEsRUFBTSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxJQUFmLEVBQXFCLE1BQU0sQ0FBQyxJQUE1QixDQUhOO1lBSUEsT0FBQSxFQUFTLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBSSxDQUFDLE9BQWYsRUFBd0IsTUFBTSxDQUFDLElBQS9CO1VBSlQsRUFWSjs7TUFENEMsQ0FBWixDQUFaLENBQU4sRUFIbEI7O1dBbUJBO0VBcEJhO1NBc0JmLElBQUEsQ0FBSyxVQUFMLEVBQWlCLFFBQUEsR0FDZjtJQUFBLFFBQUEsRUFBVSxRQUFBLENBQUMsVUFBRCxFQUFhLElBQWIsQ0FBQTthQUNSO1FBQUEsSUFBQSxFQUFNLElBQU47UUFDQSxRQUFBLEVBQVUsSUFEVjtRQUVBLEdBQUEsRUFBSyxJQUZMO1FBR0EsSUFBQSxFQUFNLElBQUksQ0FBQyxJQUFMLENBQVUsVUFBVixFQUFzQixJQUF0QixDQUhOO1FBSUEsT0FBQSxFQUFTLElBSlQ7UUFLQSxLQUFBLEVBQU8sQ0FMUDtRQU1BLFFBQUEsRUFBVTtNQU5WO0lBRFEsQ0FBVjtJQVNBLFlBQUEsRUFBYyxNQUFBLFFBQUEsQ0FBQyxVQUFELEVBQWEsSUFBYixDQUFBO0FBQ2xCLFVBQUE7TUFBTSxJQUFBLEdBQU8sUUFBUSxDQUFDLFFBQVQsQ0FBa0IsVUFBbEIsRUFBOEIsSUFBOUI7TUFDUCxNQUFNLFlBQUEsQ0FBYSxJQUFiO2FBQ047SUFIWSxDQVRkO0lBY0EsSUFBQSxFQUFNLFFBQUEsQ0FBQyxJQUFELEVBQU8sQ0FBUCxFQUFVLE9BQU8sRUFBakIsQ0FBQTtBQUNWLFVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7QUFBTTtNQUFBLEtBQUEsdUNBQUE7O1FBQ0UsSUFBTyxTQUFQO1VBQ0UsSUFBSSxDQUFDLElBQUwsQ0FBVSxLQUFWLEVBREY7U0FBQSxNQUVLLElBQUcsZ0JBQUg7VUFDSCxJQUFJLENBQUMsSUFBTCxDQUFVLEtBQUssQ0FBQyxDQUFELENBQWYsRUFERzs7UUFFTCxJQUFnQyxLQUFLLENBQUMsUUFBdEM7VUFBQSxRQUFRLENBQUMsSUFBVCxDQUFjLEtBQWQsRUFBcUIsQ0FBckIsRUFBd0IsSUFBeEIsRUFBQTs7TUFMRjthQU1BO0lBUEksQ0FkTjtJQXVCQSxJQUFBLEVBQU0sUUFBQSxDQUFDLElBQUQsRUFBTyxDQUFQLEVBQVUsQ0FBVixDQUFBO0FBQ1YsVUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxHQUFBLEVBQUE7TUFBTSxJQUFlLElBQUksQ0FBQyxDQUFELENBQUosS0FBVyxDQUExQjtBQUFBLGVBQU8sS0FBUDs7TUFDQSxJQUFHLElBQUksQ0FBQyxRQUFSO0FBQ0U7UUFBQSxLQUFBLHVDQUFBOztVQUNFLElBQWMsR0FBQSxHQUFNLFFBQVEsQ0FBQyxJQUFULENBQWMsS0FBZCxFQUFxQixDQUFyQixFQUF3QixDQUF4QixDQUFwQjtBQUFBLG1CQUFPLElBQVA7O1FBREYsQ0FERjs7YUFHQTtJQUxJO0VBdkJOLENBREY7QUExQmEsQ0FBZixFQXRpQm9FOzs7QUFrbUJwRSxJQUFBLENBQUssRUFBTCxFQUFTLFFBQUEsQ0FBQSxDQUFBO0FBQ1QsTUFBQTtFQUFFLEdBQUEsR0FBTSxDQUNKLE9BREksRUFFSixPQUZJLEVBR0osT0FISSxFQUlKLE9BSkksRUFLSixPQUxJLEVBTUosT0FOSSxFQU9KLE9BUEksRUFRSixPQVJJLEVBU0osT0FUSSxFQVVKLE9BVkksRUFXSixPQVhJLEVBWUosT0FaSSxFQWFKLE9BYkksRUFjSixPQWRJLEVBZUosT0FmSSxFQWdCSixPQWhCSSxFQWlCSixPQWpCSSxFQWtCSixPQWxCSSxFQW1CSixPQW5CSSxFQW9CSixPQXBCSSxFQXFCSixPQXJCSSxFQXNCSixPQXRCSSxFQXVCSixPQXZCSSxFQXdCSixPQXhCSSxFQXlCSixPQXpCSSxFQTBCSixPQTFCSSxFQTJCSixPQTNCSSxFQTRCSixPQTVCSSxFQTZCSixPQTdCSSxFQThCSixPQTlCSTtTQWlDTixJQUFBLENBQUssYUFBTCxFQUFvQixRQUFBLENBQUMsQ0FBRCxDQUFBO0lBQ2xCLElBQUcsU0FBSDtNQUNFLENBQUEsSUFBSyxHQUFHLENBQUMsT0FEWDtLQUFBLE1BQUE7TUFHRSxDQUFBLEdBQUksSUFBSSxDQUFDLElBQUwsQ0FBVSxDQUFWLEVBQWEsR0FBRyxDQUFDLE1BQWpCLEVBSE47O1dBSUEsR0FBRyxDQUFDLENBQUEsR0FBRSxDQUFIO0VBTGUsQ0FBcEI7QUFsQ08sQ0FBVCxFQWxtQm9FOzs7QUE4b0JwRSxJQUFBLENBQUssRUFBTCxFQUFTLFFBQUEsQ0FBQSxDQUFBO0FBRVQsTUFBQTtTQUFFLElBQUEsQ0FBSyxVQUFMLEVBQWlCLFFBQUEsR0FBVyxRQUFBLENBQUEsT0FBQSxDQUFBO0FBRTlCLFFBQUEsZUFBQSxFQUFBLGdCQUFBLEVBQUEsSUFBQSxFQUFBLFNBQUEsRUFBQSxrQkFBQSxFQUFBLFlBQUEsRUFBQSxHQUFBLEVBQUEsZ0JBQUEsRUFBQSxHQUFBLEVBQUEsaUJBQUEsRUFBQSxTQUFBLEVBQUE7a0NBRm1EO0lBQWpCLENBQUMsU0FBQSxHQUFZLENBQWI7SUFFOUIsa0JBQUEsR0FBcUI7SUFDckIsaUJBQUEsR0FBb0I7SUFDcEIsZUFBQSxHQUFrQjtJQUNsQixZQUFBLEdBQWU7SUFDZixTQUFBLEdBQVk7SUFFWixHQUFBLEdBQU0sUUFBQSxDQUFBLENBQUE7TUFFSixJQUFtQyxlQUFuQzs7QUFBQSxlQUFPLGlCQUFBLEdBQW9CLEtBQTNCOztNQUNBLGVBQUEsR0FBa0IsS0FGeEI7O01BS00sZ0JBQUEsQ0FBQSxFQUxOOzs7TUFTTSxjQUFBLENBQWUsUUFBQSxDQUFBLENBQUEsRUFBQTs7UUFHYixTQUFBLEdBQVksV0FBVyxDQUFDLEdBQVosQ0FBQTtlQUNaLGdCQUFBLENBQWlCLElBQWpCO01BSmEsQ0FBZixFQVROOzthQWdCTTtJQWpCSTtJQW9CTixnQkFBQSxHQUFtQixRQUFBLENBQUEsQ0FBQTtNQUNqQixJQUFVLGtCQUFWO0FBQUEsZUFBQTs7TUFDQSxrQkFBQSxHQUFxQjthQUNyQixxQkFBQSxDQUFzQixTQUF0QjtJQUhpQixFQTFCdkI7OztJQWlDSSxTQUFBLEdBQVksUUFBQSxDQUFBLENBQUE7QUFDaEIsVUFBQTtNQUFNLEtBQUEsR0FBUTtNQUNSLGtCQUFBLEdBQXFCO01BQ3JCLGlCQUFBLEdBQW9CO01BQ3BCLGVBQUEsR0FBa0I7TUFDbEIsWUFBQSxHQUFlO01BQ2YsSUFBUyxLQUFUO2VBQUEsR0FBQSxDQUFBLEVBQUE7O0lBTlUsRUFqQ2hCOzs7OztJQTZDSSxJQUFBLEdBQU8sUUFBQSxDQUFDLFdBQUQsQ0FBQTtNQUNMLFlBQUEsR0FBZSxXQUFXLENBQUMsR0FBWixDQUFBLENBQUEsR0FBb0IsU0FBcEIsR0FBZ0MsQ0FBQyxXQUFBLElBQWUsU0FBaEI7TUFFL0MsSUFBRyxZQUFIOztRQUVFLGlCQUFBLEdBQW9CLEtBRDVCOzs7UUFLUSxnQkFBQSxDQUFBLEVBTkY7O0FBUUEsYUFBTyxDQUFJO0lBWE47QUFhUCxXQUFPO0VBNURtQixDQUE1QjtBQUZPLENBQVQsRUE5b0JvRTs7O0FBaXRCcEUsSUFBQSxDQUFLLEVBQUwsRUFBUyxRQUFBLENBQUEsQ0FBQTtBQUVULE1BQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUEsT0FBQSxFQUFBLGNBQUEsRUFBQTtFQUFFLFFBQUEsR0FBVyxDQUFBO0VBQ1gsUUFBQSxHQUFXO0VBQ1gsT0FBQSxHQUFVO0VBQ1YsUUFBQSxHQUFXO0VBQ1gsS0FBQSxHQUFRO0VBRVIsSUFBSSxDQUFDLEtBQUwsQ0FBVyxLQUFYLEVBQWtCLEdBQUEsR0FBTSxRQUFBLENBQUMsUUFBRCxFQUFXLElBQVgsRUFBQSxHQUFvQixJQUFwQixDQUFBLEVBQUE7O0lBRXRCLElBQUcsTUFBTSxDQUFDLElBQVAsQ0FBWSxRQUFaLENBQUg7QUFDRSxhQUFPLEdBQUEsQ0FBSSxDQUFKLEVBQU8sUUFBUCxFQUFpQixJQUFqQixFQUF1QixHQUFHLElBQTFCLEVBRFQ7O0lBR0EsSUFBc0Qsc0JBQXREO01BQUEsTUFBTSxLQUFBLENBQU0sQ0FBQSx5QkFBQSxDQUFBLENBQTRCLElBQTVCLENBQUEsQ0FBTixFQUFOOztXQUVBLElBQUksT0FBSixDQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7QUFDaEIsVUFBQTs7WUFBZ0IsQ0FBQyxRQUFELElBQWM7O01BQ3hCLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBRCxDQUFVLENBQUMsSUFBckIsQ0FBMEIsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLE9BQWIsQ0FBMUI7TUFDQSxHQUFHLENBQUMsS0FBSjthQUNBLEdBQUcsQ0FBQyxPQUFKLENBQUE7SUFKVSxDQUFaO0VBUHNCLENBQXhCO0VBYUEsR0FBRyxDQUFDLE1BQUosR0FBYTtFQUNiLEdBQUcsQ0FBQyxLQUFKLEdBQVk7RUFDWixHQUFHLENBQUMsS0FBSixHQUFZO0VBRVosR0FBRyxDQUFDLE9BQUosR0FBYyxRQUFBLENBQUMsSUFBRCxFQUFPLE9BQVAsQ0FBQTtJQUNaLElBQUcsUUFBUSxDQUFDLElBQUQsQ0FBWDtNQUF1QixNQUFNLEtBQUEsQ0FBTSxDQUFBLGtCQUFBLENBQUEsQ0FBcUIsSUFBckIsQ0FBQSxlQUFBLENBQU4sRUFBN0I7O1dBQ0EsUUFBUSxDQUFDLElBQUQsQ0FBUixHQUFpQjtFQUZMO0VBSWQsR0FBRyxDQUFDLE9BQUosR0FBYyxRQUFBLENBQUMsT0FBRCxDQUFBO1dBQ1osUUFBUSxDQUFDLElBQVQsQ0FBYyxPQUFkO0VBRFk7RUFHZCxHQUFHLENBQUMsT0FBSixHQUFjLFFBQUEsQ0FBQSxDQUFBO0lBQ1osSUFBVSxPQUFWO0FBQUEsYUFBQTs7SUFDQSxPQUFBLEdBQVU7SUFDVixRQUFBLEdBQVcsV0FBVyxDQUFDLEdBQVosQ0FBQTtJQUNYLEdBQUcsQ0FBQyxLQUFKLEdBQVk7SUFDWixjQUFBLENBQUE7V0FDQSxxQkFBQSxDQUFzQixHQUF0QjtFQU5ZO0VBUWQsR0FBQSxHQUFNLFFBQUEsQ0FBQSxDQUFBO0FBQ1IsUUFBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQSxRQUFBLEVBQUEsS0FBQSxFQUFBLEdBQUEsRUFBQSxPQUFBLEVBQUEsSUFBQSxFQUFBO0lBQUksS0FBQSxHQUFRO0FBQ1I7SUFBQSxLQUFBLHlEQUFBOztBQUNFLDhCQUFNLEtBQUssQ0FBRSxnQkFBUCxHQUFnQixDQUF0QjtRQUNFLEtBQUEsR0FBUTtRQUNSLENBQUEsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLElBQWIsRUFBbUIsT0FBbkIsQ0FBQSxHQUE4QixLQUFLLENBQUMsS0FBTixDQUFBLENBQTlCO1FBQ0EsR0FBRyxDQUFDLEtBQUo7UUFDQSxPQUFBLENBQVEsUUFBUSxDQUFDLElBQUQsQ0FBUixDQUFlLEdBQUcsSUFBbEIsQ0FBUixFQUhSO1FBSVEsR0FBRyxDQUFDLEtBQUosR0FBWSxDQUFDLFdBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBQSxHQUFvQixRQUFyQixDQUFBLEdBQWlDLEdBQWpDLEdBQXVDLEdBQUcsQ0FBQyxLQUFKLEdBQVk7UUFDL0QsSUFBaUIsR0FBRyxDQUFDLEtBQUosR0FBWSxFQUE3QjtBQUFBLGlCQUFPLElBQUEsQ0FBQSxFQUFQOztNQU5GO0lBREY7SUFRQSxPQUFBLEdBQVU7SUFFVixJQUFpQixLQUFqQjs7TUFBQSxHQUFHLENBQUMsT0FBSixDQUFBLEVBQUE7O1dBQ0EsY0FBQSxDQUFBO0VBYkk7RUFlTixJQUFBLEdBQU8sUUFBQSxDQUFBLENBQUE7SUFDTCxRQUFBLEdBQVcsV0FBVyxDQUFDLEdBQVosQ0FBQTtJQUNYLHFCQUFBLENBQXNCLEdBQXRCO1dBQ0EsY0FBQSxDQUFBO0VBSEs7U0FLUCxjQUFBLEdBQWlCLFFBQUEsQ0FBQSxDQUFBO0FBQ25CLFFBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQTtJQUFJLEtBQUEsNENBQUE7O01BQ0UsT0FBQSxDQUFRLEdBQUcsQ0FBQyxLQUFaLEVBQW1CLEdBQUcsQ0FBQyxLQUF2QjtJQURGO1dBRUE7RUFIZTtBQTVEVixDQUFULEVBanRCb0U7OztBQXF4QmpFLENBQUEsTUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNILE1BQUEsR0FBQSxFQUFBLFdBQUEsRUFBQTtFQUFFLElBQThDLDBEQUE5QztJQUFBLENBQUEsQ0FBRSxXQUFGLENBQUEsR0FBa0IsT0FBQSxDQUFRLFlBQVIsQ0FBbEIsRUFBQTs7RUFFQSxJQUFBLEdBQU8sV0FBVyxDQUFDLEdBQVosQ0FBQTtFQUVQLEdBQUEsR0FBTSxDQUFBLE1BQU0sSUFBSSxDQUFDLEtBQUwsQ0FBVyxLQUFYLENBQU47U0FFTixHQUFBLENBQUkscUJBQUosRUFBMkIsSUFBM0IsRUFBaUMsSUFBakM7QUFQQyxDQUFBLElBcnhCaUU7OztBQWl5QnBFLElBQUEsQ0FBSyxFQUFMLEVBQVMsUUFBQSxDQUFBLENBQUE7QUFDVCxNQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxPQUFBLEVBQUE7RUFBRSxJQUE4QywwREFBOUM7SUFBQSxDQUFBLENBQUUsV0FBRixDQUFBLEdBQWtCLE9BQUEsQ0FBUSxZQUFSLENBQWxCLEVBQUE7R0FBRjs7RUFHRSxFQUFBLEdBQUssR0FBQSxHQUFNLEdBQUEsR0FBTSxPQUFBLEdBQVU7RUFFM0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxLQUFYLEVBQWtCLEdBQUEsR0FBTSxRQUFBLENBQUMsR0FBRCxFQUFNLEtBQU4sRUFBYSxJQUFiLENBQUE7O01BQ3RCLE1BQU8sSUFBQSxDQUFLLEtBQUw7S0FBWDs7SUFHSSxzQkFBRyxVQUFBLFVBQVcsSUFBQSxDQUFLLFNBQUwsQ0FBZDtNQUNFLE9BQUEsQ0FBUSxHQUFSLEVBQWEsS0FBYixFQUFvQixJQUFwQixFQURGO0tBSEo7O0lBT0ksaUJBQUcsS0FBQSxLQUFNLElBQUEsQ0FBSyxJQUFMLENBQVQ7TUFDRSxFQUFFLENBQUMsSUFBSCxDQUFRLFNBQVIsRUFBbUIsR0FBbkIsRUFBd0IsS0FBeEIsRUFBK0IsSUFBL0IsRUFERjtLQVBKOztJQVdJLG1CQUFHLEdBQUcsQ0FBRSxlQUFMLG1CQUFlLEdBQUcsQ0FBRSxrQkFBcEIsbUJBQWlDLE1BQUEsTUFBTyxJQUFBLENBQUssS0FBTCxFQUEzQztNQUNFLEdBQUcsQ0FBQyxJQUFKLENBQVMsU0FBVCxFQUFvQixHQUFwQixFQUF5QixLQUF6QixFQUFnQyxJQUFoQyxFQURGOztBQUdBLFdBQU87RUFmZSxDQUF4QjtFQWlCQSxHQUFHLENBQUMsSUFBSixHQUFXLFFBQUEsQ0FBQyxHQUFELEVBQU0sRUFBTixDQUFBO0FBQ2IsUUFBQSxLQUFBLEVBQUE7SUFBSSxLQUFBLEdBQVEsV0FBVyxDQUFDLEdBQVosQ0FBQTtJQUNSLENBQUEsR0FBSSxFQUFBLENBQUE7SUFDSixHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVQsQ0FBbUIsR0FBbkIsRUFBd0IsV0FBVyxDQUFDLEdBQVosQ0FBQSxDQUFBLEdBQW9CLEtBQTVDO0FBQ0EsV0FBTztFQUpFO0VBTVgsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFULEdBQWlCLE1BQUEsUUFBQSxDQUFDLEdBQUQsRUFBTSxFQUFOLENBQUE7QUFDbkIsUUFBQSxLQUFBLEVBQUE7SUFBSSxLQUFBLEdBQVEsV0FBVyxDQUFDLEdBQVosQ0FBQTtJQUNSLENBQUEsR0FBSSxDQUFBLE1BQU0sRUFBQSxDQUFBLENBQU47SUFDSixHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVQsQ0FBbUIsR0FBbkIsRUFBd0IsV0FBVyxDQUFDLEdBQVosQ0FBQSxDQUFBLEdBQW9CLEtBQTVDO0FBQ0EsV0FBTztFQUpRO0VBTWpCLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBVCxHQUFrQixRQUFBLENBQUMsTUFBRCxDQUFBO0FBQ3BCLFFBQUE7SUFBSSxJQUFjLE1BQWQ7TUFBQSxHQUFBLENBQUksTUFBSixFQUFBOztJQUNBLEtBQUEsR0FBUSxXQUFXLENBQUMsR0FBWixDQUFBO1dBQ1IsUUFBQSxDQUFDLE9BQUQsQ0FBQTthQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBVCxDQUFtQixPQUFuQixFQUE0QixXQUFXLENBQUMsR0FBWixDQUFBLENBQUEsR0FBb0IsS0FBaEQ7SUFBWjtFQUhnQjtFQUtsQixHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVQsR0FBcUIsUUFBQSxDQUFDLEdBQUQsRUFBTSxJQUFOLENBQUE7V0FDbkIsR0FBQSxDQUFJLElBQUksQ0FBQyxPQUFMLENBQWEsQ0FBYixDQUFlLENBQUMsUUFBaEIsQ0FBeUIsQ0FBekIsQ0FBQSxHQUE4QixHQUE5QixHQUFvQyxHQUF4QztFQURtQjtTQUdyQixHQUFHLENBQUMsR0FBSixHQUFVLFFBQUEsQ0FBQyxHQUFELENBQUE7V0FDUixHQUFBLENBQUksR0FBSixFQUFTO01BQUEsS0FBQSxFQUFPO0lBQVAsQ0FBVDtFQURRO0FBM0NILENBQVQsRUFqeUJvRTs7O0FBazFCcEUsSUFBQSxDQUFLLENBQUMsTUFBRCxDQUFMLEVBQWUsUUFBQSxDQUFDLElBQUQsQ0FBQTtBQUVmLE1BQUE7U0FBRSxJQUFBLENBQUssT0FBTCxFQUFjLEtBQUEsR0FDWjtJQUFBLEtBQUEsRUFBTyxRQUFBLENBQUMsS0FBRCxDQUFBO2FBQXdCLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxDQUFDLElBQWhCLEVBQXNCLE9BQXRCO0lBQXhCLENBQVA7SUFDQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUF3QixJQUFJLENBQUMsSUFBTCxDQUFVLEtBQUssQ0FBQyxJQUFoQixFQUFzQixNQUF0QjtJQUF4QixDQURQO0lBRUEsS0FBQSxFQUFPLFFBQUEsQ0FBQyxLQUFELENBQUE7YUFBd0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxLQUFLLENBQUMsSUFBaEIsRUFBc0IsTUFBdEI7SUFBeEIsQ0FGUDtJQUdBLFFBQUEsRUFBVSxRQUFBLENBQUMsS0FBRCxDQUFBO2FBQXFCLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxDQUFDLElBQWhCLEVBQXNCLFlBQXRCO0lBQXJCLENBSFY7SUFJQSxJQUFBLEVBQU0sUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUF5QixJQUFJLENBQUMsSUFBTCxDQUFVLEtBQUssQ0FBQyxJQUFoQixFQUFzQixNQUF0QjtJQUF6QixDQUpOO0lBS0EsVUFBQSxFQUFZLFFBQUEsQ0FBQyxLQUFELENBQUE7YUFBbUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxLQUFLLENBQUMsSUFBaEIsRUFBc0IsaUJBQXRCO0lBQW5CLENBTFo7SUFPQSxJQUFBLEVBQU0sUUFBQSxDQUFDLEtBQUQsRUFBUSxRQUFSLENBQUE7YUFBeUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxLQUFLLENBQUMsS0FBTixDQUFZLEtBQVosQ0FBVixFQUE4QixRQUE5QjtJQUF6QixDQVBOO0lBUUEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxLQUFELENBQUE7YUFBeUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxLQUFLLENBQUMsS0FBTixDQUFZLEtBQVosQ0FBVixFQUE4QixLQUFLLENBQUMsSUFBcEM7SUFBekIsQ0FSTjtJQVNBLElBQUEsRUFBTSxRQUFBLENBQUMsS0FBRCxDQUFBO2FBQXlCLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxDQUFDLEtBQU4sQ0FBWSxLQUFaLENBQVYsRUFBOEIsS0FBSyxDQUFDLElBQXBDO0lBQXpCLENBVE47SUFVQSxPQUFBLEVBQVMsUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUFzQixJQUFJLENBQUMsSUFBTCxDQUFVLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBZixDQUFWLEVBQWlDLEtBQUssQ0FBQyxPQUF2QztJQUF0QixDQVZUO0lBV0EsU0FBQSxFQUFXLFFBQUEsQ0FBQyxLQUFELEVBQVEsUUFBUixDQUFBO2FBQW9CLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsS0FBakIsQ0FBVixFQUFtQyxRQUFuQztJQUFwQixDQVhYO0lBWUEsR0FBQSxFQUFLLFFBQUEsQ0FBQyxLQUFELEVBQVEsR0FBUixDQUFBO2FBQTBCLElBQUksQ0FBQyxJQUFMLENBQVUsS0FBSyxDQUFDLElBQU4sQ0FBVyxLQUFYLENBQVYsRUFBNkIsR0FBN0I7SUFBMUIsQ0FaTDtJQWNBLGFBQUEsRUFBZSxRQUFBLENBQUMsSUFBRCxFQUFPLElBQVAsQ0FBQTthQUFnQixDQUFBLENBQUEsQ0FBRyxNQUFNLENBQUMsSUFBUCxDQUFZLElBQUksQ0FBQyxPQUFqQixDQUFILENBQUEsQ0FBQSxDQUFBLENBQStCLElBQS9CLENBQUEsSUFBQTtJQUFoQixDQWRmO0lBZ0JBLEdBQUEsRUFDRTtNQUFBLElBQUEsRUFBTTtRQUFDLE1BQUEsSUFBRDtRQUFPLFFBQUEsTUFBUDtRQUFlLE9BQUEsS0FBZjtRQUFzQixPQUFBLEtBQXRCO1FBQTZCLE9BQUEsS0FBN0I7UUFBb0MsT0FBQSxLQUFwQztRQUEyQyxRQUFBLE1BQTNDO1FBQW1ELFFBQUEsTUFBbkQ7UUFBMkQsUUFBQSxNQUEzRDtRQUFtRSxPQUFBLEtBQW5FO1FBQTBFLElBQUEsRUFBSyxJQUEvRTtRQUFxRixTQUFBLEVBQVUsSUFBL0Y7TUFBQSxDQUFOO01BQ0EsSUFBQSxFQUFNLENBQUMsT0FBQSxLQUFELEVBQU8sT0FBQSxLQUFQLEVBQWEsUUFBQSxNQUFiLEVBQW9CLFFBQUEsTUFBcEIsRUFBMkIsT0FBQSxLQUEzQixFQUFpQyxPQUFBLEtBQWpDLEVBQXVDLE9BQUEsS0FBdkMsRUFBNkMsT0FBQSxLQUE3QyxFQUFtRCxPQUFBLEtBQW5ELEVBQXlELE9BQUEsS0FBekQsRUFBK0QsT0FBQSxLQUEvRCxFQUFxRSxPQUFBLEtBQXJFLEVBQTJFLE9BQUEsS0FBM0UsRUFBaUYsT0FBQSxLQUFqRixFQUF1RixPQUFBLEtBQXZGLEVBQTZGLE9BQUEsS0FBN0YsRUFBbUcsUUFBQSxNQUFuRyxFQUEwRyxTQUFBLE9BQTFHLEVBQWtILFFBQUEsTUFBbEgsRUFBeUgsUUFBQSxNQUF6SCxFQUFnSSxPQUFBLEtBQWhJLEVBQXNJLE9BQUEsS0FBdEksRUFBNEksT0FBQSxLQUE1SSxFQUFrSixRQUFBLE1BQWxKLEVBQXlKLE9BQUEsS0FBekosRUFBK0osT0FBQSxLQUEvSixFQUFxSyxPQUFBLEtBQXJLLEVBQTJLLE9BQUEsS0FBM0ssRUFBaUwsT0FBQSxLQUFqTCxFQUF1TCxPQUFBLEtBQXZMLEVBQTZMLE9BQUEsS0FBN0wsRUFBbU0sT0FBQSxLQUFuTSxFQUF5TSxPQUFBLEtBQXpNLEVBQStNLE9BQUEsS0FBL00sRUFBcU4sT0FBQSxLQUFyTixFQUEyTixPQUFBLEtBQTNOLEVBQWlPLE9BQUEsS0FBak8sRUFBdU8sT0FBQSxLQUF2TyxFQUE2TyxRQUFBLE1BQTdPLEVBQW9QLE9BQUEsS0FBcFAsRUFBMFAsT0FBQSxLQUExUCxFQUFnUSxPQUFBLEtBQWhRLEVBQXNRLE9BQUEsS0FBdFEsRUFBNFEsT0FBQSxLQUE1USxFQUFrUixPQUFBLEtBQWxSLEVBQXdSLE9BQUEsS0FBeFIsRUFBOFIsT0FBQSxLQUE5UixFQUFvUyxPQUFBLEtBQXBTLEVBQTBTLE9BQUEsS0FBMVMsRUFBZ1QsT0FBQSxLQUFoVCxFQUFzVCxPQUFBLEtBQXRULEVBQTRULFFBQUEsTUFBNVQsRUFBbVUsUUFBQSxNQUFuVSxDQUROO01BRUEsS0FBQSxFQUFPLENBQUMsU0FBQSxPQUFELEVBQVUsT0FBQSxLQUFWLEVBQWlCLE9BQUEsS0FBakIsRUFBd0IsT0FBQSxLQUF4QixFQUErQixPQUFBLEtBQS9CLEVBQXNDLE9BQUEsS0FBdEMsRUFBNkMsT0FBQSxLQUE3QyxFQUFvRCxPQUFBLEtBQXBELEVBQTJELFFBQUEsTUFBM0QsRUFBbUUsT0FBQSxLQUFuRSxFQUEwRSxPQUFBLEtBQTFFLEVBQWlGLE9BQUEsS0FBakYsRUFBd0YsTUFBQSxJQUF4RixFQUE4RixRQUFBLE1BQTlGLEVBQXNHLE9BQUEsS0FBdEc7SUFGUDtFQWpCRixDQURGO0FBRmEsQ0FBZixFQWwxQm9FOzs7QUE2MkJwRSxJQUFBLENBQUssRUFBTCxFQUFTLFFBQUEsQ0FBQSxDQUFBO0FBQ1QsTUFBQSxPQUFBLEVBQUE7RUFBRSx1REFBVSxNQUFNLENBQUUsYUFBbEI7QUFBQSxXQUFBOztFQUVBLElBQThDLDBEQUE5QztJQUFBLENBQUEsQ0FBRSxXQUFGLENBQUEsR0FBa0IsT0FBQSxDQUFRLFlBQVIsQ0FBbEIsRUFBQTs7U0FFQSxJQUFBLENBQUssU0FBTCxFQUFnQixPQUFBLEdBQVUsUUFBQSxDQUFDLEdBQUQsRUFBTSxLQUFOLEVBQWEsSUFBYixDQUFBO0lBQ3hCLElBQUEsR0FBTyxDQUFDLElBQUEsSUFBUSxXQUFXLENBQUMsR0FBWixDQUFBLENBQVQsQ0FBMkIsQ0FBQyxPQUE1QixDQUFvQyxDQUFwQyxDQUFzQyxDQUFDLFFBQXZDLENBQWdELENBQWhEO1dBQ1AsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFBLEdBQU8sSUFBUCxHQUFjLEdBQTFCO0VBRndCLENBQTFCO0FBTE8sQ0FBVCxFQTcyQm9FOzs7QUF5M0JwRSxJQUFBLENBQUssRUFBTCxFQUFTLFFBQUEsQ0FBQSxDQUFBO0FBRVQsTUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBO0VBQUUsSUFBQSxHQUFPLENBQUE7RUFFUCxHQUFBLEdBQU0sUUFBQSxDQUFDLElBQUQsRUFBTyxFQUFQLENBQUE7V0FDSixzQkFBQyxJQUFJLENBQUMsSUFBRCxJQUFKLElBQUksQ0FBQyxJQUFELElBQVUsRUFBZixDQUFrQixDQUFDLElBQW5CLENBQXdCLEVBQXhCO0VBREk7RUFHTixHQUFBLEdBQU0sUUFBQSxDQUFDLElBQUQsRUFBQSxHQUFPLElBQVAsQ0FBQTtBQUNSLFFBQUEsT0FBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7SUFBSSxJQUFHLGtCQUFIO0FBQ0U7TUFBQSxLQUFBLHVDQUFBOztRQUNFLE9BQUEsQ0FBUSxHQUFBLElBQVI7TUFERixDQURGOztXQUdBO0VBSkk7U0FNTixJQUFBLENBQUssUUFBTCxFQUFlLENBQUMsR0FBRCxFQUFNLEdBQU4sQ0FBZjtBQWJPLENBQVQsRUF6M0JvRTs7OztBQTY0QnBFLElBQUEsQ0FBSyxFQUFMLEVBQVMsUUFBQSxDQUFBLENBQUE7QUFDVCxNQUFBLElBQUEsRUFBQSxxQkFBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsZUFBQSxFQUFBO0VBQUUsRUFBQSxHQUFLLE9BQUEsQ0FBUSxJQUFSO0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSO0VBRVAsYUFBQSxHQUFnQixRQUFBLENBQUMsQ0FBRCxDQUFBO0lBQ2QsSUFBZ0IsQ0FBQSxLQUFLLENBQUMsQ0FBQyxPQUFGLENBQVUsR0FBVixDQUFyQjtBQUFBLGFBQU8sTUFBUDs7SUFDQSxJQUFnQixDQUFDLENBQUQsS0FBUSxDQUFDLENBQUMsTUFBRixDQUFTLGlCQUFULENBQXhCO0FBQUEsYUFBTyxNQUFQOztBQUNBLFdBQU8sS0FITztFQUFBO0VBS2hCLGVBQUEsR0FBa0IsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUNoQixhQUFBLENBQWMsQ0FBQyxDQUFDLElBQWhCO0VBRGdCO0VBR2xCLHFCQUFBLEdBQXdCLFFBQUEsQ0FBQyxFQUFELENBQUE7V0FDdEIsRUFBRSxDQUFDLE1BQUgsQ0FBVSxlQUFWO0VBRHNCO0VBR3hCLElBQUEsR0FBTyxRQUFBLENBQUMsVUFBRCxDQUFBO0FBQ1QsUUFBQTtBQUFJO01BQ0UsU0FBQSxHQUFZLEVBQUUsQ0FBQyxXQUFILENBQWUsVUFBZjthQUNaLFNBQVMsQ0FBQyxNQUFWLENBQWlCLGFBQWpCLEVBRkY7S0FHQSxhQUFBO2FBQ0UsS0FERjs7RUFKSyxFQWRUOzs7RUF1QkUsSUFBSSxDQUFDLElBQUwsR0FBWSxRQUFBLENBQUMsQ0FBRCxDQUFBO1dBQU0sSUFBQSxDQUFLLENBQUw7RUFBTjtFQUVaLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBVixHQUFtQixRQUFBLENBQUMsSUFBRCxDQUFBO1dBQ2pCLEVBQUUsQ0FBQyxVQUFILENBQWMsSUFBZDtFQURpQjtFQUduQixJQUFJLENBQUMsS0FBTCxHQUFhLFFBQUEsQ0FBQyxVQUFELENBQUE7V0FDWCxJQUFJLE9BQUosQ0FBWSxRQUFBLENBQUMsT0FBRCxDQUFBO2FBQ1YsRUFBRSxDQUFDLE9BQUgsQ0FBVyxVQUFYLEVBQXVCLFFBQUEsQ0FBQyxHQUFELEVBQU0sU0FBTixDQUFBO1FBQ3JCLElBQUcsV0FBSDtpQkFDRSxPQUFBLENBQVEsSUFBUixFQURGO1NBQUEsTUFBQTtpQkFHRSxPQUFBLENBQVEsU0FBUyxDQUFDLE1BQVYsQ0FBaUIsYUFBakIsQ0FBUixFQUhGOztNQURxQixDQUF2QjtJQURVLENBQVo7RUFEVztFQVFiLElBQUksQ0FBQyxhQUFMLEdBQXFCLFFBQUEsQ0FBQyxVQUFELENBQUE7V0FDbkIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFaLENBQW9CLFVBQXBCLEVBQWdDO01BQUMsYUFBQSxFQUFjO0lBQWYsQ0FBaEMsQ0FDQSxDQUFDLElBREQsQ0FDTSxxQkFETjtFQURtQjtFQUlyQixJQUFJLENBQUMsUUFBTCxHQUFnQixRQUFBLENBQUMsVUFBRCxDQUFBO0lBQ2QsMkJBQW9CLFVBQVUsQ0FBRSxnQkFBaEM7QUFBQSxhQUFPLE1BQVA7O1dBQ0EsSUFBSSxPQUFKLENBQVksUUFBQSxDQUFDLE9BQUQsQ0FBQTthQUNWLEVBQUUsQ0FBQyxJQUFILENBQVEsVUFBUixFQUFvQixRQUFBLENBQUMsR0FBRCxFQUFNLElBQU4sQ0FBQTtlQUNsQixPQUFBLGdCQUFRLElBQUksQ0FBRSxXQUFOLENBQUEsVUFBUjtNQURrQixDQUFwQjtJQURVLENBQVo7RUFGYztFQU1oQixJQUFJLENBQUMsSUFBTCxHQUFZLFFBQUEsQ0FBQyxJQUFELENBQUE7V0FDVixJQUFJLE9BQUosQ0FBWSxRQUFBLENBQUMsT0FBRCxDQUFBO2FBQ1YsRUFBRSxDQUFDLElBQUgsQ0FBUSxJQUFSLEVBQWMsUUFBQSxDQUFDLEdBQUQsRUFBTSxJQUFOLENBQUE7ZUFDWixPQUFBLENBQVEsSUFBUjtNQURZLENBQWQ7SUFEVSxDQUFaO0VBRFU7RUFLWixJQUFJLENBQUMsTUFBTCxHQUFjLFFBQUEsQ0FBQyxRQUFELENBQUE7SUFDWix5QkFBb0IsUUFBUSxDQUFFLGdCQUE5QjtBQUFBLGFBQU8sTUFBUDs7V0FDQSxJQUFJLE9BQUosQ0FBWSxRQUFBLENBQUMsT0FBRCxDQUFBO2FBQ1YsRUFBRSxDQUFDLE1BQUgsQ0FBVSxRQUFWLEVBQW9CLFFBQUEsQ0FBQyxHQUFELENBQUE7ZUFDbEIsT0FBQSxDQUFZLFdBQVo7TUFEa0IsQ0FBcEI7SUFEVSxDQUFaO0VBRlk7RUFNZCxJQUFJLENBQUMsSUFBTCxHQUFZLFFBQUEsQ0FBQyxRQUFELENBQUE7QUFDZCxRQUFBO0FBQUk7YUFDRSxJQUFBLEdBQU8sRUFBRSxDQUFDLFlBQUgsQ0FBZ0IsUUFBaEIsRUFEVDtLQUVBLGFBQUE7YUFDRSxLQURGOztFQUhVO0VBTVosSUFBSSxDQUFDLEdBQUwsR0FBVyxJQUFJLENBQUM7RUFDaEIsSUFBSSxDQUFDLEtBQUwsR0FBYSxFQUFFLENBQUM7RUFFaEIsSUFBSSxDQUFDLElBQUwsR0FBWSxRQUFBLENBQUEsR0FBSSxJQUFKLENBQUE7V0FBWSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxHQUFmO0VBQVo7RUFDWixJQUFJLENBQUMsS0FBTCxHQUFhLFFBQUEsQ0FBQyxDQUFELENBQUE7V0FBTSxLQUFLLENBQUMsSUFBTixDQUFXLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBSSxDQUFDLEdBQWIsQ0FBWCxFQUE4QixFQUE5QjtFQUFOO0VBQ2IsSUFBSSxDQUFDLElBQUwsR0FBWSxRQUFBLENBQUMsQ0FBRCxDQUFBO1dBQU0sS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFJLENBQUMsS0FBTCxDQUFXLENBQVgsQ0FBWDtFQUFOO0VBQ1osSUFBSSxDQUFDLFVBQUwsR0FBa0IsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFNLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBRyxLQUFLLENBQUMsT0FBTixDQUFjLElBQUksQ0FBQyxLQUFMLENBQVcsQ0FBWCxDQUFkLENBQWI7RUFBTjtTQUVsQixJQUFBLENBQUssTUFBTCxFQUFhLElBQWI7QUF4RU8sQ0FBVCxFQTc0Qm9FOzs7QUEwOUJwRSxJQUFBLENBQUssQ0FBQyxNQUFELENBQUwsRUFBZSxRQUFBLENBQUMsSUFBRCxDQUFBO0FBRWYsTUFBQTtFQUFFLElBQUksQ0FBQyxLQUFMLENBQVcsWUFBWCxFQUF5QixVQUFBLEdBQWEsUUFBQSxDQUFDLElBQUQsQ0FBQTtXQUNwQyxJQUFJLE9BQUosQ0FBWSxNQUFBLFFBQUEsQ0FBQyxPQUFELENBQUE7QUFDaEIsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7TUFBTSxLQUFBLEdBQVEsQ0FBQSxNQUFNLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBVixDQUFOO01BQ1IsSUFBTyxhQUFQO2VBQ0UsT0FBQSxDQUFRLENBQVIsRUFERjtPQUFBLE1BRUssSUFBRyxDQUFJLEtBQUssQ0FBQyxXQUFOLENBQUEsQ0FBUDtlQUNILE9BQUEsQ0FBUSxLQUFLLENBQUMsSUFBZCxFQURHO09BQUEsTUFBQTtRQUdILEtBQUEsR0FBUTtRQUNSLFFBQUEsR0FBVyxDQUFBLE1BQU0sSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFYLENBQU47UUFDWCxLQUFBOztBQUFRO1VBQUEsS0FBQSw0Q0FBQTs7eUJBQ04sVUFBQSxDQUFXLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBVixFQUFnQixTQUFoQixDQUFYO1VBRE0sQ0FBQTs7O1FBRVIsS0FBQSx5Q0FBQTs7VUFDRSxLQUFBLElBQVMsQ0FBQSxNQUFNLElBQU47UUFEWDtlQUVBLE9BQUEsQ0FBUSxLQUFSLEVBVEc7O0lBSkssQ0FBWjtFQURvQyxDQUF0QztTQWdCQSxVQUFVLENBQUMsTUFBWCxHQUFvQixNQUFBLFFBQUEsQ0FBQyxJQUFELENBQUE7QUFDdEIsUUFBQSxHQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQTtJQUFJLElBQUEsR0FBTyxDQUFBLE1BQU0sVUFBQSxDQUFXLElBQVgsQ0FBTjtJQUNQLEdBQUEsR0FBTSxJQUFJLENBQUMsUUFBTCxDQUFBLENBQWUsQ0FBQztBQUV0QixZQUFBLEtBQUE7QUFBQSxhQUNPLEdBQUEsR0FBTSxFQURiO1FBRUksTUFBQSxHQUFTO1FBQ1QsR0FBQSxHQUFNOztBQUhWLGFBSU8sR0FBQSxHQUFNLEVBSmI7UUFLSSxNQUFBLEdBQVM7UUFDVCxHQUFBLEdBQU07O0FBTlYsYUFPTyxHQUFBLEdBQU0sR0FQYjtRQVFJLE1BQUEsR0FBUztRQUNULEdBQUEsR0FBTTs7QUFUVjtRQVdJLE1BQUEsR0FBUztRQUNULEdBQUEsR0FBTTtBQVpWO1dBY0EsQ0FBQyxJQUFBLEdBQU8sSUFBSSxDQUFDLEdBQUwsQ0FBUyxJQUFULEVBQWUsR0FBZixDQUFSLENBQTRCLENBQUMsT0FBN0IsQ0FBcUMsQ0FBckMsQ0FBQSxHQUEwQyxHQUExQyxHQUFnRDtFQWxCOUI7QUFsQlAsQ0FBZixFQTE5Qm9FOzs7QUFtZ0NwRSxJQUFBLENBQUssRUFBTCxFQUFTLFFBQUEsQ0FBQSxDQUFBO0FBRVQsTUFBQSxLQUFBLEVBQUEsY0FBQSxFQUFBLEtBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsS0FBQSxFQUFBO0VBQUUsS0FBQSxHQUFRLENBQUE7RUFDUixhQUFBLEdBQWdCO0lBQUMsSUFBQSxFQUFLO0VBQU47RUFFaEIsS0FBQSxHQUFRLFFBQUEsQ0FBQyxJQUFELEVBQU8sSUFBUCxDQUFBO0FBQ1YsUUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7SUFBSSxJQUEwQixJQUFBLEtBQVEsRUFBbEM7QUFBQSxhQUFPO1FBQUM7VUFBQyxFQUFBLEVBQUc7UUFBSixDQUFEO1FBQVksRUFBWjtRQUFQOztJQUNBLEtBQUEsR0FBUSxJQUFJLENBQUMsS0FBTCxDQUFXLEdBQVg7SUFDUixDQUFBLEdBQUksS0FBSyxDQUFDLEdBQU4sQ0FBQTtJQUNKLEtBQUEseUNBQUE7O01BQ0UsSUFBQSx3QkFBTyxJQUFJLENBQUMsSUFBRCxJQUFKLElBQUksQ0FBQyxJQUFELElBQVUsQ0FBQTtJQUR2QjtXQUVBLENBQUMsSUFBRCxFQUFPLENBQVA7RUFOTTtFQVNSLElBQUksQ0FBQyxLQUFMLENBQVcsT0FBWCxFQUFvQixLQUFBLEdBQVEsUUFBQSxDQUFDLE9BQU8sRUFBUixFQUFZLENBQVosRUFBZSxDQUFDLFNBQUEsR0FBWSxLQUFiLElBQXNCLENBQUEsQ0FBckMsQ0FBQTtBQUM5QixRQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7SUFBSSxDQUFDLElBQUQsRUFBTyxDQUFQLENBQUEsR0FBWSxLQUFBLENBQU0sS0FBTixFQUFhLElBQWI7SUFFWixJQUFrQixDQUFBLEtBQUssTUFBdkI7QUFBQSxhQUFPLElBQUksQ0FBQyxDQUFELEVBQVg7O0lBS0EsS0FBNEIsU0FBNUI7Ozs7O01BQUEsQ0FBQSxHQUFJLFFBQVEsQ0FBQyxLQUFULENBQWUsQ0FBZixFQUFKOztJQUVBLElBQUcsQ0FBSSxTQUFKLElBQWtCLENBQUEsS0FBSyxJQUFJLENBQUMsQ0FBRCxDQUEzQixJQUFtQyxDQUFDLE1BQU0sQ0FBQyxJQUFQLENBQVksQ0FBWixDQUFBLElBQWtCLEtBQUssQ0FBQyxJQUFOLENBQVcsQ0FBWCxDQUFuQixDQUF0QztNQUNFLE1BQU0sdUVBRFI7O0lBR0EsSUFBMEQsSUFBQSxLQUFRLEVBQWxFO01BQUEsTUFBTSxLQUFBLENBQU0sMENBQU4sRUFBTjs7SUFFQSxHQUFBLEdBQU0sSUFBSSxDQUFDLENBQUQ7SUFFVixJQUFHLFNBQUg7TUFBVyxJQUFJLENBQUMsQ0FBRCxDQUFKLEdBQVUsRUFBckI7S0FBQSxNQUFBO01BQTRCLE9BQU8sSUFBSSxDQUFDLENBQUQsRUFBdkM7O0lBRUEsSUFBRyxRQUFRLENBQUMsYUFBVCxDQUF1QixDQUF2QixFQUEwQixHQUExQixDQUFIO01BQ0UsY0FBQSxDQUFlLFFBQUEsQ0FBQSxDQUFBO2VBQ2IsV0FBQSxDQUFZLElBQVosRUFBa0IsQ0FBbEI7TUFEYSxDQUFmLEVBREY7O0FBSUEsV0FBTztFQXZCbUIsQ0FBNUI7RUF5QkEsY0FBQSxHQUFpQixRQUFBLENBQUMsSUFBRCxFQUFPLENBQVAsRUFBVSxJQUFWLENBQUE7QUFDbkIsUUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBO0lBQUksQ0FBQyxJQUFELEVBQU8sQ0FBUCxDQUFBLEdBQVksS0FBQSxDQUFNLEtBQU4sRUFBYSxJQUFiO0lBQ1osS0FBQSxHQUFRLElBQUEsQ0FBSyxJQUFJLENBQUMsQ0FBRCxDQUFULEVBQWMsQ0FBZDtJQUNSLElBQWlCLEtBQWpCO01BQUEsS0FBQSxDQUFNLElBQU4sRUFBWSxDQUFaLEVBQUE7O0FBQ0EsV0FBTztFQUpRLEVBckNuQjs7RUE0Q0UsS0FBSyxDQUFDLE1BQU4sR0FBZSxRQUFBLENBQUMsSUFBRCxFQUFPLENBQVAsQ0FBQTtXQUFZLGNBQUEsQ0FBZSxJQUFmLEVBQXFCLENBQXJCLEVBQXdCLFFBQVEsQ0FBQyxhQUFqQztFQUFaO0VBQ2YsS0FBSyxDQUFDLE9BQU4sR0FBZ0IsUUFBQSxDQUFDLElBQUQsRUFBTyxDQUFQLENBQUE7V0FBWSxjQUFBLENBQWUsSUFBZixFQUFxQixDQUFyQixFQUF3QixRQUFRLENBQUMsU0FBakM7RUFBWixFQTdDbEI7Ozs7O0VBbURFLEtBQUssQ0FBQyxLQUFOLEdBQWMsUUFBQSxDQUFDLElBQUQsRUFBTyxDQUFQLENBQUE7V0FBWSxLQUFBLENBQU0sSUFBTixFQUFhLE1BQU0sQ0FBQyxLQUFQLENBQWEsQ0FBYixFQUFnQixLQUFBLENBQU0sSUFBTixDQUFoQixDQUFiLEVBQTBDO01BQUEsU0FBQSxFQUFXO0lBQVgsQ0FBMUM7RUFBWixFQW5EaEI7OztFQXVERSxLQUFLLENBQUMsTUFBTixHQUFlLE1BQUEsUUFBQSxDQUFDLElBQUQsRUFBTyxFQUFQLENBQUE7V0FBYSxLQUFBLENBQU0sSUFBTixFQUFhLENBQUEsTUFBTSxFQUFBLENBQUcsS0FBQSxDQUFNLElBQU4sQ0FBSCxDQUFOLENBQWIsRUFBbUM7TUFBQSxTQUFBLEVBQVc7SUFBWCxDQUFuQztFQUFiO0VBQ2YsS0FBSyxDQUFDLE1BQU4sR0FBZSxNQUFBLFFBQUEsQ0FBQyxJQUFELEVBQU8sRUFBUCxDQUFBO1dBQWEsS0FBSyxDQUFDLEtBQU4sQ0FBWSxJQUFaLEVBQW1CLENBQUEsTUFBTSxFQUFBLENBQUcsS0FBQSxDQUFNLElBQU4sQ0FBSCxDQUFOLENBQW5CLEVBQXlDO01BQUEsU0FBQSxFQUFXO0lBQVgsQ0FBekM7RUFBYixFQXhEakI7OztFQTRERSxLQUFLLENBQUMsS0FBTixHQUFjLFFBQUEsQ0FBQyxJQUFELENBQUE7V0FBUyxRQUFRLENBQUMsS0FBVCxDQUFlLEtBQUEsQ0FBTSxJQUFOLENBQWY7RUFBVDtFQUVkLEtBQUssQ0FBQyxTQUFOLEdBQWtCLFFBQUEsQ0FBQSxPQUFBLENBQUE7QUFDcEIsUUFBQSxJQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUE7a0NBRGtFO0lBQTFDLENBQUMsSUFBQSxHQUFPLEVBQVIsRUFBWSxNQUFBLEdBQVMsSUFBckIsRUFBMkIsSUFBQSxHQUFPLEtBQWxDO0lBQ3BCLEtBQXNDLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBWixDQUF0QztNQUFBLE1BQU0seUJBQU47O0lBQ0EsQ0FBQyxJQUFELEVBQU8sQ0FBUCxDQUFBLEdBQVksS0FBQSxDQUFNLGFBQU4sRUFBcUIsSUFBckI7SUFDWix3RUFBZ0IsQ0FBQyxXQUFELENBQUMsT0FBUSxFQUF6QixDQUE0QixDQUFDLElBQTdCLENBQWtDLEVBQWxDO0lBQ0EsRUFBRSxDQUFDLFdBQUgsR0FBaUIsS0FIckI7SUFJSSxJQUFpQixNQUFqQjthQUFBLEVBQUEsQ0FBRyxLQUFBLENBQU0sSUFBTixDQUFILEVBQUE7O0VBTGdCO0VBT2xCLEtBQUssQ0FBQyxXQUFOLEdBQW9CLFFBQUEsQ0FBQSxPQUFBLENBQUE7QUFDdEIsUUFBQSxFQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7a0NBRHVDO0lBQWIsQ0FBQyxJQUFBLEdBQU8sRUFBUjtJQUN0QixDQUFDLElBQUQsRUFBTyxDQUFQLENBQUEsR0FBWSxLQUFBLENBQU0sYUFBTixFQUFxQixJQUFyQjtJQUNaLGlCQUE4QyxJQUFJLENBQUMsQ0FBRCxDQUFHLENBQUMsTUFBZCxPQUF4QztNQUFBLE1BQU0sS0FBQSxDQUFNLG9CQUFOLEVBQU47O0lBQ0EsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFJLENBQUMsQ0FBRCxDQUFHLENBQUMsSUFBbkIsRUFBeUIsRUFBekI7V0FDQTtFQUprQjtFQU1wQixXQUFBLEdBQWMsUUFBQSxDQUFDLElBQUQsRUFBTyxDQUFQLENBQUE7QUFDaEIsUUFBQSxPQUFBLEVBQUEsQ0FBQSxFQUFBO0lBQUksQ0FBQyxJQUFELEVBQU8sQ0FBUCxDQUFBLEdBQVksS0FBQSxDQUFNLGFBQU4sRUFBcUIsSUFBckI7SUFDWixZQUFBLENBQWEsSUFBSSxDQUFDLENBQUQsQ0FBakIsRUFBc0IsQ0FBdEI7SUFDQSxNQUFBLENBQU8sSUFBSSxDQUFDLENBQUQsQ0FBWCxFQUFnQixDQUFoQixFQUFtQixDQUFuQjtJQUNBLE9BQUEsR0FBVSxXQUFBLENBQVksSUFBWixFQUFrQixDQUFsQjtXQUNWLE1BQUEsQ0FBTyxhQUFQLEVBQXNCLEtBQXRCLEVBQTZCLE9BQTdCO0VBTFk7RUFPZCxZQUFBLEdBQWUsUUFBQSxDQUFDLE1BQUQsRUFBUyxDQUFULENBQUE7QUFDakIsUUFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBO0lBQUksS0FBYyxNQUFNLENBQUMsSUFBUCxDQUFZLE1BQVosQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsS0FBQSxXQUFBOztZQUE0QixDQUFBLEtBQU87OztNQUNqQyxFQUFBLGVBQUssQ0FBQyxDQUFFLENBQUY7TUFDTixZQUFBLENBQWEsS0FBYixFQUFvQixFQUFwQjtNQUNBLE1BQUEsQ0FBTyxLQUFQLEVBQWMsRUFBZCxFQUFrQixFQUFsQjtJQUhGO1dBSUE7RUFOYTtFQVFmLFdBQUEsR0FBYyxRQUFBLENBQUMsSUFBRCxFQUFPLE9BQVAsQ0FBQTtBQUNoQixRQUFBLFlBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUE7SUFBSSxLQUFBLEdBQVEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYO0lBQ1IsQ0FBQSxHQUFJLEtBQUssQ0FBQyxHQUFOLENBQUE7SUFDSixZQUFBLEdBQWUsQ0FBQTtJQUNmLFlBQVksQ0FBQyxDQUFELENBQVosR0FBa0I7SUFDbEIsTUFBMkIsS0FBSyxDQUFDLE1BQU4sR0FBZSxFQUExQztBQUFBLGFBQU8sYUFBUDs7SUFDQSxTQUFBLEdBQVksS0FBSyxDQUFDLElBQU4sQ0FBVyxHQUFYO0lBQ1osQ0FBQyxJQUFELEVBQU8sQ0FBUCxDQUFBLEdBQVksS0FBQSxDQUFNLGFBQU4sRUFBcUIsU0FBckI7SUFDWixNQUFBLENBQU8sSUFBSSxDQUFDLENBQUQsQ0FBWCxFQUFnQixLQUFBLENBQU0sU0FBTixDQUFoQixFQUFrQyxZQUFsQztXQUNBLFdBQUEsQ0FBWSxTQUFaLEVBQXVCLFlBQXZCO0VBVFk7U0FXZCxNQUFBLEdBQVMsUUFBQSxDQUFDLElBQUQsRUFBTyxDQUFQLEVBQVUsT0FBVixDQUFBO0FBQ1gsUUFBQSxFQUFBLEVBQUEsSUFBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtJQUFJLG1CQUFHLElBQUksQ0FBRSxhQUFUO01BQ0UsSUFBQSxHQUFPO0FBQ1A7TUFBQSxLQUFBLHVDQUFBOztRQUNFLElBQUcsRUFBRSxDQUFDLFdBQUgsSUFBdUIsV0FBMUI7VUFDRSxJQUFJLENBQUMsSUFBTCxDQUFVLEVBQVYsRUFERjtTQUFBLE1BQUE7VUFHRSxFQUFBLENBQUcsQ0FBSCxFQUFNLE9BQU4sRUFIRjs7TUFERjtNQUtBLEtBQUEsd0NBQUE7O1FBQUEsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFJLENBQUMsSUFBaEIsRUFBc0IsRUFBdEI7TUFBQSxDQVBGOztXQVFBO0VBVE87QUF2R0YsQ0FBVCxFQW5nQ29FOzs7QUF3bkNwRSxJQUFBLENBQUssQ0FBQyxLQUFELEVBQVEsS0FBUixFQUFlLE1BQWYsQ0FBTCxFQUE2QixRQUFBLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxJQUFYLENBQUE7QUFDN0IsTUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQSxRQUFBLEVBQUE7RUFBRSxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7RUFFTCxTQUFBLEdBQVksUUFBQSxDQUFDLENBQUQsQ0FBQTtBQUNkLFFBQUE7SUFBSSxLQUFBLEdBQVE7SUFDUixDQUFBLEdBQUksQ0FBQyxDQUFDLE9BQUYsQ0FBVSxZQUFWLEVBQXdCLEVBQXhCLEVBRFI7SUFFSSxJQUFpQixDQUFDLENBQUQsS0FBUSxDQUFDLENBQUMsTUFBRixDQUFTLGFBQVQsQ0FBekI7TUFBQSxLQUFBLEdBQVEsTUFBUjs7SUFDQSxJQUFpQixDQUFDLENBQUMsTUFBRixJQUFZLENBQTdCO01BQUEsS0FBQSxHQUFRLE1BQVI7O0lBQ0EsSUFBRyxDQUFJLEtBQVA7TUFBa0IsR0FBRyxDQUFDLEdBQUosQ0FBUSxDQUFBLENBQUEsQ0FBRyxDQUFILENBQUEseUJBQUEsQ0FBUixFQUFsQjs7QUFDQSxXQUFPO0VBTkc7RUFTWixJQUFJLENBQUMsS0FBTCxDQUFXLE9BQVgsRUFBb0IsS0FBQSxHQUFRLFFBQUEsQ0FBQSxDQUFBO0lBQzFCLE1BQU07RUFEb0IsQ0FBNUI7RUFHQSxLQUFLLENBQUMsT0FBTixHQUFnQjtFQUVoQixLQUFLLENBQUMsSUFBTixHQUFhLENBQUE7RUFDYixLQUFLLENBQUMsS0FBTixHQUFjLENBQUE7RUFFZCxNQUFBLEdBQVM7RUFFVCxRQUFBLEdBQVcsUUFBQSxDQUFDLEVBQUQsRUFBSyxDQUFMLEVBQVEsT0FBTyxDQUFBLENBQWYsQ0FBQTtJQUNULElBQVUsSUFBSSxDQUFDLEtBQWY7QUFBQSxhQUFBOztJQUNBLEtBQWMsS0FBSyxDQUFDLE9BQXBCO0FBQUEsYUFBQTs7SUFDQSxxQkFBRyxTQUFBLFNBQVUsSUFBQSxDQUFLLFFBQUwsQ0FBYjtNQUNFLElBQTJELENBQUEsS0FBSyxNQUFBLENBQU8sY0FBUCxDQUFoRTtRQUFBLENBQUEsR0FBSSxDQUFDLENBQUMsT0FBRixDQUFVLE1BQUEsQ0FBTyxjQUFQLENBQUEsR0FBeUIsSUFBSSxDQUFDLEdBQXhDLEVBQTZDLEVBQTdDLEVBQUo7O01BQ0EsSUFBeUQsQ0FBQSxLQUFLLE1BQUEsQ0FBTyxZQUFQLENBQTlEO1FBQUEsQ0FBQSxHQUFJLENBQUMsQ0FBQyxPQUFGLENBQVUsTUFBQSxDQUFPLFlBQVAsQ0FBQSxHQUF1QixJQUFJLENBQUMsR0FBdEMsRUFBMkMsRUFBM0MsRUFBSjtPQUZGOztJQUdBLElBQTZDLENBQUEsS0FBSyxHQUFHLENBQUMsSUFBdEQ7TUFBQSxDQUFBLEdBQUksQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFHLENBQUMsSUFBSixHQUFXLElBQUksQ0FBQyxHQUExQixFQUErQixFQUEvQixFQUFKOztXQUNBLEdBQUEsQ0FBSSxDQUFBLE1BQUEsQ0FBQSxDQUFTLEVBQVQsRUFBQSxDQUFBLENBQWUsQ0FBZixDQUFBLENBQUo7RUFQUztFQVNYLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxHQUFrQixRQUFBLENBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxJQUFiLENBQUE7QUFDcEIsUUFBQTtJQUFJLElBQUcsS0FBQSxHQUFRLFNBQUEsQ0FBVSxJQUFWLENBQVg7TUFDRSxRQUFBLENBQVMsTUFBVCxFQUFpQixJQUFqQixFQUF1QixJQUF2QjtNQUNBLEVBQUUsQ0FBQyxhQUFILENBQWlCLElBQWpCLEVBQXVCLElBQXZCLEVBRkY7O0FBR0EsV0FBTztFQUpTO0VBTWxCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBWCxHQUFtQixRQUFBLENBQUMsSUFBRCxFQUFPLElBQVAsQ0FBQTtBQUNyQixRQUFBO0lBQUksSUFBZSxFQUFFLENBQUMsVUFBSCxDQUFjLElBQWQsQ0FBZjtBQUFBLGFBQU8sS0FBUDs7SUFDQSxJQUFHLEtBQUEsR0FBUSxTQUFBLENBQVUsSUFBVixDQUFYO01BQ0UsUUFBQSxDQUFTLE9BQVQsRUFBa0IsSUFBbEIsRUFBd0IsSUFBeEI7TUFDQSxFQUFFLENBQUMsU0FBSCxDQUFhLElBQWIsRUFBbUI7UUFBQSxTQUFBLEVBQVc7TUFBWCxDQUFuQixFQUZGOztBQUdBLFdBQU87RUFMVTtFQU9uQixLQUFLLENBQUMsSUFBSSxDQUFDLE1BQVgsR0FBb0IsUUFBQSxDQUFDLElBQUQsRUFBTyxPQUFQLEVBQWdCLElBQWhCLENBQUE7QUFDdEIsUUFBQSxPQUFBLEVBQUE7SUFBSSxPQUFBLEdBQVUsSUFBSSxDQUFDLEdBQUwsR0FBVyxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxVQUFMLENBQWdCLElBQWhCLENBQVYsRUFBaUMsT0FBakM7SUFDckIsSUFBZSxJQUFBLEtBQVEsT0FBdkI7QUFBQSxhQUFPLEtBQVA7O0lBQ0EsSUFBRyxLQUFBLEdBQVEsU0FBQSxDQUFVLElBQVYsQ0FBQSxJQUFvQixTQUFBLENBQVUsT0FBVixDQUEvQjtNQUNFLFFBQUEsQ0FBUyxRQUFULEVBQW1CLENBQUEsQ0FBQSxDQUFHLElBQUgsQ0FBQSxJQUFBLENBQUEsQ0FBYyxPQUFkLENBQUEsQ0FBbkIsRUFBNEMsSUFBNUM7TUFDQSxFQUFFLENBQUMsVUFBSCxDQUFjLElBQWQsRUFBb0IsT0FBcEIsRUFGRjs7QUFHQSxXQUFPO0VBTlc7RUFRcEIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFYLEdBQWdCLFFBQUEsQ0FBQyxJQUFELEVBQU8sSUFBUCxDQUFBO0FBQ2xCLFFBQUE7SUFBSSxJQUFlLENBQUksRUFBRSxDQUFDLFVBQUgsQ0FBYyxJQUFkLENBQW5CO0FBQUEsYUFBTyxLQUFQOztJQUNBLElBQUcsS0FBQSxHQUFRLFNBQUEsQ0FBVSxJQUFWLENBQVg7TUFDRSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWYsRUFBcUIsSUFBckI7TUFDQSxFQUFFLENBQUMsTUFBSCxDQUFVLElBQVYsRUFBZ0I7UUFBQSxTQUFBLEVBQVc7TUFBWCxDQUFoQixFQUZGOztBQUdBLFdBQU87RUFMTztFQU9oQixLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVgsR0FBc0IsUUFBQSxDQUFDLEdBQUQsRUFBTSxJQUFOLEVBQVksSUFBWixDQUFBO0FBQ3hCLFFBQUE7SUFBSSxJQUFHLEtBQUEsR0FBUSxTQUFBLENBQVUsR0FBVixDQUFBLElBQW1CLFNBQUEsQ0FBVSxJQUFWLENBQTlCO01BQ0UsUUFBQSxDQUFTLFVBQVQsRUFBcUIsQ0FBQSxDQUFBLENBQUcsR0FBSCxDQUFBLElBQUEsQ0FBQSxDQUFhLElBQWIsQ0FBQSxDQUFyQixFQUEwQyxJQUExQztNQUNBLEVBQUUsQ0FBQyxZQUFILENBQWdCLEdBQWhCLEVBQXFCLElBQXJCLEVBRkY7O0FBR0EsV0FBTztFQUphO0VBTXRCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxHQUFrQixRQUFBLENBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxJQUFiLENBQUE7V0FDaEIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFYLENBQWdCLElBQWhCLEVBQXNCLElBQUksQ0FBQyxTQUFMLENBQWUsSUFBZixDQUF0QixFQUE0QyxJQUE1QztFQURnQjtFQUdsQixLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsR0FBbUIsUUFBQSxDQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksSUFBWixDQUFBO0FBQ3JCLFFBQUEsT0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtJQUFJLE9BQUEsR0FBVSxJQUFBLENBQUssSUFBTDs7TUFDVixVQUFXOztJQUNYLElBQVUsS0FBSyxDQUFDLEtBQU4sQ0FBWSxHQUFaLEVBQWlCLE9BQWpCLENBQVY7QUFBQSxhQUFBOztJQUVBLEtBQUEsMkNBQUE7O3VCQUFzRSxLQUFUOztRQUE3RCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQVgsQ0FBYyxJQUFJLENBQUMsSUFBTCxDQUFVLElBQVYsRUFBZ0IsQ0FBaEIsQ0FBZCxFQUFrQyxJQUFsQzs7SUFBQTtJQUVBLEtBQUEsdUNBQUE7O3VCQUFxRSxTQUFUOztRQUE1RCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFWLEVBQWdCLENBQWhCLENBQWpCLEVBQXFDLElBQXJDOztJQUFBO1dBQ0E7RUFSaUI7U0FXbkIsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFaLEdBQXVCLE1BQUEsUUFBQSxDQUFDLEdBQUQsRUFBTSxVQUFOLEVBQWtCLElBQWxCLENBQUE7QUFDekIsUUFBQSxNQUFBLEVBQUEsZUFBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxPQUFBLEVBQUE7SUFBSSxPQUFBLEdBQVUsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFWO0lBQ1YsSUFBRyxDQUFBLE1BQU0sSUFBSSxDQUFDLFFBQUwsQ0FBYyxHQUFkLENBQU4sQ0FBSDtNQUNFLGVBQUEsR0FBa0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxVQUFWLEVBQXNCLE9BQXRCO01BQ2xCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBWCxDQUFpQixlQUFqQixFQUFrQyxJQUFsQztNQUNBLEtBQUEsR0FBUTtBQUNSO01BQUEsS0FBQSx1Q0FBQTs7UUFDRSxNQUFBLEdBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFaLENBQXFCLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBVixFQUFlLElBQWYsQ0FBckIsRUFBMkMsZUFBM0MsRUFBNEQsSUFBNUQ7UUFDVCxVQUFBLFFBQVU7TUFGWjtBQUdBLGFBQU8sTUFQVDtLQUFBLE1BQUE7YUFTRSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVgsQ0FBb0IsR0FBcEIsRUFBeUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxVQUFWLEVBQXNCLE9BQXRCLENBQXpCLEVBQXlELElBQXpELEVBVEY7O0VBRnFCO0FBL0VJLENBQTdCLEVBeG5Db0U7OztBQXV0Q3BFLElBQUEsQ0FBSyxDQUFDLFFBQUQsRUFBVyxlQUFYLENBQUwsRUFBa0MsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUVsQyxNQUFBO1NBQUUsSUFBQSxDQUFLLElBQUwsRUFBVyxFQUFBLEdBQ1Q7SUFBQSxJQUFBLEVBQU0sUUFBQSxDQUFDLEVBQUQsRUFBQSxHQUFRLElBQVIsQ0FBQTthQUFnQixNQUFNLENBQUMsS0FBUCxDQUFBLENBQWMsQ0FBQyxXQUFXLENBQUMsSUFBM0IsQ0FBZ0MsVUFBaEMsRUFBNEMsRUFBNUMsRUFBZ0QsR0FBRyxJQUFuRDtJQUFoQjtFQUFOLENBREY7QUFGZ0MsQ0FBbEMsRUF2dENvRTs7O0FBK3RDcEUsSUFBQSxDQUFLLEVBQUwsRUFBUyxRQUFBLENBQUEsQ0FBQTtBQUNULE1BQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxZQUFBLEVBQUEsRUFBQSxFQUFBO0VBQUUsQ0FBQSxDQUFFLEdBQUYsQ0FBQSxHQUFVLE9BQUEsQ0FBUSxVQUFSLENBQVY7RUFDQSxZQUFBLEdBQWUsT0FBQSxDQUFRLGVBQVI7RUFDZixFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7RUFFUCxHQUFBLEdBQ0U7SUFBQSxLQUFBLEVBQU8sQ0FBSSxHQUFHLENBQUMsVUFBZjtJQUNBLEtBQUEsRUFBTyxPQUFPLENBQUMsUUFBUixLQUFvQixRQUQzQjtJQUVBLEtBQUEsRUFBTyxPQUFPLENBQUMsVUFGZjtJQUdBLE1BQUEsRUFBUSxJQUhSO0lBSUEsUUFBQSxFQUFVLEtBSlY7SUFLQSxRQUFBLEVBQVUsR0FBRyxDQUFDLE9BQUosQ0FBWSxVQUFaLENBTFY7SUFNQSxJQUFBLEVBQU0sR0FBRyxDQUFDLE9BQUosQ0FBWSxNQUFaLENBTk47SUFPQSxPQUFBLEVBQVMsR0FBRyxDQUFDLFVBQUosQ0FBQSxDQVBUO0lBUUEsUUFBQSxFQUFVLE9BQU8sQ0FBQztFQVJsQjtFQVVGLEdBQUcsQ0FBQyxZQUFKLEdBQXNCLEdBQUcsQ0FBQyxLQUFQLEdBQWtCLFlBQVksQ0FBQyxRQUFiLENBQXNCLDJCQUF0QixDQUFrRCxDQUFDLFFBQW5ELENBQUEsQ0FBNkQsQ0FBQyxPQUE5RCxDQUFzRSxJQUF0RSxFQUEyRSxFQUEzRSxDQUFsQixHQUFzRyxFQUFFLENBQUMsUUFBSCxDQUFBLEVBaEIzSDs7RUFtQkUsR0FBRyxDQUFDLFVBQUosR0FBaUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFHLENBQUMsUUFBZCxFQUF3QixhQUF4QixFQW5CbkI7O0VBc0JFLEdBQUcsQ0FBQyxXQUFKLEdBQWtCLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBRyxDQUFDLFFBQWQsRUFBd0IsZUFBeEIsRUF0QnBCOztFQXlCRSxHQUFHLENBQUMsYUFBSixHQUFvQixJQUFJLENBQUMsSUFBTCxDQUFVLEdBQUcsQ0FBQyxRQUFkLEVBQXdCLGlCQUF4QixFQXpCdEI7O0VBNEJFLEdBQUcsQ0FBQyxpQkFBSixHQUF3QixJQUFJLENBQUMsSUFBTCxDQUFVLEdBQUcsQ0FBQyxJQUFkLEVBQW9CLFNBQXBCLEVBQStCLFFBQS9CLEVBQXlDLFdBQXpDO1NBRXhCLElBQUEsQ0FBSyxLQUFMLEVBQVksR0FBWjtBQS9CTyxDQUFULEVBL3RDb0U7OztBQW13Q3BFLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixFQUFzQixTQUF0QixFQUFpQyxRQUFqQyxDQUFMLEVBQWlELFFBQUEsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsRUFBZ0IsT0FBaEIsRUFBeUIsTUFBekIsQ0FBQTtBQUNqRCxNQUFBLGFBQUEsRUFBQSxRQUFBLEVBQUEsa0JBQUEsRUFBQSxHQUFBLEVBQUE7RUFBRSxDQUFBLENBQUUsR0FBRixFQUFPLGFBQVAsRUFBc0IsTUFBdEIsRUFBOEIsa0JBQTlCLENBQUEsR0FBcUQsT0FBQSxDQUFRLFVBQVIsQ0FBckQ7U0FFQSxJQUFBLENBQUssVUFBTCxFQUFpQixRQUFBLEdBQVc7SUFBQSxLQUFBLEVBQU8sUUFBQSxDQUFBLENBQUEsRUFBQTs7TUFJakMsR0FBRyxDQUFDLE1BQUosQ0FBVyxLQUFYLEVBQWtCLFFBQUEsQ0FBQSxDQUFBO2VBQ2hCO01BRGdCLENBQWxCO01BR0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxNQUFQLEVBQWUsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELEVBQVcsR0FBWCxDQUFBO2VBQ2IsR0FBRyxDQUFDLElBQUosQ0FBQTtNQURhLENBQWY7TUFHQSxHQUFHLENBQUMsRUFBSixDQUFPLE9BQVAsRUFBZ0IsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELEVBQVcsR0FBWCxDQUFBO1FBQ2QsTUFBTSxDQUFDLFlBQVAsQ0FBb0IsYUFBcEIsRUFBbUMsR0FBbkM7ZUFDQSxHQUFHLENBQUMsSUFBSixDQUFBO01BRmMsQ0FBaEI7TUFJQSxHQUFHLENBQUMsRUFBSixDQUFPLE9BQVAsRUFBZ0IsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELEVBQVcsSUFBWCxDQUFBLEVBQUE7ZUFDZCxNQUFNLENBQUMsY0FBUCxDQUFzQixJQUF0QjtNQURjLENBQWhCO01BR0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxTQUFQLEVBQWtCLFFBQUEsQ0FBQyxDQUFELEVBQUEsR0FBTyxJQUFQLENBQUE7ZUFBZSxPQUFBLENBQVEsR0FBRyxJQUFYO01BQWYsQ0FBbEI7TUFFQSxHQUFHLENBQUMsRUFBSixDQUFPLFNBQVAsRUFBa0IsUUFBQSxDQUFDLENBQUMsU0FBRCxFQUFZLE1BQVosQ0FBRCxDQUFBO0FBQ3RCLFlBQUEsRUFBQSxFQUFBLEtBQUEsRUFBQTtRQUFNLEVBQUEsR0FBSyxNQUFNLENBQUMsS0FBUCxDQUFBO1FBQ0wsQ0FBQSxDQUFFLEtBQUYsRUFBUyxLQUFULENBQUEsR0FBbUIsSUFBSSxrQkFBSixDQUFBLENBQW5CO1FBQ0EsTUFBTSxDQUFDLFdBQVAsQ0FBbUIsTUFBbkIsRUFBMkI7VUFBQyxFQUFBLEVBQUc7UUFBSixDQUEzQixFQUEyQyxDQUFDLEtBQUQsQ0FBM0M7ZUFDQSxFQUFFLENBQUMsV0FBVyxDQUFDLFdBQWYsQ0FBMkIsTUFBM0IsRUFBbUM7VUFBQyxFQUFBLEVBQUc7UUFBSixDQUFuQyxFQUFtRCxDQUFDLEtBQUQsQ0FBbkQ7TUFKZ0IsQ0FBbEIsRUFqQko7O01BeUJJLEdBQUcsQ0FBQyxFQUFKLENBQU8sY0FBUCxFQUF1QixRQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBQTtBQUMzQixZQUFBOzBFQUEyQyxDQUFFLEtBQXZDLENBQUE7TUFEcUIsQ0FBdkI7TUFHQSxHQUFHLENBQUMsRUFBSixDQUFPLGlCQUFQLEVBQTBCLFFBQUEsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxDQUFBO0FBQzlCLFlBQUE7MEVBQTJDLENBQUUsUUFBdkMsQ0FBQTtNQUR3QixDQUExQjtNQUdBLEdBQUcsQ0FBQyxFQUFKLENBQU8saUJBQVAsRUFBMEIsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQUE7QUFDOUIsWUFBQTswRUFBMkMsQ0FBRSxRQUF2QyxDQUFBO01BRHdCLENBQTFCO01BR0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxtQkFBUCxFQUE0QixRQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBQTtBQUNoQyxZQUFBOzBFQUEyQyxDQUFFLFVBQXZDLENBQUE7TUFEMEIsQ0FBNUI7TUFHQSxHQUFHLENBQUMsRUFBSixDQUFPLGtCQUFQLEVBQTJCLFFBQUEsQ0FBQyxDQUFDLE1BQUQsQ0FBRCxFQUFXLElBQVgsQ0FBQTtlQUN6QixhQUFhLENBQUMsZUFBZCxDQUE4QixNQUE5QixDQUFxQyxDQUFDLFFBQXRDLENBQStDLElBQS9DO01BRHlCLENBQTNCO01BR0EsR0FBRyxDQUFDLE1BQUosQ0FBVyxnQkFBWCxFQUE2QixRQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsRUFBVyxJQUFYLENBQUE7ZUFDM0IsTUFBTSxDQUFDLGNBQVAsQ0FBc0IsYUFBYSxDQUFDLGVBQWQsQ0FBOEIsTUFBOUIsQ0FBdEIsRUFBNkQsSUFBN0Q7TUFEMkIsQ0FBN0I7TUFHQSxHQUFHLENBQUMsRUFBSixDQUFPLFlBQVAsRUFBcUIsUUFBQSxDQUFDLENBQUQsRUFBSSxPQUFKLENBQUE7ZUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFaLENBQWtCLE9BQWxCO01BRG1CLENBQXJCO01BR0EsR0FBRyxDQUFDLE1BQUosQ0FBVyxnQkFBWCxFQUE2QixRQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsQ0FBQTtBQUNqQyxZQUFBO1FBQU0sR0FBQSxHQUFNLGFBQWEsQ0FBQyxlQUFkLENBQThCLE1BQTlCO2VBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQWpCLENBQW9CLENBQUM7TUFGTCxDQUE3QixFQTlDSjs7TUFvREksR0FBRyxDQUFDLEVBQUosQ0FBTyxXQUFQLEVBQW9CLE1BQUEsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELEVBQVcsSUFBWCxDQUFBO2VBQ2xCLE1BQU0sQ0FBQyxTQUFQLENBQ0U7VUFBQSxJQUFBLEVBQU0sSUFBTjtVQUNBLElBQUEsRUFBTSxDQUFBLE1BQU0sR0FBRyxDQUFDLFdBQUosQ0FBZ0IsSUFBaEIsQ0FBTjtRQUROLENBREY7TUFEa0IsQ0FBcEI7TUFLQSxHQUFHLENBQUMsTUFBSixDQUFXLGVBQVgsRUFBNEIsTUFBQSxRQUFBLENBQUMsQ0FBQyxNQUFELENBQUQsRUFBVyxJQUFYLENBQUE7QUFDaEMsWUFBQTtRQUFNLEdBQUEsR0FBTSxDQUFBLE1BQU0sR0FBRyxDQUFDLFdBQUosQ0FBZ0IsSUFBaEIsQ0FBTjtlQUNOLEdBQUcsQ0FBQyxTQUFKLENBQUE7TUFGMEIsQ0FBNUI7YUFJQSxHQUFHLENBQUMsRUFBSixDQUFPLGNBQVAsRUFBdUIsUUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELEVBQVcsSUFBWCxDQUFBO0FBQzNCLFlBQUE7UUFBTSxHQUFBLEdBQU0sYUFBYSxDQUFDLGVBQWQsQ0FBOEIsTUFBOUI7ZUFDTixHQUFHLENBQUMsV0FBSixDQUFnQixJQUFoQjtNQUZxQixDQUF2QjtJQS9EaUM7RUFBUCxDQUE1QjtBQUgrQyxDQUFqRCxFQW53Q29FOzs7QUE0MENwRSxJQUFBLENBQUssQ0FBQyxRQUFELENBQUwsRUFBaUIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUNqQixNQUFBLGFBQUEsRUFBQSxHQUFBLEVBQUE7RUFBRSxDQUFBLENBQUUsYUFBRixFQUFpQixPQUFqQixDQUFBLEdBQTZCLE9BQUEsQ0FBUSxVQUFSLENBQTdCO1NBRUEsSUFBQSxDQUFLLEtBQUwsRUFBWSxHQUFBLEdBRVY7SUFBQSxFQUFBLEVBQVEsUUFBQSxDQUFDLE9BQUQsRUFBVSxFQUFWLENBQUE7YUFBZ0IsT0FBTyxDQUFDLEVBQVIsQ0FBZSxPQUFmLEVBQXdCLEVBQXhCO0lBQWhCLENBQVI7SUFDQSxJQUFBLEVBQVEsUUFBQSxDQUFDLE9BQUQsRUFBVSxFQUFWLENBQUE7YUFBZ0IsT0FBTyxDQUFDLElBQVIsQ0FBZSxPQUFmLEVBQXdCLEVBQXhCO0lBQWhCLENBRFI7SUFFQSxNQUFBLEVBQVEsUUFBQSxDQUFDLE9BQUQsRUFBVSxFQUFWLENBQUE7YUFBZ0IsT0FBTyxDQUFDLE1BQVIsQ0FBZSxPQUFmLEVBQXdCLEVBQXhCO0lBQWhCLENBRlI7SUFJQSxPQUFBLEVBQ0U7TUFBQSxJQUFBLEVBQU0sUUFBQSxDQUFDLE9BQUQsQ0FBQTtlQUFZLElBQUksT0FBSixDQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7aUJBQVksT0FBTyxDQUFDLElBQVIsQ0FBYSxPQUFiLEVBQXNCLFFBQUEsQ0FBQyxDQUFELEVBQUksR0FBSixDQUFBO21CQUFXLE9BQUEsQ0FBUSxHQUFSO1VBQVgsQ0FBdEI7UUFBWixDQUFaO01BQVosQ0FBTjtNQUNBLE1BQUEsRUFBUSxRQUFBLENBQUMsT0FBRCxDQUFBO2VBQVksSUFBSSxPQUFKLENBQVksUUFBQSxDQUFDLE9BQUQsQ0FBQTtpQkFBWSxPQUFPLENBQUMsTUFBUixDQUFlLE9BQWYsRUFBd0IsUUFBQSxDQUFDLENBQUQsRUFBSSxHQUFKLENBQUE7bUJBQVcsT0FBQSxDQUFRLEdBQVI7VUFBWCxDQUF4QjtRQUFaLENBQVo7TUFBWjtJQURSLENBTEY7O0lBU0EsZUFBQSxFQUFpQixRQUFBLENBQUMsR0FBRCxDQUFBO0FBQ3JCLFVBQUE7TUFBTSxHQUFBLEdBQU0sYUFBYSxDQUFDLGdCQUFkLENBQUE7O1FBQ04sTUFBTyxhQUFhLENBQUMsYUFBZCxDQUFBLENBQTZCLENBQUMsQ0FBRDs7O1FBQ3BDLE1BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFaLENBQUE7O2FBQ1AsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFoQixDQUFxQixHQUFyQjtJQUplO0VBVGpCLENBRkY7QUFIZSxDQUFqQixFQTUwQ29FOzs7OztBQXMyQ3BFLElBQUEsQ0FBSyxDQUFDLE1BQUQsRUFBUyxLQUFULEVBQWdCLEtBQWhCLEVBQXVCLE1BQXZCLEVBQStCLE9BQS9CLENBQUwsRUFBOEMsUUFBQSxDQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksR0FBWixFQUFpQixJQUFqQixFQUF1QixLQUF2QixDQUFBO0FBRTlDLE1BQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBOztFQUNFLEtBQUEsR0FDRTtJQUFBLFlBQUEsRUFBYztNQUFBLEtBQUEsRUFBTyxFQUFQO01BQVcsT0FBQSxFQUFTLEVBQXBCO01BQXdCLEVBQUEsRUFBSSxFQUE1QjtNQUFnQyxpQkFBQSxFQUFtQjtJQUFuRDtFQUFkO0VBRUYsSUFBQSxHQUFPLElBQUEsQ0FBSyxDQUFMLEVBQVEsSUFBUixFQUFjLFFBQUEsQ0FBQSxDQUFBO1dBQ25CLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixHQUFHLENBQUMsYUFBcEIsRUFBbUMsS0FBbkMsRUFBMEM7TUFBQSxLQUFBLEVBQU87SUFBUCxDQUExQztFQURtQixDQUFkO0VBR1AsSUFBSSxDQUFDLEtBQUwsQ0FBVyxXQUFYLEVBQXdCLFNBQUEsR0FBWSxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtJQUNsQyxJQUFpRCxnQkFBakQ7TUFBQSxNQUFNLEtBQUEsQ0FBTSxDQUFBLHVCQUFBLENBQUEsQ0FBMEIsQ0FBMUIsQ0FBQSxDQUFOLEVBQU47O0lBQ0EsSUFBRyxDQUFBLEtBQU8sTUFBVjtNQUNFLElBQUcsU0FBSDtRQUFXLEtBQUssQ0FBQyxDQUFELENBQUwsR0FBVyxFQUF0QjtPQUFBLE1BQUE7UUFBNkIsT0FBTyxLQUFLLENBQUMsQ0FBRCxFQUF6Qzs7TUFDQSxJQUFBLENBQUEsRUFGRjs7V0FHQSxLQUFLLENBQUMsQ0FBRDtFQUw2QixDQUFwQztTQU9BLFNBQVMsQ0FBQyxJQUFWLEdBQWlCLFFBQUEsQ0FBQSxDQUFBO0FBQ25CLFFBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBO0FBQUk7TUFDRSxJQUFBLEdBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFHLENBQUMsYUFBZDtNQUNQLElBQUEsR0FBTyxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVg7QUFDUDtNQUFBLEtBQUEsU0FBQTtvQkFBQTs7O1FBR0UsSUFBRyxnQkFBSDt1QkFDRSxLQUFLLENBQUMsQ0FBRCxDQUFMLEdBQVcsR0FEYjtTQUFBLE1BQUE7K0JBQUE7O01BSEYsQ0FBQTtxQkFIRjtLQUFBO0VBRGU7QUFoQjJCLENBQTlDLEVBdDJDb0U7OztBQW00Q3BFLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsUUFBZixDQUFMLEVBQStCLFFBQUEsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLE1BQVgsQ0FBQTtBQUMvQixNQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBO0VBQUUsQ0FBQSxDQUFFLEdBQUYsRUFBTyxJQUFQLEVBQWEsS0FBYixDQUFBLEdBQXVCLE9BQUEsQ0FBUSxVQUFSLENBQXZCO0VBRUEsUUFBQSxHQUFXO0VBRVgsSUFBRyxHQUFHLENBQUMsS0FBUDtJQUFrQixRQUFRLENBQUMsSUFBVCxDQUNoQjtNQUFBLEtBQUEsRUFBTyxHQUFHLENBQUMsSUFBWDtNQUNBLE9BQUEsRUFBUztRQUNQO1VBQUUsSUFBQSxFQUFNO1FBQVIsQ0FETztRQUVQO1VBQUUsSUFBQSxFQUFNO1FBQVIsQ0FGTztRQUdQO1VBQUUsS0FBQSxFQUFPLGFBQVQ7VUFBd0IsV0FBQSxFQUFhLGFBQXJDO1VBQW9ELEtBQUEsRUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQXZFLENBSE87UUFJUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBSk87UUFLUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBTE87UUFNUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBTk87UUFPUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBUE87UUFRUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBUk87UUFTUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBVE87UUFVUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBVk87UUFXUDtVQUFFLElBQUEsRUFBTTtRQUFSLENBWE87O0lBRFQsQ0FEZ0IsRUFBbEI7O0VBZ0JBLFFBQVEsQ0FBQyxJQUFULENBQ0U7SUFBQSxLQUFBLEVBQU8sTUFBUDtJQUNBLE9BQUEsRUFBUztNQUNQO1FBQUUsS0FBQSxFQUFPLFdBQVQ7UUFBc0IsV0FBQSxFQUFhLGFBQW5DO1FBQWtELEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtBQUFJLGNBQUE7aURBQVcsQ0FBRSxJQUFaLENBQWlCLFdBQWpCO1FBQUw7TUFBekQsQ0FETztNQUVQO1FBQUUsS0FBQSxFQUFPLG9CQUFUO1FBQStCLFdBQUEsRUFBYSxtQkFBNUM7UUFBaUUsS0FBQSxFQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUM7TUFBcEYsQ0FGTztNQUdQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FITztNQUlQO1FBQUUsS0FBQSxFQUFPLGtCQUFUO1FBQTZCLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtpQkFBSyxLQUFLLENBQUMsZ0JBQU4sQ0FBdUIsR0FBRyxDQUFDLFVBQTNCO1FBQUw7TUFBcEMsQ0FKTztNQUtQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FMTztNQU1QO1FBQUUsSUFBQSxFQUFTLEdBQUcsQ0FBQyxLQUFQLEdBQWtCLE9BQWxCLEdBQStCO01BQXZDLENBTk87O0VBRFQsQ0FERjtFQVdBLFFBQVEsQ0FBQyxJQUFULENBQ0U7SUFBQSxLQUFBLEVBQU8sTUFBUDtJQUNBLE9BQUEsRUFBUztNQUNQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FETztNQUVQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FGTztNQUdQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FITztNQUlQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FKTztNQUtQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FMTztNQU1QO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FOTztNQU9QO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FQTztNQVFQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FSTztNQVNQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FUTztNQVVQO1FBQUUsS0FBQSxFQUFPLE1BQVQ7UUFBaUIsV0FBQSxFQUFhLGFBQTlCO1FBQTZDLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtpQkFBSyxHQUFHLENBQUMsZUFBSixDQUFvQixNQUFwQjtRQUFMO01BQXBELENBVk87TUFXUDtRQUFFLElBQUEsRUFBTTtNQUFSLENBWE87TUFZUCxHQUFHLENBQUksQ0FBQyxHQUFHLENBQUMsS0FBUixHQUFtQjtRQUNyQjtVQUFFLElBQUEsRUFBTTtRQUFSLENBRHFCO1FBRXJCO1VBQUUsS0FBQSxFQUFPLFVBQVQ7VUFBcUIsV0FBQSxFQUFhLGFBQWxDO1VBQWlELEtBQUEsRUFBTyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQXBFLENBRnFCO09BQW5CLEdBR0csRUFISixDQVpJOztFQURULENBREY7RUFvQkEsUUFBUSxDQUFDLElBQVQsQ0FDRTtJQUFBLEtBQUEsRUFBTyxNQUFQO0lBQ0EsT0FBQSxFQUFTO01BQ1AsR0FBRyxDQUFJLEdBQUcsQ0FBQyxLQUFKLElBQWEsQ0FBQyxHQUFHLENBQUMsS0FBckIsR0FBZ0M7UUFDbEM7VUFBRSxJQUFBLEVBQU07UUFBUixDQURrQztRQUVsQztVQUFFLElBQUEsRUFBTTtRQUFSLENBRmtDO1FBR2xDO1VBQUUsSUFBQSxFQUFNO1FBQVIsQ0FIa0M7UUFJbEM7VUFBRSxJQUFBLEVBQU07UUFBUixDQUprQztPQUFoQyxHQUtHLEVBTEosQ0FESTtNQU9QO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FQTzs7RUFEVCxDQURGO0VBWUEsUUFBUSxDQUFDLElBQVQsQ0FDRTtJQUFBLElBQUEsRUFBTSxZQUFOO0lBQ0EsT0FBQSxFQUFTO01BQ1A7UUFBRSxJQUFBLEVBQU07TUFBUixDQURPO01BRVA7UUFBRSxJQUFBLEVBQU07TUFBUixDQUZPO01BR1AsR0FBRyxDQUFJLEdBQUcsQ0FBQyxLQUFQLEdBQWtCO1FBQ3BCO1VBQUUsSUFBQSxFQUFNO1FBQVIsQ0FEb0I7UUFFcEI7VUFBRSxJQUFBLEVBQU07UUFBUixDQUZvQjtPQUFsQixHQUdHO1FBQ0w7VUFBRSxJQUFBLEVBQU07UUFBUixDQURLO09BSEosQ0FISTtNQVNQO1FBQUUsSUFBQSxFQUFNO01BQVIsQ0FUTztNQVVQO1FBQUUsS0FBQSxFQUFPLGdCQUFUO1FBQTJCLFdBQUEsRUFBYSxtQkFBeEM7UUFBNkQsS0FBQSxFQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUM7TUFBaEYsQ0FWTzs7RUFEVCxDQURGO0VBZUEsUUFBUSxDQUFDLElBQVQsQ0FDRTtJQUFBLElBQUEsRUFBTSxNQUFOO0lBQ0EsT0FBQSxFQUFTO01BQ1AsR0FBRyxDQUFJLENBQUMsR0FBRyxDQUFDLEtBQVIsR0FBbUI7UUFDckI7VUFBRSxJQUFBLEVBQU07UUFBUixDQURxQjtRQUVyQjtVQUFFLElBQUEsRUFBTTtRQUFSLENBRnFCO09BQW5CLEdBR0csRUFISixDQURJO01BS1A7UUFBRSxLQUFBLEVBQU8saUJBQVQ7UUFBNEIsS0FBQSxFQUFPLFFBQUEsQ0FBQSxDQUFBO2lCQUFLLEtBQUssQ0FBQyxZQUFOLENBQW1CLHdEQUFuQjtRQUFMO01BQW5DLENBTE87TUFNUDtRQUFFLElBQUEsRUFBTTtNQUFSLENBTk87TUFPUDtRQUFFLEtBQUEsRUFBTyxzQ0FBVDtRQUFpRCxLQUFBLEVBQU8sUUFBQSxDQUFBLENBQUE7aUJBQUssS0FBSyxDQUFDLFlBQU4sQ0FBbUIsOENBQW5CO1FBQUw7TUFBeEQsQ0FQTztNQVFQO1FBQUUsS0FBQSxFQUFPLG9CQUFUO1FBQStCLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtpQkFBSyxLQUFLLENBQUMsSUFBTixDQUFBO1FBQUw7TUFBdEMsQ0FSTzs7RUFEVCxDQURGO1NBYUEsSUFBQSxDQUFLLE1BQUwsRUFBYTtJQUFBLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTthQUNsQixJQUFJLENBQUMsa0JBQUwsQ0FBd0IsSUFBSSxDQUFDLGlCQUFMLENBQXVCLFFBQXZCLENBQXhCO0lBRGtCO0VBQVAsQ0FBYjtBQTVGNkIsQ0FBL0IsRUFuNENvRTs7O0FBcStDcEUsSUFBQSxDQUFLLENBQUMsS0FBRCxFQUFRLEtBQVIsRUFBZSxRQUFmLENBQUwsRUFBK0IsUUFBQSxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsTUFBWCxDQUFBO0FBQy9CLE1BQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxXQUFBLEVBQUE7RUFBRSxDQUFBLENBQUUsR0FBRixFQUFPLFdBQVAsRUFBb0IsTUFBcEIsQ0FBQSxHQUErQixPQUFBLENBQVEsVUFBUixDQUEvQjtTQUVBLElBQUEsQ0FBSyxTQUFMLEVBQWdCLE9BQUEsR0FDZDtJQUFBLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtBQUNYLFVBQUEsZUFBQSxFQUFBO01BQU0sSUFBVSxHQUFHLENBQUMsS0FBZDtBQUFBLGVBQUE7O01BRUEsaUJBQUEsR0FBb0I7TUFFcEIsV0FBVyxDQUFDLFVBQVosQ0FDRTtRQUFBLEdBQUEsRUFBSyxDQUFBLDZDQUFBLENBQUEsQ0FBZ0QsT0FBTyxDQUFDLFFBQXhELENBQUEsQ0FBQSxDQUFBLENBQW9FLE9BQU8sQ0FBQyxJQUE1RSxDQUFBLENBQUEsQ0FBQSxDQUFvRixHQUFHLENBQUMsVUFBSixDQUFBLENBQXBGLENBQUE7TUFBTCxDQURGO01BR0EsV0FBVyxDQUFDLEVBQVosQ0FBZSxxQkFBZixFQUFzQyxRQUFBLENBQUEsQ0FBQTtlQUFLLEdBQUEsQ0FBSSxxQkFBSjtNQUFMLENBQXRDO01BQ0EsV0FBVyxDQUFDLEVBQVosQ0FBZSxzQkFBZixFQUF1QyxRQUFBLENBQUEsQ0FBQTtlQUFLLEdBQUEsQ0FBSSxzQkFBSjtNQUFMLENBQXZDO01BQ0EsV0FBVyxDQUFDLEVBQVosQ0FBZSxrQkFBZixFQUFtQyxRQUFBLENBQUEsQ0FBQTtRQUFLLGlCQUFBLEdBQW9CO2VBQU8sR0FBQSxDQUFJLHVCQUFKO01BQWhDLENBQW5DO01BQ0EsV0FBVyxDQUFDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFFBQUEsQ0FBQyxHQUFELENBQUE7UUFBUSxpQkFBQSxHQUFvQjtlQUFPLEdBQUcsQ0FBQyxHQUFKLENBQVEsR0FBUjtNQUFuQyxDQUF4QjtNQUVBLFdBQVcsQ0FBQyxFQUFaLENBQWUsbUJBQWYsRUFBb0MsTUFBQSxRQUFBLENBQUMsQ0FBRCxFQUFJLFlBQUosRUFBa0IsV0FBbEIsQ0FBQTtBQUMxQyxZQUFBO1FBQVEsR0FBQSxDQUFJLENBQUEsbUJBQUEsQ0FBQSxDQUFzQixXQUF0QixDQUFBLENBQUo7UUFDQSxHQUFBLEdBQU0sQ0FBQSxNQUFNLE1BQU0sQ0FBQyxjQUFQLENBQ1Y7VUFBQSxJQUFBLEVBQU0sTUFBTjtVQUNBLE9BQUEsRUFBUyxDQUFDLG1CQUFELEVBQXNCLE9BQXRCLENBRFQ7VUFFQSxTQUFBLEVBQVcsQ0FGWDtVQUdBLEtBQUEsRUFBTyxvQkFIUDtVQUlBLE9BQUEsRUFBUyxDQUFBLDhCQUFBLENBQUEsQ0FBaUMsV0FBVyxDQUFDLE9BQVosQ0FBb0IsR0FBcEIsRUFBeUIsVUFBekIsQ0FBakMsQ0FBQSwrREFBQTtRQUpULENBRFUsQ0FBTjtRQU1OLEdBQUEsQ0FBSSxDQUFBLFVBQUEsQ0FBQSxDQUFhLEdBQUcsQ0FBQyxRQUFqQixDQUFBLENBQUo7UUFDQSxJQUFHLEdBQUcsQ0FBQyxRQUFKLEtBQWdCLENBQW5CO1VBQ0UsTUFBTSxDQUFDLFdBQVAsQ0FBQTtVQUNBLFdBQVcsQ0FBQyxjQUFaLENBQUE7aUJBQ0EsR0FBQSxDQUFJLFVBQUosRUFIRjs7TUFUa0MsQ0FBcEM7TUFjQSxlQUFBLEdBQWtCLFFBQUEsQ0FBQSxDQUFBO1FBQ2hCLElBQWlDLGlCQUFqQztpQkFBQSxXQUFXLENBQUMsZUFBWixDQUFBLEVBQUE7O01BRGdCO01BR2xCLGVBQUEsQ0FBQTthQUNBLFdBQUEsQ0FBWSxlQUFaLEVBQTZCLEVBQUEsR0FBSyxFQUFMLEdBQVUsSUFBdkM7SUEvQks7RUFBUCxDQURGO0FBSDZCLENBQS9CLEVBcitDb0U7OztBQTZnRHBFLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxXQUFSLENBQUwsRUFBMkIsUUFBQSxDQUFDLEdBQUQsRUFBTSxTQUFOLENBQUE7QUFDM0IsTUFBQSxhQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQSxHQUFBLEVBQUEsV0FBQSxFQUFBLFlBQUEsRUFBQSxVQUFBLEVBQUEsRUFBQSxFQUFBLGFBQUEsRUFBQSxhQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBLFNBQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxrQkFBQSxFQUFBLE1BQUEsRUFBQSxjQUFBLEVBQUEsU0FBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBO0VBQUUsQ0FBQSxDQUFFLEdBQUYsRUFBTyxhQUFQLEVBQXNCLE1BQXRCLEVBQThCLFdBQTlCLEVBQTJDLE1BQTNDLENBQUEsR0FBc0QsT0FBQSxDQUFRLFVBQVIsQ0FBdEQ7RUFFQSxhQUFBLEdBQ0U7SUFBQSxLQUFBLEVBQU8sV0FBUDtJQUNBLGFBQUEsRUFBa0IsR0FBRyxDQUFDLEtBQVAsR0FBa0IsYUFBbEIsR0FBcUMsUUFEcEQ7Ozs7SUFLQSxRQUFBLEVBQVUsR0FMVjtJQU1BLFNBQUEsRUFBVyxHQU5YO0lBT0EsY0FBQSxFQUNFO01BQUEsZ0JBQUEsRUFBa0IsS0FBbEI7TUFDQSxlQUFBLEVBQWlCLElBRGpCO01BRUEsWUFBQSxFQUFjLElBRmQ7TUFHQSxvQkFBQSxFQUFzQixLQUh0QjtNQUlBLGdCQUFBLEVBQWtCLEtBSmxCO0lBQUE7RUFSRjtFQWNGLGFBQUEsR0FDRTtJQUFBLEtBQUEsRUFBTztNQUFBLEtBQUEsRUFBTyxHQUFQO01BQVksTUFBQSxFQUFRO0lBQXBCLENBQVA7SUFDQSxPQUFBLEVBQVM7TUFBQSxLQUFBLEVBQU8sSUFBUDtNQUFhLE1BQUEsRUFBUTtJQUFyQixDQURUO0lBRUEsRUFBQSxFQUFJO01BQUEsS0FBQSxFQUFPLEdBQVA7TUFBWSxNQUFBLEVBQVE7SUFBcEIsQ0FGSjtJQUdBLGlCQUFBLEVBQW1CO01BQUEsS0FBQSxFQUFPLEdBQVA7TUFBWSxNQUFBLEVBQVE7SUFBcEI7RUFIbkI7RUFLRixhQUFBLEdBQWdCLENBQUE7RUFDaEIsWUFBQSxHQUFlO0VBRWYsVUFBQSxHQUFhLENBQUEsRUExQmY7O0VBNkJFLEVBQUEsR0FBSztFQUNMLGNBQUEsR0FBaUIsS0E5Qm5COztFQWlDRSxTQUFBLEdBQVk7RUFDWixXQUFBLEdBQWM7RUFDZCxHQUFHLENBQUMsRUFBSixDQUFPLGFBQVAsRUFBc0IsUUFBQSxDQUFBLENBQUE7V0FBSyxXQUFBLEdBQWM7RUFBbkIsQ0FBdEIsRUFuQ0Y7Ozs7OztFQTBDRSxZQUFBLEdBQWUsUUFBQSxDQUFDLElBQUQsQ0FBQTtBQUNqQixRQUFBLEtBQUEsRUFBQTtJQUFJLE9BQUEsaUNBQVUsYUFBYSxDQUFDLElBQUQsSUFBYixhQUFhLENBQUMsSUFBRCxJQUFVO0lBQ2pDLEtBQUEsR0FBUSxPQUFPLENBQUMsT0FBUixDQUFnQixJQUFoQixFQURaO0lBRUksSUFBMEIsS0FBQSxHQUFRLENBQWxDO01BQUEsS0FBQSxHQUFRLE9BQU8sQ0FBQyxPQUFoQjs7SUFDQSxhQUFhLENBQUMsSUFBRCxDQUFNLENBQUMsS0FBRCxDQUFuQixHQUE2QixLQUhqQztBQUlJLFdBQU87RUFMTTtFQU9mLFVBQUEsR0FBYSxRQUFBLENBQUMsSUFBRCxFQUFPLEtBQVAsQ0FBQTtXQUNYLGFBQWEsQ0FBQyxJQUFELENBQU0sQ0FBQyxLQUFELENBQW5CLEdBQTZCO0VBRGxCO0VBR2IsU0FBQSxHQUFZLFFBQUEsQ0FBQyxJQUFELEVBQU8sS0FBUCxDQUFBO0FBQ2QsUUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUE7Ozs7SUFHSSxNQUFBLEdBQVMsTUFBTSxDQUFDLG9CQUFQLENBQUE7SUFDVCxPQUFBLEdBQVUsTUFBTSxDQUFDLHNCQUFQLENBQThCLE1BQTlCLENBQXFDLENBQUMsT0FKcEQ7OztJQVFJLElBQUcsSUFBQSxLQUFRLGlCQUFYO01BQ0UsTUFBQSxHQUFTLGFBQWEsQ0FBQyxJQUFEO01BQ3RCLE1BQU0sQ0FBQyxDQUFQLEdBQVcsT0FBTyxDQUFDLENBQVIsR0FBWSxPQUFPLENBQUMsS0FBUixHQUFjLENBQTFCLEdBQThCLE1BQU0sQ0FBQyxLQUFQLEdBQWE7TUFDdEQsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFPLENBQUMsQ0FBUixHQUFZLE9BQU8sQ0FBQyxNQUFSLEdBQWUsQ0FBM0IsR0FBK0IsTUFBTSxDQUFDLE1BQVAsR0FBYztBQUN4RCxhQUFPLE9BSlQ7S0FSSjs7O0lBZ0JJLE1BQUEsR0FBUyxZQUFZLENBQUMsSUFBRCxDQUFNLENBQUMsS0FBRDtJQUMzQixJQUFpQixjQUFqQjtBQUFBLGFBQU8sT0FBUDtLQWpCSjs7SUFvQkksTUFBQSxHQUFTLGFBQWEsQ0FBQyxJQUFEO0lBRXRCLElBQUcsSUFBQSxLQUFRLElBQVg7O01BRUUsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFPLENBQUM7TUFDbkIsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFPLENBQUMsRUFIckI7S0FBQSxNQUtLLElBQUcsSUFBQSxLQUFRLFNBQVIsSUFBc0IsS0FBQSxLQUFTLENBQWxDOztNQUVILE1BQU0sQ0FBQyxDQUFQLEdBQVcsT0FBTyxDQUFDLENBQVIsR0FBWSxPQUFPLENBQUMsS0FBUixHQUFjLENBQTFCLEdBQThCLE1BQU0sQ0FBQyxLQUFQLEdBQWE7TUFDdEQsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFPLENBQUMsQ0FBUixHQUFZLE9BQU8sQ0FBQyxNQUFSLEdBQWUsQ0FBM0IsR0FBK0IsTUFBTSxDQUFDLE1BQVAsR0FBYyxFQUhyRDtLQUFBLE1BQUE7O01BT0gsTUFBTSxDQUFDLENBQVAsR0FBVyxNQUFNLENBQUMsQ0FBUCxHQUFXO01BQ3RCLE1BQU0sQ0FBQyxDQUFQLEdBQVcsTUFBTSxDQUFDLENBQVAsR0FBVyxHQVJuQjs7V0FVTDtFQXRDVTtFQXdDWixXQUFBLEdBQWMsUUFBQSxDQUFDLEdBQUQsQ0FBQTtBQUNoQixRQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUE7SUFBSSxNQUFBLEdBQVMsR0FBRyxDQUFDLFNBQUosQ0FBQTtBQUNUO0lBQUEsS0FBQSx1Q0FBQTs7WUFBc0QsV0FBQSxLQUFpQixHQUFqQixJQUF5QixXQUFBLEtBQWlCOzs7TUFDOUYsV0FBQSxHQUFjLFdBQVcsQ0FBQyxTQUFaLENBQUE7TUFDZCxJQUFHLE1BQU0sQ0FBQyxDQUFQLEtBQVksV0FBVyxDQUFDLENBQXhCLElBQThCLE1BQU0sQ0FBQyxDQUFQLEtBQVksV0FBVyxDQUFDLENBQXpEO1FBQ0UsTUFBTSxDQUFDLENBQVAsSUFBWTtRQUNaLE1BQU0sQ0FBQyxDQUFQLElBQVksR0FEcEI7Ozs7O1FBTVEsR0FBRyxDQUFDLFNBQUosQ0FBYyxNQUFkO1FBQ0EsV0FBQSxDQUFZLEdBQVo7QUFDQSxlQVRGOztJQUZGO0VBRlk7RUFlZCxZQUFBLEdBQWUsUUFBQSxDQUFDLElBQUQsRUFBTyxLQUFQLEVBQWMsR0FBZCxDQUFBO0lBQ2IsWUFBWSxDQUFDLElBQUQsQ0FBTSxDQUFDLEtBQUQsQ0FBbEIsR0FBNEIsR0FBRyxDQUFDLFNBQUosQ0FBQTtXQUM1QixTQUFBLENBQVUsY0FBVixFQUEwQixZQUExQjtFQUZhO0VBSWYsU0FBQSxHQUFZLFFBQUEsQ0FBQyxJQUFELEVBQU8sQ0FBQyxLQUFELENBQVAsRUFBZ0IsUUFBUSxDQUFBLENBQXhCLENBQUE7QUFDZCxRQUFBLFVBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLEtBQUEsRUFBQTtJQUFJLElBQU8sS0FBSyxDQUFDLElBQU4sS0FBYyxLQUFyQjtNQUNFLFVBQUEsR0FBYTtNQUNiLEtBQUssQ0FBQyxJQUFOLEdBQWEsTUFGZjs7SUFHQSxLQUFBLEdBQVEsWUFBQSxDQUFhLElBQWI7SUFDUixNQUFBLEdBQVMsU0FBQSxDQUFVLElBQVYsRUFBZ0IsS0FBaEI7SUFDVCxVQUFBLEdBQWE7TUFBQSxlQUFBLEVBQW9CLFdBQVcsQ0FBQyxtQkFBZixHQUF3QyxTQUF4QyxHQUF1RDtJQUF4RTtJQUNiLEdBQUEsR0FBTSxJQUFJLGFBQUosQ0FBa0IsTUFBTSxDQUFDLE1BQVAsQ0FBYyxDQUFBLENBQWQsRUFBa0IsYUFBbEIsRUFBaUMsTUFBakMsRUFBeUMsVUFBekMsRUFBcUQsS0FBckQsQ0FBbEI7SUFDTixXQUFBLENBQVksR0FBWjtJQUNBLFlBQUEsQ0FBYSxJQUFiLEVBQW1CLEtBQW5CLEVBQTBCLEdBQTFCO0lBQ0EsR0FBRyxDQUFDLFFBQUosQ0FBYSxDQUFBLE9BQUEsQ0FBQSxDQUFVLElBQVYsQ0FBQSxLQUFBLENBQWIsQ0FDQSxDQUFDLEtBREQsQ0FDTyxRQUFBLENBQUMsR0FBRCxDQUFBO2FBQVEsTUFBTSxDQUFDLGNBQVAsQ0FBc0I7UUFBQSxPQUFBLEVBQVMsR0FBRyxDQUFDO01BQWIsQ0FBdEI7SUFBUixDQURQO0lBRUEsSUFBc0MsVUFBdEM7TUFBQSxHQUFHLENBQUMsSUFBSixDQUFTLGVBQVQsRUFBMEIsR0FBRyxDQUFDLElBQTlCLEVBQUE7O0lBQ0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxNQUFQLEVBQWUsUUFBQSxDQUFDLENBQUQsQ0FBQTthQUFNLFlBQUEsQ0FBYSxJQUFiLEVBQW1CLEtBQW5CLEVBQTBCLEdBQTFCO0lBQU4sQ0FBZjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sUUFBUCxFQUFpQixRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQU0sWUFBQSxDQUFhLElBQWIsRUFBbUIsS0FBbkIsRUFBMEIsR0FBMUI7SUFBTixDQUFqQjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sUUFBUCxFQUFpQixRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQU0sVUFBQSxDQUFXLElBQVgsRUFBaUIsS0FBakI7SUFBTixDQUFqQjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sUUFBUCxFQUFpQixRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQU0sWUFBQSxDQUFBO0lBQU4sQ0FBakIsRUFmSjs7SUFrQkksR0FBRyxDQUFDLEVBQUosQ0FBTyxPQUFQLEVBQWdCLFFBQUEsQ0FBQyxDQUFELENBQUE7YUFBTSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQWhCLENBQXFCLE9BQXJCO0lBQU4sQ0FBaEI7SUFDQSxHQUFHLENBQUMsRUFBSixDQUFPLE1BQVAsRUFBZSxRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQU0sR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFoQixDQUFxQixNQUFyQjtJQUFOLENBQWY7SUFDQSxHQUFHLENBQUMsRUFBSixDQUFPLFVBQVAsRUFBbUIsUUFBQSxDQUFDLENBQUQsQ0FBQTthQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBaEIsQ0FBcUIsVUFBckI7SUFBTixDQUFuQjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sWUFBUCxFQUFxQixRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQU0sR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFoQixDQUFxQixZQUFyQjtJQUFOLENBQXJCO1dBRUE7RUF4QlU7RUEwQlosU0FBQSxHQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7QUFDZCxRQUFBO0lBQUksR0FBQSxHQUFNLFNBQUEsQ0FBVSxPQUFWLEVBQW1CO01BQUMsS0FBQSxFQUFPO0lBQVIsQ0FBbkIsRUFBbUM7TUFBQSxLQUFBLEVBQU87SUFBUCxDQUFuQztJQUNOLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQWpCLENBQVYsR0FBaUM7TUFBQSxPQUFBLEVBQVM7SUFBVDtBQUNqQyxXQUFPO0VBSEc7RUFLWixXQUFBLEdBQWMsUUFBQSxDQUFBLENBQUE7V0FDWixTQUFBLENBQVUsU0FBVixFQUFxQjtNQUFDLEtBQUEsRUFBTztJQUFSLENBQXJCLEVBQXFDO01BQUEsS0FBQSxFQUFPLFNBQVA7TUFBa0IsUUFBQSxFQUFVO0lBQTVCLENBQXJDO0VBRFk7RUFHZCxNQUFBLEdBQVMsUUFBQSxDQUFBLENBQUE7SUFDUCxJQUFHLFVBQUg7TUFDRSxFQUFFLENBQUMsSUFBSCxDQUFBLEVBREY7S0FBQSxNQUFBO01BR0UsRUFBQSxHQUFLLFNBQUEsQ0FBVSxJQUFWLEVBQWdCO1FBQUMsS0FBQSxFQUFPO01BQVIsQ0FBaEIsRUFBZ0M7UUFBQSxLQUFBLEVBQU8sV0FBUDtRQUFvQixJQUFBLEVBQU0sS0FBMUI7TUFBQSxDQUFoQztNQUNMLEVBQUUsQ0FBQyxFQUFILENBQU0sT0FBTixFQUFlLFFBQUEsQ0FBQyxDQUFELENBQUE7UUFDYixLQUFPLFdBQVA7VUFDRSxDQUFDLENBQUMsY0FBRixDQUFBO2lCQUNBLEVBQUUsQ0FBQyxJQUFILENBQUEsRUFGRjs7TUFEYSxDQUFmO01BSUEsSUFBQSxDQUFLLGVBQUwsRUFSRjs7QUFTQSxXQUFPO0VBVkE7RUFZVCxrQkFBQSxHQUFxQixRQUFBLENBQUEsQ0FBQTtJQUNuQixJQUFHLHNCQUFIO01BQ0UsY0FBYyxDQUFDLElBQWYsQ0FBQSxFQURGO0tBQUEsTUFBQTtNQUdFLGNBQUEsR0FBaUIsU0FBQSxDQUFVLGlCQUFWLEVBQTZCO1FBQUMsS0FBQSxFQUFPO01BQVIsQ0FBN0IsRUFBNkM7UUFBQSxLQUFBLEVBQU8saUJBQVA7UUFBMEIsU0FBQSxFQUFXLEtBQXJDO1FBQTRDLGNBQUEsRUFBZ0IsS0FBNUQ7UUFBbUUsS0FBQSxFQUFPLEtBQTFFO1FBQWlGLGFBQUEsRUFBZTtNQUFoRyxDQUE3QztNQUNqQixjQUFjLENBQUMsRUFBZixDQUFrQixPQUFsQixFQUEyQixRQUFBLENBQUMsQ0FBRCxDQUFBO2VBQU0sY0FBQSxHQUFpQjtNQUF2QixDQUEzQixFQUpGOztBQUtBLFdBQU87RUFOWTtFQVFyQixZQUFBLEdBQWUsUUFBQSxDQUFBLENBQUE7SUFDYixJQUFjLENBQUMsR0FBRyxDQUFDLEtBQUwsSUFBZSxhQUFhLENBQUMsYUFBZCxDQUFBLENBQTZCLENBQUMsTUFBOUIsSUFBd0MsQ0FBckU7YUFBQSxHQUFHLENBQUMsSUFBSixDQUFBLEVBQUE7O0VBRGE7U0FJZixJQUFBLENBQUssUUFBTCxFQUFlLE1BQUEsR0FDYjtJQUFBLElBQUEsRUFBTSxRQUFBLENBQUEsQ0FBQTthQUNKLFlBQUEsR0FBZSxTQUFBLENBQVUsY0FBVjtJQURYLENBQU47SUFHQSxJQUFBLEVBQU0sVUFITjtJQUtBLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtNQUNMLElBQTZDLFVBQTdDO1FBQUEsTUFBTSxLQUFBLENBQU0seUJBQU4sRUFBTjs7YUFDQTtJQUZLLENBTFA7SUFTQSxJQUFBLEVBQ0U7TUFBQSxLQUFBLEVBQU8sU0FBUDtNQUNBLE9BQUEsRUFBUyxXQURUO01BRUEsRUFBQSxFQUFJLE1BRko7TUFHQSxjQUFBLEVBQWdCO0lBSGhCLENBVkY7SUFlQSxRQUFBLEVBQVUsUUFBQSxDQUFBLENBQUE7QUFDZCxVQUFBO01BQU0sSUFBRyxhQUFhLENBQUMsYUFBZCxDQUFBLENBQTZCLENBQUMsTUFBOUIsS0FBd0MsQ0FBM0M7UUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQVosQ0FBQSxFQURGO09BQUEsTUFFSyxJQUFHLFNBQUg7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQVosQ0FBQSxFQURHO09BQUEsTUFBQTtRQUdILE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBWixDQUFBLEVBSEc7O01BSUwsR0FBQSxHQUFNLEtBQUssQ0FBQyxJQUFOLENBQVcsYUFBYSxDQUFDLGFBQWQsQ0FBQSxDQUFYO01BQ04sSUFBaUIsR0FBRyxDQUFDLFdBQUosQ0FBQSxDQUFqQjtRQUFBLEdBQUcsQ0FBQyxPQUFKLENBQUEsRUFBQTs7YUFDQSxHQUFHLENBQUMsS0FBSixDQUFBO0lBVFEsQ0FmVjtJQTBCQSxTQUFBLEVBQVcsUUFBQSxDQUFBLENBQUE7YUFBSyxTQUFBLEdBQVk7SUFBakIsQ0ExQlg7SUEyQkEsV0FBQSxFQUFhLFFBQUEsQ0FBQSxDQUFBO2FBQUssV0FBQSxHQUFjO0lBQW5CO0VBM0JiLENBREY7QUExS3lCLENBQTNCLEVBN2dEb0U7OztBQXd0RHBFLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxVQUFSLEVBQW9CLEtBQXBCLEVBQTJCLEtBQTNCLEVBQWtDLE1BQWxDLEVBQTBDLFdBQTFDLEVBQXVELFNBQXZELEVBQWtFLFFBQWxFLENBQUwsRUFBa0YsTUFBQSxRQUFBLENBQUMsR0FBRCxFQUFNLFFBQU4sRUFBZ0IsR0FBaEIsRUFBcUIsR0FBckIsRUFBMEIsSUFBMUIsRUFBZ0MsU0FBaEMsRUFBMkMsT0FBM0MsRUFBb0QsTUFBcEQsQ0FBQTtBQUNsRixNQUFBO0VBQUUsQ0FBQSxDQUFFLEdBQUYsQ0FBQSxHQUFVLE9BQUEsQ0FBUSxVQUFSLENBQVY7RUFHQSxJQUFxQixPQUFBLENBQVEsMkJBQVIsQ0FBckI7O0FBQUEsV0FBTyxHQUFHLENBQUMsSUFBSixDQUFBLEVBQVA7R0FIRjs7RUFNRSxJQUFHLENBQUksR0FBRyxDQUFDLHlCQUFKLENBQUEsQ0FBUDtJQUNFLEdBQUcsQ0FBQyxJQUFKLENBQUEsRUFERjtHQUFBLE1BQUE7SUFHRSxHQUFHLENBQUMsRUFBSixDQUFPLGlCQUFQLEVBQTBCLFFBQUEsQ0FBQyxLQUFELEVBQVEsV0FBUixFQUFxQixnQkFBckIsQ0FBQTthQUN4QixNQUFNLENBQUMsUUFBUCxDQUFBO0lBRHdCLENBQTFCLEVBSEY7R0FORjs7RUFhRSxHQUFHLENBQUMsV0FBVyxDQUFDLFlBQWhCLENBQTZCLGdDQUE3QjtFQUNBLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBaEIsQ0FBNkIscUJBQTdCLEVBZEY7O0VBaUJFLEdBQUcsQ0FBQyxvQkFBSixDQUNFO0lBQUEsZUFBQSxFQUFpQixDQUFBLFVBQUEsQ0FBQSxDQUFhLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBWixDQUFvQixhQUFwQixFQUFtQyxJQUFuQyxDQUFiLENBQUEsQ0FBakI7SUFDQSxrQkFBQSxFQUFvQixDQUNsQixDQUFBLFNBQUEsQ0FBQSxDQUFZLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQXRCLENBQTRCLEdBQTVCLENBQWdDLENBQUMsQ0FBRCxDQUE1QyxDQUFBLENBRGtCLEVBRWxCLENBQUEsT0FBQSxDQUFBLENBQVUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBcEIsQ0FBMEIsR0FBMUIsQ0FBOEIsQ0FBQyxDQUFELENBQXhDLENBQUEsQ0FGa0IsRUFHbEIsQ0FBQSxLQUFBLENBQUEsQ0FBUSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFsQixDQUF3QixHQUF4QixDQUE0QixDQUFDLENBQUQsQ0FBcEMsQ0FBQSxDQUhrQixDQUluQixDQUFDLElBSmtCLENBSWIsS0FKYSxDQURwQjtJQU1BLE9BQUEsRUFBUyxFQU5UO0lBT0EsU0FBQSxFQUFXO0VBUFgsQ0FERixFQWpCRjs7RUE0QkUsU0FBUyxDQUFDLElBQVYsQ0FBQTtFQUNBLE1BQU0sQ0FBQyxJQUFQLENBQUEsRUE3QkY7O0VBZ0NFLE1BQU0sR0FBRyxDQUFDLFNBQUosQ0FBQSxFQWhDUjs7O0VBb0NFLElBQUksQ0FBQyxLQUFMLENBQUEsRUFwQ0Y7OztFQXdDRSxRQUFRLENBQUMsS0FBVCxDQUFBLEVBeENGOzs7Ozs7O0VBZ0RFLGNBQUEsQ0FBZSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQTNCLEVBaERGOztFQW1ERSxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBWixDQUFpQixTQUFqQjtFQUNOLEdBQUEsQ0FBSSxDQUFBLGFBQUEsQ0FBQSxDQUFnQixHQUFHLENBQUMsT0FBcEIsQ0FBQSxDQUFKO0VBQ0EsR0FBQSxDQUFJLENBQUEsV0FBQSxDQUFBLENBQWMsR0FBRyxDQUFDLEtBQWxCLENBQUEsQ0FBSjtFQUNBLEdBQUEsQ0FBSSxDQUFBLFdBQUEsQ0FBQSxDQUFjLEdBQUcsQ0FBQyxLQUFsQixDQUFBLENBQUo7RUFDQSxHQUFBLENBQUksQ0FBQSxjQUFBLENBQUEsQ0FBaUIsR0FBRyxDQUFDLFFBQXJCLENBQUEsQ0FBSjtFQUNBLEdBQUEsQ0FBSSxDQUFBLFVBQUEsQ0FBQSxDQUFhLEdBQUcsQ0FBQyxJQUFqQixDQUFBLENBQUosRUF4REY7Ozs7RUE2REUsR0FBRyxDQUFDLElBQUosQ0FBUyxzQkFBVCxFQUFpQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQTdDLEVBN0RGOztFQWdFRSxNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBWixDQUFpQixjQUFqQjtFQUVOLE1BQU0sQ0FBQyxTQUFQLENBQUEsRUFsRUY7OztFQXNFRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQVosQ0FBQSxFQXRFRjs7RUF5RUUsR0FBRyxDQUFDLEVBQUosQ0FBTyxVQUFQLEVBQW1CLE1BQU0sQ0FBQyxRQUExQixFQXpFRjs7RUE0RUUsR0FBRyxDQUFDLEVBQUosQ0FBTyxtQkFBUCxFQUE0QixRQUFBLENBQUEsQ0FBQSxFQUFBLENBQTVCLEVBNUVGOztTQStFRSxPQUFPLENBQUMsS0FBUixDQUFBO0FBaEZnRixDQUFsRiIsInNvdXJjZXNDb250ZW50IjpbIiMgbm9kZV9tb2R1bGVzL3Rha2UtYW5kLW1ha2Uvc291cmNlL3Rha2UtYW5kLW1ha2UuY29mZmVlXG4jIFNpbmNlIHRoaXMgaXMgdHlwaWNhbGx5IHRoZSBmaXJzdCBiaXQgb2YgY29kZSBpbmNsdWRlZCBpbiBvdXIgYmlnIGNvbXBpbGVkIGFuZFxuIyBjb25jYXRlbmF0ZWQgSlMgZmlsZXMsIHRoaXMgaXMgYSBncmVhdCBwbGFjZSB0byBkZW1hbmQgc3RyaWN0bmVzcy4gQ29mZmVlU2NyaXB0XG4jIGRvZXMgbm90IGFkZCBzdHJpY3Qgb24gaXRzIG93biwgYnV0IGl0IHdpbGwgcGVybWl0IGFuZCBlbmZvcmNlIGl0LlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbiMgQmFpbCBpZiBUYWtlJk1ha2UgaXMgYWxyZWFkeSBydW5uaW5nIGluIHRoaXMgc2NvcGUsIG9yIGlmIHNvbWV0aGluZyBlbHNlIGlzIHVzaW5nIG91ciBuYW1lc1xudW5sZXNzIFRha2U/IG9yIE1ha2U/XG5cbiAgIyBXZSBkZWNsYXJlIG91ciBnbG9iYWxzIHN1Y2ggdGhhdCB0aGV5J3JlIHZpc2libGUgZXZlcnl3aGVyZSB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICMgVGhpcyBhbGxvd3MgZm9yIG5hbWVzcGFjaW5nIOKAlCBhbGwgdGhpbmdzIHdpdGhpbiBhIGdpdmVuIHNjb3BlIHNoYXJlIGEgY29weSBvZiBUYWtlICYgTWFrZS5cbiAgVGFrZSA9IG51bGxcbiAgTWFrZSA9IG51bGxcbiAgRGVidWdUYWtlTWFrZSA9IG51bGxcblxuICBkbyAoKS0+XG5cbiAgICBtYWRlID0ge31cbiAgICB3YWl0aW5nVGFrZXJzID0gW11cbiAgICB0YWtlcnNUb05vdGlmeSA9IFtdXG4gICAgYWxyZWFkeVdhaXRpbmdUb05vdGlmeSA9IGZhbHNlXG4gICAgYWxyZWFkeUNoZWNraW5nID0gZmFsc2VcbiAgICBtaWNyb3Rhc2tzTmVlZGVkID0gMFxuICAgIG1pY3JvdGFza3NVc2VkID0gMFxuXG4gICAgTWFrZSA9IChuYW1lLCB2YWx1ZSA9IG5hbWUpLT5cbiAgICAgICMgRGVidWcg4oCUIGNhbGwgTWFrZSgpIGluIHRoZSBjb25zb2xlIHRvIHNlZSB3aGF0IHdlJ3ZlIHJlZ3N0ZXJlZFxuICAgICAgcmV0dXJuIGNsb25lIG1hZGUgaWYgbm90IG5hbWU/XG5cbiAgICAgICMgU3luY2hyb25vdXMgcmVnaXN0ZXIsIHJldHVybnMgdmFsdWVcbiAgICAgIHJlZ2lzdGVyIG5hbWUsIHZhbHVlXG5cblxuICAgIFRha2UgPSAobmVlZHMsIGNhbGxiYWNrKS0+XG4gICAgICAjIERlYnVnIOKAlCBjYWxsIFRha2UoKSBpbiB0aGUgY29uc29sZSB0byBzZWUgd2hhdCB3ZSdyZSB3YWl0aW5nIGZvclxuICAgICAgcmV0dXJuIHdhaXRpbmdUYWtlcnMuc2xpY2UoKSBpZiBub3QgbmVlZHM/XG5cbiAgICAgICMgU3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyByZXNvbHZlLCByZXR1cm5zIHZhbHVlIG9yIG9iamVjdCBvZiB2YWx1ZXNcbiAgICAgIHJlc29sdmUgbmVlZHMsIGNhbGxiYWNrXG5cblxuICAgICMgQSB2YXJpYXRpb24gb2YgTWFrZSB0aGF0IGRlZmVycyBjb21taXR0aW5nIHRoZSB2YWx1ZVxuICAgIE1ha2UuYXN5bmMgPSAobmFtZSwgdmFsdWUgPSBuYW1lKS0+XG4gICAgICBxdWV1ZU1pY3JvdGFzayAoKS0+XG4gICAgICAgIE1ha2UgbmFtZSwgdmFsdWVcblxuXG4gICAgIyBBIHZhcmlhdGlvbiBvZiBUYWtlIHRoYXQgcmV0dXJucyBhIHByb21pc2VcbiAgICBUYWtlLmFzeW5jID0gKG5lZWRzKS0+XG4gICAgICBuZXcgUHJvbWlzZSAocmVzKS0+XG4gICAgICAgIFRha2UgbmVlZHMsICgpLT5cbiAgICAgICAgICAjIFJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCBhIHZhbHVlIG9yIG9iamVjdCBvZiB2YWx1ZXNcbiAgICAgICAgICByZXMgc3luY2hyb25vdXNSZXNvbHZlIG5lZWRzXG5cblxuICAgIERlYnVnVGFrZU1ha2UgPSAoKS0+XG4gICAgICBvdXRwdXQgPVxuICAgICAgICBtaWNyb3Rhc2tzTmVlZGVkOiBtaWNyb3Rhc2tzTmVlZGVkXG4gICAgICAgIG1pY3JvdGFza3NVc2VkOiBtaWNyb3Rhc2tzVXNlZFxuICAgICAgICB1bnJlc29sdmVkOiB7fVxuICAgICAgZm9yIHdhaXRpbmcgaW4gd2FpdGluZ1Rha2Vyc1xuICAgICAgICBmb3IgbmVlZCBpbiB3YWl0aW5nLm5lZWRzXG4gICAgICAgICAgdW5sZXNzIG1hZGVbbmVlZF0/XG4gICAgICAgICAgICBvdXRwdXQudW5yZXNvbHZlZFtuZWVkXSA/PSAwXG4gICAgICAgICAgICBvdXRwdXQudW5yZXNvbHZlZFtuZWVkXSsrXG4gICAgICByZXR1cm4gb3V0cHV0XG5cblxuICAgIHJlZ2lzdGVyID0gKG5hbWUsIHZhbHVlKS0+XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbWF5IG5vdCBNYWtlKFxcXCJcXFwiKSBhbiBlbXB0eSBzdHJpbmcuXCIpIGlmIG5hbWUgaXMgXCJcIlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG1heSBub3QgTWFrZSgpIHRoZSBzYW1lIG5hbWUgdHdpY2U6ICN7bmFtZX1cIikgaWYgbWFkZVtuYW1lXT9cbiAgICAgIG1hZGVbbmFtZV0gPSB2YWx1ZVxuICAgICAgY2hlY2tXYWl0aW5nVGFrZXJzKClcbiAgICAgIHZhbHVlXG5cblxuICAgIGNoZWNrV2FpdGluZ1Rha2VycyA9ICgpLT5cbiAgICAgIHJldHVybiBpZiBhbHJlYWR5Q2hlY2tpbmcgIyBQcmV2ZW50IHJlY3Vyc2lvbiBmcm9tIE1ha2UoKSBjYWxscyBpbnNpZGUgbm90aWZ5KClcbiAgICAgIGFscmVhZHlDaGVja2luZyA9IHRydWVcblxuICAgICAgIyBDb21tZW50cyBiZWxvdyBhcmUgdG8gaGVscCByZWFzb24gdGhyb3VnaCB0aGUgKHBvdGVudGlhbGx5KSByZWN1cnNpdmUgYmVoYXZpb3VyXG5cbiAgICAgIGZvciB0YWtlciwgaW5kZXggaW4gd2FpdGluZ1Rha2VycyAjIERlcGVuZHMgb24gYHdhaXRpbmdUYWtlcnNgXG4gICAgICAgIGlmIGFsbE5lZWRzQXJlTWV0KHRha2VyLm5lZWRzKSAjIERlcGVuZHMgb24gYG1hZGVgXG4gICAgICAgICAgd2FpdGluZ1Rha2Vycy5zcGxpY2UoaW5kZXgsIDEpICMgTXV0YXRlcyBgd2FpdGluZ1Rha2Vyc2BcbiAgICAgICAgICBub3RpZnkodGFrZXIpICMgQ2FsbHMgdG8gTWFrZSgpIG9yIFRha2UoKSB3aWxsIG11dGF0ZSBgbWFkZWAgb3IgYHdhaXRpbmdUYWtlcnNgXG4gICAgICAgICAgYWxyZWFkeUNoZWNraW5nID0gZmFsc2VcbiAgICAgICAgICByZXR1cm4gY2hlY2tXYWl0aW5nVGFrZXJzKCkgIyBSZXN0YXJ0OiBgd2FpdGluZ1Rha2Vyc2AgKGFuZCBwb3NzaWJseSBgbWFkZWApIHdlcmUgbXV0YXRlZFxuXG4gICAgICBhbHJlYWR5Q2hlY2tpbmcgPSBmYWxzZVxuXG5cbiAgICBhbGxOZWVkc0FyZU1ldCA9IChuZWVkcyktPlxuICAgICAgcmV0dXJuIG5lZWRzLmV2ZXJ5IChuYW1lKS0+IG1hZGVbbmFtZV0/XG5cblxuICAgIHJlc29sdmUgPSAobmVlZHMsIGNhbGxiYWNrKS0+XG4gICAgICAjIFdlIGFsd2F5cyB0cnkgdG8gcmVzb2x2ZSBib3RoIHN5bmNocm9ub3VzbHkgYW5kIGFzeW5jaHJvbm91c2x5XG4gICAgICBhc3luY2hyb25vdXNSZXNvbHZlIG5lZWRzLCBjYWxsYmFjayBpZiBjYWxsYmFjaz9cbiAgICAgIHN5bmNocm9ub3VzUmVzb2x2ZSBuZWVkc1xuXG5cbiAgICBhc3luY2hyb25vdXNSZXNvbHZlID0gKG5lZWRzLCBjYWxsYmFjayktPlxuICAgICAgaWYgbmVlZHMgaXMgXCJcIlxuICAgICAgICBuZWVkcyA9IFtdXG4gICAgICBlbHNlIGlmIHR5cGVvZiBuZWVkcyBpcyBcInN0cmluZ1wiXG4gICAgICAgIG5lZWRzID0gW25lZWRzXVxuXG4gICAgICB0YWtlciA9IG5lZWRzOiBuZWVkcywgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgICAgIGlmIGFsbE5lZWRzQXJlTWV0IG5lZWRzXG4gICAgICAgIHRha2Vyc1RvTm90aWZ5LnB1c2ggdGFrZXJcbiAgICAgICAgbWljcm90YXNrc05lZWRlZCsrXG4gICAgICAgIHVubGVzcyBhbHJlYWR5V2FpdGluZ1RvTm90aWZ5XG4gICAgICAgICAgYWxyZWFkeVdhaXRpbmdUb05vdGlmeSA9IHRydWVcbiAgICAgICAgICBxdWV1ZU1pY3JvdGFzayBub3RpZnlUYWtlcnMgIyBQcmVzZXJ2ZSBhc3luY2hyb255XG4gICAgICAgICAgbWljcm90YXNrc1VzZWQrK1xuICAgICAgZWxzZVxuICAgICAgICB3YWl0aW5nVGFrZXJzLnB1c2ggdGFrZXJcblxuXG4gICAgc3luY2hyb25vdXNSZXNvbHZlID0gKG5lZWRzKS0+XG4gICAgICBpZiB0eXBlb2YgbmVlZHMgaXMgXCJzdHJpbmdcIlxuICAgICAgICByZXR1cm4gbWFkZVtuZWVkc11cbiAgICAgIGVsc2VcbiAgICAgICAgbyA9IHt9XG4gICAgICAgIG9bbl0gPSBtYWRlW25dIGZvciBuIGluIG5lZWRzXG4gICAgICAgIHJldHVybiBvXG5cblxuICAgIG5vdGlmeVRha2VycyA9ICgpLT5cbiAgICAgIGFscmVhZHlXYWl0aW5nVG9Ob3RpZnkgPSBmYWxzZVxuICAgICAgdGFrZXJzID0gdGFrZXJzVG9Ob3RpZnlcbiAgICAgIHRha2Vyc1RvTm90aWZ5ID0gW11cbiAgICAgIG5vdGlmeSB0YWtlciBmb3IgdGFrZXIgaW4gdGFrZXJzXG4gICAgICBudWxsXG5cblxuICAgIG5vdGlmeSA9ICh0YWtlciktPlxuICAgICAgcmVzb2x2ZWROZWVkcyA9IHRha2VyLm5lZWRzLm1hcCAobmFtZSktPiBtYWRlW25hbWVdXG4gICAgICB0YWtlci5jYWxsYmFjay5hcHBseShudWxsLCByZXNvbHZlZE5lZWRzKVxuXG5cbiAgICAjIElFMTEgZG9lc24ndCBzdXBwb3J0IE9iamVjdC5hc3NpZ24oe30sIG9iaiksIHNvIHdlIGp1c3QgdXNlIG91ciBvd25cbiAgICBjbG9uZSA9IChvYmopLT5cbiAgICAgIG91dCA9IHt9XG4gICAgICBvdXRba10gPSB2IGZvciBrLHYgb2Ygb2JqXG4gICAgICBvdXRcblxuXG4gICAgIyBXZSB3YW50IHRvIGFkZCBhIGZldyBoYW5keSBvbmUtdGltZSBldmVudHMuXG4gICAgIyBIb3dldmVyLCB3ZSBkb24ndCBrbm93IGlmIHdlJ2xsIGJlIHJ1bm5pbmcgaW4gYSBicm93c2VyLCBvciBpbiBub2RlLlxuICAgICMgVGh1cywgd2UgbG9vayBmb3IgdGhlIHByZXNlbmNlIG9mIGEgXCJ3aW5kb3dcIiBvYmplY3QgYXMgb3VyIGNsdWUuXG4gICAgaWYgd2luZG93P1xuXG4gICAgICBhZGRMaXN0ZW5lciA9IChldmVudE5hbWUpLT5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgZXZlbnROYW1lLCBoYW5kbGVyID0gKGV2ZW50T2JqZWN0KS0+XG4gICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIgZXZlbnROYW1lLCBoYW5kbGVyXG4gICAgICAgICAgTWFrZSBldmVudE5hbWUsIGV2ZW50T2JqZWN0XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZCAjIHByZXZlbnQgdW5sb2FkIGZyb20gb3BlbmluZyBhIHBvcHVwXG5cbiAgICAgIGFkZExpc3RlbmVyIFwiYmVmb3JldW5sb2FkXCJcbiAgICAgIGFkZExpc3RlbmVyIFwiY2xpY2tcIlxuICAgICAgYWRkTGlzdGVuZXIgXCJ1bmxvYWRcIlxuXG4gICAgICAjIFNpbmNlIHdlIGhhdmUgYSB3aW5kb3cgb2JqZWN0LCBpdCdzIHByb2JhYmx5IHNhZmUgdG8gYXNzdW1lIHdlIGhhdmUgYSBkb2N1bWVudCBvYmplY3RcbiAgICAgIHN3aXRjaCBkb2N1bWVudC5yZWFkeVN0YXRlXG4gICAgICAgIHdoZW4gXCJsb2FkaW5nXCJcbiAgICAgICAgICBhZGRMaXN0ZW5lciBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIGFkZExpc3RlbmVyIFwibG9hZFwiXG4gICAgICAgIHdoZW4gXCJpbnRlcmFjdGl2ZVwiXG4gICAgICAgICAgTWFrZSBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIGFkZExpc3RlbmVyIFwibG9hZFwiXG4gICAgICAgIHdoZW4gXCJjb21wbGV0ZVwiXG4gICAgICAgICAgTWFrZSBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIE1ha2UgXCJsb2FkXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvciBcIlVua25vd24gZG9jdW1lbnQucmVhZHlTdGF0ZTogI3tkb2N1bWVudC5yZWFkeVN0YXRlfS4gQ2Fubm90IHNldHVwIFRha2UmTWFrZS5cIlxuXG5cbiAgICAjIEZpbmFsbHksIHdlJ3JlIHJlYWR5IHRvIGhhbmQgb3ZlciBjb250cm9sIHRvIG1vZHVsZSBzeXN0ZW1zXG4gICAgaWYgbW9kdWxlP1xuICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIFRha2U6IFRha2UsXG4gICAgICAgIE1ha2U6IE1ha2UsXG4gICAgICAgIERlYnVnVGFrZU1ha2U6IERlYnVnVGFrZU1ha2VcbiAgICAgIH1cblxuXG5cbiMgc3VibW9kdWxlL2J1Y2tldC9hZHNyLmNvZmZlZVxuIyBBRFNSXG4jIFRoaXMgZ2l2ZXMgeW91ciBmdW5jdGlvbiBhbiBcImF0dGFja1wiIHBoYXNlIGFuZCBhIFwicmVsZWFzZVwiIHBoYXNlXG4jIChib3Jyb3dpbmcgdGVybWlub2xvZ3kgZnJvbSBBRFNSIG9uIHN5bnRoZXNpemVycykuXG4jIFRoZSBhdHRhY2sgcGhhc2UgaXMgYSBkZWJvdW5jZSDigJQgeW91ciBmdW5jdGlvbiB3aWxsIHJ1biBqdXN0IG9uY2UgYWZ0ZXIgdGhlIGF0dGFjayBwaGFzZSBlbmRzLFxuIyBubyBtYXR0ZXIgaG93IG1hbnkgdGltZXMgaXQncyBjYWxsZWQgdW50aWwgdGhlbi5cbiMgV2hlbiB0aGUgZnVuY3Rpb24gcnVucywgaXQnbGwgdXNlIHRoZSBhcmdzIGZyb20gdGhlIG1vc3QgcmVjZW50IHRpbWUgaXQgd2FzIGNhbGxlZC5cbiMgVGhlIHJlbGVhc2UgaXMgYSB0aHJvdHRsZSDigJQgaWYgeW91ciBmdW5jdGlvbiBpcyBjYWxsZWQgZHVyaW5nIHRoZSByZWxlYXNlIHBoYXNlLFxuIyB0aGVuIGFmdGVyIHRoZSByZWxlYXNlIHBoYXNlIGVuZHMgdGhlIGF0dGFjayBwaGFzZSB3aWxsIHN0YXJ0IG92ZXIgYWdhaW4uXG4jIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSB3YW50IGEgZnVuY3Rpb24gdGhhdCB3aWxsIHJ1biBzaG9ydGx5IGFmdGVyIGl0J3MgY2FsbGVkIChnb29kIGZvciBmYXN0IHJlYWN0aW9ucylcbiMgYnV0IGRvZXNuJ3QgcnVuIGFnYWluIHVudGlsIGEgd2hpbGUgbGF0ZXIgKGdvb2QgZm9yIHJlZHVjaW5nIHN0cmFpbikuXG4jIEF0dGFjayBhbmQgcmVsZWFzZSBhcmUgc3BlY2lmaWVkIGluIG1zLCBhbmQgYXJlIG9wdGlvbmFsLlxuIyBJZiB5b3UgcGFzcyBhIHRpbWUgb2YgMCBtcyBmb3IgZWl0aGVyIHRoZSBhdHRhY2ssIHJlbGVhc2UsIG9yIGJvdGgsIHRoZSBwaGFzZSB3aWxsIGxhc3QgdW50aWwgdGhlIG5leHQgbWljcm90YXNrLlxuIyBJZiB5b3UgcGFzcyBhIHRpbWUgbGVzcyB0aGFuIDUgbXMsIHRoZSBwaGFzZSB3aWxsIGxhc3QgdW50aWwgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuIyBJdCdzIGlkaW9tYXRpYyB0byBwYXNzIGEgdGltZSBvZiAxIG1zIGlmIHlvdSB3YW50IHRoZSBuZXh0IGZyYW1lLlxuIyBXZSBhbHNvIGtlZXAgYSBjb3VudCBvZiBob3cgbWFueSBmdW5jdGlvbnMgYXJlIGN1cnJlbnRseSB3YWl0aW5nLCBhbmQgc3VwcG9ydCBhZGRpbmcgd2F0Y2hlcnNcbiMgdGhhdCB3aWxsIHJ1biBhIGNhbGxiYWNrIHdoZW4gdGhlIGNvdW50IGNoYW5nZXMsIGp1c3QgaW4gY2FzZSB5b3Ugd2FudCB0byAoZm9yIGV4YW1wbGUpXG4jIHdhaXQgZm9yIHRoZW0gYWxsIHRvIGZpbmlzaCBiZWZvcmUgcXVpdHRpbmcgLyBjbG9zaW5nLCBvciBtb25pdG9yIHRoZWlyIHBlcmZvcm1hbmNlLlxuXG5UYWtlIFtdLCAoKS0+XG5cbiAgYWN0aXZlID0gbmV3IE1hcCgpXG4gIHdhdGNoZXJzID0gW11cblxuICBNYWtlLmFzeW5jIFwiQURTUlwiLCBBRFNSID0gKC4uLlthdHRhY2sgPSAwLCByZWxlYXNlID0gMF0sIGZuKS0+ICguLi5hcmdzKS0+XG4gICAgaWYgbm90IGFjdGl2ZS5oYXMgZm5cbiAgICAgIGFmdGVyRGVsYXkgYXR0YWNrLCBhZnRlckF0dGFjayBmbiwgYXR0YWNrLCByZWxlYXNlXG4gICAgICBBRFNSLmNvdW50KytcbiAgICAgIHVwZGF0ZVdhdGNoZXJzKClcbiAgICBhY3RpdmUuc2V0IGZuLCB7YXJnc30gIyBBbHdheXMgdXNlIHRoZSBtb3N0IHJlY2VudCBhcmdzXG5cbiAgQURTUi5jb3VudCA9IDBcblxuICBBRFNSLndhdGNoZXIgPSAod2F0Y2hlciktPlxuICAgIHdhdGNoZXJzLnB1c2ggd2F0Y2hlclxuXG4gIGFmdGVyQXR0YWNrID0gKGZuLCBhdHRhY2ssIHJlbGVhc2UpLT4gKCktPlxuICAgIHthcmdzfSA9IGFjdGl2ZS5nZXQgZm5cbiAgICBhY3RpdmUuc2V0IGZuLCB7fVxuICAgIGZuIC4uLmFyZ3NcbiAgICBhZnRlckRlbGF5IHJlbGVhc2UsIGFmdGVyUmVsZWFzZSBmbiwgYXR0YWNrLCByZWxlYXNlXG5cbiAgYWZ0ZXJSZWxlYXNlID0gKGZuLCBhdHRhY2ssIHJlbGVhc2UpLT4gKCktPlxuICAgIHthcmdzfSA9IGFjdGl2ZS5nZXQgZm5cbiAgICBpZiBhcmdzXG4gICAgICBhZnRlckRlbGF5IGF0dGFjaywgYWZ0ZXJBdHRhY2sgZm4sIGF0dGFjaywgcmVsZWFzZVxuICAgIGVsc2VcbiAgICAgIGFjdGl2ZS5kZWxldGUgZm5cbiAgICAgIEFEU1IuY291bnQtLVxuICAgICAgdXBkYXRlV2F0Y2hlcnMoKVxuXG4gIGFmdGVyRGVsYXkgPSAoZGVsYXkgPSAwLCBjYiktPlxuICAgIGlmIGRlbGF5IGlzIDBcbiAgICAgIHF1ZXVlTWljcm90YXNrIGNiXG4gICAgZWxzZSBpZiBkZWxheSA8IDVcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjYlxuICAgIGVsc2VcbiAgICAgIHNldFRpbWVvdXQgY2IsIGRlbGF5XG5cbiAgdXBkYXRlV2F0Y2hlcnMgPSAoKS0+XG4gICAgd2F0Y2hlciBBRFNSLmNvdW50IGZvciB3YXRjaGVyIGluIHdhdGNoZXJzXG4gICAgbnVsbFxuXG5cblxuIyBzdWJtb2R1bGUvYnVja2V0L21vbmtleS1wYXRjaC5jb2ZmZWVcbiMgTW9ua2V5IFBhdGNoXG4jIFRoZSBKUyBzdGFuZGFyZCBsaWJyYXJ5IGxlYXZlcyBhIGxvdCB0byBiZSBkZXNpcmVkLCBzbyBsZXQncyBjYXJlZnVsbHkgKHNlZSBib3R0b20gb2YgZmlsZSlcbiMgbW9kaWZ5IHRoZSBidWlsdC1pbiBjbGFzc2VzIHRvIGFkZCBhIGZldyBoZWxwZnVsIG1ldGhvZHMuXG5cbmRvICgpLT5cbiAgbW9ua2V5UGF0Y2hlcyA9XG5cbiAgICBBcnJheTpcbiAgICAgIHR5cGU6ICh2KS0+IHYgaW5zdGFuY2VvZiBBcnJheVxuXG4gICAgICAjIFNvcnRpbmdcbiAgICAgIG51bWVyaWNTb3J0QXNjZW5kaW5nOiAoYSwgYiktPiBhIC0gYlxuICAgICAgbnVtZXJpY1NvcnREZXNjZW5kaW5nOiAoYSwgYiktPiBiIC0gYVxuICAgICAgc29ydEFscGhhYmV0aWM6IChhcnIpLT4gYXJyLnNvcnQgQXJyYXkuYWxwaGFiZXRpY1NvcnQgPz0gbmV3IEludGwuQ29sbGF0b3IoJ2VuJykuY29tcGFyZVxuICAgICAgc29ydE51bWVyaWNBc2NlbmRpbmc6IChhcnIpLT4gYXJyLnNvcnQgQXJyYXkubnVtZXJpY1NvcnRBc2NlbmRpbmdcbiAgICAgIHNvcnROdW1lcmljRGVzY2VuZGluZzogKGFyciktPiBhcnIuc29ydCBBcnJheS5udW1lcmljU29ydERlc2NlbmRpbmdcblxuICAgICAgIyBBY2Nlc3NpbmdcbiAgICAgIGZpcnN0OiAoYXJyKS0+IGFyclswXVxuICAgICAgc2Vjb25kOiAoYXJyKS0+IGFyclsxXVxuICAgICAgbGFzdDogKGFyciktPiBhcnJbYXJyLmxlbmd0aC0xXVxuICAgICAgcmVzdDogKGFyciktPiBhcnJbMS4uLl1cbiAgICAgIGJ1dExhc3Q6IChhcnIpLT4gYXJyWy4uLi0xXVxuXG4gICAgICAjIE1pc2NcblxuICAgICAgY2xvbmU6IChhcnIpLT5cbiAgICAgICAgYXJyLm1hcCBGdW5jdGlvbi5jbG9uZVxuXG4gICAgICBlbXB0eTogKGFyciktPlxuICAgICAgICBub3QgYXJyPyBvciBhcnIubGVuZ3RoIGlzIDBcblxuICAgICAgZXF1YWw6IChhLCBiKS0+XG4gICAgICAgIHJldHVybiB0cnVlIGlmIE9iamVjdC5pcyBhLCBiXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQXJyYXkudHlwZShhKSBhbmQgQXJyYXkudHlwZShiKSBhbmQgYS5sZW5ndGggaXMgYi5sZW5ndGhcbiAgICAgICAgZm9yIGFpLCBpIGluIGFcbiAgICAgICAgICBiaSA9IGJbaV1cbiAgICAgICAgICBpZiBGdW5jdGlvbi5lcXVhbCBhaSwgYmlcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgIG1hcFRvT2JqZWN0OiAoYXJyLCBmbiA9IEZ1bmN0aW9uLmlkZW50aXR5KS0+XG4gICAgICAgIG8gPSB7fVxuICAgICAgICBvW2tdID0gZm4gayBmb3IgayBpbiBhcnJcbiAgICAgICAgb1xuXG4gICAgICBwdWxsOiAoYXJyLCBlbG1zKS0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgYXJyPyBhbmQgZWxtcz9cbiAgICAgICAgZWxtcyA9IFtlbG1zXSB1bmxlc3MgQXJyYXkudHlwZSBlbG1zXG4gICAgICAgIGZvciBlbG0gaW4gZWxtc1xuICAgICAgICAgIHdoaWxlIChpID0gYXJyLmluZGV4T2YgZWxtKSA+IC0xXG4gICAgICAgICAgICBhcnIuc3BsaWNlIGksIDFcbiAgICAgICAgYXJyXG5cbiAgICAgIHNlYXJjaDogKGFyciwga2V5KS0+XG4gICAgICAgIGZvciB2IGluIGFyclxuICAgICAgICAgIGlmIEFycmF5LnR5cGUgdlxuICAgICAgICAgICAgcmV0dXJuIHRydWUgaWYgQXJyYXkuc2VhcmNoIHYsIGtleVxuICAgICAgICAgIGVsc2UgaWYgT2JqZWN0LnR5cGUgdlxuICAgICAgICAgICAgcmV0dXJuIHRydWUgaWYgT2JqZWN0LnNlYXJjaCB2LCBrZXlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIHNodWZmbGU6IChhcnIpLT5cbiAgICAgICAgbmV3QXJyID0gW11cbiAgICAgICAgZm9yIGl0ZW0sIGkgaW4gYXJyXG4gICAgICAgICAgbmV3QXJyLnNwbGljZSBNYXRoLnJhbmRJbnQoMCwgbmV3QXJyLmxlbmd0aCksIDAsIGl0ZW1cbiAgICAgICAgcmV0dXJuIG5ld0FyclxuXG4gICAgICB1bmlxdWU6IChlbGVtZW50cyktPlxuICAgICAgICBBcnJheS5mcm9tIG5ldyBTZXQgW10uY29uY2F0IGVsZW1lbnRzXG5cblxuICAgIEZ1bmN0aW9uOlxuICAgICAgdHlwZTogKHYpLT4gdiBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgICBpZGVudGl0eTogKHYpLT4gdlxuXG4gICAgICBleGlzdHM6IChlKS0+IGU/XG4gICAgICBub3RFeGlzdHM6IChlKS0+ICFlP1xuICAgICAgaXM6IChhLCBiKS0+IGEgaXMgYlxuICAgICAgaXNudDogKGEsIGIpLT4gYSBpc250IGJcbiAgICAgIGVxdWFsOiAoYSwgYiktPlxuICAgICAgICBpZiBPYmplY3QuaXMgYSwgYlxuICAgICAgICAgIHRydWVcbiAgICAgICAgZWxzZSBpZiBBcnJheS50eXBlKGEpIGFuZCBBcnJheS50eXBlKGIpXG4gICAgICAgICAgdHJ1ZSBpZiBBcnJheS5lcXVhbCBhLCBiXG4gICAgICAgIGVsc2UgaWYgT2JqZWN0LnR5cGUoYSkgYW5kIE9iamVjdC50eXBlKGIpXG4gICAgICAgICAgdHJ1ZSBpZiBPYmplY3QuZXF1YWwgYSwgYlxuICAgICAgICBlbHNlXG4gICAgICAgICAgZmFsc2VcbiAgICAgIGVxdWl2YWxlbnQ6IChhLCBiKS0+IGBhID09IGJgIG9yIEZ1bmN0aW9uLmVxdWFsIGEsIGIgIyBMaWtlIGVxdWFsLCBidXQgYWxzbyBlcXVhdGVzIG51bGwgJiB1bmRlZmluZWQsIC0wICYgMCwgZXRjXG4gICAgICBub3RFcXVhbDogKGEsIGIpLT4gIUZ1bmN0aW9uLmVxdWFsIGEsIGJcbiAgICAgIG5vdEVxdWl2YWxlbnQ6IChhLCBiKS0+ICFGdW5jdGlvbi5lcXVpdmFsZW50IGEsIGJcblxuICAgICAgY2xvbmU6ICh2KS0+XG4gICAgICAgIGlmIG5vdCB2P1xuICAgICAgICAgIHZcbiAgICAgICAgZWxzZSBpZiBGdW5jdGlvbi50eXBlIHZcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJJZiB5b3UgbmVlZCB0byBjbG9uZSBmdW5jdGlvbnMsIHVzZSBhIGN1c3RvbSBjbG9uZXJcIlxuICAgICAgICBlbHNlIGlmIFByb21pc2UudHlwZSB2XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiSWYgeW91IG5lZWQgdG8gY2xvbmUgcHJvbWlzZXMsIHVzZSBhIGN1c3RvbSBjbG9uZXJcIlxuICAgICAgICBlbHNlIGlmIEFycmF5LnR5cGUgdlxuICAgICAgICAgIEFycmF5LmNsb25lIHZcbiAgICAgICAgZWxzZSBpZiBPYmplY3QudHlwZSB2XG4gICAgICAgICAgT2JqZWN0LmNsb25lIHZcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHZcblxuXG4gICAgTWF0aDpcblxuICAgICAgVEFVOiBNYXRoLlBJICogMlxuXG4gICAgICB6ZXJvOiAodiktPiBNYXRoLkVQU0lMT04gPiBNYXRoLmFicyB2XG4gICAgICBub256ZXJvOiAodiktPiBub3QgTWF0aC56ZXJvIHZcblxuICAgICAgYWRkOiAoYSwgYiktPiBhICsgYlxuICAgICAgZGl2OiAoYSwgYiktPiBhIC8gYlxuICAgICAgbW9kOiAoYSwgYiktPiBhICUgYlxuICAgICAgbXVsOiAoYSwgYiktPiBhICogYlxuICAgICAgc3ViOiAoYSwgYiktPiBhIC0gYlxuXG4gICAgICBhdmc6IChhLCBiKS0+IChhICsgYikvMlxuXG4gICAgICBjbGlwOiAodiwgLi4uW21pbiA9IDBdLCBtYXggPSAxKS0+IE1hdGgubWluIG1heCwgTWF0aC5tYXggbWluLCB2XG4gICAgICBzYXQ6ICh2KSAtPiBNYXRoLmNsaXAgdlxuXG4gICAgICBsZXJwTjogKGlucHV0LCBvdXRwdXRNaW4gPSAwLCBvdXRwdXRNYXggPSAxLCBjbGlwID0gZmFsc2UpLT5cbiAgICAgICAgaW5wdXQgKj0gb3V0cHV0TWF4IC0gb3V0cHV0TWluXG4gICAgICAgIGlucHV0ICs9IG91dHB1dE1pblxuICAgICAgICBpbnB1dCA9IE1hdGguY2xpcCBpbnB1dCwgb3V0cHV0TWluLCBvdXRwdXRNYXggaWYgY2xpcFxuICAgICAgICByZXR1cm4gaW5wdXRcblxuICAgICAgbGVycDogKGlucHV0LCBpbnB1dE1pbiA9IDAsIGlucHV0TWF4ID0gMSwgb3V0cHV0TWluID0gMCwgb3V0cHV0TWF4ID0gMSwgY2xpcCA9IHRydWUpLT5cbiAgICAgICAgcmV0dXJuIG91dHB1dE1pbiBpZiBpbnB1dE1pbiBpcyBpbnB1dE1heCAjIEF2b2lkcyBhIGRpdmlkZSBieSB6ZXJvXG4gICAgICAgIFtpbnB1dE1pbiwgaW5wdXRNYXgsIG91dHB1dE1pbiwgb3V0cHV0TWF4XSA9IFtpbnB1dE1heCwgaW5wdXRNaW4sIG91dHB1dE1heCwgb3V0cHV0TWluXSBpZiBpbnB1dE1pbiA+IGlucHV0TWF4XG4gICAgICAgIGlucHV0ID0gTWF0aC5jbGlwIGlucHV0LCBpbnB1dE1pbiwgaW5wdXRNYXggaWYgY2xpcFxuICAgICAgICBpbnB1dCAtPSBpbnB1dE1pblxuICAgICAgICBpbnB1dCAvPSBpbnB1dE1heCAtIGlucHV0TWluXG4gICAgICAgIHJldHVybiBNYXRoLmxlcnBOIGlucHV0LCBvdXRwdXRNaW4sIG91dHB1dE1heCwgZmFsc2VcblxuICAgICAgcmFuZDogKG1pbiA9IC0xLCBtYXggPSAxKS0+IE1hdGgubGVycE4gTWF0aC5yYW5kb20oKSwgbWluLCBtYXhcbiAgICAgIHJhbmRJbnQ6IChtaW4sIG1heCktPiBNYXRoLnJvdW5kIE1hdGgucmFuZCBtaW4sIG1heFxuXG4gICAgICByb3VuZFRvOiAoaW5wdXQsIHByZWNpc2lvbiktPlxuICAgICAgICAjIFVzaW5nIHRoZSByZWNpcHJvY2FsIGF2b2lkcyBmbG9hdGluZyBwb2ludCBlcnJvcnMuIEVnOiAzLzEwIGlzIGZpbmUsIGJ1dCAzKjAuMSBpcyB3cm9uZy5cbiAgICAgICAgcCA9IDEgLyBwcmVjaXNpb25cbiAgICAgICAgTWF0aC5yb3VuZChpbnB1dCAqIHApIC8gcFxuXG5cbiAgICBPYmplY3Q6XG4gICAgICB0eXBlOiAodiktPiBcIltvYmplY3QgT2JqZWN0XVwiIGlzIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCB2XG5cbiAgICAgICMgVGhpcyBzaG91bGQgcHJvYmFibHkgYmUgYSBmdW5jdGlvbiBvbiBBcnJheSwgYXMgYSBtaXJyb3Igb2YgT2JqZWN0LmtleXMgLyBPYmplY3QudmFsdWVzLlxuICAgICAgIyBJbiBnZW5lcmFsLCBmdW5jdGlvbnMgdGhhdCB0YWtlIGFuIGFycmF5IGdvIG9uIEFycmF5LCBldmVuIGlmIHRoZXkgcmV0dXJuIGEgZGlmZmVyZW50IHR5cGUuXG4gICAgICBieTogKGssIGFyciktPiAjIE9iamVjdC5ieSBcIm5hbWVcIiwgW3tuYW1lOlwiYVwifSwge25hbWU6XCJiXCJ9XSA9PiB7YTp7bmFtZTpcImFcIn0sIGI6e25hbWU6XCJiXCJ9fVxuICAgICAgICBvID0ge31cbiAgICAgICAgb1tvYmpba11dID0gb2JqIGZvciBvYmogaW4gYXJyXG4gICAgICAgIHJldHVybiBvXG5cbiAgICAgIGNsb25lOiAob2JqKS0+XG4gICAgICAgIE9iamVjdC5tYXBWYWx1ZXMgb2JqLCBGdW5jdGlvbi5jbG9uZVxuXG4gICAgICBjb3VudDogKG9iaiktPlxuICAgICAgICBPYmplY3Qua2V5cyhvYmopLmxlbmd0aFxuXG4gICAgICBlcXVhbDogKGEsIGIpLT5cbiAgICAgICAgcmV0dXJuIHRydWUgaWYgT2JqZWN0LmlzIGEsIGJcbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyAoYT8gYW5kIGI/KSBhbmQgKHt9LmNvbnN0cnVjdG9yIGlzIGEuY29uc3RydWN0b3IgaXMgYi5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBPYmplY3Qua2V5cyhhKS5sZW5ndGggaXMgT2JqZWN0LmtleXMoYikubGVuZ3RoXG4gICAgICAgIGZvciBrLCBhdiBvZiBhXG4gICAgICAgICAgYnYgPSBiW2tdXG4gICAgICAgICAgaWYgRnVuY3Rpb24uZXF1YWwgYXYsIGJ2XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICBtYXBLZXlzOiAob2JqLCBmbiA9IEZ1bmN0aW9uLmlkZW50aXR5KS0+XG4gICAgICAgIG8gPSB7fVxuICAgICAgICBvW2tdID0gZm4gayBmb3IgayBvZiBvYmpcbiAgICAgICAgb1xuXG4gICAgICBtYXBWYWx1ZXM6IChvYmosIGZuID0gRnVuY3Rpb24uaWRlbnRpdHkpLT5cbiAgICAgICAgbyA9IHt9XG4gICAgICAgIG9ba10gPSBmbiB2IGZvciBrLCB2IG9mIG9ialxuICAgICAgICBvXG5cbiAgICAgIG1lcmdlOiAob2Jqcy4uLiktPlxuICAgICAgICBvdXQgPSB7fVxuICAgICAgICBmb3Igb2JqIGluIG9ianMgd2hlbiBvYmo/XG4gICAgICAgICAgZm9yIGssIHYgb2Ygb2JqXG4gICAgICAgICAgICAjIERPIE5PVCBhZGQgYW55IGFkZGl0aW9uYWwgbG9naWMgZm9yIG1lcmdpbmcgb3RoZXIgdHlwZXMgKGxpa2UgYXJyYXlzKSxcbiAgICAgICAgICAgICMgb3IgZXhpc3RpbmcgYXBwcyB3aWxsIGJyZWFrIChIeXBlcnppbmUsIEhlc3QsIGV0Yy4pXG4gICAgICAgICAgICAjIElmIHlvdSB3YW50IHRvIGRlZXAgbWVyZ2Ugb3RoZXIgdHlwZXMsIHdyaXRlIGEgY3VzdG9tIG1lcmdlIGZ1bmN0aW9uLlxuICAgICAgICAgICAgb3V0W2tdID0gaWYgT2JqZWN0LnR5cGUgdlxuICAgICAgICAgICAgICBPYmplY3QubWVyZ2Ugb3V0W2tdLCB2XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHZcbiAgICAgICAgb3V0XG5cbiAgICAgIHJtZXJnZTogKG9ianMuLi4pLT5cbiAgICAgICAgT2JqZWN0Lm1lcmdlIG9ianMucmV2ZXJzZSgpLi4uXG5cbiAgICAgIHNlYXJjaDogKG9iaiwga2V5KS0+XG4gICAgICAgIHJldHVybiB0cnVlIGlmIG9ialtrZXldP1xuICAgICAgICBmb3IgaywgdiBvZiBvYmpcbiAgICAgICAgICBpZiBBcnJheS50eXBlIHZcbiAgICAgICAgICAgIHJldHVybiB0cnVlIGlmIEFycmF5LnNlYXJjaCB2LCBrZXlcbiAgICAgICAgICBlbHNlIGlmIE9iamVjdC50eXBlIHZcbiAgICAgICAgICAgIHJldHVybiB0cnVlIGlmIE9iamVjdC5zZWFyY2ggdiwga2V5XG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICBzdWJ0cmFjdEtleXM6IChhLCBiKS0+XG4gICAgICAgIG8gPSBPYmplY3QubWFwS2V5cyBhICMgc2hhbGxvdyBjbG9uZVxuICAgICAgICBkZWxldGUgb1trXSBmb3IgayBvZiBiXG4gICAgICAgIG9cblxuXG4gICAgUHJvbWlzZTpcbiAgICAgIHR5cGU6ICh2KS0+IHYgaW5zdGFuY2VvZiBQcm9taXNlXG5cbiAgICAgIHRpbWVvdXQ6ICh0KS0+IG5ldyBQcm9taXNlIChyZXNvbHZlKS0+IHNldFRpbWVvdXQgcmVzb2x2ZSwgdFxuXG5cbiAgICBTdHJpbmc6XG4gICAgICB0eXBlOiAodiktPiBcInN0cmluZ1wiIGlzIHR5cGVvZiB2XG5cbiAgICAgICMgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzUyMTcxNDgwLzMxMzU3NiwgcHVibGljIGRvbWFpblxuICAgICAgaGFzaDogKHN0ciwgc2VlZCA9IDApLT5cbiAgICAgICAgcmV0dXJuIDAgdW5sZXNzIHN0cj9cbiAgICAgICAgaDEgPSAweGRlYWRiZWVmIF4gc2VlZFxuICAgICAgICBoMiA9IDB4NDFjNmNlNTcgXiBzZWVkXG4gICAgICAgIGZvciBjIGluIHN0clxuICAgICAgICAgIGNoID0gYy5jaGFyQ29kZUF0IDBcbiAgICAgICAgICBoMSA9IE1hdGguaW11bCBoMSBeIGNoLCAyNjU0NDM1NzYxXG4gICAgICAgICAgaDIgPSBNYXRoLmltdWwgaDIgXiBjaCwgMTU5NzMzNDY3N1xuICAgICAgICBoMSA9IE1hdGguaW11bChoMSBeIChoMT4+PjE2KSwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDIgXiAoaDI+Pj4xMyksIDMyNjY0ODk5MDkpXG4gICAgICAgIGgyID0gTWF0aC5pbXVsKGgyIF4gKGgyPj4+MTYpLCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMSBeIChoMT4+PjEzKSwgMzI2NjQ4OTkwOSlcbiAgICAgICAgcmV0dXJuIDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMT4+PjApXG5cbiAgICAgIHBsdXJhbGl6ZTogKGNvdW50LCBzdHJpbmcsIHN1ZmZpeCA9IFwic1wiKS0+XG4gICAgICAgIHN1ZmZpeCA9IFwiXCIgaWYgY291bnQgaXMgMVxuICAgICAgICAoc3RyaW5nICsgc3VmZml4KS5yZXBsYWNlKFwiJSVcIiwgY291bnQpXG5cbiAgICAgIHRvS2ViYWJDYXNlOiAodiktPlxuICAgICAgICB2LnJlcGxhY2UoLyhbQS1aXSkvZyxcIi0kMVwiKS50b0xvd2VyQ2FzZSgpXG5cblxuICAjIEluaXRcblxuICBmb3IgY2xhc3NOYW1lLCBjbGFzc1BhdGNoZXMgb2YgbW9ua2V5UGF0Y2hlc1xuICAgIGdsb2JhbGNsYXNzID0gZ2xvYmFsVGhpc1tjbGFzc05hbWVdXG4gICAgZm9yIGtleSwgdmFsdWUgb2YgY2xhc3NQYXRjaGVzXG4gICAgICBpZiBnbG9iYWxjbGFzc1trZXldP1xuICAgICAgICBjb25zb2xlLmxvZyBcIkNhbid0IG1vbmtleSBwYXRjaCAje2NsYXNzTmFtZX0uI3trZXl9IGJlY2F1c2UgaXQgYWxyZWFkeSBleGlzdHMuXCJcbiAgICAgIGVsc2VcbiAgICAgICAgZ2xvYmFsY2xhc3Nba2V5XSA9IHZhbHVlXG5cblxuXG4jIHN1Ym1vZHVsZS9idWNrZXQvdGVzdC5jb2ZmZWVcblRlc3RzID0gVGVzdCA9IG51bGxcblxuZG8gKCktPlxuICBjb250ZXh0ID0gbnVsbFxuXG4gIFRlc3RzID0gKG5hbWUsIHRlc3QpLT5cbiAgICBjb250ZXh0ID0gKCktPiBjb25zb2xlLmdyb3VwIFwiJWMje25hbWV9XCIsIFwiY29sb3I6IHJlZFwiOyBjb250ZXh0ID0gbnVsbFxuICAgIHRlc3QoKVxuICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuICAgIGNvbnRleHQgPSBudWxsXG5cbiAgVGVzdCA9IChuYW1lLCAuLi5zdHVmZiktPlxuXG4gICAgIyBJZiB3ZSd2ZSBiZWVuIHBhc3NlZCBhbnkgZnVuY3Rpb25zLCBydW4gdGhlbSBhbmQgY2FwdHVyZSB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICBmb3IgdGhpbmcsIGkgaW4gc3R1ZmYgd2hlbiBGdW5jdGlvbi50eXBlIHRoaW5nXG4gICAgICBzdHVmZltpXSA9IHRoaW5nKClcblxuICAgICMgSWYgdGhlcmUncyBvbmx5IG9uZSB0aGluZyBpbiBzdHVmZiwganVzdCBjb21wYXJlIGl0IHdpdGggdHJ1ZVxuICAgIGlmIHN0dWZmLmxlbmd0aCBpcyAxXG4gICAgICBzdHVmZi51bnNoaWZ0IHRydWVcblxuICAgICMgTm93LCBhbGwgdGhpbmdzIGluIHN0dWZmIG11c3QgYWxsIGJlIGVxdWl2YWxlbnQuIE9yIGVsc2UuXG4gICAgIyAoVGhpcyB0ZXN0IGZyYW1ld29yayBpcyBzdXBlciBjYXN1YWwsIHNvIHdlIGp1c3QgY2hlY2sgZWFjaCBuZWlnaGJvdXJpbmcgcGFpcilcbiAgICBmb3IgdGhpbmcsIGkgaW4gQXJyYXkuYnV0TGFzdCBzdHVmZlxuICAgICAgdW5sZXNzIEZ1bmN0aW9uLmVxdWl2YWxlbnQgdGhpbmcsIHN0dWZmW2krMV1cbiAgICAgICAgY29udGV4dD8oKVxuICAgICAgICBjb25zb2xlLmdyb3VwIFwiJWMje25hbWV9XCIsIFwiZm9udC13ZWlnaHQ6bm9ybWFsO1wiXG4gICAgICAgIGNvbnNvbGUubG9nIFwidGhpczpcIiwgdGhpbmdcbiAgICAgICAgY29uc29sZS5sb2cgXCJpc250OlwiLCBzdHVmZltpKzFdXG4gICAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuXG5cblxuIyBsaWIvZmlsZS10cmVlLmNvZmZlZVxuVGFrZSBbXCJSZWFkXCJdLCAoUmVhZCktPlxuXG4gIHNvcnQgPSAoYSwgYiktPiBhLm5hbWUubG9jYWxlQ29tcGFyZSBiLm5hbWVcblxuICBwb3B1bGF0ZVRyZWUgPSAodHJlZSktPlxuICAgIGlmIGF3YWl0IFJlYWQuZXhpc3RzIHRyZWUucGF0aFxuICAgICAgZGlyZW50cyA9IGF3YWl0IFJlYWQud2l0aEZpbGVUeXBlcyB0cmVlLnBhdGhcbiAgICAgIGRpcmVudHMuc29ydCBzb3J0XG4gICAgICB0cmVlLmNoaWxkcmVuID0gYXdhaXQgUHJvbWlzZS5hbGwgZGlyZW50cy5tYXAgKGRpcmVudCktPlxuICAgICAgICBpZiBkaXJlbnQuaXNEaXJlY3RvcnkoKVxuICAgICAgICAgIGNoaWxkVHJlZSA9IEZpbGVUcmVlLm5ld0VtcHR5IHRyZWUucGF0aCwgZGlyZW50Lm5hbWVcbiAgICAgICAgICBjaGlsZFRyZWUucmVscGF0aCA9IFJlYWQucGF0aCB0cmVlLnJlbHBhdGgsIGRpcmVudC5uYW1lXG4gICAgICAgICAgYXdhaXQgcG9wdWxhdGVUcmVlIGNoaWxkVHJlZVxuICAgICAgICAgIHRyZWUuY291bnQgKz0gY2hpbGRUcmVlLmNvdW50XG4gICAgICAgICAgY2hpbGRUcmVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0cmVlLmNvdW50ICs9IDFcbiAgICAgICAgICBwYXJ0cyA9IGRpcmVudC5uYW1lLnNwbGl0IFwiLlwiXG4gICAgICAgICAgY2hpbGRGaWxlID1cbiAgICAgICAgICAgIG5hbWU6IGRpcmVudC5uYW1lXG4gICAgICAgICAgICBiYXNlbmFtZTogQXJyYXkuYnV0TGFzdChwYXJ0cykuam9pbiBcIi5cIlxuICAgICAgICAgICAgZXh0OiBpZiBwYXJ0cy5sZW5ndGggPiAxIHRoZW4gQXJyYXkubGFzdChwYXJ0cykudG9Mb3dlckNhc2UoKSBlbHNlIG51bGxcbiAgICAgICAgICAgIHBhdGg6IFJlYWQucGF0aCB0cmVlLnBhdGgsIGRpcmVudC5uYW1lXG4gICAgICAgICAgICByZWxwYXRoOiBSZWFkLnBhdGggdHJlZS5yZWxwYXRoLCBkaXJlbnQubmFtZVxuICAgIHRyZWVcblxuICBNYWtlIFwiRmlsZVRyZWVcIiwgRmlsZVRyZWUgPVxuICAgIG5ld0VtcHR5OiAocGFyZW50UGF0aCwgbmFtZSktPlxuICAgICAgbmFtZTogbmFtZVxuICAgICAgYmFzZW5hbWU6IG5hbWVcbiAgICAgIGV4dDogbnVsbFxuICAgICAgcGF0aDogUmVhZC5wYXRoIHBhcmVudFBhdGgsIG5hbWUgIyBhYnNvbHV0ZSBwYXRoIG9uIHRoZSBsb2NhbCBIRFxuICAgICAgcmVscGF0aDogbmFtZSAjIHBhdGggcmVsYXRpdmUgdG8gdGhlIHBhcmVudCBvZiB0aGUgdHJlZSByb290XG4gICAgICBjb3VudDogMFxuICAgICAgY2hpbGRyZW46IFtdXG5cbiAgICBuZXdQb3B1bGF0ZWQ6IChwYXJlbnRQYXRoLCBuYW1lKS0+XG4gICAgICByb290ID0gRmlsZVRyZWUubmV3RW1wdHkgcGFyZW50UGF0aCwgbmFtZVxuICAgICAgYXdhaXQgcG9wdWxhdGVUcmVlIHJvb3RcbiAgICAgIHJvb3RcblxuICAgIGZsYXQ6ICh0cmVlLCBrLCBpbnRvID0gW10pLT5cbiAgICAgIGZvciBjaGlsZCBpbiB0cmVlLmNoaWxkcmVuXG4gICAgICAgIGlmIG5vdCBrPyAjIGNvbGxlY3RpbmcgY2hpbGRyZW5cbiAgICAgICAgICBpbnRvLnB1c2ggY2hpbGRcbiAgICAgICAgZWxzZSBpZiBjaGlsZFtrXT8gIyBjb2xsZWN0aW5nIGNoaWxkcmVuJ3MgcHJvcGVydGllc1xuICAgICAgICAgIGludG8ucHVzaCBjaGlsZFtrXVxuICAgICAgICBGaWxlVHJlZS5mbGF0IGNoaWxkLCBrLCBpbnRvIGlmIGNoaWxkLmNoaWxkcmVuXG4gICAgICBpbnRvXG5cbiAgICBmaW5kOiAodHJlZSwgaywgdiktPlxuICAgICAgcmV0dXJuIHRyZWUgaWYgdHJlZVtrXSBpcyB2XG4gICAgICBpZiB0cmVlLmNoaWxkcmVuXG4gICAgICAgIGZvciBjaGlsZCBpbiB0cmVlLmNoaWxkcmVuXG4gICAgICAgICAgcmV0dXJuIHJlcyBpZiByZXMgPSBGaWxlVHJlZS5maW5kIGNoaWxkLCBrLCB2XG4gICAgICBudWxsXG5cblxuXG4jIGxpYi9mcnVzdHJhdGlvbi5jb2ZmZWVcblRha2UgW10sICgpLT5cbiAgYXJyID0gW1xuICAgIFwi4oCiX+KAomAgXCIsXG4gICAgXCJg4oCiX+KAomBcIixcbiAgICBcIiBg4oCiX+KAolwiLFxuICAgIFwiICBvLm9cIixcbiAgICBcIiBvLm8gXCIsXG4gICAgXCJvLm8gIFwiLFxuICAgIFwi4oCi4oia4oCiICBcIixcbiAgICBcIiDigKLiiJrigKIgXCIsXG4gICAgXCIgIOKAouKImuKAolwiLFxuICAgIFwiICDCsGXCsFwiLFxuICAgIFwiIMKwb8KwIFwiLFxuICAgIFwiwrAzwrAgIFwiLFxuICAgIFwidl92ICBcIixcbiAgICBcIiB2X3YgXCIsXG4gICAgXCIgIHZfdlwiLFxuICAgIFwiIGDigKLPieKAolwiLFxuICAgIFwiYOKAos+J4oCiYFwiLFxuICAgIFwi4oCiz4nigKJgIFwiLFxuICAgIFwi4oCYXuKAmCAgXCIsXG4gICAgXCIgJ14nIFwiLFxuICAgIFwiICBgXmBcIixcbiAgICBcIiAgVOKInlRcIixcbiAgICBcIiBU4oieVCBcIixcbiAgICBcIlTiiJ5UICBcIixcbiAgICBcIsKhXsKhICBcIixcbiAgICBcIiDCoV7CoSBcIixcbiAgICBcIiAgwqFewqFcIixcbiAgICBcIiAgO187XCIsXG4gICAgXCIgO187IFwiLFxuICAgIFwiO187ICBcIlxuICBdXG5cbiAgTWFrZSBcIkZydXN0cmF0aW9uXCIsIChpKS0+XG4gICAgaWYgaT9cbiAgICAgIGkgJT0gYXJyLmxlbmd0aFxuICAgIGVsc2VcbiAgICAgIGkgPSBNYXRoLnJhbmQgMCwgYXJyLmxlbmd0aFxuICAgIGFycltpfDBdXG5cblxuXG4jIGxpYi9pdGVyYXRlZC5jb2ZmZWVcblRha2UgW10sICgpLT5cblxuICBNYWtlIFwiSXRlcmF0ZWRcIiwgSXRlcmF0ZWQgPSAoLi4uW3RpbWVMaW1pdCA9IDVdLCBpdGVyYXRlZEZ1bmN0aW9uKS0+XG5cbiAgICBuZXh0RnJhbWVSZXF1ZXN0ZWQgPSBmYWxzZVxuICAgIHJ1bkFnYWluTmV4dEZyYW1lID0gZmFsc2VcbiAgICBkaWRSdW5UaGlzRnJhbWUgPSBmYWxzZVxuICAgIHJhbk91dE9mVGltZSA9IGZhbHNlXG4gICAgc3RhcnRUaW1lID0gbnVsbFxuXG4gICAgcnVuID0gKCktPlxuICAgICAgIyBPbmx5IHJ1biBvbmNlIHBlciBmcmFtZS4gSWYgd2UndmUgYWxyZWFkeSBydW4sIG1hcmsgdGhhdCB3ZSB3YW50IHRvIHJ1biBhZ2FpbiBuZXh0IGZyYW1lLlxuICAgICAgcmV0dXJuIHJ1bkFnYWluTmV4dEZyYW1lID0gdHJ1ZSBpZiBkaWRSdW5UaGlzRnJhbWVcbiAgICAgIGRpZFJ1blRoaXNGcmFtZSA9IHRydWVcblxuICAgICAgIyBXaGVuZXZlciB3ZSBydW4sIHdlIG5lZWQgdG8gZG8gc29tZSBhZGRpdGlvbmFsIHdvcmsgbmV4dCBmcmFtZS5cbiAgICAgIHJlcXVlc3ROZXh0RnJhbWUoKVxuXG4gICAgICAjIERlZmVyIHRoZSBleGVjdXRpb24gb2YgdGhlIGZ1bmN0aW9uICpzbGlnaHRseSosIHRvIGltcHJvdmUgYmF0Y2hpbmcgYmVoYXZpb3VyXG4gICAgICAjIHdoZW4gYW4gaXRlcmF0ZWQgZnVuY3Rpb24gaXMgY2FsbGVkIHJlcGVhdGVkbHkgaW5zaWRlIGEgbG9vcCAoZWc6IGJ5IGxpYi9qb2IuY29mZmVlKS5cbiAgICAgIHF1ZXVlTWljcm90YXNrICgpLT5cblxuICAgICAgICAjIE5vdyB3ZSBjYW4gYWN0dWFsbHkgcnVuIHRoZSBpdGVyYXRlZCBmdW5jdGlvbiFcbiAgICAgICAgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICAgICAgaXRlcmF0ZWRGdW5jdGlvbiBtb3JlXG5cbiAgICAgICMgSXRlcmF0ZWQgZnVuY3Rpb25zIGFyZSBqdXN0IGZvciBzaWRlIGVmZmVjdHMg4oCUIGEgcmV0dXJuIHZhbHVlIGlzIG5vdCBuZWVkZWQuXG4gICAgICBudWxsXG5cblxuICAgIHJlcXVlc3ROZXh0RnJhbWUgPSAoKS0+XG4gICAgICByZXR1cm4gaWYgbmV4dEZyYW1lUmVxdWVzdGVkXG4gICAgICBuZXh0RnJhbWVSZXF1ZXN0ZWQgPSB0cnVlXG4gICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgbmV4dEZyYW1lXG5cbiAgICAjIFdoZW5ldmVyIHNvbWVvbmUgY2FsbHMgcnVuKCksIHdlICphbHdheXMqIG5lZWQgdG8gZG8gc29tZSBjbGVhbnVwIHdvcmssIGFuZCBtZSBtaWdodFxuICAgICMgYWxzbyBuZWVkIHRvIGNhbGwgcnVuKCkgYWdhaW4gb3Vyc2VsdmVzIGlmIHRoZXJlJ3MgbW9yZSBpdGVyYXRlZCB3b3JrIHRvIGJlIGRvbmUuXG4gICAgbmV4dEZyYW1lID0gKCktPlxuICAgICAgZG9SdW4gPSBydW5BZ2Fpbk5leHRGcmFtZVxuICAgICAgbmV4dEZyYW1lUmVxdWVzdGVkID0gZmFsc2VcbiAgICAgIHJ1bkFnYWluTmV4dEZyYW1lID0gZmFsc2VcbiAgICAgIGRpZFJ1blRoaXNGcmFtZSA9IGZhbHNlXG4gICAgICByYW5PdXRPZlRpbWUgPSBmYWxzZVxuICAgICAgcnVuKCkgaWYgZG9SdW5cblxuICAgICMgVGhpcyBmdW5jdGlvbiB3aWxsIHRlbGwgdGhlIGNhbGxlciB3aGV0aGVyIHRoZXkncmUgc2FmZSB0byBkbyBtb3JlIHdvcmsgdGhpcyBmcmFtZS5cbiAgICAjIFRoZXknbGwgY2FsbCBpdCByZXBlYXRlZGx5IGluIGEgbG9vcCAod2hpbGUgZG9pbmcgb3RoZXIgd29yaykgdW50aWwgZWl0aGVyIHRoZXlcbiAgICAjIHJ1biBvdXQgb2YgdGltZSBhbmQgYnJlYWsgb3V0IG9mIHRoZSBsb29wLCBvciBydW4gb3V0IG9mIHdvcmsgdG8gZG8gYW5kIGp1c3Qgc3RvcFxuICAgICMgY2FsbGluZyB1cy5cbiAgICBtb3JlID0gKGN1c3RvbUxpbWl0KS0+XG4gICAgICByYW5PdXRPZlRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0VGltZSA+IChjdXN0b21MaW1pdCBvciB0aW1lTGltaXQpXG5cbiAgICAgIGlmIHJhbk91dE9mVGltZVxuICAgICAgICAjIE1hcmsgdGhhdCB3ZSB3YW50IHRvIGFjdHVhbGx5IGRvIGEgcnVuKCkgbmV4dCBmcmFtZSwgbm90IGp1c3QgdGhlIHVzdWFsIGNsZWFudXAuXG4gICAgICAgIHJ1bkFnYWluTmV4dEZyYW1lID0gdHJ1ZVxuXG4gICAgICAgICMgV2UgYWx3YXlzIG5lZWQgdG8gcmVxdWVzdCBhIG5ldyBmcmFtZSwgc2luY2UgdGhlIGNhbGwgdG8gbW9yZSgpIG1pZ2h0IGNvbWVcbiAgICAgICAgIyBsb25nIGFmdGVyIHRoZSBsYXN0IGNhbGwgdG8gcnVuKCkgaWYgdGhlIGl0ZXJhdGVkIGZ1bmN0aW9uIGlzIGRvaW5nIHNvbWV0aGluZyBhc3luYy5cbiAgICAgICAgcmVxdWVzdE5leHRGcmFtZSgpXG5cbiAgICAgIHJldHVybiBub3QgcmFuT3V0T2ZUaW1lXG5cbiAgICByZXR1cm4gcnVuXG5cblxuXG4jIGxpYi9qb2IuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG5cbiAgaGFuZGxlcnMgPSB7fVxuICB3YXRjaGVycyA9IFtdXG4gIHJ1bm5pbmcgPSBmYWxzZVxuICBsYXN0VGltZSA9IG51bGxcbiAgbGFzdE4gPSBbXVxuXG4gIE1ha2UuYXN5bmMgXCJKb2JcIiwgSm9iID0gKHByaW9yaXR5LCB0eXBlLCAuLi5hcmdzKS0+XG4gICAgIyBQcmlvcml0eSBpcyBvcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIDBcbiAgICBpZiBTdHJpbmcudHlwZSBwcmlvcml0eVxuICAgICAgcmV0dXJuIEpvYiAwLCBwcmlvcml0eSwgdHlwZSwgLi4uYXJnc1xuXG4gICAgdGhyb3cgRXJyb3IgXCJObyBoYW5kbGVyIGZvciBqb2IgdHlwZTogI3t0eXBlfVwiIHVubGVzcyBoYW5kbGVyc1t0eXBlXT9cblxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgICBKb2IucXVldWVzW3ByaW9yaXR5XSA/PSBbXVxuICAgICAgSm9iLnF1ZXVlc1twcmlvcml0eV0ucHVzaCB7dHlwZSwgYXJncywgcmVzb2x2ZX1cbiAgICAgIEpvYi5jb3VudCsrXG4gICAgICBKb2IucnVuSm9icygpXG5cbiAgSm9iLnF1ZXVlcyA9IFtdXG4gIEpvYi5jb3VudCA9IDBcbiAgSm9iLmRlbGF5ID0gMFxuXG4gIEpvYi5oYW5kbGVyID0gKHR5cGUsIGhhbmRsZXIpLT5cbiAgICBpZiBoYW5kbGVyc1t0eXBlXSB0aGVuIHRocm93IEVycm9yIFwiQSBqb2IgaGFuZGxlciBmb3IgI3t0eXBlfSBhbHJlYWR5IGV4aXN0c1wiXG4gICAgaGFuZGxlcnNbdHlwZV0gPSBoYW5kbGVyXG5cbiAgSm9iLndhdGNoZXIgPSAod2F0Y2hlciktPlxuICAgIHdhdGNoZXJzLnB1c2ggd2F0Y2hlclxuXG4gIEpvYi5ydW5Kb2JzID0gKCktPlxuICAgIHJldHVybiBpZiBydW5uaW5nXG4gICAgcnVubmluZyA9IHRydWVcbiAgICBsYXN0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXG4gICAgSm9iLmRlbGF5ID0gMTZcbiAgICB1cGRhdGVXYXRjaGVycygpXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHJ1blxuXG4gIHJ1biA9ICgpLT5cbiAgICBkaXJ0eSA9IGZhbHNlXG4gICAgZm9yIHF1ZXVlLCBwcmlvcml0eSBpbiBKb2IucXVldWVzIGJ5IC0xXG4gICAgICB3aGlsZSBxdWV1ZT8ubGVuZ3RoID4gMFxuICAgICAgICBkaXJ0eSA9IHRydWVcbiAgICAgICAge3RpbWUsIHR5cGUsIGFyZ3MsIHJlc29sdmV9ID0gcXVldWUuc2hpZnQoKVxuICAgICAgICBKb2IuY291bnQtLVxuICAgICAgICByZXNvbHZlIGhhbmRsZXJzW3R5cGVdIC4uLmFyZ3MgIyBXZSBjYW4ndCBhd2FpdCwgb3IgZWxzZSBpZiBhIEpvYiBjcmVhdGVzIGEgbmV3IEpvYiBpbnNpZGUgaXRzZWxmLCB3ZSdsbCBnZXQgc3R1Y2tcbiAgICAgICAgSm9iLmRlbGF5ID0gKHBlcmZvcm1hbmNlLm5vdygpIC0gbGFzdFRpbWUpICogMC4xICsgSm9iLmRlbGF5ICogMC45XG4gICAgICAgIHJldHVybiBiYWlsKCkgaWYgSm9iLmRlbGF5ID4gMzAgIyBEb24ndCBsZXQgdGhlIGZyYW1lIHJhdGUgY3JhdGVyXG4gICAgcnVubmluZyA9IGZhbHNlXG4gICAgIyBJZiBhbnkgam9icyByYW4gdGhpcyBmcmFtZSwgd2Ugc2hvdWxkIHJ1biBhdCBsZWFzdCBvbmUgbW9yZSB0aW1lLCBpbiBjYXNlIGFueSBqb2JzIHRoYXQgd2UgcmFuIGNyZWF0ZWQgbmV3IGpvYnMgYXQgYSBoaWdoZXIgcHJpb3JpdHkuXG4gICAgSm9iLnJ1bkpvYnMoKSBpZiBkaXJ0eVxuICAgIHVwZGF0ZVdhdGNoZXJzKClcblxuICBiYWlsID0gKCktPlxuICAgIGxhc3RUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcnVuXG4gICAgdXBkYXRlV2F0Y2hlcnMoKVxuXG4gIHVwZGF0ZVdhdGNoZXJzID0gKCktPlxuICAgIGZvciB3YXRjaGVyIGluIHdhdGNoZXJzXG4gICAgICB3YXRjaGVyIEpvYi5jb3VudCwgSm9iLmRlbGF5XG4gICAgbnVsbFxuXG5cblxuIyBsaWIvbG9nLWluaXRpYWxpemF0aW9uLXRpbWUuY29mZmVlXG5kbyAoKS0+XG4gIHsgcGVyZm9ybWFuY2UgfSA9IHJlcXVpcmUgXCJwZXJmX2hvb2tzXCIgdW5sZXNzIHBlcmZvcm1hbmNlP1xuXG4gIHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKVxuXG4gIExvZyA9IGF3YWl0IFRha2UuYXN5bmMgXCJMb2dcIlxuXG4gIExvZyBcIkluaXRpYWxpemF0aW9uIFRpbWVcIiwgbnVsbCwgdGltZVxuXG5cblxuIyBsaWIvbG9nLmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuICB7IHBlcmZvcm1hbmNlIH0gPSByZXF1aXJlIFwicGVyZl9ob29rc1wiIHVubGVzcyBwZXJmb3JtYW5jZT9cblxuICAjIFdlIGNhbid0IC8gc2hvdWxkbid0IFRha2UgYW55dGhpbmcsIHNpbmNlIExvZyBtaWdodCBuZWVkIHRvIGJlIHVzZWQgKmFueXdoZXJlKlxuICBEQiA9IEVudiA9IElQQyA9IFByaW50ZXIgPSBudWxsXG5cbiAgTWFrZS5hc3luYyBcIkxvZ1wiLCBMb2cgPSAobXNnLCBhdHRycywgdGltZSktPlxuICAgIEVudiA/PSBUYWtlIFwiRW52XCJcblxuICAgICMgU2VuZCBsb2dzIHRvIHRoZSBsb2NhbCBwcmludGVyXG4gICAgaWYgUHJpbnRlciA/PSBUYWtlIFwiUHJpbnRlclwiXG4gICAgICBQcmludGVyIG1zZywgYXR0cnMsIHRpbWVcblxuICAgICMgSWYgd2UgaGF2ZSBhIHBvcnQgdG8gdGhlIERCLCBzZW5kIGxvZ3MgdG8gdGhlIERCIFByaW50ZXJcbiAgICBpZiBEQiA/PSBUYWtlIFwiREJcIlxuICAgICAgREIuc2VuZCBcInByaW50ZXJcIiwgbXNnLCBhdHRycywgdGltZVxuXG4gICAgIyBJZiB3ZSdyZSBpbiBkZXYsIGFuZCBpbiBhIHJlbmRlciBwcm9jZXNzLCBzZW5kIGxvZ3MgdG8gdGhlIG1haW4gcHJvY2VzcyBQcmludGVyXG4gICAgaWYgRW52Py5pc0RldiBhbmQgRW52Py5pc1JlbmRlciBhbmQgSVBDID89IFRha2UgXCJJUENcIlxuICAgICAgSVBDLnNlbmQgXCJwcmludGVyXCIsIG1zZywgYXR0cnMsIHRpbWVcblxuICAgIHJldHVybiBtc2dcblxuICBMb2cudGltZSA9IChtc2csIGZuKS0+XG4gICAgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgIHYgPSBmbigpXG4gICAgTG9nLnRpbWUuZm9ybWF0dGVkIG1zZywgcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFxuICAgIHJldHVybiB2XG5cbiAgTG9nLnRpbWUuYXN5bmMgPSAobXNnLCBmbiktPlxuICAgIHN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICB2ID0gYXdhaXQgZm4oKVxuICAgIExvZy50aW1lLmZvcm1hdHRlZCBtc2csIHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRcbiAgICByZXR1cm4gdlxuXG4gIExvZy50aW1lLmN1c3RvbSA9IChwcmVNc2cpLT5cbiAgICBMb2cgcHJlTXNnIGlmIHByZU1zZ1xuICAgIHN0YXJ0ID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICAocG9zdE1zZyktPiBMb2cudGltZS5mb3JtYXR0ZWQgcG9zdE1zZywgcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFxuXG4gIExvZy50aW1lLmZvcm1hdHRlZCA9IChtc2csIHRpbWUpLT5cbiAgICBMb2cgdGltZS50b0ZpeGVkKDEpLnBhZFN0YXJ0KDYpICsgXCIgXCIgKyBtc2dcblxuICBMb2cuZXJyID0gKG1zZyktPlxuICAgIExvZyBtc2csIGNvbG9yOiBcIiNGMDBcIlxuXG5cblxuIyBsaWIvcGF0aHMuY29mZmVlXG5UYWtlIFtcIlJlYWRcIl0sIChSZWFkKS0+XG5cbiAgTWFrZSBcIlBhdGhzXCIsIFBhdGhzID1cbiAgICBmaWxlczogKGFzc2V0KS0+ICAgICAgICAgICAgICAgUmVhZC5wYXRoIGFzc2V0LnBhdGgsIFwiRmlsZXNcIlxuICAgIG5hbWVzOiAoYXNzZXQpLT4gICAgICAgICAgICAgICBSZWFkLnBhdGggYXNzZXQucGF0aCwgXCJOYW1lXCJcbiAgICBzaG90czogKGFzc2V0KS0+ICAgICAgICAgICAgICAgUmVhZC5wYXRoIGFzc2V0LnBhdGgsIFwiU2hvdFwiXG4gICAgbmV3U2hvdHM6IChhc3NldCktPiAgICAgICAgICAgIFJlYWQucGF0aCBhc3NldC5wYXRoLCBcIlNob3QgKE5ldylcIlxuICAgIHRhZ3M6IChhc3NldCktPiAgICAgICAgICAgICAgICBSZWFkLnBhdGggYXNzZXQucGF0aCwgXCJUYWdzXCJcbiAgICB0aHVtYm5haWxzOiAoYXNzZXQpLT4gICAgICAgICAgUmVhZC5wYXRoIGFzc2V0LnBhdGgsIFwiVGh1bWJuYWlsIENhY2hlXCJcblxuICAgIGZpbGU6IChhc3NldCwgZmlsZW5hbWUpLT4gICAgICBSZWFkLnBhdGggUGF0aHMuZmlsZXMoYXNzZXQpLCBmaWxlbmFtZVxuICAgIG5hbWU6IChhc3NldCktPiAgICAgICAgICAgICAgICBSZWFkLnBhdGggUGF0aHMubmFtZXMoYXNzZXQpLCBhc3NldC5uYW1lXG4gICAgc2hvdDogKGFzc2V0KS0+ICAgICAgICAgICAgICAgIFJlYWQucGF0aCBQYXRocy5zaG90cyhhc3NldCksIGFzc2V0LnNob3RcbiAgICBuZXdTaG90OiAoYXNzZXQpLT4gICAgICAgICAgICAgUmVhZC5wYXRoIFBhdGhzLm5ld1Nob3RzKGFzc2V0KSwgYXNzZXQubmV3U2hvdFxuICAgIHRodW1ibmFpbDogKGFzc2V0LCBmaWxlbmFtZSktPiBSZWFkLnBhdGggUGF0aHMudGh1bWJuYWlscyhhc3NldCksIGZpbGVuYW1lXG4gICAgdGFnOiAoYXNzZXQsIHRhZyktPiAgICAgICAgICAgIFJlYWQucGF0aCBQYXRocy50YWdzKGFzc2V0KSwgdGFnXG5cbiAgICB0aHVtYm5haWxOYW1lOiAoZmlsZSwgc2l6ZSktPiAgXCIje1N0cmluZy5oYXNoIGZpbGUucmVscGF0aH0tI3tzaXplfS5qcGdcIlxuXG4gICAgZXh0OlxuICAgICAgaWNvbjoge1wiYXNcIiwgXCJjcHR4XCIsIFwiY3NzXCIsIFwiZHdnXCIsIFwiZXhlXCIsIFwiZmxhXCIsIFwiaWRsa1wiLCBcImluZGJcIiwgXCJpbmRkXCIsIFwic3dmXCIsIG51bGw6dHJ1ZSwgdW5kZWZpbmVkOnRydWV9ICMgSW5jbHVkZSBudWxsIC8gdW5kZWZpbmVkIGJlY2F1c2Ugd2Ugd2FudCB0aG9zZSB0byBnZXQgYW4gaWNvbiwgbm90IGEgdGh1bWJuYWlsXG4gICAgICBzaXBzOiB7XCIzZnJcIixcImFyd1wiLFwiYXN0Y1wiLFwiYXZjaVwiLFwiYm1wXCIsXCJjcjJcIixcImNyM1wiLFwiY3J3XCIsXCJkY3JcIixcImRkc1wiLFwiZG5nXCIsXCJkeG9cIixcImVyZlwiLFwiZXhyXCIsXCJmZmZcIixcImdpZlwiLFwiaGVpY1wiLFwiaGVpY3NcIixcImhlaWZcIixcImljbnNcIixcImljb1wiLFwiaWlxXCIsXCJqcDJcIixcImpwZWdcIixcImpwZ1wiLFwia3R4XCIsXCJtb3NcIixcIm1wb1wiLFwibXJ3XCIsXCJuZWZcIixcIm5yd1wiLFwib3JmXCIsXCJvcmZcIixcIm9yZlwiLFwicGJtXCIsXCJwZGZcIixcInBlZlwiLFwicGljXCIsXCJwaWN0XCIsXCJwbmdcIixcInBzZFwiLFwicHZyXCIsXCJyYWZcIixcInJhd1wiLFwicncyXCIsXCJyd2xcIixcInNnaVwiLFwic3IyXCIsXCJzcmZcIixcInNyd1wiLFwidGdhXCIsXCJ0aWZmXCIsXCJ3ZWJwXCJ9XG4gICAgICB2aWRlbzoge1wiYXZjaGRcIiwgXCJhdmlcIiwgXCJtNHBcIiwgXCJtNHZcIiwgXCJtb3ZcIiwgXCJtcDJcIiwgXCJtcDRcIiwgXCJtcGVcIiwgXCJtcGVnXCIsIFwibXBnXCIsIFwibXB2XCIsIFwib2dnXCIsIFwicXRcIiwgXCJ3ZWJtXCIsIFwid212XCJ9XG5cblxuXG4jIGxpYi9wcmludGVyLmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuICByZXR1cm4gaWYgd2luZG93Py5pc0RCICMgREIgaGFzIGl0cyBvd24gUHJpbnRlclxuXG4gIHsgcGVyZm9ybWFuY2UgfSA9IHJlcXVpcmUgXCJwZXJmX2hvb2tzXCIgdW5sZXNzIHBlcmZvcm1hbmNlP1xuXG4gIE1ha2UgXCJQcmludGVyXCIsIFByaW50ZXIgPSAobXNnLCBhdHRycywgdGltZSktPlxuICAgIHRpbWUgPSAodGltZSBvciBwZXJmb3JtYW5jZS5ub3coKSkudG9GaXhlZCgwKS5wYWRTdGFydCg1KVxuICAgIGNvbnNvbGUubG9nIHRpbWUgKyBcIiAgXCIgKyBtc2dcblxuXG5cbiMgbGliL3B1Yi1zdWIuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG5cbiAgc3VicyA9IHt9XG5cbiAgU3ViID0gKG5hbWUsIGNiKS0+XG4gICAgKHN1YnNbbmFtZV0gPz0gW10pLnB1c2ggY2JcblxuICBQdWIgPSAobmFtZSwgYXJncy4uLiktPlxuICAgIGlmIHN1YnNbbmFtZV0/XG4gICAgICBmb3IgaGFuZGxlciBpbiBzdWJzW25hbWVdXG4gICAgICAgIGhhbmRsZXIgYXJncy4uLlxuICAgIG51bGxcblxuICBNYWtlIFwiUHViU3ViXCIsIHtQdWIsIFN1Yn1cblxuXG5cbiMgbGliL3JlYWQuY29mZmVlXG4jIFRPRE86IENsZWFyIHVwIHRoZSBuYW1pbmcgc28gdGhhdCBldmVyeXRoaW5nIGlzIGV4cGxpY2l0bHkgUmVhZC5zeW5jLmZvbyBvciBSZWFkLmFzeW5jLmZvb1xuXG5UYWtlIFtdLCAoKS0+XG4gIGZzID0gcmVxdWlyZSBcImZzXCJcbiAgcGF0aCA9IHJlcXVpcmUgXCJwYXRoXCJcblxuICB2YWxpZEZpbGVOYW1lID0gKHYpLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgMCBpcyB2LmluZGV4T2YgXCIuXCIgIyBFeGNsdWRlIGRvdGZpbGVzXG4gICAgcmV0dXJuIGZhbHNlIGlmIC0xIGlzbnQgdi5zZWFyY2ggL1s8Pjo7LD9cIip8L1xcXFxdLyAjIEV4Y2x1ZGUgbmFtZXMgd2Ugd29uJ3QgYmUgYWJsZSB0byByb3VuZHRyaXBcbiAgICByZXR1cm4gdHJ1ZSAjIEV2ZXJ5dGhpbmcgZWxzZSBpcyBnb29kXG5cbiAgdmFsaWREaXJlbnROYW1lID0gKHYpLT5cbiAgICB2YWxpZEZpbGVOYW1lIHYubmFtZVxuXG4gIGZpbHRlclZhbGlkRGlyZW50TmFtZSA9ICh2cyktPlxuICAgIHZzLmZpbHRlciB2YWxpZERpcmVudE5hbWVcblxuICBSZWFkID0gKGZvbGRlclBhdGgpLT5cbiAgICB0cnlcbiAgICAgIGZpbGVOYW1lcyA9IGZzLnJlYWRkaXJTeW5jIGZvbGRlclBhdGhcbiAgICAgIGZpbGVOYW1lcy5maWx0ZXIgdmFsaWRGaWxlTmFtZVxuICAgIGNhdGNoXG4gICAgICBudWxsXG5cbiAgIyBUZW1wb3JhcnkgaGFjayB1bnRpbCB3ZSBmdWxseSBzd2l0Y2ggUmVhZCBvdmVyIHRvIHNwbGl0IHN5bmMgYW5kIGFzeW5jLlxuICAjIE5vdGUgdGhhdCB3ZSBjYW4ndCBqdXN0IHNheSBSZWFkLnN5bmMgPSBSZWFkLCBvciB0aGF0IGJyZWFrcyBSZWFkLnN5bmMuZXhpc3RzIVxuICBSZWFkLnN5bmMgPSAocCktPiBSZWFkIHBcblxuICBSZWFkLnN5bmMuZXhpc3RzID0gKHBhdGgpLT5cbiAgICBmcy5leGlzdHNTeW5jIHBhdGhcblxuICBSZWFkLmFzeW5jID0gKGZvbGRlclBhdGgpLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPlxuICAgICAgZnMucmVhZGRpciBmb2xkZXJQYXRoLCAoZXJyLCBmaWxlTmFtZXMpLT5cbiAgICAgICAgaWYgZXJyP1xuICAgICAgICAgIHJlc29sdmUgbnVsbFxuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVzb2x2ZSBmaWxlTmFtZXMuZmlsdGVyIHZhbGlkRmlsZU5hbWVcblxuICBSZWFkLndpdGhGaWxlVHlwZXMgPSAoZm9sZGVyUGF0aCktPlxuICAgIGZzLnByb21pc2VzLnJlYWRkaXIgZm9sZGVyUGF0aCwge3dpdGhGaWxlVHlwZXM6dHJ1ZX1cbiAgICAudGhlbiBmaWx0ZXJWYWxpZERpcmVudE5hbWVcblxuICBSZWFkLmlzRm9sZGVyID0gKGZvbGRlclBhdGgpLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGZvbGRlclBhdGg/Lmxlbmd0aFxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgICBmcy5zdGF0IGZvbGRlclBhdGgsIChlcnIsIHN0YXQpLT5cbiAgICAgICAgcmVzb2x2ZSBzdGF0Py5pc0RpcmVjdG9yeSgpXG5cbiAgUmVhZC5zdGF0ID0gKHBhdGgpLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPlxuICAgICAgZnMuc3RhdCBwYXRoLCAoZXJyLCBzdGF0KS0+XG4gICAgICAgIHJlc29sdmUgc3RhdFxuXG4gIFJlYWQuZXhpc3RzID0gKGZpbGVQYXRoKS0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBmaWxlUGF0aD8ubGVuZ3RoXG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgIGZzLmFjY2VzcyBmaWxlUGF0aCwgKGVyciktPlxuICAgICAgICByZXNvbHZlIG5vdCBlcnI/XG5cbiAgUmVhZC5maWxlID0gKGZpbGVQYXRoKS0+XG4gICAgdHJ5XG4gICAgICBmaWxlID0gZnMucmVhZEZpbGVTeW5jIGZpbGVQYXRoXG4gICAgY2F0Y2hcbiAgICAgIG51bGxcblxuICBSZWFkLnNlcCA9IHBhdGguc2VwXG4gIFJlYWQud2F0Y2ggPSBmcy53YXRjaFxuXG4gIFJlYWQucGF0aCA9ICguLi5zZWdzKS0+IHNlZ3Muam9pbiBwYXRoLnNlcFxuICBSZWFkLnNwbGl0ID0gKHApLT4gQXJyYXkucHVsbCBwLnNwbGl0KHBhdGguc2VwKSwgXCJcIlxuICBSZWFkLmxhc3QgPSAocCktPiBBcnJheS5sYXN0IFJlYWQuc3BsaXQgcFxuICBSZWFkLnBhcmVudFBhdGggPSAocCktPiBSZWFkLnBhdGggLi4uQXJyYXkuYnV0TGFzdCBSZWFkLnNwbGl0IHBcblxuICBNYWtlIFwiUmVhZFwiLCBSZWFkXG5cblxuXG4jIGxpYi9zaXplLW9uLWRpc2suY29mZmVlXG5UYWtlIFtcIlJlYWRcIl0sIChSZWFkKS0+XG5cbiAgTWFrZS5hc3luYyBcIlNpemVPbkRpc2tcIiwgU2l6ZU9uRGlzayA9IChwYXRoKS0+XG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgIHN0YXRzID0gYXdhaXQgUmVhZC5zdGF0IHBhdGhcbiAgICAgIGlmIG5vdCBzdGF0cz9cbiAgICAgICAgcmVzb2x2ZSAwXG4gICAgICBlbHNlIGlmIG5vdCBzdGF0cy5pc0RpcmVjdG9yeSgpXG4gICAgICAgIHJlc29sdmUgc3RhdHMuc2l6ZVxuICAgICAgZWxzZVxuICAgICAgICB0b3RhbCA9IDBcbiAgICAgICAgY2hpbGRyZW4gPSBhd2FpdCBSZWFkLmFzeW5jIHBhdGhcbiAgICAgICAgc2l6ZXMgPSBmb3IgY2hpbGROYW1lIGluIGNoaWxkcmVuXG4gICAgICAgICAgU2l6ZU9uRGlzayBSZWFkLnBhdGggcGF0aCwgY2hpbGROYW1lXG4gICAgICAgIGZvciBzaXplIGluIHNpemVzXG4gICAgICAgICAgdG90YWwgKz0gYXdhaXQgc2l6ZVxuICAgICAgICByZXNvbHZlIHRvdGFsXG5cbiAgU2l6ZU9uRGlzay5wcmV0dHkgPSAocGF0aCktPlxuICAgIHNpemUgPSBhd2FpdCBTaXplT25EaXNrIHBhdGhcbiAgICBsZW4gPSBzaXplLnRvU3RyaW5nKCkubGVuZ3RoXG5cbiAgICBzd2l0Y2hcbiAgICAgIHdoZW4gbGVuIDwgM1xuICAgICAgICBzdWZmaXggPSBcIkJcIlxuICAgICAgICBleHAgPSAwXG4gICAgICB3aGVuIGxlbiA8IDdcbiAgICAgICAgc3VmZml4ID0gXCJLQlwiXG4gICAgICAgIGV4cCA9IDFcbiAgICAgIHdoZW4gbGVuIDwgMTFcbiAgICAgICAgc3VmZml4ID0gXCJNQlwiXG4gICAgICAgIGV4cCA9IDJcbiAgICAgIGVsc2VcbiAgICAgICAgc3VmZml4ID0gXCJHQlwiXG4gICAgICAgIGV4cCA9IDNcblxuICAgIChzaXplIC8gTWF0aC5wb3coMTAwMCwgZXhwKSkudG9GaXhlZCgxKSArIFwiIFwiICsgc3VmZml4XG5cblxuXG4jIGxpYi9zdGF0ZS5jb2ZmZWVcblRha2UgW10sICgpLT5cblxuICBzdGF0ZSA9IHt9XG4gIHN1YnNjcmlwdGlvbnMgPSB7X2NiczpbXX1cblxuICBnZXRBdCA9IChub2RlLCBwYXRoKS0+XG4gICAgcmV0dXJuIFt7XCJcIjpub2RlfSwgXCJcIl0gaWYgcGF0aCBpcyBcIlwiXG4gICAgcGFydHMgPSBwYXRoLnNwbGl0IFwiLlwiXG4gICAgayA9IHBhcnRzLnBvcCgpXG4gICAgZm9yIHBhcnQgaW4gcGFydHNcbiAgICAgIG5vZGUgPSBub2RlW3BhcnRdID89IHt9XG4gICAgW25vZGUsIGtdXG5cblxuICBNYWtlLmFzeW5jIFwiU3RhdGVcIiwgU3RhdGUgPSAocGF0aCA9IFwiXCIsIHYsIHtpbW11dGFibGUgPSBmYWxzZX0gPSB7fSktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN0YXRlLCBwYXRoXG5cbiAgICByZXR1cm4gbm9kZVtrXSBpZiB2IGlzIHVuZGVmaW5lZCAjIEp1c3QgYSByZWFkXG5cbiAgICAjIEl0J3Mgbm90IHNhZmUgdG8gdGFrZSBzb21ldGhpbmcgb3V0IG9mIFN0YXRlLCBtdXRhdGUgaXQsIGFuZCBjb21taXQgaXQgYWdhaW4uXG4gICAgIyBUaGUgaW1tdXRhYmxlIG9wdGlvbiB0ZWxscyB1cyB0aGUgY2FsbGVyIHByb21pc2VzIHRoZXkncmUgbm90IGRvaW5nIHRoYXQuXG4gICAgIyBPdGhlcndpc2UsIHdlIGNsb25lIHZhbHVlcyBiZWZvcmUgcmVhZGluZyBvciB3cml0aW5nIHRoZW0uXG4gICAgdiA9IEZ1bmN0aW9uLmNsb25lIHYgdW5sZXNzIGltbXV0YWJsZVxuXG4gICAgaWYgbm90IGltbXV0YWJsZSBhbmQgdiBpcyBub2RlW2tdIGFuZCAoT2JqZWN0LnR5cGUodikgb3IgQXJyYXkudHlwZSh2KSlcbiAgICAgIHRocm93IFwiRGlkIHlvdSB0YWtlIHNvbWV0aGluZyBvdXQgb2YgU3RhdGUsIG11dGF0ZSBpdCwgYW5kIGNvbW1pdCBpdCBhZ2Fpbj9cIlxuXG4gICAgdGhyb3cgRXJyb3IgXCJZb3UncmUgbm90IGFsbG93ZWQgdG8gc2V0IHRoZSBTdGF0ZSByb290XCIgaWYgcGF0aCBpcyBcIlwiXG5cbiAgICBvbGQgPSBub2RlW2tdXG5cbiAgICBpZiB2PyB0aGVuIG5vZGVba10gPSB2IGVsc2UgZGVsZXRlIG5vZGVba11cblxuICAgIGlmIEZ1bmN0aW9uLm5vdEVxdWl2YWxlbnQgdiwgb2xkXG4gICAgICBxdWV1ZU1pY3JvdGFzayAoKS0+XG4gICAgICAgIGxvY2FsTm90aWZ5IHBhdGgsIHZcblxuICAgIHJldHVybiB2XG5cbiAgY29uZGl0aW9uYWxTZXQgPSAocGF0aCwgdiwgcHJlZCktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN0YXRlLCBwYXRoXG4gICAgZG9TZXQgPSBwcmVkIG5vZGVba10sIHZcbiAgICBTdGF0ZSBwYXRoLCB2IGlmIGRvU2V0XG4gICAgcmV0dXJuIGRvU2V0XG5cbiAgIyBUaGVzZSBhcmUgdXNlZnVsIGJlY2F1c2UgdGhleSByZXR1cm4gdHJ1ZSBpZiBhIGNoYW5nZSB3YXMgbWFkZVxuICBTdGF0ZS5jaGFuZ2UgPSAocGF0aCwgdiktPiBjb25kaXRpb25hbFNldCBwYXRoLCB2LCBGdW5jdGlvbi5ub3RFcXVpdmFsZW50XG4gIFN0YXRlLmRlZmF1bHQgPSAocGF0aCwgdiktPiBjb25kaXRpb25hbFNldCBwYXRoLCB2LCBGdW5jdGlvbi5ub3RFeGlzdHNcblxuICAjIFRoaXMgaXMgdXNlZnVsIGJlY2F1c2UgaXQgcmVkdWNlcyB0aGUgbmVlZCB0byB1cGRhdGUgU3RhdGUgaW4gYSBsb29wLFxuICAjIHdoaWNoIHRyaWdnZXJzIGEgbG90IG9mIChwb3NzaWJseSBwb2ludGxlc3MpIG5vdGlmaWNhdGlvbnMuXG4gICMgUmVtaW5kZXIgdGhhdCBPYmplY3QubWVyZ2UgZG9lc24ndCBoYW5kbGUgYXJyYXlzLCBzbyBtYXliZVxuICAjIGxpbWl0IHRoZSB1c2Ugb2YgdGhpcyBmdW5jdGlvbiB0byBwcmltaXRpdmVzIChzaW5jZSBpdCBpbXBsaWVzIGltbXV0YWJsZSkuXG4gIFN0YXRlLm1lcmdlID0gKHBhdGgsIHYpLT4gU3RhdGUgcGF0aCwgKE9iamVjdC5tZXJnZSB2LCBTdGF0ZSBwYXRoKSwgaW1tdXRhYmxlOiB0cnVlXG5cbiAgIyBUaGVzZSBhcmUgdXNlZnVsIGJlY2F1c2UgaXQgb2ZmZXJzIGEgbmljZSBzeW50YXggZm9yIHVwZGF0aW5nIGV4aXN0aW5nIHZhbHVlcyBpbiBTdGF0ZSxcbiAgIyB3aXRoIHN1cHBvcnQgZm9yIGFzeW5jLCBlaXRoZXIgbXV0YWJseSBvciBpbW11dGFibHkuXG4gIFN0YXRlLnVwZGF0ZSA9IChwYXRoLCBmbiktPiBTdGF0ZSBwYXRoLCAoYXdhaXQgZm4gU3RhdGUgcGF0aCksIGltbXV0YWJsZTogdHJ1ZVxuICBTdGF0ZS5tdXRhdGUgPSAocGF0aCwgZm4pLT4gU3RhdGUuY2xvbmUgcGF0aCwgKGF3YWl0IGZuIFN0YXRlIHBhdGgpLCBpbW11dGFibGU6IHRydWVcblxuICAjIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgcmVhZGluZyBzb21ldGhpbmcgZnJvbSBTdGF0ZSB0aGF0IGlzIHByZS1jbG9uZWRcbiAgIyAoaWYgbmVjZXNzYXJ5KSB0byBhdm9pZCBtdXRhYmlsaXR5IGlzc3Vlcy5cbiAgU3RhdGUuY2xvbmUgPSAocGF0aCktPiBGdW5jdGlvbi5jbG9uZSBTdGF0ZSBwYXRoXG5cbiAgU3RhdGUuc3Vic2NyaWJlID0gKC4uLltwYXRoID0gXCJcIiwgcnVuTm93ID0gdHJ1ZSwgd2VhayA9IGZhbHNlXSwgY2IpLT5cbiAgICB0aHJvdyBcIkludmFsaWQgc3Vic2NyaWJlIHBhdGhcIiB1bmxlc3MgU3RyaW5nLnR5cGUgcGF0aCAjIEF2b2lkIGVycm9ycyBpZiB5b3UgdHJ5IHNheSBzdWJzY3JpYmUocnVuTm93LCBjYilcbiAgICBbbm9kZSwga10gPSBnZXRBdCBzdWJzY3JpcHRpb25zLCBwYXRoXG4gICAgKChub2RlW2tdID89IHt9KS5fY2JzID89IFtdKS5wdXNoIGNiXG4gICAgY2IuX3N0YXRlX3dlYWsgPSB3ZWFrICMgLi4uIHRoaXMgaXMgZmluZSDwn5CV4piV77iP8J+UpVxuICAgIGNiIFN0YXRlIHBhdGggaWYgcnVuTm93XG5cbiAgU3RhdGUudW5zdWJzY3JpYmUgPSAoLi4uW3BhdGggPSBcIlwiXSwgY2IpLT5cbiAgICBbbm9kZSwga10gPSBnZXRBdCBzdWJzY3JpcHRpb25zLCBwYXRoXG4gICAgdGhyb3cgRXJyb3IgXCJVbnN1YnNjcmliZSBmYWlsZWRcIiB1bmxlc3MgY2IgaW4gbm9kZVtrXS5fY2JzXG4gICAgQXJyYXkucHVsbCBub2RlW2tdLl9jYnMsIGNiXG4gICAgbnVsbFxuXG4gIGxvY2FsTm90aWZ5ID0gKHBhdGgsIHYpLT5cbiAgICBbbm9kZSwga10gPSBnZXRBdCBzdWJzY3JpcHRpb25zLCBwYXRoXG4gICAgcnVuQ2JzV2l0aGluIG5vZGVba10sIHZcbiAgICBydW5DYnMgbm9kZVtrXSwgdiwgdlxuICAgIGNoYW5nZXMgPSBydW5DYnNBYm92ZSBwYXRoLCB2XG4gICAgcnVuQ2JzIHN1YnNjcmlwdGlvbnMsIHN0YXRlLCBjaGFuZ2VzXG5cbiAgcnVuQ2JzV2l0aGluID0gKHBhcmVudCwgdiktPlxuICAgIHJldHVybiB1bmxlc3MgT2JqZWN0LnR5cGUgcGFyZW50XG4gICAgZm9yIGssIGNoaWxkIG9mIHBhcmVudCB3aGVuIGsgaXNudCBcIl9jYnNcIlxuICAgICAgX3YgPSB2P1trXVxuICAgICAgcnVuQ2JzV2l0aGluIGNoaWxkLCBfdlxuICAgICAgcnVuQ2JzIGNoaWxkLCBfdiwgX3ZcbiAgICBudWxsXG5cbiAgcnVuQ2JzQWJvdmUgPSAocGF0aCwgY2hhbmdlcyktPlxuICAgIHBhcnRzID0gcGF0aC5zcGxpdCBcIi5cIlxuICAgIHAgPSBwYXJ0cy5wb3AoKVxuICAgIGNoYW5nZXNBYm92ZSA9IHt9XG4gICAgY2hhbmdlc0Fib3ZlW3BdID0gY2hhbmdlc1xuICAgIHJldHVybiBjaGFuZ2VzQWJvdmUgdW5sZXNzIHBhcnRzLmxlbmd0aCA+IDBcbiAgICBwYXRoQWJvdmUgPSBwYXJ0cy5qb2luIFwiLlwiXG4gICAgW25vZGUsIGtdID0gZ2V0QXQgc3Vic2NyaXB0aW9ucywgcGF0aEFib3ZlXG4gICAgcnVuQ2JzIG5vZGVba10sIFN0YXRlKHBhdGhBYm92ZSksIGNoYW5nZXNBYm92ZVxuICAgIHJ1bkNic0Fib3ZlIHBhdGhBYm92ZSwgY2hhbmdlc0Fib3ZlXG5cbiAgcnVuQ2JzID0gKG5vZGUsIHYsIGNoYW5nZWQpLT5cbiAgICBpZiBub2RlPy5fY2JzXG4gICAgICBkZWFkID0gW11cbiAgICAgIGZvciBjYiBpbiBub2RlLl9jYnNcbiAgICAgICAgaWYgY2IuX3N0YXRlX3dlYWsgYW5kIG5vdCB2P1xuICAgICAgICAgIGRlYWQucHVzaCBjYlxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2IgdiwgY2hhbmdlZFxuICAgICAgQXJyYXkucHVsbCBub2RlLl9jYnMsIGNiIGZvciBjYiBpbiBkZWFkXG4gICAgbnVsbFxuXG5cblxuIyBsaWIvd3JpdGUuY29mZmVlXG5UYWtlIFtcIkVudlwiLCBcIkxvZ1wiLCBcIlJlYWRcIl0sIChFbnYsIExvZywgUmVhZCktPlxuICBmcyA9IHJlcXVpcmUgXCJmc1wiXG5cbiAgdmFsaWRQYXRoID0gKHYpLT5cbiAgICB2YWxpZCA9IHRydWVcbiAgICB2ID0gdi5yZXBsYWNlIC9eXFxcXCpbQS1aXTovLCBcIlwiICMgSWdub3JlIHRoZSBkcml2ZSBsZXR0ZXIgb24gV2luZG93c1xuICAgIHZhbGlkID0gZmFsc2UgaWYgLTEgaXNudCB2LnNlYXJjaCAvWzw+OjssP1wiKnxdLyAjIEV4Y2x1ZGUgbmFtZXMgd2Ugd29uJ3QgYmUgYWJsZSB0byByb3VuZHRyaXBcbiAgICB2YWxpZCA9IGZhbHNlIGlmIHYubGVuZ3RoIDw9IDFcbiAgICBpZiBub3QgdmFsaWQgdGhlbiBMb2cuZXJyIFwiI3t2fSBpcyBub3QgYSB2YWxpZCBmaWxlIHBhdGhcIlxuICAgIHJldHVybiB2YWxpZFxuXG5cbiAgTWFrZS5hc3luYyBcIldyaXRlXCIsIFdyaXRlID0gKCktPlxuICAgIHRocm93IFwiTm90IEltcGxlbWVudGVkXCJcblxuICBXcml0ZS5sb2dnaW5nID0gdHJ1ZVxuXG4gIFdyaXRlLnN5bmMgPSB7fVxuICBXcml0ZS5hc3luYyA9IHt9XG5cbiAgTWVtb3J5ID0gbnVsbFxuXG4gIGxvZ1dyaXRlID0gKGZuLCBwLCBvcHRzID0ge30pLT5cbiAgICByZXR1cm4gaWYgb3B0cy5xdWlldFxuICAgIHJldHVybiB1bmxlc3MgV3JpdGUubG9nZ2luZ1xuICAgIGlmIE1lbW9yeSA/PSBUYWtlIFwiTWVtb3J5XCJcbiAgICAgIHAgPSBwLnJlcGxhY2UgTWVtb3J5KFwiYXNzZXRzRm9sZGVyXCIpICsgUmVhZC5zZXAsIFwiXCIgdW5sZXNzIHAgaXMgTWVtb3J5KFwiYXNzZXRzRm9sZGVyXCIpXG4gICAgICBwID0gcC5yZXBsYWNlIE1lbW9yeShcImRhdGFGb2xkZXJcIikgKyBSZWFkLnNlcCwgXCJcIiB1bmxlc3MgcCBpcyBNZW1vcnkoXCJkYXRhRm9sZGVyXCIpXG4gICAgcCA9IHAucmVwbGFjZSBFbnYuaG9tZSArIFJlYWQuc2VwLCBcIlwiIHVubGVzcyBwIGlzIEVudi5ob21lXG4gICAgTG9nIFwiV1JJVEUgI3tmbn0gI3twfVwiXG5cbiAgV3JpdGUuc3luYy5maWxlID0gKHBhdGgsIGRhdGEsIG9wdHMpLT5cbiAgICBpZiB2YWxpZCA9IHZhbGlkUGF0aCBwYXRoXG4gICAgICBsb2dXcml0ZSBcImZpbGVcIiwgcGF0aCwgb3B0c1xuICAgICAgZnMud3JpdGVGaWxlU3luYyBwYXRoLCBkYXRhXG4gICAgcmV0dXJuIHZhbGlkXG5cbiAgV3JpdGUuc3luYy5ta2RpciA9IChwYXRoLCBvcHRzKS0+XG4gICAgcmV0dXJuIHRydWUgaWYgZnMuZXhpc3RzU3luYyBwYXRoXG4gICAgaWYgdmFsaWQgPSB2YWxpZFBhdGggcGF0aFxuICAgICAgbG9nV3JpdGUgXCJta2RpclwiLCBwYXRoLCBvcHRzXG4gICAgICBmcy5ta2RpclN5bmMgcGF0aCwgcmVjdXJzaXZlOiB0cnVlXG4gICAgcmV0dXJuIHZhbGlkXG5cbiAgV3JpdGUuc3luYy5yZW5hbWUgPSAocGF0aCwgbmV3TmFtZSwgb3B0cyktPlxuICAgIG5ld1BhdGggPSBSZWFkLnNlcCArIFJlYWQucGF0aCBSZWFkLnBhcmVudFBhdGgocGF0aCksIG5ld05hbWVcbiAgICByZXR1cm4gdHJ1ZSBpZiBwYXRoIGlzIG5ld1BhdGhcbiAgICBpZiB2YWxpZCA9IHZhbGlkUGF0aChwYXRoKSBhbmQgdmFsaWRQYXRoKG5ld1BhdGgpXG4gICAgICBsb2dXcml0ZSBcInJlbmFtZVwiLCBcIiN7cGF0aH0gLT4gI3tuZXdQYXRofVwiLCBvcHRzXG4gICAgICBmcy5yZW5hbWVTeW5jIHBhdGgsIG5ld1BhdGhcbiAgICByZXR1cm4gdmFsaWRcblxuICBXcml0ZS5zeW5jLnJtID0gKHBhdGgsIG9wdHMpLT5cbiAgICByZXR1cm4gdHJ1ZSBpZiBub3QgZnMuZXhpc3RzU3luYyBwYXRoXG4gICAgaWYgdmFsaWQgPSB2YWxpZFBhdGggcGF0aFxuICAgICAgbG9nV3JpdGUgXCJybVwiLCBwYXRoLCBvcHRzXG4gICAgICBmcy5ybVN5bmMgcGF0aCwgcmVjdXJzaXZlOiB0cnVlXG4gICAgcmV0dXJuIHZhbGlkXG5cbiAgV3JpdGUuc3luYy5jb3B5RmlsZSA9IChzcmMsIGRlc3QsIG9wdHMpLT5cbiAgICBpZiB2YWxpZCA9IHZhbGlkUGF0aChzcmMpIGFuZCB2YWxpZFBhdGgoZGVzdClcbiAgICAgIGxvZ1dyaXRlIFwiY29weUZpbGVcIiwgXCIje3NyY30gLT4gI3tkZXN0fVwiLCBvcHRzXG4gICAgICBmcy5jb3B5RmlsZVN5bmMgc3JjLCBkZXN0XG4gICAgcmV0dXJuIHZhbGlkXG5cbiAgV3JpdGUuc3luYy5qc29uID0gKHBhdGgsIGRhdGEsIG9wdHMpLT5cbiAgICBXcml0ZS5zeW5jLmZpbGUgcGF0aCwgSlNPTi5zdHJpbmdpZnkoZGF0YSksIG9wdHNcblxuICBXcml0ZS5zeW5jLmFycmF5ID0gKHBhdGgsIGFyciwgb3B0cyktPlxuICAgIGN1cnJlbnQgPSBSZWFkIHBhdGhcbiAgICBjdXJyZW50ID89IFtdXG4gICAgcmV0dXJuIGlmIEFycmF5LmVxdWFsIGFyciwgY3VycmVudFxuICAgICMgUmVtb3ZlIGFueXRoaW5nIHRoYXQncyBpbiB0aGUgZm9sZGVyIGJ1dCBub3QgaW4gb3VyIG5ldyBhcnJheVxuICAgIFdyaXRlLnN5bmMucm0gUmVhZC5wYXRoKHBhdGgsIHYpLCBvcHRzIGZvciB2IGluIGN1cnJlbnQgd2hlbiB2IG5vdCBpbiBhcnJcbiAgICAjIFNhdmUgYW55dGhpbmcgdGhhdCdzIGluIG91ciBuZXcgYXJyYXkgYnV0IG5vdCBpbiB0aGUgZm9sZGVyXG4gICAgV3JpdGUuc3luYy5ta2RpciBSZWFkLnBhdGgocGF0aCwgdiksIG9wdHMgZm9yIHYgaW4gYXJyIHdoZW4gdiBub3QgaW4gY3VycmVudFxuICAgIG51bGxcblxuXG4gIFdyaXRlLmFzeW5jLmNvcHlJbnRvID0gKHNyYywgZGVzdEZvbGRlciwgb3B0cyktPlxuICAgIHNyY05hbWUgPSBSZWFkLmxhc3Qgc3JjXG4gICAgaWYgYXdhaXQgUmVhZC5pc0ZvbGRlciBzcmNcbiAgICAgIGNoaWxkRGVzdEZvbGRlciA9IFJlYWQucGF0aCBkZXN0Rm9sZGVyLCBzcmNOYW1lXG4gICAgICBXcml0ZS5zeW5jLm1rZGlyIGNoaWxkRGVzdEZvbGRlciwgb3B0c1xuICAgICAgdmFsaWQgPSB0cnVlXG4gICAgICBmb3IgaXRlbSBpbiBSZWFkIHNyY1xuICAgICAgICBfdmFsaWQgPSBXcml0ZS5hc3luYy5jb3B5SW50byBSZWFkLnBhdGgoc3JjLCBpdGVtKSwgY2hpbGREZXN0Rm9sZGVyLCBvcHRzXG4gICAgICAgIHZhbGlkICYmPSBfdmFsaWRcbiAgICAgIHJldHVybiB2YWxpZFxuICAgIGVsc2VcbiAgICAgIFdyaXRlLnN5bmMuY29weUZpbGUgc3JjLCBSZWFkLnBhdGgoZGVzdEZvbGRlciwgc3JjTmFtZSksIG9wdHNcblxuXG5cbiMgbWFpbi9jb2ZmZWUvZGIuY29mZmVlXG5UYWtlIFtcIldpbmRvd1wiLCBcIkRCV2luZG93UmVhZHlcIl0sIChXaW5kb3cpLT5cblxuICBNYWtlIFwiREJcIiwgREIgPVxuICAgIHNlbmQ6IChmbiwgLi4uYXJncyktPiBXaW5kb3cuZ2V0REIoKS53ZWJDb250ZW50cy5zZW5kIFwibWFpblBvcnRcIiwgZm4sIC4uLmFyZ3NcblxuXG5cbiMgbWFpbi9jb2ZmZWUvZW52LmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuICB7IGFwcCB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcbiAgY2hpbGRQcm9jZXNzID0gcmVxdWlyZSBcImNoaWxkX3Byb2Nlc3NcIlxuICBvcyA9IHJlcXVpcmUgXCJvc1wiXG4gIHBhdGggPSByZXF1aXJlIFwicGF0aFwiXG5cbiAgRW52ID1cbiAgICBpc0Rldjogbm90IGFwcC5pc1BhY2thZ2VkXG4gICAgaXNNYWM6IHByb2Nlc3MucGxhdGZvcm0gaXMgXCJkYXJ3aW5cIlxuICAgIGlzRGVmOiBwcm9jZXNzLmRlZmF1bHRBcHBcbiAgICBpc01haW46IHRydWVcbiAgICBpc1JlbmRlcjogZmFsc2VcbiAgICB1c2VyRGF0YTogYXBwLmdldFBhdGggXCJ1c2VyRGF0YVwiXG4gICAgaG9tZTogYXBwLmdldFBhdGggXCJob21lXCJcbiAgICB2ZXJzaW9uOiBhcHAuZ2V0VmVyc2lvbigpXG4gICAgdmVyc2lvbnM6IHByb2Nlc3MudmVyc2lvbnNcblxuICBFbnYuY29tcHV0ZXJOYW1lID0gaWYgRW52LmlzTWFjIHRoZW4gY2hpbGRQcm9jZXNzLmV4ZWNTeW5jKFwic2N1dGlsIC0tZ2V0IENvbXB1dGVyTmFtZVwiKS50b1N0cmluZygpLnJlcGxhY2UoXCJcXG5cIixcIlwiKSBlbHNlIG9zLmhvc3RuYW1lKClcblxuICAjIFBlcnNpc3RlZCB1c2VyIHByZWZlcmVuY2VzIGFuZCBvdGhlciBwZXItaW5zdGFsbCBhcHAgc3RhdGUgdGhhdCB3aWxsIGJlIG1hbmFnZWQgYnkgdGhlIERCIHdpbmRvd1xuICBFbnYuY29uZmlnUGF0aCA9IHBhdGguam9pbiBFbnYudXNlckRhdGEsIFwiQ29uZmlnLmpzb25cIlxuXG4gICMgUGVyc2lzdGVkIHBlci1pbnN0YWxsIGFwcCBzdGF0ZSB0aGF0IHdpbGwgYmUgbWFuYWdlZCBieSB0aGUgREIgcHJvY2Vzc1xuICBFbnYuZGJTdGF0ZVBhdGggPSBwYXRoLmpvaW4gRW52LnVzZXJEYXRhLCBcIkRCIFN0YXRlLmpzb25cIlxuXG4gICMgUGVyc2lzdGVkIHBlci1pbnN0YWxsIGFwcCBzdGF0ZSB0aGF0IHdpbGwgYmUgbWFuYWdlZCBieSB0aGUgTWFpbiBwcm9jZXNzXG4gIEVudi5tYWluU3RhdGVQYXRoID0gcGF0aC5qb2luIEVudi51c2VyRGF0YSwgXCJNYWluIFN0YXRlLmpzb25cIlxuXG4gICMgV2hlcmUgdGhlIGFzc2V0cyBhbmQgb3RoZXIgZ2xvYmFsbHktc2hhcmVkIGRhdGEgbWFuYWdlZCBieSBIeXBlcnppbmUgd2lsbCBsaXZlXG4gIEVudi5kZWZhdWx0RGF0YUZvbGRlciA9IHBhdGguam9pbiBFbnYuaG9tZSwgXCJEcm9wYm94XCIsIFwiU3lzdGVtXCIsIFwiSHlwZXJ6aW5lXCJcblxuICBNYWtlIFwiRW52XCIsIEVudlxuXG5cblxuIyBtYWluL2NvZmZlZS9pcGMtaGFuZGxlcnMuY29mZmVlXG5UYWtlIFtcIkVudlwiLCBcIklQQ1wiLCBcIkxvZ1wiLCBcIlByaW50ZXJcIiwgXCJXaW5kb3dcIl0sIChFbnYsIElQQywgTG9nLCBQcmludGVyLCBXaW5kb3cpLT5cbiAgeyBhcHAsIEJyb3dzZXJXaW5kb3csIGRpYWxvZywgTWVzc2FnZUNoYW5uZWxNYWluIH0gPSByZXF1aXJlIFwiZWxlY3Ryb25cIlxuXG4gIE1ha2UgXCJIYW5kbGVyc1wiLCBIYW5kbGVycyA9IHNldHVwOiAoKS0+XG5cbiAgICAjIFNZU1RFTVxuXG4gICAgSVBDLmhhbmRsZSBcImVudlwiLCAoKS0+XG4gICAgICBFbnZcblxuICAgIElQQy5vbiBcInF1aXRcIiwgKHtzZW5kZXJ9LCBtc2cpLT5cbiAgICAgIGFwcC5xdWl0KClcblxuICAgIElQQy5vbiBcImZhdGFsXCIsICh7c2VuZGVyfSwgbXNnKS0+XG4gICAgICBkaWFsb2cuc2hvd0Vycm9yQm94IFwiRmF0YWwgRXJyb3JcIiwgbXNnXG4gICAgICBhcHAucXVpdCgpXG5cbiAgICBJUEMub24gXCJhbGVydFwiLCAoe3NlbmRlcn0sIG9wdHMpLT4gIyBTZWU6IGh0dHBzOi8vd3d3LmVsZWN0cm9uanMub3JnL2RvY3MvbGF0ZXN0L2FwaS9kaWFsb2cvI2RpYWxvZ3Nob3dtZXNzYWdlYm94YnJvd3NlcndpbmRvdy1vcHRpb25zXG4gICAgICBkaWFsb2cuc2hvd01lc3NhZ2VCb3ggb3B0c1xuXG4gICAgSVBDLm9uIFwicHJpbnRlclwiLCAoZSwgLi4uYXJncyktPiBQcmludGVyIC4uLmFyZ3NcblxuICAgIElQQy5vbiBcImJpbmQtZGJcIiwgKHtwcm9jZXNzSWQsIHNlbmRlcn0pLT5cbiAgICAgIGRiID0gV2luZG93LmdldERCKClcbiAgICAgIHsgcG9ydDEsIHBvcnQyIH0gPSBuZXcgTWVzc2FnZUNoYW5uZWxNYWluKClcbiAgICAgIHNlbmRlci5wb3N0TWVzc2FnZSBcInBvcnRcIiwge2lkOnByb2Nlc3NJZH0sIFtwb3J0MV1cbiAgICAgIGRiLndlYkNvbnRlbnRzLnBvc3RNZXNzYWdlIFwicG9ydFwiLCB7aWQ6cHJvY2Vzc0lkfSwgW3BvcnQyXVxuXG4gICAgIyBXSU5ET1dJTkdcblxuICAgIElQQy5vbiBcImNsb3NlLXdpbmRvd1wiLCAoe3NlbmRlcn0pLT5cbiAgICAgIEJyb3dzZXJXaW5kb3cuZnJvbVdlYkNvbnRlbnRzKHNlbmRlcik/LmNsb3NlKClcblxuICAgIElQQy5vbiBcIm1pbmltaXplLXdpbmRvd1wiLCAoe3NlbmRlcn0pLT5cbiAgICAgIEJyb3dzZXJXaW5kb3cuZnJvbVdlYkNvbnRlbnRzKHNlbmRlcik/Lm1pbmltaXplKClcblxuICAgIElQQy5vbiBcIm1heGltaXplLXdpbmRvd1wiLCAoe3NlbmRlcn0pLT5cbiAgICAgIEJyb3dzZXJXaW5kb3cuZnJvbVdlYkNvbnRlbnRzKHNlbmRlcik/Lm1heGltaXplKClcblxuICAgIElQQy5vbiBcInVubWF4aW1pemUtd2luZG93XCIsICh7c2VuZGVyfSktPlxuICAgICAgQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoc2VuZGVyKT8udW5tYXhpbWl6ZSgpXG5cbiAgICBJUEMub24gXCJzZXQtd2luZG93LXRpdGxlXCIsICh7c2VuZGVyfSwgbmFtZSktPlxuICAgICAgQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoc2VuZGVyKS5zZXRUaXRsZSBuYW1lXG5cbiAgICBJUEMuaGFuZGxlIFwic2hvd09wZW5EaWFsb2dcIiwgKHtzZW5kZXJ9LCBvcHRzKS0+XG4gICAgICBkaWFsb2cuc2hvd09wZW5EaWFsb2cgQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMoc2VuZGVyKSwgb3B0c1xuXG4gICAgSVBDLm9uIFwib3Blbi1hc3NldFwiLCAoZSwgYXNzZXRJZCktPlxuICAgICAgV2luZG93Lm9wZW4uYXNzZXQgYXNzZXRJZFxuXG4gICAgSVBDLmhhbmRsZSBcIndoYXRzLW15LWFzc2V0XCIsICh7c2VuZGVyfSktPlxuICAgICAgd2luID0gQnJvd3NlcldpbmRvdy5mcm9tV2ViQ29udGVudHMgc2VuZGVyXG4gICAgICBXaW5kb3cuZGF0YVt3aW4ud2ViQ29udGVudHMuaWRdLmFzc2V0SWRcblxuICAgICMgRkVBVFVSRVNcblxuICAgIElQQy5vbiBcImRyYWctZmlsZVwiLCAoe3NlbmRlcn0sIHBhdGgpLT5cbiAgICAgIHNlbmRlci5zdGFydERyYWdcbiAgICAgICAgZmlsZTogcGF0aFxuICAgICAgICBpY29uOiBhd2FpdCBhcHAuZ2V0RmlsZUljb24gcGF0aFxuXG4gICAgSVBDLmhhbmRsZSBcImdldC1maWxlLWljb25cIiwgKHtzZW5kZXJ9LCBwYXRoKS0+XG4gICAgICBpbWcgPSBhd2FpdCBhcHAuZ2V0RmlsZUljb24gcGF0aFxuICAgICAgaW1nLnRvRGF0YVVSTCgpXG5cbiAgICBJUEMub24gXCJwcmV2aWV3LWZpbGVcIiwgKHtzZW5kZXJ9LCBwYXRoKS0+XG4gICAgICB3aW4gPSBCcm93c2VyV2luZG93LmZyb21XZWJDb250ZW50cyBzZW5kZXJcbiAgICAgIHdpbi5wcmV2aWV3RmlsZSBwYXRoXG5cblxuXG4jIG1haW4vY29mZmVlL2lwYy5jb2ZmZWVcblRha2UgW1wiV2luZG93XCJdLCAoV2luZG93KS0+XG4gIHsgQnJvd3NlcldpbmRvdywgaXBjTWFpbiB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcblxuICBNYWtlIFwiSVBDXCIsIElQQyA9XG5cbiAgICBvbjogICAgIChjaGFubmVsLCBjYiktPiBpcGNNYWluLm9uICAgICBjaGFubmVsLCBjYlxuICAgIG9uY2U6ICAgKGNoYW5uZWwsIGNiKS0+IGlwY01haW4ub25jZSAgIGNoYW5uZWwsIGNiXG4gICAgaGFuZGxlOiAoY2hhbm5lbCwgY2IpLT4gaXBjTWFpbi5oYW5kbGUgY2hhbm5lbCwgY2JcblxuICAgIHByb21pc2U6XG4gICAgICBvbmNlOiAoY2hhbm5lbCktPiBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPiBpcGNNYWluLm9uY2UgY2hhbm5lbCwgKGUsIGFyZyktPiByZXNvbHZlIGFyZ1xuICAgICAgaGFuZGxlOiAoY2hhbm5lbCktPiBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPiBpcGNNYWluLmhhbmRsZSBjaGFubmVsLCAoZSwgYXJnKS0+IHJlc29sdmUgYXJnXG5cbiAgICAjIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBmcm9udG1vc3Qgd2luZG93XG4gICAgdG9Gb2N1c2VkV2luZG93OiAobXNnKS0+XG4gICAgICB3aW4gPSBCcm93c2VyV2luZG93LmdldEZvY3VzZWRXaW5kb3coKVxuICAgICAgd2luID89IEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpWzBdICMgTm8gd2luZG93IHdhcyBmb2N1c3NlZCwgc28gZ2V0IGFueSB3aW5kb3dcbiAgICAgIHdpbiA/PSBXaW5kb3cub3Blbi5icm93c2VyKCkgIyBObyB3aW5kb3dzLCBzbyBvcGVuIGEgbmV3IHdpbmRvd1xuICAgICAgd2luLndlYkNvbnRlbnRzLnNlbmQgbXNnXG5cblxuXG4jIG1haW4vY29mZmVlL21haW4tc3RhdGUuY29mZmVlXG4jIFRoaXMgZmlsZSBtYW5hZ2VzIGFueSBzdGF0ZSB0aGF0IG5lZWRzIHRvIGJlIHBlcnNpc3RlZCB0byB0aGUgbG9jYWwgZmlsZXN5c3RlbVxuIyBqdXN0IGZvciB0aGUgbWFpbiBwcm9jZXNzLlxuXG5UYWtlIFtcIkFEU1JcIiwgXCJFbnZcIiwgXCJMb2dcIiwgXCJSZWFkXCIsIFwiV3JpdGVcIl0sIChBRFNSLCBFbnYsIExvZywgUmVhZCwgV3JpdGUpLT5cblxuICAjIFRoaXMgbGlzdHMgYWxsIHRoZSBrZXlzIHdlJ2xsIHBlcnNpc3QgaW4gdGhlIG1haW4gc3RhdGUgZmlsZSwgd2l0aCB0aGVpciBkZWZhdWx0IHZhbHVlc1xuICBzdGF0ZSA9XG4gICAgd2luZG93Qm91bmRzOiBhc3NldDogW10sIGJyb3dzZXI6IFtdLCBkYjogW10sIFwic2V0dXAtYXNzaXN0YW50XCI6IFtdXG5cbiAgc2F2ZSA9IEFEU1IgMCwgMjAwMCwgKCktPlxuICAgIFdyaXRlLnN5bmMuanNvbiBFbnYubWFpblN0YXRlUGF0aCwgc3RhdGUsIHF1aWV0OiB0cnVlXG5cbiAgTWFrZS5hc3luYyBcIk1haW5TdGF0ZVwiLCBNYWluU3RhdGUgPSAoaywgdiktPlxuICAgIHRocm93IEVycm9yIFwiVW5rbm93biBNYWluU3RhdGUga2V5OiAje2t9XCIgdW5sZXNzIHN0YXRlW2tdP1xuICAgIGlmIHYgaXNudCB1bmRlZmluZWRcbiAgICAgIGlmIHY/IHRoZW4gc3RhdGVba10gPSB2IGVsc2UgZGVsZXRlIHN0YXRlW2tdXG4gICAgICBzYXZlKClcbiAgICBzdGF0ZVtrXVxuXG4gIE1haW5TdGF0ZS5pbml0ID0gKCktPlxuICAgIHRyeVxuICAgICAganNvbiA9IFJlYWQuZmlsZSBFbnYubWFpblN0YXRlUGF0aFxuICAgICAgZGF0YSA9IEpTT04ucGFyc2UganNvblxuICAgICAgZm9yIGssIHYgb2YgZGF0YVxuICAgICAgICAjIE9ubHkgYWNjZXB0IGtleXMgd2UgZXhwbGljaXRseSBsaXN0IGluIHRoZSBkZWZhdWx0cy5cbiAgICAgICAgIyBUaGlzIGxldHMgdXMgZHJvcCBvYnNvbGV0ZSB2YWx1ZXMuXG4gICAgICAgIGlmIHN0YXRlW2tdP1xuICAgICAgICAgIHN0YXRlW2tdID0gdlxuXG5cblxuIyBtYWluL2NvZmZlZS9tZW51LmNvZmZlZVxuVGFrZSBbXCJFbnZcIiwgXCJJUENcIiwgXCJXaW5kb3dcIl0sIChFbnYsIElQQywgV2luZG93KS0+XG4gIHsgYXBwLCBNZW51LCBzaGVsbCB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcblxuICB0ZW1wbGF0ZSA9IFtdXG5cbiAgaWYgRW52LmlzTWFjIHRoZW4gdGVtcGxhdGUucHVzaFxuICAgIGxhYmVsOiBhcHAubmFtZVxuICAgIHN1Ym1lbnU6IFtcbiAgICAgIHsgcm9sZTogXCJhYm91dFwiIH1cbiAgICAgIHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9XG4gICAgICB7IGxhYmVsOiBcIlByZWZlcmVuY2VzXCIsIGFjY2VsZXJhdG9yOiBcIkNtZE9yQ3RybCssXCIsIGNsaWNrOiBXaW5kb3cub3Blbi5zZXR1cEFzc2lzdGFudCB9XG4gICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgeyByb2xlOiBcInNlcnZpY2VzXCIgfVxuICAgICAgeyB0eXBlOiBcInNlcGFyYXRvclwiIH1cbiAgICAgIHsgcm9sZTogXCJoaWRlXCIgfVxuICAgICAgeyByb2xlOiBcImhpZGVvdGhlcnNcIiB9XG4gICAgICB7IHJvbGU6IFwidW5oaWRlXCIgfVxuICAgICAgeyB0eXBlOiBcInNlcGFyYXRvclwiIH1cbiAgICAgIHsgcm9sZTogXCJxdWl0XCIgfVxuICAgIF1cblxuICB0ZW1wbGF0ZS5wdXNoXG4gICAgbGFiZWw6IFwiRmlsZVwiXG4gICAgc3VibWVudTogW1xuICAgICAgeyBsYWJlbDogXCJOZXcgQXNzZXRcIiwgYWNjZWxlcmF0b3I6IFwiQ21kT3JDdHJsK05cIiwgY2xpY2s6ICgpLT4gVGFrZShcIkRCXCIpPy5zZW5kIFwiTmV3IEFzc2V0XCIgfVxuICAgICAgeyBsYWJlbDogXCJOZXcgQnJvd3NlciBXaW5kb3dcIiwgYWNjZWxlcmF0b3I6IFwiQ21kT3JDdHJsK1NoaWZ0K05cIiwgY2xpY2s6IFdpbmRvdy5vcGVuLmJyb3dzZXIgfVxuICAgICAgeyB0eXBlOiBcInNlcGFyYXRvclwiIH1cbiAgICAgIHsgbGFiZWw6IFwiU2hvdyBDb25maWcgRmlsZVwiLCBjbGljazogKCktPiBzaGVsbC5zaG93SXRlbUluRm9sZGVyIEVudi5jb25maWdQYXRoIH1cbiAgICAgIHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9XG4gICAgICB7IHJvbGU6IGlmIEVudi5pc01hYyB0aGVuIFwiY2xvc2VcIiBlbHNlIFwicXVpdFwiIH1cbiAgICBdXG5cbiAgdGVtcGxhdGUucHVzaFxuICAgIGxhYmVsOiBcIkVkaXRcIlxuICAgIHN1Ym1lbnU6IFtcbiAgICAgIHsgcm9sZTogXCJ1bmRvXCIgfVxuICAgICAgeyByb2xlOiBcInJlZG9cIiB9XG4gICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgeyByb2xlOiBcImN1dFwiIH1cbiAgICAgIHsgcm9sZTogXCJjb3B5XCIgfVxuICAgICAgeyByb2xlOiBcInBhc3RlXCIgfVxuICAgICAgeyByb2xlOiBcImRlbGV0ZVwiIH1cbiAgICAgIHsgcm9sZTogXCJzZWxlY3RBbGxcIiB9XG4gICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgeyBsYWJlbDogXCJGaW5kXCIsIGFjY2VsZXJhdG9yOiBcIkNtZE9yQ3RybCtGXCIsIGNsaWNrOiAoKS0+IElQQy50b0ZvY3VzZWRXaW5kb3cgXCJmaW5kXCIgfVxuICAgICAgeyB0eXBlOiBcInNlcGFyYXRvclwiIH1cbiAgICAgIC4uLihpZiAhRW52LmlzTWFjIHRoZW4gW1xuICAgICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgICB7IGxhYmVsOiBcIlNldHRpbmdzXCIsIGFjY2VsZXJhdG9yOiBcIkNtZE9yQ3RybCssXCIsIGNsaWNrOiBXaW5kb3cub3Blbi5zZXR1cEFzc2lzdGFudCB9XG4gICAgICBdIGVsc2UgW10pXG4gICAgXVxuXG4gIHRlbXBsYXRlLnB1c2hcbiAgICBsYWJlbDogXCJWaWV3XCJcbiAgICBzdWJtZW51OiBbXG4gICAgICAuLi4oaWYgRW52LmlzRGV2IG9yICFFbnYuaXNNYWMgdGhlbiBbXG4gICAgICAgIHsgcm9sZTogXCJyZWxvYWRcIiB9XG4gICAgICAgIHsgcm9sZTogXCJmb3JjZVJlbG9hZFwiIH1cbiAgICAgICAgeyByb2xlOiBcInRvZ2dsZURldlRvb2xzXCIgfVxuICAgICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgXSBlbHNlIFtdKVxuICAgICAgeyByb2xlOiBcInRvZ2dsZWZ1bGxzY3JlZW5cIiB9XG4gICAgXVxuXG4gIHRlbXBsYXRlLnB1c2hcbiAgICByb2xlOiBcIndpbmRvd01lbnVcIlxuICAgIHN1Ym1lbnU6IFtcbiAgICAgIHsgcm9sZTogXCJtaW5pbWl6ZVwiIH1cbiAgICAgIHsgcm9sZTogXCJ6b29tXCIgfVxuICAgICAgLi4uKGlmIEVudi5pc01hYyB0aGVuIFtcbiAgICAgICAgeyB0eXBlOiBcInNlcGFyYXRvclwiIH1cbiAgICAgICAgeyByb2xlOiBcImZyb250XCIgfVxuICAgICAgXSBlbHNlIFtcbiAgICAgICAgeyByb2xlOiBcImNsb3NlXCIgfVxuICAgICAgXSlcbiAgICAgIHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9XG4gICAgICB7IGxhYmVsOiBcIlNob3cgRGVidWcgTG9nXCIsIGFjY2VsZXJhdG9yOiBcIkNtZE9yQ3RybCtTaGlmdCtEXCIsIGNsaWNrOiBXaW5kb3cub3Blbi5kYiB9XG4gICAgXVxuXG4gIHRlbXBsYXRlLnB1c2hcbiAgICByb2xlOiBcImhlbHBcIlxuICAgIHN1Ym1lbnU6IFtcbiAgICAgIC4uLihpZiAhRW52LmlzTWFjIHRoZW4gW1xuICAgICAgICB7IHJvbGU6IFwiYWJvdXRcIiB9XG4gICAgICAgIHsgdHlwZTogXCJzZXBhcmF0b3JcIiB9XG4gICAgICBdIGVsc2UgW10pXG4gICAgICB7IGxhYmVsOiBcIkh5cGVyemluZSBHdWlkZVwiLCBjbGljazogKCktPiBzaGVsbC5vcGVuRXh0ZXJuYWwgXCJodHRwczovL2dpdGh1Yi5jb20vY2RpZy9oeXBlcnppbmUvd2lraS9IeXBlcnppbmUtR3VpZGVcIiB9XG4gICAgICB7IHR5cGU6IFwic2VwYXJhdG9yXCIgfVxuICAgICAgeyBsYWJlbDogXCJSZXBvcnQgYSBQcm9ibGVtIG9yIEZlYXR1cmUgUmVxdWVzdOKAplwiLCBjbGljazogKCktPiBzaGVsbC5vcGVuRXh0ZXJuYWwgXCJodHRwczovL2dpdGh1Yi5jb20vY2RpZy9oeXBlcnppbmUvaXNzdWVzL25ld1wiIH1cbiAgICAgIHsgbGFiZWw6IFwiQmVlcCBmb3IgR29vZCBMdWNrXCIsIGNsaWNrOiAoKS0+IHNoZWxsLmJlZXAoKSB9XG4gICAgXVxuXG4gIE1ha2UgXCJNZW51XCIsIHNldHVwOiAoKS0+XG4gICAgTWVudS5zZXRBcHBsaWNhdGlvbk1lbnUgTWVudS5idWlsZEZyb21UZW1wbGF0ZSB0ZW1wbGF0ZVxuXG5cblxuIyBtYWluL2NvZmZlZS91cGRhdGVzLmNvZmZlZVxuVGFrZSBbXCJFbnZcIiwgXCJMb2dcIiwgXCJXaW5kb3dcIl0sIChFbnYsIExvZywgV2luZG93KS0+XG4gIHsgYXBwLCBhdXRvVXBkYXRlciwgZGlhbG9nIH0gPSByZXF1aXJlIFwiZWxlY3Ryb25cIlxuXG4gIE1ha2UgXCJVcGRhdGVzXCIsIFVwZGF0ZXMgPVxuICAgIHNldHVwOiAoKS0+XG4gICAgICByZXR1cm4gaWYgRW52LmlzRGV2XG5cbiAgICAgIGRvQ2hlY2tGb3JVcGRhdGVzID0gdHJ1ZVxuXG4gICAgICBhdXRvVXBkYXRlci5zZXRGZWVkVVJMXG4gICAgICAgIHVybDogXCJodHRwczovL3VwZGF0ZS5lbGVjdHJvbmpzLm9yZy9jZGlnL2h5cGVyemluZS8je3Byb2Nlc3MucGxhdGZvcm19LSN7cHJvY2Vzcy5hcmNofS8je2FwcC5nZXRWZXJzaW9uKCl9XCJcblxuICAgICAgYXV0b1VwZGF0ZXIub24gXCJjaGVja2luZy1mb3ItdXBkYXRlXCIsICgpLT4gTG9nIFwiQ2hlY2tpbmcgZm9yIHVwZGF0ZVwiXG4gICAgICBhdXRvVXBkYXRlci5vbiBcInVwZGF0ZS1ub3QtYXZhaWxhYmxlXCIsICgpLT4gTG9nIFwiVXBkYXRlIG5vdCBhdmFpbGFibGVcIlxuICAgICAgYXV0b1VwZGF0ZXIub24gXCJ1cGRhdGUtYXZhaWxhYmxlXCIsICgpLT4gZG9DaGVja0ZvclVwZGF0ZXMgPSBmYWxzZTsgTG9nIFwiRG93bmxvYWRpbmcgdXBkYXRlLi4uXCJcbiAgICAgIGF1dG9VcGRhdGVyLm9uIFwiZXJyb3JcIiwgKGVyciktPiBkb0NoZWNrRm9yVXBkYXRlcyA9IGZhbHNlOyBMb2cuZXJyIGVyclxuXG4gICAgICBhdXRvVXBkYXRlci5vbiBcInVwZGF0ZS1kb3dubG9hZGVkXCIsIChlLCByZWxlYXNlTm90ZXMsIHJlbGVhc2VOYW1lKS0+XG4gICAgICAgIExvZyBcIlVwZGF0ZSBEb3dubG9hZGVkOiAje3JlbGVhc2VOYW1lfVwiXG4gICAgICAgIHJlcyA9IGF3YWl0IGRpYWxvZy5zaG93TWVzc2FnZUJveFxuICAgICAgICAgIHR5cGU6IFwiaW5mb1wiXG4gICAgICAgICAgYnV0dG9uczogW1wiUmVzdGFydCBIeXBlcnppbmVcIiwgXCJMYXRlclwiXVxuICAgICAgICAgIGRlZmF1bHRJZDogMFxuICAgICAgICAgIHRpdGxlOiBcIkFwcGxpY2F0aW9uIFVwZGF0ZVwiXG4gICAgICAgICAgbWVzc2FnZTogXCJIeXBlcnppbmUgaGFzIGJlZW4gdXBkYXRlZCB0byAje3JlbGVhc2VOYW1lLnJlcGxhY2UoXCJ2XCIsIFwidmVyc2lvbiBcIil9LlxcblxcbldvdWxkIHlvdSBsaWtlIHRvIHJlc3RhcnQgYW5kIHVzZSB0aGUgdXBkYXRlZCB2ZXJzaW9uIG5vdz9cIlxuICAgICAgICBMb2cgXCJSZXNwb25zZTogI3tyZXMucmVzcG9uc2V9XCJcbiAgICAgICAgaWYgcmVzLnJlc3BvbnNlIGlzIDBcbiAgICAgICAgICBXaW5kb3cuYWJvdXRUb1F1aXQoKVxuICAgICAgICAgIGF1dG9VcGRhdGVyLnF1aXRBbmRJbnN0YWxsKClcbiAgICAgICAgICBMb2cgXCJRdWl0dGluZ1wiXG5cbiAgICAgIGNoZWNrRm9yVXBkYXRlcyA9ICgpLT5cbiAgICAgICAgYXV0b1VwZGF0ZXIuY2hlY2tGb3JVcGRhdGVzKCkgaWYgZG9DaGVja0ZvclVwZGF0ZXNcblxuICAgICAgY2hlY2tGb3JVcGRhdGVzKClcbiAgICAgIHNldEludGVydmFsIGNoZWNrRm9yVXBkYXRlcywgNjAgKiA2MCAqIDEwMDBcblxuXG5cbiMgbWFpbi9jb2ZmZWUvd2luZG93LmNvZmZlZVxuVGFrZSBbXCJFbnZcIiwgXCJNYWluU3RhdGVcIl0sIChFbnYsIE1haW5TdGF0ZSktPlxuICB7IGFwcCwgQnJvd3NlcldpbmRvdywgZGlhbG9nLCBuYXRpdmVUaGVtZSwgc2NyZWVuIH0gPSByZXF1aXJlIFwiZWxlY3Ryb25cIlxuXG4gIGRlZmF1bHRXaW5kb3cgPVxuICAgIHRpdGxlOiBcIkh5cGVyemluZVwiXG4gICAgdGl0bGVCYXJTdHlsZTogaWYgRW52LmlzTWFjIHRoZW4gXCJoaWRkZW5JbnNldFwiIGVsc2UgXCJoaWRkZW5cIlxuICAgICMgdGl0bGVCYXJPdmVybGF5OiBpZiBFbnYuaXNNYWMgdGhlbiBmYWxzZSBlbHNlXG4gICAgIyAgIGNvbG9yOiBcIiMzMzNcIlxuICAgICMgICBzeW1ib2xDb2xvcjogXCIjZmZmXCJcbiAgICBtaW5XaWR0aDogMzQwXG4gICAgbWluSGVpZ2h0OiAzNDBcbiAgICB3ZWJQcmVmZXJlbmNlczpcbiAgICAgIGNvbnRleHRJc29sYXRpb246IGZhbHNlXG4gICAgICBub2RlSW50ZWdyYXRpb246IHRydWVcbiAgICAgIHNjcm9sbEJvdW5jZTogdHJ1ZVxuICAgICAgYmFja2dyb3VuZFRocm90dGxpbmc6IGZhbHNlXG4gICAgICBuYXRpdmVXaW5kb3dPcGVuOiBmYWxzZSAjIFRoaXMgaXMgY2hhbmdpbmcgdG8gdHJ1ZSBieSBkZWZhdWx0IGluIEVsZWN0cm9uIDE1XG5cbiAgZGVmYXVsdEJvdW5kcyA9XG4gICAgYXNzZXQ6IHdpZHRoOiA5NjAsIGhlaWdodDogNTQwXG4gICAgYnJvd3Nlcjogd2lkdGg6IDEyODAsIGhlaWdodDogNzIwXG4gICAgZGI6IHdpZHRoOiA2NDAsIGhlaWdodDogNDgwXG4gICAgXCJzZXR1cC1hc3Npc3RhbnRcIjogd2lkdGg6IDQ4MCwgaGVpZ2h0OiA1NDBcblxuICB3aW5kb3dJbmRleGVzID0ge31cbiAgd2luZG93Qm91bmRzID0gbnVsbFxuXG4gIHdpbmRvd0RhdGEgPSB7fVxuXG4gICMgU2luZ2xlIGluc3RhbmNlIHdpbmRvd3NcbiAgZGIgPSBudWxsXG4gIHNldHVwQXNzaXN0YW50ID0gbnVsbFxuXG4gICMgTG9jYWwgc3RhdGVcbiAgc2V0dXBEb25lID0gZmFsc2VcbiAgYWJvdXRUb1F1aXQgPSBmYWxzZVxuICBhcHAub24gXCJiZWZvcmUtcXVpdFwiLCAoKS0+IGFib3V0VG9RdWl0ID0gdHJ1ZVxuXG4gICMgV2Ugd2FudCB0byB0cmFjayB3aGV0aGVyIHRoaXMgd2luZG93IGlzIHRoZSAxc3QsIDJuZCwgM3JkIChldGMpIGluc3RhbmNlIG9mIGl0cyB0eXBlLlxuICAjIFRoYXQgd2F5LCB3aGVuZXZlciB3ZSBvcGVuIGEgbmV3IHdpbmRvdywgd2UgY2FuIGFzc2lnbiBpdCB0byB0aGUgbW9zdCByZWNlbnRseSB1c2VkXG4gICMgcG9zaXRpb24gZm9yIHRoYXQgaW5zdGFuY2Ugb2YgdGhhdCB0eXBlIG9mIHdpbmRvdy4gQ2xvc2luZyBhIHdpbmRvdyB3aWxsIGxlYXZlIGEgbnVsbFxuICAjIGluIHRoZSBsaXN0IG9mIHdpbmRvd3MsIHdoaWNoIHdpbGwgYmUgZmlsbGVkIG5leHQgdGltZSB0aGF0IHR5cGUgb2Ygd2luZG93IGlzIG9wZW5lZC5cbiAgIyBIZXJlLCBcImluZGV4XCIgbWVhbnMgdGhlIDFzdCwgMm5kLCAzcmQgKGV0YykgaW5zdGFuY2VcbiAgZ2V0TmV4dEluZGV4ID0gKHR5cGUpLT5cbiAgICBpbmRleGVzID0gd2luZG93SW5kZXhlc1t0eXBlXSA/PSBbXVxuICAgIGluZGV4ID0gaW5kZXhlcy5pbmRleE9mIG51bGwgIyBGaW5kIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3QgbnVsbCwgaWYgYW55XG4gICAgaW5kZXggPSBpbmRleGVzLmxlbmd0aCBpZiBpbmRleCA8IDAgIyBObyBudWxscywgc28gYWRkIHRvIHRoZSBlbmQgb2YgdGhlIGxpc3RcbiAgICB3aW5kb3dJbmRleGVzW3R5cGVdW2luZGV4XSA9IHRydWUgIyBTYXZlIHRoYXQgdGhpcyBpbmRleCBpcyBub3cgYmVpbmcgdXNlZFxuICAgIHJldHVybiBpbmRleFxuXG4gIGNsZWFySW5kZXggPSAodHlwZSwgaW5kZXgpLT5cbiAgICB3aW5kb3dJbmRleGVzW3R5cGVdW2luZGV4XSA9IG51bGxcblxuICBnZXRCb3VuZHMgPSAodHlwZSwgaW5kZXgpLT5cbiAgICAjIFdlIGRvIHNvbWUgc3BlY2lhbCBsb2dpYyB0byBwb3NpdGlvbiB3aW5kb3dzIGJhc2VkIG9uIHRoZSBwb3NpdGlvbiBvZiB0aGVcbiAgICAjIG1vdXNlIGN1cnNvciwgdG8gYXZvaWQgZnJ1c3RyYXRpb24gd2hlbiB3b3JraW5nIHdpdGggbXVsdGlwbGUgbW9uaXRvcnMuXG4gICAgIyBXZSByZWdhcmQgdGhlIG1vdXNlIHRvIGJlIG9jY3VweWluZyB0aGUgXCJjdXJyZW50XCIgbW9uaXRvci5cbiAgICBjdXJzb3IgPSBzY3JlZW4uZ2V0Q3Vyc29yU2NyZWVuUG9pbnQoKVxuICAgIGRpc3BsYXkgPSBzY3JlZW4uZ2V0RGlzcGxheU5lYXJlc3RQb2ludChjdXJzb3IpLmJvdW5kc1xuXG4gICAgIyBUaGUgU2V0dXAgQXNzaXN0YW50IGlzIGhhbmRsZWQgc3BlY2lhbGx5LlxuICAgICMgSXQgc2hvdWxkIGFsd2F5cyBhcHBlYXIgY2VudGVyZWQgb24gdGhlIGN1cnJlbnQgbW9uaXRvci5cbiAgICBpZiB0eXBlIGlzIFwic2V0dXAtYXNzaXN0YW50XCJcbiAgICAgIGJvdW5kcyA9IGRlZmF1bHRCb3VuZHNbdHlwZV1cbiAgICAgIGJvdW5kcy54ID0gZGlzcGxheS54ICsgZGlzcGxheS53aWR0aC8yIC0gYm91bmRzLndpZHRoLzJcbiAgICAgIGJvdW5kcy55ID0gZGlzcGxheS55ICsgZGlzcGxheS5oZWlnaHQvMiAtIGJvdW5kcy5oZWlnaHQvMlxuICAgICAgcmV0dXJuIGJvdW5kc1xuXG4gICAgIyBGb3Igb3RoZXIgdHlwZXMgb2Ygd2luZG93cywgd2UnbGwgZmlyc3QgdHJ5IHRvIGxvYWQgdGhlXG4gICAgIyBsYXN0LXVzZWQgcG9zaXRpb24gZm9yIHRoaXMgaW5zdGFuY2UgKGJ5IGluZGV4KSBvZiB0aGlzIHR5cGUgb2Ygd2luZG93XG4gICAgYm91bmRzID0gd2luZG93Qm91bmRzW3R5cGVdW2luZGV4XVxuICAgIHJldHVybiBib3VuZHMgaWYgYm91bmRzP1xuXG4gICAgIyBXZSBkb24ndCBoYXZlIGEgbGFzdC11c2VkIHBvc2l0aW9uLCBzbyBsZXQncyBzZXQgdXAgYSBuZXcgb25lLlxuICAgIGJvdW5kcyA9IGRlZmF1bHRCb3VuZHNbdHlwZV1cblxuICAgIGlmIHR5cGUgaXMgXCJkYlwiXG4gICAgICAjIEJ5IGRlZmF1bHQsIHRoZSBkYiBzaG91bGQgYXBwZWFyIGluIHRoZSB0b3AgbGVmdCBvZiB0aGUgY3VycmVudCBtb25pdG9yLlxuICAgICAgYm91bmRzLnggPSBkaXNwbGF5LnhcbiAgICAgIGJvdW5kcy55ID0gZGlzcGxheS55XG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgXCJicm93c2VyXCIgYW5kIGluZGV4IGlzIDBcbiAgICAgICMgVGhlIGZpcnN0IGluc3RhbmNlIG9mIHRoZSBicm93c2VyIHdpbmRvdyBzaG91bGQgYXBwZWFyIGNlbnRlcmVkIG9uIHRoZSBjdXJyZW50IG1vbml0b3IuXG4gICAgICBib3VuZHMueCA9IGRpc3BsYXkueCArIGRpc3BsYXkud2lkdGgvMiAtIGJvdW5kcy53aWR0aC8yXG4gICAgICBib3VuZHMueSA9IGRpc3BsYXkueSArIGRpc3BsYXkuaGVpZ2h0LzIgLSBib3VuZHMuaGVpZ2h0LzJcblxuICAgIGVsc2VcbiAgICAgICMgQWxsIG90aGVyIHdpbmRvd3Mgc2hvdWxkIGFwcGVhciBuZWFyIHRoZSBtb3VzZSBjdXJzb3IuXG4gICAgICBib3VuZHMueCA9IGN1cnNvci54IC0gNzRcbiAgICAgIGJvdW5kcy55ID0gY3Vyc29yLnkgLSAxNlxuXG4gICAgYm91bmRzXG5cbiAgY2hlY2tCb3VuZHMgPSAod2luKS0+XG4gICAgYm91bmRzID0gd2luLmdldEJvdW5kcygpXG4gICAgZm9yIG90aGVyV2luZG93IGluIEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpIHdoZW4gb3RoZXJXaW5kb3cgaXNudCB3aW4gYW5kIG90aGVyV2luZG93IGlzbnQgZGJcbiAgICAgIG90aGVyQm91bmRzID0gb3RoZXJXaW5kb3cuZ2V0Qm91bmRzKClcbiAgICAgIGlmIGJvdW5kcy54IGlzIG90aGVyQm91bmRzLnggYW5kIGJvdW5kcy55IGlzIG90aGVyQm91bmRzLnlcbiAgICAgICAgYm91bmRzLnggKz0gMjJcbiAgICAgICAgYm91bmRzLnkgKz0gMjJcbiAgICAgICAgIyBXZSd2ZSBtb3ZlZCBvdXIgd2luZG93LCBzbyB3ZSBuZWVkIHRvIHN0YXJ0IGNoZWNraW5nIGFsbCBvdmVyIGFnYWluXG4gICAgICAgICMgVE9ETzogVGhlcmUncyBhIHNtYWxsIHJpc2sgb2YgYW4gaW5maW5lIGxvb3AgaGVyZSBpZiB0aGUgYmVoYXZpb3VyIG9mXG4gICAgICAgICMgc2V0Qm91bmRzIGZvbGxvd2VkIGJ5IGdldEJvdW5kcyBjaGFuZ2VzIGFuZCBzdGFydHMgY2xpcHBpbmcgdG8gdGhlIHdpbmRvdy5cbiAgICAgICAgIyBBbHNvLCB3ZSBhcmVuJ3QgbWF0Y2hpbmcgT1NYIGJlaGF2aW91ciwgd2hpY2ggaXMgdG8gd3JhcC5cbiAgICAgICAgd2luLnNldEJvdW5kcyBib3VuZHNcbiAgICAgICAgY2hlY2tCb3VuZHMgd2luXG4gICAgICAgIHJldHVyblxuXG4gIHVwZGF0ZUJvdW5kcyA9ICh0eXBlLCBpbmRleCwgd2luKS0+XG4gICAgd2luZG93Qm91bmRzW3R5cGVdW2luZGV4XSA9IHdpbi5nZXRCb3VuZHMoKVxuICAgIE1haW5TdGF0ZSBcIndpbmRvd0JvdW5kc1wiLCB3aW5kb3dCb3VuZHNcblxuICBuZXdXaW5kb3cgPSAodHlwZSwge3Rvb2xzfSwgcHJvcHMgPSB7fSktPlxuICAgIHVubGVzcyBwcm9wcy5zaG93IGlzIGZhbHNlXG4gICAgICBkZWZlclBhaW50ID0gdHJ1ZVxuICAgICAgcHJvcHMuc2hvdyA9IGZhbHNlXG4gICAgaW5kZXggPSBnZXROZXh0SW5kZXggdHlwZVxuICAgIGJvdW5kcyA9IGdldEJvdW5kcyB0eXBlLCBpbmRleFxuICAgIGJhY2tncm91bmQgPSBiYWNrZ3JvdW5kQ29sb3I6IGlmIG5hdGl2ZVRoZW1lLnNob3VsZFVzZURhcmtDb2xvcnMgdGhlbiBcIiMxYjFiMWJcIiBlbHNlIFwiI2YyZjJmMlwiXG4gICAgd2luID0gbmV3IEJyb3dzZXJXaW5kb3cgT2JqZWN0LmFzc2lnbiB7fSwgZGVmYXVsdFdpbmRvdywgYm91bmRzLCBiYWNrZ3JvdW5kLCBwcm9wc1xuICAgIGNoZWNrQm91bmRzIHdpblxuICAgIHVwZGF0ZUJvdW5kcyB0eXBlLCBpbmRleCwgd2luXG4gICAgd2luLmxvYWRGaWxlIFwidGFyZ2V0LyN7dHlwZX0uaHRtbFwiXG4gICAgLmNhdGNoIChlcnIpLT4gZGlhbG9nLnNob3dNZXNzYWdlQm94IG1lc3NhZ2U6IGVyci5tZXNzYWdlXG4gICAgd2luLm9uY2UgXCJyZWFkeS10by1zaG93XCIsIHdpbi5zaG93IGlmIGRlZmVyUGFpbnRcbiAgICB3aW4ub24gXCJtb3ZlXCIsIChlKS0+IHVwZGF0ZUJvdW5kcyB0eXBlLCBpbmRleCwgd2luXG4gICAgd2luLm9uIFwicmVzaXplXCIsIChlKS0+IHVwZGF0ZUJvdW5kcyB0eXBlLCBpbmRleCwgd2luXG4gICAgd2luLm9uIFwiY2xvc2VkXCIsIChlKS0+IGNsZWFySW5kZXggdHlwZSwgaW5kZXhcbiAgICB3aW4ub24gXCJjbG9zZWRcIiwgKGUpLT4gY2hlY2tGb3JFeGl0KClcblxuICAgICMgTm90aWZ5IElQQyBoYW5kbGVycyBpbiBjb21tb24vd2luZG93LWV2ZW50cy5jb2ZmZWUgd2hlbiBjZXJ0YWluIHdpbmRvdyBldmVudHMgaGFwcGVuXG4gICAgd2luLm9uIFwiZm9jdXNcIiwgKGUpLT4gd2luLndlYkNvbnRlbnRzLnNlbmQgXCJmb2N1c1wiXG4gICAgd2luLm9uIFwiYmx1clwiLCAoZSktPiB3aW4ud2ViQ29udGVudHMuc2VuZCBcImJsdXJcIlxuICAgIHdpbi5vbiBcIm1heGltaXplXCIsIChlKS0+IHdpbi53ZWJDb250ZW50cy5zZW5kIFwibWF4aW1pemVcIlxuICAgIHdpbi5vbiBcInVubWF4aW1pemVcIiwgKGUpLT4gd2luLndlYkNvbnRlbnRzLnNlbmQgXCJ1bm1heGltaXplXCJcblxuICAgIHdpblxuXG4gIG9wZW5Bc3NldCA9IChhc3NldElkKS0+XG4gICAgd2luID0gbmV3V2luZG93IFwiYXNzZXRcIiwge3Rvb2xzOiBmYWxzZX0sIHRpdGxlOiBcIkFzc2V0XCJcbiAgICB3aW5kb3dEYXRhW3dpbi53ZWJDb250ZW50cy5pZF0gPSBhc3NldElkOiBhc3NldElkXG4gICAgcmV0dXJuIHdpblxuXG4gIG9wZW5Ccm93c2VyID0gKCktPlxuICAgIG5ld1dpbmRvdyBcImJyb3dzZXJcIiwge3Rvb2xzOiBmYWxzZX0sIHRpdGxlOiBcIkJyb3dzZXJcIiwgbWluV2lkdGg6IDQwMFxuXG4gIG9wZW5EYiA9ICgpLT5cbiAgICBpZiBkYj9cbiAgICAgIGRiLnNob3coKVxuICAgIGVsc2VcbiAgICAgIGRiID0gbmV3V2luZG93IFwiZGJcIiwge3Rvb2xzOiBmYWxzZX0sIHRpdGxlOiBcIkRlYnVnIExvZ1wiLCBzaG93OiBmYWxzZSAjb3IgRW52LmlzRGV2XG4gICAgICBkYi5vbiBcImNsb3NlXCIsIChlKS0+XG4gICAgICAgIHVubGVzcyBhYm91dFRvUXVpdFxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGRiLmhpZGUoKVxuICAgICAgTWFrZSBcIkRCV2luZG93UmVhZHlcIlxuICAgIHJldHVybiBkYlxuXG4gIG9wZW5TZXR1cEFzc2lzdGFudCA9ICgpLT5cbiAgICBpZiBzZXR1cEFzc2lzdGFudD9cbiAgICAgIHNldHVwQXNzaXN0YW50LnNob3coKVxuICAgIGVsc2VcbiAgICAgIHNldHVwQXNzaXN0YW50ID0gbmV3V2luZG93IFwic2V0dXAtYXNzaXN0YW50XCIsIHt0b29sczogZmFsc2V9LCB0aXRsZTogXCJTZXR1cCBBc3Npc3RhbnRcIiwgcmVzaXphYmxlOiBmYWxzZSwgZnVsbHNjcmVlbmFibGU6IGZhbHNlLCBmcmFtZTogZmFsc2UsIHRpdGxlQmFyU3R5bGU6IFwiZGVmYXVsdFwiXG4gICAgICBzZXR1cEFzc2lzdGFudC5vbiBcImNsb3NlXCIsIChlKS0+IHNldHVwQXNzaXN0YW50ID0gbnVsbFxuICAgIHJldHVybiBzZXR1cEFzc2lzdGFudFxuXG4gIGNoZWNrRm9yRXhpdCA9ICgpLT5cbiAgICBhcHAucXVpdCgpIGlmICFFbnYuaXNNYWMgYW5kIEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpLmxlbmd0aCA8PSAxXG5cblxuICBNYWtlIFwiV2luZG93XCIsIFdpbmRvdyA9XG4gICAgaW5pdDogKCktPlxuICAgICAgd2luZG93Qm91bmRzID0gTWFpblN0YXRlIFwid2luZG93Qm91bmRzXCJcblxuICAgIGRhdGE6IHdpbmRvd0RhdGFcblxuICAgIGdldERCOiAoKS0+XG4gICAgICB0aHJvdyBFcnJvciBcIkRCIHdpbmRvdyBkb2Vzbid0IGV4aXN0XCIgdW5sZXNzIGRiP1xuICAgICAgZGJcblxuICAgIG9wZW46XG4gICAgICBhc3NldDogb3BlbkFzc2V0XG4gICAgICBicm93c2VyOiBvcGVuQnJvd3NlclxuICAgICAgZGI6IG9wZW5EYlxuICAgICAgc2V0dXBBc3Npc3RhbnQ6IG9wZW5TZXR1cEFzc2lzdGFudFxuXG4gICAgYWN0aXZhdGU6ICgpLT5cbiAgICAgIGlmIEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpLmxlbmd0aCBpcyAwXG4gICAgICAgIFdpbmRvdy5vcGVuLmRiKClcbiAgICAgIGVsc2UgaWYgc2V0dXBEb25lXG4gICAgICAgIFdpbmRvdy5vcGVuLmJyb3dzZXIoKVxuICAgICAgZWxzZVxuICAgICAgICBXaW5kb3cub3Blbi5zZXR1cEFzc2lzdGFudCgpXG4gICAgICB3aW4gPSBBcnJheS5sYXN0KEJyb3dzZXJXaW5kb3cuZ2V0QWxsV2luZG93cygpKVxuICAgICAgd2luLnJlc3RvcmUoKSBpZiB3aW4uaXNNaW5pbWl6ZWQoKVxuICAgICAgd2luLmZvY3VzKClcblxuICAgIHNldHVwRG9uZTogKCktPiBzZXR1cERvbmUgPSB0cnVlXG4gICAgYWJvdXRUb1F1aXQ6ICgpLT4gYWJvdXRUb1F1aXQgPSB0cnVlXG5cblxuXG4jIG1haW4vbWFpbi5jb2ZmZWVcblRha2UgW1wiRW52XCIsIFwiSGFuZGxlcnNcIiwgXCJJUENcIiwgXCJMb2dcIiwgXCJNZW51XCIsIFwiTWFpblN0YXRlXCIsIFwiVXBkYXRlc1wiLCBcIldpbmRvd1wiXSwgKEVudiwgSGFuZGxlcnMsIElQQywgTG9nLCBNZW51LCBNYWluU3RhdGUsIFVwZGF0ZXMsIFdpbmRvdyktPlxuICB7IGFwcCB9ID0gcmVxdWlyZSBcImVsZWN0cm9uXCJcblxuICAjIFdpbmRvd3Mgd2lsbCBsYXVuY2ggdGhlIGFwcCBtdWx0aXBsZSB0aW1lcyBkdXJpbmcgYW4gdXBkYXRlLiBXZSBqdXN0IG5lZWQgdG8gcXVpdC5cbiAgcmV0dXJuIGFwcC5xdWl0KCkgaWYgcmVxdWlyZSBcImVsZWN0cm9uLXNxdWlycmVsLXN0YXJ0dXBcIlxuXG4gICMgT25seSBjb250aW51ZSBsYXVuY2hpbmcgaWYgdGhlcmUncyBubyBvdGhlciBpbnN0YW5jZSBvZiB0aGUgYXBwIHRoYXQncyBhbHJlYWR5IHJ1bm5pbmdcbiAgaWYgbm90IGFwcC5yZXF1ZXN0U2luZ2xlSW5zdGFuY2VMb2NrKClcbiAgICBhcHAucXVpdCgpXG4gIGVsc2VcbiAgICBhcHAub24gXCJzZWNvbmQtaW5zdGFuY2VcIiwgKGV2ZW50LCBjb21tYW5kTGluZSwgd29ya2luZ0RpcmVjdG9yeSktPlxuICAgICAgV2luZG93LmFjdGl2YXRlKClcblxuICAjIEp1c3QgZ3Vlc3NpbmcgdGhhdCB0aGVzZSBtaWdodCBiZSBuaWNlLiBIYXZlbid0IHRlc3RlZCB0aGVtIGF0IGFsbC5cbiAgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaCBcImRpc2FibGUtcmVuZGVyZXItYmFja2dyb3VuZGluZ1wiXG4gIGFwcC5jb21tYW5kTGluZS5hcHBlbmRTd2l0Y2ggXCJmb3JjZV9sb3dfcG93ZXJfZ3B1XCJcblxuICAjIEhlcmUncyBvdXIgY3VzdG9tIGNvbmZpZyBmb3IgdGhlIEFib3V0IGJveFxuICBhcHAuc2V0QWJvdXRQYW5lbE9wdGlvbnNcbiAgICBhcHBsaWNhdGlvbk5hbWU6IFwiSHlwZXJ6aW5lICN7RW52LnZlcnNpb24ucmVwbGFjZSAvKFxcZFxcLlxcZClcXC4wLywgXCIkMVwifVwiXG4gICAgYXBwbGljYXRpb25WZXJzaW9uOiBbXG4gICAgICBcIkVsZWN0cm9uICN7RW52LnZlcnNpb25zLmVsZWN0cm9uLnNwbGl0KFwiLlwiKVswXX1cIlxuICAgICAgXCJDaHJvbWUgI3tFbnYudmVyc2lvbnMuY2hyb21lLnNwbGl0KFwiLlwiKVswXX1cIlxuICAgICAgXCJOb2RlICN7RW52LnZlcnNpb25zLm5vZGUuc3BsaXQoXCIuXCIpWzBdfVwiXG4gICAgXS5qb2luIFwiIOKAoiBcIlxuICAgIHZlcnNpb246IFwiXCJcbiAgICBjb3B5cmlnaHQ6IFwiQ3JlYXRlZCBieSBJdmFuIFJlZXNlXFxuwqkgQ0QgSW5kdXN0cmlhbCBHcm91cCBJbmMuXCJcblxuICAjIFdoaWxlIHdlJ3JlIHdhaXRpbmcgZm9yIGVsZWN0cm9uIHRvIGdldCByZWFkeSwgd2UgY2FuIGxvYWQgb3VyIHBlcnNpc3RlZCBtYWluIHN0YXRlIChpZiBhbnkpLlxuICBNYWluU3RhdGUuaW5pdCgpXG4gIFdpbmRvdy5pbml0KClcblxuICAjIFdhaXQgZm9yIHJlYWR5IGJlZm9yZSBkb2luZyBhbnl0aGluZyBzdWJzdGFudGlhbC5cbiAgYXdhaXQgYXBwLndoZW5SZWFkeSgpXG5cbiAgIyBGb3Igbm93LCB3ZSBqdXN0IHJvbGwgd2l0aCBhIHN0YXRpYyBtZW51IGJhci4gSW4gdGhlIGZ1dHVyZSwgd2UgbWlnaHQgd2FudCB0byBjaGFuZ2UgaXRcbiAgIyBkZXBlbmRpbmcgb24gd2hpY2ggd2luZG93IGlzIGFjdGl2ZS5cbiAgTWVudS5zZXR1cCgpXG5cbiAgIyBUaGVyZSdzIGFib3V0IHRvIGJlIGEgbG90IG9mIGludGVyLXByb2Nlc3MgY29tbXVuaWNhdGlvbiAoSVBDKS4gTXVjaCBvZiBpdCBpcyBnb2luZyB0byBiZVxuICAjIHdpbmRvd3MgYXNraW5nIHRoZSBtYWluIHByb2Nlc3MgdG8gZG8gdGhpbmdzIG9uIHRoZWlyIGJlaGFsZi4gU28gbGV0J3Mgc2V0IHVwIHRob3NlIGhhbmRsZXJzLlxuICBIYW5kbGVycy5zZXR1cCgpXG5cbiAgIyBUaGUgZmlyc3Qgd2luZG93IHdlIG9wZW4gaXMgdGhlIERCLCB3aGljaCBoYW5kbGVzIGFsbCBmaWxlc3lzdGVtIGFjY2VzcyBhbmQgc3RvcmVzIGdsb2JhbCBzdGF0ZS5cbiAgIyBUaGUgaW5zdGFudCB0aGUgREIgb3BlbnMsIGl0J2xsIGJlIHJlYWR5IHRvIHJlY2VpdmUgcG9ydHMgZnJvbSBvdGhlciB3aW5kb3dzIGFuZCBoZWxwIHRoZW0uXG4gICMgVGhlIERCIHdpbmRvdyBzaG91bGQgbmV2ZXIgYmUgcmVsb2FkZWQgb3IgY2xvc2VkLCB1bnRpbCB0aGUgYXBwIHF1aXRzLCBvciBpdCdsbCBsb3NlIGFsbCB0aGUgcG9ydHMsXG4gICMgYW5kIHdlIGhhdmVuJ3QgZGVzaWduZWQgdGhlIG90aGVyIHdpbmRvd3MgdG8gZnVuY3Rpb24gKGV2ZW4gdGVtcG9yYXJpbHkpIHdpdGhvdXQgYSBwb3J0IHRvIHRoZSBkYi5cbiAgIyBXZSBxdWV1ZSBpdCBzbyB0aGF0IHRoZSBiZWxvdyBJUEMgbGlzdGVuZXJzIHdpbGwgYmUgcmVhZHkgd2hlbiB0aGUgd2luZG93IGFjdHVhbGx5IG9wZW5zLlxuICAjIChXZSBjb3VsZCBqdXN0IGNhbGwgdGhlbSBmaXJzdCwgYnV0IGl0IHJlYWRzIGJldHRlciB0aGlzIHdheSlcbiAgcXVldWVNaWNyb3Rhc2sgV2luZG93Lm9wZW4uZGJcblxuICAjIFdoZW4gdGhlIERCIHdpbmRvdyBpcyBvcGVuLCB3ZSBjYW4gYmVnaW4gbG9nZ2luZyBsb3RzIG9mIHN0dWZmXG4gIGF3YWl0IElQQy5wcm9taXNlLm9uY2UgXCJkYi1vcGVuXCJcbiAgTG9nIFwiRW52LnZlcnNpb246ICN7RW52LnZlcnNpb259XCJcbiAgTG9nIFwiRW52LmlzRGV2OiAje0Vudi5pc0Rldn1cIlxuICBMb2cgXCJFbnYuaXNNYWM6ICN7RW52LmlzTWFjfVwiXG4gIExvZyBcIkVudi51c2VyRGF0YTogI3tFbnYudXNlckRhdGF9XCJcbiAgTG9nIFwiRW52LmhvbWU6ICN7RW52LmhvbWV9XCJcblxuICAjIFdoZW4gdGhlIERCIHdpbmRvdyBmaXJzdCB3YWtlcyB1cCwgaXQnbGwgYXR0ZW1wdCB0byBsb2FkIHNhdmVkIHVzZXIgcHJlZmVyZW5jZXMuXG4gICMgSWYgdGhlIERCIGZhaWxzIHRvIGxvYWQgdGhpcyBkYXRhLCB3ZSBuZWVkIHRvIG9wZW4gdGhlIFNldHVwIEFzc2lzdGFudC5cbiAgIyBUaGUgU2V0dXAgQXNzaXN0YW50IHdpbGwgY29sbGVjdCB1c2VyIHByZWZlcmVuY2VzIGFuZCBzYXZlIHRoZW0gdmlhIHRoZSBEQi5cbiAgSVBDLm9uY2UgXCJvcGVuLXNldHVwLWFzc2lzdGFudFwiLCBXaW5kb3cub3Blbi5zZXR1cEFzc2lzdGFudFxuXG4gICMgV2FpdCB1bnRpbCBlaXRoZXIgdGhlIERCIGhhcyBsb2FkZWQgdGhlIHNhdmVkIHByZWZzLCBvciB0aGUgU2V0dXAgQXNzaXN0YW50IGhhcyBmaW5pc2hlZFxuICBhd2FpdCBJUEMucHJvbWlzZS5vbmNlIFwiY29uZmlnLXJlYWR5XCJcblxuICBXaW5kb3cuc2V0dXBEb25lKClcblxuICAjIEV2ZXJ5dGhpbmcgaXMgcmVhZHkg4oCUIG9wZW4gYSBicm93c2VyIHdpbmRvdy5cbiAgIyBFdmVudHVhbGx5LCB3ZSBtaWdodCB3YW50IHRvIHJlc3RvcmUgd2hpY2hldmVyIHdpbmRvd3Mgd2VyZSBvcGVuIHdoZW4gd2UgbGFzdCBxdWl0XG4gIFdpbmRvdy5vcGVuLmJyb3dzZXIoKVxuXG4gICMgV2hlbmV2ZXIgd2Ugc3dpdGNoIHRvIHRoZSBhcHAsIGxldCB0aGUgd2luZG93IG1hbmFnZXIga25vdy5cbiAgYXBwLm9uIFwiYWN0aXZhdGVcIiwgV2luZG93LmFjdGl2YXRlXG5cbiAgIyBSZXBsYWNlIHRoZSBkZWZhdWx0IFwiZXhpdFwiIGJlaGF2aW91ciDigJQgd2UgaW1wbGVtZW50IG91ciBvd24gaW4gd2luZG93LmNvZmZlZVxuICBhcHAub24gXCJ3aW5kb3ctYWxsLWNsb3NlZFwiLCAoKS0+XG5cbiAgIyBTZXQgdXAgYXV0b21hdGljIHVwZGF0ZXNcbiAgVXBkYXRlcy5zZXR1cCgpXG4iXX0=
//# sourceURL=coffeescript
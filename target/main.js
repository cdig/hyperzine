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
    if (-1 !== v.search(/[<>:?"*|\/\\]/)) { // Exclude names we won't be able to roundtrip
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
    return State(path, (await fn(State.clone(path))), {
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
    if (-1 !== v.search(/[<>:?"*|]/)) { // Exclude names we won't be able to roundtrip
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
      ...(Env.isDev ? [
        {
          label: "Rebuild All Thumbnails",
          click: function() {
            var ref;
            return (ref = Take("DB")) != null ? ref.send("Rebuild All Thumbnails") : void 0;
          }
        }
      ] : []),
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
      sandbox: false,
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
      var win, windows;
      windows = BrowserWindow.getAllWindows();
      if (windows.length === 0) {
        return Window.open.db();
      } else if (windows.length === 1) {
        if (setupDone) {
          return Window.open.browser();
        } else {
          return Window.open.setupAssistant();
        }
      } else if (windows.slice(1).every(function(win) {
        return win.isMinimized();
      })) {
        win = windows[1];
        win.restore();
        return win.focus();
      } else {
        win = Array.last(windows);
        return win.focus();
      }
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
    copyright: "© CD Industrial Group Inc."
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

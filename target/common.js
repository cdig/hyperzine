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
      var base, len1, len2, m, need, output, q, ref, waiting;
      output = {
        microtasksNeeded: microtasksNeeded,
        microtasksUsed: microtasksUsed,
        unresolved: {}
      };
      for (m = 0, len1 = waitingTakers.length; m < len1; m++) {
        waiting = waitingTakers[m];
        ref = waiting.needs;
        for (q = 0, len2 = ref.length; q < len2; q++) {
          need = ref[q];
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
      var index, len1, m, taker;
      if (alreadyChecking) { // Prevent recursion from Make() calls inside notify()
        return;
      }
      alreadyChecking = true;
// Depends on `waitingTakers`
// Comments below are to help reason through the (potentially) recursive behaviour
      for (index = m = 0, len1 = waitingTakers.length; m < len1; index = ++m) {
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
      var len1, m, n, o;
      if (typeof needs === "string") {
        return made[needs];
      } else {
        o = {};
        for (m = 0, len1 = needs.length; m < len1; m++) {
          n = needs[m];
          o[n] = made[n];
        }
        return o;
      }
    };
    notifyTakers = function() {
      var len1, m, taker, takers;
      alreadyWaitingToNotify = false;
      takers = takersToNotify;
      takersToNotify = [];
      for (m = 0, len1 = takers.length; m < len1; m++) {
        taker = takers[m];
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
  Make.async("ADSR", ADSR = function(...arg) {
    var attack, fn, ref, release;
    ref = arg, [...arg] = ref, [fn] = splice.call(arg, -1);
    [attack = 0, release = 0] = arg;
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
    var len1, m, watcher;
    for (m = 0, len1 = watchers.length; m < len1; m++) {
      watcher = watchers[m];
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
  var className, classPatches, globalclass, key, monkeyPatches, results1, value;
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
        var ai, bi, i, len1, m;
        if (Object.is(a, b)) {
          return true;
        }
        if (!(Array.type(a) && Array.type(b) && a.length === b.length)) {
          return false;
        }
        for (i = m = 0, len1 = a.length; m < len1; i = ++m) {
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
        var k, len1, m, o;
        o = {};
        for (m = 0, len1 = arr.length; m < len1; m++) {
          k = arr[m];
          o[k] = fn(k);
        }
        return o;
      },
      pull: function(arr, elms) {
        var elm, i, len1, m;
        if (!((arr != null) && (elms != null))) {
          return;
        }
        if (!Array.type(elms)) {
          elms = [elms];
        }
        for (m = 0, len1 = elms.length; m < len1; m++) {
          elm = elms[m];
          while ((i = arr.indexOf(elm)) > -1) {
            arr.splice(i, 1);
          }
        }
        return arr;
      },
      search: function(arr, key) {
        var len1, m, v;
        for (m = 0, len1 = arr.length; m < len1; m++) {
          v = arr[m];
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
        var i, item, len1, m, newArr;
        newArr = [];
        for (i = m = 0, len1 = arr.length; m < len1; i = ++m) {
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
      clip: function(v, ...arg) {
        var max, min, ref;
        ref = arg, [...arg] = ref, [max] = splice.call(arg, -1);
        [min = 0] = arg;
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
        var len1, m, o, obj;
        o = {};
        for (m = 0, len1 = arr.length; m < len1; m++) {
          obj = arr[m];
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
        var k, len1, m, obj, out, v;
        out = {};
        for (m = 0, len1 = objs.length; m < len1; m++) {
          obj = objs[m];
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
        var c, ch, h1, h2, len1, m;
        if (str == null) {
          return 0;
        }
        h1 = 0xdeadbeef ^ seed;
        h2 = 0x41c6ce57 ^ seed;
        for (m = 0, len1 = str.length; m < len1; m++) {
          c = str[m];
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
  results1 = [];
  for (className in monkeyPatches) {
    classPatches = monkeyPatches[className];
    globalclass = globalThis[className];
    results1.push((function() {
      var results2;
      results2 = [];
      for (key in classPatches) {
        value = classPatches[key];
        if (globalclass[key] != null) {
          results2.push(console.log(`Can't monkey patch ${className}.${key} because it already exists.`));
        } else {
          results2.push(globalclass[key] = value);
        }
      }
      return results2;
    })());
  }
  return results1;
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
    var i, len1, len2, m, q, ref, results1, thing;
// If we've been passed any functions, run them and capture the return values.
    for (i = m = 0, len1 = stuff.length; m < len1; i = ++m) {
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
    results1 = [];
    for (i = q = 0, len2 = ref.length; q < len2; i = ++q) {
      thing = ref[i];
      if (!Function.equivalent(thing, stuff[i + 1])) {
        if (typeof context === "function") {
          context();
        }
        console.group(`%c${name}`, "font-weight:normal;");
        console.log("this:", thing);
        console.log("isnt:", stuff[i + 1]);
        results1.push(console.groupEnd());
      } else {
        results1.push(void 0);
      }
    }
    return results1;
  };
})();

// node_modules/doom/doom.coffee
(function() {
  var DOOM, act, attrNames, eventNames, propNames, read, styleNames, svgElms, svgNS, write, xlinkNS;
  svgNS = "http://www.w3.org/2000/svg";
  xlinkNS = "http://www.w3.org/1999/xlink";
  // This is used to cache normalized keys, and to provide defaults for keys that shouldn't be normalized
  attrNames = {
    gradientUnits: "gradientUnits",
    preserveAspectRatio: "preserveAspectRatio",
    startOffset: "startOffset",
    viewBox: "viewBox"
  };
  // common case-sensitive attr names should be listed here as needed — see svg.cofee in https://github.com/cdig/svg for reference
  eventNames = {
    blur: true,
    change: true,
    click: true,
    focus: true,
    input: true,
    keydown: true,
    keypress: true,
    keyup: true,
    mousedown: true,
    mouseenter: true,
    mouseleave: true,
    mousemove: true,
    mouseup: true,
    scroll: true
  };
  propNames = {
    childNodes: true,
    firstChild: true,
    innerHTML: true,
    lastChild: true,
    nextSibling: true,
    parentElement: true,
    parentNode: true,
    previousSibling: true,
    textContent: true,
    value: true
  };
  styleNames = {
    animation: true,
    animationDelay: true,
    background: true,
    borderRadius: true,
    color: true,
    display: true,
    fontSize: "html", // Only treat as a style if this is an HTML elm. SVG elms will treat this as an attribute.
    fontFamily: true,
    fontWeight: true,
    height: "html",
    left: true,
    letterSpacing: true,
    lineHeight: true,
    maxHeight: true,
    maxWidth: true,
    margin: true,
    marginTop: true,
    marginLeft: true,
    marginRight: true,
    marginBottom: true,
    minWidth: true,
    minHeight: true,
    opacity: "html",
    overflow: true,
    overflowX: true,
    overflowY: true,
    padding: true,
    paddingTop: true,
    paddingLeft: true,
    paddingRight: true,
    paddingBottom: true,
    pointerEvents: true,
    position: true,
    textDecoration: true,
    top: true,
    transform: "html",
    transition: true,
    visibility: true,
    width: "html",
    zIndex: true
  };
  // When creating an element, SVG elements require a special namespace, so we use this list to know whether a tag name is for an SVG or not
  svgElms = {
    circle: true,
    clipPath: true,
    defs: true,
    ellipse: true,
    g: true,
    image: true,
    line: true,
    linearGradient: true,
    mask: true,
    path: true,
    polygon: true,
    polyline: true,
    radialGradient: true,
    rect: true,
    stop: true,
    svg: true,
    symbol: true,
    text: true,
    textPath: true,
    tspan: true,
    use: true
  };
  read = function(elm, k) {
    var cache;
    if (propNames[k] != null) {
      cache = elm._DOOM_prop;
      if (cache[k] === void 0) {
        cache[k] = elm[k];
      }
      return cache[k];
    } else if (styleNames[k] != null) {
      cache = elm._DOOM_style;
      if (cache[k] === void 0) {
        cache[k] = elm.style[k];
      }
      return cache[k];
    } else {
      k = attrNames[k] != null ? attrNames[k] : attrNames[k] = k.replace(/([A-Z])/g, "-$1").toLowerCase(); // Normalize camelCase into kebab-case
      cache = elm._DOOM_attr;
      if (cache[k] === void 0) {
        cache[k] = elm.getAttribute(k);
      }
      return cache[k];
    }
  };
  write = function(elm, k, v) {
    var cache, isCached, ns;
    if (propNames[k] != null) {
      cache = elm._DOOM_prop;
      isCached = cache[k] === v;
      if (!isCached) {
        return elm[k] = cache[k] = v;
      }
    } else if ((styleNames[k] != null) && !(elm._DOOM_SVG && styleNames[k] === "html")) {
      cache = elm._DOOM_style;
      isCached = cache[k] === v;
      if (!isCached) {
        return elm.style[k] = cache[k] = v;
      }
    } else if (eventNames[k] != null) {
      cache = elm._DOOM_event;
      if (cache[k] === v) {
        return;
      }
      if (cache[k] != null) {
        throw "DOOM experimentally imposes a limit of one handler per event per object.";
      }
      // If we want to add multiple handlers for the same event to an object,
      // we need to decide how that interacts with passing null to remove events.
      // Should null remove all events? Probably. How do we track that? Keep an array of refs to handlers?
      // That seems slow and error prone.
      cache[k] = v;
      if (v != null) {
        return elm.addEventListener(k, v);
      } else {
        return elm.removeEventListener(k, v);
      }
    } else {
      k = attrNames[k] != null ? attrNames[k] : attrNames[k] = k.replace(/([A-Z])/g, "-$1").toLowerCase(); // Normalize camelCase into kebab-case
      cache = elm._DOOM_attr;
      if (cache[k] === v) {
        return;
      }
      cache[k] = v;
      ns = k === "xlink:href" ? xlinkNS : null; // Grab the namespace if needed
      if (ns != null) {
        if (v != null) {
          return elm.setAttributeNS(ns, k, v); // set DOM attribute
// v is explicitly set to null (not undefined)
        } else {
          return elm.removeAttributeNS(ns, k); // remove DOM attribute // check for null
        }
      } else {
        if (v != null) {
          return elm.setAttribute(k, v); // set DOM attribute
// v is explicitly set to null (not undefined)
        } else {
          return elm.removeAttribute(k); // remove DOM attribute // check for null
        }
      }
    }
  };
  act = function(elm, opts) {
    var k, v;
    // Initialize the caches
    if (elm._DOOM_attr == null) {
      elm._DOOM_attr = {};
    }
    if (elm._DOOM_event == null) {
      elm._DOOM_event = {};
    }
    if (elm._DOOM_prop == null) {
      elm._DOOM_prop = {};
    }
    if (elm._DOOM_style == null) {
      elm._DOOM_style = {};
    }
    if (typeof opts === "object") {
      for (k in opts) {
        v = opts[k];
        write(elm, k, v);
      }
      return elm;
    } else if (typeof opts === "string") {
      return read(elm, opts);
    }
  };
  // PUBLIC API ####################################################################################

  // The first arg can be an elm or array of elms
  // The second arg can be an object of stuff to update in the elm(s), in which case we'll return the elm(s).
  // Or it can be a string prop/attr/style to read from the elm(s), in which case we return the value(s).
  DOOM = function(elms, opts) {
    var elm, len1, m, results;
    if (typeof elms !== "array") {
      elms = [elms];
    }
    for (m = 0, len1 = elms.length; m < len1; m++) {
      elm = elms[m];
      ((function() {
        if (elm == null) {
          throw new Error("DOOM was called with a null element");
        }
      })());
    }
    if (opts == null) {
      throw new Error("DOOM was called with null options");
    }
    results = (function() {
      var len2, q, results1;
      results1 = [];
      for (q = 0, len2 = elms.length; q < len2; q++) {
        elm = elms[q];
        results1.push(act(elm, opts));
      }
      return results1;
    })();
    if (results.length === 1) {
      return results[0];
    } else {
      return results;
    }
  };
  DOOM.create = function(type, parent, opts) {
    var elm;
    if (svgElms[type] != null) {
      elm = document.createElementNS(svgNS, type);
      if (type === "svg") {
        (opts != null ? opts : opts = {}).xmlns = svgNS;
      } else {
        elm._DOOM_SVG = true;
      }
    } else {
      elm = document.createElement(type);
    }
    if (opts != null) {
      DOOM(elm, opts);
    }
    if (parent != null) {
      DOOM.append(parent, elm);
    }
    return elm;
  };
  DOOM.append = function(parent, child) {
    parent.appendChild(child);
    return child;
  };
  DOOM.prepend = function(parent, child) {
    if (parent.hasChildNodes()) {
      parent.insertBefore(child, parent.firstChild);
    } else {
      parent.appendChild(child);
    }
    return child;
  };
  DOOM.remove = function(elm, child) {
    if (child != null) {
      if (child.parentNode === elm) {
        elm.removeChild(child);
      }
      return child;
    } else {
      elm.remove();
      return elm;
    }
  };
  DOOM.empty = function(elm) {
    return elm.innerHTML = "";
  };
  if (this != null) {
    // Attach to this
    this.DOOM = DOOM;
  }
  if (typeof window !== "undefined" && window !== null) {
    // Attach to the window
    window.DOOM = DOOM;
  }
  if (Make != null) {
    // Integrate with Take & Make
    return Make("DOOM", DOOM);
  }
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
      var child, len1, m, ref;
      ref = tree.children;
      for (m = 0, len1 = ref.length; m < len1; m++) {
        child = ref[m];
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
      var child, len1, m, ref, res;
      if (tree[k] === v) {
        return tree;
      }
      if (tree.children) {
        ref = tree.children;
        for (m = 0, len1 = ref.length; m < len1; m++) {
          child = ref[m];
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
  return Make("Iterated", Iterated = function(...arg) {
    var didRunThisFrame, iteratedFunction, more, nextFrame, nextFrameRequested, ranOutOfTime, ref, requestNextFrame, run, runAgainNextFrame, startTime, timeLimit;
    ref = arg, [...arg] = ref, [iteratedFunction] = splice.call(arg, -1);
    [timeLimit = 5] = arg;
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
    var args, dirty, m, priority, queue, ref, resolve, time, type;
    dirty = false;
    ref = Job.queues;
    for (priority = m = ref.length - 1; m >= 0; priority = m += -1) {
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
    var len1, m, watcher;
    for (m = 0, len1 = watchers.length; m < len1; m++) {
      watcher = watchers[m];
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
    var handler, len1, m, ref;
    if (subs[name] != null) {
      ref = subs[name];
      for (m = 0, len1 = ref.length; m < len1; m++) {
        handler = ref[m];
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
      var childName, children, len1, m, size, sizes, stats, total;
      stats = (await Read.stat(path));
      if (stats == null) {
        return resolve(0);
      } else if (!stats.isDirectory()) {
        return resolve(stats.size);
      } else {
        total = 0;
        children = (await Read.async(path));
        sizes = (function() {
          var len1, m, results1;
          results1 = [];
          for (m = 0, len1 = children.length; m < len1; m++) {
            childName = children[m];
            results1.push(SizeOnDisk(Read.path(path, childName)));
          }
          return results1;
        })();
        for (m = 0, len1 = sizes.length; m < len1; m++) {
          size = sizes[m];
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
    var k, len1, m, part, parts;
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
    for (m = 0, len1 = parts.length; m < len1; m++) {
      part = parts[m];
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
  State.subscribe = function(...arg) {
    var base, cb, k, node, path, ref, runNow, weak;
    ref = arg, [...arg] = ref, [cb] = splice.call(arg, -1);
    [path = "", runNow = true, weak = false] = arg;
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
  State.unsubscribe = function(...arg) {
    var cb, k, node, path, ref;
    ref = arg, [...arg] = ref, [cb] = splice.call(arg, -1);
    [path = ""] = arg;
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
    var cb, dead, len1, len2, m, q, ref;
    if (node != null ? node._cbs : void 0) {
      dead = [];
      ref = node._cbs;
      for (m = 0, len1 = ref.length; m < len1; m++) {
        cb = ref[m];
        if (cb._state_weak && (v == null)) {
          dead.push(cb);
        } else {
          cb(v, changed);
        }
      }
      for (q = 0, len2 = dead.length; q < len2; q++) {
        cb = dead[q];
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
    var current, len1, len2, m, q, v;
    current = Read(path);
    if (current == null) {
      current = [];
    }
    if (Array.equal(arr, current)) {
      return;
    }
    for (m = 0, len1 = current.length; m < len1; m++) {
      v = current[m];
      if (indexOf.call(arr, v) < 0) {
        // Remove anything that's in the folder but not in our new array
        Write.sync.rm(Read.path(path, v), opts);
      }
    }
    for (q = 0, len2 = arr.length; q < len2; q++) {
      v = arr[q];
      if (indexOf.call(current, v) < 0) {
        // Save anything that's in our new array but not in the folder
        Write.sync.mkdir(Read.path(path, v), opts);
      }
    }
    return null;
  };
  return Write.async.copyInto = async function(src, destFolder, opts) {
    var _valid, childDestFolder, item, len1, m, ref, srcName, valid;
    srcName = Read.last(src);
    if ((await Read.isFolder(src))) {
      childDestFolder = Read.path(destFolder, srcName);
      Write.sync.mkdir(childDestFolder, opts);
      valid = true;
      ref = Read(src);
      for (m = 0, len1 = ref.length; m < len1; m++) {
        item = ref[m];
        _valid = Write.async.copyInto(Read.path(src, item), childDestFolder, opts);
        valid && (valid = _valid);
      }
      return valid;
    } else {
      return Write.sync.copyFile(src, Read.path(destFolder, srcName), opts);
    }
  };
});

// common/adsr-status.coffee
Take(["ADSR"], function(ADSR) {
  var elm;
  elm = document.querySelector("adsr-status");
  if (elm == null) {
    return;
  }
  return ADSR.watcher(function(count, delay) {
    count = String.pluralize(count, "%% ADSR");
    return elm.textContent = `${count} Active`;
  });
});

// common/db.coffee
Take(["IPC", "Log"], async function(IPC, Log) {
  var DB, bind, db, id, ignoreList, listeners, requestID, requests, returned;
  if (window.isDB) { // The DB process doesn't use this — use Ports instead
    return;
  }
  bind = new Promise(function(resolve) {
    return IPC.on("port", function({ports}, {id}) {
      return resolve([ports[0], id]);
    });
  });
  IPC.send("bind-db");
  [db, id] = (await bind);
  requests = {};
  listeners = {};
  ignoreList = {"memory-broadcast": "memory-broadcast"};
  requestID = 0;
  db.onmessage = function({
      data: [msg, ...data]
    }) {
    var cb, l, len1, m, results1;
    if (msg === "return") {
      return returned(...data);
    } else if (l = listeners[msg]) {
      results1 = [];
      for (m = 0, len1 = l.length; m < len1; m++) {
        cb = l[m];
        results1.push(cb(...data));
      }
      return results1;
    } else if (ignoreList[msg] == null) {
      return Log(`Message from DB dropped: ${msg}`);
    }
  };
  returned = function(requestID, resp) {
    var resolve;
    resolve = requests[requestID];
    delete requests[requestID];
    return resolve(resp);
  };
  return Make("DB", DB = {
    on: function(msg, cb) {
      return (listeners[msg] != null ? listeners[msg] : listeners[msg] = []).push(cb);
    },
    send: function(msg, ...args) {
      var response;
      requestID++ % Number.MAX_SAFE_INTEGER;
      response = new Promise(function(resolve) {
        return requests[requestID] = resolve;
      });
      db.postMessage([requestID, msg, ...args]);
      return response;
    }
  });
});

// common/editable-field.coffee
Take(["DOOM"], function(DOOM) {
  var EditableField;
  return Make("EditableField", EditableField = function(elm, cb, opts = {}) {
    var setValue, startValue, validate;
    if (DOOM(elm, "editableField") != null) {
      return;
    }
    startValue = null;
    DOOM(elm, {
      editableField: "",
      contenteditable: "",
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "off",
      spellcheck: "false"
    });
    setValue = function() {
      validate();
      if (elm._valid) {
        return cb(elm.textContent);
      }
    };
    validate = function() {
      elm.textContent = elm.textContent.trim();
      if (opts.validate != null) {
        elm._valid = opts.validate(elm.textContent);
        return DOOM(elm, {
          fieldInvalid: elm._valid ? null : ""
        });
      } else {
        return elm._valid = true;
      }
    };
    elm.addEventListener("input", function(e) {
      if (opts.saveOnInput) {
        return setValue();
      }
    });
    elm.addEventListener("focus", function() {
      validate();
      return startValue = elm.textContent;
    });
    elm.addEventListener("blur", function() {
      window.getSelection().empty();
      return setValue();
    });
    return elm.addEventListener("keydown", function(e) {
      switch (e.keyCode) {
        case 13:
          e.preventDefault();
          return elm.blur();
        case 27:
          elm.textContent = startValue;
          e.preventDefault();
          return elm.blur();
      }
    });
  });
});

// common/env-style.coffee
Take(["DOOM", "Env"], function(DOOM, Env) {
  return DOOM(document.body, {
    envDev: Env.isDev,
    envMac: Env.isMac
  });
});

// common/env.coffee
Take(["IPC"], async function(IPC) {
  var Env;
  Env = (await IPC.invoke("env"));
  Env.isMain = false;
  Env.isRender = true;
  return Make("Env", Env);
});

// common/find.coffee
// The main window sets up a global Command-F menu item, which will forward
// a "find" IPC event to the frontmost window. Here we catch it and pass it along
// to any interested parties in this window.
Take(["IPC", "PubSub"], function(IPC, {Pub, Sub}) {
  return IPC.on("find", function() {
    return Pub("find");
  });
});

// common/gear-view.coffee
Take(["DOOM", "DOMContentLoaded"], function(DOOM) {
  return Make("GearView", function(depth = 30, offset = -10, attrs = {}) {
    var gearElm, gearsElm, i, m, ref;
    gearsElm = document.querySelector("gear-view");
    gearElm = gearsElm;
    for (i = m = 0, ref = depth; (0 <= ref ? m <= ref : m >= ref); i = 0 <= ref ? ++m : --m) {
      gearElm = DOOM.create("span", gearElm); // For special effects
      gearElm = DOOM.create("div", gearElm, {
        style: `animation-delay: ${offset}s`
      });
    }
    return DOOM(gearsElm, attrs);
  });
});

// common/hold-to-run.coffee
Take(["DOOM", "DOMContentLoaded"], function(DOOM) {
  var HoldToRun, down, isDown, run, timeout, up;
  isDown = null;
  timeout = null;
  down = function(elm, time, cb) {
    return function(e) {
      if ((isDown == null) && e.button === 0) {
        isDown = elm;
        DOOM(isDown, {
          holdActive: "",
          holdLonger: null
        });
        return timeout = setTimeout(run(cb), time);
      }
    };
  };
  up = function() {
    if (isDown != null) {
      DOOM(isDown, {
        holdActive: null,
        holdLonger: ""
      });
      clearTimeout(timeout);
      return isDown = null;
    }
  };
  run = function(cb) {
    return function() {
      isDown = null;
      return cb();
    };
  };
  window.addEventListener("mouseup", up);
  return Make("HoldToRun", HoldToRun = function(elm, time, cb) {
    DOOM(elm, {
      holdToRun: ""
    });
    elm.style.setProperty("--hold-time", time + "ms");
    return elm.onmousedown = down(elm, time, cb);
  });
});

// common/icons.coffee
Take(["DOOM", "DOMContentLoaded"], function(DOOM) {
  return DOOM.create("svg", document.body, {
    id: "icons",
    innerHTML: `<defs>
  <path id="i-check" d="M20 100L75 155 185 45"/>
  <path id="i-ex" d="M35 165 L165 35 M35 35 L165 165"/>
  <path id="i-arrow" d="M40 100 L180 100 M110 30 L40 100 110 170"/>
  <path id="i-diamond" d="M165 100L100 165 35 100 100 35z"/>
  <g id="i-eye" transform="scale(1.8, 1.8) translate(0, 15)" stroke-width="10">
    <path d="M55.5 5c19 0 35.4 11.9 49.6 34.5C91 62.1 74.5 74 55.5 74S20.1 62.1 5.9 39.5C20 16.9 36.5 5 55.5 5z"/>
    <circle cx="55.5" cy="39.5" r="18.5"/>
  </g>
  <g id="i-file" stroke-width="18">
    <path d="M38,19 L108,19 C110,19 112,19 114,21 L159,65 C161,67 162,69 162,71 L162,180 L162,180 L38,180 L38,19 Z"/>
    <polyline points="162 70 108 70 108 19"/>
  </g>
</defs>`
  });
});

// common/ipc.coffee
Take([], function() {
  var IPC, ipcRenderer;
  ({ipcRenderer} = require("electron"));
  return Make("IPC", IPC = {
    send: function(...args) {
      return ipcRenderer.send(...args);
    },
    invoke: function(...args) {
      return ipcRenderer.invoke(...args);
    },
    on: function(channel, cb) {
      return ipcRenderer.on(channel, cb);
    },
    once: function(channel, cb) {
      return ipcRenderer.on(channel, cb);
    },
    // Promise-based handlers, optimized for use with await
    promise: {
      once: function(channel) {
        return new Promise(function(resolve) {
          return ipcRenderer.once(channel, resolve);
        });
      }
    }
  });
});

// common/job-status.coffee
Take(["Job"], function(Job) {
  var elm;
  elm = document.querySelector("job-status");
  if (elm == null) {
    return;
  }
  return Job.watcher(function(count, delay) {
    count = String.pluralize(count, "%% Job");
    elm.firstChild.textContent = `${count} Queued`;
    return elm.lastChild.textContent = `(${delay | 0}ms)`;
  });
});

// common/memory-field.coffee
Take(["DOOM", "EditableField", "Memory"], function(DOOM, EditableField, Memory) {
  var MemoryField;
  return Make("MemoryField", MemoryField = function(memoryKey, elm, opts = {}) {
    var focused, setValue;
    // Flag whether we've been set up on an elm already. That makes it safe to create a
    // MemoryField inside a repeatedly-run Render call.
    if (DOOM(elm, "memoryField") != null) {
      return;
    }
    DOOM(elm, {
      memoryField: ""
    });
    focused = false;
    elm.addEventListener("focus", function(e) {
      return focused = true;
    });
    elm.addEventListener("blur", function(e) {
      return focused = false;
    });
    Memory.subscribe("Read Only", true, function(v) {
      return DOOM(elm, {
        contenteditable: v ? null : ""
      });
    });
    Memory.subscribe(memoryKey, true, function(value) {
      if (!value) {
        return;
      }
      if (focused) {
        return;
      }
      return elm.textContent = value;
    });
    setValue = function(value) {
      Memory(memoryKey, value);
      return typeof opts.update === "function" ? opts.update(value) : void 0;
    };
    return EditableField(elm, setValue, opts);
  });
});

// common/memory.coffee
Take([], async function() {
  var DB, Memory, Ports, conditionalSet, getAt, j, localNotify, memory, remoteNotify, runCbs, runCbsAbove, runCbsWithin, set, sub, subscriptions;
  memory = null; // Stores all the values committed to Memory
  subscriptions = {
    _cbs: [] // Notified when specific paths are changed
  };
  if (window.isDB) {
    Ports = (await Take.async("Ports"));
    // DB owns the cannonical copy of Memory, so we initialize to an empty object to store it all
    memory = {};
    // Other windows will want to initialize themselves with a clone our Memory
    Ports.on("clone-memory", function() {
      return memory;
    });
    // Other windows will notify us when they want to change something in Memory
    Ports.on("memory-notify-db", function(path, v) {
      return Memory(path, v);
    });
    // When the DB's Memory changes, we should notify other windows
    remoteNotify = function(path, v) {
      return Ports.send("memory-broadcast", path, v);
    };
  } else {
    DB = (await Take.async("DB"));
    // The DB owns the cannonical copy of Memory, so we initialize to a clone of whatever it has
    memory = (await DB.send("clone-memory"));
    // Notify the DB whenever anything in our Memory changes
    remoteNotify = function(path, v) {
      return DB.send("memory-notify-db", path, v);
    };
    // When the DB's memory changes, it'll notify us
    DB.on("memory-broadcast", function(path, v) {
      return Memory(path, v, {
        remote: false
      });
    });
  }
  // This is how we support "deep.paths":
  // Pass a tree-like object, and a dot-separated string of keys.
  // We'll return the penultimate node in the tree, and the final key.
  // (Stopping just above the final node allows you to do assignment.)
  // For uniformity, pass "" to get back the tree root wrapped in a node with a "" key.
  getAt = function(node, path) {
    var k, len1, m, part, parts;
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
    for (m = 0, len1 = parts.length; m < len1; m++) {
      part = parts[m];
      node = node[part] != null ? node[part] : node[part] = {};
    }
    return [node, k];
  };
  Make.async("Memory", Memory = function(path = "", v, {remote = true, immutable = false} = {}) {
    var k, node, old;
    [node, k] = getAt(memory, path);
    if (v === void 0) { // Just a read
      return node[k];
    }
    if (!immutable) {
      
      // It's not safe to take something out of Memory, mutate it, and commit it again.
      // The immutable option tells us the caller promises they're not doing that.
      // Otherwise, we clone values before writing them.
      v = Function.clone(v);
    }
    if ((Object.type(v) || Array.type(v)) && v === node[k]) {
      throw "Did you take something out of Memory, mutate it, and commit it again?";
    }
    if (path === "") {
      throw Error("You're not allowed to set the Memory root");
    }
    old = node[k];
    if (v != null) {
      node[k] = v;
    } else {
      delete node[k];
    }
    if (Function.notEquivalent(v, old)) {
      queueMicrotask(function() {
        localNotify(path, v);
        if (remote) {
          return remoteNotify(path, v);
        }
      });
    }
    return v;
  });
  conditionalSet = function(path, v, pred) {
    var doSet, k, node;
    [node, k] = getAt(memory, path);
    doSet = pred(node[k], v);
    if (doSet) {
      Memory(path, v);
    }
    return doSet;
  };
  // These are useful because they return true if a change was made
  Memory.change = function(path, v) {
    return conditionalSet(path, v, Function.notEquivalent);
  };
  Memory.default = function(path, v) {
    return conditionalSet(path, v, Function.notExists);
  };
  // This is useful because it reduces the need to update Memory in a loop,
  // which triggers a lot of (possibly pointless) notifications.
  // Reminder that Object.merge doesn't handle arrays, so maybe
  // limit the use of this function to primitives (since it implies immutable).
  Memory.merge = function(path, v) {
    return Memory(path, Object.merge(v, Memory(path)), {
      immutable: true
    });
  };
  // These are useful because it offers a nice syntax for updating existing values in Memory,
  // with support for async, either mutably or immutably.
  Memory.update = async function(path, fn) {
    return Memory(path, (await fn(Memory(path))), {
      immutable: true
    });
  };
  Memory.mutate = async function(path, fn) {
    return Memory(path, (await fn(Memory.clone(path))), {
      immutable: true
    });
  };
  // This is a convenience function for reading something from Memory that is pre-cloned
  // (if necessary) to avoid mutability issues.
  Memory.clone = function(path) {
    return Function.clone(Memory(path));
  };
  Memory.subscribe = function(...arg) {
    var base, cb, k, node, path, ref, runNow, weak;
    ref = arg, [...arg] = ref, [cb] = splice.call(arg, -1);
    [path = "", runNow = true, weak = false] = arg;
    if (!String.type(path)) { // Avoid errors if you try say subscribe(runNow, cb)
      throw "Invalid subscribe path";
    }
    [node, k] = getAt(subscriptions, path);
    ((base = (node[k] != null ? node[k] : node[k] = {}))._cbs != null ? base._cbs : base._cbs = []).push(cb);
    cb._memory_weak = weak; // ... this is fine 🐕☕️🔥
    if (runNow) {
      return cb(Memory(path));
    }
  };
  Memory.unsubscribe = function(...arg) {
    var cb, k, node, path, ref;
    ref = arg, [...arg] = ref, [cb] = splice.call(arg, -1);
    [path = ""] = arg;
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
    // console.log "  within:"
    runCbsWithin(node[k], v);
    // console.log "  at path:"
    runCbs(node[k], v, v);
    // console.log "  above:"
    changes = runCbsAbove(path, v);
    // console.log "  root:"
    return runCbs(subscriptions, memory, changes);
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
    runCbs(node[k], Memory(pathAbove), changesAbove);
    return runCbsAbove(pathAbove, changesAbove);
  };
  runCbs = function(node, v, changed) {
    var cb, dead, len1, len2, m, q, ref;
    if (node != null ? node._cbs : void 0) {
      dead = [];
      ref = node._cbs;
      for (m = 0, len1 = ref.length; m < len1; m++) {
        cb = ref[m];
        if (cb._memory_weak && (v == null)) {
          dead.push(cb);
        } else {
          cb(v, changed);
        }
      }
      for (q = 0, len2 = dead.length; q < len2; q++) {
        cb = dead[q];
        Array.pull(node._cbs, cb);
      }
    }
    return null;
  };
  // TESTS
  j = function(x) {
    return JSON.stringify(x);
  };
  sub = function(p) {
    console.log(p);
    return Memory.subscribe(p, false, function(v, changed) {
      return console.log("    " + p, j(v), j(changed));
    });
  };
  // Memory.subscribe p, false, (v, changed)-> console.log "    strong  " + p, j(v), j changed
  // Memory.subscribe p, false, true, (v, changed)-> console.log "    weak    " + p, j(v), j changed
  return set = function(p, v, msg) {
    if (msg != null) {
      console.log("\n\n" + msg);
    }
    console.log(`\nSET ${p} to`, j(v));
    return Memory(p, v);
  };
});

// Note: changed only exists when we've modified a subpath rather than the path specified by the listener

// console.log "SUBSCRIBERS"
// sub "assets.A.id"
// sub "assets.A.files"
// sub "assets.A"
// sub "assets.B"
// sub "assets"
// sub "squibs - should never see this run"
// sub ""

// set "assets.A", {id:0, x: 0}, "create an obj"
// set "assets.A.y", 0, "create a primitive"
// set "assets.A.id", 1, "change a primitive"
// # set "assets.A.x.wat", 0, "drill into a primitive!?" — error
// set "assets.A.id", {in:0}, "replace a primitive with an obj"
// set "assets.A.id", null, "delete an obj"
// set "assets.B", {id:9}, "create another obj"
// set "fork", {}, "create, no subscribers"
// set "assets", null, "delete an obj with many subs"
// # set "", 3, "set root — should error"

// common/on-screen.coffee
Take([], function() {
  var OnScreen, elms, observer, observerFn;
  elms = new WeakMap();
  observerFn = function(entries) {
    var cb, entry, len1, m, results1;
    results1 = [];
    for (m = 0, len1 = entries.length; m < len1; m++) {
      entry = entries[m];
      if (cb = elms.get(entry.target)) {
        results1.push(cb(entry.target, entry.isIntersecting));
      } else {
        results1.push(void 0);
      }
    }
    return results1;
  };
  observer = new IntersectionObserver(observerFn, {
    root: document.querySelector("[on-screen-container]"),
    rootMargin: "1000px" // Start loading images a little before they scroll into view
  });
  Make.async("OnScreen", OnScreen = function(elm, cb) {
    if (elms.has(elm)) {
      throw Error("Overwriting existing OnScreen");
    }
    elms.set(elm, cb);
    return observer.observe(elm);
  });
  return OnScreen.off = function(elm) {
    return elms.delete(elm);
  };
});

// common/rainbow-before.coffee
Take(["ADSR", "Rainbow", "DOMContentLoaded"], function(ADSR, Rainbow) {
  var len1, m, ref, results1, scroll, scrollable;
  scroll = ADSR(1, 1, function() {
    return Rainbow.move(0.5);
  });
  scroll();
  ref = document.querySelectorAll(".scrollable");
  results1 = [];
  for (m = 0, len1 = ref.length; m < len1; m++) {
    scrollable = ref[m];
    results1.push(scrollable.addEventListener("wheel", scroll, {
      passive: true
    }));
  }
  return results1;
});

// common/rainbow-colors.coffee
(function() {
  var colors;
  colors = ["hsl(20, 100%, 50%)", "hsl(170, 100%, 50%)", "hsl(250, 100%, 50%)"];
  colors = Array.shuffle(colors);
  document.body.style.setProperty("--rainbow-a", colors[0]);
  document.body.style.setProperty("--rainbow-b", colors[1]);
  return document.body.style.setProperty("--rainbow-c", colors[2]);
})();

// common/rainbow.coffee
Take(["State"], function(State) {
  var Rainbow;
  State("rainbow-before-delay", Math.randInt(0, -1000));
  Make("Rainbow", Rainbow = {
    move: function(delta) {
      var delay;
      delay = State("rainbow-before-delay") - delta;
      State("rainbow-before-delay", delay);
      document.body.style.setProperty("--rainbow-before-delay", `${delay}ms`);
      return document.body.style.setProperty("--rainbow-focus", d3.lch(70, 30, -delay / 2));
    }
  });
  return window.addEventListener("keydown", function() {
    return Rainbow.move(4);
  });
});

// common/search-box.coffee
Take(["ADSR", "PubSub", "State", "DOMContentLoaded"], function(ADSR, {Pub, Sub}, State) {
  var change, elm, focused;
  elm = document.querySelector("search-box input");
  if (elm == null) {
    return;
  }
  focused = false;
  change = ADSR(1, 1, function(e) {
    return State("search", elm.value);
  });
  State.subscribe("search", false, function(v) {
    if (!focused) {
      return elm.value = v;
    }
  });
  elm.addEventListener("change", change);
  elm.addEventListener("input", change);
  elm.onfocus = function() {
    return focused = true;
  };
  elm.onblur = function() {
    return focused = false;
  };
  return Sub("find", function() {
    return elm.focus();
  });
});

// common/subscriptions/search-render.coffee
Take(["PubSub", "State"], function({Pub}, State) {
  return State.subscribe("search", false, function() {
    return Pub("Render");
  });
});

// common/tag-list.coffee
Take(["Memory"], function(Memory) {
  var TagList, makeTag;
  Make.async("TagList", TagList = function(asset, opts = {}) {
    var frag, len1, len2, m, q, sortedTags, specialTags, tag;
    specialTags = Memory("specialTags");
    sortedTags = Array.sortAlphabetic(asset.tags);
    // Make all the special tags first, so they come at the start of the list
    frag = new DocumentFragment();
    for (m = 0, len1 = sortedTags.length; m < len1; m++) {
      tag = sortedTags[m];
      if (specialTags[tag] != null) {
        frag.append(makeTag(tag, opts, true));
      }
    }
    for (q = 0, len2 = sortedTags.length; q < len2; q++) {
      tag = sortedTags[q];
      if (specialTags[tag] == null) {
        frag.append(makeTag(tag, opts, false));
      }
    }
    return frag;
  });
  return makeTag = function(tag, opts, special) {
    var elm;
    elm = DOOM.create("tag-item", null, {
      textContent: tag
    });
    if (special) {
      DOOM(elm, {
        special: ""
      });
    }
    if (opts.click != null) {
      DOOM(elm, {
        click: function(e) {
          if (!Memory("Read Only")) {
            return opts.click(tag, elm);
          }
        }
      });
    }
    if (opts.removeFn != null) {
      DOOM.create("span", elm, {
        textContent: "x",
        class: "remove",
        click: function(e) {
          if (!Memory("Read Only")) {
            return opts.removeFn(tag);
          }
        }
      });
    }
    return elm;
  };
});

// common/validations.coffee
Take([], function() {
  var Validations;
  return Make("Validations", Validations = {
    asset: {
      name: function(v) {
        return -1 === v.search(/[.:\/\\]/);
      }
    },
    file: function(v) {
      return -1 === v.search(/[:\/\\]/);
    }
  });
});

// common/window-events.coffee
Take(["IPC"], function(IPC) {
  IPC.on("focus", function() {
    return document.documentElement.classList.remove("blur");
  });
  IPC.on("blur", function() {
    return document.documentElement.classList.add("blur");
  });
  IPC.on("maximize", function() {
    return document.documentElement.classList.add("maximize");
  });
  return IPC.on("unmaximize", function() {
    return document.documentElement.classList.remove("maximize");
  });
});

// common/windows-menu.coffee
Take(["IPC", "Log", "DOMContentLoaded"], function(IPC, Log) {
  var close, max, min, restore;
  min = document.querySelector("windows-menu #min");
  max = document.querySelector("windows-menu #max");
  restore = document.querySelector("windows-menu #restore");
  close = document.querySelector("windows-menu #close");
  if (!(min && max && restore && close)) {
    return;
  }
  min.addEventListener("click", function(e) {
    return IPC.send("minimize-window");
  });
  max.addEventListener("click", function(e) {
    return IPC.send("maximize-window");
  });
  restore.addEventListener("click", function(e) {
    return IPC.send("unmaximize-window");
  });
  return close.addEventListener("click", function(e) {
    return IPC.send("close-window");
  });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR29FOzs7O0FBQ3BFO0FBRG9FLElBQUEsYUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUE7RUFBQTs7O0FBSXBFLE1BQU8sOENBQUEsSUFBUywrQ0FBaEI7OztFQUlFLElBQUEsR0FBTztFQUNQLElBQUEsR0FBTztFQUNQLGFBQUEsR0FBZ0I7RUFFYixDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBRUwsUUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLGVBQUEsRUFBQSxzQkFBQSxFQUFBLG1CQUFBLEVBQUEsa0JBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLGdCQUFBLEVBQUEsY0FBQSxFQUFBLE1BQUEsRUFBQSxZQUFBLEVBQUEsUUFBQSxFQUFBLE9BQUEsRUFBQSxrQkFBQSxFQUFBLGNBQUEsRUFBQTtJQUFJLElBQUEsR0FBTyxDQUFBO0lBQ1AsYUFBQSxHQUFnQjtJQUNoQixjQUFBLEdBQWlCO0lBQ2pCLHNCQUFBLEdBQXlCO0lBQ3pCLGVBQUEsR0FBa0I7SUFDbEIsZ0JBQUEsR0FBbUI7SUFDbkIsY0FBQSxHQUFpQjtJQUVqQixJQUFBLEdBQU8sUUFBQSxDQUFDLElBQUQsRUFBTyxRQUFRLElBQWYsQ0FBQTtNQUVMLElBQXlCLFlBQXpCOztBQUFBLGVBQU8sS0FBQSxDQUFNLElBQU4sRUFBUDtPQUROOzthQUlNLFFBQUEsQ0FBUyxJQUFULEVBQWUsS0FBZjtJQUxLO0lBUVAsSUFBQSxHQUFPLFFBQUEsQ0FBQyxLQUFELEVBQVEsUUFBUixDQUFBO01BRUwsSUFBb0MsYUFBcEM7O0FBQUEsZUFBTyxhQUFhLENBQUMsS0FBZCxDQUFBLEVBQVA7T0FETjs7YUFJTSxPQUFBLENBQVEsS0FBUixFQUFlLFFBQWY7SUFMSyxFQWhCWDs7SUF5QkksSUFBSSxDQUFDLEtBQUwsR0FBYSxRQUFBLENBQUMsSUFBRCxFQUFPLFFB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QzVCLEdBQUcsQ0FBQyxJQUFKLENBQVMsaUJBQVQ7RUFENEIsQ0FBOUI7RUFHQSxPQUFPLENBQUMsZ0JBQVIsQ0FBeUIsT0FBekIsRUFBa0MsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUNoQyxHQUFHLENBQUMsSUFBSixDQUFTLG1CQUFUO0VBRGdDLENBQWxDO1NBR0EsS0FBSyxDQUFDLGdCQUFOLENBQXVCLE9BQXZCLEVBQWdDLFFBQUEsQ0FBQyxDQUFELENBQUE7V0FDOUIsR0FBRyxDQUFDLElBQUosQ0FBUyxjQUFUO0VBRDhCLENBQWhDO0FBakJ1QyxDQUF6QyIsInNvdXJjZXNDb250ZW50IjpbIiMgbm9kZV9tb2R1bGVzL3Rha2UtYW5kLW1ha2Uvc291cmNlL3Rha2UtYW5kLW1ha2UuY29mZmVlXG4jIFNpbmNlIHRoaXMgaXMgdHlwaWNhbGx5IHRoZSBmaXJzdCBiaXQgb2YgY29kZSBpbmNsdWRlZCBpbiBvdXIgYmlnIGNvbXBpbGVkIGFuZFxuIyBjb25jYXRlbmF0ZWQgSlMgZmlsZXMsIHRoaXMgaXMgYSBncmVhdCBwbGFjZSB0byBkZW1hbmQgc3RyaWN0bmVzcy4gQ29mZmVlU2NyaXB0XG4jIGRvZXMgbm90IGFkZCBzdHJpY3Qgb24gaXRzIG93biwgYnV0IGl0IHdpbGwgcGVybWl0IGFuZCBlbmZvcmNlIGl0LlxuXCJ1c2Ugc3RyaWN0XCI7XG5cbiMgQmFpbCBpZiBUYWtlJk1ha2UgaXMgYWxyZWFkeSBydW5uaW5nIGluIHRoaXMgc2NvcGUsIG9yIGlmIHNvbWV0aGluZyBlbHNlIGlzIHVzaW5nIG91ciBuYW1lc1xudW5sZXNzIFRha2U/IG9yIE1ha2U/XG5cbiAgIyBXZSBkZWNsYXJlIG91ciBnbG9iYWxzIHN1Y2ggdGhhdCB0aGV5J3JlIHZpc2libGUgZXZlcnl3aGVyZSB3aXRoaW4gdGhlIGN1cnJlbnQgc2NvcGUuXG4gICMgVGhpcyBhbGxvd3MgZm9yIG5hbWVzcGFjaW5nIOKAlCBhbGwgdGhpbmdzIHdpdGhpbiBhIGdpdmVuIHNjb3BlIHNoYXJlIGEgY29weSBvZiBUYWtlICYgTWFrZS5cbiAgVGFrZSA9IG51bGxcbiAgTWFrZSA9IG51bGxcbiAgRGVidWdUYWtlTWFrZSA9IG51bGxcblxuICBkbyAoKS0+XG5cbiAgICBtYWRlID0ge31cbiAgICB3YWl0aW5nVGFrZXJzID0gW11cbiAgICB0YWtlcnNUb05vdGlmeSA9IFtdXG4gICAgYWxyZWFkeVdhaXRpbmdUb05vdGlmeSA9IGZhbHNlXG4gICAgYWxyZWFkeUNoZWNraW5nID0gZmFsc2VcbiAgICBtaWNyb3Rhc2tzTmVlZGVkID0gMFxuICAgIG1pY3JvdGFza3NVc2VkID0gMFxuXG4gICAgTWFrZSA9IChuYW1lLCB2YWx1ZSA9IG5hbWUpLT5cbiAgICAgICMgRGVidWcg4oCUIGNhbGwgTWFrZSgpIGluIHRoZSBjb25zb2xlIHRvIHNlZSB3aGF0IHdlJ3ZlIHJlZ3N0ZXJlZFxuICAgICAgcmV0dXJuIGNsb25lIG1hZGUgaWYgbm90IG5hbWU/XG5cbiAgICAgICMgU3luY2hyb25vdXMgcmVnaXN0ZXIsIHJldHVybnMgdmFsdWVcbiAgICAgIHJlZ2lzdGVyIG5hbWUsIHZhbHVlXG5cblxuICAgIFRha2UgPSAobmVlZHMsIGNhbGxiYWNrKS0+XG4gICAgICAjIERlYnVnIOKAlCBjYWxsIFRha2UoKSBpbiB0aGUgY29uc29sZSB0byBzZWUgd2hhdCB3ZSdyZSB3YWl0aW5nIGZvclxuICAgICAgcmV0dXJuIHdhaXRpbmdUYWtlcnMuc2xpY2UoKSBpZiBub3QgbmVlZHM/XG5cbiAgICAgICMgU3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyByZXNvbHZlLCByZXR1cm5zIHZhbHVlIG9yIG9iamVjdCBvZiB2YWx1ZXNcbiAgICAgIHJlc29sdmUgbmVlZHMsIGNhbGxiYWNrXG5cblxuICAgICMgQSB2YXJpYXRpb24gb2YgTWFrZSB0aGF0IGRlZmVycyBjb21taXR0aW5nIHRoZSB2YWx1ZVxuICAgIE1ha2UuYXN5bmMgPSAobmFtZSwgdmFsdWUgPSBuYW1lKS0+XG4gICAgICBxdWV1ZU1pY3JvdGFzayAoKS0+XG4gICAgICAgIE1ha2UgbmFtZSwgdmFsdWVcblxuXG4gICAgIyBBIHZhcmlhdGlvbiBvZiBUYWtlIHRoYXQgcmV0dXJucyBhIHByb21pc2VcbiAgICBUYWtlLmFzeW5jID0gKG5lZWRzKS0+XG4gICAgICBuZXcgUHJvbWlzZSAocmVzKS0+XG4gICAgICAgIFRha2UgbmVlZHMsICgpLT5cbiAgICAgICAgICAjIFJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCBhIHZhbHVlIG9yIG9iamVjdCBvZiB2YWx1ZXNcbiAgICAgICAgICByZXMgc3luY2hyb25vdXNSZXNvbHZlIG5lZWRzXG5cblxuICAgIERlYnVnVGFrZU1ha2UgPSAoKS0+XG4gICAgICBvdXRwdXQgPVxuICAgICAgICBtaWNyb3Rhc2tzTmVlZGVkOiBtaWNyb3Rhc2tzTmVlZGVkXG4gICAgICAgIG1pY3JvdGFza3NVc2VkOiBtaWNyb3Rhc2tzVXNlZFxuICAgICAgICB1bnJlc29sdmVkOiB7fVxuICAgICAgZm9yIHdhaXRpbmcgaW4gd2FpdGluZ1Rha2Vyc1xuICAgICAgICBmb3IgbmVlZCBpbiB3YWl0aW5nLm5lZWRzXG4gICAgICAgICAgdW5sZXNzIG1hZGVbbmVlZF0/XG4gICAgICAgICAgICBvdXRwdXQudW5yZXNvbHZlZFtuZWVkXSA/PSAwXG4gICAgICAgICAgICBvdXRwdXQudW5yZXNvbHZlZFtuZWVkXSsrXG4gICAgICByZXR1cm4gb3V0cHV0XG5cblxuICAgIHJlZ2lzdGVyID0gKG5hbWUsIHZhbHVlKS0+XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgbWF5IG5vdCBNYWtlKFxcXCJcXFwiKSBhbiBlbXB0eSBzdHJpbmcuXCIpIGlmIG5hbWUgaXMgXCJcIlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiWW91IG1heSBub3QgTWFrZSgpIHRoZSBzYW1lIG5hbWUgdHdpY2U6ICN7bmFtZX1cIikgaWYgbWFkZVtuYW1lXT9cbiAgICAgIG1hZGVbbmFtZV0gPSB2YWx1ZVxuICAgICAgY2hlY2tXYWl0aW5nVGFrZXJzKClcbiAgICAgIHZhbHVlXG5cblxuICAgIGNoZWNrV2FpdGluZ1Rha2VycyA9ICgpLT5cbiAgICAgIHJldHVybiBpZiBhbHJlYWR5Q2hlY2tpbmcgIyBQcmV2ZW50IHJlY3Vyc2lvbiBmcm9tIE1ha2UoKSBjYWxscyBpbnNpZGUgbm90aWZ5KClcbiAgICAgIGFscmVhZHlDaGVja2luZyA9IHRydWVcblxuICAgICAgIyBDb21tZW50cyBiZWxvdyBhcmUgdG8gaGVscCByZWFzb24gdGhyb3VnaCB0aGUgKHBvdGVudGlhbGx5KSByZWN1cnNpdmUgYmVoYXZpb3VyXG5cbiAgICAgIGZvciB0YWtlciwgaW5kZXggaW4gd2FpdGluZ1Rha2VycyAjIERlcGVuZHMgb24gYHdhaXRpbmdUYWtlcnNgXG4gICAgICAgIGlmIGFsbE5lZWRzQXJlTWV0KHRha2VyLm5lZWRzKSAjIERlcGVuZHMgb24gYG1hZGVgXG4gICAgICAgICAgd2FpdGluZ1Rha2Vycy5zcGxpY2UoaW5kZXgsIDEpICMgTXV0YXRlcyBgd2FpdGluZ1Rha2Vyc2BcbiAgICAgICAgICBub3RpZnkodGFrZXIpICMgQ2FsbHMgdG8gTWFrZSgpIG9yIFRha2UoKSB3aWxsIG11dGF0ZSBgbWFkZWAgb3IgYHdhaXRpbmdUYWtlcnNgXG4gICAgICAgICAgYWxyZWFkeUNoZWNraW5nID0gZmFsc2VcbiAgICAgICAgICByZXR1cm4gY2hlY2tXYWl0aW5nVGFrZXJzKCkgIyBSZXN0YXJ0OiBgd2FpdGluZ1Rha2Vyc2AgKGFuZCBwb3NzaWJseSBgbWFkZWApIHdlcmUgbXV0YXRlZFxuXG4gICAgICBhbHJlYWR5Q2hlY2tpbmcgPSBmYWxzZVxuXG5cbiAgICBhbGxOZWVkc0FyZU1ldCA9IChuZWVkcyktPlxuICAgICAgcmV0dXJuIG5lZWRzLmV2ZXJ5IChuYW1lKS0+IG1hZGVbbmFtZV0/XG5cblxuICAgIHJlc29sdmUgPSAobmVlZHMsIGNhbGxiYWNrKS0+XG4gICAgICAjIFdlIGFsd2F5cyB0cnkgdG8gcmVzb2x2ZSBib3RoIHN5bmNocm9ub3VzbHkgYW5kIGFzeW5jaHJvbm91c2x5XG4gICAgICBhc3luY2hyb25vdXNSZXNvbHZlIG5lZWRzLCBjYWxsYmFjayBpZiBjYWxsYmFjaz9cbiAgICAgIHN5bmNocm9ub3VzUmVzb2x2ZSBuZWVkc1xuXG5cbiAgICBhc3luY2hyb25vdXNSZXNvbHZlID0gKG5lZWRzLCBjYWxsYmFjayktPlxuICAgICAgaWYgbmVlZHMgaXMgXCJcIlxuICAgICAgICBuZWVkcyA9IFtdXG4gICAgICBlbHNlIGlmIHR5cGVvZiBuZWVkcyBpcyBcInN0cmluZ1wiXG4gICAgICAgIG5lZWRzID0gW25lZWRzXVxuXG4gICAgICB0YWtlciA9IG5lZWRzOiBuZWVkcywgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgICAgIGlmIGFsbE5lZWRzQXJlTWV0IG5lZWRzXG4gICAgICAgIHRha2Vyc1RvTm90aWZ5LnB1c2ggdGFrZXJcbiAgICAgICAgbWljcm90YXNrc05lZWRlZCsrXG4gICAgICAgIHVubGVzcyBhbHJlYWR5V2FpdGluZ1RvTm90aWZ5XG4gICAgICAgICAgYWxyZWFkeVdhaXRpbmdUb05vdGlmeSA9IHRydWVcbiAgICAgICAgICBxdWV1ZU1pY3JvdGFzayBub3RpZnlUYWtlcnMgIyBQcmVzZXJ2ZSBhc3luY2hyb255XG4gICAgICAgICAgbWljcm90YXNrc1VzZWQrK1xuICAgICAgZWxzZVxuICAgICAgICB3YWl0aW5nVGFrZXJzLnB1c2ggdGFrZXJcblxuXG4gICAgc3luY2hyb25vdXNSZXNvbHZlID0gKG5lZWRzKS0+XG4gICAgICBpZiB0eXBlb2YgbmVlZHMgaXMgXCJzdHJpbmdcIlxuICAgICAgICByZXR1cm4gbWFkZVtuZWVkc11cbiAgICAgIGVsc2VcbiAgICAgICAgbyA9IHt9XG4gICAgICAgIG9bbl0gPSBtYWRlW25dIGZvciBuIGluIG5lZWRzXG4gICAgICAgIHJldHVybiBvXG5cblxuICAgIG5vdGlmeVRha2VycyA9ICgpLT5cbiAgICAgIGFscmVhZHlXYWl0aW5nVG9Ob3RpZnkgPSBmYWxzZVxuICAgICAgdGFrZXJzID0gdGFrZXJzVG9Ob3RpZnlcbiAgICAgIHRha2Vyc1RvTm90aWZ5ID0gW11cbiAgICAgIG5vdGlmeSB0YWtlciBmb3IgdGFrZXIgaW4gdGFrZXJzXG4gICAgICBudWxsXG5cblxuICAgIG5vdGlmeSA9ICh0YWtlciktPlxuICAgICAgcmVzb2x2ZWROZWVkcyA9IHRha2VyLm5lZWRzLm1hcCAobmFtZSktPiBtYWRlW25hbWVdXG4gICAgICB0YWtlci5jYWxsYmFjay5hcHBseShudWxsLCByZXNvbHZlZE5lZWRzKVxuXG5cbiAgICAjIElFMTEgZG9lc24ndCBzdXBwb3J0IE9iamVjdC5hc3NpZ24oe30sIG9iaiksIHNvIHdlIGp1c3QgdXNlIG91ciBvd25cbiAgICBjbG9uZSA9IChvYmopLT5cbiAgICAgIG91dCA9IHt9XG4gICAgICBvdXRba10gPSB2IGZvciBrLHYgb2Ygb2JqXG4gICAgICBvdXRcblxuXG4gICAgIyBXZSB3YW50IHRvIGFkZCBhIGZldyBoYW5keSBvbmUtdGltZSBldmVudHMuXG4gICAgIyBIb3dldmVyLCB3ZSBkb24ndCBrbm93IGlmIHdlJ2xsIGJlIHJ1bm5pbmcgaW4gYSBicm93c2VyLCBvciBpbiBub2RlLlxuICAgICMgVGh1cywgd2UgbG9vayBmb3IgdGhlIHByZXNlbmNlIG9mIGEgXCJ3aW5kb3dcIiBvYmplY3QgYXMgb3VyIGNsdWUuXG4gICAgaWYgd2luZG93P1xuXG4gICAgICBhZGRMaXN0ZW5lciA9IChldmVudE5hbWUpLT5cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgZXZlbnROYW1lLCBoYW5kbGVyID0gKGV2ZW50T2JqZWN0KS0+XG4gICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIgZXZlbnROYW1lLCBoYW5kbGVyXG4gICAgICAgICAgTWFrZSBldmVudE5hbWUsIGV2ZW50T2JqZWN0XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZCAjIHByZXZlbnQgdW5sb2FkIGZyb20gb3BlbmluZyBhIHBvcHVwXG5cbiAgICAgIGFkZExpc3RlbmVyIFwiYmVmb3JldW5sb2FkXCJcbiAgICAgIGFkZExpc3RlbmVyIFwiY2xpY2tcIlxuICAgICAgYWRkTGlzdGVuZXIgXCJ1bmxvYWRcIlxuXG4gICAgICAjIFNpbmNlIHdlIGhhdmUgYSB3aW5kb3cgb2JqZWN0LCBpdCdzIHByb2JhYmx5IHNhZmUgdG8gYXNzdW1lIHdlIGhhdmUgYSBkb2N1bWVudCBvYmplY3RcbiAgICAgIHN3aXRjaCBkb2N1bWVudC5yZWFkeVN0YXRlXG4gICAgICAgIHdoZW4gXCJsb2FkaW5nXCJcbiAgICAgICAgICBhZGRMaXN0ZW5lciBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIGFkZExpc3RlbmVyIFwibG9hZFwiXG4gICAgICAgIHdoZW4gXCJpbnRlcmFjdGl2ZVwiXG4gICAgICAgICAgTWFrZSBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIGFkZExpc3RlbmVyIFwibG9hZFwiXG4gICAgICAgIHdoZW4gXCJjb21wbGV0ZVwiXG4gICAgICAgICAgTWFrZSBcIkRPTUNvbnRlbnRMb2FkZWRcIlxuICAgICAgICAgIE1ha2UgXCJsb2FkXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvciBcIlVua25vd24gZG9jdW1lbnQucmVhZHlTdGF0ZTogI3tkb2N1bWVudC5yZWFkeVN0YXRlfS4gQ2Fubm90IHNldHVwIFRha2UmTWFrZS5cIlxuXG5cbiAgICAjIEZpbmFsbHksIHdlJ3JlIHJlYWR5IHRvIGhhbmQgb3ZlciBjb250cm9sIHRvIG1vZHVsZSBzeXN0ZW1zXG4gICAgaWYgbW9kdWxlP1xuICAgICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICAgIFRha2U6IFRha2UsXG4gICAgICAgIE1ha2U6IE1ha2UsXG4gICAgICAgIERlYnVnVGFrZU1ha2U6IERlYnVnVGFrZU1ha2VcbiAgICAgIH1cblxuXG5cbiMgc3VibW9kdWxlL2J1Y2tldC9hZHNyLmNvZmZlZVxuIyBBRFNSXG4jIFRoaXMgZ2l2ZXMgeW91ciBmdW5jdGlvbiBhbiBcImF0dGFja1wiIHBoYXNlIGFuZCBhIFwicmVsZWFzZVwiIHBoYXNlXG4jIChib3Jyb3dpbmcgdGVybWlub2xvZ3kgZnJvbSBBRFNSIG9uIHN5bnRoZXNpemVycykuXG4jIFRoZSBhdHRhY2sgcGhhc2UgaXMgYSBkZWJvdW5jZSDigJQgeW91ciBmdW5jdGlvbiB3aWxsIHJ1biBqdXN0IG9uY2UgYWZ0ZXIgdGhlIGF0dGFjayBwaGFzZSBlbmRzLFxuIyBubyBtYXR0ZXIgaG93IG1hbnkgdGltZXMgaXQncyBjYWxsZWQgdW50aWwgdGhlbi5cbiMgV2hlbiB0aGUgZnVuY3Rpb24gcnVucywgaXQnbGwgdXNlIHRoZSBhcmdzIGZyb20gdGhlIG1vc3QgcmVjZW50IHRpbWUgaXQgd2FzIGNhbGxlZC5cbiMgVGhlIHJlbGVhc2UgaXMgYSB0aHJvdHRsZSDigJQgaWYgeW91ciBmdW5jdGlvbiBpcyBjYWxsZWQgZHVyaW5nIHRoZSByZWxlYXNlIHBoYXNlLFxuIyB0aGVuIGFmdGVyIHRoZSByZWxlYXNlIHBoYXNlIGVuZHMgdGhlIGF0dGFjayBwaGFzZSB3aWxsIHN0YXJ0IG92ZXIgYWdhaW4uXG4jIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSB3YW50IGEgZnVuY3Rpb24gdGhhdCB3aWxsIHJ1biBzaG9ydGx5IGFmdGVyIGl0J3MgY2FsbGVkIChnb29kIGZvciBmYXN0IHJlYWN0aW9ucylcbiMgYnV0IGRvZXNuJ3QgcnVuIGFnYWluIHVudGlsIGEgd2hpbGUgbGF0ZXIgKGdvb2QgZm9yIHJlZHVjaW5nIHN0cmFpbikuXG4jIEF0dGFjayBhbmQgcmVsZWFzZSBhcmUgc3BlY2lmaWVkIGluIG1zLCBhbmQgYXJlIG9wdGlvbmFsLlxuIyBJZiB5b3UgcGFzcyBhIHRpbWUgb2YgMCBtcyBmb3IgZWl0aGVyIHRoZSBhdHRhY2ssIHJlbGVhc2UsIG9yIGJvdGgsIHRoZSBwaGFzZSB3aWxsIGxhc3QgdW50aWwgdGhlIG5leHQgbWljcm90YXNrLlxuIyBJZiB5b3UgcGFzcyBhIHRpbWUgbGVzcyB0aGFuIDUgbXMsIHRoZSBwaGFzZSB3aWxsIGxhc3QgdW50aWwgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lLlxuIyBJdCdzIGlkaW9tYXRpYyB0byBwYXNzIGEgdGltZSBvZiAxIG1zIGlmIHlvdSB3YW50IHRoZSBuZXh0IGZyYW1lLlxuIyBXZSBhbHNvIGtlZXAgYSBjb3VudCBvZiBob3cgbWFueSBmdW5jdGlvbnMgYXJlIGN1cnJlbnRseSB3YWl0aW5nLCBhbmQgc3VwcG9ydCBhZGRpbmcgd2F0Y2hlcnNcbiMgdGhhdCB3aWxsIHJ1biBhIGNhbGxiYWNrIHdoZW4gdGhlIGNvdW50IGNoYW5nZXMsIGp1c3QgaW4gY2FzZSB5b3Ugd2FudCB0byAoZm9yIGV4YW1wbGUpXG4jIHdhaXQgZm9yIHRoZW0gYWxsIHRvIGZpbmlzaCBiZWZvcmUgcXVpdHRpbmcgLyBjbG9zaW5nLCBvciBtb25pdG9yIHRoZWlyIHBlcmZvcm1hbmNlLlxuXG5UYWtlIFtdLCAoKS0+XG5cbiAgYWN0aXZlID0gbmV3IE1hcCgpXG4gIHdhdGNoZXJzID0gW11cblxuICBNYWtlLmFzeW5jIFwiQURTUlwiLCBBRFNSID0gKC4uLlthdHRhY2sgPSAwLCByZWxlYXNlID0gMF0sIGZuKS0+ICguLi5hcmdzKS0+XG4gICAgaWYgbm90IGFjdGl2ZS5oYXMgZm5cbiAgICAgIGFmdGVyRGVsYXkgYXR0YWNrLCBhZnRlckF0dGFjayBmbiwgYXR0YWNrLCByZWxlYXNlXG4gICAgICBBRFNSLmNvdW50KytcbiAgICAgIHVwZGF0ZVdhdGNoZXJzKClcbiAgICBhY3RpdmUuc2V0IGZuLCB7YXJnc30gIyBBbHdheXMgdXNlIHRoZSBtb3N0IHJlY2VudCBhcmdzXG5cbiAgQURTUi5jb3VudCA9IDBcblxuICBBRFNSLndhdGNoZXIgPSAod2F0Y2hlciktPlxuICAgIHdhdGNoZXJzLnB1c2ggd2F0Y2hlclxuXG4gIGFmdGVyQXR0YWNrID0gKGZuLCBhdHRhY2ssIHJlbGVhc2UpLT4gKCktPlxuICAgIHthcmdzfSA9IGFjdGl2ZS5nZXQgZm5cbiAgICBhY3RpdmUuc2V0IGZuLCB7fVxuICAgIGZuIC4uLmFyZ3NcbiAgICBhZnRlckRlbGF5IHJlbGVhc2UsIGFmdGVyUmVsZWFzZSBmbiwgYXR0YWNrLCByZWxlYXNlXG5cbiAgYWZ0ZXJSZWxlYXNlID0gKGZuLCBhdHRhY2ssIHJlbGVhc2UpLT4gKCktPlxuICAgIHthcmdzfSA9IGFjdGl2ZS5nZXQgZm5cbiAgICBpZiBhcmdzXG4gICAgICBhZnRlckRlbGF5IGF0dGFjaywgYWZ0ZXJBdHRhY2sgZm4sIGF0dGFjaywgcmVsZWFzZVxuICAgIGVsc2VcbiAgICAgIGFjdGl2ZS5kZWxldGUgZm5cbiAgICAgIEFEU1IuY291bnQtLVxuICAgICAgdXBkYXRlV2F0Y2hlcnMoKVxuXG4gIGFmdGVyRGVsYXkgPSAoZGVsYXkgPSAwLCBjYiktPlxuICAgIGlmIGRlbGF5IGlzIDBcbiAgICAgIHF1ZXVlTWljcm90YXNrIGNiXG4gICAgZWxzZSBpZiBkZWxheSA8IDVcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBjYlxuICAgIGVsc2VcbiAgICAgIHNldFRpbWVvdXQgY2IsIGRlbGF5XG5cbiAgdXBkYXRlV2F0Y2hlcnMgPSAoKS0+XG4gICAgd2F0Y2hlciBBRFNSLmNvdW50IGZvciB3YXRjaGVyIGluIHdhdGNoZXJzXG4gICAgbnVsbFxuXG5cblxuIyBzdWJtb2R1bGUvYnVja2V0L21vbmtleS1wYXRjaC5jb2ZmZWVcbiMgTW9ua2V5IFBhdGNoXG4jIFRoZSBKUyBzdGFuZGFyZCBsaWJyYXJ5IGxlYXZlcyBhIGxvdCB0byBiZSBkZXNpcmVkLCBzbyBsZXQncyBjYXJlZnVsbHkgKHNlZSBib3R0b20gb2YgZmlsZSlcbiMgbW9kaWZ5IHRoZSBidWlsdC1pbiBjbGFzc2VzIHRvIGFkZCBhIGZldyBoZWxwZnVsIG1ldGhvZHMuXG5cbmRvICgpLT5cbiAgbW9ua2V5UGF0Y2hlcyA9XG5cbiAgICBBcnJheTpcbiAgICAgIHR5cGU6ICh2KS0+IHYgaW5zdGFuY2VvZiBBcnJheVxuXG4gICAgICAjIFNvcnRpbmdcbiAgICAgIG51bWVyaWNTb3J0QXNjZW5kaW5nOiAoYSwgYiktPiBhIC0gYlxuICAgICAgbnVtZXJpY1NvcnREZXNjZW5kaW5nOiAoYSwgYiktPiBiIC0gYVxuICAgICAgc29ydEFscGhhYmV0aWM6IChhcnIpLT4gYXJyLnNvcnQgQXJyYXkuYWxwaGFiZXRpY1NvcnQgPz0gbmV3IEludGwuQ29sbGF0b3IoJ2VuJykuY29tcGFyZVxuICAgICAgc29ydE51bWVyaWNBc2NlbmRpbmc6IChhcnIpLT4gYXJyLnNvcnQgQXJyYXkubnVtZXJpY1NvcnRBc2NlbmRpbmdcbiAgICAgIHNvcnROdW1lcmljRGVzY2VuZGluZzogKGFyciktPiBhcnIuc29ydCBBcnJheS5udW1lcmljU29ydERlc2NlbmRpbmdcblxuICAgICAgIyBBY2Nlc3NpbmdcbiAgICAgIGZpcnN0OiAoYXJyKS0+IGFyclswXVxuICAgICAgc2Vjb25kOiAoYXJyKS0+IGFyclsxXVxuICAgICAgbGFzdDogKGFyciktPiBhcnJbYXJyLmxlbmd0aC0xXVxuICAgICAgcmVzdDogKGFyciktPiBhcnJbMS4uLl1cbiAgICAgIGJ1dExhc3Q6IChhcnIpLT4gYXJyWy4uLi0xXVxuXG4gICAgICAjIE1pc2NcblxuICAgICAgY2xvbmU6IChhcnIpLT5cbiAgICAgICAgYXJyLm1hcCBGdW5jdGlvbi5jbG9uZVxuXG4gICAgICBlbXB0eTogKGFyciktPlxuICAgICAgICBub3QgYXJyPyBvciBhcnIubGVuZ3RoIGlzIDBcblxuICAgICAgZXF1YWw6IChhLCBiKS0+XG4gICAgICAgIHJldHVybiB0cnVlIGlmIE9iamVjdC5pcyBhLCBiXG4gICAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQXJyYXkudHlwZShhKSBhbmQgQXJyYXkudHlwZShiKSBhbmQgYS5sZW5ndGggaXMgYi5sZW5ndGhcbiAgICAgICAgZm9yIGFpLCBpIGluIGFcbiAgICAgICAgICBiaSA9IGJbaV1cbiAgICAgICAgICBpZiBGdW5jdGlvbi5lcXVhbCBhaSwgYmlcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgIG1hcFRvT2JqZWN0OiAoYXJyLCBmbiA9IEZ1bmN0aW9uLmlkZW50aXR5KS0+XG4gICAgICAgIG8gPSB7fVxuICAgICAgICBvW2tdID0gZm4gayBmb3IgayBpbiBhcnJcbiAgICAgICAgb1xuXG4gICAgICBwdWxsOiAoYXJyLCBlbG1zKS0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgYXJyPyBhbmQgZWxtcz9cbiAgICAgICAgZWxtcyA9IFtlbG1zXSB1bmxlc3MgQXJyYXkudHlwZSBlbG1zXG4gICAgICAgIGZvciBlbG0gaW4gZWxtc1xuICAgICAgICAgIHdoaWxlIChpID0gYXJyLmluZGV4T2YgZWxtKSA+IC0xXG4gICAgICAgICAgICBhcnIuc3BsaWNlIGksIDFcbiAgICAgICAgYXJyXG5cbiAgICAgIHNlYXJjaDogKGFyciwga2V5KS0+XG4gICAgICAgIGZvciB2IGluIGFyclxuICAgICAgICAgIGlmIEFycmF5LnR5cGUgdlxuICAgICAgICAgICAgcmV0dXJuIHRydWUgaWYgQXJyYXkuc2VhcmNoIHYsIGtleVxuICAgICAgICAgIGVsc2UgaWYgT2JqZWN0LnR5cGUgdlxuICAgICAgICAgICAgcmV0dXJuIHRydWUgaWYgT2JqZWN0LnNlYXJjaCB2LCBrZXlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIHNodWZmbGU6IChhcnIpLT5cbiAgICAgICAgbmV3QXJyID0gW11cbiAgICAgICAgZm9yIGl0ZW0sIGkgaW4gYXJyXG4gICAgICAgICAgbmV3QXJyLnNwbGljZSBNYXRoLnJhbmRJbnQoMCwgbmV3QXJyLmxlbmd0aCksIDAsIGl0ZW1cbiAgICAgICAgcmV0dXJuIG5ld0FyclxuXG4gICAgICB1bmlxdWU6IChlbGVtZW50cyktPlxuICAgICAgICBBcnJheS5mcm9tIG5ldyBTZXQgW10uY29uY2F0IGVsZW1lbnRzXG5cblxuICAgIEZ1bmN0aW9uOlxuICAgICAgdHlwZTogKHYpLT4gdiBpbnN0YW5jZW9mIEZ1bmN0aW9uXG4gICAgICBpZGVudGl0eTogKHYpLT4gdlxuXG4gICAgICBleGlzdHM6IChlKS0+IGU/XG4gICAgICBub3RFeGlzdHM6IChlKS0+ICFlP1xuICAgICAgaXM6IChhLCBiKS0+IGEgaXMgYlxuICAgICAgaXNudDogKGEsIGIpLT4gYSBpc250IGJcbiAgICAgIGVxdWFsOiAoYSwgYiktPlxuICAgICAgICBpZiBPYmplY3QuaXMgYSwgYlxuICAgICAgICAgIHRydWVcbiAgICAgICAgZWxzZSBpZiBBcnJheS50eXBlKGEpIGFuZCBBcnJheS50eXBlKGIpXG4gICAgICAgICAgdHJ1ZSBpZiBBcnJheS5lcXVhbCBhLCBiXG4gICAgICAgIGVsc2UgaWYgT2JqZWN0LnR5cGUoYSkgYW5kIE9iamVjdC50eXBlKGIpXG4gICAgICAgICAgdHJ1ZSBpZiBPYmplY3QuZXF1YWwgYSwgYlxuICAgICAgICBlbHNlXG4gICAgICAgICAgZmFsc2VcbiAgICAgIGVxdWl2YWxlbnQ6IChhLCBiKS0+IGBhID09IGJgIG9yIEZ1bmN0aW9uLmVxdWFsIGEsIGIgIyBMaWtlIGVxdWFsLCBidXQgYWxzbyBlcXVhdGVzIG51bGwgJiB1bmRlZmluZWQsIC0wICYgMCwgZXRjXG4gICAgICBub3RFcXVhbDogKGEsIGIpLT4gIUZ1bmN0aW9uLmVxdWFsIGEsIGJcbiAgICAgIG5vdEVxdWl2YWxlbnQ6IChhLCBiKS0+ICFGdW5jdGlvbi5lcXVpdmFsZW50IGEsIGJcblxuICAgICAgY2xvbmU6ICh2KS0+XG4gICAgICAgIGlmIG5vdCB2P1xuICAgICAgICAgIHZcbiAgICAgICAgZWxzZSBpZiBGdW5jdGlvbi50eXBlIHZcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgXCJJZiB5b3UgbmVlZCB0byBjbG9uZSBmdW5jdGlvbnMsIHVzZSBhIGN1c3RvbSBjbG9uZXJcIlxuICAgICAgICBlbHNlIGlmIFByb21pc2UudHlwZSB2XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yIFwiSWYgeW91IG5lZWQgdG8gY2xvbmUgcHJvbWlzZXMsIHVzZSBhIGN1c3RvbSBjbG9uZXJcIlxuICAgICAgICBlbHNlIGlmIEFycmF5LnR5cGUgdlxuICAgICAgICAgIEFycmF5LmNsb25lIHZcbiAgICAgICAgZWxzZSBpZiBPYmplY3QudHlwZSB2XG4gICAgICAgICAgT2JqZWN0LmNsb25lIHZcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHZcblxuXG4gICAgTWF0aDpcblxuICAgICAgVEFVOiBNYXRoLlBJICogMlxuXG4gICAgICB6ZXJvOiAodiktPiBNYXRoLkVQU0lMT04gPiBNYXRoLmFicyB2XG4gICAgICBub256ZXJvOiAodiktPiBub3QgTWF0aC56ZXJvIHZcblxuICAgICAgYWRkOiAoYSwgYiktPiBhICsgYlxuICAgICAgZGl2OiAoYSwgYiktPiBhIC8gYlxuICAgICAgbW9kOiAoYSwgYiktPiBhICUgYlxuICAgICAgbXVsOiAoYSwgYiktPiBhICogYlxuICAgICAgc3ViOiAoYSwgYiktPiBhIC0gYlxuXG4gICAgICBhdmc6IChhLCBiKS0+IChhICsgYikvMlxuXG4gICAgICBjbGlwOiAodiwgLi4uW21pbiA9IDBdLCBtYXggPSAxKS0+IE1hdGgubWluIG1heCwgTWF0aC5tYXggbWluLCB2XG4gICAgICBzYXQ6ICh2KSAtPiBNYXRoLmNsaXAgdlxuXG4gICAgICBsZXJwTjogKGlucHV0LCBvdXRwdXRNaW4gPSAwLCBvdXRwdXRNYXggPSAxLCBjbGlwID0gZmFsc2UpLT5cbiAgICAgICAgaW5wdXQgKj0gb3V0cHV0TWF4IC0gb3V0cHV0TWluXG4gICAgICAgIGlucHV0ICs9IG91dHB1dE1pblxuICAgICAgICBpbnB1dCA9IE1hdGguY2xpcCBpbnB1dCwgb3V0cHV0TWluLCBvdXRwdXRNYXggaWYgY2xpcFxuICAgICAgICByZXR1cm4gaW5wdXRcblxuICAgICAgbGVycDogKGlucHV0LCBpbnB1dE1pbiA9IDAsIGlucHV0TWF4ID0gMSwgb3V0cHV0TWluID0gMCwgb3V0cHV0TWF4ID0gMSwgY2xpcCA9IHRydWUpLT5cbiAgICAgICAgcmV0dXJuIG91dHB1dE1pbiBpZiBpbnB1dE1pbiBpcyBpbnB1dE1heCAjIEF2b2lkcyBhIGRpdmlkZSBieSB6ZXJvXG4gICAgICAgIFtpbnB1dE1pbiwgaW5wdXRNYXgsIG91dHB1dE1pbiwgb3V0cHV0TWF4XSA9IFtpbnB1dE1heCwgaW5wdXRNaW4sIG91dHB1dE1heCwgb3V0cHV0TWluXSBpZiBpbnB1dE1pbiA+IGlucHV0TWF4XG4gICAgICAgIGlucHV0ID0gTWF0aC5jbGlwIGlucHV0LCBpbnB1dE1pbiwgaW5wdXRNYXggaWYgY2xpcFxuICAgICAgICBpbnB1dCAtPSBpbnB1dE1pblxuICAgICAgICBpbnB1dCAvPSBpbnB1dE1heCAtIGlucHV0TWluXG4gICAgICAgIHJldHVybiBNYXRoLmxlcnBOIGlucHV0LCBvdXRwdXRNaW4sIG91dHB1dE1heCwgZmFsc2VcblxuICAgICAgcmFuZDogKG1pbiA9IC0xLCBtYXggPSAxKS0+IE1hdGgubGVycE4gTWF0aC5yYW5kb20oKSwgbWluLCBtYXhcbiAgICAgIHJhbmRJbnQ6IChtaW4sIG1heCktPiBNYXRoLnJvdW5kIE1hdGgucmFuZCBtaW4sIG1heFxuXG4gICAgICByb3VuZFRvOiAoaW5wdXQsIHByZWNpc2lvbiktPlxuICAgICAgICAjIFVzaW5nIHRoZSByZWNpcHJvY2FsIGF2b2lkcyBmbG9hdGluZyBwb2ludCBlcnJvcnMuIEVnOiAzLzEwIGlzIGZpbmUsIGJ1dCAzKjAuMSBpcyB3cm9uZy5cbiAgICAgICAgcCA9IDEgLyBwcmVjaXNpb25cbiAgICAgICAgTWF0aC5yb3VuZChpbnB1dCAqIHApIC8gcFxuXG5cbiAgICBPYmplY3Q6XG4gICAgICB0eXBlOiAodiktPiBcIltvYmplY3QgT2JqZWN0XVwiIGlzIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCB2XG5cbiAgICAgICMgVGhpcyBzaG91bGQgcHJvYmFibHkgYmUgYSBmdW5jdGlvbiBvbiBBcnJheSwgYXMgYSBtaXJyb3Igb2YgT2JqZWN0LmtleXMgLyBPYmplY3QudmFsdWVzLlxuICAgICAgIyBJbiBnZW5lcmFsLCBmdW5jdGlvbnMgdGhhdCB0YWtlIGFuIGFycmF5IGdvIG9uIEFycmF5LCBldmVuIGlmIHRoZXkgcmV0dXJuIGEgZGlmZmVyZW50IHR5cGUuXG4gICAgICBieTogKGssIGFyciktPiAjIE9iamVjdC5ieSBcIm5hbWVcIiwgW3tuYW1lOlwiYVwifSwge25hbWU6XCJiXCJ9XSA9PiB7YTp7bmFtZTpcImFcIn0sIGI6e25hbWU6XCJiXCJ9fVxuICAgICAgICBvID0ge31cbiAgICAgICAgb1tvYmpba11dID0gb2JqIGZvciBvYmogaW4gYXJyXG4gICAgICAgIHJldHVybiBvXG5cbiAgICAgIGNsb25lOiAob2JqKS0+XG4gICAgICAgIE9iamVjdC5tYXBWYWx1ZXMgb2JqLCBGdW5jdGlvbi5jbG9uZVxuXG4gICAgICBjb3VudDogKG9iaiktPlxuICAgICAgICBPYmplY3Qua2V5cyhvYmopLmxlbmd0aFxuXG4gICAgICBlcXVhbDogKGEsIGIpLT5cbiAgICAgICAgcmV0dXJuIHRydWUgaWYgT2JqZWN0LmlzIGEsIGJcbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyAoYT8gYW5kIGI/KSBhbmQgKHt9LmNvbnN0cnVjdG9yIGlzIGEuY29uc3RydWN0b3IgaXMgYi5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBPYmplY3Qua2V5cyhhKS5sZW5ndGggaXMgT2JqZWN0LmtleXMoYikubGVuZ3RoXG4gICAgICAgIGZvciBrLCBhdiBvZiBhXG4gICAgICAgICAgYnYgPSBiW2tdXG4gICAgICAgICAgaWYgRnVuY3Rpb24uZXF1YWwgYXYsIGJ2XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICBtYXBLZXlzOiAob2JqLCBmbiA9IEZ1bmN0aW9uLmlkZW50aXR5KS0+XG4gICAgICAgIG8gPSB7fVxuICAgICAgICBvW2tdID0gZm4gayBmb3IgayBvZiBvYmpcbiAgICAgICAgb1xuXG4gICAgICBtYXBWYWx1ZXM6IChvYmosIGZuID0gRnVuY3Rpb24uaWRlbnRpdHkpLT5cbiAgICAgICAgbyA9IHt9XG4gICAgICAgIG9ba10gPSBmbiB2IGZvciBrLCB2IG9mIG9ialxuICAgICAgICBvXG5cbiAgICAgIG1lcmdlOiAob2Jqcy4uLiktPlxuICAgICAgICBvdXQgPSB7fVxuICAgICAgICBmb3Igb2JqIGluIG9ianMgd2hlbiBvYmo/XG4gICAgICAgICAgZm9yIGssIHYgb2Ygb2JqXG4gICAgICAgICAgICAjIERPIE5PVCBhZGQgYW55IGFkZGl0aW9uYWwgbG9naWMgZm9yIG1lcmdpbmcgb3RoZXIgdHlwZXMgKGxpa2UgYXJyYXlzKSxcbiAgICAgICAgICAgICMgb3IgZXhpc3RpbmcgYXBwcyB3aWxsIGJyZWFrIChIeXBlcnppbmUsIEhlc3QsIGV0Yy4pXG4gICAgICAgICAgICAjIElmIHlvdSB3YW50IHRvIGRlZXAgbWVyZ2Ugb3RoZXIgdHlwZXMsIHdyaXRlIGEgY3VzdG9tIG1lcmdlIGZ1bmN0aW9uLlxuICAgICAgICAgICAgb3V0W2tdID0gaWYgT2JqZWN0LnR5cGUgdlxuICAgICAgICAgICAgICBPYmplY3QubWVyZ2Ugb3V0W2tdLCB2XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHZcbiAgICAgICAgb3V0XG5cbiAgICAgIHJtZXJnZTogKG9ianMuLi4pLT5cbiAgICAgICAgT2JqZWN0Lm1lcmdlIG9ianMucmV2ZXJzZSgpLi4uXG5cbiAgICAgIHNlYXJjaDogKG9iaiwga2V5KS0+XG4gICAgICAgIHJldHVybiB0cnVlIGlmIG9ialtrZXldP1xuICAgICAgICBmb3IgaywgdiBvZiBvYmpcbiAgICAgICAgICBpZiBBcnJheS50eXBlIHZcbiAgICAgICAgICAgIHJldHVybiB0cnVlIGlmIEFycmF5LnNlYXJjaCB2LCBrZXlcbiAgICAgICAgICBlbHNlIGlmIE9iamVjdC50eXBlIHZcbiAgICAgICAgICAgIHJldHVybiB0cnVlIGlmIE9iamVjdC5zZWFyY2ggdiwga2V5XG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgICBzdWJ0cmFjdEtleXM6IChhLCBiKS0+XG4gICAgICAgIG8gPSBPYmplY3QubWFwS2V5cyBhICMgc2hhbGxvdyBjbG9uZVxuICAgICAgICBkZWxldGUgb1trXSBmb3IgayBvZiBiXG4gICAgICAgIG9cblxuXG4gICAgUHJvbWlzZTpcbiAgICAgIHR5cGU6ICh2KS0+IHYgaW5zdGFuY2VvZiBQcm9taXNlXG5cbiAgICAgIHRpbWVvdXQ6ICh0KS0+IG5ldyBQcm9taXNlIChyZXNvbHZlKS0+IHNldFRpbWVvdXQgcmVzb2x2ZSwgdFxuXG5cbiAgICBTdHJpbmc6XG4gICAgICB0eXBlOiAodiktPiBcInN0cmluZ1wiIGlzIHR5cGVvZiB2XG5cbiAgICAgICMgaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzUyMTcxNDgwLzMxMzU3NiwgcHVibGljIGRvbWFpblxuICAgICAgaGFzaDogKHN0ciwgc2VlZCA9IDApLT5cbiAgICAgICAgcmV0dXJuIDAgdW5sZXNzIHN0cj9cbiAgICAgICAgaDEgPSAweGRlYWRiZWVmIF4gc2VlZFxuICAgICAgICBoMiA9IDB4NDFjNmNlNTcgXiBzZWVkXG4gICAgICAgIGZvciBjIGluIHN0clxuICAgICAgICAgIGNoID0gYy5jaGFyQ29kZUF0IDBcbiAgICAgICAgICBoMSA9IE1hdGguaW11bCBoMSBeIGNoLCAyNjU0NDM1NzYxXG4gICAgICAgICAgaDIgPSBNYXRoLmltdWwgaDIgXiBjaCwgMTU5NzMzNDY3N1xuICAgICAgICBoMSA9IE1hdGguaW11bChoMSBeIChoMT4+PjE2KSwgMjI0NjgyMjUwNykgXiBNYXRoLmltdWwoaDIgXiAoaDI+Pj4xMyksIDMyNjY0ODk5MDkpXG4gICAgICAgIGgyID0gTWF0aC5pbXVsKGgyIF4gKGgyPj4+MTYpLCAyMjQ2ODIyNTA3KSBeIE1hdGguaW11bChoMSBeIChoMT4+PjEzKSwgMzI2NjQ4OTkwOSlcbiAgICAgICAgcmV0dXJuIDQyOTQ5NjcyOTYgKiAoMjA5NzE1MSAmIGgyKSArIChoMT4+PjApXG5cbiAgICAgIHBsdXJhbGl6ZTogKGNvdW50LCBzdHJpbmcsIHN1ZmZpeCA9IFwic1wiKS0+XG4gICAgICAgIHN1ZmZpeCA9IFwiXCIgaWYgY291bnQgaXMgMVxuICAgICAgICAoc3RyaW5nICsgc3VmZml4KS5yZXBsYWNlKFwiJSVcIiwgY291bnQpXG5cbiAgICAgIHRvS2ViYWJDYXNlOiAodiktPlxuICAgICAgICB2LnJlcGxhY2UoLyhbQS1aXSkvZyxcIi0kMVwiKS50b0xvd2VyQ2FzZSgpXG5cblxuICAjIEluaXRcblxuICBmb3IgY2xhc3NOYW1lLCBjbGFzc1BhdGNoZXMgb2YgbW9ua2V5UGF0Y2hlc1xuICAgIGdsb2JhbGNsYXNzID0gZ2xvYmFsVGhpc1tjbGFzc05hbWVdXG4gICAgZm9yIGtleSwgdmFsdWUgb2YgY2xhc3NQYXRjaGVzXG4gICAgICBpZiBnbG9iYWxjbGFzc1trZXldP1xuICAgICAgICBjb25zb2xlLmxvZyBcIkNhbid0IG1vbmtleSBwYXRjaCAje2NsYXNzTmFtZX0uI3trZXl9IGJlY2F1c2UgaXQgYWxyZWFkeSBleGlzdHMuXCJcbiAgICAgIGVsc2VcbiAgICAgICAgZ2xvYmFsY2xhc3Nba2V5XSA9IHZhbHVlXG5cblxuXG4jIHN1Ym1vZHVsZS9idWNrZXQvdGVzdC5jb2ZmZWVcblRlc3RzID0gVGVzdCA9IG51bGxcblxuZG8gKCktPlxuICBjb250ZXh0ID0gbnVsbFxuXG4gIFRlc3RzID0gKG5hbWUsIHRlc3QpLT5cbiAgICBjb250ZXh0ID0gKCktPiBjb25zb2xlLmdyb3VwIFwiJWMje25hbWV9XCIsIFwiY29sb3I6IHJlZFwiOyBjb250ZXh0ID0gbnVsbFxuICAgIHRlc3QoKVxuICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuICAgIGNvbnRleHQgPSBudWxsXG5cbiAgVGVzdCA9IChuYW1lLCAuLi5zdHVmZiktPlxuXG4gICAgIyBJZiB3ZSd2ZSBiZWVuIHBhc3NlZCBhbnkgZnVuY3Rpb25zLCBydW4gdGhlbSBhbmQgY2FwdHVyZSB0aGUgcmV0dXJuIHZhbHVlcy5cbiAgICBmb3IgdGhpbmcsIGkgaW4gc3R1ZmYgd2hlbiBGdW5jdGlvbi50eXBlIHRoaW5nXG4gICAgICBzdHVmZltpXSA9IHRoaW5nKClcblxuICAgICMgSWYgdGhlcmUncyBvbmx5IG9uZSB0aGluZyBpbiBzdHVmZiwganVzdCBjb21wYXJlIGl0IHdpdGggdHJ1ZVxuICAgIGlmIHN0dWZmLmxlbmd0aCBpcyAxXG4gICAgICBzdHVmZi51bnNoaWZ0IHRydWVcblxuICAgICMgTm93LCBhbGwgdGhpbmdzIGluIHN0dWZmIG11c3QgYWxsIGJlIGVxdWl2YWxlbnQuIE9yIGVsc2UuXG4gICAgIyAoVGhpcyB0ZXN0IGZyYW1ld29yayBpcyBzdXBlciBjYXN1YWwsIHNvIHdlIGp1c3QgY2hlY2sgZWFjaCBuZWlnaGJvdXJpbmcgcGFpcilcbiAgICBmb3IgdGhpbmcsIGkgaW4gQXJyYXkuYnV0TGFzdCBzdHVmZlxuICAgICAgdW5sZXNzIEZ1bmN0aW9uLmVxdWl2YWxlbnQgdGhpbmcsIHN0dWZmW2krMV1cbiAgICAgICAgY29udGV4dD8oKVxuICAgICAgICBjb25zb2xlLmdyb3VwIFwiJWMje25hbWV9XCIsIFwiZm9udC13ZWlnaHQ6bm9ybWFsO1wiXG4gICAgICAgIGNvbnNvbGUubG9nIFwidGhpczpcIiwgdGhpbmdcbiAgICAgICAgY29uc29sZS5sb2cgXCJpc250OlwiLCBzdHVmZltpKzFdXG4gICAgICAgIGNvbnNvbGUuZ3JvdXBFbmQoKVxuXG5cblxuIyBub2RlX21vZHVsZXMvZG9vbS9kb29tLmNvZmZlZVxuZG8gKCktPlxuXG4gIHN2Z05TID0gXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiXG4gIHhsaW5rTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIlxuXG4gICMgVGhpcyBpcyB1c2VkIHRvIGNhY2hlIG5vcm1hbGl6ZWQga2V5cywgYW5kIHRvIHByb3ZpZGUgZGVmYXVsdHMgZm9yIGtleXMgdGhhdCBzaG91bGRuJ3QgYmUgbm9ybWFsaXplZFxuICBhdHRyTmFtZXMgPVxuICAgIGdyYWRpZW50VW5pdHM6IFwiZ3JhZGllbnRVbml0c1wiXG4gICAgcHJlc2VydmVBc3BlY3RSYXRpbzogXCJwcmVzZXJ2ZUFzcGVjdFJhdGlvXCJcbiAgICBzdGFydE9mZnNldDogXCJzdGFydE9mZnNldFwiXG4gICAgdmlld0JveDogXCJ2aWV3Qm94XCJcbiAgICAjIGNvbW1vbiBjYXNlLXNlbnNpdGl2ZSBhdHRyIG5hbWVzIHNob3VsZCBiZSBsaXN0ZWQgaGVyZSBhcyBuZWVkZWQg4oCUIHNlZSBzdmcuY29mZWUgaW4gaHR0cHM6Ly9naXRodWIuY29tL2NkaWcvc3ZnIGZvciByZWZlcmVuY2VcblxuICBldmVudE5hbWVzID1cbiAgICBibHVyOiB0cnVlXG4gICAgY2hhbmdlOiB0cnVlXG4gICAgY2xpY2s6IHRydWVcbiAgICBmb2N1czogdHJ1ZVxuICAgIGlucHV0OiB0cnVlXG4gICAga2V5ZG93bjogdHJ1ZVxuICAgIGtleXByZXNzOiB0cnVlXG4gICAga2V5dXA6IHRydWVcbiAgICBtb3VzZWRvd246IHRydWVcbiAgICBtb3VzZWVudGVyOiB0cnVlXG4gICAgbW91c2VsZWF2ZTogdHJ1ZVxuICAgIG1vdXNlbW92ZTogdHJ1ZVxuICAgIG1vdXNldXA6IHRydWVcbiAgICBzY3JvbGw6IHRydWVcblxuICBwcm9wTmFtZXMgPVxuICAgIGNoaWxkTm9kZXM6IHRydWVcbiAgICBmaXJzdENoaWxkOiB0cnVlXG4gICAgaW5uZXJIVE1MOiB0cnVlXG4gICAgbGFzdENoaWxkOiB0cnVlXG4gICAgbmV4dFNpYmxpbmc6IHRydWVcbiAgICBwYXJlbnRFbGVtZW50OiB0cnVlXG4gICAgcGFyZW50Tm9kZTogdHJ1ZVxuICAgIHByZXZpb3VzU2libGluZzogdHJ1ZVxuICAgIHRleHRDb250ZW50OiB0cnVlXG4gICAgdmFsdWU6IHRydWVcblxuICBzdHlsZU5hbWVzID1cbiAgICBhbmltYXRpb246IHRydWVcbiAgICBhbmltYXRpb25EZWxheTogdHJ1ZVxuICAgIGJhY2tncm91bmQ6IHRydWVcbiAgICBib3JkZXJSYWRpdXM6IHRydWVcbiAgICBjb2xvcjogdHJ1ZVxuICAgIGRpc3BsYXk6IHRydWVcbiAgICBmb250U2l6ZTogXCJodG1sXCIgIyBPbmx5IHRyZWF0IGFzIGEgc3R5bGUgaWYgdGhpcyBpcyBhbiBIVE1MIGVsbS4gU1ZHIGVsbXMgd2lsbCB0cmVhdCB0aGlzIGFzIGFuIGF0dHJpYnV0ZS5cbiAgICBmb250RmFtaWx5OiB0cnVlXG4gICAgZm9udFdlaWdodDogdHJ1ZVxuICAgIGhlaWdodDogXCJodG1sXCJcbiAgICBsZWZ0OiB0cnVlXG4gICAgbGV0dGVyU3BhY2luZzogdHJ1ZVxuICAgIGxpbmVIZWlnaHQ6IHRydWVcbiAgICBtYXhIZWlnaHQ6IHRydWVcbiAgICBtYXhXaWR0aDogdHJ1ZVxuICAgIG1hcmdpbjogdHJ1ZVxuICAgIG1hcmdpblRvcDogdHJ1ZVxuICAgIG1hcmdpbkxlZnQ6IHRydWVcbiAgICBtYXJnaW5SaWdodDogdHJ1ZVxuICAgIG1hcmdpbkJvdHRvbTogdHJ1ZVxuICAgIG1pbldpZHRoOiB0cnVlXG4gICAgbWluSGVpZ2h0OiB0cnVlXG4gICAgb3BhY2l0eTogXCJodG1sXCJcbiAgICBvdmVyZmxvdzogdHJ1ZVxuICAgIG92ZXJmbG93WDogdHJ1ZVxuICAgIG92ZXJmbG93WTogdHJ1ZVxuICAgIHBhZGRpbmc6IHRydWVcbiAgICBwYWRkaW5nVG9wOiB0cnVlXG4gICAgcGFkZGluZ0xlZnQ6IHRydWVcbiAgICBwYWRkaW5nUmlnaHQ6IHRydWVcbiAgICBwYWRkaW5nQm90dG9tOiB0cnVlXG4gICAgcG9pbnRlckV2ZW50czogdHJ1ZVxuICAgIHBvc2l0aW9uOiB0cnVlXG4gICAgdGV4dERlY29yYXRpb246IHRydWVcbiAgICB0b3A6IHRydWVcbiAgICB0cmFuc2Zvcm06IFwiaHRtbFwiXG4gICAgdHJhbnNpdGlvbjogdHJ1ZVxuICAgIHZpc2liaWxpdHk6IHRydWVcbiAgICB3aWR0aDogXCJodG1sXCJcbiAgICB6SW5kZXg6IHRydWVcblxuICAjIFdoZW4gY3JlYXRpbmcgYW4gZWxlbWVudCwgU1ZHIGVsZW1lbnRzIHJlcXVpcmUgYSBzcGVjaWFsIG5hbWVzcGFjZSwgc28gd2UgdXNlIHRoaXMgbGlzdCB0byBrbm93IHdoZXRoZXIgYSB0YWcgbmFtZSBpcyBmb3IgYW4gU1ZHIG9yIG5vdFxuICBzdmdFbG1zID1cbiAgICBjaXJjbGU6IHRydWVcbiAgICBjbGlwUGF0aDogdHJ1ZVxuICAgIGRlZnM6IHRydWVcbiAgICBlbGxpcHNlOiB0cnVlXG4gICAgZzogdHJ1ZVxuICAgIGltYWdlOiB0cnVlXG4gICAgbGluZTogdHJ1ZVxuICAgIGxpbmVhckdyYWRpZW50OiB0cnVlXG4gICAgbWFzazogdHJ1ZVxuICAgIHBhdGg6IHRydWVcbiAgICBwb2x5Z29uOiB0cnVlXG4gICAgcG9seWxpbmU6IHRydWVcbiAgICByYWRpYWxHcmFkaWVudDogdHJ1ZVxuICAgIHJlY3Q6IHRydWVcbiAgICBzdG9wOiB0cnVlXG4gICAgc3ZnOiB0cnVlXG4gICAgc3ltYm9sOiB0cnVlXG4gICAgdGV4dDogdHJ1ZVxuICAgIHRleHRQYXRoOiB0cnVlXG4gICAgdHNwYW46IHRydWVcbiAgICB1c2U6IHRydWVcblxuXG4gIHJlYWQgPSAoZWxtLCBrKS0+XG4gICAgaWYgcHJvcE5hbWVzW2tdP1xuICAgICAgY2FjaGUgPSBlbG0uX0RPT01fcHJvcFxuICAgICAgY2FjaGVba10gPSBlbG1ba10gaWYgY2FjaGVba10gaXMgdW5kZWZpbmVkXG4gICAgICBjYWNoZVtrXVxuICAgIGVsc2UgaWYgc3R5bGVOYW1lc1trXT9cbiAgICAgIGNhY2hlID0gZWxtLl9ET09NX3N0eWxlXG4gICAgICBjYWNoZVtrXSA9IGVsbS5zdHlsZVtrXSBpZiBjYWNoZVtrXSBpcyB1bmRlZmluZWRcbiAgICAgIGNhY2hlW2tdXG4gICAgZWxzZVxuICAgICAgayA9IGF0dHJOYW1lc1trXSA/PSBrLnJlcGxhY2UoLyhbQS1aXSkvZyxcIi0kMVwiKS50b0xvd2VyQ2FzZSgpICMgTm9ybWFsaXplIGNhbWVsQ2FzZSBpbnRvIGtlYmFiLWNhc2VcbiAgICAgIGNhY2hlID0gZWxtLl9ET09NX2F0dHJcbiAgICAgIGNhY2hlW2tdID0gZWxtLmdldEF0dHJpYnV0ZSBrIGlmIGNhY2hlW2tdIGlzIHVuZGVmaW5lZFxuICAgICAgY2FjaGVba11cblxuXG4gIHdyaXRlID0gKGVsbSwgaywgdiktPlxuICAgIGlmIHByb3BOYW1lc1trXT9cbiAgICAgIGNhY2hlID0gZWxtLl9ET09NX3Byb3BcbiAgICAgIGlzQ2FjaGVkID0gY2FjaGVba10gaXMgdlxuICAgICAgZWxtW2tdID0gY2FjaGVba10gPSB2IGlmIG5vdCBpc0NhY2hlZFxuICAgIGVsc2UgaWYgc3R5bGVOYW1lc1trXT8gYW5kICEoZWxtLl9ET09NX1NWRyBhbmQgc3R5bGVOYW1lc1trXSBpcyBcImh0bWxcIilcbiAgICAgIGNhY2hlID0gZWxtLl9ET09NX3N0eWxlXG4gICAgICBpc0NhY2hlZCA9IGNhY2hlW2tdIGlzIHZcbiAgICAgIGVsbS5zdHlsZVtrXSA9IGNhY2hlW2tdID0gdiBpZiBub3QgaXNDYWNoZWRcbiAgICBlbHNlIGlmIGV2ZW50TmFtZXNba10/XG4gICAgICBjYWNoZSA9IGVsbS5fRE9PTV9ldmVudFxuICAgICAgcmV0dXJuIGlmIGNhY2hlW2tdIGlzIHZcbiAgICAgIGlmIGNhY2hlW2tdP1xuICAgICAgICB0aHJvdyBcIkRPT00gZXhwZXJpbWVudGFsbHkgaW1wb3NlcyBhIGxpbWl0IG9mIG9uZSBoYW5kbGVyIHBlciBldmVudCBwZXIgb2JqZWN0LlwiXG4gICAgICAgICMgSWYgd2Ugd2FudCB0byBhZGQgbXVsdGlwbGUgaGFuZGxlcnMgZm9yIHRoZSBzYW1lIGV2ZW50IHRvIGFuIG9iamVjdCxcbiAgICAgICAgIyB3ZSBuZWVkIHRvIGRlY2lkZSBob3cgdGhhdCBpbnRlcmFjdHMgd2l0aCBwYXNzaW5nIG51bGwgdG8gcmVtb3ZlIGV2ZW50cy5cbiAgICAgICAgIyBTaG91bGQgbnVsbCByZW1vdmUgYWxsIGV2ZW50cz8gUHJvYmFibHkuIEhvdyBkbyB3ZSB0cmFjayB0aGF0PyBLZWVwIGFuIGFycmF5IG9mIHJlZnMgdG8gaGFuZGxlcnM/XG4gICAgICAgICMgVGhhdCBzZWVtcyBzbG93IGFuZCBlcnJvciBwcm9uZS5cbiAgICAgIGNhY2hlW2tdID0gdlxuICAgICAgaWYgdj9cbiAgICAgICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIgaywgdlxuICAgICAgZWxzZVxuICAgICAgICBlbG0ucmVtb3ZlRXZlbnRMaXN0ZW5lciBrLCB2XG4gICAgZWxzZVxuICAgICAgayA9IGF0dHJOYW1lc1trXSA/PSBrLnJlcGxhY2UoLyhbQS1aXSkvZyxcIi0kMVwiKS50b0xvd2VyQ2FzZSgpICMgTm9ybWFsaXplIGNhbWVsQ2FzZSBpbnRvIGtlYmFiLWNhc2VcbiAgICAgIGNhY2hlID0gZWxtLl9ET09NX2F0dHJcbiAgICAgIHJldHVybiBpZiBjYWNoZVtrXSBpcyB2XG4gICAgICBjYWNoZVtrXSA9IHZcbiAgICAgIG5zID0gaWYgayBpcyBcInhsaW5rOmhyZWZcIiB0aGVuIHhsaW5rTlMgZWxzZSBudWxsICMgR3JhYiB0aGUgbmFtZXNwYWNlIGlmIG5lZWRlZFxuICAgICAgaWYgbnM/XG4gICAgICAgIGlmIHY/ICMgY2hlY2sgZm9yIG51bGxcbiAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlTlMgbnMsIGssIHYgIyBzZXQgRE9NIGF0dHJpYnV0ZVxuICAgICAgICBlbHNlICMgdiBpcyBleHBsaWNpdGx5IHNldCB0byBudWxsIChub3QgdW5kZWZpbmVkKVxuICAgICAgICAgIGVsbS5yZW1vdmVBdHRyaWJ1dGVOUyBucywgayAjIHJlbW92ZSBET00gYXR0cmlidXRlXG4gICAgICBlbHNlXG4gICAgICAgIGlmIHY/ICMgY2hlY2sgZm9yIG51bGxcbiAgICAgICAgICBlbG0uc2V0QXR0cmlidXRlIGssIHYgIyBzZXQgRE9NIGF0dHJpYnV0ZVxuICAgICAgICBlbHNlICMgdiBpcyBleHBsaWNpdGx5IHNldCB0byBudWxsIChub3QgdW5kZWZpbmVkKVxuICAgICAgICAgIGVsbS5yZW1vdmVBdHRyaWJ1dGUgayAjIHJlbW92ZSBET00gYXR0cmlidXRlXG5cblxuICBhY3QgPSAoZWxtLCBvcHRzKS0+XG4gICAgIyBJbml0aWFsaXplIHRoZSBjYWNoZXNcbiAgICBlbG0uX0RPT01fYXR0ciA/PSB7fVxuICAgIGVsbS5fRE9PTV9ldmVudCA/PSB7fVxuICAgIGVsbS5fRE9PTV9wcm9wID89IHt9XG4gICAgZWxtLl9ET09NX3N0eWxlID89IHt9XG5cbiAgICBpZiB0eXBlb2Ygb3B0cyBpcyBcIm9iamVjdFwiXG4gICAgICBmb3IgaywgdiBvZiBvcHRzXG4gICAgICAgIHdyaXRlIGVsbSwgaywgdlxuICAgICAgcmV0dXJuIGVsbVxuICAgIGVsc2UgaWYgdHlwZW9mIG9wdHMgaXMgXCJzdHJpbmdcIlxuICAgICAgcmV0dXJuIHJlYWQgZWxtLCBvcHRzXG5cblxuICAjIFBVQkxJQyBBUEkgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiAgIyBUaGUgZmlyc3QgYXJnIGNhbiBiZSBhbiBlbG0gb3IgYXJyYXkgb2YgZWxtc1xuICAjIFRoZSBzZWNvbmQgYXJnIGNhbiBiZSBhbiBvYmplY3Qgb2Ygc3R1ZmYgdG8gdXBkYXRlIGluIHRoZSBlbG0ocyksIGluIHdoaWNoIGNhc2Ugd2UnbGwgcmV0dXJuIHRoZSBlbG0ocykuXG4gICMgT3IgaXQgY2FuIGJlIGEgc3RyaW5nIHByb3AvYXR0ci9zdHlsZSB0byByZWFkIGZyb20gdGhlIGVsbShzKSwgaW4gd2hpY2ggY2FzZSB3ZSByZXR1cm4gdGhlIHZhbHVlKHMpLlxuICBET09NID0gKGVsbXMsIG9wdHMpLT5cbiAgICBlbG1zID0gW2VsbXNdIHVubGVzcyB0eXBlb2YgZWxtcyBpcyBcImFycmF5XCJcbiAgICAodGhyb3cgbmV3IEVycm9yIFwiRE9PTSB3YXMgY2FsbGVkIHdpdGggYSBudWxsIGVsZW1lbnRcIiB1bmxlc3MgZWxtPykgZm9yIGVsbSBpbiBlbG1zXG4gICAgdGhyb3cgbmV3IEVycm9yIFwiRE9PTSB3YXMgY2FsbGVkIHdpdGggbnVsbCBvcHRpb25zXCIgdW5sZXNzIG9wdHM/XG4gICAgcmVzdWx0cyA9IChhY3QgZWxtLCBvcHRzIGZvciBlbG0gaW4gZWxtcylcbiAgICByZXR1cm4gaWYgcmVzdWx0cy5sZW5ndGggaXMgMSB0aGVuIHJlc3VsdHNbMF0gZWxzZSByZXN1bHRzXG5cblxuICBET09NLmNyZWF0ZSA9ICh0eXBlLCBwYXJlbnQsIG9wdHMpLT5cbiAgICBpZiBzdmdFbG1zW3R5cGVdP1xuICAgICAgZWxtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TIHN2Z05TLCB0eXBlXG4gICAgICBpZiB0eXBlIGlzIFwic3ZnXCJcbiAgICAgICAgKG9wdHMgPz0ge30pLnhtbG5zID0gc3ZnTlNcbiAgICAgIGVsc2VcbiAgICAgICAgZWxtLl9ET09NX1NWRyA9IHRydWVcbiAgICBlbHNlXG4gICAgICBlbG0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50IHR5cGVcbiAgICBET09NIGVsbSwgb3B0cyBpZiBvcHRzP1xuICAgIERPT00uYXBwZW5kIHBhcmVudCwgZWxtIGlmIHBhcmVudD9cbiAgICByZXR1cm4gZWxtXG5cblxuICBET09NLmFwcGVuZCA9IChwYXJlbnQsIGNoaWxkKS0+XG4gICAgcGFyZW50LmFwcGVuZENoaWxkIGNoaWxkXG4gICAgcmV0dXJuIGNoaWxkXG5cblxuICBET09NLnByZXBlbmQgPSAocGFyZW50LCBjaGlsZCktPlxuICAgIGlmIHBhcmVudC5oYXNDaGlsZE5vZGVzKClcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUgY2hpbGQsIHBhcmVudC5maXJzdENoaWxkXG4gICAgZWxzZVxuICAgICAgcGFyZW50LmFwcGVuZENoaWxkIGNoaWxkXG4gICAgcmV0dXJuIGNoaWxkXG5cblxuICBET09NLnJlbW92ZSA9IChlbG0sIGNoaWxkKS0+XG4gICAgaWYgY2hpbGQ/XG4gICAgICBlbG0ucmVtb3ZlQ2hpbGQgY2hpbGQgaWYgY2hpbGQucGFyZW50Tm9kZSBpcyBlbG1cbiAgICAgIHJldHVybiBjaGlsZFxuICAgIGVsc2VcbiAgICAgIGVsbS5yZW1vdmUoKVxuICAgICAgcmV0dXJuIGVsbVxuXG5cbiAgRE9PTS5lbXB0eSA9IChlbG0pLT5cbiAgICBlbG0uaW5uZXJIVE1MID0gXCJcIlxuXG5cbiAgIyBBdHRhY2ggdG8gdGhpc1xuICBARE9PTSA9IERPT00gaWYgQD9cblxuICAjIEF0dGFjaCB0byB0aGUgd2luZG93XG4gIHdpbmRvdy5ET09NID0gRE9PTSBpZiB3aW5kb3c/XG5cbiAgIyBJbnRlZ3JhdGUgd2l0aCBUYWtlICYgTWFrZVxuICBNYWtlIFwiRE9PTVwiLCBET09NIGlmIE1ha2U/XG5cblxuXG4jIGxpYi9maWxlLXRyZWUuY29mZmVlXG5UYWtlIFtcIlJlYWRcIl0sIChSZWFkKS0+XG5cbiAgc29ydCA9IChhLCBiKS0+IGEubmFtZS5sb2NhbGVDb21wYXJlIGIubmFtZVxuXG4gIHBvcHVsYXRlVHJlZSA9ICh0cmVlKS0+XG4gICAgaWYgYXdhaXQgUmVhZC5leGlzdHMgdHJlZS5wYXRoXG4gICAgICBkaXJlbnRzID0gYXdhaXQgUmVhZC53aXRoRmlsZVR5cGVzIHRyZWUucGF0aFxuICAgICAgZGlyZW50cy5zb3J0IHNvcnRcbiAgICAgIHRyZWUuY2hpbGRyZW4gPSBhd2FpdCBQcm9taXNlLmFsbCBkaXJlbnRzLm1hcCAoZGlyZW50KS0+XG4gICAgICAgIGlmIGRpcmVudC5pc0RpcmVjdG9yeSgpXG4gICAgICAgICAgY2hpbGRUcmVlID0gRmlsZVRyZWUubmV3RW1wdHkgdHJlZS5wYXRoLCBkaXJlbnQubmFtZVxuICAgICAgICAgIGNoaWxkVHJlZS5yZWxwYXRoID0gUmVhZC5wYXRoIHRyZWUucmVscGF0aCwgZGlyZW50Lm5hbWVcbiAgICAgICAgICBhd2FpdCBwb3B1bGF0ZVRyZWUgY2hpbGRUcmVlXG4gICAgICAgICAgdHJlZS5jb3VudCArPSBjaGlsZFRyZWUuY291bnRcbiAgICAgICAgICBjaGlsZFRyZWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRyZWUuY291bnQgKz0gMVxuICAgICAgICAgIHBhcnRzID0gZGlyZW50Lm5hbWUuc3BsaXQgXCIuXCJcbiAgICAgICAgICBjaGlsZEZpbGUgPVxuICAgICAgICAgICAgbmFtZTogZGlyZW50Lm5hbWVcbiAgICAgICAgICAgIGJhc2VuYW1lOiBBcnJheS5idXRMYXN0KHBhcnRzKS5qb2luIFwiLlwiXG4gICAgICAgICAgICBleHQ6IGlmIHBhcnRzLmxlbmd0aCA+IDEgdGhlbiBBcnJheS5sYXN0KHBhcnRzKS50b0xvd2VyQ2FzZSgpIGVsc2UgbnVsbFxuICAgICAgICAgICAgcGF0aDogUmVhZC5wYXRoIHRyZWUucGF0aCwgZGlyZW50Lm5hbWVcbiAgICAgICAgICAgIHJlbHBhdGg6IFJlYWQucGF0aCB0cmVlLnJlbHBhdGgsIGRpcmVudC5uYW1lXG4gICAgdHJlZVxuXG4gIE1ha2UgXCJGaWxlVHJlZVwiLCBGaWxlVHJlZSA9XG4gICAgbmV3RW1wdHk6IChwYXJlbnRQYXRoLCBuYW1lKS0+XG4gICAgICBuYW1lOiBuYW1lXG4gICAgICBiYXNlbmFtZTogbmFtZVxuICAgICAgZXh0OiBudWxsXG4gICAgICBwYXRoOiBSZWFkLnBhdGggcGFyZW50UGF0aCwgbmFtZSAjIGFic29sdXRlIHBhdGggb24gdGhlIGxvY2FsIEhEXG4gICAgICByZWxwYXRoOiBuYW1lICMgcGF0aCByZWxhdGl2ZSB0byB0aGUgcGFyZW50IG9mIHRoZSB0cmVlIHJvb3RcbiAgICAgIGNvdW50OiAwXG4gICAgICBjaGlsZHJlbjogW11cblxuICAgIG5ld1BvcHVsYXRlZDogKHBhcmVudFBhdGgsIG5hbWUpLT5cbiAgICAgIHJvb3QgPSBGaWxlVHJlZS5uZXdFbXB0eSBwYXJlbnRQYXRoLCBuYW1lXG4gICAgICBhd2FpdCBwb3B1bGF0ZVRyZWUgcm9vdFxuICAgICAgcm9vdFxuXG4gICAgZmxhdDogKHRyZWUsIGssIGludG8gPSBbXSktPlxuICAgICAgZm9yIGNoaWxkIGluIHRyZWUuY2hpbGRyZW5cbiAgICAgICAgaWYgbm90IGs/ICMgY29sbGVjdGluZyBjaGlsZHJlblxuICAgICAgICAgIGludG8ucHVzaCBjaGlsZFxuICAgICAgICBlbHNlIGlmIGNoaWxkW2tdPyAjIGNvbGxlY3RpbmcgY2hpbGRyZW4ncyBwcm9wZXJ0aWVzXG4gICAgICAgICAgaW50by5wdXNoIGNoaWxkW2tdXG4gICAgICAgIEZpbGVUcmVlLmZsYXQgY2hpbGQsIGssIGludG8gaWYgY2hpbGQuY2hpbGRyZW5cbiAgICAgIGludG9cblxuICAgIGZpbmQ6ICh0cmVlLCBrLCB2KS0+XG4gICAgICByZXR1cm4gdHJlZSBpZiB0cmVlW2tdIGlzIHZcbiAgICAgIGlmIHRyZWUuY2hpbGRyZW5cbiAgICAgICAgZm9yIGNoaWxkIGluIHRyZWUuY2hpbGRyZW5cbiAgICAgICAgICByZXR1cm4gcmVzIGlmIHJlcyA9IEZpbGVUcmVlLmZpbmQgY2hpbGQsIGssIHZcbiAgICAgIG51bGxcblxuXG5cbiMgbGliL2ZydXN0cmF0aW9uLmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuICBhcnIgPSBbXG4gICAgXCLigKJf4oCiYCBcIixcbiAgICBcImDigKJf4oCiYFwiLFxuICAgIFwiIGDigKJf4oCiXCIsXG4gICAgXCIgIG8ub1wiLFxuICAgIFwiIG8ubyBcIixcbiAgICBcIm8ubyAgXCIsXG4gICAgXCLigKLiiJrigKIgIFwiLFxuICAgIFwiIOKAouKImuKAoiBcIixcbiAgICBcIiAg4oCi4oia4oCiXCIsXG4gICAgXCIgIMKwZcKwXCIsXG4gICAgXCIgwrBvwrAgXCIsXG4gICAgXCLCsDPCsCAgXCIsXG4gICAgXCJ2X3YgIFwiLFxuICAgIFwiIHZfdiBcIixcbiAgICBcIiAgdl92XCIsXG4gICAgXCIgYOKAos+J4oCiXCIsXG4gICAgXCJg4oCiz4nigKJgXCIsXG4gICAgXCLigKLPieKAomAgXCIsXG4gICAgXCLigJhe4oCYICBcIixcbiAgICBcIiAnXicgXCIsXG4gICAgXCIgIGBeYFwiLFxuICAgIFwiICBU4oieVFwiLFxuICAgIFwiIFTiiJ5UIFwiLFxuICAgIFwiVOKInlQgIFwiLFxuICAgIFwiwqFewqEgIFwiLFxuICAgIFwiIMKhXsKhIFwiLFxuICAgIFwiICDCoV7CoVwiLFxuICAgIFwiICA7XztcIixcbiAgICBcIiA7XzsgXCIsXG4gICAgXCI7XzsgIFwiXG4gIF1cblxuICBNYWtlIFwiRnJ1c3RyYXRpb25cIiwgKGkpLT5cbiAgICBpZiBpP1xuICAgICAgaSAlPSBhcnIubGVuZ3RoXG4gICAgZWxzZVxuICAgICAgaSA9IE1hdGgucmFuZCAwLCBhcnIubGVuZ3RoXG4gICAgYXJyW2l8MF1cblxuXG5cbiMgbGliL2l0ZXJhdGVkLmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuXG4gIE1ha2UgXCJJdGVyYXRlZFwiLCBJdGVyYXRlZCA9ICguLi5bdGltZUxpbWl0ID0gNV0sIGl0ZXJhdGVkRnVuY3Rpb24pLT5cblxuICAgIG5leHRGcmFtZVJlcXVlc3RlZCA9IGZhbHNlXG4gICAgcnVuQWdhaW5OZXh0RnJhbWUgPSBmYWxzZVxuICAgIGRpZFJ1blRoaXNGcmFtZSA9IGZhbHNlXG4gICAgcmFuT3V0T2ZUaW1lID0gZmFsc2VcbiAgICBzdGFydFRpbWUgPSBudWxsXG5cbiAgICBydW4gPSAoKS0+XG4gICAgICAjIE9ubHkgcnVuIG9uY2UgcGVyIGZyYW1lLiBJZiB3ZSd2ZSBhbHJlYWR5IHJ1biwgbWFyayB0aGF0IHdlIHdhbnQgdG8gcnVuIGFnYWluIG5leHQgZnJhbWUuXG4gICAgICByZXR1cm4gcnVuQWdhaW5OZXh0RnJhbWUgPSB0cnVlIGlmIGRpZFJ1blRoaXNGcmFtZVxuICAgICAgZGlkUnVuVGhpc0ZyYW1lID0gdHJ1ZVxuXG4gICAgICAjIFdoZW5ldmVyIHdlIHJ1biwgd2UgbmVlZCB0byBkbyBzb21lIGFkZGl0aW9uYWwgd29yayBuZXh0IGZyYW1lLlxuICAgICAgcmVxdWVzdE5leHRGcmFtZSgpXG5cbiAgICAgICMgRGVmZXIgdGhlIGV4ZWN1dGlvbiBvZiB0aGUgZnVuY3Rpb24gKnNsaWdodGx5KiwgdG8gaW1wcm92ZSBiYXRjaGluZyBiZWhhdmlvdXJcbiAgICAgICMgd2hlbiBhbiBpdGVyYXRlZCBmdW5jdGlvbiBpcyBjYWxsZWQgcmVwZWF0ZWRseSBpbnNpZGUgYSBsb29wIChlZzogYnkgbGliL2pvYi5jb2ZmZWUpLlxuICAgICAgcXVldWVNaWNyb3Rhc2sgKCktPlxuXG4gICAgICAgICMgTm93IHdlIGNhbiBhY3R1YWxseSBydW4gdGhlIGl0ZXJhdGVkIGZ1bmN0aW9uIVxuICAgICAgICBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgICAgICBpdGVyYXRlZEZ1bmN0aW9uIG1vcmVcblxuICAgICAgIyBJdGVyYXRlZCBmdW5jdGlvbnMgYXJlIGp1c3QgZm9yIHNpZGUgZWZmZWN0cyDigJQgYSByZXR1cm4gdmFsdWUgaXMgbm90IG5lZWRlZC5cbiAgICAgIG51bGxcblxuXG4gICAgcmVxdWVzdE5leHRGcmFtZSA9ICgpLT5cbiAgICAgIHJldHVybiBpZiBuZXh0RnJhbWVSZXF1ZXN0ZWRcbiAgICAgIG5leHRGcmFtZVJlcXVlc3RlZCA9IHRydWVcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBuZXh0RnJhbWVcblxuICAgICMgV2hlbmV2ZXIgc29tZW9uZSBjYWxscyBydW4oKSwgd2UgKmFsd2F5cyogbmVlZCB0byBkbyBzb21lIGNsZWFudXAgd29yaywgYW5kIG1lIG1pZ2h0XG4gICAgIyBhbHNvIG5lZWQgdG8gY2FsbCBydW4oKSBhZ2FpbiBvdXJzZWx2ZXMgaWYgdGhlcmUncyBtb3JlIGl0ZXJhdGVkIHdvcmsgdG8gYmUgZG9uZS5cbiAgICBuZXh0RnJhbWUgPSAoKS0+XG4gICAgICBkb1J1biA9IHJ1bkFnYWluTmV4dEZyYW1lXG4gICAgICBuZXh0RnJhbWVSZXF1ZXN0ZWQgPSBmYWxzZVxuICAgICAgcnVuQWdhaW5OZXh0RnJhbWUgPSBmYWxzZVxuICAgICAgZGlkUnVuVGhpc0ZyYW1lID0gZmFsc2VcbiAgICAgIHJhbk91dE9mVGltZSA9IGZhbHNlXG4gICAgICBydW4oKSBpZiBkb1J1blxuXG4gICAgIyBUaGlzIGZ1bmN0aW9uIHdpbGwgdGVsbCB0aGUgY2FsbGVyIHdoZXRoZXIgdGhleSdyZSBzYWZlIHRvIGRvIG1vcmUgd29yayB0aGlzIGZyYW1lLlxuICAgICMgVGhleSdsbCBjYWxsIGl0IHJlcGVhdGVkbHkgaW4gYSBsb29wICh3aGlsZSBkb2luZyBvdGhlciB3b3JrKSB1bnRpbCBlaXRoZXIgdGhleVxuICAgICMgcnVuIG91dCBvZiB0aW1lIGFuZCBicmVhayBvdXQgb2YgdGhlIGxvb3AsIG9yIHJ1biBvdXQgb2Ygd29yayB0byBkbyBhbmQganVzdCBzdG9wXG4gICAgIyBjYWxsaW5nIHVzLlxuICAgIG1vcmUgPSAoY3VzdG9tTGltaXQpLT5cbiAgICAgIHJhbk91dE9mVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRUaW1lID4gKGN1c3RvbUxpbWl0IG9yIHRpbWVMaW1pdClcblxuICAgICAgaWYgcmFuT3V0T2ZUaW1lXG4gICAgICAgICMgTWFyayB0aGF0IHdlIHdhbnQgdG8gYWN0dWFsbHkgZG8gYSBydW4oKSBuZXh0IGZyYW1lLCBub3QganVzdCB0aGUgdXN1YWwgY2xlYW51cC5cbiAgICAgICAgcnVuQWdhaW5OZXh0RnJhbWUgPSB0cnVlXG5cbiAgICAgICAgIyBXZSBhbHdheXMgbmVlZCB0byByZXF1ZXN0IGEgbmV3IGZyYW1lLCBzaW5jZSB0aGUgY2FsbCB0byBtb3JlKCkgbWlnaHQgY29tZVxuICAgICAgICAjIGxvbmcgYWZ0ZXIgdGhlIGxhc3QgY2FsbCB0byBydW4oKSBpZiB0aGUgaXRlcmF0ZWQgZnVuY3Rpb24gaXMgZG9pbmcgc29tZXRoaW5nIGFzeW5jLlxuICAgICAgICByZXF1ZXN0TmV4dEZyYW1lKClcblxuICAgICAgcmV0dXJuIG5vdCByYW5PdXRPZlRpbWVcblxuICAgIHJldHVybiBydW5cblxuXG5cbiMgbGliL2pvYi5jb2ZmZWVcblRha2UgW10sICgpLT5cblxuICBoYW5kbGVycyA9IHt9XG4gIHdhdGNoZXJzID0gW11cbiAgcnVubmluZyA9IGZhbHNlXG4gIGxhc3RUaW1lID0gbnVsbFxuICBsYXN0TiA9IFtdXG5cbiAgTWFrZS5hc3luYyBcIkpvYlwiLCBKb2IgPSAocHJpb3JpdHksIHR5cGUsIC4uLmFyZ3MpLT5cbiAgICAjIFByaW9yaXR5IGlzIG9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gMFxuICAgIGlmIFN0cmluZy50eXBlIHByaW9yaXR5XG4gICAgICByZXR1cm4gSm9iIDAsIHByaW9yaXR5LCB0eXBlLCAuLi5hcmdzXG5cbiAgICB0aHJvdyBFcnJvciBcIk5vIGhhbmRsZXIgZm9yIGpvYiB0eXBlOiAje3R5cGV9XCIgdW5sZXNzIGhhbmRsZXJzW3R5cGVdP1xuXG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgIEpvYi5xdWV1ZXNbcHJpb3JpdHldID89IFtdXG4gICAgICBKb2IucXVldWVzW3ByaW9yaXR5XS5wdXNoIHt0eXBlLCBhcmdzLCByZXNvbHZlfVxuICAgICAgSm9iLmNvdW50KytcbiAgICAgIEpvYi5ydW5Kb2JzKClcblxuICBKb2IucXVldWVzID0gW11cbiAgSm9iLmNvdW50ID0gMFxuICBKb2IuZGVsYXkgPSAwXG5cbiAgSm9iLmhhbmRsZXIgPSAodHlwZSwgaGFuZGxlciktPlxuICAgIGlmIGhhbmRsZXJzW3R5cGVdIHRoZW4gdGhyb3cgRXJyb3IgXCJBIGpvYiBoYW5kbGVyIGZvciAje3R5cGV9IGFscmVhZHkgZXhpc3RzXCJcbiAgICBoYW5kbGVyc1t0eXBlXSA9IGhhbmRsZXJcblxuICBKb2Iud2F0Y2hlciA9ICh3YXRjaGVyKS0+XG4gICAgd2F0Y2hlcnMucHVzaCB3YXRjaGVyXG5cbiAgSm9iLnJ1bkpvYnMgPSAoKS0+XG4gICAgcmV0dXJuIGlmIHJ1bm5pbmdcbiAgICBydW5uaW5nID0gdHJ1ZVxuICAgIGxhc3RUaW1lID0gcGVyZm9ybWFuY2Uubm93KClcbiAgICBKb2IuZGVsYXkgPSAxNlxuICAgIHVwZGF0ZVdhdGNoZXJzKClcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcnVuXG5cbiAgcnVuID0gKCktPlxuICAgIGRpcnR5ID0gZmFsc2VcbiAgICBmb3IgcXVldWUsIHByaW9yaXR5IGluIEpvYi5xdWV1ZXMgYnkgLTFcbiAgICAgIHdoaWxlIHF1ZXVlPy5sZW5ndGggPiAwXG4gICAgICAgIGRpcnR5ID0gdHJ1ZVxuICAgICAgICB7dGltZSwgdHlwZSwgYXJncywgcmVzb2x2ZX0gPSBxdWV1ZS5zaGlmdCgpXG4gICAgICAgIEpvYi5jb3VudC0tXG4gICAgICAgIHJlc29sdmUgaGFuZGxlcnNbdHlwZV0gLi4uYXJncyAjIFdlIGNhbid0IGF3YWl0LCBvciBlbHNlIGlmIGEgSm9iIGNyZWF0ZXMgYSBuZXcgSm9iIGluc2lkZSBpdHNlbGYsIHdlJ2xsIGdldCBzdHVja1xuICAgICAgICBKb2IuZGVsYXkgPSAocGVyZm9ybWFuY2Uubm93KCkgLSBsYXN0VGltZSkgKiAwLjEgKyBKb2IuZGVsYXkgKiAwLjlcbiAgICAgICAgcmV0dXJuIGJhaWwoKSBpZiBKb2IuZGVsYXkgPiAzMCAjIERvbid0IGxldCB0aGUgZnJhbWUgcmF0ZSBjcmF0ZXJcbiAgICBydW5uaW5nID0gZmFsc2VcbiAgICAjIElmIGFueSBqb2JzIHJhbiB0aGlzIGZyYW1lLCB3ZSBzaG91bGQgcnVuIGF0IGxlYXN0IG9uZSBtb3JlIHRpbWUsIGluIGNhc2UgYW55IGpvYnMgdGhhdCB3ZSByYW4gY3JlYXRlZCBuZXcgam9icyBhdCBhIGhpZ2hlciBwcmlvcml0eS5cbiAgICBKb2IucnVuSm9icygpIGlmIGRpcnR5XG4gICAgdXBkYXRlV2F0Y2hlcnMoKVxuXG4gIGJhaWwgPSAoKS0+XG4gICAgbGFzdFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBydW5cbiAgICB1cGRhdGVXYXRjaGVycygpXG5cbiAgdXBkYXRlV2F0Y2hlcnMgPSAoKS0+XG4gICAgZm9yIHdhdGNoZXIgaW4gd2F0Y2hlcnNcbiAgICAgIHdhdGNoZXIgSm9iLmNvdW50LCBKb2IuZGVsYXlcbiAgICBudWxsXG5cblxuXG4jIGxpYi9sb2ctaW5pdGlhbGl6YXRpb24tdGltZS5jb2ZmZWVcbmRvICgpLT5cbiAgeyBwZXJmb3JtYW5jZSB9ID0gcmVxdWlyZSBcInBlcmZfaG9va3NcIiB1bmxlc3MgcGVyZm9ybWFuY2U/XG5cbiAgdGltZSA9IHBlcmZvcm1hbmNlLm5vdygpXG5cbiAgTG9nID0gYXdhaXQgVGFrZS5hc3luYyBcIkxvZ1wiXG5cbiAgTG9nIFwiSW5pdGlhbGl6YXRpb24gVGltZVwiLCBudWxsLCB0aW1lXG5cblxuXG4jIGxpYi9sb2cuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG4gIHsgcGVyZm9ybWFuY2UgfSA9IHJlcXVpcmUgXCJwZXJmX2hvb2tzXCIgdW5sZXNzIHBlcmZvcm1hbmNlP1xuXG4gICMgV2UgY2FuJ3QgLyBzaG91bGRuJ3QgVGFrZSBhbnl0aGluZywgc2luY2UgTG9nIG1pZ2h0IG5lZWQgdG8gYmUgdXNlZCAqYW55d2hlcmUqXG4gIERCID0gRW52ID0gSVBDID0gUHJpbnRlciA9IG51bGxcblxuICBNYWtlLmFzeW5jIFwiTG9nXCIsIExvZyA9IChtc2csIGF0dHJzLCB0aW1lKS0+XG4gICAgRW52ID89IFRha2UgXCJFbnZcIlxuXG4gICAgIyBTZW5kIGxvZ3MgdG8gdGhlIGxvY2FsIHByaW50ZXJcbiAgICBpZiBQcmludGVyID89IFRha2UgXCJQcmludGVyXCJcbiAgICAgIFByaW50ZXIgbXNnLCBhdHRycywgdGltZVxuXG4gICAgIyBJZiB3ZSBoYXZlIGEgcG9ydCB0byB0aGUgREIsIHNlbmQgbG9ncyB0byB0aGUgREIgUHJpbnRlclxuICAgIGlmIERCID89IFRha2UgXCJEQlwiXG4gICAgICBEQi5zZW5kIFwicHJpbnRlclwiLCBtc2csIGF0dHJzLCB0aW1lXG5cbiAgICAjIElmIHdlJ3JlIGluIGRldiwgYW5kIGluIGEgcmVuZGVyIHByb2Nlc3MsIHNlbmQgbG9ncyB0byB0aGUgbWFpbiBwcm9jZXNzIFByaW50ZXJcbiAgICBpZiBFbnY/LmlzRGV2IGFuZCBFbnY/LmlzUmVuZGVyIGFuZCBJUEMgPz0gVGFrZSBcIklQQ1wiXG4gICAgICBJUEMuc2VuZCBcInByaW50ZXJcIiwgbXNnLCBhdHRycywgdGltZVxuXG4gICAgcmV0dXJuIG1zZ1xuXG4gIExvZy50aW1lID0gKG1zZywgZm4pLT5cbiAgICBzdGFydCA9IHBlcmZvcm1hbmNlLm5vdygpXG4gICAgdiA9IGZuKClcbiAgICBMb2cudGltZS5mb3JtYXR0ZWQgbXNnLCBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0XG4gICAgcmV0dXJuIHZcblxuICBMb2cudGltZS5hc3luYyA9IChtc2csIGZuKS0+XG4gICAgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgIHYgPSBhd2FpdCBmbigpXG4gICAgTG9nLnRpbWUuZm9ybWF0dGVkIG1zZywgcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFxuICAgIHJldHVybiB2XG5cbiAgTG9nLnRpbWUuY3VzdG9tID0gKHByZU1zZyktPlxuICAgIExvZyBwcmVNc2cgaWYgcHJlTXNnXG4gICAgc3RhcnQgPSBwZXJmb3JtYW5jZS5ub3coKVxuICAgIChwb3N0TXNnKS0+IExvZy50aW1lLmZvcm1hdHRlZCBwb3N0TXNnLCBwZXJmb3JtYW5jZS5ub3coKSAtIHN0YXJ0XG5cbiAgTG9nLnRpbWUuZm9ybWF0dGVkID0gKG1zZywgdGltZSktPlxuICAgIExvZyB0aW1lLnRvRml4ZWQoMSkucGFkU3RhcnQoNikgKyBcIiBcIiArIG1zZ1xuXG4gIExvZy5lcnIgPSAobXNnKS0+XG4gICAgTG9nIG1zZywgY29sb3I6IFwiI0YwMFwiXG5cblxuXG4jIGxpYi9wYXRocy5jb2ZmZWVcblRha2UgW1wiUmVhZFwiXSwgKFJlYWQpLT5cblxuICBNYWtlIFwiUGF0aHNcIiwgUGF0aHMgPVxuICAgIGZpbGVzOiAoYXNzZXQpLT4gICAgICAgICAgICAgICBSZWFkLnBhdGggYXNzZXQucGF0aCwgXCJGaWxlc1wiXG4gICAgbmFtZXM6IChhc3NldCktPiAgICAgICAgICAgICAgIFJlYWQucGF0aCBhc3NldC5wYXRoLCBcIk5hbWVcIlxuICAgIHNob3RzOiAoYXNzZXQpLT4gICAgICAgICAgICAgICBSZWFkLnBhdGggYXNzZXQucGF0aCwgXCJTaG90XCJcbiAgICBuZXdTaG90czogKGFzc2V0KS0+ICAgICAgICAgICAgUmVhZC5wYXRoIGFzc2V0LnBhdGgsIFwiU2hvdCAoTmV3KVwiXG4gICAgdGFnczogKGFzc2V0KS0+ICAgICAgICAgICAgICAgIFJlYWQucGF0aCBhc3NldC5wYXRoLCBcIlRhZ3NcIlxuICAgIHRodW1ibmFpbHM6IChhc3NldCktPiAgICAgICAgICBSZWFkLnBhdGggYXNzZXQucGF0aCwgXCJUaHVtYm5haWwgQ2FjaGVcIlxuXG4gICAgZmlsZTogKGFzc2V0LCBmaWxlbmFtZSktPiAgICAgIFJlYWQucGF0aCBQYXRocy5maWxlcyhhc3NldCksIGZpbGVuYW1lXG4gICAgbmFtZTogKGFzc2V0KS0+ICAgICAgICAgICAgICAgIFJlYWQucGF0aCBQYXRocy5uYW1lcyhhc3NldCksIGFzc2V0Lm5hbWVcbiAgICBzaG90OiAoYXNzZXQpLT4gICAgICAgICAgICAgICAgUmVhZC5wYXRoIFBhdGhzLnNob3RzKGFzc2V0KSwgYXNzZXQuc2hvdFxuICAgIG5ld1Nob3Q6IChhc3NldCktPiAgICAgICAgICAgICBSZWFkLnBhdGggUGF0aHMubmV3U2hvdHMoYXNzZXQpLCBhc3NldC5uZXdTaG90XG4gICAgdGh1bWJuYWlsOiAoYXNzZXQsIGZpbGVuYW1lKS0+IFJlYWQucGF0aCBQYXRocy50aHVtYm5haWxzKGFzc2V0KSwgZmlsZW5hbWVcbiAgICB0YWc6IChhc3NldCwgdGFnKS0+ICAgICAgICAgICAgUmVhZC5wYXRoIFBhdGhzLnRhZ3MoYXNzZXQpLCB0YWdcblxuICAgIHRodW1ibmFpbE5hbWU6IChmaWxlLCBzaXplKS0+ICBcIiN7U3RyaW5nLmhhc2ggZmlsZS5yZWxwYXRofS0je3NpemV9LmpwZ1wiXG5cbiAgICBleHQ6XG4gICAgICBpY29uOiB7XCJhc1wiLCBcImNwdHhcIiwgXCJjc3NcIiwgXCJkd2dcIiwgXCJleGVcIiwgXCJmbGFcIiwgXCJpZGxrXCIsIFwiaW5kYlwiLCBcImluZGRcIiwgXCJzd2ZcIiwgbnVsbDp0cnVlLCB1bmRlZmluZWQ6dHJ1ZX0gIyBJbmNsdWRlIG51bGwgLyB1bmRlZmluZWQgYmVjYXVzZSB3ZSB3YW50IHRob3NlIHRvIGdldCBhbiBpY29uLCBub3QgYSB0aHVtYm5haWxcbiAgICAgIHNpcHM6IHtcIjNmclwiLFwiYXJ3XCIsXCJhc3RjXCIsXCJhdmNpXCIsXCJibXBcIixcImNyMlwiLFwiY3IzXCIsXCJjcndcIixcImRjclwiLFwiZGRzXCIsXCJkbmdcIixcImR4b1wiLFwiZXJmXCIsXCJleHJcIixcImZmZlwiLFwiZ2lmXCIsXCJoZWljXCIsXCJoZWljc1wiLFwiaGVpZlwiLFwiaWNuc1wiLFwiaWNvXCIsXCJpaXFcIixcImpwMlwiLFwianBlZ1wiLFwianBnXCIsXCJrdHhcIixcIm1vc1wiLFwibXBvXCIsXCJtcndcIixcIm5lZlwiLFwibnJ3XCIsXCJvcmZcIixcIm9yZlwiLFwib3JmXCIsXCJwYm1cIixcInBkZlwiLFwicGVmXCIsXCJwaWNcIixcInBpY3RcIixcInBuZ1wiLFwicHNkXCIsXCJwdnJcIixcInJhZlwiLFwicmF3XCIsXCJydzJcIixcInJ3bFwiLFwic2dpXCIsXCJzcjJcIixcInNyZlwiLFwic3J3XCIsXCJ0Z2FcIixcInRpZmZcIixcIndlYnBcIn1cbiAgICAgIHZpZGVvOiB7XCJhdmNoZFwiLCBcImF2aVwiLCBcIm00cFwiLCBcIm00dlwiLCBcIm1vdlwiLCBcIm1wMlwiLCBcIm1wNFwiLCBcIm1wZVwiLCBcIm1wZWdcIiwgXCJtcGdcIiwgXCJtcHZcIiwgXCJvZ2dcIiwgXCJxdFwiLCBcIndlYm1cIiwgXCJ3bXZcIn1cblxuXG5cbiMgbGliL3ByaW50ZXIuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG4gIHJldHVybiBpZiB3aW5kb3c/LmlzREIgIyBEQiBoYXMgaXRzIG93biBQcmludGVyXG5cbiAgeyBwZXJmb3JtYW5jZSB9ID0gcmVxdWlyZSBcInBlcmZfaG9va3NcIiB1bmxlc3MgcGVyZm9ybWFuY2U/XG5cbiAgTWFrZSBcIlByaW50ZXJcIiwgUHJpbnRlciA9IChtc2csIGF0dHJzLCB0aW1lKS0+XG4gICAgdGltZSA9ICh0aW1lIG9yIHBlcmZvcm1hbmNlLm5vdygpKS50b0ZpeGVkKDApLnBhZFN0YXJ0KDUpXG4gICAgY29uc29sZS5sb2cgdGltZSArIFwiICBcIiArIG1zZ1xuXG5cblxuIyBsaWIvcHViLXN1Yi5jb2ZmZWVcblRha2UgW10sICgpLT5cblxuICBzdWJzID0ge31cblxuICBTdWIgPSAobmFtZSwgY2IpLT5cbiAgICAoc3Vic1tuYW1lXSA/PSBbXSkucHVzaCBjYlxuXG4gIFB1YiA9IChuYW1lLCBhcmdzLi4uKS0+XG4gICAgaWYgc3Vic1tuYW1lXT9cbiAgICAgIGZvciBoYW5kbGVyIGluIHN1YnNbbmFtZV1cbiAgICAgICAgaGFuZGxlciBhcmdzLi4uXG4gICAgbnVsbFxuXG4gIE1ha2UgXCJQdWJTdWJcIiwge1B1YiwgU3VifVxuXG5cblxuIyBsaWIvcmVhZC5jb2ZmZWVcbiMgVE9ETzogQ2xlYXIgdXAgdGhlIG5hbWluZyBzbyB0aGF0IGV2ZXJ5dGhpbmcgaXMgZXhwbGljaXRseSBSZWFkLnN5bmMuZm9vIG9yIFJlYWQuYXN5bmMuZm9vXG5cblRha2UgW10sICgpLT5cbiAgZnMgPSByZXF1aXJlIFwiZnNcIlxuICBwYXRoID0gcmVxdWlyZSBcInBhdGhcIlxuXG4gIHZhbGlkRmlsZU5hbWUgPSAodiktPlxuICAgIHJldHVybiBmYWxzZSBpZiAwIGlzIHYuaW5kZXhPZiBcIi5cIiAjIEV4Y2x1ZGUgZG90ZmlsZXNcbiAgICByZXR1cm4gZmFsc2UgaWYgLTEgaXNudCB2LnNlYXJjaCAvWzw+OjssP1wiKnwvXFxcXF0vICMgRXhjbHVkZSBuYW1lcyB3ZSB3b24ndCBiZSBhYmxlIHRvIHJvdW5kdHJpcFxuICAgIHJldHVybiB0cnVlICMgRXZlcnl0aGluZyBlbHNlIGlzIGdvb2RcblxuICB2YWxpZERpcmVudE5hbWUgPSAodiktPlxuICAgIHZhbGlkRmlsZU5hbWUgdi5uYW1lXG5cbiAgZmlsdGVyVmFsaWREaXJlbnROYW1lID0gKHZzKS0+XG4gICAgdnMuZmlsdGVyIHZhbGlkRGlyZW50TmFtZVxuXG4gIFJlYWQgPSAoZm9sZGVyUGF0aCktPlxuICAgIHRyeVxuICAgICAgZmlsZU5hbWVzID0gZnMucmVhZGRpclN5bmMgZm9sZGVyUGF0aFxuICAgICAgZmlsZU5hbWVzLmZpbHRlciB2YWxpZEZpbGVOYW1lXG4gICAgY2F0Y2hcbiAgICAgIG51bGxcblxuICAjIFRlbXBvcmFyeSBoYWNrIHVudGlsIHdlIGZ1bGx5IHN3aXRjaCBSZWFkIG92ZXIgdG8gc3BsaXQgc3luYyBhbmQgYXN5bmMuXG4gICMgTm90ZSB0aGF0IHdlIGNhbid0IGp1c3Qgc2F5IFJlYWQuc3luYyA9IFJlYWQsIG9yIHRoYXQgYnJlYWtzIFJlYWQuc3luYy5leGlzdHMhXG4gIFJlYWQuc3luYyA9IChwKS0+IFJlYWQgcFxuXG4gIFJlYWQuc3luYy5leGlzdHMgPSAocGF0aCktPlxuICAgIGZzLmV4aXN0c1N5bmMgcGF0aFxuXG4gIFJlYWQuYXN5bmMgPSAoZm9sZGVyUGF0aCktPlxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgICBmcy5yZWFkZGlyIGZvbGRlclBhdGgsIChlcnIsIGZpbGVOYW1lcyktPlxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgcmVzb2x2ZSBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXNvbHZlIGZpbGVOYW1lcy5maWx0ZXIgdmFsaWRGaWxlTmFtZVxuXG4gIFJlYWQud2l0aEZpbGVUeXBlcyA9IChmb2xkZXJQYXRoKS0+XG4gICAgZnMucHJvbWlzZXMucmVhZGRpciBmb2xkZXJQYXRoLCB7d2l0aEZpbGVUeXBlczp0cnVlfVxuICAgIC50aGVuIGZpbHRlclZhbGlkRGlyZW50TmFtZVxuXG4gIFJlYWQuaXNGb2xkZXIgPSAoZm9sZGVyUGF0aCktPlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgZm9sZGVyUGF0aD8ubGVuZ3RoXG4gICAgbmV3IFByb21pc2UgKHJlc29sdmUpLT5cbiAgICAgIGZzLnN0YXQgZm9sZGVyUGF0aCwgKGVyciwgc3RhdCktPlxuICAgICAgICByZXNvbHZlIHN0YXQ/LmlzRGlyZWN0b3J5KClcblxuICBSZWFkLnN0YXQgPSAocGF0aCktPlxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgICBmcy5zdGF0IHBhdGgsIChlcnIsIHN0YXQpLT5cbiAgICAgICAgcmVzb2x2ZSBzdGF0XG5cbiAgUmVhZC5leGlzdHMgPSAoZmlsZVBhdGgpLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIGZpbGVQYXRoPy5sZW5ndGhcbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPlxuICAgICAgZnMuYWNjZXNzIGZpbGVQYXRoLCAoZXJyKS0+XG4gICAgICAgIHJlc29sdmUgbm90IGVycj9cblxuICBSZWFkLmZpbGUgPSAoZmlsZVBhdGgpLT5cbiAgICB0cnlcbiAgICAgIGZpbGUgPSBmcy5yZWFkRmlsZVN5bmMgZmlsZVBhdGhcbiAgICBjYXRjaFxuICAgICAgbnVsbFxuXG4gIFJlYWQuc2VwID0gcGF0aC5zZXBcbiAgUmVhZC53YXRjaCA9IGZzLndhdGNoXG5cbiAgUmVhZC5wYXRoID0gKC4uLnNlZ3MpLT4gc2Vncy5qb2luIHBhdGguc2VwXG4gIFJlYWQuc3BsaXQgPSAocCktPiBBcnJheS5wdWxsIHAuc3BsaXQocGF0aC5zZXApLCBcIlwiXG4gIFJlYWQubGFzdCA9IChwKS0+IEFycmF5Lmxhc3QgUmVhZC5zcGxpdCBwXG4gIFJlYWQucGFyZW50UGF0aCA9IChwKS0+IFJlYWQucGF0aCAuLi5BcnJheS5idXRMYXN0IFJlYWQuc3BsaXQgcFxuXG4gIE1ha2UgXCJSZWFkXCIsIFJlYWRcblxuXG5cbiMgbGliL3NpemUtb24tZGlzay5jb2ZmZWVcblRha2UgW1wiUmVhZFwiXSwgKFJlYWQpLT5cblxuICBNYWtlLmFzeW5jIFwiU2l6ZU9uRGlza1wiLCBTaXplT25EaXNrID0gKHBhdGgpLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPlxuICAgICAgc3RhdHMgPSBhd2FpdCBSZWFkLnN0YXQgcGF0aFxuICAgICAgaWYgbm90IHN0YXRzP1xuICAgICAgICByZXNvbHZlIDBcbiAgICAgIGVsc2UgaWYgbm90IHN0YXRzLmlzRGlyZWN0b3J5KClcbiAgICAgICAgcmVzb2x2ZSBzdGF0cy5zaXplXG4gICAgICBlbHNlXG4gICAgICAgIHRvdGFsID0gMFxuICAgICAgICBjaGlsZHJlbiA9IGF3YWl0IFJlYWQuYXN5bmMgcGF0aFxuICAgICAgICBzaXplcyA9IGZvciBjaGlsZE5hbWUgaW4gY2hpbGRyZW5cbiAgICAgICAgICBTaXplT25EaXNrIFJlYWQucGF0aCBwYXRoLCBjaGlsZE5hbWVcbiAgICAgICAgZm9yIHNpemUgaW4gc2l6ZXNcbiAgICAgICAgICB0b3RhbCArPSBhd2FpdCBzaXplXG4gICAgICAgIHJlc29sdmUgdG90YWxcblxuICBTaXplT25EaXNrLnByZXR0eSA9IChwYXRoKS0+XG4gICAgc2l6ZSA9IGF3YWl0IFNpemVPbkRpc2sgcGF0aFxuICAgIGxlbiA9IHNpemUudG9TdHJpbmcoKS5sZW5ndGhcblxuICAgIHN3aXRjaFxuICAgICAgd2hlbiBsZW4gPCAzXG4gICAgICAgIHN1ZmZpeCA9IFwiQlwiXG4gICAgICAgIGV4cCA9IDBcbiAgICAgIHdoZW4gbGVuIDwgN1xuICAgICAgICBzdWZmaXggPSBcIktCXCJcbiAgICAgICAgZXhwID0gMVxuICAgICAgd2hlbiBsZW4gPCAxMVxuICAgICAgICBzdWZmaXggPSBcIk1CXCJcbiAgICAgICAgZXhwID0gMlxuICAgICAgZWxzZVxuICAgICAgICBzdWZmaXggPSBcIkdCXCJcbiAgICAgICAgZXhwID0gM1xuXG4gICAgKHNpemUgLyBNYXRoLnBvdygxMDAwLCBleHApKS50b0ZpeGVkKDEpICsgXCIgXCIgKyBzdWZmaXhcblxuXG5cbiMgbGliL3N0YXRlLmNvZmZlZVxuVGFrZSBbXSwgKCktPlxuXG4gIHN0YXRlID0ge31cbiAgc3Vic2NyaXB0aW9ucyA9IHtfY2JzOltdfVxuXG4gIGdldEF0ID0gKG5vZGUsIHBhdGgpLT5cbiAgICByZXR1cm4gW3tcIlwiOm5vZGV9LCBcIlwiXSBpZiBwYXRoIGlzIFwiXCJcbiAgICBwYXJ0cyA9IHBhdGguc3BsaXQgXCIuXCJcbiAgICBrID0gcGFydHMucG9wKClcbiAgICBmb3IgcGFydCBpbiBwYXJ0c1xuICAgICAgbm9kZSA9IG5vZGVbcGFydF0gPz0ge31cbiAgICBbbm9kZSwga11cblxuXG4gIE1ha2UuYXN5bmMgXCJTdGF0ZVwiLCBTdGF0ZSA9IChwYXRoID0gXCJcIiwgdiwge2ltbXV0YWJsZSA9IGZhbHNlfSA9IHt9KS0+XG4gICAgW25vZGUsIGtdID0gZ2V0QXQgc3RhdGUsIHBhdGhcblxuICAgIHJldHVybiBub2RlW2tdIGlmIHYgaXMgdW5kZWZpbmVkICMgSnVzdCBhIHJlYWRcblxuICAgICMgSXQncyBub3Qgc2FmZSB0byB0YWtlIHNvbWV0aGluZyBvdXQgb2YgU3RhdGUsIG11dGF0ZSBpdCwgYW5kIGNvbW1pdCBpdCBhZ2Fpbi5cbiAgICAjIFRoZSBpbW11dGFibGUgb3B0aW9uIHRlbGxzIHVzIHRoZSBjYWxsZXIgcHJvbWlzZXMgdGhleSdyZSBub3QgZG9pbmcgdGhhdC5cbiAgICAjIE90aGVyd2lzZSwgd2UgY2xvbmUgdmFsdWVzIGJlZm9yZSByZWFkaW5nIG9yIHdyaXRpbmcgdGhlbS5cbiAgICB2ID0gRnVuY3Rpb24uY2xvbmUgdiB1bmxlc3MgaW1tdXRhYmxlXG5cbiAgICBpZiBub3QgaW1tdXRhYmxlIGFuZCB2IGlzIG5vZGVba10gYW5kIChPYmplY3QudHlwZSh2KSBvciBBcnJheS50eXBlKHYpKVxuICAgICAgdGhyb3cgXCJEaWQgeW91IHRha2Ugc29tZXRoaW5nIG91dCBvZiBTdGF0ZSwgbXV0YXRlIGl0LCBhbmQgY29tbWl0IGl0IGFnYWluP1wiXG5cbiAgICB0aHJvdyBFcnJvciBcIllvdSdyZSBub3QgYWxsb3dlZCB0byBzZXQgdGhlIFN0YXRlIHJvb3RcIiBpZiBwYXRoIGlzIFwiXCJcblxuICAgIG9sZCA9IG5vZGVba11cblxuICAgIGlmIHY/IHRoZW4gbm9kZVtrXSA9IHYgZWxzZSBkZWxldGUgbm9kZVtrXVxuXG4gICAgaWYgRnVuY3Rpb24ubm90RXF1aXZhbGVudCB2LCBvbGRcbiAgICAgIHF1ZXVlTWljcm90YXNrICgpLT5cbiAgICAgICAgbG9jYWxOb3RpZnkgcGF0aCwgdlxuXG4gICAgcmV0dXJuIHZcblxuICBjb25kaXRpb25hbFNldCA9IChwYXRoLCB2LCBwcmVkKS0+XG4gICAgW25vZGUsIGtdID0gZ2V0QXQgc3RhdGUsIHBhdGhcbiAgICBkb1NldCA9IHByZWQgbm9kZVtrXSwgdlxuICAgIFN0YXRlIHBhdGgsIHYgaWYgZG9TZXRcbiAgICByZXR1cm4gZG9TZXRcblxuICAjIFRoZXNlIGFyZSB1c2VmdWwgYmVjYXVzZSB0aGV5IHJldHVybiB0cnVlIGlmIGEgY2hhbmdlIHdhcyBtYWRlXG4gIFN0YXRlLmNoYW5nZSA9IChwYXRoLCB2KS0+IGNvbmRpdGlvbmFsU2V0IHBhdGgsIHYsIEZ1bmN0aW9uLm5vdEVxdWl2YWxlbnRcbiAgU3RhdGUuZGVmYXVsdCA9IChwYXRoLCB2KS0+IGNvbmRpdGlvbmFsU2V0IHBhdGgsIHYsIEZ1bmN0aW9uLm5vdEV4aXN0c1xuXG4gICMgVGhpcyBpcyB1c2VmdWwgYmVjYXVzZSBpdCByZWR1Y2VzIHRoZSBuZWVkIHRvIHVwZGF0ZSBTdGF0ZSBpbiBhIGxvb3AsXG4gICMgd2hpY2ggdHJpZ2dlcnMgYSBsb3Qgb2YgKHBvc3NpYmx5IHBvaW50bGVzcykgbm90aWZpY2F0aW9ucy5cbiAgIyBSZW1pbmRlciB0aGF0IE9iamVjdC5tZXJnZSBkb2Vzbid0IGhhbmRsZSBhcnJheXMsIHNvIG1heWJlXG4gICMgbGltaXQgdGhlIHVzZSBvZiB0aGlzIGZ1bmN0aW9uIHRvIHByaW1pdGl2ZXMgKHNpbmNlIGl0IGltcGxpZXMgaW1tdXRhYmxlKS5cbiAgU3RhdGUubWVyZ2UgPSAocGF0aCwgdiktPiBTdGF0ZSBwYXRoLCAoT2JqZWN0Lm1lcmdlIHYsIFN0YXRlIHBhdGgpLCBpbW11dGFibGU6IHRydWVcblxuICAjIFRoZXNlIGFyZSB1c2VmdWwgYmVjYXVzZSBpdCBvZmZlcnMgYSBuaWNlIHN5bnRheCBmb3IgdXBkYXRpbmcgZXhpc3RpbmcgdmFsdWVzIGluIFN0YXRlLFxuICAjIHdpdGggc3VwcG9ydCBmb3IgYXN5bmMsIGVpdGhlciBtdXRhYmx5IG9yIGltbXV0YWJseS5cbiAgU3RhdGUudXBkYXRlID0gKHBhdGgsIGZuKS0+IFN0YXRlIHBhdGgsIChhd2FpdCBmbiBTdGF0ZSBwYXRoKSwgaW1tdXRhYmxlOiB0cnVlXG4gIFN0YXRlLm11dGF0ZSA9IChwYXRoLCBmbiktPiBTdGF0ZS5jbG9uZSBwYXRoLCAoYXdhaXQgZm4gU3RhdGUgcGF0aCksIGltbXV0YWJsZTogdHJ1ZVxuXG4gICMgVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciByZWFkaW5nIHNvbWV0aGluZyBmcm9tIFN0YXRlIHRoYXQgaXMgcHJlLWNsb25lZFxuICAjIChpZiBuZWNlc3NhcnkpIHRvIGF2b2lkIG11dGFiaWxpdHkgaXNzdWVzLlxuICBTdGF0ZS5jbG9uZSA9IChwYXRoKS0+IEZ1bmN0aW9uLmNsb25lIFN0YXRlIHBhdGhcblxuICBTdGF0ZS5zdWJzY3JpYmUgPSAoLi4uW3BhdGggPSBcIlwiLCBydW5Ob3cgPSB0cnVlLCB3ZWFrID0gZmFsc2VdLCBjYiktPlxuICAgIHRocm93IFwiSW52YWxpZCBzdWJzY3JpYmUgcGF0aFwiIHVubGVzcyBTdHJpbmcudHlwZSBwYXRoICMgQXZvaWQgZXJyb3JzIGlmIHlvdSB0cnkgc2F5IHN1YnNjcmliZShydW5Ob3csIGNiKVxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICAoKG5vZGVba10gPz0ge30pLl9jYnMgPz0gW10pLnB1c2ggY2JcbiAgICBjYi5fc3RhdGVfd2VhayA9IHdlYWsgIyAuLi4gdGhpcyBpcyBmaW5lIPCfkJXimJXvuI/wn5SlXG4gICAgY2IgU3RhdGUgcGF0aCBpZiBydW5Ob3dcblxuICBTdGF0ZS51bnN1YnNjcmliZSA9ICguLi5bcGF0aCA9IFwiXCJdLCBjYiktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICB0aHJvdyBFcnJvciBcIlVuc3Vic2NyaWJlIGZhaWxlZFwiIHVubGVzcyBjYiBpbiBub2RlW2tdLl9jYnNcbiAgICBBcnJheS5wdWxsIG5vZGVba10uX2NicywgY2JcbiAgICBudWxsXG5cbiAgbG9jYWxOb3RpZnkgPSAocGF0aCwgdiktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICBydW5DYnNXaXRoaW4gbm9kZVtrXSwgdlxuICAgIHJ1bkNicyBub2RlW2tdLCB2LCB2XG4gICAgY2hhbmdlcyA9IHJ1bkNic0Fib3ZlIHBhdGgsIHZcbiAgICBydW5DYnMgc3Vic2NyaXB0aW9ucywgc3RhdGUsIGNoYW5nZXNcblxuICBydW5DYnNXaXRoaW4gPSAocGFyZW50LCB2KS0+XG4gICAgcmV0dXJuIHVubGVzcyBPYmplY3QudHlwZSBwYXJlbnRcbiAgICBmb3IgaywgY2hpbGQgb2YgcGFyZW50IHdoZW4gayBpc250IFwiX2Nic1wiXG4gICAgICBfdiA9IHY/W2tdXG4gICAgICBydW5DYnNXaXRoaW4gY2hpbGQsIF92XG4gICAgICBydW5DYnMgY2hpbGQsIF92LCBfdlxuICAgIG51bGxcblxuICBydW5DYnNBYm92ZSA9IChwYXRoLCBjaGFuZ2VzKS0+XG4gICAgcGFydHMgPSBwYXRoLnNwbGl0IFwiLlwiXG4gICAgcCA9IHBhcnRzLnBvcCgpXG4gICAgY2hhbmdlc0Fib3ZlID0ge31cbiAgICBjaGFuZ2VzQWJvdmVbcF0gPSBjaGFuZ2VzXG4gICAgcmV0dXJuIGNoYW5nZXNBYm92ZSB1bmxlc3MgcGFydHMubGVuZ3RoID4gMFxuICAgIHBhdGhBYm92ZSA9IHBhcnRzLmpvaW4gXCIuXCJcbiAgICBbbm9kZSwga10gPSBnZXRBdCBzdWJzY3JpcHRpb25zLCBwYXRoQWJvdmVcbiAgICBydW5DYnMgbm9kZVtrXSwgU3RhdGUocGF0aEFib3ZlKSwgY2hhbmdlc0Fib3ZlXG4gICAgcnVuQ2JzQWJvdmUgcGF0aEFib3ZlLCBjaGFuZ2VzQWJvdmVcblxuICBydW5DYnMgPSAobm9kZSwgdiwgY2hhbmdlZCktPlxuICAgIGlmIG5vZGU/Ll9jYnNcbiAgICAgIGRlYWQgPSBbXVxuICAgICAgZm9yIGNiIGluIG5vZGUuX2Nic1xuICAgICAgICBpZiBjYi5fc3RhdGVfd2VhayBhbmQgbm90IHY/XG4gICAgICAgICAgZGVhZC5wdXNoIGNiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYiB2LCBjaGFuZ2VkXG4gICAgICBBcnJheS5wdWxsIG5vZGUuX2NicywgY2IgZm9yIGNiIGluIGRlYWRcbiAgICBudWxsXG5cblxuXG4jIGxpYi93cml0ZS5jb2ZmZWVcblRha2UgW1wiRW52XCIsIFwiTG9nXCIsIFwiUmVhZFwiXSwgKEVudiwgTG9nLCBSZWFkKS0+XG4gIGZzID0gcmVxdWlyZSBcImZzXCJcblxuICB2YWxpZFBhdGggPSAodiktPlxuICAgIHZhbGlkID0gdHJ1ZVxuICAgIHYgPSB2LnJlcGxhY2UgL15cXFxcKltBLVpdOi8sIFwiXCIgIyBJZ25vcmUgdGhlIGRyaXZlIGxldHRlciBvbiBXaW5kb3dzXG4gICAgdmFsaWQgPSBmYWxzZSBpZiAtMSBpc250IHYuc2VhcmNoIC9bPD46Oyw/XCIqfF0vICMgRXhjbHVkZSBuYW1lcyB3ZSB3b24ndCBiZSBhYmxlIHRvIHJvdW5kdHJpcFxuICAgIHZhbGlkID0gZmFsc2UgaWYgdi5sZW5ndGggPD0gMVxuICAgIGlmIG5vdCB2YWxpZCB0aGVuIExvZy5lcnIgXCIje3Z9IGlzIG5vdCBhIHZhbGlkIGZpbGUgcGF0aFwiXG4gICAgcmV0dXJuIHZhbGlkXG5cblxuICBNYWtlLmFzeW5jIFwiV3JpdGVcIiwgV3JpdGUgPSAoKS0+XG4gICAgdGhyb3cgXCJOb3QgSW1wbGVtZW50ZWRcIlxuXG4gIFdyaXRlLmxvZ2dpbmcgPSB0cnVlXG5cbiAgV3JpdGUuc3luYyA9IHt9XG4gIFdyaXRlLmFzeW5jID0ge31cblxuICBNZW1vcnkgPSBudWxsXG5cbiAgbG9nV3JpdGUgPSAoZm4sIHAsIG9wdHMgPSB7fSktPlxuICAgIHJldHVybiBpZiBvcHRzLnF1aWV0XG4gICAgcmV0dXJuIHVubGVzcyBXcml0ZS5sb2dnaW5nXG4gICAgaWYgTWVtb3J5ID89IFRha2UgXCJNZW1vcnlcIlxuICAgICAgcCA9IHAucmVwbGFjZSBNZW1vcnkoXCJhc3NldHNGb2xkZXJcIikgKyBSZWFkLnNlcCwgXCJcIiB1bmxlc3MgcCBpcyBNZW1vcnkoXCJhc3NldHNGb2xkZXJcIilcbiAgICAgIHAgPSBwLnJlcGxhY2UgTWVtb3J5KFwiZGF0YUZvbGRlclwiKSArIFJlYWQuc2VwLCBcIlwiIHVubGVzcyBwIGlzIE1lbW9yeShcImRhdGFGb2xkZXJcIilcbiAgICBwID0gcC5yZXBsYWNlIEVudi5ob21lICsgUmVhZC5zZXAsIFwiXCIgdW5sZXNzIHAgaXMgRW52LmhvbWVcbiAgICBMb2cgXCJXUklURSAje2ZufSAje3B9XCJcblxuICBXcml0ZS5zeW5jLmZpbGUgPSAocGF0aCwgZGF0YSwgb3B0cyktPlxuICAgIGlmIHZhbGlkID0gdmFsaWRQYXRoIHBhdGhcbiAgICAgIGxvZ1dyaXRlIFwiZmlsZVwiLCBwYXRoLCBvcHRzXG4gICAgICBmcy53cml0ZUZpbGVTeW5jIHBhdGgsIGRhdGFcbiAgICByZXR1cm4gdmFsaWRcblxuICBXcml0ZS5zeW5jLm1rZGlyID0gKHBhdGgsIG9wdHMpLT5cbiAgICByZXR1cm4gdHJ1ZSBpZiBmcy5leGlzdHNTeW5jIHBhdGhcbiAgICBpZiB2YWxpZCA9IHZhbGlkUGF0aCBwYXRoXG4gICAgICBsb2dXcml0ZSBcIm1rZGlyXCIsIHBhdGgsIG9wdHNcbiAgICAgIGZzLm1rZGlyU3luYyBwYXRoLCByZWN1cnNpdmU6IHRydWVcbiAgICByZXR1cm4gdmFsaWRcblxuICBXcml0ZS5zeW5jLnJlbmFtZSA9IChwYXRoLCBuZXdOYW1lLCBvcHRzKS0+XG4gICAgbmV3UGF0aCA9IFJlYWQuc2VwICsgUmVhZC5wYXRoIFJlYWQucGFyZW50UGF0aChwYXRoKSwgbmV3TmFtZVxuICAgIHJldHVybiB0cnVlIGlmIHBhdGggaXMgbmV3UGF0aFxuICAgIGlmIHZhbGlkID0gdmFsaWRQYXRoKHBhdGgpIGFuZCB2YWxpZFBhdGgobmV3UGF0aClcbiAgICAgIGxvZ1dyaXRlIFwicmVuYW1lXCIsIFwiI3twYXRofSAtPiAje25ld1BhdGh9XCIsIG9wdHNcbiAgICAgIGZzLnJlbmFtZVN5bmMgcGF0aCwgbmV3UGF0aFxuICAgIHJldHVybiB2YWxpZFxuXG4gIFdyaXRlLnN5bmMucm0gPSAocGF0aCwgb3B0cyktPlxuICAgIHJldHVybiB0cnVlIGlmIG5vdCBmcy5leGlzdHNTeW5jIHBhdGhcbiAgICBpZiB2YWxpZCA9IHZhbGlkUGF0aCBwYXRoXG4gICAgICBsb2dXcml0ZSBcInJtXCIsIHBhdGgsIG9wdHNcbiAgICAgIGZzLnJtU3luYyBwYXRoLCByZWN1cnNpdmU6IHRydWVcbiAgICByZXR1cm4gdmFsaWRcblxuICBXcml0ZS5zeW5jLmNvcHlGaWxlID0gKHNyYywgZGVzdCwgb3B0cyktPlxuICAgIGlmIHZhbGlkID0gdmFsaWRQYXRoKHNyYykgYW5kIHZhbGlkUGF0aChkZXN0KVxuICAgICAgbG9nV3JpdGUgXCJjb3B5RmlsZVwiLCBcIiN7c3JjfSAtPiAje2Rlc3R9XCIsIG9wdHNcbiAgICAgIGZzLmNvcHlGaWxlU3luYyBzcmMsIGRlc3RcbiAgICByZXR1cm4gdmFsaWRcblxuICBXcml0ZS5zeW5jLmpzb24gPSAocGF0aCwgZGF0YSwgb3B0cyktPlxuICAgIFdyaXRlLnN5bmMuZmlsZSBwYXRoLCBKU09OLnN0cmluZ2lmeShkYXRhKSwgb3B0c1xuXG4gIFdyaXRlLnN5bmMuYXJyYXkgPSAocGF0aCwgYXJyLCBvcHRzKS0+XG4gICAgY3VycmVudCA9IFJlYWQgcGF0aFxuICAgIGN1cnJlbnQgPz0gW11cbiAgICByZXR1cm4gaWYgQXJyYXkuZXF1YWwgYXJyLCBjdXJyZW50XG4gICAgIyBSZW1vdmUgYW55dGhpbmcgdGhhdCdzIGluIHRoZSBmb2xkZXIgYnV0IG5vdCBpbiBvdXIgbmV3IGFycmF5XG4gICAgV3JpdGUuc3luYy5ybSBSZWFkLnBhdGgocGF0aCwgdiksIG9wdHMgZm9yIHYgaW4gY3VycmVudCB3aGVuIHYgbm90IGluIGFyclxuICAgICMgU2F2ZSBhbnl0aGluZyB0aGF0J3MgaW4gb3VyIG5ldyBhcnJheSBidXQgbm90IGluIHRoZSBmb2xkZXJcbiAgICBXcml0ZS5zeW5jLm1rZGlyIFJlYWQucGF0aChwYXRoLCB2KSwgb3B0cyBmb3IgdiBpbiBhcnIgd2hlbiB2IG5vdCBpbiBjdXJyZW50XG4gICAgbnVsbFxuXG5cbiAgV3JpdGUuYXN5bmMuY29weUludG8gPSAoc3JjLCBkZXN0Rm9sZGVyLCBvcHRzKS0+XG4gICAgc3JjTmFtZSA9IFJlYWQubGFzdCBzcmNcbiAgICBpZiBhd2FpdCBSZWFkLmlzRm9sZGVyIHNyY1xuICAgICAgY2hpbGREZXN0Rm9sZGVyID0gUmVhZC5wYXRoIGRlc3RGb2xkZXIsIHNyY05hbWVcbiAgICAgIFdyaXRlLnN5bmMubWtkaXIgY2hpbGREZXN0Rm9sZGVyLCBvcHRzXG4gICAgICB2YWxpZCA9IHRydWVcbiAgICAgIGZvciBpdGVtIGluIFJlYWQgc3JjXG4gICAgICAgIF92YWxpZCA9IFdyaXRlLmFzeW5jLmNvcHlJbnRvIFJlYWQucGF0aChzcmMsIGl0ZW0pLCBjaGlsZERlc3RGb2xkZXIsIG9wdHNcbiAgICAgICAgdmFsaWQgJiY9IF92YWxpZFxuICAgICAgcmV0dXJuIHZhbGlkXG4gICAgZWxzZVxuICAgICAgV3JpdGUuc3luYy5jb3B5RmlsZSBzcmMsIFJlYWQucGF0aChkZXN0Rm9sZGVyLCBzcmNOYW1lKSwgb3B0c1xuXG5cblxuIyBjb21tb24vYWRzci1zdGF0dXMuY29mZmVlXG5UYWtlIFtcIkFEU1JcIl0sIChBRFNSKS0+XG5cbiAgZWxtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcImFkc3Itc3RhdHVzXCJcbiAgcmV0dXJuIHVubGVzcyBlbG0/XG5cbiAgQURTUi53YXRjaGVyIChjb3VudCwgZGVsYXkpLT5cbiAgICBjb3VudCA9IFN0cmluZy5wbHVyYWxpemUgY291bnQsIFwiJSUgQURTUlwiXG4gICAgZWxtLnRleHRDb250ZW50ID0gXCIje2NvdW50fSBBY3RpdmVcIlxuXG5cblxuIyBjb21tb24vZGIuY29mZmVlXG5UYWtlIFtcIklQQ1wiLCBcIkxvZ1wiXSwgKElQQywgTG9nKS0+XG4gIHJldHVybiBpZiB3aW5kb3cuaXNEQiAjIFRoZSBEQiBwcm9jZXNzIGRvZXNuJ3QgdXNlIHRoaXMg4oCUIHVzZSBQb3J0cyBpbnN0ZWFkXG5cbiAgYmluZCA9IG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgSVBDLm9uIFwicG9ydFwiLCAoe3BvcnRzfSwge2lkfSktPlxuICAgICAgcmVzb2x2ZSBbcG9ydHNbMF0sIGlkXVxuXG4gIElQQy5zZW5kIFwiYmluZC1kYlwiXG5cbiAgW2RiLCBpZF0gPSBhd2FpdCBiaW5kXG5cbiAgcmVxdWVzdHMgPSB7fVxuICBsaXN0ZW5lcnMgPSB7fVxuICBpZ25vcmVMaXN0ID0ge1wibWVtb3J5LWJyb2FkY2FzdFwifVxuICByZXF1ZXN0SUQgPSAwXG5cbiAgZGIub25tZXNzYWdlID0gKHtkYXRhOiBbbXNnLCAuLi5kYXRhXX0pLT5cbiAgICBpZiBtc2cgaXMgXCJyZXR1cm5cIlxuICAgICAgcmV0dXJuZWQgLi4uZGF0YVxuICAgIGVsc2UgaWYgbCA9IGxpc3RlbmVyc1ttc2ddXG4gICAgICBjYiAuLi5kYXRhIGZvciBjYiBpbiBsXG4gICAgZWxzZSBpZiBub3QgaWdub3JlTGlzdFttc2ddPyAjIFdlIGNhbiBzYWZlbHkgaWdub3JlIGNlcnRhaW4gbWVzc2FnZXMgZHJvcHBpbmdcbiAgICAgIExvZyBcIk1lc3NhZ2UgZnJvbSBEQiBkcm9wcGVkOiAje21zZ31cIlxuXG4gIHJldHVybmVkID0gKHJlcXVlc3RJRCwgcmVzcCktPlxuICAgIHJlc29sdmUgPSByZXF1ZXN0c1tyZXF1ZXN0SURdXG4gICAgZGVsZXRlIHJlcXVlc3RzW3JlcXVlc3RJRF1cbiAgICByZXNvbHZlIHJlc3BcblxuICBNYWtlIFwiREJcIiwgREIgPVxuICAgIG9uOiAobXNnLCBjYiktPiAobGlzdGVuZXJzW21zZ10gPz0gW10pLnB1c2ggY2JcbiAgICBzZW5kOiAobXNnLCAuLi5hcmdzKS0+XG4gICAgICByZXF1ZXN0SUQrKyAlIE51bWJlci5NQVhfU0FGRV9JTlRFR0VSXG4gICAgICByZXNwb25zZSA9IG5ldyBQcm9taXNlIChyZXNvbHZlKS0+IHJlcXVlc3RzW3JlcXVlc3RJRF0gPSByZXNvbHZlXG4gICAgICBkYi5wb3N0TWVzc2FnZSBbcmVxdWVzdElELCBtc2csIC4uLmFyZ3NdXG4gICAgICByZXNwb25zZVxuXG5cblxuIyBjb21tb24vZWRpdGFibGUtZmllbGQuY29mZmVlXG5UYWtlIFtcIkRPT01cIl0sIChET09NKS0+XG5cbiAgTWFrZSBcIkVkaXRhYmxlRmllbGRcIiwgRWRpdGFibGVGaWVsZCA9IChlbG0sIGNiLCBvcHRzID0ge30pLT5cbiAgICByZXR1cm4gaWYgRE9PTShlbG0sIFwiZWRpdGFibGVGaWVsZFwiKT9cblxuICAgIHN0YXJ0VmFsdWUgPSBudWxsXG5cbiAgICBET09NIGVsbSxcbiAgICAgIGVkaXRhYmxlRmllbGQ6IFwiXCJcbiAgICAgIGNvbnRlbnRlZGl0YWJsZTogXCJcIlxuICAgICAgYXV0b2NvbXBsZXRlOiBcIm9mZlwiXG4gICAgICBhdXRvY29ycmVjdDogXCJvZmZcIlxuICAgICAgYXV0b2NhcGl0YWxpemU6IFwib2ZmXCJcbiAgICAgIHNwZWxsY2hlY2s6IFwiZmFsc2VcIlxuXG4gICAgc2V0VmFsdWUgPSAoKS0+XG4gICAgICB2YWxpZGF0ZSgpXG4gICAgICBjYiBlbG0udGV4dENvbnRlbnQgaWYgZWxtLl92YWxpZFxuXG4gICAgdmFsaWRhdGUgPSAoKS0+XG4gICAgICBlbG0udGV4dENvbnRlbnQgPSBlbG0udGV4dENvbnRlbnQudHJpbSgpXG4gICAgICBpZiBvcHRzLnZhbGlkYXRlP1xuICAgICAgICBlbG0uX3ZhbGlkID0gb3B0cy52YWxpZGF0ZSBlbG0udGV4dENvbnRlbnRcbiAgICAgICAgRE9PTSBlbG0sIGZpZWxkSW52YWxpZDogaWYgZWxtLl92YWxpZCB0aGVuIG51bGwgZWxzZSBcIlwiXG4gICAgICBlbHNlXG4gICAgICAgIGVsbS5fdmFsaWQgPSB0cnVlXG5cbiAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lciBcImlucHV0XCIsIChlKS0+XG4gICAgICBzZXRWYWx1ZSgpIGlmIG9wdHMuc2F2ZU9uSW5wdXRcblxuICAgIGVsbS5hZGRFdmVudExpc3RlbmVyIFwiZm9jdXNcIiwgKCktPlxuICAgICAgdmFsaWRhdGUoKVxuICAgICAgc3RhcnRWYWx1ZSA9IGVsbS50ZXh0Q29udGVudFxuXG4gICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIgXCJibHVyXCIsICgpLT5cbiAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5lbXB0eSgpXG4gICAgICBzZXRWYWx1ZSgpXG5cbiAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lciBcImtleWRvd25cIiwgKGUpLT5cbiAgICAgIHN3aXRjaCBlLmtleUNvZGVcbiAgICAgICAgd2hlbiAxM1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGVsbS5ibHVyKClcblxuICAgICAgICB3aGVuIDI3XG4gICAgICAgICAgZWxtLnRleHRDb250ZW50ID0gc3RhcnRWYWx1ZVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIGVsbS5ibHVyKClcblxuXG5cbiMgY29tbW9uL2Vudi1zdHlsZS5jb2ZmZWVcblRha2UgW1wiRE9PTVwiLCBcIkVudlwiXSwgKERPT00sIEVudiktPlxuXG4gIERPT00gZG9jdW1lbnQuYm9keSxcbiAgICBlbnZEZXY6IEVudi5pc0RldlxuICAgIGVudk1hYzogRW52LmlzTWFjXG5cblxuXG4jIGNvbW1vbi9lbnYuY29mZmVlXG5UYWtlIFtcIklQQ1wiXSwgKElQQyktPlxuICBFbnYgPSBhd2FpdCBJUEMuaW52b2tlIFwiZW52XCJcblxuICBFbnYuaXNNYWluID0gZmFsc2VcbiAgRW52LmlzUmVuZGVyID0gdHJ1ZVxuXG4gIE1ha2UgXCJFbnZcIiwgRW52XG5cblxuXG4jIGNvbW1vbi9maW5kLmNvZmZlZVxuIyBUaGUgbWFpbiB3aW5kb3cgc2V0cyB1cCBhIGdsb2JhbCBDb21tYW5kLUYgbWVudSBpdGVtLCB3aGljaCB3aWxsIGZvcndhcmRcbiMgYSBcImZpbmRcIiBJUEMgZXZlbnQgdG8gdGhlIGZyb250bW9zdCB3aW5kb3cuIEhlcmUgd2UgY2F0Y2ggaXQgYW5kIHBhc3MgaXQgYWxvbmdcbiMgdG8gYW55IGludGVyZXN0ZWQgcGFydGllcyBpbiB0aGlzIHdpbmRvdy5cblxuVGFrZSBbXCJJUENcIiwgXCJQdWJTdWJcIl0sIChJUEMsIHtQdWIsIFN1Yn0pLT5cbiAgSVBDLm9uIFwiZmluZFwiLCAoKS0+IFB1YiBcImZpbmRcIlxuXG5cblxuIyBjb21tb24vZ2Vhci12aWV3LmNvZmZlZVxuVGFrZSBbXCJET09NXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKERPT00pLT5cblxuICBNYWtlIFwiR2VhclZpZXdcIiwgKGRlcHRoID0gMzAsIG9mZnNldCA9IC0xMCwgYXR0cnMgPSB7fSktPlxuICAgIGdlYXJzRWxtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcImdlYXItdmlld1wiXG5cbiAgICBnZWFyRWxtID0gZ2VhcnNFbG1cbiAgICBmb3IgaSBpbiBbMC4uZGVwdGhdXG4gICAgICBnZWFyRWxtID0gRE9PTS5jcmVhdGUgXCJzcGFuXCIsIGdlYXJFbG0gIyBGb3Igc3BlY2lhbCBlZmZlY3RzXG4gICAgICBnZWFyRWxtID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgZ2VhckVsbSwgc3R5bGU6IFwiYW5pbWF0aW9uLWRlbGF5OiAje29mZnNldH1zXCJcblxuICAgIERPT00gZ2VhcnNFbG0sIGF0dHJzXG5cblxuXG4jIGNvbW1vbi9ob2xkLXRvLXJ1bi5jb2ZmZWVcblRha2UgW1wiRE9PTVwiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChET09NKS0+XG5cbiAgaXNEb3duID0gbnVsbFxuICB0aW1lb3V0ID0gbnVsbFxuXG4gIGRvd24gPSAoZWxtLCB0aW1lLCBjYiktPiAoZSktPlxuICAgIGlmIG5vdCBpc0Rvd24/IGFuZCBlLmJ1dHRvbiBpcyAwXG4gICAgICBpc0Rvd24gPSBlbG1cbiAgICAgIERPT00gaXNEb3duLCBob2xkQWN0aXZlOiBcIlwiLCBob2xkTG9uZ2VyOiBudWxsXG4gICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCBydW4oY2IpLCB0aW1lXG5cbiAgdXAgPSAoKS0+XG4gICAgaWYgaXNEb3duP1xuICAgICAgRE9PTSBpc0Rvd24sIGhvbGRBY3RpdmU6IG51bGwsIGhvbGRMb25nZXI6IFwiXCJcbiAgICAgIGNsZWFyVGltZW91dCB0aW1lb3V0XG4gICAgICBpc0Rvd24gPSBudWxsXG5cbiAgcnVuID0gKGNiKS0+ICgpLT5cbiAgICBpc0Rvd24gPSBudWxsXG4gICAgY2IoKVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyIFwibW91c2V1cFwiLCB1cFxuXG4gIE1ha2UgXCJIb2xkVG9SdW5cIiwgSG9sZFRvUnVuID0gKGVsbSwgdGltZSwgY2IpLT5cbiAgICBET09NIGVsbSwgaG9sZFRvUnVuOiBcIlwiXG4gICAgZWxtLnN0eWxlLnNldFByb3BlcnR5IFwiLS1ob2xkLXRpbWVcIiwgdGltZSArIFwibXNcIlxuICAgIGVsbS5vbm1vdXNlZG93biA9IGRvd24gZWxtLCB0aW1lLCBjYlxuXG5cblxuIyBjb21tb24vaWNvbnMuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJET01Db250ZW50TG9hZGVkXCJdLCAoRE9PTSktPlxuICBET09NLmNyZWF0ZSBcInN2Z1wiLCBkb2N1bWVudC5ib2R5LFxuICAgIGlkOiBcImljb25zXCJcbiAgICBpbm5lckhUTUw6XCJcIlwiXG4gICAgICA8ZGVmcz5cbiAgICAgICAgPHBhdGggaWQ9XCJpLWNoZWNrXCIgZD1cIk0yMCAxMDBMNzUgMTU1IDE4NSA0NVwiLz5cbiAgICAgICAgPHBhdGggaWQ9XCJpLWV4XCIgZD1cIk0zNSAxNjUgTDE2NSAzNSBNMzUgMzUgTDE2NSAxNjVcIi8+XG4gICAgICAgIDxwYXRoIGlkPVwiaS1hcnJvd1wiIGQ9XCJNNDAgMTAwIEwxODAgMTAwIE0xMTAgMzAgTDQwIDEwMCAxMTAgMTcwXCIvPlxuICAgICAgICA8cGF0aCBpZD1cImktZGlhbW9uZFwiIGQ9XCJNMTY1IDEwMEwxMDAgMTY1IDM1IDEwMCAxMDAgMzV6XCIvPlxuICAgICAgICA8ZyBpZD1cImktZXllXCIgdHJhbnNmb3JtPVwic2NhbGUoMS44LCAxLjgpIHRyYW5zbGF0ZSgwLCAxNSlcIiBzdHJva2Utd2lkdGg9XCIxMFwiPlxuICAgICAgICAgIDxwYXRoIGQ9XCJNNTUuNSA1YzE5IDAgMzUuNCAxMS45IDQ5LjYgMzQuNUM5MSA2Mi4xIDc0LjUgNzQgNTUuNSA3NFMyMC4xIDYyLjEgNS45IDM5LjVDMjAgMTYuOSAzNi41IDUgNTUuNSA1elwiLz5cbiAgICAgICAgICA8Y2lyY2xlIGN4PVwiNTUuNVwiIGN5PVwiMzkuNVwiIHI9XCIxOC41XCIvPlxuICAgICAgICA8L2c+XG4gICAgICAgIDxnIGlkPVwiaS1maWxlXCIgc3Ryb2tlLXdpZHRoPVwiMThcIj5cbiAgICAgICAgICA8cGF0aCBkPVwiTTM4LDE5IEwxMDgsMTkgQzExMCwxOSAxMTIsMTkgMTE0LDIxIEwxNTksNjUgQzE2MSw2NyAxNjIsNjkgMTYyLDcxIEwxNjIsMTgwIEwxNjIsMTgwIEwzOCwxODAgTDM4LDE5IFpcIi8+XG4gICAgICAgICAgPHBvbHlsaW5lIHBvaW50cz1cIjE2MiA3MCAxMDggNzAgMTA4IDE5XCIvPlxuICAgICAgICA8L2c+XG4gICAgICA8L2RlZnM+XG4gICAgXCJcIlwiXG5cblxuXG4jIGNvbW1vbi9pcGMuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG4gIHsgaXBjUmVuZGVyZXIgfSA9IHJlcXVpcmUgXCJlbGVjdHJvblwiXG5cbiAgTWFrZSBcIklQQ1wiLCBJUEMgPVxuICAgIHNlbmQ6ICguLi5hcmdzKS0+IGlwY1JlbmRlcmVyLnNlbmQgLi4uYXJnc1xuICAgIGludm9rZTogKC4uLmFyZ3MpLT4gaXBjUmVuZGVyZXIuaW52b2tlIC4uLmFyZ3NcblxuICAgIG9uOiAoY2hhbm5lbCwgY2IpLT4gaXBjUmVuZGVyZXIub24gY2hhbm5lbCwgY2JcbiAgICBvbmNlOiAoY2hhbm5lbCwgY2IpLT4gaXBjUmVuZGVyZXIub24gY2hhbm5lbCwgY2JcblxuICAgICMgUHJvbWlzZS1iYXNlZCBoYW5kbGVycywgb3B0aW1pemVkIGZvciB1c2Ugd2l0aCBhd2FpdFxuICAgIHByb21pc2U6XG4gICAgICBvbmNlOiAoY2hhbm5lbCktPiBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPiBpcGNSZW5kZXJlci5vbmNlIGNoYW5uZWwsIHJlc29sdmVcblxuXG5cbiMgY29tbW9uL2pvYi1zdGF0dXMuY29mZmVlXG5UYWtlIFtcIkpvYlwiXSwgKEpvYiktPlxuXG4gIGVsbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJqb2Itc3RhdHVzXCJcbiAgcmV0dXJuIHVubGVzcyBlbG0/XG5cbiAgSm9iLndhdGNoZXIgKGNvdW50LCBkZWxheSktPlxuICAgIGNvdW50ID0gU3RyaW5nLnBsdXJhbGl6ZSBjb3VudCwgXCIlJSBKb2JcIlxuICAgIGVsbS5maXJzdENoaWxkLnRleHRDb250ZW50ID0gXCIje2NvdW50fSBRdWV1ZWRcIlxuICAgIGVsbS5sYXN0Q2hpbGQudGV4dENvbnRlbnQgPSBcIigje2RlbGF5fDB9bXMpXCJcblxuXG5cbiMgY29tbW9uL21lbW9yeS1maWVsZC5jb2ZmZWVcblRha2UgW1wiRE9PTVwiLCBcIkVkaXRhYmxlRmllbGRcIiwgXCJNZW1vcnlcIl0sIChET09NLCBFZGl0YWJsZUZpZWxkLCBNZW1vcnkpLT5cblxuICBNYWtlIFwiTWVtb3J5RmllbGRcIiwgTWVtb3J5RmllbGQgPSAobWVtb3J5S2V5LCBlbG0sIG9wdHMgPSB7fSktPlxuXG4gICAgIyBGbGFnIHdoZXRoZXIgd2UndmUgYmVlbiBzZXQgdXAgb24gYW4gZWxtIGFscmVhZHkuIFRoYXQgbWFrZXMgaXQgc2FmZSB0byBjcmVhdGUgYVxuICAgICMgTWVtb3J5RmllbGQgaW5zaWRlIGEgcmVwZWF0ZWRseS1ydW4gUmVuZGVyIGNhbGwuXG4gICAgcmV0dXJuIGlmIERPT00oZWxtLCBcIm1lbW9yeUZpZWxkXCIpP1xuICAgIERPT00gZWxtLCBtZW1vcnlGaWVsZDogXCJcIlxuXG4gICAgZm9jdXNlZCA9IGZhbHNlXG5cbiAgICBlbG0uYWRkRXZlbnRMaXN0ZW5lciBcImZvY3VzXCIsIChlKS0+IGZvY3VzZWQgPSB0cnVlXG4gICAgZWxtLmFkZEV2ZW50TGlzdGVuZXIgXCJibHVyXCIsIChlKS0+IGZvY3VzZWQgPSBmYWxzZVxuXG4gICAgTWVtb3J5LnN1YnNjcmliZSBcIlJlYWQgT25seVwiLCB0cnVlLCAodiktPlxuICAgICAgRE9PTSBlbG0sIGNvbnRlbnRlZGl0YWJsZTogaWYgdiB0aGVuIG51bGwgZWxzZSBcIlwiXG5cbiAgICBNZW1vcnkuc3Vic2NyaWJlIG1lbW9yeUtleSwgdHJ1ZSwgKHZhbHVlKS0+XG4gICAgICByZXR1cm4gdW5sZXNzIHZhbHVlXG4gICAgICByZXR1cm4gaWYgZm9jdXNlZFxuICAgICAgZWxtLnRleHRDb250ZW50ID0gdmFsdWVcblxuICAgIHNldFZhbHVlID0gKHZhbHVlKS0+XG4gICAgICBNZW1vcnkgbWVtb3J5S2V5LCB2YWx1ZVxuICAgICAgb3B0cy51cGRhdGU/IHZhbHVlXG5cbiAgICBFZGl0YWJsZUZpZWxkIGVsbSwgc2V0VmFsdWUsIG9wdHNcblxuXG5cbiMgY29tbW9uL21lbW9yeS5jb2ZmZWVcblRha2UgW10sICgpLT5cblxuICBtZW1vcnkgPSBudWxsICMgU3RvcmVzIGFsbCB0aGUgdmFsdWVzIGNvbW1pdHRlZCB0byBNZW1vcnlcbiAgc3Vic2NyaXB0aW9ucyA9IHtfY2JzOltdfSAjIE5vdGlmaWVkIHdoZW4gc3BlY2lmaWMgcGF0aHMgYXJlIGNoYW5nZWRcblxuXG4gIGlmIHdpbmRvdy5pc0RCXG5cbiAgICBQb3J0cyA9IGF3YWl0IFRha2UuYXN5bmMgXCJQb3J0c1wiXG5cbiAgICAjIERCIG93bnMgdGhlIGNhbm5vbmljYWwgY29weSBvZiBNZW1vcnksIHNvIHdlIGluaXRpYWxpemUgdG8gYW4gZW1wdHkgb2JqZWN0IHRvIHN0b3JlIGl0IGFsbFxuICAgIG1lbW9yeSA9IHt9XG5cbiAgICAjIE90aGVyIHdpbmRvd3Mgd2lsbCB3YW50IHRvIGluaXRpYWxpemUgdGhlbXNlbHZlcyB3aXRoIGEgY2xvbmUgb3VyIE1lbW9yeVxuICAgIFBvcnRzLm9uIFwiY2xvbmUtbWVtb3J5XCIsICgpLT4gbWVtb3J5XG5cbiAgICAjIE90aGVyIHdpbmRvd3Mgd2lsbCBub3RpZnkgdXMgd2hlbiB0aGV5IHdhbnQgdG8gY2hhbmdlIHNvbWV0aGluZyBpbiBNZW1vcnlcbiAgICBQb3J0cy5vbiBcIm1lbW9yeS1ub3RpZnktZGJcIiwgKHBhdGgsIHYpLT4gTWVtb3J5IHBhdGgsIHZcblxuICAgICMgV2hlbiB0aGUgREIncyBNZW1vcnkgY2hhbmdlcywgd2Ugc2hvdWxkIG5vdGlmeSBvdGhlciB3aW5kb3dzXG4gICAgcmVtb3RlTm90aWZ5ID0gKHBhdGgsIHYpLT4gUG9ydHMuc2VuZCBcIm1lbW9yeS1icm9hZGNhc3RcIiwgcGF0aCwgdlxuXG4gIGVsc2VcblxuICAgIERCID0gYXdhaXQgVGFrZS5hc3luYyBcIkRCXCJcblxuICAgICMgVGhlIERCIG93bnMgdGhlIGNhbm5vbmljYWwgY29weSBvZiBNZW1vcnksIHNvIHdlIGluaXRpYWxpemUgdG8gYSBjbG9uZSBvZiB3aGF0ZXZlciBpdCBoYXNcbiAgICBtZW1vcnkgPSBhd2FpdCBEQi5zZW5kIFwiY2xvbmUtbWVtb3J5XCJcblxuICAgICMgTm90aWZ5IHRoZSBEQiB3aGVuZXZlciBhbnl0aGluZyBpbiBvdXIgTWVtb3J5IGNoYW5nZXNcbiAgICByZW1vdGVOb3RpZnkgPSAocGF0aCwgdiktPiBEQi5zZW5kIFwibWVtb3J5LW5vdGlmeS1kYlwiLCBwYXRoLCB2XG5cbiAgICAjIFdoZW4gdGhlIERCJ3MgbWVtb3J5IGNoYW5nZXMsIGl0J2xsIG5vdGlmeSB1c1xuICAgIERCLm9uIFwibWVtb3J5LWJyb2FkY2FzdFwiLCAocGF0aCwgdiktPiBNZW1vcnkgcGF0aCwgdiwgcmVtb3RlOiBmYWxzZVxuXG5cbiAgIyBUaGlzIGlzIGhvdyB3ZSBzdXBwb3J0IFwiZGVlcC5wYXRoc1wiOlxuICAjIFBhc3MgYSB0cmVlLWxpa2Ugb2JqZWN0LCBhbmQgYSBkb3Qtc2VwYXJhdGVkIHN0cmluZyBvZiBrZXlzLlxuICAjIFdlJ2xsIHJldHVybiB0aGUgcGVudWx0aW1hdGUgbm9kZSBpbiB0aGUgdHJlZSwgYW5kIHRoZSBmaW5hbCBrZXkuXG4gICMgKFN0b3BwaW5nIGp1c3QgYWJvdmUgdGhlIGZpbmFsIG5vZGUgYWxsb3dzIHlvdSB0byBkbyBhc3NpZ25tZW50LilcbiAgIyBGb3IgdW5pZm9ybWl0eSwgcGFzcyBcIlwiIHRvIGdldCBiYWNrIHRoZSB0cmVlIHJvb3Qgd3JhcHBlZCBpbiBhIG5vZGUgd2l0aCBhIFwiXCIga2V5LlxuICBnZXRBdCA9IChub2RlLCBwYXRoKS0+XG4gICAgcmV0dXJuIFt7XCJcIjpub2RlfSwgXCJcIl0gaWYgcGF0aCBpcyBcIlwiXG4gICAgcGFydHMgPSBwYXRoLnNwbGl0IFwiLlwiXG4gICAgayA9IHBhcnRzLnBvcCgpXG4gICAgZm9yIHBhcnQgaW4gcGFydHNcbiAgICAgIG5vZGUgPSBub2RlW3BhcnRdID89IHt9XG4gICAgW25vZGUsIGtdXG5cblxuICBNYWtlLmFzeW5jIFwiTWVtb3J5XCIsIE1lbW9yeSA9IChwYXRoID0gXCJcIiwgdiwge3JlbW90ZSA9IHRydWUsIGltbXV0YWJsZSA9IGZhbHNlfSA9IHt9KS0+XG4gICAgW25vZGUsIGtdID0gZ2V0QXQgbWVtb3J5LCBwYXRoXG5cbiAgICByZXR1cm4gbm9kZVtrXSBpZiB2IGlzIHVuZGVmaW5lZCAjIEp1c3QgYSByZWFkXG5cbiAgICAjIEl0J3Mgbm90IHNhZmUgdG8gdGFrZSBzb21ldGhpbmcgb3V0IG9mIE1lbW9yeSwgbXV0YXRlIGl0LCBhbmQgY29tbWl0IGl0IGFnYWluLlxuICAgICMgVGhlIGltbXV0YWJsZSBvcHRpb24gdGVsbHMgdXMgdGhlIGNhbGxlciBwcm9taXNlcyB0aGV5J3JlIG5vdCBkb2luZyB0aGF0LlxuICAgICMgT3RoZXJ3aXNlLCB3ZSBjbG9uZSB2YWx1ZXMgYmVmb3JlIHdyaXRpbmcgdGhlbS5cbiAgICB2ID0gRnVuY3Rpb24uY2xvbmUgdiB1bmxlc3MgaW1tdXRhYmxlXG5cbiAgICBpZiAoT2JqZWN0LnR5cGUodikgb3IgQXJyYXkudHlwZSh2KSkgYW5kIHYgaXMgbm9kZVtrXVxuICAgICAgdGhyb3cgXCJEaWQgeW91IHRha2Ugc29tZXRoaW5nIG91dCBvZiBNZW1vcnksIG11dGF0ZSBpdCwgYW5kIGNvbW1pdCBpdCBhZ2Fpbj9cIlxuXG4gICAgdGhyb3cgRXJyb3IgXCJZb3UncmUgbm90IGFsbG93ZWQgdG8gc2V0IHRoZSBNZW1vcnkgcm9vdFwiIGlmIHBhdGggaXMgXCJcIlxuXG4gICAgb2xkID0gbm9kZVtrXVxuXG4gICAgaWYgdj8gdGhlbiBub2RlW2tdID0gdiBlbHNlIGRlbGV0ZSBub2RlW2tdXG5cbiAgICBpZiBGdW5jdGlvbi5ub3RFcXVpdmFsZW50IHYsIG9sZFxuICAgICAgcXVldWVNaWNyb3Rhc2sgKCktPlxuICAgICAgICBsb2NhbE5vdGlmeSBwYXRoLCB2XG4gICAgICAgIHJlbW90ZU5vdGlmeSBwYXRoLCB2IGlmIHJlbW90ZVxuXG4gICAgcmV0dXJuIHZcblxuICBjb25kaXRpb25hbFNldCA9IChwYXRoLCB2LCBwcmVkKS0+XG4gICAgW25vZGUsIGtdID0gZ2V0QXQgbWVtb3J5LCBwYXRoXG4gICAgZG9TZXQgPSBwcmVkIG5vZGVba10sIHZcbiAgICBNZW1vcnkgcGF0aCwgdiBpZiBkb1NldFxuICAgIHJldHVybiBkb1NldFxuXG4gICMgVGhlc2UgYXJlIHVzZWZ1bCBiZWNhdXNlIHRoZXkgcmV0dXJuIHRydWUgaWYgYSBjaGFuZ2Ugd2FzIG1hZGVcbiAgTWVtb3J5LmNoYW5nZSA9IChwYXRoLCB2KS0+IGNvbmRpdGlvbmFsU2V0IHBhdGgsIHYsIEZ1bmN0aW9uLm5vdEVxdWl2YWxlbnRcbiAgTWVtb3J5LmRlZmF1bHQgPSAocGF0aCwgdiktPiBjb25kaXRpb25hbFNldCBwYXRoLCB2LCBGdW5jdGlvbi5ub3RFeGlzdHNcblxuICAjIFRoaXMgaXMgdXNlZnVsIGJlY2F1c2UgaXQgcmVkdWNlcyB0aGUgbmVlZCB0byB1cGRhdGUgTWVtb3J5IGluIGEgbG9vcCxcbiAgIyB3aGljaCB0cmlnZ2VycyBhIGxvdCBvZiAocG9zc2libHkgcG9pbnRsZXNzKSBub3RpZmljYXRpb25zLlxuICAjIFJlbWluZGVyIHRoYXQgT2JqZWN0Lm1lcmdlIGRvZXNuJ3QgaGFuZGxlIGFycmF5cywgc28gbWF5YmVcbiAgIyBsaW1pdCB0aGUgdXNlIG9mIHRoaXMgZnVuY3Rpb24gdG8gcHJpbWl0aXZlcyAoc2luY2UgaXQgaW1wbGllcyBpbW11dGFibGUpLlxuICBNZW1vcnkubWVyZ2UgPSAocGF0aCwgdiktPiBNZW1vcnkgcGF0aCwgKE9iamVjdC5tZXJnZSB2LCBNZW1vcnkgcGF0aCksIGltbXV0YWJsZTogdHJ1ZVxuXG4gICMgVGhlc2UgYXJlIHVzZWZ1bCBiZWNhdXNlIGl0IG9mZmVycyBhIG5pY2Ugc3ludGF4IGZvciB1cGRhdGluZyBleGlzdGluZyB2YWx1ZXMgaW4gTWVtb3J5LFxuICAjIHdpdGggc3VwcG9ydCBmb3IgYXN5bmMsIGVpdGhlciBtdXRhYmx5IG9yIGltbXV0YWJseS5cbiAgTWVtb3J5LnVwZGF0ZSA9IChwYXRoLCBmbiktPiBNZW1vcnkgcGF0aCwgKGF3YWl0IGZuIE1lbW9yeSBwYXRoKSwgaW1tdXRhYmxlOiB0cnVlXG4gIE1lbW9yeS5tdXRhdGUgPSAocGF0aCwgZm4pLT4gTWVtb3J5IHBhdGgsIChhd2FpdCBmbiBNZW1vcnkuY2xvbmUgcGF0aCksIGltbXV0YWJsZTogdHJ1ZVxuXG4gICMgVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciByZWFkaW5nIHNvbWV0aGluZyBmcm9tIE1lbW9yeSB0aGF0IGlzIHByZS1jbG9uZWRcbiAgIyAoaWYgbmVjZXNzYXJ5KSB0byBhdm9pZCBtdXRhYmlsaXR5IGlzc3Vlcy5cbiAgTWVtb3J5LmNsb25lID0gKHBhdGgpLT4gRnVuY3Rpb24uY2xvbmUgTWVtb3J5IHBhdGhcblxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgPSAoLi4uW3BhdGggPSBcIlwiLCBydW5Ob3cgPSB0cnVlLCB3ZWFrID0gZmFsc2VdLCBjYiktPlxuICAgIHRocm93IFwiSW52YWxpZCBzdWJzY3JpYmUgcGF0aFwiIHVubGVzcyBTdHJpbmcudHlwZSBwYXRoICMgQXZvaWQgZXJyb3JzIGlmIHlvdSB0cnkgc2F5IHN1YnNjcmliZShydW5Ob3csIGNiKVxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICAoKG5vZGVba10gPz0ge30pLl9jYnMgPz0gW10pLnB1c2ggY2JcbiAgICBjYi5fbWVtb3J5X3dlYWsgPSB3ZWFrICMgLi4uIHRoaXMgaXMgZmluZSDwn5CV4piV77iP8J+UpVxuICAgIGNiIE1lbW9yeSBwYXRoIGlmIHJ1bk5vd1xuXG4gIE1lbW9yeS51bnN1YnNjcmliZSA9ICguLi5bcGF0aCA9IFwiXCJdLCBjYiktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICB0aHJvdyBFcnJvciBcIlVuc3Vic2NyaWJlIGZhaWxlZFwiIHVubGVzcyBjYiBpbiBub2RlW2tdLl9jYnNcbiAgICBBcnJheS5wdWxsIG5vZGVba10uX2NicywgY2JcbiAgICBudWxsXG5cbiAgbG9jYWxOb3RpZnkgPSAocGF0aCwgdiktPlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhcbiAgICAjIGNvbnNvbGUubG9nIFwiICB3aXRoaW46XCJcbiAgICBydW5DYnNXaXRoaW4gbm9kZVtrXSwgdlxuICAgICMgY29uc29sZS5sb2cgXCIgIGF0IHBhdGg6XCJcbiAgICBydW5DYnMgbm9kZVtrXSwgdiwgdlxuICAgICMgY29uc29sZS5sb2cgXCIgIGFib3ZlOlwiXG4gICAgY2hhbmdlcyA9IHJ1bkNic0Fib3ZlIHBhdGgsIHZcbiAgICAjIGNvbnNvbGUubG9nIFwiICByb290OlwiXG4gICAgcnVuQ2JzIHN1YnNjcmlwdGlvbnMsIG1lbW9yeSwgY2hhbmdlc1xuXG4gIHJ1bkNic1dpdGhpbiA9IChwYXJlbnQsIHYpLT5cbiAgICByZXR1cm4gdW5sZXNzIE9iamVjdC50eXBlIHBhcmVudFxuICAgIGZvciBrLCBjaGlsZCBvZiBwYXJlbnQgd2hlbiBrIGlzbnQgXCJfY2JzXCJcbiAgICAgIF92ID0gdj9ba11cbiAgICAgIHJ1bkNic1dpdGhpbiBjaGlsZCwgX3ZcbiAgICAgIHJ1bkNicyBjaGlsZCwgX3YsIF92XG4gICAgbnVsbFxuXG4gIHJ1bkNic0Fib3ZlID0gKHBhdGgsIGNoYW5nZXMpLT5cbiAgICBwYXJ0cyA9IHBhdGguc3BsaXQgXCIuXCJcbiAgICBwID0gcGFydHMucG9wKClcbiAgICBjaGFuZ2VzQWJvdmUgPSB7fVxuICAgIGNoYW5nZXNBYm92ZVtwXSA9IGNoYW5nZXNcbiAgICByZXR1cm4gY2hhbmdlc0Fib3ZlIHVubGVzcyBwYXJ0cy5sZW5ndGggPiAwXG4gICAgcGF0aEFib3ZlID0gcGFydHMuam9pbiBcIi5cIlxuICAgIFtub2RlLCBrXSA9IGdldEF0IHN1YnNjcmlwdGlvbnMsIHBhdGhBYm92ZVxuICAgIHJ1bkNicyBub2RlW2tdLCBNZW1vcnkocGF0aEFib3ZlKSwgY2hhbmdlc0Fib3ZlXG4gICAgcnVuQ2JzQWJvdmUgcGF0aEFib3ZlLCBjaGFuZ2VzQWJvdmVcblxuICBydW5DYnMgPSAobm9kZSwgdiwgY2hhbmdlZCktPlxuICAgIGlmIG5vZGU/Ll9jYnNcbiAgICAgIGRlYWQgPSBbXVxuICAgICAgZm9yIGNiIGluIG5vZGUuX2Nic1xuICAgICAgICBpZiBjYi5fbWVtb3J5X3dlYWsgYW5kIG5vdCB2P1xuICAgICAgICAgIGRlYWQucHVzaCBjYlxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2IgdiwgY2hhbmdlZFxuICAgICAgQXJyYXkucHVsbCBub2RlLl9jYnMsIGNiIGZvciBjYiBpbiBkZWFkXG4gICAgbnVsbFxuXG5cbiAgIyBURVNUU1xuICBqID0gKHgpLT4gSlNPTi5zdHJpbmdpZnkgeFxuICBzdWIgPSAocCktPlxuICAgIGNvbnNvbGUubG9nIHBcbiAgICBNZW1vcnkuc3Vic2NyaWJlIHAsIGZhbHNlLCAodiwgY2hhbmdlZCktPiBjb25zb2xlLmxvZyBcIiAgICBcIiArIHAsIGoodiksIGogY2hhbmdlZFxuICAgICMgTWVtb3J5LnN1YnNjcmliZSBwLCBmYWxzZSwgKHYsIGNoYW5nZWQpLT4gY29uc29sZS5sb2cgXCIgICAgc3Ryb25nICBcIiArIHAsIGoodiksIGogY2hhbmdlZFxuICAgICMgTWVtb3J5LnN1YnNjcmliZSBwLCBmYWxzZSwgdHJ1ZSwgKHYsIGNoYW5nZWQpLT4gY29uc29sZS5sb2cgXCIgICAgd2VhayAgICBcIiArIHAsIGoodiksIGogY2hhbmdlZFxuICBzZXQgPSAocCwgdiwgbXNnKS0+XG4gICAgY29uc29sZS5sb2cgXCJcXG5cXG5cIittc2cgaWYgbXNnP1xuICAgIGNvbnNvbGUubG9nIFwiXFxuU0VUICN7cH0gdG9cIiwgaih2KVxuICAgIE1lbW9yeSBwLCB2XG5cbiAgIyBOb3RlOiBjaGFuZ2VkIG9ubHkgZXhpc3RzIHdoZW4gd2UndmUgbW9kaWZpZWQgYSBzdWJwYXRoIHJhdGhlciB0aGFuIHRoZSBwYXRoIHNwZWNpZmllZCBieSB0aGUgbGlzdGVuZXJcblxuICAjIGNvbnNvbGUubG9nIFwiU1VCU0NSSUJFUlNcIlxuICAjIHN1YiBcImFzc2V0cy5BLmlkXCJcbiAgIyBzdWIgXCJhc3NldHMuQS5maWxlc1wiXG4gICMgc3ViIFwiYXNzZXRzLkFcIlxuICAjIHN1YiBcImFzc2V0cy5CXCJcbiAgIyBzdWIgXCJhc3NldHNcIlxuICAjIHN1YiBcInNxdWlicyAtIHNob3VsZCBuZXZlciBzZWUgdGhpcyBydW5cIlxuICAjIHN1YiBcIlwiXG5cbiAgIyBzZXQgXCJhc3NldHMuQVwiLCB7aWQ6MCwgeDogMH0sIFwiY3JlYXRlIGFuIG9ialwiXG4gICMgc2V0IFwiYXNzZXRzLkEueVwiLCAwLCBcImNyZWF0ZSBhIHByaW1pdGl2ZVwiXG4gICMgc2V0IFwiYXNzZXRzLkEuaWRcIiwgMSwgXCJjaGFuZ2UgYSBwcmltaXRpdmVcIlxuICAjICMgc2V0IFwiYXNzZXRzLkEueC53YXRcIiwgMCwgXCJkcmlsbCBpbnRvIGEgcHJpbWl0aXZlIT9cIiDigJQgZXJyb3JcbiAgIyBzZXQgXCJhc3NldHMuQS5pZFwiLCB7aW46MH0sIFwicmVwbGFjZSBhIHByaW1pdGl2ZSB3aXRoIGFuIG9ialwiXG4gICMgc2V0IFwiYXNzZXRzLkEuaWRcIiwgbnVsbCwgXCJkZWxldGUgYW4gb2JqXCJcbiAgIyBzZXQgXCJhc3NldHMuQlwiLCB7aWQ6OX0sIFwiY3JlYXRlIGFub3RoZXIgb2JqXCJcbiAgIyBzZXQgXCJmb3JrXCIsIHt9LCBcImNyZWF0ZSwgbm8gc3Vic2NyaWJlcnNcIlxuICAjIHNldCBcImFzc2V0c1wiLCBudWxsLCBcImRlbGV0ZSBhbiBvYmogd2l0aCBtYW55IHN1YnNcIlxuICAjICMgc2V0IFwiXCIsIDMsIFwic2V0IHJvb3Qg4oCUIHNob3VsZCBlcnJvclwiXG5cblxuXG4jIGNvbW1vbi9vbi1zY3JlZW4uY29mZmVlXG5UYWtlIFtdLCAoKS0+XG4gIGVsbXMgPSBuZXcgV2Vha01hcCgpXG5cbiAgb2JzZXJ2ZXJGbiA9IChlbnRyaWVzKS0+XG4gICAgZm9yIGVudHJ5IGluIGVudHJpZXNcbiAgICAgIGlmIGNiID0gZWxtcy5nZXQgZW50cnkudGFyZ2V0XG4gICAgICAgIGNiIGVudHJ5LnRhcmdldCwgZW50cnkuaXNJbnRlcnNlY3RpbmdcblxuICBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlciBvYnNlcnZlckZuLFxuICAgIHJvb3Q6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJbb24tc2NyZWVuLWNvbnRhaW5lcl1cIlxuICAgIHJvb3RNYXJnaW46IFwiMTAwMHB4XCIgIyBTdGFydCBsb2FkaW5nIGltYWdlcyBhIGxpdHRsZSBiZWZvcmUgdGhleSBzY3JvbGwgaW50byB2aWV3XG5cbiAgTWFrZS5hc3luYyBcIk9uU2NyZWVuXCIsIE9uU2NyZWVuID0gKGVsbSwgY2IpLT5cbiAgICB0aHJvdyBFcnJvciBcIk92ZXJ3cml0aW5nIGV4aXN0aW5nIE9uU2NyZWVuXCIgaWYgZWxtcy5oYXMgZWxtXG4gICAgZWxtcy5zZXQgZWxtLCBjYlxuICAgIG9ic2VydmVyLm9ic2VydmUgZWxtXG5cbiAgT25TY3JlZW4ub2ZmID0gKGVsbSktPlxuICAgIGVsbXMuZGVsZXRlIGVsbVxuXG5cblxuIyBjb21tb24vcmFpbmJvdy1iZWZvcmUuY29mZmVlXG5UYWtlIFtcIkFEU1JcIiwgXCJSYWluYm93XCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKEFEU1IsIFJhaW5ib3cpLT5cblxuICBzY3JvbGwgPSBBRFNSIDEsIDEsICgpLT5cbiAgICBSYWluYm93Lm1vdmUgMC41XG5cbiAgc2Nyb2xsKClcblxuICBmb3Igc2Nyb2xsYWJsZSBpbiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsIFwiLnNjcm9sbGFibGVcIlxuICAgIHNjcm9sbGFibGUuYWRkRXZlbnRMaXN0ZW5lciBcIndoZWVsXCIsIHNjcm9sbCwgcGFzc2l2ZTogdHJ1ZVxuXG5cblxuIyBjb21tb24vcmFpbmJvdy1jb2xvcnMuY29mZmVlXG5kbyAoKS0+XG5cbiAgY29sb3JzID0gW1xuICAgIFwiaHNsKDIwLCAxMDAlLCA1MCUpXCJcbiAgICBcImhzbCgxNzAsIDEwMCUsIDUwJSlcIlxuICAgIFwiaHNsKDI1MCwgMTAwJSwgNTAlKVwiXG4gIF1cblxuICBjb2xvcnMgPSBBcnJheS5zaHVmZmxlIGNvbG9yc1xuICBkb2N1bWVudC5ib2R5LnN0eWxlLnNldFByb3BlcnR5IFwiLS1yYWluYm93LWFcIiwgY29sb3JzWzBdXG4gIGRvY3VtZW50LmJvZHkuc3R5bGUuc2V0UHJvcGVydHkgXCItLXJhaW5ib3ctYlwiLCBjb2xvcnNbMV1cbiAgZG9jdW1lbnQuYm9keS5zdHlsZS5zZXRQcm9wZXJ0eSBcIi0tcmFpbmJvdy1jXCIsIGNvbG9yc1syXVxuXG5cblxuIyBjb21tb24vcmFpbmJvdy5jb2ZmZWVcblRha2UgW1wiU3RhdGVcIl0sIChTdGF0ZSktPlxuXG4gIFN0YXRlIFwicmFpbmJvdy1iZWZvcmUtZGVsYXlcIiwgTWF0aC5yYW5kSW50IDAsIC0xMDAwXG5cbiAgTWFrZSBcIlJhaW5ib3dcIiwgUmFpbmJvdyA9XG4gICAgbW92ZTogKGRlbHRhKS0+XG4gICAgICBkZWxheSA9IFN0YXRlKFwicmFpbmJvdy1iZWZvcmUtZGVsYXlcIikgLSBkZWx0YVxuICAgICAgU3RhdGUgXCJyYWluYm93LWJlZm9yZS1kZWxheVwiLCBkZWxheVxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5zZXRQcm9wZXJ0eSBcIi0tcmFpbmJvdy1iZWZvcmUtZGVsYXlcIiwgXCIje2RlbGF5fW1zXCJcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuc2V0UHJvcGVydHkgXCItLXJhaW5ib3ctZm9jdXNcIiwgZDMubGNoICA3MCwgMzAsIC1kZWxheS8yXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgXCJrZXlkb3duXCIsICgpLT5cbiAgICBSYWluYm93Lm1vdmUgNFxuXG5cblxuIyBjb21tb24vc2VhcmNoLWJveC5jb2ZmZWVcblRha2UgW1wiQURTUlwiLCBcIlB1YlN1YlwiLCBcIlN0YXRlXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKEFEU1IsIHtQdWIsIFN1Yn0sIFN0YXRlKS0+XG5cbiAgZWxtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcInNlYXJjaC1ib3ggaW5wdXRcIlxuICByZXR1cm4gdW5sZXNzIGVsbT9cblxuICBmb2N1c2VkID0gZmFsc2VcblxuICBjaGFuZ2UgPSBBRFNSIDEsIDEsIChlKS0+IFN0YXRlIFwic2VhcmNoXCIsIGVsbS52YWx1ZVxuXG4gIFN0YXRlLnN1YnNjcmliZSBcInNlYXJjaFwiLCBmYWxzZSwgKHYpLT5cbiAgICBlbG0udmFsdWUgPSB2IHVubGVzcyBmb2N1c2VkXG5cbiAgZWxtLmFkZEV2ZW50TGlzdGVuZXIgXCJjaGFuZ2VcIiwgY2hhbmdlXG4gIGVsbS5hZGRFdmVudExpc3RlbmVyIFwiaW5wdXRcIiwgY2hhbmdlXG4gIGVsbS5vbmZvY3VzID0gKCktPiBmb2N1c2VkID0gdHJ1ZVxuICBlbG0ub25ibHVyID0gKCktPiBmb2N1c2VkID0gZmFsc2VcblxuICBTdWIgXCJmaW5kXCIsICgpLT4gZWxtLmZvY3VzKClcblxuXG5cbiMgY29tbW9uL3N1YnNjcmlwdGlvbnMvc2VhcmNoLXJlbmRlci5jb2ZmZWVcblRha2UgW1wiUHViU3ViXCIsIFwiU3RhdGVcIl0sICh7UHVifSwgU3RhdGUpLT5cblxuICBTdGF0ZS5zdWJzY3JpYmUgXCJzZWFyY2hcIiwgZmFsc2UsICgpLT5cbiAgICBQdWIgXCJSZW5kZXJcIlxuXG5cblxuIyBjb21tb24vdGFnLWxpc3QuY29mZmVlXG5UYWtlIFtcIk1lbW9yeVwiXSwgKE1lbW9yeSktPlxuXG4gIE1ha2UuYXN5bmMgXCJUYWdMaXN0XCIsIFRhZ0xpc3QgPSAoYXNzZXQsIG9wdHMgPSB7fSktPlxuICAgIHNwZWNpYWxUYWdzID0gTWVtb3J5IFwic3BlY2lhbFRhZ3NcIlxuICAgIHNvcnRlZFRhZ3MgPSBBcnJheS5zb3J0QWxwaGFiZXRpYyBhc3NldC50YWdzXG5cbiAgICAjIE1ha2UgYWxsIHRoZSBzcGVjaWFsIHRhZ3MgZmlyc3QsIHNvIHRoZXkgY29tZSBhdCB0aGUgc3RhcnQgb2YgdGhlIGxpc3RcbiAgICBmcmFnID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKVxuICAgIGZyYWcuYXBwZW5kIG1ha2VUYWcgdGFnLCBvcHRzLCB0cnVlICBmb3IgdGFnIGluIHNvcnRlZFRhZ3Mgd2hlbiBzcGVjaWFsVGFnc1t0YWddP1xuICAgIGZyYWcuYXBwZW5kIG1ha2VUYWcgdGFnLCBvcHRzLCBmYWxzZSBmb3IgdGFnIGluIHNvcnRlZFRhZ3Mgd2hlbiBub3Qgc3BlY2lhbFRhZ3NbdGFnXT9cbiAgICByZXR1cm4gZnJhZ1xuXG4gIG1ha2VUYWcgPSAodGFnLCBvcHRzLCBzcGVjaWFsKS0+XG4gICAgZWxtID0gRE9PTS5jcmVhdGUgXCJ0YWctaXRlbVwiLCBudWxsLCB0ZXh0Q29udGVudDogdGFnXG4gICAgaWYgc3BlY2lhbCB0aGVuIERPT00gZWxtLCBzcGVjaWFsOiBcIlwiXG5cbiAgICBpZiBvcHRzLmNsaWNrP1xuICAgICAgRE9PTSBlbG0sIGNsaWNrOiAoZSktPlxuICAgICAgICBvcHRzLmNsaWNrIHRhZywgZWxtIHVubGVzcyBNZW1vcnkgXCJSZWFkIE9ubHlcIlxuXG4gICAgaWYgb3B0cy5yZW1vdmVGbj9cbiAgICAgIERPT00uY3JlYXRlIFwic3BhblwiLCBlbG0sIHRleHRDb250ZW50OiBcInhcIiwgY2xhc3M6IFwicmVtb3ZlXCIsIGNsaWNrOiAoZSktPlxuICAgICAgICBvcHRzLnJlbW92ZUZuIHRhZyB1bmxlc3MgTWVtb3J5IFwiUmVhZCBPbmx5XCJcblxuICAgIGVsbVxuXG5cblxuIyBjb21tb24vdmFsaWRhdGlvbnMuY29mZmVlXG5UYWtlIFtdLCAoKS0+XG5cbiAgTWFrZSBcIlZhbGlkYXRpb25zXCIsIFZhbGlkYXRpb25zID1cbiAgICBhc3NldDpcbiAgICAgIG5hbWU6ICh2KS0+IC0xIGlzIHYuc2VhcmNoIC9bLjovXFxcXF0vXG4gICAgZmlsZTogKHYpLT4gLTEgaXMgdi5zZWFyY2ggL1s6L1xcXFxdL1xuXG5cblxuIyBjb21tb24vd2luZG93LWV2ZW50cy5jb2ZmZWVcblRha2UgW1wiSVBDXCJdLCAoSVBDKS0+XG4gIElQQy5vbiBcImZvY3VzXCIsICgpLT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUgXCJibHVyXCJcbiAgSVBDLm9uIFwiYmx1clwiLCAoKS0+IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuYWRkIFwiYmx1clwiXG4gIElQQy5vbiBcIm1heGltaXplXCIsICgpLT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5hZGQgXCJtYXhpbWl6ZVwiXG4gIElQQy5vbiBcInVubWF4aW1pemVcIiwgKCktPiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSBcIm1heGltaXplXCJcblxuXG5cbiMgY29tbW9uL3dpbmRvd3MtbWVudS5jb2ZmZWVcblRha2UgW1wiSVBDXCIsIFwiTG9nXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKElQQywgTG9nKS0+XG5cbiAgbWluID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIndpbmRvd3MtbWVudSAjbWluXCJcbiAgbWF4ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIndpbmRvd3MtbWVudSAjbWF4XCJcbiAgcmVzdG9yZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJ3aW5kb3dzLW1lbnUgI3Jlc3RvcmVcIlxuICBjbG9zZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJ3aW5kb3dzLW1lbnUgI2Nsb3NlXCJcbiAgcmV0dXJuIHVubGVzcyBtaW4gYW5kIG1heCBhbmQgcmVzdG9yZSBhbmQgY2xvc2VcblxuICBtaW4uYWRkRXZlbnRMaXN0ZW5lciBcImNsaWNrXCIsIChlKS0+XG4gICAgSVBDLnNlbmQgXCJtaW5pbWl6ZS13aW5kb3dcIlxuXG4gIG1heC5hZGRFdmVudExpc3RlbmVyIFwiY2xpY2tcIiwgKGUpLT5cbiAgICBJUEMuc2VuZCBcIm1heGltaXplLXdpbmRvd1wiXG5cbiAgcmVzdG9yZS5hZGRFdmVudExpc3RlbmVyIFwiY2xpY2tcIiwgKGUpLT5cbiAgICBJUEMuc2VuZCBcInVubWF4aW1pemUtd2luZG93XCJcblxuICBjbG9zZS5hZGRFdmVudExpc3RlbmVyIFwiY2xpY2tcIiwgKGUpLT5cbiAgICBJUEMuc2VuZCBcImNsb3NlLXdpbmRvd1wiXG4iXX0=
//# sourceURL=coffeescript
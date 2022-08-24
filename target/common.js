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
    return State(path, (await fn(State.clone(path))), {
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
        return typeof cb === "function" ? cb(elm.textContent) : void 0;
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
        case 13: // return
          e.preventDefault();
          return elm.blur();
        case 27: // esc
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
Take(["DOOM"], function(DOOM) {
  return Make("GearView", function(depth = 30, offset = -10, attrs = {}) {
    var gearElm, gearsElm, i, len1, m, q, ref, ref1, results1;
    ref = document.querySelectorAll("gear-view");
    results1 = [];
    for (m = 0, len1 = ref.length; m < len1; m++) {
      gearsElm = ref[m];
      gearElm = gearsElm;
      for (i = q = 0, ref1 = depth; (0 <= ref1 ? q <= ref1 : q >= ref1); i = 0 <= ref1 ? ++q : --q) {
        gearElm = DOOM.create("span", gearElm); // For special effects
        gearElm = DOOM.create("div", gearElm, {
          style: `animation-delay: ${offset}s`
        });
      }
      results1.push(DOOM(gearsElm, attrs));
    }
    return results1;
  });
});

// common/hold-to-run.coffee
Take(["DOOM"], function(DOOM) {
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
Take(["DOOM"], function(DOOM) {
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
Take(["ADSR", "Rainbow"], function(ADSR, Rainbow) {
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
Take(["ADSR", "PubSub", "State"], function(ADSR, {Pub, Sub}, State) {
  var change, elm, focused;
  elm = document.querySelector("search-box input");
  if (elm == null) {
    return;
  }
  focused = false;
  State("search", {
    tags: [],
    text: "",
    tagCandidate: null
  });
  change = ADSR(1, 1, function(e) {
    return State("search.text", elm.value);
  });
  State.subscribe("search.text", false, function(v) {
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

// common/suggestion-list.coffee
Take(["ADSR", "DOOM"], function(ADSR, DOOM) {
  var SuggestionList;
  return Make("SuggestionList", SuggestionList = function(input, getSuggestions, chooseSuggestion, opts = {}) {
    var fastUpdate, firstIndex, focused, highlightIndex, highlightNext, highlightPrev, lastIndex, minHighlightIndex, reset, setValue, slowUpdate, suggestionList, update;
    suggestionList = DOOM.create("suggestion-list", input.parentElement);
    focused = false;
    minHighlightIndex = opts.alwaysHighlight ? 0 : -1;
    highlightIndex = minHighlightIndex;
    firstIndex = 0;
    lastIndex = 7;
    update = function() {
      var frag, i, len1, m, ref, scrollLimit, show, suggestion, suggestions, truncateLimit;
      suggestions = getSuggestions(input.value);
      frag = new DocumentFragment();
      // highlightIndex = (highlightIndex + suggestions.length) % (suggestions.length)
      highlightIndex = Math.clip(highlightIndex, minHighlightIndex, suggestions.length - 1);
      truncateLimit = 7; // how many results to show before truncating the list
      scrollLimit = 2; // when truncated, scroll the list if the highlight is this many spaces from the top
      if (highlightIndex + scrollLimit >= lastIndex) {
        lastIndex = Math.min(highlightIndex + scrollLimit, suggestions.length - 1);
        firstIndex = Math.max(0, lastIndex - truncateLimit);
      }
      if (highlightIndex < firstIndex + scrollLimit) {
        firstIndex = Math.max(0, highlightIndex - scrollLimit);
      }
      lastIndex = Math.min(firstIndex + truncateLimit, suggestions.length - 1);
      if (typeof opts.updateCandidate === "function") {
        opts.updateCandidate((ref = suggestions[highlightIndex]) != null ? ref.text : void 0);
      }
      for (i = m = 0, len1 = suggestions.length; m < len1; i = ++m) {
        suggestion = suggestions[i];
        if (i >= firstIndex && i <= lastIndex) {
          (function(suggestion, i) {
            var rainbowElm, suggestionElm;
            suggestionElm = DOOM.create("div", frag, {
              class: "suggestion"
            });
            rainbowElm = DOOM.create("div", suggestionElm, {
              class: "rainbow",
              rainbowBefore: i === highlightIndex ? "" : null
            });
            DOOM.create("span", rainbowElm, {
              textContent: suggestion.text
            });
            suggestionElm.addEventListener("mousemove", function(e) {
              highlightIndex = i;
              return slowUpdate();
            });
            suggestionElm.addEventListener("mousedown", function(e) {
              return setValue(suggestion.text);
            });
            if (i === highlightIndex && (suggestion.hint != null)) {
              return DOOM.create("div", suggestionElm, {
                class: "hint",
                textContent: suggestion.hint,
                rainbowBefore: ""
              });
            }
          })(suggestion, i);
        }
      }
      suggestionList.replaceChildren(frag);
      show = focused && suggestions.length > 0;
      return suggestionList.style.display = show ? "block" : "none";
    };
    fastUpdate = ADSR(10, update);
    slowUpdate = ADSR(20, 20, update);
    setValue = function(value) {
      if ((value != null ? value.length : void 0) > 0) {
        chooseSuggestion(value);
        input.value = "";
      }
      return reset();
    };
    highlightNext = function() {
      highlightIndex++;
      return fastUpdate();
    };
    highlightPrev = function() {
      highlightIndex--;
      return fastUpdate();
    };
    reset = function() {
      firstIndex = 0;
      highlightIndex = minHighlightIndex;
      return fastUpdate();
    };
    input.addEventListener("focus", function(e) {
      focused = true;
      return reset();
    });
    input.addEventListener("blur", function(e) {
      focused = false;
      return reset();
    });
    input.addEventListener("change", fastUpdate);
    input.addEventListener("input", fastUpdate);
    input.addEventListener("keydown", function(e) {
      var highlighted;
      switch (e.keyCode) {
        case 13: // return
          e.preventDefault();
          if (highlighted = suggestionList.querySelector("[rainbow-before]")) {
            return setValue(highlighted.textContent);
          } else if (opts.allowSubmitWhenNoMatch) {
            return setValue(input.value);
          } else {
            return input.blur();
          }
          break;
        case 27: // esc
          input.value = "";
          return input.blur();
        case 38: // up
          e.preventDefault();
          return highlightPrev();
        case 40: // down
          e.preventDefault();
          return highlightNext();
        default:
          return fastUpdate();
      }
    });
    return suggestionList.addEventListener("wheel", function(e) {
      if (e.deltaY > 0) {
        return highlightNext();
      } else if (e.deltaY < 0) {
        return highlightPrev();
      }
    });
  });
});

// common/tag-list.coffee
Take(["Memory"], function(Memory) {
  var TagList, makeTag;
  Make.async("TagList", TagList = function(tags, opts = {}) {
    var frag, len1, len2, m, q, specialTags, tag;
    specialTags = Memory("specialTags");
    if (!opts.noSort) {
      tags = Array.sortAlphabetic(tags);
    }
    // Make all the special tags first, so they come at the start of the list
    frag = new DocumentFragment();
    for (m = 0, len1 = tags.length; m < len1; m++) {
      tag = tags[m];
      if (specialTags[tag] != null) {
        frag.append(makeTag(tag, opts, true));
      }
    }
    for (q = 0, len2 = tags.length; q < len2; q++) {
      tag = tags[q];
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

// common/user-name.coffee
Take(["Memory"], function(Memory) {
  var elm;
  elm = document.querySelector("user-name");
  if (elm == null) {
    return;
  }
  return Memory.subscribe("user", function(v) {
    return elm.textContent = (v != null ? v.name : void 0) || "Not Logged In";
  });
});

// common/validations.coffee
Take([], function() {
  var Validations;
  return Make("Validations", Validations = {
    asset: {
      name: function(v) {
        return -1 === v.search(/[<>:?"*|\/\\]/) && v[0] !== ".";
      }
    },
    file: function(v) {
      return -1 === v.search(/[<>:?"*|\/\\]/);
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
Take(["IPC", "Log"], function(IPC, Log) {
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

// common/worklets.coffee
CSS.paintWorklet.addModule("worklets.js");

// db/assets/asset.coffee
Take(["FileTree", "Paths", "Ports", "Memory", "Read"], function(FileTree, Paths, Ports, Memory, Read) {
  var Asset, arrayPun, first, searchPrep;
  first = function(v) {
    return v != null ? v[0] : void 0;
  };
  arrayPun = function(v) {
    return v || [];
  };
  searchPrep = function(input) {
    return (input || "").toLowerCase().replace(/[^\w\d]/g, " ");
  };
  return Make("Asset", Asset = {
    new: function(path) {
      var asset, id;
      asset = {
        id: id = Read.last(path),
        name: id,
        path: path,
        number: Array.last(id.split(" ")),
        creator: id.split(" ").slice(0, -1).join(" "),
        hash: String.hash(id),
        shot: null,
        newShot: null,
        tags: [],
        files: FileTree.newEmpty(path, "Files"),
        thumbnails: {},
        _dateModified: null,
        _loading: false
      };
      asset.search = Asset.load.search(asset);
      return asset;
    },
    rehydrate: function(assetsFolder, asset) {
      // id - included in dehydrated asset
      // name - included in dehydrated asset
      asset.path = Read.path(assetsFolder, asset.id);
      asset.number = Array.last(asset.id.split(" "));
      asset.creator = asset.id.split(" ").slice(0, -1).join(" ");
      asset.hash = String.hash(asset.id);
      // shot - not needed by browser for initial render
      // newShot - not needed by browser for initial render
      // tags - included in dehydrated asset
      // files - included in dehydrated asset
      asset.thumbnails = {};
      // search - included in dehydrated asset
      return asset;
    },
    // This preps an asset for caching to disk. Only keep the modicum of properties needed
    // to quickly get an asset ready for use in the Browser right when Hyperzine launches.
    // Additional asset data will be loaded (more slowly / lazily) once Hyperzine is running.
    // This lives here because this file is the hub of knowledge about what props assets ought to have.
    dehydrate: function(asset) {
      return {
        id: asset.id,
        name: asset.name,
        // path - will be rehydrated on load
        // number - will be rehydrated on load
        // creator - will be rehydrated on load
        // shot - not needed by browser for initial render
        // newShot - not needed by browser for initial render
        tags: asset.tags,
        files: {
          count: asset.files.count
        },
        // thumbnails - not needed by browser for initial render
        search: asset.search
      };
    },
    loadFields: async function(asset) {
      asset.name = (await Asset.load.name(asset));
      asset.shot = (await Asset.load.shot(asset));
      asset.newShot = (await Asset.load.newShot(asset));
      asset.tags = (await Asset.load.tags(asset));
      asset.files = (await Asset.load.files(asset));
      asset.thumbnails = (await Asset.load.thumbnails(asset));
      asset.search = Asset.load.search(asset);
      asset._dateModified = (await Asset.load.dateModified(asset));
      return asset;
    },
    load: {
      name: async function(asset) {
        var name;
        name = (await Read.async(Paths.names(asset)).then(first));
        return (name || asset.id).trim();
      },
      shot: function(asset) {
        return Read.async(Paths.shots(asset)).then(first);
      },
      newShot: function(asset) {
        return Read.async(Paths.newShots(asset)).then(first);
      },
      tags: async function(asset) {
        var assetTags, i, len, tag;
        assetTags = (await Read.async(Paths.tags(asset)).then(arrayPun));
        for (i = 0, len = assetTags.length; i < len; i++) {
          tag = assetTags[i];
          Memory(`tags.${tag}`, tag);
        }
        return assetTags;
      },
      files: function(asset) {
        return FileTree.newPopulated(asset.path, "Files");
      },
      thumbnails: async function(asset) {
        var thumbs;
        thumbs = (await Read.async(Paths.thumbnails(asset)).then(arrayPun));
        return Array.mapToObject(thumbs, function(thumb) {
          return Paths.thumbnail(asset, thumb);
        });
      },
      search: function(asset) {
        return {
          id: searchPrep(asset.id),
          name: searchPrep(asset.name),
          tags: Array.unique(asset.tags).map(searchPrep),
          files: Array.unique(FileTree.flat(asset.files, "basename")).map(searchPrep),
          exts: Array.unique(FileTree.flat(asset.files, "ext")).map(searchPrep)
        };
      },
      dateModified: async function(asset) {
        var stats;
        stats = (await Read.stat(asset.path));
        return stats != null ? stats.mtimeMs : void 0;
      }
    }
  });
});

// db/assets/load-assets.coffee
Take(["Asset", "DBState", "Log", "Memory", "Read"], function(Asset, DBState, Log, Memory, Read) {
  var LoadAssets, load, requested, restart, running;
  // LoadAssets does a ton of long-running async stuff, so if the dataFolder
  // changes while it's running, we'll be asked to start over again.
  running = false;
  requested = false;
  restart = function() {
    running = false;
    requested = false;
    Log("Restarting LoadAssets", {
      background: "#f80",
      color: "black"
    });
    return LoadAssets();
  };
  Make.async("LoadAssets", LoadAssets = function() {
    if (!running) {
      running = true;
      return requestAnimationFrame(load);
    } else {
      return requested = true;
    }
  });
  return load = async function() {
    var assets, assetsFolder, created, deltaload, fastload;
    Log("LoadAssets");
    assets = {};
    assetsFolder = Memory("assetsFolder");
    // Mark that we want to be in a "read only" mode, so that things that would
    // normally happen when assets are changed might not happen, since *lots*
    // of assets are about to change.
    Memory("Read Only", true);
    // This ensures we have an assets object in Memory, even if the library is brand new
    // and there are no assets in it yet (in which case none of the below would end up
    // committing to Memory, and Memory("assets") would be undefined)
    Memory.default("assets", assets);
    Log.time("Rehydrating DBState Assets", function() {
      var asset, id, needSave;
      // To start, load all asset data cached from the last run.
      // This should be everything needed to get the Browser minimally ready for read-only use
      // (albeit with stale data).
      assets = DBState("assets");
      needSave = false;
      for (id in assets) {
        asset = assets[id];
        Asset.rehydrate(assetsFolder, asset);
        asset._loading = true;
        needSave = true;
      }
      if (needSave) {
        return Memory("assets", assets);
      }
    });
    // Now that we've got the cached asset data loaded, we need to do 2 things with the real assets folder:
    // 1. Fast-load assets created since our last run.
    // 2. Clear assets deleted since our last run.
    // Once we have these things taken care of, the Browser will be in a fully correct state, though still read-only.
    created = {}; // Track the assets that are new, so we can skip reloading them down below.
    
    // This should all take around 3s on a first run, and only a few ms on subsequent runs.
    await Log.time.async("Fast-Loading New Assets", fastload = async function() {
      var asset, assetFolderName, assetId, confirmed, i, j, len, len1, needSave, p, promises, ref;
      confirmed = {}; // Track the real assets we've seen, so we can clear any cached assets that were deleted.
      promises = [];
      needSave = false;
      ref = Read(assetsFolder);
      for (i = 0, len = ref.length; i < len; i++) {
        assetFolderName = ref[i];
        // First, build a new basic asset from the asset folder's name and path.
        asset = Asset.new(Read.path(assetsFolder, assetFolderName));
        // If this is a new asset, we can load the rest of its data and save it.
        if (assets[asset.id] == null) {
          created[asset.id] = true;
          assets[asset.id] = asset;
          promises.push(Asset.loadFields(asset));
          needSave = true;
        }
        // Mark that we've seen this asset.
        confirmed[asset.id] = true;
      }
      for (j = 0, len1 = promises.length; j < len1; j++) {
        p = promises[j];
        await p;
      }
// 2. Clear any assets we didn't see during our loop over the assets folder.
      for (assetId in assets) {
        if (!(!confirmed[assetId])) {
          continue;
        }
        delete assets[assetId];
        needSave = true;
      }
      if (needSave) {
        return Memory("assets", assets);
      }
    });
    if (requested) {
      return restart();
    }
    // Now that we're done loading all the new assets, we can go back and re-load all the other
    // assets, to catch any changes we might have missed since Hyperzine last ran, and to fill-in
    // any of the details that weren't included in the cache.
    await Log.time.async("Reloading Not-New Assets", deltaload = async function() {
      var asset, i, id, len, needSave, p, promise, promises;
      needSave = false;
      promises = (function() {
        var results;
        results = [];
        for (id in assets) {
          asset = assets[id];
          if (created[id] != null) {
            // Skip any assets that we already loaded, since they're already presumably up-to-date
            // (and watch-assets.coffee will catch any changes that happen while we're running)
            continue;
          }
          needSave = true;
          results.push(promise = Asset.loadFields(asset));
        }
        return results;
      })();
      for (i = 0, len = promises.length; i < len; i++) {
        p = promises[i];
        asset = (await p);
        asset._loading = false;
      }
      if (needSave) {
        // Saving this because it seems to be faster than the above in some cases.
        // We can test it more later.
        // load = (k)->
        //   new Promise loadPromise = (resolve)->
        //     requestAnimationFrame loadRaf = ()->
        //       await Log.time.async "Build #{k}", loadLog = ()->
        //         for id, asset of assets when not created[id]?
        //           asset[k] = Asset.load[k] asset
        //         for id, asset of assets when not created[id]?
        //           asset[k] = await asset[k]
        //         null
        //       resolve()

        // for k in ["name", "shot", "tags", "files"]
        //   await load k

        // Log.time "Build Search", searchlog = ()->
        //   for id, asset of assets when not created[id]?
        //     asset.search = Asset.load.search asset
        //     needSave = true
        return Memory("assets", assets);
      }
    });
    if (requested) {
      return restart();
    }
    // Finally, save a simplified version of assets to the disk, to speed future launch times.
    Log.time("Saving Fast-Load Asset Cache", function() {
      return DBState("assets", Object.mapValues(assets, Asset.dehydrate));
    });
    if (requested) {
      // Done
      return restart();
    }
    running = false;
    return Memory("Read Only", false);
  };
});

// db/coffee/config.coffee
// Config
// This system manages user preferences and related data. It uses Memory to share this data with other systems.
// This file is also where all the default values for user preferences are listed.
Take(["ADSR", "Env", "Log", "Memory", "Read", "Write"], function(ADSR, Env, Log, Memory, Read, Write) {
  var applyConfig, configData, save, setupSubscribers, updateAndSave;
  // This lists all the keys we'll persist in the config file, with their default values
  configData = {
    apiToken: null,
    assetThumbnailSize: 0.5,
    browserThumbnailSize: 1,
    dataFolder: Env.defaultDataFolder,
    localName: Env.computerName,
    setupDone: false
  };
  applyConfig = function(data) {
    var didSet, k, results, v;
    results = [];
    for (k in data) {
      v = data[k];
      didSet = Memory.default(k, v);
      if (!didSet) {
        Log.err(`Memory(${k}) was already defined before Config initialized it`);
      }
      results.push(configData[k] = v);
    }
    return results;
  };
  setupSubscribers = function() {
    var k, results;
    results = [];
    for (k in configData) {
      results.push(Memory.subscribe(k, false, updateAndSave(k)));
    }
    return results;
  };
  updateAndSave = function(k) {
    return function(v) {
      if (configData[k] !== v) {
        configData[k] = v;
        return save();
      }
    };
  };
  save = ADSR(0, 2000, function() {
    return Write.sync.json(Env.configPath, configData, {
      quiet: true
    });
  });
  return Make("Config", function() {
    return Log.time("Loading Config", function() {
      var configFile, loadedData;
      configFile = Read.file(Env.configPath);
      if (configFile == null) {
        applyConfig(configData); // Use the default config data
        setupSubscribers();
        return false; // No config file — need to run Setup Assistant
      }
      try {
        loadedData = JSON.parse(configFile);
        applyConfig(loadedData);
        setupSubscribers();
        // Loaded successfully — return true to launch normally, or false to run Setup Assistant
        return Boolean(configData.setupDone);
      } catch (error1) {
        return null; // Fatal error
      }
    });
  });
});


// db/coffee/db-state.coffee
// This file manages data that needs to be persisted to the local filesystem, just for the DB process.
// The typical use of this system is to cache data that'll speed up launching the app.
// DBState is its own data store. It does not put its data into State or Memory.
Take(["ADSR", "Env", "Log", "Read", "Write"], function(ADSR, Env, Log, Read, Write) {
  var DBState, save, state;
  // This lists all the keys we'll persist in the DBState file, with their default values
  state = {
    assets: {}
  };
  save = ADSR(20, 2000, function() {
    return Log.time("Saving DBState", function() {
      // TODO: This should totally be async
      return Write.sync.json(Env.dbStatePath, state, {
        quiet: true
      });
    });
  });
  Make.async("DBState", DBState = function(k, v) {
    if (state[k] == null) {
      throw Error(`Unknown DBState key: ${k}`);
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
  return DBState.init = function() {
    return Log.time("Loading DBState", function() {
      var data, json, k, results, v;
      try {
        json = Read.file(Env.dbStatePath);
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
      } catch (error1) {}
    });
  };
});

// db/coffee/ports.coffee
Take(["IPC", "Log"], function(IPC, Log) {
  var Ports, listeners, ports;
  ports = {};
  listeners = {};
  IPC.on("port", function(e, {id}) {
    var port;
    port = ports[id] = e.ports[0];
    return port.onmessage = async function({
        data: [requestID, msg, ...args]
      }) {
      var fn, v;
      if (fn = listeners[msg]) {
        v = (await fn(...args));
        return port.postMessage(["return", requestID, v]);
      } else {
        return Log.err(`Missing DB port handler: ${msg}`);
      }
    };
  });
  // This is for communication from Main to DB in a way that pretends to be a port.
  // Useful especially for libs that use the DB interface, like Log.
  IPC.on("mainPort", function(e, msg, ...args) {
    var fn;
    if (fn = listeners[msg]) {
      return fn(...args);
    } else {
      // No return value (yet — implement this if we need it)
      return Log.err(`Missing DB mainPort handler: ${msg}`);
    }
  });
  return Make("Ports", Ports = {
    on: function(msg, cb) {
      if (listeners[msg] != null) {
        throw Error(`DB Port message ${msg} already has a listener`);
      }
      return listeners[msg] = cb;
    },
    send: function(msg, ...args) {
      var id, port;
      for (id in ports) {
        port = ports[id];
        port.postMessage([msg, ...args]);
      }
      return null;
    }
  });
});

// close: (id)->
//   ports[id].close()
//   delete ports[id]

// db/coffee/printer.coffee
Take(["DOOM", "Ports"], function(DOOM, Ports) {
  var Printer, maxLogLines, printer;
  maxLogLines = 5000;
  printer = document.querySelector("log-printer");
  Printer = function(msg, attrs, time) {
    var elm;
    time = (time || performance.now()).toFixed(0).padStart(5);
    console.log(time, msg);
    elm = DOOM.create("div", null, {
      textContent: (time / 1000).toFixed(3) + "  " + msg
    });
    if (attrs != null) {
      DOOM(elm, attrs);
    }
    DOOM.prepend(printer, elm);
    while (printer.childElementCount > maxLogLines) {
      DOOM.remove(printer.lastChild);
    }
    return msg;
  };
  Ports.on("printer", Printer);
  return Make("Printer", Printer);
});

// db/db.coffee
Take(["Config", "DBState", "IPC", "Log"], function(Config, DBState, IPC, Log) {
  var config;
  // Let the Main process know that the DB is open and it's safe to begin logging
  IPC.send("db-open");
  // The DB process stores a cache of data in a file, to help it speed up launching. We load that first.
  DBState.init();
  // Next, we load the config file — preference data created by the Setup Assistant and through general user interaction.
  config = Config();
  // Depending on how the config load went, we can continue to launch the main app, or drop
  // the user into the Setup Assistant.
  switch (config) {
    case true:
      return IPC.send(Log("config-ready")); // Setup Assistant was previously completed, so launch the main app.
    case false:
      return IPC.send(Log("open-setup-assistant")); // Setup Assistant has not been completed, so launch it.
    default:
      return IPC.send("fatal", "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help.");
  }
});

// At this point we're done initializing. Here's what happens next:
// * Either the config file or the Setup Assistant will specify a data folder.
// * The assets-folder.coffee subscription will make sure we have an Assets folder in the data folder,
//   and then call LoadAssets() to load all our asset data into memory.
// * Concurrently with the above, the Main process will launch a Browser window.
// * As asset data comes into existence, the Browser window will populate itself.

// db/ports-handlers/asset-handlers.coffee
Take(["Asset", "FileTree", "IPC", "Job", "Log", "Memory", "Paths", "Ports", "Read", "Write"], function(Asset, FileTree, IPC, Job, Log, Memory, Paths, Ports, Read, Write) {
  Ports.on("New Asset", function() {
    var assetsFolder, creator, id, number, path;
    assetsFolder = Memory("assetsFolder");
    number = Memory("nextAssetNumber");
    creator = Memory("localName");
    id = creator + " " + number;
    path = Read.path(assetsFolder, id);
    Memory(`assets.${id}`, Asset.new(path)); // Update Memory
    Write.sync.mkdir(path); // Update Disk
    IPC.send("open-asset", id);
    return id;
  });
  Ports.on("Delete Asset", function(assetId) {
    var asset;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    Memory(`assets.${assetId}`, null); // Update Memory
    return Write.sync.rm(asset.path); // Update Disk
  });
  Ports.on("Rename Asset", function(assetId, v) {
    var asset;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    Memory(`assets.${assetId}.name`, v); // Update Memory
    return Write.sync.array(Paths.names(asset), [v]); // Update Disk
  });
  Ports.on("Add Tag", function(assetId, tag) {
    var asset;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    Memory.update(`assets.${assetId}.tags`, function(tags) { // Update Memory
      return Array.sortAlphabetic(tags.concat(tag));
    });
    return Write.sync.mkdir(Paths.tag(asset, tag)); // Update Disk
  });
  Ports.on("Remove Tag", function(assetId, tag) {
    var asset;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    Memory.mutate(`assets.${assetId}.tags`, function(tags) { // Update Memory
      return Array.pull(tags, tag);
    });
    return Write.sync.rm(Paths.tag(asset, tag)); // Update Disk
  });
  Ports.on("Add Files", function(assetId, newFiles) {
    var asset, assetFilesPath, file, i, len;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    assetFilesPath = Paths.files(asset);
    Write.sync.mkdir(assetFilesPath);
    for (i = 0, len = newFiles.length; i < len; i++) {
      file = newFiles[i];
      Write.async.copyInto(file, assetFilesPath);
    }
    return null;
  });
  Ports.on("Delete File", function(assetId, relpath) {
    var asset, file;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    if (!(file = FileTree.find(asset.files, "relpath", relpath))) {
      return;
    }
    // Updating Memory would be complex, so we'll just let watch-assets catch this one
    return Write.sync.rm(file.path); // Update Disk
  });
  Ports.on("Rename File", function(assetId, relpath, v) {
    var asset, file;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    if (!(file = FileTree.find(asset.files, "relpath", relpath))) {
      return;
    }
    // Updating Memory would be complex, so we'll just let watch-assets catch this one
    return Write.sync.rename(file.path, v); // Update Disk
  });
  Ports.on("Set Thumbnail", function(assetId, relpath) {
    var asset, file, newShotsFolder;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    if (!(file = FileTree.find(asset.files, "relpath", relpath))) {
      return;
    }
    if (file.name === asset.newShot) {
      return;
    }
    // We'll just let watch-assets handle updating newShot in Memory
    // Update Disk
    newShotsFolder = Paths.newShots(asset);
    Write.sync.rm(newShotsFolder);
    Write.sync.mkdir(newShotsFolder);
    return Write.sync.copyFile(file.path, Read.path(newShotsFolder, Read.last(file.path)));
  });
  return Ports.on("Rebuild Thumbnail", function(assetId) {
    var asset;
    if (!(asset = Memory(`assets.${assetId}`))) {
      return;
    }
    return Job(1, "Rebuild Asset Thumbnail", asset, true);
  });
});

// db/ports-handlers/create-file-thumbnail.coffee
Take(["Log", "Memory", "Ports", "Thumbnail"], function(Log, Memory, Ports, Thumbnail) {
  return Ports.on("create-file-thumbnail", function(assetId, path, size, destName) {
    var asset;
    if (asset = Memory(`assets.${assetId}`)) {
      return Thumbnail(asset, path, size, destName);
    }
  });
});

// db/ports-handlers/debug-handlers.coffee
Take(["Job", "Log", "Memory", "Ports"], function(Job, Log, Memory, Ports) {
  return Ports.on("Rebuild All Thumbnails", function() {
    var asset, id, ref, results;
    ref = Memory("assets");
    results = [];
    for (id in ref) {
      asset = ref[id];
      results.push(Job("Rebuild Asset Thumbnail", asset, true));
    }
    return results;
  });
});

// db/subscriptions/assets-folder.coffee
Take(["LoadAssets", "Log", "Memory", "Read", "Write"], function(LoadAssets, Log, Memory, Read, Write) {
  return Memory.subscribe("dataFolder", true, function(dataFolder) {
    var assetsFolder;
    if (dataFolder == null) {
      return;
    }
    assetsFolder = Read.path(dataFolder, "Assets");
    if (Memory.change("assetsFolder", assetsFolder)) {
      Log(`assetsFolder: ${assetsFolder}`);
      Write.sync.mkdir(assetsFolder);
      return LoadAssets();
    }
  });
});

// db/subscriptions/lbs-authentication.coffee
Take(["Log", "Memory"], function(Log, Memory) {
  var error;
  // Note — the loginStatus strings are used by login in setup-assistant.coffee,
  // so don't change them unless you update that file too.
  Memory.subscribe("apiToken", true, async function(v) {
    var res, user;
    if (v != null) {
      Memory.change("loginStatus", "Logging In");
      res = (await fetch("https://www.lunchboxsessions.com/hyperzine/api/login", {
        headers: {
          "X-LBS-API-TOKEN": v
        }
      }));
      if (res.ok && (user = (await res.json()))) {
        Log(`Logged in as ${user.name}`, {
          color: "hsl(153, 80%, 41%)" // mint
        });
        Memory.change("user", user);
        return Memory.change("loginStatus", "Logged In");
      } else {
        return error();
      }
    } else {
      Memory.change("user", null);
      return Memory.change("loginStatus", "Not Logged In");
    }
  });
  return error = function() {
    Log.err("Login failed");
    Memory.change("user", null);
    return Memory.change("loginStatus", "Failed to verify this API Token");
  };
});

// db/subscriptions/next-asset-number.coffee
Take(["Memory"], function(Memory) {
  var update;
  update = function() {
    var asset, assetId, assets, highestNumber, localName;
    assets = Memory("assets");
    localName = Memory("localName");
    if (!((localName != null) && (assets != null))) {
      return;
    }
    highestNumber = 0;
    for (assetId in assets) {
      asset = assets[assetId];
      if (asset.creator.toLowerCase() === localName.toLowerCase()) {
        highestNumber = Math.max(highestNumber, asset.number);
      }
    }
    Memory("nextAssetNumber", highestNumber + 1);
    return null;
  };
  Memory.subscribe("localName", true, update);
  Memory.subscribe("assets", true, update);
  return update();
});

// db/subscriptions/save-asset-cache.coffee
Take(["Asset", "ADSR", "DBState", "Log", "Memory"], function(Asset, ADSR, DBState, Log, Memory) {
  return Memory.subscribe("assets", false, ADSR(300, 10000, function(assets) {
    if (assets == null) {
      return;
    }
    if (Memory("Read Only")) {
      return;
    }
    if (Memory("Pause Caching")) {
      return;
    }
    return Log.time("Updating Fast-Load Asset Cached", function() {
      return DBState("assets", Object.mapValues(assets, Asset.dehydrate));
    });
  }));
});

// db/subscriptions/watch-assets.coffee
Take(["Asset", "ADSR", "Job", "Log", "Memory", "Read"], function(Asset, ADSR, Job, Log, Memory, Read) {
  var change, setup, touchedAssets, update, validFileName, watcher;
  watcher = null;
  validFileName = function(v) {
    if (!((v != null ? v.length : void 0) > 0)) {
      return false;
    }
    if (v.indexOf(".") === 0) { // Exclude dotfiles
      return false;
    }
    return true; // Everything else is good
  };
  touchedAssets = {};
  update = ADSR(100, 1000, function() {
    var assetId;
    for (assetId in touchedAssets) {
      Job(50, "Watched Asset Reload", assetId);
    }
    return touchedAssets = {};
  });
  Job.handler("Watched Asset Reload", async function(assetId) {
    var asset, assetsFolder, path, prevNewShot;
    assetsFolder = Memory("assetsFolder");
    path = Read.path(assetsFolder, assetId);
    if ((await Read.isFolder(path))) {
      asset = Memory.clone(`assets.${assetId}`);
      if (asset == null) {
        asset = Asset.new(path);
      }
      Log(`Reloading Asset: ${assetId}`, {
        color: "hsl(333, 50%, 50%)"
      });
      prevNewShot = asset.newShot;
      await Asset.loadFields(asset);
      Log(prevNewShot, {
        background: "hsl(250, 100%, 80%)" // lavender
      });
      Log(asset.newShot, {
        background: "hsl(150, 60%, 60%)" // mint
      });
      if (asset.newShot !== prevNewShot) {
        await Job(1, "Rebuild Asset Thumbnail", asset, true);
      }
      await Job(1, "Rebuild File Thumbnails", asset, true);
    } else {
      asset = null;
    }
    return Memory(`assets.${assetId}`, asset);
  });
  change = function(eventType, fullPath) {
    var assetId, assetsFolder, pathWithinAssetsFolder;
    assetsFolder = Memory("assetsFolder");
    pathWithinAssetsFolder = fullPath.replace(assetsFolder, "");
    assetId = Array.first(Read.split(pathWithinAssetsFolder));
    if (!validFileName(assetId)) {
      return;
    }
    if (!validFileName(Array.last(Read.split(fullPath)))) {
      return;
    }
    // Log "Disk Watcher: #{pathWithinAssetsFolder}", color: "hsl(333, 50%, 50%)"
    // We'll just reload the whole asset. This is simpler than trying to track exactly which paths have changed,
    // and the performance overhead will be effectively invisible (likely less than 1ms even on giant assets).
    touchedAssets[assetId] = true;
    return update();
  };
  setup = function() {
    var assetsFolder;
    if (watcher != null) {
      watcher.close();
    }
    touchedAssets = {}; // Clear any changes queued up for the debounced update, since they'll no longer resolve properly
    assetsFolder = Memory("assetsFolder");
    if (assetsFolder != null) {
      return watcher = Read.watch(assetsFolder, {
        recursive: true,
        persistent: false
      }, change);
    }
  };
  return Memory.subscribe("assetsFolder", true, setup);
});

// db/subscriptions/write-assets.coffee

// Having a system that automatically responds to changes in an asset in memory
// by writing them to disk is risky. We could end up in situations where watch-assets
// notices some changes, triggers a reload, then the reload happens and that changes the asset in memory,
// then write-assets is triggered, then it checks the disk and in the time between the reload
// and write-assets running, the disk has changed again (eg: due to dropbox), so write-assets ends up
// clobbering dropbox. That's bad.

// We should probably make it so that anything that changes some data inside an asset needs to tell
// both memory and the disk to update. We update memory so that the GUI can update right away. We also
// manually tell the disk to update (via some Ports call, of course) instead of relying on something like
// write-assets, so that we have a sense of provenance for changes, and so that we err on the side of
// missing writes to the disk (which is less bad) instead of writing things we didn't mean to write
// (which is worse, because it can cause inadvertant deletions).

// Also, the disk updates should be *sync* so that if there's a bunch of changes that need to be
// persisted individually, we don't end up interleaving the writes and watch-assets reads.
// By doing a bunch of writes in sync, that's basically like putting the writes inside a transaction.
// *If* we notice performance issues, we can come up with something more elaborate to make asnyc writing
// work (eg: by pausing watch-assets or something)

// Take ["ADSR", "Log", "Memory", "Read", "Write"], (ADSR, Log, Memory, Read, Write)->

//   enabled = false
//   changed = {}
//   permittedKeys = name: "Name", shot: "Shot", tags: "Tags"#, files: "Files"

//   update = ADSR 1, 1, ()->
//     for id, changes of changed
//       if changes? then updateAsset id, changes else deleteAsset id
//     changed = {}

//   deleteAsset = (id)->
//     Log "Deleting asset?"
//     return unless id?.length > 0
//     assetsFolder = Memory "assetsFolder"
//     path = Read.path assetsFolder, id
//     if Read(path)?
//       Write.sync.rm path

//   updateAsset = (id, changes)->
//     for k, v of changes
//       folder = permittedKeys[k]
//       continue unless folder # The change was an asset property that doesn't get saved
//       if v?
//         updateProperty id, folder, v
//       else
//         deleteProperty id, folder
//     null

//   updateProperty = (id, folder, v)->
//     v = [v] unless v instanceof Array
//     assetsFolder = Memory "assetsFolder"
//     path = Read.path assetsFolder, id, folder
//     Write.sync.array path, v

//   deleteProperty = (id, folder)->
//     assetsFolder = Memory "assetsFolder"
//     path = Read.path assetsFolder, id, folder
//     current = Read path
//     return unless current?.length > 0
//     path = Read.path path, current[0] if current.length is 1
//     Write.sync.rm path

//   Memory.subscribe "assets", false, (assets, changedAssets)->
//     return unless enabled # Persisting changes will be paused during big loads
//     console.log "WRITING", Object.clone changedAssets
//     changed = Object.merge changed, changedAssets
//     update()

//   Make "WriteAssets", WriteAssets =
//     enable: (enable = true)-> enabled = enable

// db/tags/special-tags.coffee
Take(["Memory"], function(Memory) {
  var specialTags;
  specialTags = {"Archived": "Archived"};
  Memory.merge("tags", specialTags);
  return Memory("specialTags", specialTags);
});

// db/tags/tag-descriptions.coffee
Take(["Log", "Memory", "Read"], function(Log, Memory, Read) {
  return Memory.subscribe("dataFolder", true, function(dataFolder) {
    var data, json, systemFolder;
    if (dataFolder == null) {
      return;
    }
    return systemFolder = (json = Read.file(Read.path(dataFolder, "System", "Tag Descriptions.json"))) ? (data = JSON.parse(json), Memory("Tag Descriptions", data)) : void 0;
  });
});

// db/thumbnails/job-rebuild-asset-thumbnail.coffee
Take(["Job", "Log", "Paths", "Read", "Thumbnail", "Write"], function(Job, Log, Paths, Read, Thumbnail, Write) {
  var captureNewShot;
  Job.handler("Rebuild Asset Thumbnail", async function(asset, overwrite = false) {
    var file, has128, has512, i, len, msg, path, ref, ref1;
    msg = `Thumbnails for ${asset.id} —`;
    if (!overwrite) {
      has128 = Read.sync.exists(Paths.thumbnail(asset, "128.jpg"));
      has512 = Read.sync.exists(Paths.thumbnail(asset, "512.jpg"));
      if (has128 && has512) {
        Log(`${msg} already exist :)`, {
          color: "hsl(330, 55%, 50%)" // violet
        });
        return;
      }
    }
    if (asset.newShot != null) {
      path = Paths.newShot(asset);
      has128 = (await Thumbnail(asset, path, 128));
      has512 = (await Thumbnail(asset, path, 512));
      Log(`${msg} using new shot <3`, "hsl(220, 50%, 50%)"); // blue
      return;
    }
    // No specified shot, attempt to use a random file.
    if (((ref = asset.files) != null ? ref.count : void 0) > 0) {
      ref1 = asset.files.children;
      for (i = 0, len = ref1.length; i < len; i++) {
        file = ref1[i];
        Log(`${msg} trying files... ${file.name}`);
        if ((await Thumbnail(asset, file.path, 128))) {
          if ((await Thumbnail(asset, file.path, 512))) {
            Log(`${msg} used file ${file.name} :}`, {
              color: "hsl(180, 100%, 29%)" // teal
            });
            return captureNewShot(asset, file.path); // success
          }
        }
      }
    }
    Log(`${msg} no dice :(`, {
      color: "hsl(25, 100%, 59%)" // orange
    });
    return null;
  });
  return captureNewShot = function(asset, shotFile) {
    var file, i, len, newShotsFolder, ref;
    // We want to show which file was used to generate the thumbnail.
    // The simplest thing is just to make a copy of the source file and save it.
    // That way, we don't need to worry about what happens if the source file is renamed
    // or deleted or whatever — we have our copy of the shot, and the user can see what
    // file was used (because the filename will be there too — good enough) and if the
    // user deleted that original file and wants the shot to change, they can just change
    // the shot, good enough.
    newShotsFolder = Paths.newShots(asset);
    Write.sync.mkdir(newShotsFolder);
    ref = Read(newShotsFolder);
    for (i = 0, len = ref.length; i < len; i++) {
      file = ref[i];
      Write.sync.rm(file);
    }
    return Write.sync.copyFile(shotFile, Read.path(newShotsFolder, Read.last(shotFile)));
  };
});

// db/thumbnails/job-rebuild-file-thumbnails.coffee
Take(["FileTree", "Job", "Log", "Memory", "Paths", "Read", "Thumbnail", "Write"], function(FileTree, Job, Log, Memory, Paths, Read, Thumbnail, Write) {
  return Job.handler("Rebuild File Thumbnails", async function(asset) {
    var existing, file, i, len, needed, promises, ref, thumb, toCreate, toDelete;
    if (asset == null) {
      return;
    }
    needed = {};
    ref = FileTree.flat(asset.files);
    for (i = 0, len = ref.length; i < len; i++) {
      file = ref[i];
      thumb = Paths.thumbnailName(file, 256);
      needed[thumb] = file;
    }
    if (existing = Read(Paths.thumbnails(asset))) {
      existing = Array.mapToObject(existing);
      delete existing["128.jpg"];
      delete existing["512.jpg"];
      toCreate = Object.subtractKeys(existing, needed);
      toDelete = Object.subtractKeys(needed, existing);
    } else {
      toCreate = needed;
      toDelete = {};
    }
    for (thumb in toDelete) {
      Log(`Delete File Thumbnail: ${Paths.thumbnail(asset, thumb)}`);
      Write.sync.rm(Paths.thumbnail(asset, thumb));
    }
    promises = (function() {
      var results;
      results = [];
      for (thumb in toCreate) {
        file = toCreate[thumb];
        if ((file.ext != null) && !Paths.ext.icon[file.ext]) {
          results.push(Thumbnail(asset, file.path, 256, thumb));
        }
      }
      return results;
    })();
    return (await Promise.all(promises));
  });
});

// db/thumbnails/thumbnail.coffee
Take(["Env", "IPC", "Job", "Log", "Memory", "Paths", "Read", "Write"], function(Env, IPC, Job, Log, Memory, Paths, Read, Write) {
  var Thumbnail, childProcess, errCount, handleErr, importantErrorMessages, nativeImage, promises, unimportantErrorMessages;
  promises = {};
  Make.async("Thumbnail", Thumbnail = function(asset, sourcePath, size, destName) {
    var assetsFolder, destPath, ext, handler, subpath;
    ext = Array.last(sourcePath.split(".")).toLowerCase();
    // We're going to be asked to preview a few known formats pretty often,
    // and we don't yet have any way to preview them. The caller should use an icon instead.
    if (Paths.ext.icon[ext]) {
      return;
    }
    assetsFolder = Memory("assetsFolder");
    subpath = sourcePath.replace(assetsFolder, "");
    if (destName == null) {
      destName = `${size}.jpg`;
    }
    destPath = Paths.thumbnail(asset, destName);
    Write.sync.mkdir(Paths.thumbnails(asset));
    handler = Env.isMac && (Paths.ext.sips[ext] != null) ? "SipsThumbnail" : "NativeThumbnail";
    return Job(2, handler, sourcePath, destPath, size, subpath);
  });
  childProcess = null;
  Job.handler("SipsThumbnail", function(source, dest, size, subpath) {
    return new Promise(function(resolve) {
      Log(`Sips Thumbnail: ${source}`);
      if (childProcess == null) {
        childProcess = require("child_process");
      }
      return childProcess.exec(`sips -s format jpeg -s formatOptions 91 -Z ${size} \"${source}\" --out \"${dest}\"`, function(err) {
        if (err != null) {
          handleErr(subpath, err);
          return resolve(null);
        } else {
          return resolve(dest);
        }
      });
    });
  });
  nativeImage = null;
  Job.handler("NativeThumbnail", function(source, dest, size, subpath) {
    return new Promise(async function(resolve) {
      var buf, err, image;
      Log(`Native Thumbnail: ${source}`);
      try {
        if (nativeImage == null) {
          nativeImage = require("electron").nativeImage;
        }
        image = (await nativeImage.createThumbnailFromPath(source, {
          width: size,
          height: size
        }));
        buf = image.toJPEG(91);
        Write.sync.file(dest, buf); // TODO: Should be async
        return resolve(dest);
      } catch (error1) {
        err = error1;
        handleErr(subpath, err);
        return resolve(null);
      }
    });
  });
  errCount = 0;
  // Add messages to this list if we want to alert the user about them.
  // If one of these messages occurs, that usually means either the file is corrupt
  // (so the user ought to investiage and fix the file if possible), or the file
  // is in a format that we can't generate a thumbnail for (in which case the file
  // extension should be added to Paths.ext.icon)
  importantErrorMessages = ["Unable to render destination image"];
  // Add messages to this list if we don't want to bother alerting the user about them
  unimportantErrorMessages = ["Unable to retrieve thumbnail preview image for the given path", "Cannot extract image from file", "Failed to get thumbnail from local thumbnail cache reference"];
  return handleErr = function(subpath, err) {
    var alert, i, j, len, len1, message;
    Log.err(`Error generating thumbnail for ${subpath}:\n ${err.toString()}`);
    for (i = 0, len = unimportantErrorMessages.length; i < len; i++) {
      message = unimportantErrorMessages[i];
      if (-1 !== err.message.toLowerCase().indexOf(message.toLowerCase())) {
        return;
      }
    }
    if (++errCount > 3) {
      return;
    }
    for (j = 0, len1 = importantErrorMessages.length; j < len1; j++) {
      message = importantErrorMessages[j];
      if (-1 !== err.message.toLowerCase().indexOf(message.toLowerCase())) {
        alert = message;
        break;
      }
    }
    if (alert == null) {
      alert = err.message;
    }
    IPC.send("alert", {
      message: `An error occurred while generating a thumbnail. Please capture a screenshot of this popup and send it to Ivan. \n\n The source file: ${subpath} \n\n The error: ${alert}`
    });
    if (errCount === 3) {
      return IPC.send("alert", {
        message: "It seems like this is happening a lot, so we won't tell you about any more failures. To see them all, open the Debug Log."
      });
    }
  };
});

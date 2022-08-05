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
          tags: searchPrep(asset.tags.join(" ")),
          files: Array.unique(FileTree.flat(asset.files, "basename")).map(searchPrep),
          exts: Array.unique(FileTree.flat(asset.files, "ext")).map(searchPrep)
        };
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
      } catch (error) {
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
      } catch (error) {}
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
Take(["DOOM", "Ports", "DOMContentLoaded"], function(DOOM, Ports) {
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

// db/coffee/special-tags.coffee
Take(["Memory"], function(Memory) {
  var specialTags;
  specialTags = {"Archived": "Archived"};
  Memory.merge("tags", specialTags);
  return Memory("specialTags", specialTags);
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
      Log(asset.newShot, {
        background: "hsl(150, 60%, 60%)"
      });
      Log(prevNewShot, {
        background: "hsl(250, 100%, 80%)"
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
      } catch (error) {
        err = error;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQXdCO0FBQ3hCLElBQUEsQ0FBSyxDQUFDLFVBQUQsRUFBYSxPQUFiLEVBQXNCLE9BQXRCLEVBQStCLFFBQS9CLEVBQXlDLE1BQXpDLENBQUwsRUFBdUQsUUFBQSxDQUFDLFFBQUQsRUFBVyxLQUFYLEVBQWtCLEtBQWxCLEVBQXlCLE1BQXpCLEVBQWlDLElBQWpDLENBQUE7QUFFdkQsTUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTtFQUFFLEtBQUEsR0FBUSxRQUFBLENBQUMsQ0FBRCxDQUFBO3VCQUFNLENBQUMsQ0FBRSxDQUFGO0VBQVA7RUFDUixRQUFBLEdBQVcsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFNLENBQUEsSUFBSztFQUFYO0VBQ1gsVUFBQSxHQUFhLFFBQUEsQ0FBQyxLQUFELENBQUE7V0FBVSxDQUFDLEtBQUEsSUFBUyxFQUFWLENBQWEsQ0FBQyxXQUFkLENBQUEsQ0FBMkIsQ0FBQyxPQUE1QixDQUFvQyxVQUFwQyxFQUFnRCxHQUFoRDtFQUFWO1NBRWIsSUFBQSxDQUFLLE9BQUwsRUFBYyxLQUFBLEdBQ1o7SUFBQSxHQUFBLEVBQUssUUFBQSxDQUFDLElBQUQsQ0FBQTtBQUNULFVBQUEsS0FBQSxFQUFBO01BQU0sS0FBQSxHQUNFO1FBQUEsRUFBQSxFQUFJLEVBQUEsR0FBSyxJQUFJLENBQUMsSUFBTCxDQUFVLElBQVYsQ0FBVDtRQUNBLElBQUEsRUFBTSxFQUROO1FBRUEsSUFBQSxFQUFNLElBRk47UUFHQSxNQUFBLEVBQVEsS0FBSyxDQUFDLElBQU4sQ0FBVyxFQUFFLENBQUMsS0FBSCxDQUFTLEdBQVQsQ0FBWCxDQUhSO1FBSUEsT0FBQSxFQUFTLEVBQUUsQ0FBQyxLQUFILENBQVMsR0FBVCxDQUFhLGFBQVEsQ0FBQyxJQUF0QixDQUEyQixHQUEzQixDQUpUO1FBS0EsSUFBQSxFQUFNLE1BQU0sQ0FBQyxJQUFQLENBQVksRUFBWixDQUxOO1FBTUEsSUFBQSxFQUFNLElBTk47UUFPQSxPQUFBLEVBQVMsSUFQVDtRQVFBLElBQUEsRUFBTSxFQVJOO1FBU0EsS0FBQSxFQUFPLFFBQVEsQ0FBQyxRQUFULENBQWtCLElBQWxCLEVBQXdCLE9BQXhCLENBVFA7UUFVQSxVQUFBLEVBQVksQ0FBQSxDQVZaO1FBV0EsUUFBQSxFQUFVO01BWFY7TUFZRixLQUFLLENBQUMsTUFBTixHQUFlLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBWCxDQUFrQixLQUFsQjthQUNmO0lBZkcsQ0FBTDtJQWlCQSxTQUFBLEVBQVcsUUFBQSxDQUFDLFlBQUQsRUFBZSxLQUFmLENBQUEsRUFBQTs7O01BR1QsS0FBSyxDQUFDLElBQU4sR0FBYSxJQUFJLENBQUMsSUFBTCxDQUFVLFlBQVYsRUFBd0IsS0FBSyxDQUFDLEVBQTlCO01BQ2IsS0FBSyxDQUFDLE1BQU4sR0FBZSxLQUFLLENBQUMsSUFBTixDQUFXLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBVCxDQUFlLEdBQWYsQ0FBWDtNQUNmLEtBQUssQ0FBQyxPQUFOLEdBQWdCLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBVCxDQUFlLEdBQWYsQ0FBbUIsYUFBUSxDQUFDLElBQTVCLENBQWlDLEdBQWpDO01BQ2hCLEtBQUssQ0FBQyxJQUFOLEdBQWEsTUFBTSxDQUFDLElBQVAsQ0FBWSxLQUFLLENBQUMsRUFBbEIsRUFMbkI7Ozs7O01BVU0sS0FBSyxDQUFDLFVBQU4sR0FBbUIsQ0FBQSxFQVZ6Qjs7YUFZTTtJQWJTLENBakJYOzs7OztJQW9DQSxTQUFBLEVBQVcsUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUNUO1FBQUEsRUFBQSxFQUFJLEtBQUssQ0FBQyxFQUFWO1FBQ0EsSUFBQSxFQUFNLEtBQUssQ0FBQyxJQURaOzs7Ozs7UUFPQSxJQUFBLEVBQU0sS0FBSyxDQUFDLElBUFo7UUFRQSxLQUFBLEVBQ0U7VUFBQSxLQUFBLEVBQU8sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUFuQixDQVRGOztRQVdBLE1BQUEsRUFBUSxLQUFLLENBQUM7TUFYZDtJQURTLENBcENYO0lBa0RBLFVBQUEsRUFBWSxNQUFBLFFBQUEsQ0FBQyxLQUFELENBQUE7TUFDVixLQUFLLENBQUMsSUFBTixHQUFhLENBQUEsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVgsQ0FBZ0IsS0FBaEIsQ0FBTjtNQUNiLEtBQUssQ0FBQyxJQUFOLEdBQWEsQ0FBQSxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixLQUFoQixDQUFOO01BQ2IsS0FBSyxDQUFDLE9BQU4sR0FBZ0IsQ0FBQSxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBWCxDQUFtQixLQUFuQixDQUFOO01BQ2hCLEtBQUssQ0FBQyxJQUFOLEdBQWEsQ0FBQSxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixLQUFoQixDQUFOO01BQ2IsS0FBSyxDQUFDLEtBQU4sR0FBYyxDQUFBLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFYLENBQWlCLEtBQWpCLENBQU47TUFDZCxLQUFLLENBQUMsVUFBTixHQUFtQixDQUFBLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFYLENBQXNCLEtBQXRCLENBQU47TUFDbkIsS0FBSyxDQUFDLE1BQU4sR0FBZSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQVgsQ0FBa0IsS0FBbEI7YUFDZjtJQVJVLENBbERaO0lBNERBLElBQUEsRUFDRTtNQUFBLElBQUEsRUFBTSxNQUFBLFFBQUEsQ0FBQyxLQUFELENBQUE7QUFDWixZQUFBO1FBQVEsSUFBQSxHQUFPLENBQUEsTUFBTSxJQUFJLENBQUMsS0FBTCxDQUFXLEtBQUssQ0FBQyxLQUFOLENBQVksS0FBWixDQUFYLENBQTZCLENBQUMsSUFBOUIsQ0FBbUMsS0FBbkMsQ0FBTjtlQUNQLENBQUMsSUFBQSxJQUFRLEtBQUssQ0FBQyxFQUFmLENBQWtCLENBQUMsSUFBbkIsQ0FBQTtNQUZJLENBQU47TUFHQSxJQUFBLEVBQU0sUUFBQSxDQUFDLEtBQUQsQ0FBQTtlQUNKLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBSyxDQUFDLEtBQU4sQ0FBWSxLQUFaLENBQVgsQ0FBNkIsQ0FBQyxJQUE5QixDQUFtQyxLQUFuQztNQURJLENBSE47TUFLQSxPQUFBLEVBQVMsUUFBQSxDQUFDLEtBQUQsQ0FBQTtlQUNQLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBSyxDQUFDLFFBQU4sQ0FBZSxLQUFmLENBQVgsQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFzQyxLQUF0QztNQURPLENBTFQ7TUFPQSxJQUFBLEVBQU0sTUFBQSxRQUFBLENBQUMsS0FBRCxDQUFBO0FBQ1osWUFBQSxTQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQTtRQUFRLFNBQUEsR0FBWSxDQUFBLE1BQU0sSUFBSSxDQUFDLEtBQUwsQ0FBVyxLQUFLLENBQUMsSUFBTixDQUFXLEtBQVgsQ0FBWCxDQUE0QixDQUFDLElBQTdCLENBQWtDLFFBQWxDLENBQU47UUFDWixLQUFBLDJDQUFBOztVQUFBLE1BQUEsQ0FBTyxDQUFBLEtBQUEsQ0FBQSxDQUFRLEdBQVIsQ0FBQSxDQUFQLEVBQXNCLEdBQXRCO1FBQUE7ZUFDQTtNQUhJLENBUE47TUFXQSxLQUFBLEVBQU8sUUFBQSxDQUFDLEtBQUQsQ0FBQTtlQUNMLFFBQVEsQ0FBQyxZQUFULENBQXNCLEtBQUssQ0FBQyxJQUE1QixFQUFrQyxPQUFsQztNQURLLENBWFA7TUFhQSxVQUFBLEVBQVksTUFBQSxRQUFBLENBQUMsS0FBRCxDQUFBO0FBQ2xCLFlBQUE7UUFBUSxNQUFBLEdBQVMsQ0FBQSxNQUFNLElBQUksQ0FBQyxLQUFMLENBQVcsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsS0FBakIsQ0FBWCxDQUFtQyxDQUFDLElBQXBDLENBQXlDLFFBQXpDLENBQU47ZUFDVCxLQUFLLENBQUMsV0FBTixDQUFrQixNQUFsQixFQUEwQixRQUFBLENBQUMsS0FBRCxDQUFBO2lCQUFVLEtBQUssQ0FBQyxTQUFOLENBQWdCLEtBQWhCLEVBQXVCLEtBQXZCO1FBQVYsQ0FBMUI7TUFGVSxDQWJaO01BZ0JBLE1BQUEsRUFBUSxRQUFBLENBQUMsS0FBRCxDQUFBO2VBQ047VUFBQSxFQUFBLEVBQUksVUFBQSxDQUFXLEtBQUssQ0FBQyxFQUFqQixDQUFKO1VBQ0EsSUFBQSxFQUFNLFVBQUEsQ0FBVyxLQUFLLENBQUMsSUFBakIsQ0FETjtVQUVBLElBQUEsRUFBTSxVQUFBLENBQVcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFYLENBQWdCLEdBQWhCLENBQVgsQ0FGTjtVQUdBLEtBQUEsRUFBTyxLQUFLLENBQUMsTUFBTixDQUFhLFFBQVEsQ0FBQyxJQUFULENBQWMsS0FBSyxDQUFDLEtBQXBCLEVBQTJCLFVBQTNCLENBQWIsQ0FBb0QsQ0FBQyxHQUFyRCxDQUF5RCxVQUF6RCxDQUhQO1VBSUEsSUFBQSxFQUFNLEtBQUssQ0FBQyxNQUFOLENBQWEsUUFBUSxDQUFDLElBQVQsQ0FBYyxLQUFLLENBQUMsS0FBcEIsRUFBMkIsS0FBM0IsQ0FBYixDQUErQyxDQUFDLEdBQWhELENBQW9ELFVBQXBEO1FBSk47TUFETTtJQWhCUjtFQTdERixDQURGO0FBTnFELENBQXZELEVBRHdCOzs7QUErRnhCLElBQUEsQ0FBSyxDQUFDLE9BQUQsRUFBVSxTQUFWLEVBQXFCLEtBQXJCLEVBQTRCLFFBQTVCLEVBQXNDLE1BQXRDLENBQUwsRUFBb0QsUUFBQSxDQUFDLEtBQUQsRUFBUSxPQUFSLEVBQWlCLEdBQWpCLEVBQXNCLE1BQXRCLEVBQThCLElBQTlCLENBQUE7QUFFcEQsTUFBQSxVQUFBLEVBQUEsSUFBQSxFQUFBLFNBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQTs7O0VBRUUsT0FBQSxHQUFVO0VBQ1YsU0FBQSxHQUFZO0VBRVosT0FBQSxHQUFVLFFBQUEsQ0FBQSxDQUFBO0lBQ1IsT0FBQSxHQUFVO0lBQ1YsU0FBQSxHQUFZO0lBQ1osR0FBQSxDQUFJLHVCQUFKLEVBQTZCO01BQUEsVUFBQSxFQUFZLE1BQVo7TUFBb0IsS0FBQSxFQUFPO0lBQTNCLENBQTdCO1dBQ0EsVUFBQSxDQUFBO0VBSlE7RUFPVixJQUFJLENBQUMsS0FBTCxDQUFXLFlBQVgsRUFBeUIsVUFBQSxHQUFhLFFBQUEsQ0FBQSxDQUFBO0lBQ3BDLElBQUcsQ0FBSSxPQUFQO01BQ0UsT0FBQSxHQUFVO2FBQ1YscUJBQUEsQ0FBc0IsSUFBdEIsRUFGRjtLQUFBLE1BQUE7YUFJRSxTQUFBLEdBQVksS0FKZDs7RUFEb0MsQ0FBdEM7U0FRQSxJQUFBLEdBQU8sTUFBQSxRQUFBLENBQUEsQ0FBQTtBQUNULFFBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxPQUFBLEVBQUEsU0FBQSxFQUFBO0lBQUksR0FBQSxDQUFJLFlBQUo7SUFFQSxNQUFBLEdBQVMsQ0FBQTtJQUNULFlBQUEsR0FBZSxNQUFBLENBQU8sY0FBUCxFQUhuQjs7OztJQVFJLE1BQUEsQ0FBTyxXQUFQLEVBQW9CLElBQXBCLEVBUko7Ozs7SUFhSSxNQUFNLENBQUMsT0FBUCxDQUFlLFFBQWYsRUFBeUIsTUFBekI7SUFFQSxHQUFHLENBQUMsSUFBSixDQUFTLDRCQUFULEVBQXVDLFFBQUEsQ0FBQSxDQUFBO0FBQzNDLFVBQUEsS0FBQSxFQUFBLEVBQUEsRUFBQSxRQUFBOzs7O01BR00sTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSO01BRVQsUUFBQSxHQUFXO01BRVgsS0FBQSxZQUFBOztRQUNFLEtBQUssQ0FBQyxTQUFOLENBQWdCLFlBQWhCLEVBQThCLEtBQTlCO1FBQ0EsS0FBSyxDQUFDLFFBQU4sR0FBaUI7UUFDakIsUUFBQSxHQUFXO01BSGI7TUFLQSxJQUEyQixRQUEzQjtlQUFBLE1BQUEsQ0FBTyxRQUFQLEVBQWlCLE1BQWpCLEVBQUE7O0lBYnFDLENBQXZDLEVBZko7Ozs7O0lBbUNJLE9BQUEsR0FBVSxDQUFBLEVBbkNkOzs7SUFzQ0ksTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQVQsQ0FBZSx5QkFBZixFQUEwQyxRQUFBLEdBQVcsTUFBQSxRQUFBLENBQUEsQ0FBQTtBQUUvRCxVQUFBLEtBQUEsRUFBQSxlQUFBLEVBQUEsT0FBQSxFQUFBLFNBQUEsRUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsUUFBQSxFQUFBLENBQUEsRUFBQSxRQUFBLEVBQUE7TUFBTSxTQUFBLEdBQVksQ0FBQSxFQUFsQjtNQUNNLFFBQUEsR0FBVztNQUNYLFFBQUEsR0FBVztBQUVYO01BQUEsS0FBQSxxQ0FBQTtpQ0FBQTs7UUFHRSxLQUFBLEdBQVEsS0FBSyxDQUFDLEdBQU4sQ0FBVSxJQUFJLENBQUMsSUFBTCxDQUFVLFlBQVYsRUFBd0IsZUFBeEIsQ0FBVixFQURoQjs7UUFJUSxJQUFPLHdCQUFQO1VBQ0UsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFQLENBQVAsR0FBb0I7VUFDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFQLENBQU4sR0FBbUI7VUFDbkIsUUFBUSxDQUFDLElBQVQsQ0FBYyxLQUFLLENBQUMsVUFBTixDQUFpQixLQUFqQixDQUFkO1VBQ0EsUUFBQSxHQUFXLEtBSmI7U0FKUjs7UUFXUSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQVAsQ0FBVCxHQUFzQjtNQWJ4QjtNQWVBLEtBQUEsNENBQUE7O1FBQ0UsTUFBTTtNQURSLENBbkJOOztNQXVCTSxLQUFBLGlCQUFBO2NBQTJCLENBQUksU0FBUyxDQUFDLE9BQUQ7OztRQUN0QyxPQUFPLE1BQU0sQ0FBQyxPQUFEO1FBQ2IsUUFBQSxHQUFXO01BRmI7TUFJQSxJQUEyQixRQUEzQjtlQUFBLE1BQUEsQ0FBTyxRQUFQLEVBQWlCLE1BQWpCLEVBQUE7O0lBN0J5RCxDQUFyRDtJQStCTixJQUFvQixTQUFwQjtBQUFBLGFBQU8sT0FBQSxDQUFBLEVBQVA7S0FyRUo7Ozs7SUEwRUksTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQVQsQ0FBZSwwQkFBZixFQUEyQyxTQUFBLEdBQVksTUFBQSxRQUFBLENBQUEsQ0FBQTtBQUVqRSxVQUFBLEtBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQSxFQUFBLEdBQUEsRUFBQSxRQUFBLEVBQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQTtNQUFNLFFBQUEsR0FBVztNQUVYLFFBQUE7O0FBQVc7UUFBQSxLQUFBLFlBQUE7O1VBSVQsSUFBWSxtQkFBWjs7O0FBQUEscUJBQUE7O1VBRUEsUUFBQSxHQUFXO3VCQUNYLE9BQUEsR0FBVSxLQUFLLENBQUMsVUFBTixDQUFpQixLQUFqQjtRQVBELENBQUE7OztNQVNYLEtBQUEsMENBQUE7O1FBQ0UsS0FBQSxHQUFRLENBQUEsTUFBTSxDQUFOO1FBQ1IsS0FBSyxDQUFDLFFBQU4sR0FBaUI7TUFGbkI7TUF5QkEsSUFBMkIsUUFBM0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztlQUFBLE1BQUEsQ0FBTyxRQUFQLEVBQWlCLE1BQWpCLEVBQUE7O0lBdEMyRCxDQUF2RDtJQXdDTixJQUFvQixTQUFwQjtBQUFBLGFBQU8sT0FBQSxDQUFBLEVBQVA7S0FsSEo7O0lBcUhJLEdBQUcsQ0FBQyxJQUFKLENBQVMsOEJBQVQsRUFBeUMsUUFBQSxDQUFBLENBQUE7YUFDdkMsT0FBQSxDQUFRLFFBQVIsRUFBa0IsTUFBTSxDQUFDLFNBQVAsQ0FBaUIsTUFBakIsRUFBeUIsS0FBSyxDQUFDLFNBQS9CLENBQWxCO0lBRHVDLENBQXpDO0lBSUEsSUFBb0IsU0FBcEI7O0FBQUEsYUFBTyxPQUFBLENBQUEsRUFBUDs7SUFDQSxPQUFBLEdBQVU7V0FDVixNQUFBLENBQU8sV0FBUCxFQUFvQixLQUFwQjtFQTVISztBQXRCMkMsQ0FBcEQsRUEvRndCOzs7Ozs7QUEwUHhCLElBQUEsQ0FBSyxDQUFDLE1BQUQsRUFBUyxLQUFULEVBQWdCLEtBQWhCLEVBQXVCLFFBQXZCLEVBQWlDLE1BQWpDLEVBQXlDLE9BQXpDLENBQUwsRUFBd0QsUUFBQSxDQUFDLElBQUQsRUFBTyxHQUFQLEVBQVksR0FBWixFQUFpQixNQUFqQixFQUF5QixJQUF6QixFQUErQixLQUEvQixDQUFBO0FBRXhELE1BQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxJQUFBLEVBQUEsZ0JBQUEsRUFBQSxhQUFBOztFQUNFLFVBQUEsR0FDRTtJQUFBLGtCQUFBLEVBQW9CLEdBQXBCO0lBQ0Esb0JBQUEsRUFBc0IsQ0FEdEI7SUFFQSxVQUFBLEVBQVksR0FBRyxDQUFDLGlCQUZoQjtJQUdBLFNBQUEsRUFBVyxHQUFHLENBQUMsWUFIZjtJQUlBLFNBQUEsRUFBVztFQUpYO0VBTUYsV0FBQSxHQUFjLFFBQUEsQ0FBQyxJQUFELENBQUE7QUFDaEIsUUFBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQTtBQUFJO0lBQUEsS0FBQSxTQUFBOztNQUNFLE1BQUEsR0FBUyxNQUFNLENBQUMsT0FBUCxDQUFlLENBQWYsRUFBa0IsQ0FBbEI7TUFDVCxJQUFHLENBQUksTUFBUDtRQUFtQixHQUFHLENBQUMsR0FBSixDQUFRLENBQUEsT0FBQSxDQUFBLENBQVUsQ0FBVixDQUFBLGtEQUFBLENBQVIsRUFBbkI7O21CQUNBLFVBQVUsQ0FBQyxDQUFELENBQVYsR0FBZ0I7SUFIbEIsQ0FBQTs7RUFEWTtFQU1kLGdCQUFBLEdBQW1CLFFBQUEsQ0FBQSxDQUFBO0FBQ3JCLFFBQUEsQ0FBQSxFQUFBO0FBQUk7SUFBQSxLQUFBLGVBQUE7bUJBQ0UsTUFBTSxDQUFDLFNBQVAsQ0FBaUIsQ0FBakIsRUFBb0IsS0FBcEIsRUFBMkIsYUFBQSxDQUFjLENBQWQsQ0FBM0I7SUFERixDQUFBOztFQURpQjtFQUluQixhQUFBLEdBQWdCLFFBQUEsQ0FBQyxDQUFELENBQUE7V0FBTSxRQUFBLENBQUMsQ0FBRCxDQUFBO01BQ3BCLElBQUcsVUFBVSxDQUFDLENBQUQsQ0FBVixLQUFtQixDQUF0QjtRQUNFLFVBQVUsQ0FBQyxDQUFELENBQVYsR0FBZ0I7ZUFDaEIsSUFBQSxDQUFBLEVBRkY7O0lBRG9CO0VBQU47RUFLaEIsSUFBQSxHQUFPLElBQUEsQ0FBSyxDQUFMLEVBQVEsSUFBUixFQUFjLFFBQUEsQ0FBQSxDQUFBO1dBQ25CLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixHQUFHLENBQUMsVUFBcEIsRUFBZ0MsVUFBaEMsRUFBNEM7TUFBQSxLQUFBLEVBQU87SUFBUCxDQUE1QztFQURtQixDQUFkO1NBR1AsSUFBQSxDQUFLLFFBQUwsRUFBZSxRQUFBLENBQUEsQ0FBQTtXQUFLLEdBQUcsQ0FBQyxJQUFKLENBQVMsZ0JBQVQsRUFBMkIsUUFBQSxDQUFBLENBQUE7QUFFakQsVUFBQSxVQUFBLEVBQUE7TUFBSSxVQUFBLEdBQWEsSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFHLENBQUMsVUFBZDtNQUViLElBQU8sa0JBQVA7UUFDRSxXQUFBLENBQVksVUFBWixFQUFOO1FBQ00sZ0JBQUEsQ0FBQTtBQUNBLGVBQU8sTUFIVDs7QUFLQTtRQUNFLFVBQUEsR0FBYSxJQUFJLENBQUMsS0FBTCxDQUFXLFVBQVg7UUFDYixXQUFBLENBQVksVUFBWjtRQUNBLGdCQUFBLENBQUEsRUFGTjs7QUFJTSxlQUFPLE9BQUEsQ0FBUSxVQUFVLENBQUMsU0FBbkIsRUFMVDtPQU9BLGFBQUE7QUFDRSxlQUFPLEtBRFQ7O0lBaEI2QyxDQUEzQjtFQUFMLENBQWY7QUE1QnNELENBQXhELEVBMVB3Qjs7Ozs7OztBQWdUeEIsSUFBQSxDQUFLLENBQUMsTUFBRCxFQUFTLEtBQVQsRUFBZ0IsS0FBaEIsRUFBdUIsTUFBdkIsRUFBK0IsT0FBL0IsQ0FBTCxFQUE4QyxRQUFBLENBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxHQUFaLEVBQWlCLElBQWpCLEVBQXVCLEtBQXZCLENBQUE7QUFFOUMsTUFBQSxPQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUE7O0VBQ0UsS0FBQSxHQUNFO0lBQUEsTUFBQSxFQUFRLENBQUE7RUFBUjtFQUVGLElBQUEsR0FBTyxJQUFBLENBQUssRUFBTCxFQUFTLElBQVQsRUFBZSxRQUFBLENBQUEsQ0FBQTtXQUNwQixHQUFHLENBQUMsSUFBSixDQUFTLGdCQUFULEVBQTJCLFFBQUEsQ0FBQSxDQUFBLEVBQUE7O2FBRXpCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixHQUFHLENBQUMsV0FBcEIsRUFBaUMsS0FBakMsRUFBd0M7UUFBQSxLQUFBLEVBQU87TUFBUCxDQUF4QztJQUZ5QixDQUEzQjtFQURvQixDQUFmO0VBS1AsSUFBSSxDQUFDLEtBQUwsQ0FBVyxTQUFYLEVBQXNCLE9BQUEsR0FBVSxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQTtJQUM5QixJQUErQyxnQkFBL0M7TUFBQSxNQUFNLEtBQUEsQ0FBTSxDQUFBLHFCQUFBLENBQUEsQ0FBd0IsQ0FBeEIsQ0FBQSxDQUFOLEVBQU47O0lBQ0EsSUFBRyxDQUFBLEtBQU8sTUFBVjtNQUNFLElBQUcsU0FBSDtRQUFXLEtBQUssQ0FBQyxDQUFELENBQUwsR0FBVyxFQUF0QjtPQUFBLE1BQUE7UUFBNkIsT0FBTyxLQUFLLENBQUMsQ0FBRCxFQUF6Qzs7TUFDQSxJQUFBLENBQUEsRUFGRjs7V0FHQSxLQUFLLENBQUMsQ0FBRDtFQUx5QixDQUFoQztTQU9BLE9BQU8sQ0FBQyxJQUFSLEdBQWUsUUFBQSxDQUFBLENBQUE7V0FBSyxHQUFHLENBQUMsSUFBSixDQUFTLGlCQUFULEVBQTRCLFFBQUEsQ0FBQSxDQUFBO0FBQ2xELFVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUFBLEVBQUEsT0FBQSxFQUFBO0FBQUk7UUFDRSxJQUFBLEdBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxHQUFHLENBQUMsV0FBZDtRQUNQLElBQUEsR0FBTyxJQUFJLENBQUMsS0FBTCxDQUFXLElBQVg7QUFDUDtRQUFBLEtBQUEsU0FBQTtzQkFBQTs7O1VBR0UsSUFBRyxnQkFBSDt5QkFDRSxLQUFLLENBQUMsQ0FBRCxDQUFMLEdBQVcsR0FEYjtXQUFBLE1BQUE7aUNBQUE7O1FBSEYsQ0FBQTt1QkFIRjtPQUFBO0lBRDhDLENBQTVCO0VBQUw7QUFsQjZCLENBQTlDLEVBaFR3Qjs7O0FBK1V4QixJQUFBLENBQUssQ0FBQyxLQUFELEVBQVEsS0FBUixDQUFMLEVBQXFCLFFBQUEsQ0FBQyxHQUFELEVBQU0sR0FBTixDQUFBO0FBRXJCLE1BQUEsS0FBQSxFQUFBLFNBQUEsRUFBQTtFQUFFLEtBQUEsR0FBUSxDQUFBO0VBQ1IsU0FBQSxHQUFZLENBQUE7RUFFWixHQUFHLENBQUMsRUFBSixDQUFPLE1BQVAsRUFBZSxRQUFBLENBQUMsQ0FBRCxFQUFJLENBQUMsRUFBRCxDQUFKLENBQUE7QUFDakIsUUFBQTtJQUFJLElBQUEsR0FBTyxLQUFLLENBQUMsRUFBRCxDQUFMLEdBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFEO1dBQzFCLElBQUksQ0FBQyxTQUFMLEdBQWlCLE1BQUEsUUFBQSxDQUFDO1FBQUMsSUFBQSxFQUFNLENBQUMsU0FBRCxFQUFZLEdBQVosRUFBaUIsR0FBRyxJQUFwQjtNQUFQLENBQUQsQ0FBQTtBQUNyQixVQUFBLEVBQUEsRUFBQTtNQUFNLElBQUcsRUFBQSxHQUFLLFNBQVMsQ0FBQyxHQUFELENBQWpCO1FBQ0UsQ0FBQSxHQUFJLENBQUEsTUFBTSxFQUFBLENBQUcsR0FBRyxJQUFOLENBQU47ZUFDSixJQUFJLENBQUMsV0FBTCxDQUFpQixDQUFDLFFBQUQsRUFBVyxTQUFYLEVBQXNCLENBQXRCLENBQWpCLEVBRkY7T0FBQSxNQUFBO2VBSUUsR0FBRyxDQUFDLEdBQUosQ0FBUSxDQUFBLHlCQUFBLENBQUEsQ0FBNEIsR0FBNUIsQ0FBQSxDQUFSLEVBSkY7O0lBRGU7RUFGSixDQUFmLEVBSEY7OztFQWNFLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixRQUFBLENBQUMsQ0FBRCxFQUFJLEdBQUosRUFBQSxHQUFZLElBQVosQ0FBQTtBQUNyQixRQUFBO0lBQUksSUFBRyxFQUFBLEdBQUssU0FBUyxDQUFDLEdBQUQsQ0FBakI7YUFDRSxFQUFBLENBQUcsR0FBRyxJQUFOLEVBREY7S0FBQSxNQUFBOzthQUlFLEdBQUcsQ0FBQyxHQUFKLENBQVEsQ0FBQSw2QkFBQSxDQUFBLENBQWdDLEdBQWhDLENBQUEsQ0FBUixFQUpGOztFQURpQixDQUFuQjtTQU9BLElBQUEsQ0FBSyxPQUFMLEVBQWMsS0FBQSxHQUNaO0lBQUEsRUFBQSxFQUFJLFFBQUEsQ0FBQyxHQUFELEVBQU0sRUFBTixDQUFBO01BQ0YsSUFBRyxzQkFBSDtRQUF3QixNQUFNLEtBQUEsQ0FBTSxDQUFBLGdCQUFBLENBQUEsQ0FBbUIsR0FBbkIsQ0FBQSx1QkFBQSxDQUFOLEVBQTlCOzthQUNBLFNBQVMsQ0FBQyxHQUFELENBQVQsR0FBaUI7SUFGZixDQUFKO0lBSUEsSUFBQSxFQUFNLFFBQUEsQ0FBQyxHQUFELEVBQUEsR0FBUyxJQUFULENBQUE7QUFDVixVQUFBLEVBQUEsRUFBQTtNQUFNLEtBQUEsV0FBQTs7UUFDRSxJQUFJLENBQUMsV0FBTCxDQUFpQixDQUFDLEdBQUQsRUFBTSxHQUFHLElBQVQsQ0FBakI7TUFERjthQUVBO0lBSEk7RUFKTixDQURGO0FBdkJtQixDQUFyQixFQS9Vd0I7Ozs7Ozs7QUF1WHhCLElBQUEsQ0FBSyxDQUFDLE1BQUQsRUFBUyxPQUFULEVBQWtCLGtCQUFsQixDQUFMLEVBQTRDLFFBQUEsQ0FBQyxJQUFELEVBQU8sS0FBUCxDQUFBO0FBRTVDLE1BQUEsT0FBQSxFQUFBLFdBQUEsRUFBQTtFQUFFLFdBQUEsR0FBYztFQUNkLE9BQUEsR0FBVSxRQUFRLENBQUMsYUFBVCxDQUF1QixhQUF2QjtFQUVWLE9BQUEsR0FBVSxRQUFBLENBQUMsR0FBRCxFQUFNLEtBQU4sRUFBYSxJQUFiLENBQUE7QUFDWixRQUFBO0lBQUksSUFBQSxHQUFPLENBQUMsSUFBQSxJQUFRLFdBQVcsQ0FBQyxHQUFaLENBQUEsQ0FBVCxDQUEyQixDQUFDLE9BQTVCLENBQW9DLENBQXBDLENBQXNDLENBQUMsUUFBdkMsQ0FBZ0QsQ0FBaEQ7SUFDUCxPQUFPLENBQUMsR0FBUixDQUFZLElBQVosRUFBa0IsR0FBbEI7SUFFQSxHQUFBLEdBQU0sSUFBSSxDQUFDLE1BQUwsQ0FBWSxLQUFaLEVBQW1CLElBQW5CLEVBQXlCO01BQUEsV0FBQSxFQUFhLENBQUMsSUFBQSxHQUFLLElBQU4sQ0FBVyxDQUFDLE9BQVosQ0FBb0IsQ0FBcEIsQ0FBQSxHQUF5QixJQUF6QixHQUFnQztJQUE3QyxDQUF6QjtJQUNOLElBQW1CLGFBQW5CO01BQUEsSUFBQSxDQUFLLEdBQUwsRUFBVSxLQUFWLEVBQUE7O0lBQ0EsSUFBSSxDQUFDLE9BQUwsQ0FBYSxPQUFiLEVBQXNCLEdBQXRCO0FBRUEsV0FBTSxPQUFPLENBQUMsaUJBQVIsR0FBNEIsV0FBbEM7TUFDRSxJQUFJLENBQUMsTUFBTCxDQUFZLE9BQU8sQ0FBQyxTQUFwQjtJQURGO0FBR0EsV0FBTztFQVhDO0VBYVYsS0FBSyxDQUFDLEVBQU4sQ0FBUyxTQUFULEVBQW9CLE9BQXBCO1NBQ0EsSUFBQSxDQUFLLFNBQUwsRUFBZ0IsT0FBaEI7QUFuQjBDLENBQTVDLEVBdlh3Qjs7O0FBK1l4QixJQUFBLENBQUssQ0FBQyxRQUFELENBQUwsRUFBaUIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUVqQixNQUFBO0VBQUUsV0FBQSxHQUFjLENBQ1osWUFBQSxVQURZO0VBSWQsTUFBTSxDQUFDLEtBQVAsQ0FBYSxNQUFiLEVBQXFCLFdBQXJCO1NBQ0EsTUFBQSxDQUFPLGFBQVAsRUFBc0IsV0FBdEI7QUFQZSxDQUFqQixFQS9Zd0I7OztBQTJaeEIsSUFBQSxDQUFLLENBQUMsUUFBRCxFQUFXLFNBQVgsRUFBc0IsS0FBdEIsRUFBNkIsS0FBN0IsQ0FBTCxFQUEwQyxRQUFBLENBQUMsTUFBRCxFQUFTLE9BQVQsRUFBa0IsR0FBbEIsRUFBdUIsR0FBdkIsQ0FBQTtBQUUxQyxNQUFBLE1BQUE7O0VBQ0UsR0FBRyxDQUFDLElBQUosQ0FBUyxTQUFULEVBREY7O0VBSUUsT0FBTyxDQUFDLElBQVIsQ0FBQSxFQUpGOztFQU9FLE1BQUEsR0FBUyxNQUFBLENBQUEsRUFQWDs7O0FBV0UsVUFBTyxNQUFQO0FBQUEsU0FDTyxJQURQO2FBRUksR0FBRyxDQUFDLElBQUosQ0FBUyxHQUFBLENBQUksY0FBSixDQUFULEVBRko7QUFBQSxTQUdPLEtBSFA7YUFJSSxHQUFHLENBQUMsSUFBSixDQUFTLEdBQUEsQ0FBSSxzQkFBSixDQUFULEVBSko7QUFBQTthQU1JLEdBQUcsQ0FBQyxJQUFKLENBQVMsT0FBVCxFQUFrQiw4SUFBbEI7QUFOSjtBQWJ3QyxDQUExQyxFQTNad0I7Ozs7Ozs7Ozs7QUEwYnhCLElBQUEsQ0FBSyxDQUFDLE9BQUQsRUFBVSxVQUFWLEVBQXNCLEtBQXRCLEVBQTZCLEtBQTdCLEVBQW9DLEtBQXBDLEVBQTJDLFFBQTNDLEVBQXFELE9BQXJELEVBQThELE9BQTlELEVBQXVFLE1BQXZFLEVBQStFLE9BQS9FLENBQUwsRUFBOEYsUUFBQSxDQUFDLEtBQUQsRUFBUSxRQUFSLEVBQWtCLEdBQWxCLEVBQXVCLEdBQXZCLEVBQTRCLEdBQTVCLEVBQWlDLE1BQWpDLEVBQXlDLEtBQXpDLEVBQWdELEtBQWhELEVBQXVELElBQXZELEVBQTZELEtBQTdELENBQUE7RUFFNUYsS0FBSyxDQUFDLEVBQU4sQ0FBUyxXQUFULEVBQXNCLFFBQUEsQ0FBQSxDQUFBO0FBQ3hCLFFBQUEsWUFBQSxFQUFBLE9BQUEsRUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBO0lBQUksWUFBQSxHQUFlLE1BQUEsQ0FBTyxjQUFQO0lBQ2YsTUFBQSxHQUFTLE1BQUEsQ0FBTyxpQkFBUDtJQUNULE9BQUEsR0FBVSxNQUFBLENBQU8sV0FBUDtJQUNWLEVBQUEsR0FBSyxPQUFBLEdBQVUsR0FBVixHQUFnQjtJQUNyQixJQUFBLEdBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLEVBQXhCO0lBQ1AsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsRUFBVixDQUFBLENBQVAsRUFBdUIsS0FBSyxDQUFDLEdBQU4sQ0FBVSxJQUFWLENBQXZCLEVBTEo7SUFNSSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsSUFBakIsRUFOSjtJQU9JLEdBQUcsQ0FBQyxJQUFKLENBQVMsWUFBVCxFQUF1QixFQUF2QjtBQUNBLFdBQU87RUFUYSxDQUF0QjtFQVdBLEtBQUssQ0FBQyxFQUFOLENBQVMsY0FBVCxFQUF5QixRQUFBLENBQUMsT0FBRCxDQUFBO0FBQzNCLFFBQUE7SUFBSSxLQUFjLENBQUEsS0FBQSxHQUFRLE1BQUEsQ0FBTyxDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxDQUFQLENBQVIsQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQVAsRUFBNEIsSUFBNUIsRUFESjtXQUVJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBWCxDQUFjLEtBQUssQ0FBQyxJQUFwQixFQUh1QjtFQUFBLENBQXpCO0VBS0EsS0FBSyxDQUFDLEVBQU4sQ0FBUyxjQUFULEVBQXlCLFFBQUEsQ0FBQyxPQUFELEVBQVUsQ0FBVixDQUFBO0FBQzNCLFFBQUE7SUFBSSxLQUFjLENBQUEsS0FBQSxHQUFRLE1BQUEsQ0FBTyxDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxDQUFQLENBQVIsQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLEtBQUEsQ0FBUCxFQUFpQyxDQUFqQyxFQURKO1dBRUksS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFYLENBQWlCLEtBQUssQ0FBQyxLQUFOLENBQVksS0FBWixDQUFqQixFQUFxQyxDQUFDLENBQUQsQ0FBckMsRUFIdUI7RUFBQSxDQUF6QjtFQUtBLEtBQUssQ0FBQyxFQUFOLENBQVMsU0FBVCxFQUFvQixRQUFBLENBQUMsT0FBRCxFQUFVLEdBQVYsQ0FBQTtBQUN0QixRQUFBO0lBQUksS0FBYyxDQUFBLEtBQUEsR0FBUSxNQUFBLENBQU8sQ0FBQSxPQUFBLENBQUEsQ0FBVSxPQUFWLENBQUEsQ0FBUCxDQUFSLENBQWQ7QUFBQSxhQUFBOztJQUNBLE1BQU0sQ0FBQyxNQUFQLENBQWMsQ0FBQSxPQUFBLENBQUEsQ0FBVSxPQUFWLENBQUEsS0FBQSxDQUFkLEVBQXdDLFFBQUEsQ0FBQyxJQUFELENBQUEsRUFBQTthQUN0QyxLQUFLLENBQUMsY0FBTixDQUFxQixJQUFJLENBQUMsTUFBTCxDQUFZLEdBQVosQ0FBckI7SUFEc0MsQ0FBeEM7V0FFQSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsS0FBSyxDQUFDLEdBQU4sQ0FBVSxLQUFWLEVBQWlCLEdBQWpCLENBQWpCLEVBSmtCO0VBQUEsQ0FBcEI7RUFNQSxLQUFLLENBQUMsRUFBTixDQUFTLFlBQVQsRUFBdUIsUUFBQSxDQUFDLE9BQUQsRUFBVSxHQUFWLENBQUE7QUFDekIsUUFBQTtJQUFJLEtBQWMsQ0FBQSxLQUFBLEdBQVEsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQVAsQ0FBUixDQUFkO0FBQUEsYUFBQTs7SUFDQSxNQUFNLENBQUMsTUFBUCxDQUFjLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLEtBQUEsQ0FBZCxFQUF3QyxRQUFBLENBQUMsSUFBRCxDQUFBLEVBQUE7YUFDdEMsS0FBSyxDQUFDLElBQU4sQ0FBVyxJQUFYLEVBQWlCLEdBQWpCO0lBRHNDLENBQXhDO1dBRUEsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFYLENBQWMsS0FBSyxDQUFDLEdBQU4sQ0FBVSxLQUFWLEVBQWlCLEdBQWpCLENBQWQsRUFKcUI7RUFBQSxDQUF2QjtFQU1BLEtBQUssQ0FBQyxFQUFOLENBQVMsV0FBVCxFQUFzQixRQUFBLENBQUMsT0FBRCxFQUFVLFFBQVYsQ0FBQTtBQUN4QixRQUFBLEtBQUEsRUFBQSxjQUFBLEVBQUEsSUFBQSxFQUFBLENBQUEsRUFBQTtJQUFJLEtBQWMsQ0FBQSxLQUFBLEdBQVEsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQVAsQ0FBUixDQUFkO0FBQUEsYUFBQTs7SUFDQSxjQUFBLEdBQWlCLEtBQUssQ0FBQyxLQUFOLENBQVksS0FBWjtJQUNqQixLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsY0FBakI7SUFDQSxLQUFBLDBDQUFBOztNQUNFLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBWixDQUFxQixJQUFyQixFQUEyQixjQUEzQjtJQURGO1dBRUE7RUFOb0IsQ0FBdEI7RUFRQSxLQUFLLENBQUMsRUFBTixDQUFTLGFBQVQsRUFBd0IsUUFBQSxDQUFDLE9BQUQsRUFBVSxPQUFWLENBQUE7QUFDMUIsUUFBQSxLQUFBLEVBQUE7SUFBSSxLQUFjLENBQUEsS0FBQSxHQUFRLE1BQUEsQ0FBTyxDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxDQUFQLENBQVIsQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsS0FBYyxDQUFBLElBQUEsR0FBTyxRQUFRLENBQUMsSUFBVCxDQUFjLEtBQUssQ0FBQyxLQUFwQixFQUEyQixTQUEzQixFQUFzQyxPQUF0QyxDQUFQLENBQWQ7QUFBQSxhQUFBO0tBREo7O1dBR0ksS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFYLENBQWMsSUFBSSxDQUFDLElBQW5CLEVBSnNCO0VBQUEsQ0FBeEI7RUFNQSxLQUFLLENBQUMsRUFBTixDQUFTLGFBQVQsRUFBd0IsUUFBQSxDQUFDLE9BQUQsRUFBVSxPQUFWLEVBQW1CLENBQW5CLENBQUE7QUFDMUIsUUFBQSxLQUFBLEVBQUE7SUFBSSxLQUFjLENBQUEsS0FBQSxHQUFRLE1BQUEsQ0FBTyxDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxDQUFQLENBQVIsQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsS0FBYyxDQUFBLElBQUEsR0FBTyxRQUFRLENBQUMsSUFBVCxDQUFjLEtBQUssQ0FBQyxLQUFwQixFQUEyQixTQUEzQixFQUFzQyxPQUF0QyxDQUFQLENBQWQ7QUFBQSxhQUFBO0tBREo7O1dBR0ksS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFYLENBQWtCLElBQUksQ0FBQyxJQUF2QixFQUE2QixDQUE3QixFQUpzQjtFQUFBLENBQXhCO0VBTUEsS0FBSyxDQUFDLEVBQU4sQ0FBUyxlQUFULEVBQTBCLFFBQUEsQ0FBQyxPQUFELEVBQVUsT0FBVixDQUFBO0FBQzVCLFFBQUEsS0FBQSxFQUFBLElBQUEsRUFBQTtJQUFJLEtBQWMsQ0FBQSxLQUFBLEdBQVEsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQVAsQ0FBUixDQUFkO0FBQUEsYUFBQTs7SUFDQSxLQUFjLENBQUEsSUFBQSxHQUFPLFFBQVEsQ0FBQyxJQUFULENBQWMsS0FBSyxDQUFDLEtBQXBCLEVBQTJCLFNBQTNCLEVBQXNDLE9BQXRDLENBQVAsQ0FBZDtBQUFBLGFBQUE7O0lBQ0EsSUFBVSxJQUFJLENBQUMsSUFBTCxLQUFhLEtBQUssQ0FBQyxPQUE3QjtBQUFBLGFBQUE7S0FGSjs7O0lBS0ksY0FBQSxHQUFpQixLQUFLLENBQUMsUUFBTixDQUFlLEtBQWY7SUFDakIsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFYLENBQWMsY0FBZDtJQUNBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBWCxDQUFpQixjQUFqQjtXQUNBLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBWCxDQUFvQixJQUFJLENBQUMsSUFBekIsRUFBK0IsSUFBSSxDQUFDLElBQUwsQ0FBVSxjQUFWLEVBQTBCLElBQUksQ0FBQyxJQUFMLENBQVUsSUFBSSxDQUFDLElBQWYsQ0FBMUIsQ0FBL0I7RUFUd0IsQ0FBMUI7U0FXQSxLQUFLLENBQUMsRUFBTixDQUFTLG1CQUFULEVBQThCLFFBQUEsQ0FBQyxPQUFELENBQUE7QUFDaEMsUUFBQTtJQUFJLEtBQWMsQ0FBQSxLQUFBLEdBQVEsTUFBQSxDQUFPLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQVAsQ0FBUixDQUFkO0FBQUEsYUFBQTs7V0FDQSxHQUFBLENBQUksQ0FBSixFQUFPLHlCQUFQLEVBQWtDLEtBQWxDLEVBQXlDLElBQXpDO0VBRjRCLENBQTlCO0FBbEU0RixDQUE5RixFQTFid0I7OztBQW1nQnhCLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxRQUFSLEVBQWtCLE9BQWxCLEVBQTJCLFdBQTNCLENBQUwsRUFBOEMsUUFBQSxDQUFDLEdBQUQsRUFBTSxNQUFOLEVBQWMsS0FBZCxFQUFxQixTQUFyQixDQUFBO1NBRTVDLEtBQUssQ0FBQyxFQUFOLENBQVMsdUJBQVQsRUFBa0MsUUFBQSxDQUFDLE9BQUQsRUFBVSxJQUFWLEVBQWdCLElBQWhCLEVBQXNCLFFBQXRCLENBQUE7QUFDcEMsUUFBQTtJQUFJLElBQUcsS0FBQSxHQUFRLE1BQUEsQ0FBTyxDQUFBLE9BQUEsQ0FBQSxDQUFVLE9BQVYsQ0FBQSxDQUFQLENBQVg7YUFDRSxTQUFBLENBQVUsS0FBVixFQUFpQixJQUFqQixFQUF1QixJQUF2QixFQUE2QixRQUE3QixFQURGOztFQURnQyxDQUFsQztBQUY0QyxDQUE5QyxFQW5nQndCOzs7QUE0Z0J4QixJQUFBLENBQUssQ0FBQyxZQUFELEVBQWUsS0FBZixFQUFzQixRQUF0QixFQUFnQyxNQUFoQyxFQUF3QyxPQUF4QyxDQUFMLEVBQXVELFFBQUEsQ0FBQyxVQUFELEVBQWEsR0FBYixFQUFrQixNQUFsQixFQUEwQixJQUExQixFQUFnQyxLQUFoQyxDQUFBO1NBRXJELE1BQU0sQ0FBQyxTQUFQLENBQWlCLFlBQWpCLEVBQStCLElBQS9CLEVBQXFDLFFBQUEsQ0FBQyxVQUFELENBQUE7QUFDdkMsUUFBQTtJQUFJLElBQWMsa0JBQWQ7QUFBQSxhQUFBOztJQUNBLFlBQUEsR0FBZSxJQUFJLENBQUMsSUFBTCxDQUFVLFVBQVYsRUFBc0IsUUFBdEI7SUFDZixJQUFHLE1BQU0sQ0FBQyxNQUFQLENBQWMsY0FBZCxFQUE4QixZQUE5QixDQUFIO01BQ0UsR0FBQSxDQUFJLENBQUEsY0FBQSxDQUFBLENBQWlCLFlBQWpCLENBQUEsQ0FBSjtNQUNBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBWCxDQUFpQixZQUFqQjthQUNBLFVBQUEsQ0FBQSxFQUhGOztFQUhtQyxDQUFyQztBQUZxRCxDQUF2RCxFQTVnQndCOzs7QUF5aEJ4QixJQUFBLENBQUssQ0FBQyxRQUFELENBQUwsRUFBaUIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUVqQixNQUFBO0VBQUUsTUFBQSxHQUFTLFFBQUEsQ0FBQSxDQUFBO0FBQ1gsUUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7SUFBSSxNQUFBLEdBQVMsTUFBQSxDQUFPLFFBQVA7SUFDVCxTQUFBLEdBQVksTUFBQSxDQUFPLFdBQVA7SUFFWixNQUFjLG1CQUFBLElBQWUsaUJBQTdCO0FBQUEsYUFBQTs7SUFFQSxhQUFBLEdBQWdCO0lBRWhCLEtBQUEsaUJBQUE7O01BQ0UsSUFBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQWQsQ0FBQSxDQUFBLEtBQStCLFNBQVMsQ0FBQyxXQUFWLENBQUEsQ0FBbEM7UUFDRSxhQUFBLEdBQWdCLElBQUksQ0FBQyxHQUFMLENBQVMsYUFBVCxFQUF3QixLQUFLLENBQUMsTUFBOUIsRUFEbEI7O0lBREY7SUFJQSxNQUFBLENBQU8saUJBQVAsRUFBMEIsYUFBQSxHQUFnQixDQUExQztXQUVBO0VBZE87RUFnQlQsTUFBTSxDQUFDLFNBQVAsQ0FBaUIsV0FBakIsRUFBOEIsSUFBOUIsRUFBb0MsTUFBcEM7RUFDQSxNQUFNLENBQUMsU0FBUCxDQUFpQixRQUFqQixFQUEyQixJQUEzQixFQUFpQyxNQUFqQztTQUNBLE1BQUEsQ0FBQTtBQXBCZSxDQUFqQixFQXpoQndCOzs7QUFrakJ4QixJQUFBLENBQUssQ0FBQyxPQUFELEVBQVUsTUFBVixFQUFrQixTQUFsQixFQUE2QixLQUE3QixFQUFvQyxRQUFwQyxDQUFMLEVBQW9ELFFBQUEsQ0FBQyxLQUFELEVBQVEsSUFBUixFQUFjLE9BQWQsRUFBdUIsR0FBdkIsRUFBNEIsTUFBNUIsQ0FBQTtTQUVsRCxNQUFNLENBQUMsU0FBUCxDQUFpQixRQUFqQixFQUEyQixLQUEzQixFQUFrQyxJQUFBLENBQUssR0FBTCxFQUFVLEtBQVYsRUFBaUIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtJQUNqRCxJQUFjLGNBQWQ7QUFBQSxhQUFBOztJQUNBLElBQVUsTUFBQSxDQUFPLFdBQVAsQ0FBVjtBQUFBLGFBQUE7O0lBQ0EsSUFBVSxNQUFBLENBQU8sZUFBUCxDQUFWO0FBQUEsYUFBQTs7V0FDQSxHQUFHLENBQUMsSUFBSixDQUFTLGlDQUFULEVBQTRDLFFBQUEsQ0FBQSxDQUFBO2FBQzFDLE9BQUEsQ0FBUSxRQUFSLEVBQWtCLE1BQU0sQ0FBQyxTQUFQLENBQWlCLE1BQWpCLEVBQXlCLEtBQUssQ0FBQyxTQUEvQixDQUFsQjtJQUQwQyxDQUE1QztFQUppRCxDQUFqQixDQUFsQztBQUZrRCxDQUFwRCxFQWxqQndCOzs7QUE4akJ4QixJQUFBLENBQUssQ0FBQyxPQUFELEVBQVUsTUFBVixFQUFrQixLQUFsQixFQUF5QixLQUF6QixFQUFnQyxRQUFoQyxFQUEwQyxNQUExQyxDQUFMLEVBQXdELFFBQUEsQ0FBQyxLQUFELEVBQVEsSUFBUixFQUFjLEdBQWQsRUFBbUIsR0FBbkIsRUFBd0IsTUFBeEIsRUFBZ0MsSUFBaEMsQ0FBQTtBQUV4RCxNQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsYUFBQSxFQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7RUFBRSxPQUFBLEdBQVU7RUFFVixhQUFBLEdBQWdCLFFBQUEsQ0FBQyxDQUFELENBQUE7SUFDZCxtQkFBb0IsQ0FBQyxDQUFFLGdCQUFILEdBQVksRUFBaEM7QUFBQSxhQUFPLE1BQVA7O0lBQ0EsSUFBZ0IsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxHQUFWLENBQUEsS0FBa0IsQ0FBbEM7QUFBQSxhQUFPLE1BQVA7O0FBQ0EsV0FBTyxLQUhPO0VBQUE7RUFLaEIsYUFBQSxHQUFnQixDQUFBO0VBRWhCLE1BQUEsR0FBUyxJQUFBLENBQUssR0FBTCxFQUFVLElBQVYsRUFBZ0IsUUFBQSxDQUFBLENBQUE7QUFDM0IsUUFBQTtJQUFJLEtBQUEsd0JBQUE7TUFDRSxHQUFBLENBQUksRUFBSixFQUFRLHNCQUFSLEVBQWdDLE9BQWhDO0lBREY7V0FFQSxhQUFBLEdBQWdCLENBQUE7RUFITyxDQUFoQjtFQUtULEdBQUcsQ0FBQyxPQUFKLENBQVksc0JBQVosRUFBb0MsTUFBQSxRQUFBLENBQUMsT0FBRCxDQUFBO0FBQ3RDLFFBQUEsS0FBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUE7SUFBSSxZQUFBLEdBQWUsTUFBQSxDQUFPLGNBQVA7SUFDZixJQUFBLEdBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxZQUFWLEVBQXdCLE9BQXhCO0lBQ1AsSUFBRyxDQUFBLE1BQU0sSUFBSSxDQUFDLFFBQUwsQ0FBYyxJQUFkLENBQU4sQ0FBSDtNQUNFLEtBQUEsR0FBUSxNQUFNLENBQUMsS0FBUCxDQUFhLENBQUEsT0FBQSxDQUFBLENBQVUsT0FBVixDQUFBLENBQWI7O1FBQ1IsUUFBUyxLQUFLLENBQUMsR0FBTixDQUFVLElBQVY7O01BQ1QsR0FBQSxDQUFJLENBQUEsaUJBQUEsQ0FBQSxDQUFvQixPQUFwQixDQUFBLENBQUosRUFBbUM7UUFBQSxLQUFBLEVBQU87TUFBUCxDQUFuQztNQUNBLFdBQUEsR0FBYyxLQUFLLENBQUM7TUFDcEIsTUFBTSxLQUFLLENBQUMsVUFBTixDQUFpQixLQUFqQjtNQUNOLEdBQUEsQ0FBSSxLQUFLLENBQUMsT0FBVixFQUFtQjtRQUFBLFVBQUEsRUFBWTtNQUFaLENBQW5CO01BQ0EsR0FBQSxDQUFJLFdBQUosRUFBaUI7UUFBQSxVQUFBLEVBQVk7TUFBWixDQUFqQjtNQUNBLElBQUcsS0FBSyxDQUFDLE9BQU4sS0FBbUIsV0FBdEI7UUFDRSxNQUFNLEdBQUEsQ0FBSSxDQUFKLEVBQU8seUJBQVAsRUFBa0MsS0FBbEMsRUFBeUMsSUFBekMsRUFEUjs7TUFFQSxNQUFNLEdBQUEsQ0FBSSxDQUFKLEVBQU8seUJBQVAsRUFBa0MsS0FBbEMsRUFBeUMsSUFBekMsRUFWUjtLQUFBLE1BQUE7TUFZRSxLQUFBLEdBQVEsS0FaVjs7V0FhQSxNQUFBLENBQU8sQ0FBQSxPQUFBLENBQUEsQ0FBVSxPQUFWLENBQUEsQ0FBUCxFQUE0QixLQUE1QjtFQWhCa0MsQ0FBcEM7RUFrQkEsTUFBQSxHQUFTLFFBQUEsQ0FBQyxTQUFELEVBQVksUUFBWixDQUFBO0FBQ1gsUUFBQSxPQUFBLEVBQUEsWUFBQSxFQUFBO0lBQUksWUFBQSxHQUFlLE1BQUEsQ0FBTyxjQUFQO0lBQ2Ysc0JBQUEsR0FBeUIsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsWUFBakIsRUFBK0IsRUFBL0I7SUFDekIsT0FBQSxHQUFVLEtBQUssQ0FBQyxLQUFOLENBQVksSUFBSSxDQUFDLEtBQUwsQ0FBVyxzQkFBWCxDQUFaO0lBQ1YsS0FBYyxhQUFBLENBQWMsT0FBZCxDQUFkO0FBQUEsYUFBQTs7SUFDQSxLQUFjLGFBQUEsQ0FBYyxLQUFLLENBQUMsSUFBTixDQUFXLElBQUksQ0FBQyxLQUFMLENBQVcsUUFBWCxDQUFYLENBQWQsQ0FBZDtBQUFBLGFBQUE7S0FKSjs7OztJQVFJLGFBQWEsQ0FBQyxPQUFELENBQWIsR0FBeUI7V0FDekIsTUFBQSxDQUFBO0VBVk87RUFhVCxLQUFBLEdBQVEsUUFBQSxDQUFBLENBQUE7QUFDVixRQUFBOztNQUFJLE9BQU8sQ0FBRSxLQUFULENBQUE7O0lBQ0EsYUFBQSxHQUFnQixDQUFBLEVBRHBCO0lBRUksWUFBQSxHQUFlLE1BQUEsQ0FBTyxjQUFQO0lBQ2YsSUFBRyxvQkFBSDthQUNFLE9BQUEsR0FBVSxJQUFJLENBQUMsS0FBTCxDQUFXLFlBQVgsRUFBeUI7UUFBQyxTQUFBLEVBQVcsSUFBWjtRQUFrQixVQUFBLEVBQVk7TUFBOUIsQ0FBekIsRUFBK0QsTUFBL0QsRUFEWjs7RUFKTTtTQVFSLE1BQU0sQ0FBQyxTQUFQLENBQWlCLGNBQWpCLEVBQWlDLElBQWpDLEVBQXVDLEtBQXZDO0FBdkRzRCxDQUF4RCxFQTlqQndCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWt0QnhCLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsT0FBZixFQUF3QixNQUF4QixFQUFnQyxXQUFoQyxFQUE2QyxPQUE3QyxDQUFMLEVBQTRELFFBQUEsQ0FBQyxHQUFELEVBQU0sR0FBTixFQUFXLEtBQVgsRUFBa0IsSUFBbEIsRUFBd0IsU0FBeEIsRUFBbUMsS0FBbkMsQ0FBQTtBQUU1RCxNQUFBO0VBQUUsR0FBRyxDQUFDLE9BQUosQ0FBWSx5QkFBWixFQUF1QyxNQUFBLFFBQUEsQ0FBQyxLQUFELEVBQVEsWUFBWSxLQUFwQixDQUFBO0FBQ3pDLFFBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQTtJQUFJLEdBQUEsR0FBTSxDQUFBLGVBQUEsQ0FBQSxDQUFrQixLQUFLLENBQUMsRUFBeEIsQ0FBQSxFQUFBO0lBRU4sSUFBRyxDQUFJLFNBQVA7TUFDRSxNQUFBLEdBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFWLENBQWlCLEtBQUssQ0FBQyxTQUFOLENBQWdCLEtBQWhCLEVBQXVCLFNBQXZCLENBQWpCO01BQ1QsTUFBQSxHQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBVixDQUFpQixLQUFLLENBQUMsU0FBTixDQUFnQixLQUFoQixFQUF1QixTQUF2QixDQUFqQjtNQUNULElBQUcsTUFBQSxJQUFXLE1BQWQ7UUFDRSxHQUFBLENBQUksQ0FBQSxDQUFBLENBQUcsR0FBSCxDQUFBLGlCQUFBLENBQUosRUFBK0I7VUFBQSxLQUFBLEVBQU8sb0JBQVA7UUFBQSxDQUEvQjtBQUNBLGVBRkY7T0FIRjs7SUFPQSxJQUFHLHFCQUFIO01BQ0UsSUFBQSxHQUFPLEtBQUssQ0FBQyxPQUFOLENBQWMsS0FBZDtNQUNQLE1BQUEsR0FBUyxDQUFBLE1BQU0sU0FBQSxDQUFVLEtBQVYsRUFBaUIsSUFBakIsRUFBdUIsR0FBdkIsQ0FBTjtNQUNULE1BQUEsR0FBUyxDQUFBLE1BQU0sU0FBQSxDQUFVLEtBQVYsRUFBaUIsSUFBakIsRUFBdUIsR0FBdkIsQ0FBTjtNQUNULEdBQUEsQ0FBSSxDQUFBLENBQUEsQ0FBRyxHQUFILENBQUEsa0JBQUEsQ0FBSixFQUFnQyxvQkFBaEMsRUFITjtBQUlNLGFBTEY7S0FUSjs7SUFpQkksc0NBQWMsQ0FBRSxlQUFiLEdBQXFCLENBQXhCO0FBQ0U7TUFBQSxLQUFBLHNDQUFBOztRQUNFLEdBQUEsQ0FBSSxDQUFBLENBQUEsQ0FBRyxHQUFILENBQUEsaUJBQUEsQ0FBQSxDQUEwQixJQUFJLENBQUMsSUFBL0IsQ0FBQSxDQUFKO1FBQ0EsSUFBRyxDQUFBLE1BQU0sU0FBQSxDQUFVLEtBQVYsRUFBaUIsSUFBSSxDQUFDLElBQXRCLEVBQTRCLEdBQTVCLENBQU4sQ0FBSDtVQUNFLElBQUcsQ0FBQSxNQUFNLFNBQUEsQ0FBVSxLQUFWLEVBQWlCLElBQUksQ0FBQyxJQUF0QixFQUE0QixHQUE1QixDQUFOLENBQUg7WUFDRSxHQUFBLENBQUksQ0FBQSxDQUFBLENBQUcsR0FBSCxDQUFBLFdBQUEsQ0FBQSxDQUFvQixJQUFJLENBQUMsSUFBekIsQ0FBQSxHQUFBLENBQUosRUFBd0M7Y0FBQSxLQUFBLEVBQU8scUJBQVA7WUFBQSxDQUF4QztBQUNBLG1CQUFPLGNBQUEsQ0FBZSxLQUFmLEVBQXNCLElBQUksQ0FBQyxJQUEzQixFQUZUO1dBREY7O01BRkYsQ0FERjs7SUFRQSxHQUFBLENBQUksQ0FBQSxDQUFBLENBQUcsR0FBSCxDQUFBLFdBQUEsQ0FBSixFQUF5QjtNQUFBLEtBQUEsRUFBTyxvQkFBUDtJQUFBLENBQXpCO1dBQ0E7RUEzQnFDLENBQXZDO1NBOEJBLGNBQUEsR0FBaUIsUUFBQSxDQUFDLEtBQUQsRUFBUSxRQUFSLENBQUE7QUFDbkIsUUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxjQUFBLEVBQUEsR0FBQTs7Ozs7Ozs7SUFPSSxjQUFBLEdBQWlCLEtBQUssQ0FBQyxRQUFOLENBQWUsS0FBZjtJQUNqQixLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsY0FBakI7QUFDQTtJQUFBLEtBQUEscUNBQUE7O01BQ0UsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFYLENBQWMsSUFBZDtJQURGO1dBRUEsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFYLENBQW9CLFFBQXBCLEVBQThCLElBQUksQ0FBQyxJQUFMLENBQVUsY0FBVixFQUEwQixJQUFJLENBQUMsSUFBTCxDQUFVLFFBQVYsQ0FBMUIsQ0FBOUI7RUFaZTtBQWhDeUMsQ0FBNUQsRUFsdEJ3Qjs7O0FBbXdCeEIsSUFBQSxDQUFLLENBQUMsVUFBRCxFQUFhLEtBQWIsRUFBb0IsS0FBcEIsRUFBMkIsUUFBM0IsRUFBcUMsT0FBckMsRUFBOEMsTUFBOUMsRUFBc0QsV0FBdEQsRUFBbUUsT0FBbkUsQ0FBTCxFQUFrRixRQUFBLENBQUMsUUFBRCxFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsTUFBckIsRUFBNkIsS0FBN0IsRUFBb0MsSUFBcEMsRUFBMEMsU0FBMUMsRUFBcUQsS0FBckQsQ0FBQTtTQUVoRixHQUFHLENBQUMsT0FBSixDQUFZLHlCQUFaLEVBQXVDLE1BQUEsUUFBQSxDQUFDLEtBQUQsQ0FBQTtBQUN6QyxRQUFBLFFBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBO0lBQUksSUFBYyxhQUFkO0FBQUEsYUFBQTs7SUFFQSxNQUFBLEdBQVMsQ0FBQTtBQUNUO0lBQUEsS0FBQSxxQ0FBQTs7TUFDRSxLQUFBLEdBQVEsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsSUFBcEIsRUFBMEIsR0FBMUI7TUFDUixNQUFNLENBQUMsS0FBRCxDQUFOLEdBQWdCO0lBRmxCO0lBSUEsSUFBRyxRQUFBLEdBQVcsSUFBQSxDQUFLLEtBQUssQ0FBQyxVQUFOLENBQWlCLEtBQWpCLENBQUwsQ0FBZDtNQUNFLFFBQUEsR0FBVyxLQUFLLENBQUMsV0FBTixDQUFrQixRQUFsQjtNQUNYLE9BQU8sUUFBUSxDQUFDLFNBQUQ7TUFDZixPQUFPLFFBQVEsQ0FBQyxTQUFEO01BQ2YsUUFBQSxHQUFXLE1BQU0sQ0FBQyxZQUFQLENBQW9CLFFBQXBCLEVBQThCLE1BQTlCO01BQ1gsUUFBQSxHQUFXLE1BQU0sQ0FBQyxZQUFQLENBQW9CLE1BQXBCLEVBQTRCLFFBQTVCLEVBTGI7S0FBQSxNQUFBO01BT0UsUUFBQSxHQUFXO01BQ1gsUUFBQSxHQUFXLENBQUEsRUFSYjs7SUFVQSxLQUFBLGlCQUFBO01BQ0UsR0FBQSxDQUFJLENBQUEsdUJBQUEsQ0FBQSxDQUEwQixLQUFLLENBQUMsU0FBTixDQUFnQixLQUFoQixFQUF1QixLQUF2QixDQUExQixDQUFBLENBQUo7TUFDQSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQVgsQ0FBYyxLQUFLLENBQUMsU0FBTixDQUFnQixLQUFoQixFQUF1QixLQUF2QixDQUFkO0lBRkY7SUFJQSxRQUFBOztBQUFXO01BQUEsS0FBQSxpQkFBQTs7WUFBaUMsa0JBQUEsSUFBYyxDQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFOO3VCQUMxRSxTQUFBLENBQVUsS0FBVixFQUFpQixJQUFJLENBQUMsSUFBdEIsRUFBNEIsR0FBNUIsRUFBaUMsS0FBakM7O01BRFMsQ0FBQTs7O1dBR1gsQ0FBQSxNQUFNLE9BQU8sQ0FBQyxHQUFSLENBQVksUUFBWixDQUFOO0VBekJxQyxDQUF2QztBQUZnRixDQUFsRixFQW53QndCOzs7QUFteUJ4QixJQUFBLENBQUssQ0FBQyxLQUFELEVBQVEsS0FBUixFQUFlLEtBQWYsRUFBc0IsS0FBdEIsRUFBNkIsUUFBN0IsRUFBdUMsT0FBdkMsRUFBZ0QsTUFBaEQsRUFBd0QsT0FBeEQsQ0FBTCxFQUF1RSxRQUFBLENBQUMsR0FBRCxFQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLE1BQXJCLEVBQTZCLEtBQTdCLEVBQW9DLElBQXBDLEVBQTBDLEtBQTFDLENBQUE7QUFFdkUsTUFBQSxTQUFBLEVBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxTQUFBLEVBQUEsc0JBQUEsRUFBQSxXQUFBLEVBQUEsUUFBQSxFQUFBO0VBQUUsUUFBQSxHQUFXLENBQUE7RUFFWCxJQUFJLENBQUMsS0FBTCxDQUFXLFdBQVgsRUFBd0IsU0FBQSxHQUFZLFFBQUEsQ0FBQyxLQUFELEVBQVEsVUFBUixFQUFvQixJQUFwQixFQUEwQixRQUExQixDQUFBO0FBQ3RDLFFBQUEsWUFBQSxFQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUEsT0FBQSxFQUFBO0lBQUksR0FBQSxHQUFNLEtBQUssQ0FBQyxJQUFOLENBQVcsVUFBVSxDQUFDLEtBQVgsQ0FBaUIsR0FBakIsQ0FBWCxDQUFnQyxDQUFDLFdBQWpDLENBQUEsRUFBVjs7O0lBSUksSUFBVSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFELENBQXhCO0FBQUEsYUFBQTs7SUFFQSxZQUFBLEdBQWUsTUFBQSxDQUFPLGNBQVA7SUFDZixPQUFBLEdBQVUsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsWUFBbkIsRUFBaUMsRUFBakM7O01BRVYsV0FBWSxDQUFBLENBQUEsQ0FBRyxJQUFILENBQUEsSUFBQTs7SUFFWixRQUFBLEdBQVcsS0FBSyxDQUFDLFNBQU4sQ0FBZ0IsS0FBaEIsRUFBdUIsUUFBdkI7SUFFWCxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQVgsQ0FBaUIsS0FBSyxDQUFDLFVBQU4sQ0FBaUIsS0FBakIsQ0FBakI7SUFFQSxPQUFBLEdBQWEsR0FBRyxDQUFDLEtBQUosSUFBYyw2QkFBakIsR0FBMkMsZUFBM0MsR0FBZ0U7V0FDMUUsR0FBQSxDQUFJLENBQUosRUFBTyxPQUFQLEVBQWdCLFVBQWhCLEVBQTRCLFFBQTVCLEVBQXNDLElBQXRDLEVBQTRDLE9BQTVDO0VBakJrQyxDQUFwQztFQW9CQSxZQUFBLEdBQWU7RUFFZixHQUFHLENBQUMsT0FBSixDQUFZLGVBQVosRUFBNkIsUUFBQSxDQUFDLE1BQUQsRUFBUyxJQUFULEVBQWUsSUFBZixFQUFxQixPQUFyQixDQUFBO1dBQzNCLElBQUksT0FBSixDQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7TUFDVixHQUFBLENBQUksQ0FBQSxnQkFBQSxDQUFBLENBQW1CLE1BQW5CLENBQUEsQ0FBSjs7UUFDQSxlQUFnQixPQUFBLENBQVEsZUFBUjs7YUFDaEIsWUFBWSxDQUFDLElBQWIsQ0FBa0IsQ0FBQSwyQ0FBQSxDQUFBLENBQThDLElBQTlDLENBQUEsR0FBQSxDQUFBLENBQXdELE1BQXhELENBQUEsV0FBQSxDQUFBLENBQTRFLElBQTVFLENBQUEsRUFBQSxDQUFsQixFQUF3RyxRQUFBLENBQUMsR0FBRCxDQUFBO1FBQ3RHLElBQUcsV0FBSDtVQUNFLFNBQUEsQ0FBVSxPQUFWLEVBQW1CLEdBQW5CO2lCQUNBLE9BQUEsQ0FBUSxJQUFSLEVBRkY7U0FBQSxNQUFBO2lCQUlFLE9BQUEsQ0FBUSxJQUFSLEVBSkY7O01BRHNHLENBQXhHO0lBSFUsQ0FBWjtFQUQyQixDQUE3QjtFQVlBLFdBQUEsR0FBYztFQUVkLEdBQUcsQ0FBQyxPQUFKLENBQVksaUJBQVosRUFBK0IsUUFBQSxDQUFDLE1BQUQsRUFBUyxJQUFULEVBQWUsSUFBZixFQUFxQixPQUFyQixDQUFBO1dBQzdCLElBQUksT0FBSixDQUFZLE1BQUEsUUFBQSxDQUFDLE9BQUQsQ0FBQTtBQUNoQixVQUFBLEdBQUEsRUFBQSxHQUFBLEVBQUE7TUFBTSxHQUFBLENBQUksQ0FBQSxrQkFBQSxDQUFBLENBQXFCLE1BQXJCLENBQUEsQ0FBSjtBQUNBOztVQUNFLGNBQWUsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7UUFDbkMsS0FBQSxHQUFRLENBQUEsTUFBTSxXQUFXLENBQUMsdUJBQVosQ0FBb0MsTUFBcEMsRUFBNEM7VUFBQyxLQUFBLEVBQU8sSUFBUjtVQUFjLE1BQUEsRUFBUTtRQUF0QixDQUE1QyxDQUFOO1FBQ1IsR0FBQSxHQUFNLEtBQUssQ0FBQyxNQUFOLENBQWEsRUFBYjtRQUNOLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWCxDQUFnQixJQUFoQixFQUFzQixHQUF0QixFQUhSO2VBSVEsT0FBQSxDQUFRLElBQVIsRUFMRjtPQU1BLGFBQUE7UUFBTTtRQUNKLFNBQUEsQ0FBVSxPQUFWLEVBQW1CLEdBQW5CO2VBQ0EsT0FBQSxDQUFRLElBQVIsRUFGRjs7SUFSVSxDQUFaO0VBRDZCLENBQS9CO0VBY0EsUUFBQSxHQUFXLEVBcERiOzs7Ozs7RUFxREUsc0JBQUEsR0FBeUIsQ0FNdkIsb0NBTnVCLEVBckQzQjs7RUE2REUsd0JBQUEsR0FBMkIsQ0FFekIsK0RBRnlCLEVBR3pCLGdDQUh5QixFQUl6Qiw4REFKeUI7U0FPM0IsU0FBQSxHQUFZLFFBQUEsQ0FBQyxPQUFELEVBQVUsR0FBVixDQUFBO0FBQ2QsUUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBO0lBQUksR0FBRyxDQUFDLEdBQUosQ0FBUSxDQUFBLCtCQUFBLENBQUEsQ0FBa0MsT0FBbEMsQ0FBQSxJQUFBLENBQUEsQ0FBZ0QsR0FBRyxDQUFDLFFBQUosQ0FBQSxDQUFoRCxDQUFBLENBQVI7SUFFQSxLQUFBLDBEQUFBOztNQUNFLElBQUcsQ0FBQyxDQUFELEtBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxXQUFaLENBQUEsQ0FBeUIsQ0FBQyxPQUExQixDQUFrQyxPQUFPLENBQUMsV0FBUixDQUFBLENBQWxDLENBQVg7QUFDRSxlQURGOztJQURGO0lBSUEsSUFBVSxFQUFFLFFBQUYsR0FBYSxDQUF2QjtBQUFBLGFBQUE7O0lBRUEsS0FBQSwwREFBQTs7TUFDRSxJQUFHLENBQUMsQ0FBRCxLQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUMsV0FBWixDQUFBLENBQXlCLENBQUMsT0FBMUIsQ0FBa0MsT0FBTyxDQUFDLFdBQVIsQ0FBQSxDQUFsQyxDQUFYO1FBQ0UsS0FBQSxHQUFRO0FBQ1IsY0FGRjs7SUFERjs7TUFLQSxRQUFTLEdBQUcsQ0FBQzs7SUFFYixHQUFHLENBQUMsSUFBSixDQUFTLE9BQVQsRUFBa0I7TUFBQSxPQUFBLEVBQVMsQ0FBQSxxSUFBQSxDQUFBLENBQXdJLE9BQXhJLENBQUEsaUJBQUEsQ0FBQSxDQUFtSyxLQUFuSyxDQUFBO0lBQVQsQ0FBbEI7SUFFQSxJQUFHLFFBQUEsS0FBWSxDQUFmO2FBQ0UsR0FBRyxDQUFDLElBQUosQ0FBUyxPQUFULEVBQWtCO1FBQUEsT0FBQSxFQUFTO01BQVQsQ0FBbEIsRUFERjs7RUFsQlU7QUF0RXlELENBQXZFIiwic291cmNlc0NvbnRlbnQiOlsiIyBkYi9hc3NldHMvYXNzZXQuY29mZmVlXG5UYWtlIFtcIkZpbGVUcmVlXCIsIFwiUGF0aHNcIiwgXCJQb3J0c1wiLCBcIk1lbW9yeVwiLCBcIlJlYWRcIl0sIChGaWxlVHJlZSwgUGF0aHMsIFBvcnRzLCBNZW1vcnksIFJlYWQpLT5cblxuICBmaXJzdCA9ICh2KS0+IHY/WzBdXG4gIGFycmF5UHVuID0gKHYpLT4gdiBvciBbXVxuICBzZWFyY2hQcmVwID0gKGlucHV0KS0+IChpbnB1dCBvciBcIlwiKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UgL1teXFx3XFxkXS9nLCBcIiBcIlxuXG4gIE1ha2UgXCJBc3NldFwiLCBBc3NldCA9XG4gICAgbmV3OiAocGF0aCktPlxuICAgICAgYXNzZXQgPVxuICAgICAgICBpZDogaWQgPSBSZWFkLmxhc3QgcGF0aFxuICAgICAgICBuYW1lOiBpZFxuICAgICAgICBwYXRoOiBwYXRoXG4gICAgICAgIG51bWJlcjogQXJyYXkubGFzdCBpZC5zcGxpdChcIiBcIilcbiAgICAgICAgY3JlYXRvcjogaWQuc3BsaXQoXCIgXCIpWzAuLi4tMV0uam9pbiBcIiBcIlxuICAgICAgICBoYXNoOiBTdHJpbmcuaGFzaCBpZFxuICAgICAgICBzaG90OiBudWxsXG4gICAgICAgIG5ld1Nob3Q6IG51bGxcbiAgICAgICAgdGFnczogW11cbiAgICAgICAgZmlsZXM6IEZpbGVUcmVlLm5ld0VtcHR5IHBhdGgsIFwiRmlsZXNcIlxuICAgICAgICB0aHVtYm5haWxzOiB7fVxuICAgICAgICBfbG9hZGluZzogZmFsc2VcbiAgICAgIGFzc2V0LnNlYXJjaCA9IEFzc2V0LmxvYWQuc2VhcmNoIGFzc2V0XG4gICAgICBhc3NldFxuXG4gICAgcmVoeWRyYXRlOiAoYXNzZXRzRm9sZGVyLCBhc3NldCktPlxuICAgICAgIyBpZCAtIGluY2x1ZGVkIGluIGRlaHlkcmF0ZWQgYXNzZXRcbiAgICAgICMgbmFtZSAtIGluY2x1ZGVkIGluIGRlaHlkcmF0ZWQgYXNzZXRcbiAgICAgIGFzc2V0LnBhdGggPSBSZWFkLnBhdGggYXNzZXRzRm9sZGVyLCBhc3NldC5pZFxuICAgICAgYXNzZXQubnVtYmVyID0gQXJyYXkubGFzdCBhc3NldC5pZC5zcGxpdChcIiBcIilcbiAgICAgIGFzc2V0LmNyZWF0b3IgPSBhc3NldC5pZC5zcGxpdChcIiBcIilbMC4uLi0xXS5qb2luIFwiIFwiXG4gICAgICBhc3NldC5oYXNoID0gU3RyaW5nLmhhc2ggYXNzZXQuaWRcbiAgICAgICMgc2hvdCAtIG5vdCBuZWVkZWQgYnkgYnJvd3NlciBmb3IgaW5pdGlhbCByZW5kZXJcbiAgICAgICMgbmV3U2hvdCAtIG5vdCBuZWVkZWQgYnkgYnJvd3NlciBmb3IgaW5pdGlhbCByZW5kZXJcbiAgICAgICMgdGFncyAtIGluY2x1ZGVkIGluIGRlaHlkcmF0ZWQgYXNzZXRcbiAgICAgICMgZmlsZXMgLSBpbmNsdWRlZCBpbiBkZWh5ZHJhdGVkIGFzc2V0XG4gICAgICBhc3NldC50aHVtYm5haWxzID0ge31cbiAgICAgICMgc2VhcmNoIC0gaW5jbHVkZWQgaW4gZGVoeWRyYXRlZCBhc3NldFxuICAgICAgYXNzZXRcblxuICAgICMgVGhpcyBwcmVwcyBhbiBhc3NldCBmb3IgY2FjaGluZyB0byBkaXNrLiBPbmx5IGtlZXAgdGhlIG1vZGljdW0gb2YgcHJvcGVydGllcyBuZWVkZWRcbiAgICAjIHRvIHF1aWNrbHkgZ2V0IGFuIGFzc2V0IHJlYWR5IGZvciB1c2UgaW4gdGhlIEJyb3dzZXIgcmlnaHQgd2hlbiBIeXBlcnppbmUgbGF1bmNoZXMuXG4gICAgIyBBZGRpdGlvbmFsIGFzc2V0IGRhdGEgd2lsbCBiZSBsb2FkZWQgKG1vcmUgc2xvd2x5IC8gbGF6aWx5KSBvbmNlIEh5cGVyemluZSBpcyBydW5uaW5nLlxuICAgICMgVGhpcyBsaXZlcyBoZXJlIGJlY2F1c2UgdGhpcyBmaWxlIGlzIHRoZSBodWIgb2Yga25vd2xlZGdlIGFib3V0IHdoYXQgcHJvcHMgYXNzZXRzIG91Z2h0IHRvIGhhdmUuXG4gICAgZGVoeWRyYXRlOiAoYXNzZXQpLT5cbiAgICAgIGlkOiBhc3NldC5pZFxuICAgICAgbmFtZTogYXNzZXQubmFtZVxuICAgICAgIyBwYXRoIC0gd2lsbCBiZSByZWh5ZHJhdGVkIG9uIGxvYWRcbiAgICAgICMgbnVtYmVyIC0gd2lsbCBiZSByZWh5ZHJhdGVkIG9uIGxvYWRcbiAgICAgICMgY3JlYXRvciAtIHdpbGwgYmUgcmVoeWRyYXRlZCBvbiBsb2FkXG4gICAgICAjIHNob3QgLSBub3QgbmVlZGVkIGJ5IGJyb3dzZXIgZm9yIGluaXRpYWwgcmVuZGVyXG4gICAgICAjIG5ld1Nob3QgLSBub3QgbmVlZGVkIGJ5IGJyb3dzZXIgZm9yIGluaXRpYWwgcmVuZGVyXG4gICAgICB0YWdzOiBhc3NldC50YWdzXG4gICAgICBmaWxlczpcbiAgICAgICAgY291bnQ6IGFzc2V0LmZpbGVzLmNvdW50XG4gICAgICAjIHRodW1ibmFpbHMgLSBub3QgbmVlZGVkIGJ5IGJyb3dzZXIgZm9yIGluaXRpYWwgcmVuZGVyXG4gICAgICBzZWFyY2g6IGFzc2V0LnNlYXJjaFxuXG4gICAgbG9hZEZpZWxkczogKGFzc2V0KS0+XG4gICAgICBhc3NldC5uYW1lID0gYXdhaXQgQXNzZXQubG9hZC5uYW1lIGFzc2V0XG4gICAgICBhc3NldC5zaG90ID0gYXdhaXQgQXNzZXQubG9hZC5zaG90IGFzc2V0XG4gICAgICBhc3NldC5uZXdTaG90ID0gYXdhaXQgQXNzZXQubG9hZC5uZXdTaG90IGFzc2V0XG4gICAgICBhc3NldC50YWdzID0gYXdhaXQgQXNzZXQubG9hZC50YWdzIGFzc2V0XG4gICAgICBhc3NldC5maWxlcyA9IGF3YWl0IEFzc2V0LmxvYWQuZmlsZXMgYXNzZXRcbiAgICAgIGFzc2V0LnRodW1ibmFpbHMgPSBhd2FpdCBBc3NldC5sb2FkLnRodW1ibmFpbHMgYXNzZXRcbiAgICAgIGFzc2V0LnNlYXJjaCA9IEFzc2V0LmxvYWQuc2VhcmNoIGFzc2V0XG4gICAgICBhc3NldFxuXG4gICAgbG9hZDpcbiAgICAgIG5hbWU6IChhc3NldCktPlxuICAgICAgICBuYW1lID0gYXdhaXQgUmVhZC5hc3luYyhQYXRocy5uYW1lcyBhc3NldCkudGhlbiBmaXJzdFxuICAgICAgICAobmFtZSBvciBhc3NldC5pZCkudHJpbSgpXG4gICAgICBzaG90OiAoYXNzZXQpLT5cbiAgICAgICAgUmVhZC5hc3luYyhQYXRocy5zaG90cyBhc3NldCkudGhlbiBmaXJzdFxuICAgICAgbmV3U2hvdDogKGFzc2V0KS0+XG4gICAgICAgIFJlYWQuYXN5bmMoUGF0aHMubmV3U2hvdHMgYXNzZXQpLnRoZW4gZmlyc3RcbiAgICAgIHRhZ3M6IChhc3NldCktPlxuICAgICAgICBhc3NldFRhZ3MgPSBhd2FpdCBSZWFkLmFzeW5jKFBhdGhzLnRhZ3MgYXNzZXQpLnRoZW4gYXJyYXlQdW5cbiAgICAgICAgTWVtb3J5IFwidGFncy4je3RhZ31cIiwgdGFnIGZvciB0YWcgaW4gYXNzZXRUYWdzXG4gICAgICAgIGFzc2V0VGFnc1xuICAgICAgZmlsZXM6IChhc3NldCktPlxuICAgICAgICBGaWxlVHJlZS5uZXdQb3B1bGF0ZWQgYXNzZXQucGF0aCwgXCJGaWxlc1wiXG4gICAgICB0aHVtYm5haWxzOiAoYXNzZXQpLT5cbiAgICAgICAgdGh1bWJzID0gYXdhaXQgUmVhZC5hc3luYyhQYXRocy50aHVtYm5haWxzKGFzc2V0KSkudGhlbiBhcnJheVB1blxuICAgICAgICBBcnJheS5tYXBUb09iamVjdCB0aHVtYnMsICh0aHVtYiktPiBQYXRocy50aHVtYm5haWwgYXNzZXQsIHRodW1iXG4gICAgICBzZWFyY2g6IChhc3NldCktPlxuICAgICAgICBpZDogc2VhcmNoUHJlcCBhc3NldC5pZFxuICAgICAgICBuYW1lOiBzZWFyY2hQcmVwIGFzc2V0Lm5hbWVcbiAgICAgICAgdGFnczogc2VhcmNoUHJlcCBhc3NldC50YWdzLmpvaW4gXCIgXCJcbiAgICAgICAgZmlsZXM6IEFycmF5LnVuaXF1ZShGaWxlVHJlZS5mbGF0KGFzc2V0LmZpbGVzLCBcImJhc2VuYW1lXCIpKS5tYXAgc2VhcmNoUHJlcFxuICAgICAgICBleHRzOiBBcnJheS51bmlxdWUoRmlsZVRyZWUuZmxhdChhc3NldC5maWxlcywgXCJleHRcIikpLm1hcCBzZWFyY2hQcmVwXG5cblxuXG4jIGRiL2Fzc2V0cy9sb2FkLWFzc2V0cy5jb2ZmZWVcblRha2UgW1wiQXNzZXRcIiwgXCJEQlN0YXRlXCIsIFwiTG9nXCIsIFwiTWVtb3J5XCIsIFwiUmVhZFwiXSwgKEFzc2V0LCBEQlN0YXRlLCBMb2csIE1lbW9yeSwgUmVhZCktPlxuXG4gICMgTG9hZEFzc2V0cyBkb2VzIGEgdG9uIG9mIGxvbmctcnVubmluZyBhc3luYyBzdHVmZiwgc28gaWYgdGhlIGRhdGFGb2xkZXJcbiAgIyBjaGFuZ2VzIHdoaWxlIGl0J3MgcnVubmluZywgd2UnbGwgYmUgYXNrZWQgdG8gc3RhcnQgb3ZlciBhZ2Fpbi5cbiAgcnVubmluZyA9IGZhbHNlXG4gIHJlcXVlc3RlZCA9IGZhbHNlXG5cbiAgcmVzdGFydCA9ICgpLT5cbiAgICBydW5uaW5nID0gZmFsc2VcbiAgICByZXF1ZXN0ZWQgPSBmYWxzZVxuICAgIExvZyBcIlJlc3RhcnRpbmcgTG9hZEFzc2V0c1wiLCBiYWNrZ3JvdW5kOiBcIiNmODBcIiwgY29sb3I6IFwiYmxhY2tcIlxuICAgIExvYWRBc3NldHMoKVxuXG5cbiAgTWFrZS5hc3luYyBcIkxvYWRBc3NldHNcIiwgTG9hZEFzc2V0cyA9ICgpLT5cbiAgICBpZiBub3QgcnVubmluZ1xuICAgICAgcnVubmluZyA9IHRydWVcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBsb2FkXG4gICAgZWxzZVxuICAgICAgcmVxdWVzdGVkID0gdHJ1ZVxuXG5cbiAgbG9hZCA9ICgpLT5cbiAgICBMb2cgXCJMb2FkQXNzZXRzXCJcblxuICAgIGFzc2V0cyA9IHt9XG4gICAgYXNzZXRzRm9sZGVyID0gTWVtb3J5IFwiYXNzZXRzRm9sZGVyXCJcblxuICAgICMgTWFyayB0aGF0IHdlIHdhbnQgdG8gYmUgaW4gYSBcInJlYWQgb25seVwiIG1vZGUsIHNvIHRoYXQgdGhpbmdzIHRoYXQgd291bGRcbiAgICAjIG5vcm1hbGx5IGhhcHBlbiB3aGVuIGFzc2V0cyBhcmUgY2hhbmdlZCBtaWdodCBub3QgaGFwcGVuLCBzaW5jZSAqbG90cypcbiAgICAjIG9mIGFzc2V0cyBhcmUgYWJvdXQgdG8gY2hhbmdlLlxuICAgIE1lbW9yeSBcIlJlYWQgT25seVwiLCB0cnVlXG5cbiAgICAjIFRoaXMgZW5zdXJlcyB3ZSBoYXZlIGFuIGFzc2V0cyBvYmplY3QgaW4gTWVtb3J5LCBldmVuIGlmIHRoZSBsaWJyYXJ5IGlzIGJyYW5kIG5ld1xuICAgICMgYW5kIHRoZXJlIGFyZSBubyBhc3NldHMgaW4gaXQgeWV0IChpbiB3aGljaCBjYXNlIG5vbmUgb2YgdGhlIGJlbG93IHdvdWxkIGVuZCB1cFxuICAgICMgY29tbWl0dGluZyB0byBNZW1vcnksIGFuZCBNZW1vcnkoXCJhc3NldHNcIikgd291bGQgYmUgdW5kZWZpbmVkKVxuICAgIE1lbW9yeS5kZWZhdWx0IFwiYXNzZXRzXCIsIGFzc2V0c1xuXG4gICAgTG9nLnRpbWUgXCJSZWh5ZHJhdGluZyBEQlN0YXRlIEFzc2V0c1wiLCAoKS0+XG4gICAgICAjIFRvIHN0YXJ0LCBsb2FkIGFsbCBhc3NldCBkYXRhIGNhY2hlZCBmcm9tIHRoZSBsYXN0IHJ1bi5cbiAgICAgICMgVGhpcyBzaG91bGQgYmUgZXZlcnl0aGluZyBuZWVkZWQgdG8gZ2V0IHRoZSBCcm93c2VyIG1pbmltYWxseSByZWFkeSBmb3IgcmVhZC1vbmx5IHVzZVxuICAgICAgIyAoYWxiZWl0IHdpdGggc3RhbGUgZGF0YSkuXG4gICAgICBhc3NldHMgPSBEQlN0YXRlIFwiYXNzZXRzXCJcblxuICAgICAgbmVlZFNhdmUgPSBmYWxzZVxuXG4gICAgICBmb3IgaWQsIGFzc2V0IG9mIGFzc2V0c1xuICAgICAgICBBc3NldC5yZWh5ZHJhdGUgYXNzZXRzRm9sZGVyLCBhc3NldFxuICAgICAgICBhc3NldC5fbG9hZGluZyA9IHRydWVcbiAgICAgICAgbmVlZFNhdmUgPSB0cnVlXG5cbiAgICAgIE1lbW9yeSBcImFzc2V0c1wiLCBhc3NldHMgaWYgbmVlZFNhdmVcblxuICAgICMgTm93IHRoYXQgd2UndmUgZ290IHRoZSBjYWNoZWQgYXNzZXQgZGF0YSBsb2FkZWQsIHdlIG5lZWQgdG8gZG8gMiB0aGluZ3Mgd2l0aCB0aGUgcmVhbCBhc3NldHMgZm9sZGVyOlxuICAgICMgMS4gRmFzdC1sb2FkIGFzc2V0cyBjcmVhdGVkIHNpbmNlIG91ciBsYXN0IHJ1bi5cbiAgICAjIDIuIENsZWFyIGFzc2V0cyBkZWxldGVkIHNpbmNlIG91ciBsYXN0IHJ1bi5cbiAgICAjIE9uY2Ugd2UgaGF2ZSB0aGVzZSB0aGluZ3MgdGFrZW4gY2FyZSBvZiwgdGhlIEJyb3dzZXIgd2lsbCBiZSBpbiBhIGZ1bGx5IGNvcnJlY3Qgc3RhdGUsIHRob3VnaCBzdGlsbCByZWFkLW9ubHkuXG5cbiAgICBjcmVhdGVkID0ge30gIyBUcmFjayB0aGUgYXNzZXRzIHRoYXQgYXJlIG5ldywgc28gd2UgY2FuIHNraXAgcmVsb2FkaW5nIHRoZW0gZG93biBiZWxvdy5cblxuICAgICMgVGhpcyBzaG91bGQgYWxsIHRha2UgYXJvdW5kIDNzIG9uIGEgZmlyc3QgcnVuLCBhbmQgb25seSBhIGZldyBtcyBvbiBzdWJzZXF1ZW50IHJ1bnMuXG4gICAgYXdhaXQgTG9nLnRpbWUuYXN5bmMgXCJGYXN0LUxvYWRpbmcgTmV3IEFzc2V0c1wiLCBmYXN0bG9hZCA9ICgpLT5cblxuICAgICAgY29uZmlybWVkID0ge30gIyBUcmFjayB0aGUgcmVhbCBhc3NldHMgd2UndmUgc2Vlbiwgc28gd2UgY2FuIGNsZWFyIGFueSBjYWNoZWQgYXNzZXRzIHRoYXQgd2VyZSBkZWxldGVkLlxuICAgICAgcHJvbWlzZXMgPSBbXVxuICAgICAgbmVlZFNhdmUgPSBmYWxzZVxuXG4gICAgICBmb3IgYXNzZXRGb2xkZXJOYW1lIGluIFJlYWQgYXNzZXRzRm9sZGVyXG5cbiAgICAgICAgIyBGaXJzdCwgYnVpbGQgYSBuZXcgYmFzaWMgYXNzZXQgZnJvbSB0aGUgYXNzZXQgZm9sZGVyJ3MgbmFtZSBhbmQgcGF0aC5cbiAgICAgICAgYXNzZXQgPSBBc3NldC5uZXcgUmVhZC5wYXRoIGFzc2V0c0ZvbGRlciwgYXNzZXRGb2xkZXJOYW1lXG5cbiAgICAgICAgIyBJZiB0aGlzIGlzIGEgbmV3IGFzc2V0LCB3ZSBjYW4gbG9hZCB0aGUgcmVzdCBvZiBpdHMgZGF0YSBhbmQgc2F2ZSBpdC5cbiAgICAgICAgaWYgbm90IGFzc2V0c1thc3NldC5pZF0/XG4gICAgICAgICAgY3JlYXRlZFthc3NldC5pZF0gPSB0cnVlXG4gICAgICAgICAgYXNzZXRzW2Fzc2V0LmlkXSA9IGFzc2V0XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCBBc3NldC5sb2FkRmllbGRzIGFzc2V0XG4gICAgICAgICAgbmVlZFNhdmUgPSB0cnVlXG5cbiAgICAgICAgIyBNYXJrIHRoYXQgd2UndmUgc2VlbiB0aGlzIGFzc2V0LlxuICAgICAgICBjb25maXJtZWRbYXNzZXQuaWRdID0gdHJ1ZVxuXG4gICAgICBmb3IgcCBpbiBwcm9taXNlc1xuICAgICAgICBhd2FpdCBwXG5cbiAgICAgICMgMi4gQ2xlYXIgYW55IGFzc2V0cyB3ZSBkaWRuJ3Qgc2VlIGR1cmluZyBvdXIgbG9vcCBvdmVyIHRoZSBhc3NldHMgZm9sZGVyLlxuICAgICAgZm9yIGFzc2V0SWQgb2YgYXNzZXRzIHdoZW4gbm90IGNvbmZpcm1lZFthc3NldElkXVxuICAgICAgICBkZWxldGUgYXNzZXRzW2Fzc2V0SWRdXG4gICAgICAgIG5lZWRTYXZlID0gdHJ1ZVxuXG4gICAgICBNZW1vcnkgXCJhc3NldHNcIiwgYXNzZXRzIGlmIG5lZWRTYXZlXG5cbiAgICByZXR1cm4gcmVzdGFydCgpIGlmIHJlcXVlc3RlZFxuXG4gICAgIyBOb3cgdGhhdCB3ZSdyZSBkb25lIGxvYWRpbmcgYWxsIHRoZSBuZXcgYXNzZXRzLCB3ZSBjYW4gZ28gYmFjayBhbmQgcmUtbG9hZCBhbGwgdGhlIG90aGVyXG4gICAgIyBhc3NldHMsIHRvIGNhdGNoIGFueSBjaGFuZ2VzIHdlIG1pZ2h0IGhhdmUgbWlzc2VkIHNpbmNlIEh5cGVyemluZSBsYXN0IHJhbiwgYW5kIHRvIGZpbGwtaW5cbiAgICAjIGFueSBvZiB0aGUgZGV0YWlscyB0aGF0IHdlcmVuJ3QgaW5jbHVkZWQgaW4gdGhlIGNhY2hlLlxuICAgIGF3YWl0IExvZy50aW1lLmFzeW5jIFwiUmVsb2FkaW5nIE5vdC1OZXcgQXNzZXRzXCIsIGRlbHRhbG9hZCA9ICgpLT5cblxuICAgICAgbmVlZFNhdmUgPSBmYWxzZVxuXG4gICAgICBwcm9taXNlcyA9IGZvciBpZCwgYXNzZXQgb2YgYXNzZXRzXG5cbiAgICAgICAgIyBTa2lwIGFueSBhc3NldHMgdGhhdCB3ZSBhbHJlYWR5IGxvYWRlZCwgc2luY2UgdGhleSdyZSBhbHJlYWR5IHByZXN1bWFibHkgdXAtdG8tZGF0ZVxuICAgICAgICAjIChhbmQgd2F0Y2gtYXNzZXRzLmNvZmZlZSB3aWxsIGNhdGNoIGFueSBjaGFuZ2VzIHRoYXQgaGFwcGVuIHdoaWxlIHdlJ3JlIHJ1bm5pbmcpXG4gICAgICAgIGNvbnRpbnVlIGlmIGNyZWF0ZWRbaWRdP1xuXG4gICAgICAgIG5lZWRTYXZlID0gdHJ1ZVxuICAgICAgICBwcm9taXNlID0gQXNzZXQubG9hZEZpZWxkcyBhc3NldFxuXG4gICAgICBmb3IgcCBpbiBwcm9taXNlc1xuICAgICAgICBhc3NldCA9IGF3YWl0IHBcbiAgICAgICAgYXNzZXQuX2xvYWRpbmcgPSBmYWxzZVxuXG4gICAgICAjIFNhdmluZyB0aGlzIGJlY2F1c2UgaXQgc2VlbXMgdG8gYmUgZmFzdGVyIHRoYW4gdGhlIGFib3ZlIGluIHNvbWUgY2FzZXMuXG4gICAgICAjIFdlIGNhbiB0ZXN0IGl0IG1vcmUgbGF0ZXIuXG4gICAgICAjIGxvYWQgPSAoayktPlxuICAgICAgIyAgIG5ldyBQcm9taXNlIGxvYWRQcm9taXNlID0gKHJlc29sdmUpLT5cbiAgICAgICMgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSBsb2FkUmFmID0gKCktPlxuICAgICAgIyAgICAgICBhd2FpdCBMb2cudGltZS5hc3luYyBcIkJ1aWxkICN7a31cIiwgbG9hZExvZyA9ICgpLT5cbiAgICAgICMgICAgICAgICBmb3IgaWQsIGFzc2V0IG9mIGFzc2V0cyB3aGVuIG5vdCBjcmVhdGVkW2lkXT9cbiAgICAgICMgICAgICAgICAgIGFzc2V0W2tdID0gQXNzZXQubG9hZFtrXSBhc3NldFxuICAgICAgIyAgICAgICAgIGZvciBpZCwgYXNzZXQgb2YgYXNzZXRzIHdoZW4gbm90IGNyZWF0ZWRbaWRdP1xuICAgICAgIyAgICAgICAgICAgYXNzZXRba10gPSBhd2FpdCBhc3NldFtrXVxuICAgICAgIyAgICAgICAgIG51bGxcbiAgICAgICMgICAgICAgcmVzb2x2ZSgpXG4gICAgICAjXG4gICAgICAjIGZvciBrIGluIFtcIm5hbWVcIiwgXCJzaG90XCIsIFwidGFnc1wiLCBcImZpbGVzXCJdXG4gICAgICAjICAgYXdhaXQgbG9hZCBrXG4gICAgICAjXG4gICAgICAjIExvZy50aW1lIFwiQnVpbGQgU2VhcmNoXCIsIHNlYXJjaGxvZyA9ICgpLT5cbiAgICAgICMgICBmb3IgaWQsIGFzc2V0IG9mIGFzc2V0cyB3aGVuIG5vdCBjcmVhdGVkW2lkXT9cbiAgICAgICMgICAgIGFzc2V0LnNlYXJjaCA9IEFzc2V0LmxvYWQuc2VhcmNoIGFzc2V0XG4gICAgICAjICAgICBuZWVkU2F2ZSA9IHRydWVcblxuICAgICAgTWVtb3J5IFwiYXNzZXRzXCIsIGFzc2V0cyBpZiBuZWVkU2F2ZVxuXG4gICAgcmV0dXJuIHJlc3RhcnQoKSBpZiByZXF1ZXN0ZWRcblxuICAgICMgRmluYWxseSwgc2F2ZSBhIHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBhc3NldHMgdG8gdGhlIGRpc2ssIHRvIHNwZWVkIGZ1dHVyZSBsYXVuY2ggdGltZXMuXG4gICAgTG9nLnRpbWUgXCJTYXZpbmcgRmFzdC1Mb2FkIEFzc2V0IENhY2hlXCIsICgpLT5cbiAgICAgIERCU3RhdGUgXCJhc3NldHNcIiwgT2JqZWN0Lm1hcFZhbHVlcyBhc3NldHMsIEFzc2V0LmRlaHlkcmF0ZVxuXG4gICAgIyBEb25lXG4gICAgcmV0dXJuIHJlc3RhcnQoKSBpZiByZXF1ZXN0ZWRcbiAgICBydW5uaW5nID0gZmFsc2VcbiAgICBNZW1vcnkgXCJSZWFkIE9ubHlcIiwgZmFsc2VcblxuXG5cbiMgZGIvY29mZmVlL2NvbmZpZy5jb2ZmZWVcbiMgQ29uZmlnXG4jIFRoaXMgc3lzdGVtIG1hbmFnZXMgdXNlciBwcmVmZXJlbmNlcyBhbmQgcmVsYXRlZCBkYXRhLiBJdCB1c2VzIE1lbW9yeSB0byBzaGFyZSB0aGlzIGRhdGEgd2l0aCBvdGhlciBzeXN0ZW1zLlxuIyBUaGlzIGZpbGUgaXMgYWxzbyB3aGVyZSBhbGwgdGhlIGRlZmF1bHQgdmFsdWVzIGZvciB1c2VyIHByZWZlcmVuY2VzIGFyZSBsaXN0ZWQuXG5cblRha2UgW1wiQURTUlwiLCBcIkVudlwiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlJlYWRcIiwgXCJXcml0ZVwiXSwgKEFEU1IsIEVudiwgTG9nLCBNZW1vcnksIFJlYWQsIFdyaXRlKS0+XG5cbiAgIyBUaGlzIGxpc3RzIGFsbCB0aGUga2V5cyB3ZSdsbCBwZXJzaXN0IGluIHRoZSBjb25maWcgZmlsZSwgd2l0aCB0aGVpciBkZWZhdWx0IHZhbHVlc1xuICBjb25maWdEYXRhID1cbiAgICBhc3NldFRodW1ibmFpbFNpemU6IDAuNVxuICAgIGJyb3dzZXJUaHVtYm5haWxTaXplOiAxXG4gICAgZGF0YUZvbGRlcjogRW52LmRlZmF1bHREYXRhRm9sZGVyXG4gICAgbG9jYWxOYW1lOiBFbnYuY29tcHV0ZXJOYW1lXG4gICAgc2V0dXBEb25lOiBmYWxzZVxuXG4gIGFwcGx5Q29uZmlnID0gKGRhdGEpLT5cbiAgICBmb3IgaywgdiBvZiBkYXRhXG4gICAgICBkaWRTZXQgPSBNZW1vcnkuZGVmYXVsdCBrLCB2XG4gICAgICBpZiBub3QgZGlkU2V0IHRoZW4gTG9nLmVyciBcIk1lbW9yeSgje2t9KSB3YXMgYWxyZWFkeSBkZWZpbmVkIGJlZm9yZSBDb25maWcgaW5pdGlhbGl6ZWQgaXRcIlxuICAgICAgY29uZmlnRGF0YVtrXSA9IHZcblxuICBzZXR1cFN1YnNjcmliZXJzID0gKCktPlxuICAgIGZvciBrIG9mIGNvbmZpZ0RhdGFcbiAgICAgIE1lbW9yeS5zdWJzY3JpYmUgaywgZmFsc2UsIHVwZGF0ZUFuZFNhdmUga1xuXG4gIHVwZGF0ZUFuZFNhdmUgPSAoayktPiAodiktPlxuICAgIGlmIGNvbmZpZ0RhdGFba10gaXNudCB2XG4gICAgICBjb25maWdEYXRhW2tdID0gdlxuICAgICAgc2F2ZSgpXG5cbiAgc2F2ZSA9IEFEU1IgMCwgMjAwMCwgKCktPlxuICAgIFdyaXRlLnN5bmMuanNvbiBFbnYuY29uZmlnUGF0aCwgY29uZmlnRGF0YSwgcXVpZXQ6IHRydWVcblxuICBNYWtlIFwiQ29uZmlnXCIsICgpLT4gTG9nLnRpbWUgXCJMb2FkaW5nIENvbmZpZ1wiLCAoKS0+XG5cbiAgICBjb25maWdGaWxlID0gUmVhZC5maWxlIEVudi5jb25maWdQYXRoXG5cbiAgICBpZiBub3QgY29uZmlnRmlsZT9cbiAgICAgIGFwcGx5Q29uZmlnIGNvbmZpZ0RhdGEgIyBVc2UgdGhlIGRlZmF1bHQgY29uZmlnIGRhdGFcbiAgICAgIHNldHVwU3Vic2NyaWJlcnMoKVxuICAgICAgcmV0dXJuIGZhbHNlICMgTm8gY29uZmlnIGZpbGUg4oCUIG5lZWQgdG8gcnVuIFNldHVwIEFzc2lzdGFudFxuXG4gICAgdHJ5XG4gICAgICBsb2FkZWREYXRhID0gSlNPTi5wYXJzZSBjb25maWdGaWxlXG4gICAgICBhcHBseUNvbmZpZyBsb2FkZWREYXRhXG4gICAgICBzZXR1cFN1YnNjcmliZXJzKClcbiAgICAgICMgTG9hZGVkIHN1Y2Nlc3NmdWxseSDigJQgcmV0dXJuIHRydWUgdG8gbGF1bmNoIG5vcm1hbGx5LCBvciBmYWxzZSB0byBydW4gU2V0dXAgQXNzaXN0YW50XG4gICAgICByZXR1cm4gQm9vbGVhbiBjb25maWdEYXRhLnNldHVwRG9uZVxuXG4gICAgY2F0Y2hcbiAgICAgIHJldHVybiBudWxsICMgRmF0YWwgZXJyb3JcblxuXG5cbiMgZGIvY29mZmVlL2RiLXN0YXRlLmNvZmZlZVxuIyBUaGlzIGZpbGUgbWFuYWdlcyBkYXRhIHRoYXQgbmVlZHMgdG8gYmUgcGVyc2lzdGVkIHRvIHRoZSBsb2NhbCBmaWxlc3lzdGVtLCBqdXN0IGZvciB0aGUgREIgcHJvY2Vzcy5cbiMgVGhlIHR5cGljYWwgdXNlIG9mIHRoaXMgc3lzdGVtIGlzIHRvIGNhY2hlIGRhdGEgdGhhdCdsbCBzcGVlZCB1cCBsYXVuY2hpbmcgdGhlIGFwcC5cbiMgREJTdGF0ZSBpcyBpdHMgb3duIGRhdGEgc3RvcmUuIEl0IGRvZXMgbm90IHB1dCBpdHMgZGF0YSBpbnRvIFN0YXRlIG9yIE1lbW9yeS5cblxuVGFrZSBbXCJBRFNSXCIsIFwiRW52XCIsIFwiTG9nXCIsIFwiUmVhZFwiLCBcIldyaXRlXCJdLCAoQURTUiwgRW52LCBMb2csIFJlYWQsIFdyaXRlKS0+XG5cbiAgIyBUaGlzIGxpc3RzIGFsbCB0aGUga2V5cyB3ZSdsbCBwZXJzaXN0IGluIHRoZSBEQlN0YXRlIGZpbGUsIHdpdGggdGhlaXIgZGVmYXVsdCB2YWx1ZXNcbiAgc3RhdGUgPVxuICAgIGFzc2V0czoge31cblxuICBzYXZlID0gQURTUiAyMCwgMjAwMCwgKCktPlxuICAgIExvZy50aW1lIFwiU2F2aW5nIERCU3RhdGVcIiwgKCktPlxuICAgICAgIyBUT0RPOiBUaGlzIHNob3VsZCB0b3RhbGx5IGJlIGFzeW5jXG4gICAgICBXcml0ZS5zeW5jLmpzb24gRW52LmRiU3RhdGVQYXRoLCBzdGF0ZSwgcXVpZXQ6IHRydWVcblxuICBNYWtlLmFzeW5jIFwiREJTdGF0ZVwiLCBEQlN0YXRlID0gKGssIHYpLT5cbiAgICB0aHJvdyBFcnJvciBcIlVua25vd24gREJTdGF0ZSBrZXk6ICN7a31cIiB1bmxlc3Mgc3RhdGVba10/XG4gICAgaWYgdiBpc250IHVuZGVmaW5lZFxuICAgICAgaWYgdj8gdGhlbiBzdGF0ZVtrXSA9IHYgZWxzZSBkZWxldGUgc3RhdGVba11cbiAgICAgIHNhdmUoKVxuICAgIHN0YXRlW2tdXG5cbiAgREJTdGF0ZS5pbml0ID0gKCktPiBMb2cudGltZSBcIkxvYWRpbmcgREJTdGF0ZVwiLCAoKS0+XG4gICAgdHJ5XG4gICAgICBqc29uID0gUmVhZC5maWxlIEVudi5kYlN0YXRlUGF0aFxuICAgICAgZGF0YSA9IEpTT04ucGFyc2UganNvblxuICAgICAgZm9yIGssIHYgb2YgZGF0YVxuICAgICAgICAjIE9ubHkgYWNjZXB0IGtleXMgd2UgZXhwbGljaXRseSBsaXN0IGluIHRoZSBkZWZhdWx0cy5cbiAgICAgICAgIyBUaGlzIGxldHMgdXMgZHJvcCBvYnNvbGV0ZSB2YWx1ZXMuXG4gICAgICAgIGlmIHN0YXRlW2tdP1xuICAgICAgICAgIHN0YXRlW2tdID0gdlxuXG5cblxuIyBkYi9jb2ZmZWUvcG9ydHMuY29mZmVlXG5UYWtlIFtcIklQQ1wiLCBcIkxvZ1wiXSwgKElQQywgTG9nKS0+XG5cbiAgcG9ydHMgPSB7fVxuICBsaXN0ZW5lcnMgPSB7fVxuXG4gIElQQy5vbiBcInBvcnRcIiwgKGUsIHtpZH0pLT5cbiAgICBwb3J0ID0gcG9ydHNbaWRdID0gZS5wb3J0c1swXVxuICAgIHBvcnQub25tZXNzYWdlID0gKHtkYXRhOiBbcmVxdWVzdElELCBtc2csIC4uLmFyZ3NdfSktPlxuICAgICAgaWYgZm4gPSBsaXN0ZW5lcnNbbXNnXVxuICAgICAgICB2ID0gYXdhaXQgZm4gLi4uYXJnc1xuICAgICAgICBwb3J0LnBvc3RNZXNzYWdlIFtcInJldHVyblwiLCByZXF1ZXN0SUQsIHZdXG4gICAgICBlbHNlXG4gICAgICAgIExvZy5lcnIgXCJNaXNzaW5nIERCIHBvcnQgaGFuZGxlcjogI3ttc2d9XCJcblxuICAjIFRoaXMgaXMgZm9yIGNvbW11bmljYXRpb24gZnJvbSBNYWluIHRvIERCIGluIGEgd2F5IHRoYXQgcHJldGVuZHMgdG8gYmUgYSBwb3J0LlxuICAjIFVzZWZ1bCBlc3BlY2lhbGx5IGZvciBsaWJzIHRoYXQgdXNlIHRoZSBEQiBpbnRlcmZhY2UsIGxpa2UgTG9nLlxuICBJUEMub24gXCJtYWluUG9ydFwiLCAoZSwgbXNnLCAuLi5hcmdzKS0+XG4gICAgaWYgZm4gPSBsaXN0ZW5lcnNbbXNnXVxuICAgICAgZm4gLi4uYXJnc1xuICAgICAgIyBObyByZXR1cm4gdmFsdWUgKHlldCDigJQgaW1wbGVtZW50IHRoaXMgaWYgd2UgbmVlZCBpdClcbiAgICBlbHNlXG4gICAgICBMb2cuZXJyIFwiTWlzc2luZyBEQiBtYWluUG9ydCBoYW5kbGVyOiAje21zZ31cIlxuXG4gIE1ha2UgXCJQb3J0c1wiLCBQb3J0cyA9XG4gICAgb246IChtc2csIGNiKS0+XG4gICAgICBpZiBsaXN0ZW5lcnNbbXNnXT8gdGhlbiB0aHJvdyBFcnJvciBcIkRCIFBvcnQgbWVzc2FnZSAje21zZ30gYWxyZWFkeSBoYXMgYSBsaXN0ZW5lclwiXG4gICAgICBsaXN0ZW5lcnNbbXNnXSA9IGNiXG5cbiAgICBzZW5kOiAobXNnLCAuLi5hcmdzKS0+XG4gICAgICBmb3IgaWQsIHBvcnQgb2YgcG9ydHNcbiAgICAgICAgcG9ydC5wb3N0TWVzc2FnZSBbbXNnLCAuLi5hcmdzXVxuICAgICAgbnVsbFxuXG4gICAgIyBjbG9zZTogKGlkKS0+XG4gICAgIyAgIHBvcnRzW2lkXS5jbG9zZSgpXG4gICAgIyAgIGRlbGV0ZSBwb3J0c1tpZF1cblxuXG5cbiMgZGIvY29mZmVlL3ByaW50ZXIuY29mZmVlXG5UYWtlIFtcIkRPT01cIiwgXCJQb3J0c1wiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChET09NLCBQb3J0cyktPlxuXG4gIG1heExvZ0xpbmVzID0gNTAwMFxuICBwcmludGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcImxvZy1wcmludGVyXCJcblxuICBQcmludGVyID0gKG1zZywgYXR0cnMsIHRpbWUpLT5cbiAgICB0aW1lID0gKHRpbWUgb3IgcGVyZm9ybWFuY2Uubm93KCkpLnRvRml4ZWQoMCkucGFkU3RhcnQoNSlcbiAgICBjb25zb2xlLmxvZyB0aW1lLCBtc2dcblxuICAgIGVsbSA9IERPT00uY3JlYXRlIFwiZGl2XCIsIG51bGwsIHRleHRDb250ZW50OiAodGltZS8xMDAwKS50b0ZpeGVkKDMpICsgXCIgIFwiICsgbXNnXG4gICAgRE9PTSBlbG0sIGF0dHJzIGlmIGF0dHJzP1xuICAgIERPT00ucHJlcGVuZCBwcmludGVyLCBlbG1cblxuICAgIHdoaWxlIHByaW50ZXIuY2hpbGRFbGVtZW50Q291bnQgPiBtYXhMb2dMaW5lc1xuICAgICAgRE9PTS5yZW1vdmUgcHJpbnRlci5sYXN0Q2hpbGRcblxuICAgIHJldHVybiBtc2dcblxuICBQb3J0cy5vbiBcInByaW50ZXJcIiwgUHJpbnRlclxuICBNYWtlIFwiUHJpbnRlclwiLCBQcmludGVyXG5cblxuXG4jIGRiL2NvZmZlZS9zcGVjaWFsLXRhZ3MuY29mZmVlXG5UYWtlIFtcIk1lbW9yeVwiXSwgKE1lbW9yeSktPlxuXG4gIHNwZWNpYWxUYWdzID0ge1xuICAgIFwiQXJjaGl2ZWRcIlxuICB9XG5cbiAgTWVtb3J5Lm1lcmdlIFwidGFnc1wiLCBzcGVjaWFsVGFnc1xuICBNZW1vcnkgXCJzcGVjaWFsVGFnc1wiLCBzcGVjaWFsVGFnc1xuXG5cblxuIyBkYi9kYi5jb2ZmZWVcblRha2UgW1wiQ29uZmlnXCIsIFwiREJTdGF0ZVwiLCBcIklQQ1wiLCBcIkxvZ1wiXSwgKENvbmZpZywgREJTdGF0ZSwgSVBDLCBMb2cpLT5cblxuICAjIExldCB0aGUgTWFpbiBwcm9jZXNzIGtub3cgdGhhdCB0aGUgREIgaXMgb3BlbiBhbmQgaXQncyBzYWZlIHRvIGJlZ2luIGxvZ2dpbmdcbiAgSVBDLnNlbmQgXCJkYi1vcGVuXCJcblxuICAjIFRoZSBEQiBwcm9jZXNzIHN0b3JlcyBhIGNhY2hlIG9mIGRhdGEgaW4gYSBmaWxlLCB0byBoZWxwIGl0IHNwZWVkIHVwIGxhdW5jaGluZy4gV2UgbG9hZCB0aGF0IGZpcnN0LlxuICBEQlN0YXRlLmluaXQoKVxuXG4gICMgTmV4dCwgd2UgbG9hZCB0aGUgY29uZmlnIGZpbGUg4oCUIHByZWZlcmVuY2UgZGF0YSBjcmVhdGVkIGJ5IHRoZSBTZXR1cCBBc3Npc3RhbnQgYW5kIHRocm91Z2ggZ2VuZXJhbCB1c2VyIGludGVyYWN0aW9uLlxuICBjb25maWcgPSBDb25maWcoKVxuXG4gICMgRGVwZW5kaW5nIG9uIGhvdyB0aGUgY29uZmlnIGxvYWQgd2VudCwgd2UgY2FuIGNvbnRpbnVlIHRvIGxhdW5jaCB0aGUgbWFpbiBhcHAsIG9yIGRyb3BcbiAgIyB0aGUgdXNlciBpbnRvIHRoZSBTZXR1cCBBc3Npc3RhbnQuXG4gIHN3aXRjaCBjb25maWdcbiAgICB3aGVuIHRydWVcbiAgICAgIElQQy5zZW5kIExvZyBcImNvbmZpZy1yZWFkeVwiICMgU2V0dXAgQXNzaXN0YW50IHdhcyBwcmV2aW91c2x5IGNvbXBsZXRlZCwgc28gbGF1bmNoIHRoZSBtYWluIGFwcC5cbiAgICB3aGVuIGZhbHNlXG4gICAgICBJUEMuc2VuZCBMb2cgXCJvcGVuLXNldHVwLWFzc2lzdGFudFwiICMgU2V0dXAgQXNzaXN0YW50IGhhcyBub3QgYmVlbiBjb21wbGV0ZWQsIHNvIGxhdW5jaCBpdC5cbiAgICBlbHNlXG4gICAgICBJUEMuc2VuZCBcImZhdGFsXCIsIFwiSHlwZXJ6aW5lIGZhaWxlZCB0byBsb2FkIHlvdXIgc2F2ZWQgcHJlZmVyZW5jZXMuIFRvIGF2b2lkIGRhbWFnaW5nIHRoZSBwcmVmZXJlbmNlcyBmaWxlLCBIeXBlcnppbmUgd2lsbCBub3cgY2xvc2UuIFBsZWFzZSBhc2sgSXZhbiBmb3IgaGVscC5cIlxuXG4gICMgQXQgdGhpcyBwb2ludCB3ZSdyZSBkb25lIGluaXRpYWxpemluZy4gSGVyZSdzIHdoYXQgaGFwcGVucyBuZXh0OlxuICAjICogRWl0aGVyIHRoZSBjb25maWcgZmlsZSBvciB0aGUgU2V0dXAgQXNzaXN0YW50IHdpbGwgc3BlY2lmeSBhIGRhdGEgZm9sZGVyLlxuICAjICogVGhlIGFzc2V0cy1mb2xkZXIuY29mZmVlIHN1YnNjcmlwdGlvbiB3aWxsIG1ha2Ugc3VyZSB3ZSBoYXZlIGFuIEFzc2V0cyBmb2xkZXIgaW4gdGhlIGRhdGEgZm9sZGVyLFxuICAjICAgYW5kIHRoZW4gY2FsbCBMb2FkQXNzZXRzKCkgdG8gbG9hZCBhbGwgb3VyIGFzc2V0IGRhdGEgaW50byBtZW1vcnkuXG4gICMgKiBDb25jdXJyZW50bHkgd2l0aCB0aGUgYWJvdmUsIHRoZSBNYWluIHByb2Nlc3Mgd2lsbCBsYXVuY2ggYSBCcm93c2VyIHdpbmRvdy5cbiAgIyAqIEFzIGFzc2V0IGRhdGEgY29tZXMgaW50byBleGlzdGVuY2UsIHRoZSBCcm93c2VyIHdpbmRvdyB3aWxsIHBvcHVsYXRlIGl0c2VsZi5cblxuXG5cbiMgZGIvcG9ydHMtaGFuZGxlcnMvYXNzZXQtaGFuZGxlcnMuY29mZmVlXG5UYWtlIFtcIkFzc2V0XCIsIFwiRmlsZVRyZWVcIiwgXCJJUENcIiwgXCJKb2JcIiwgXCJMb2dcIiwgXCJNZW1vcnlcIiwgXCJQYXRoc1wiLCBcIlBvcnRzXCIsIFwiUmVhZFwiLCBcIldyaXRlXCJdLCAoQXNzZXQsIEZpbGVUcmVlLCBJUEMsIEpvYiwgTG9nLCBNZW1vcnksIFBhdGhzLCBQb3J0cywgUmVhZCwgV3JpdGUpLT5cblxuICBQb3J0cy5vbiBcIk5ldyBBc3NldFwiLCAoKS0+XG4gICAgYXNzZXRzRm9sZGVyID0gTWVtb3J5IFwiYXNzZXRzRm9sZGVyXCJcbiAgICBudW1iZXIgPSBNZW1vcnkgXCJuZXh0QXNzZXROdW1iZXJcIlxuICAgIGNyZWF0b3IgPSBNZW1vcnkgXCJsb2NhbE5hbWVcIlxuICAgIGlkID0gY3JlYXRvciArIFwiIFwiICsgbnVtYmVyXG4gICAgcGF0aCA9IFJlYWQucGF0aCBhc3NldHNGb2xkZXIsIGlkXG4gICAgTWVtb3J5IFwiYXNzZXRzLiN7aWR9XCIsIEFzc2V0Lm5ldyBwYXRoICMgVXBkYXRlIE1lbW9yeVxuICAgIFdyaXRlLnN5bmMubWtkaXIgcGF0aCAjIFVwZGF0ZSBEaXNrXG4gICAgSVBDLnNlbmQgXCJvcGVuLWFzc2V0XCIsIGlkXG4gICAgcmV0dXJuIGlkXG5cbiAgUG9ydHMub24gXCJEZWxldGUgQXNzZXRcIiwgKGFzc2V0SWQpLT5cbiAgICByZXR1cm4gdW5sZXNzIGFzc2V0ID0gTWVtb3J5IFwiYXNzZXRzLiN7YXNzZXRJZH1cIlxuICAgIE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCIsIG51bGwgIyBVcGRhdGUgTWVtb3J5XG4gICAgV3JpdGUuc3luYy5ybSBhc3NldC5wYXRoICMgVXBkYXRlIERpc2tcblxuICBQb3J0cy5vbiBcIlJlbmFtZSBBc3NldFwiLCAoYXNzZXRJZCwgdiktPlxuICAgIHJldHVybiB1bmxlc3MgYXNzZXQgPSBNZW1vcnkgXCJhc3NldHMuI3thc3NldElkfVwiXG4gICAgTWVtb3J5IFwiYXNzZXRzLiN7YXNzZXRJZH0ubmFtZVwiLCB2ICMgVXBkYXRlIE1lbW9yeVxuICAgIFdyaXRlLnN5bmMuYXJyYXkgUGF0aHMubmFtZXMoYXNzZXQpLCBbdl0gIyBVcGRhdGUgRGlza1xuXG4gIFBvcnRzLm9uIFwiQWRkIFRhZ1wiLCAoYXNzZXRJZCwgdGFnKS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICBNZW1vcnkudXBkYXRlIFwiYXNzZXRzLiN7YXNzZXRJZH0udGFnc1wiLCAodGFncyktPiAjIFVwZGF0ZSBNZW1vcnlcbiAgICAgIEFycmF5LnNvcnRBbHBoYWJldGljIHRhZ3MuY29uY2F0IHRhZ1xuICAgIFdyaXRlLnN5bmMubWtkaXIgUGF0aHMudGFnIGFzc2V0LCB0YWcgIyBVcGRhdGUgRGlza1xuXG4gIFBvcnRzLm9uIFwiUmVtb3ZlIFRhZ1wiLCAoYXNzZXRJZCwgdGFnKS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICBNZW1vcnkubXV0YXRlIFwiYXNzZXRzLiN7YXNzZXRJZH0udGFnc1wiLCAodGFncyktPiAjIFVwZGF0ZSBNZW1vcnlcbiAgICAgIEFycmF5LnB1bGwgdGFncywgdGFnXG4gICAgV3JpdGUuc3luYy5ybSBQYXRocy50YWcgYXNzZXQsIHRhZyAjIFVwZGF0ZSBEaXNrXG5cbiAgUG9ydHMub24gXCJBZGQgRmlsZXNcIiwgKGFzc2V0SWQsIG5ld0ZpbGVzKS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICBhc3NldEZpbGVzUGF0aCA9IFBhdGhzLmZpbGVzIGFzc2V0XG4gICAgV3JpdGUuc3luYy5ta2RpciBhc3NldEZpbGVzUGF0aFxuICAgIGZvciBmaWxlIGluIG5ld0ZpbGVzXG4gICAgICBXcml0ZS5hc3luYy5jb3B5SW50byBmaWxlLCBhc3NldEZpbGVzUGF0aFxuICAgIG51bGxcblxuICBQb3J0cy5vbiBcIkRlbGV0ZSBGaWxlXCIsIChhc3NldElkLCByZWxwYXRoKS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICByZXR1cm4gdW5sZXNzIGZpbGUgPSBGaWxlVHJlZS5maW5kIGFzc2V0LmZpbGVzLCBcInJlbHBhdGhcIiwgcmVscGF0aFxuICAgICMgVXBkYXRpbmcgTWVtb3J5IHdvdWxkIGJlIGNvbXBsZXgsIHNvIHdlJ2xsIGp1c3QgbGV0IHdhdGNoLWFzc2V0cyBjYXRjaCB0aGlzIG9uZVxuICAgIFdyaXRlLnN5bmMucm0gZmlsZS5wYXRoICMgVXBkYXRlIERpc2tcblxuICBQb3J0cy5vbiBcIlJlbmFtZSBGaWxlXCIsIChhc3NldElkLCByZWxwYXRoLCB2KS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICByZXR1cm4gdW5sZXNzIGZpbGUgPSBGaWxlVHJlZS5maW5kIGFzc2V0LmZpbGVzLCBcInJlbHBhdGhcIiwgcmVscGF0aFxuICAgICMgVXBkYXRpbmcgTWVtb3J5IHdvdWxkIGJlIGNvbXBsZXgsIHNvIHdlJ2xsIGp1c3QgbGV0IHdhdGNoLWFzc2V0cyBjYXRjaCB0aGlzIG9uZVxuICAgIFdyaXRlLnN5bmMucmVuYW1lIGZpbGUucGF0aCwgdiAjIFVwZGF0ZSBEaXNrXG5cbiAgUG9ydHMub24gXCJTZXQgVGh1bWJuYWlsXCIsIChhc3NldElkLCByZWxwYXRoKS0+XG4gICAgcmV0dXJuIHVubGVzcyBhc3NldCA9IE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcbiAgICByZXR1cm4gdW5sZXNzIGZpbGUgPSBGaWxlVHJlZS5maW5kIGFzc2V0LmZpbGVzLCBcInJlbHBhdGhcIiwgcmVscGF0aFxuICAgIHJldHVybiBpZiBmaWxlLm5hbWUgaXMgYXNzZXQubmV3U2hvdFxuICAgICMgV2UnbGwganVzdCBsZXQgd2F0Y2gtYXNzZXRzIGhhbmRsZSB1cGRhdGluZyBuZXdTaG90IGluIE1lbW9yeVxuICAgICMgVXBkYXRlIERpc2tcbiAgICBuZXdTaG90c0ZvbGRlciA9IFBhdGhzLm5ld1Nob3RzIGFzc2V0XG4gICAgV3JpdGUuc3luYy5ybSBuZXdTaG90c0ZvbGRlclxuICAgIFdyaXRlLnN5bmMubWtkaXIgbmV3U2hvdHNGb2xkZXJcbiAgICBXcml0ZS5zeW5jLmNvcHlGaWxlIGZpbGUucGF0aCwgUmVhZC5wYXRoIG5ld1Nob3RzRm9sZGVyLCBSZWFkLmxhc3QgZmlsZS5wYXRoXG5cbiAgUG9ydHMub24gXCJSZWJ1aWxkIFRodW1ibmFpbFwiLCAoYXNzZXRJZCktPlxuICAgIHJldHVybiB1bmxlc3MgYXNzZXQgPSBNZW1vcnkgXCJhc3NldHMuI3thc3NldElkfVwiXG4gICAgSm9iIDEsIFwiUmVidWlsZCBBc3NldCBUaHVtYm5haWxcIiwgYXNzZXQsIHRydWVcblxuXG5cbiMgZGIvcG9ydHMtaGFuZGxlcnMvY3JlYXRlLWZpbGUtdGh1bWJuYWlsLmNvZmZlZVxuVGFrZSBbXCJMb2dcIiwgXCJNZW1vcnlcIiwgXCJQb3J0c1wiLCBcIlRodW1ibmFpbFwiXSwgKExvZywgTWVtb3J5LCBQb3J0cywgVGh1bWJuYWlsKS0+XG5cbiAgUG9ydHMub24gXCJjcmVhdGUtZmlsZS10aHVtYm5haWxcIiwgKGFzc2V0SWQsIHBhdGgsIHNpemUsIGRlc3ROYW1lKS0+XG4gICAgaWYgYXNzZXQgPSBNZW1vcnkgXCJhc3NldHMuI3thc3NldElkfVwiXG4gICAgICBUaHVtYm5haWwgYXNzZXQsIHBhdGgsIHNpemUsIGRlc3ROYW1lXG5cblxuXG4jIGRiL3N1YnNjcmlwdGlvbnMvYXNzZXRzLWZvbGRlci5jb2ZmZWVcblRha2UgW1wiTG9hZEFzc2V0c1wiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlJlYWRcIiwgXCJXcml0ZVwiXSwgKExvYWRBc3NldHMsIExvZywgTWVtb3J5LCBSZWFkLCBXcml0ZSktPlxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgXCJkYXRhRm9sZGVyXCIsIHRydWUsIChkYXRhRm9sZGVyKS0+XG4gICAgcmV0dXJuIHVubGVzcyBkYXRhRm9sZGVyP1xuICAgIGFzc2V0c0ZvbGRlciA9IFJlYWQucGF0aCBkYXRhRm9sZGVyLCBcIkFzc2V0c1wiXG4gICAgaWYgTWVtb3J5LmNoYW5nZSBcImFzc2V0c0ZvbGRlclwiLCBhc3NldHNGb2xkZXJcbiAgICAgIExvZyBcImFzc2V0c0ZvbGRlcjogI3thc3NldHNGb2xkZXJ9XCJcbiAgICAgIFdyaXRlLnN5bmMubWtkaXIgYXNzZXRzRm9sZGVyXG4gICAgICBMb2FkQXNzZXRzKClcblxuXG5cbiMgZGIvc3Vic2NyaXB0aW9ucy9uZXh0LWFzc2V0LW51bWJlci5jb2ZmZWVcblRha2UgW1wiTWVtb3J5XCJdLCAoTWVtb3J5KS0+XG5cbiAgdXBkYXRlID0gKCktPlxuICAgIGFzc2V0cyA9IE1lbW9yeSBcImFzc2V0c1wiXG4gICAgbG9jYWxOYW1lID0gTWVtb3J5IFwibG9jYWxOYW1lXCJcblxuICAgIHJldHVybiB1bmxlc3MgbG9jYWxOYW1lPyBhbmQgYXNzZXRzP1xuXG4gICAgaGlnaGVzdE51bWJlciA9IDBcblxuICAgIGZvciBhc3NldElkLCBhc3NldCBvZiBhc3NldHNcbiAgICAgIGlmIGFzc2V0LmNyZWF0b3IudG9Mb3dlckNhc2UoKSBpcyBsb2NhbE5hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICBoaWdoZXN0TnVtYmVyID0gTWF0aC5tYXggaGlnaGVzdE51bWJlciwgYXNzZXQubnVtYmVyXG5cbiAgICBNZW1vcnkgXCJuZXh0QXNzZXROdW1iZXJcIiwgaGlnaGVzdE51bWJlciArIDFcblxuICAgIG51bGxcblxuICBNZW1vcnkuc3Vic2NyaWJlIFwibG9jYWxOYW1lXCIsIHRydWUsIHVwZGF0ZVxuICBNZW1vcnkuc3Vic2NyaWJlIFwiYXNzZXRzXCIsIHRydWUsIHVwZGF0ZVxuICB1cGRhdGUoKVxuXG5cblxuIyBkYi9zdWJzY3JpcHRpb25zL3NhdmUtYXNzZXQtY2FjaGUuY29mZmVlXG5UYWtlIFtcIkFzc2V0XCIsIFwiQURTUlwiLCBcIkRCU3RhdGVcIiwgXCJMb2dcIiwgXCJNZW1vcnlcIl0sIChBc3NldCwgQURTUiwgREJTdGF0ZSwgTG9nLCBNZW1vcnkpLT5cblxuICBNZW1vcnkuc3Vic2NyaWJlIFwiYXNzZXRzXCIsIGZhbHNlLCBBRFNSIDMwMCwgMTAwMDAsIChhc3NldHMpLT5cbiAgICByZXR1cm4gdW5sZXNzIGFzc2V0cz9cbiAgICByZXR1cm4gaWYgTWVtb3J5IFwiUmVhZCBPbmx5XCJcbiAgICByZXR1cm4gaWYgTWVtb3J5IFwiUGF1c2UgQ2FjaGluZ1wiXG4gICAgTG9nLnRpbWUgXCJVcGRhdGluZyBGYXN0LUxvYWQgQXNzZXQgQ2FjaGVkXCIsICgpLT5cbiAgICAgIERCU3RhdGUgXCJhc3NldHNcIiwgT2JqZWN0Lm1hcFZhbHVlcyBhc3NldHMsIEFzc2V0LmRlaHlkcmF0ZVxuXG5cblxuIyBkYi9zdWJzY3JpcHRpb25zL3dhdGNoLWFzc2V0cy5jb2ZmZWVcblRha2UgW1wiQXNzZXRcIiwgXCJBRFNSXCIsIFwiSm9iXCIsIFwiTG9nXCIsIFwiTWVtb3J5XCIsIFwiUmVhZFwiXSwgKEFzc2V0LCBBRFNSLCBKb2IsIExvZywgTWVtb3J5LCBSZWFkKS0+XG5cbiAgd2F0Y2hlciA9IG51bGxcblxuICB2YWxpZEZpbGVOYW1lID0gKHYpLT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIHY/Lmxlbmd0aCA+IDBcbiAgICByZXR1cm4gZmFsc2UgaWYgdi5pbmRleE9mKFwiLlwiKSBpcyAwICMgRXhjbHVkZSBkb3RmaWxlc1xuICAgIHJldHVybiB0cnVlICMgRXZlcnl0aGluZyBlbHNlIGlzIGdvb2RcblxuICB0b3VjaGVkQXNzZXRzID0ge31cblxuICB1cGRhdGUgPSBBRFNSIDEwMCwgMTAwMCwgKCktPlxuICAgIGZvciBhc3NldElkIG9mIHRvdWNoZWRBc3NldHNcbiAgICAgIEpvYiA1MCwgXCJXYXRjaGVkIEFzc2V0IFJlbG9hZFwiLCBhc3NldElkXG4gICAgdG91Y2hlZEFzc2V0cyA9IHt9XG5cbiAgSm9iLmhhbmRsZXIgXCJXYXRjaGVkIEFzc2V0IFJlbG9hZFwiLCAoYXNzZXRJZCktPlxuICAgIGFzc2V0c0ZvbGRlciA9IE1lbW9yeSBcImFzc2V0c0ZvbGRlclwiXG4gICAgcGF0aCA9IFJlYWQucGF0aCBhc3NldHNGb2xkZXIsIGFzc2V0SWRcbiAgICBpZiBhd2FpdCBSZWFkLmlzRm9sZGVyIHBhdGhcbiAgICAgIGFzc2V0ID0gTWVtb3J5LmNsb25lIFwiYXNzZXRzLiN7YXNzZXRJZH1cIlxuICAgICAgYXNzZXQgPz0gQXNzZXQubmV3IHBhdGhcbiAgICAgIExvZyBcIlJlbG9hZGluZyBBc3NldDogI3thc3NldElkfVwiLCBjb2xvcjogXCJoc2woMzMzLCA1MCUsIDUwJSlcIlxuICAgICAgcHJldk5ld1Nob3QgPSBhc3NldC5uZXdTaG90XG4gICAgICBhd2FpdCBBc3NldC5sb2FkRmllbGRzIGFzc2V0XG4gICAgICBMb2cgYXNzZXQubmV3U2hvdCwgYmFja2dyb3VuZDogXCJoc2woMTUwLCA2MCUsIDYwJSlcIlxuICAgICAgTG9nIHByZXZOZXdTaG90LCBiYWNrZ3JvdW5kOiBcImhzbCgyNTAsIDEwMCUsIDgwJSlcIlxuICAgICAgaWYgYXNzZXQubmV3U2hvdCBpc250IHByZXZOZXdTaG90XG4gICAgICAgIGF3YWl0IEpvYiAxLCBcIlJlYnVpbGQgQXNzZXQgVGh1bWJuYWlsXCIsIGFzc2V0LCB0cnVlXG4gICAgICBhd2FpdCBKb2IgMSwgXCJSZWJ1aWxkIEZpbGUgVGh1bWJuYWlsc1wiLCBhc3NldCwgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGFzc2V0ID0gbnVsbFxuICAgIE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCIsIGFzc2V0XG5cbiAgY2hhbmdlID0gKGV2ZW50VHlwZSwgZnVsbFBhdGgpLT5cbiAgICBhc3NldHNGb2xkZXIgPSBNZW1vcnkgXCJhc3NldHNGb2xkZXJcIlxuICAgIHBhdGhXaXRoaW5Bc3NldHNGb2xkZXIgPSBmdWxsUGF0aC5yZXBsYWNlIGFzc2V0c0ZvbGRlciwgXCJcIlxuICAgIGFzc2V0SWQgPSBBcnJheS5maXJzdCBSZWFkLnNwbGl0IHBhdGhXaXRoaW5Bc3NldHNGb2xkZXJcbiAgICByZXR1cm4gdW5sZXNzIHZhbGlkRmlsZU5hbWUgYXNzZXRJZFxuICAgIHJldHVybiB1bmxlc3MgdmFsaWRGaWxlTmFtZSBBcnJheS5sYXN0IFJlYWQuc3BsaXQgZnVsbFBhdGhcbiAgICAjIExvZyBcIkRpc2sgV2F0Y2hlcjogI3twYXRoV2l0aGluQXNzZXRzRm9sZGVyfVwiLCBjb2xvcjogXCJoc2woMzMzLCA1MCUsIDUwJSlcIlxuICAgICMgV2UnbGwganVzdCByZWxvYWQgdGhlIHdob2xlIGFzc2V0LiBUaGlzIGlzIHNpbXBsZXIgdGhhbiB0cnlpbmcgdG8gdHJhY2sgZXhhY3RseSB3aGljaCBwYXRocyBoYXZlIGNoYW5nZWQsXG4gICAgIyBhbmQgdGhlIHBlcmZvcm1hbmNlIG92ZXJoZWFkIHdpbGwgYmUgZWZmZWN0aXZlbHkgaW52aXNpYmxlIChsaWtlbHkgbGVzcyB0aGFuIDFtcyBldmVuIG9uIGdpYW50IGFzc2V0cykuXG4gICAgdG91Y2hlZEFzc2V0c1thc3NldElkXSA9IHRydWVcbiAgICB1cGRhdGUoKVxuXG5cbiAgc2V0dXAgPSAoKS0+XG4gICAgd2F0Y2hlcj8uY2xvc2UoKVxuICAgIHRvdWNoZWRBc3NldHMgPSB7fSAjIENsZWFyIGFueSBjaGFuZ2VzIHF1ZXVlZCB1cCBmb3IgdGhlIGRlYm91bmNlZCB1cGRhdGUsIHNpbmNlIHRoZXknbGwgbm8gbG9uZ2VyIHJlc29sdmUgcHJvcGVybHlcbiAgICBhc3NldHNGb2xkZXIgPSBNZW1vcnkgXCJhc3NldHNGb2xkZXJcIlxuICAgIGlmIGFzc2V0c0ZvbGRlcj9cbiAgICAgIHdhdGNoZXIgPSBSZWFkLndhdGNoIGFzc2V0c0ZvbGRlciwge3JlY3Vyc2l2ZTogdHJ1ZSwgcGVyc2lzdGVudDogZmFsc2V9LCBjaGFuZ2VcblxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgXCJhc3NldHNGb2xkZXJcIiwgdHJ1ZSwgc2V0dXBcblxuXG5cbiMgZGIvc3Vic2NyaXB0aW9ucy93cml0ZS1hc3NldHMuY29mZmVlXG5cblxuXG5cblxuIyBIYXZpbmcgYSBzeXN0ZW0gdGhhdCBhdXRvbWF0aWNhbGx5IHJlc3BvbmRzIHRvIGNoYW5nZXMgaW4gYW4gYXNzZXQgaW4gbWVtb3J5XG4jIGJ5IHdyaXRpbmcgdGhlbSB0byBkaXNrIGlzIHJpc2t5LiBXZSBjb3VsZCBlbmQgdXAgaW4gc2l0dWF0aW9ucyB3aGVyZSB3YXRjaC1hc3NldHNcbiMgbm90aWNlcyBzb21lIGNoYW5nZXMsIHRyaWdnZXJzIGEgcmVsb2FkLCB0aGVuIHRoZSByZWxvYWQgaGFwcGVucyBhbmQgdGhhdCBjaGFuZ2VzIHRoZSBhc3NldCBpbiBtZW1vcnksXG4jIHRoZW4gd3JpdGUtYXNzZXRzIGlzIHRyaWdnZXJlZCwgdGhlbiBpdCBjaGVja3MgdGhlIGRpc2sgYW5kIGluIHRoZSB0aW1lIGJldHdlZW4gdGhlIHJlbG9hZFxuIyBhbmQgd3JpdGUtYXNzZXRzIHJ1bm5pbmcsIHRoZSBkaXNrIGhhcyBjaGFuZ2VkIGFnYWluIChlZzogZHVlIHRvIGRyb3Bib3gpLCBzbyB3cml0ZS1hc3NldHMgZW5kcyB1cFxuIyBjbG9iYmVyaW5nIGRyb3Bib3guIFRoYXQncyBiYWQuXG5cbiMgV2Ugc2hvdWxkIHByb2JhYmx5IG1ha2UgaXQgc28gdGhhdCBhbnl0aGluZyB0aGF0IGNoYW5nZXMgc29tZSBkYXRhIGluc2lkZSBhbiBhc3NldCBuZWVkcyB0byB0ZWxsXG4jIGJvdGggbWVtb3J5IGFuZCB0aGUgZGlzayB0byB1cGRhdGUuIFdlIHVwZGF0ZSBtZW1vcnkgc28gdGhhdCB0aGUgR1VJIGNhbiB1cGRhdGUgcmlnaHQgYXdheS4gV2UgYWxzb1xuIyBtYW51YWxseSB0ZWxsIHRoZSBkaXNrIHRvIHVwZGF0ZSAodmlhIHNvbWUgUG9ydHMgY2FsbCwgb2YgY291cnNlKSBpbnN0ZWFkIG9mIHJlbHlpbmcgb24gc29tZXRoaW5nIGxpa2VcbiMgd3JpdGUtYXNzZXRzLCBzbyB0aGF0IHdlIGhhdmUgYSBzZW5zZSBvZiBwcm92ZW5hbmNlIGZvciBjaGFuZ2VzLCBhbmQgc28gdGhhdCB3ZSBlcnIgb24gdGhlIHNpZGUgb2ZcbiMgbWlzc2luZyB3cml0ZXMgdG8gdGhlIGRpc2sgKHdoaWNoIGlzIGxlc3MgYmFkKSBpbnN0ZWFkIG9mIHdyaXRpbmcgdGhpbmdzIHdlIGRpZG4ndCBtZWFuIHRvIHdyaXRlXG4jICh3aGljaCBpcyB3b3JzZSwgYmVjYXVzZSBpdCBjYW4gY2F1c2UgaW5hZHZlcnRhbnQgZGVsZXRpb25zKS5cblxuIyBBbHNvLCB0aGUgZGlzayB1cGRhdGVzIHNob3VsZCBiZSAqc3luYyogc28gdGhhdCBpZiB0aGVyZSdzIGEgYnVuY2ggb2YgY2hhbmdlcyB0aGF0IG5lZWQgdG8gYmVcbiMgcGVyc2lzdGVkIGluZGl2aWR1YWxseSwgd2UgZG9uJ3QgZW5kIHVwIGludGVybGVhdmluZyB0aGUgd3JpdGVzIGFuZCB3YXRjaC1hc3NldHMgcmVhZHMuXG4jIEJ5IGRvaW5nIGEgYnVuY2ggb2Ygd3JpdGVzIGluIHN5bmMsIHRoYXQncyBiYXNpY2FsbHkgbGlrZSBwdXR0aW5nIHRoZSB3cml0ZXMgaW5zaWRlIGEgdHJhbnNhY3Rpb24uXG4jICpJZiogd2Ugbm90aWNlIHBlcmZvcm1hbmNlIGlzc3Vlcywgd2UgY2FuIGNvbWUgdXAgd2l0aCBzb21ldGhpbmcgbW9yZSBlbGFib3JhdGUgdG8gbWFrZSBhc255YyB3cml0aW5nXG4jIHdvcmsgKGVnOiBieSBwYXVzaW5nIHdhdGNoLWFzc2V0cyBvciBzb21ldGhpbmcpXG5cblxuXG5cblxuXG5cblxuXG4jIFRha2UgW1wiQURTUlwiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlJlYWRcIiwgXCJXcml0ZVwiXSwgKEFEU1IsIExvZywgTWVtb3J5LCBSZWFkLCBXcml0ZSktPlxuI1xuIyAgIGVuYWJsZWQgPSBmYWxzZVxuIyAgIGNoYW5nZWQgPSB7fVxuIyAgIHBlcm1pdHRlZEtleXMgPSBuYW1lOiBcIk5hbWVcIiwgc2hvdDogXCJTaG90XCIsIHRhZ3M6IFwiVGFnc1wiIywgZmlsZXM6IFwiRmlsZXNcIlxuI1xuIyAgIHVwZGF0ZSA9IEFEU1IgMSwgMSwgKCktPlxuIyAgICAgZm9yIGlkLCBjaGFuZ2VzIG9mIGNoYW5nZWRcbiMgICAgICAgaWYgY2hhbmdlcz8gdGhlbiB1cGRhdGVBc3NldCBpZCwgY2hhbmdlcyBlbHNlIGRlbGV0ZUFzc2V0IGlkXG4jICAgICBjaGFuZ2VkID0ge31cbiNcbiMgICBkZWxldGVBc3NldCA9IChpZCktPlxuIyAgICAgTG9nIFwiRGVsZXRpbmcgYXNzZXQ/XCJcbiMgICAgIHJldHVybiB1bmxlc3MgaWQ/Lmxlbmd0aCA+IDBcbiMgICAgIGFzc2V0c0ZvbGRlciA9IE1lbW9yeSBcImFzc2V0c0ZvbGRlclwiXG4jICAgICBwYXRoID0gUmVhZC5wYXRoIGFzc2V0c0ZvbGRlciwgaWRcbiMgICAgIGlmIFJlYWQocGF0aCk/XG4jICAgICAgIFdyaXRlLnN5bmMucm0gcGF0aFxuI1xuIyAgIHVwZGF0ZUFzc2V0ID0gKGlkLCBjaGFuZ2VzKS0+XG4jICAgICBmb3IgaywgdiBvZiBjaGFuZ2VzXG4jICAgICAgIGZvbGRlciA9IHBlcm1pdHRlZEtleXNba11cbiMgICAgICAgY29udGludWUgdW5sZXNzIGZvbGRlciAjIFRoZSBjaGFuZ2Ugd2FzIGFuIGFzc2V0IHByb3BlcnR5IHRoYXQgZG9lc24ndCBnZXQgc2F2ZWRcbiMgICAgICAgaWYgdj9cbiMgICAgICAgICB1cGRhdGVQcm9wZXJ0eSBpZCwgZm9sZGVyLCB2XG4jICAgICAgIGVsc2VcbiMgICAgICAgICBkZWxldGVQcm9wZXJ0eSBpZCwgZm9sZGVyXG4jICAgICBudWxsXG4jXG4jICAgdXBkYXRlUHJvcGVydHkgPSAoaWQsIGZvbGRlciwgdiktPlxuIyAgICAgdiA9IFt2XSB1bmxlc3MgdiBpbnN0YW5jZW9mIEFycmF5XG4jICAgICBhc3NldHNGb2xkZXIgPSBNZW1vcnkgXCJhc3NldHNGb2xkZXJcIlxuIyAgICAgcGF0aCA9IFJlYWQucGF0aCBhc3NldHNGb2xkZXIsIGlkLCBmb2xkZXJcbiMgICAgIFdyaXRlLnN5bmMuYXJyYXkgcGF0aCwgdlxuI1xuIyAgIGRlbGV0ZVByb3BlcnR5ID0gKGlkLCBmb2xkZXIpLT5cbiMgICAgIGFzc2V0c0ZvbGRlciA9IE1lbW9yeSBcImFzc2V0c0ZvbGRlclwiXG4jICAgICBwYXRoID0gUmVhZC5wYXRoIGFzc2V0c0ZvbGRlciwgaWQsIGZvbGRlclxuIyAgICAgY3VycmVudCA9IFJlYWQgcGF0aFxuIyAgICAgcmV0dXJuIHVubGVzcyBjdXJyZW50Py5sZW5ndGggPiAwXG4jICAgICBwYXRoID0gUmVhZC5wYXRoIHBhdGgsIGN1cnJlbnRbMF0gaWYgY3VycmVudC5sZW5ndGggaXMgMVxuIyAgICAgV3JpdGUuc3luYy5ybSBwYXRoXG4jXG4jICAgTWVtb3J5LnN1YnNjcmliZSBcImFzc2V0c1wiLCBmYWxzZSwgKGFzc2V0cywgY2hhbmdlZEFzc2V0cyktPlxuIyAgICAgcmV0dXJuIHVubGVzcyBlbmFibGVkICMgUGVyc2lzdGluZyBjaGFuZ2VzIHdpbGwgYmUgcGF1c2VkIGR1cmluZyBiaWcgbG9hZHNcbiMgICAgIGNvbnNvbGUubG9nIFwiV1JJVElOR1wiLCBPYmplY3QuY2xvbmUgY2hhbmdlZEFzc2V0c1xuIyAgICAgY2hhbmdlZCA9IE9iamVjdC5tZXJnZSBjaGFuZ2VkLCBjaGFuZ2VkQXNzZXRzXG4jICAgICB1cGRhdGUoKVxuI1xuIyAgIE1ha2UgXCJXcml0ZUFzc2V0c1wiLCBXcml0ZUFzc2V0cyA9XG4jICAgICBlbmFibGU6IChlbmFibGUgPSB0cnVlKS0+IGVuYWJsZWQgPSBlbmFibGVcblxuXG5cbiMgZGIvdGh1bWJuYWlscy9qb2ItcmVidWlsZC1hc3NldC10aHVtYm5haWwuY29mZmVlXG5UYWtlIFtcIkpvYlwiLCBcIkxvZ1wiLCBcIlBhdGhzXCIsIFwiUmVhZFwiLCBcIlRodW1ibmFpbFwiLCBcIldyaXRlXCJdLCAoSm9iLCBMb2csIFBhdGhzLCBSZWFkLCBUaHVtYm5haWwsIFdyaXRlKS0+XG5cbiAgSm9iLmhhbmRsZXIgXCJSZWJ1aWxkIEFzc2V0IFRodW1ibmFpbFwiLCAoYXNzZXQsIG92ZXJ3cml0ZSA9IGZhbHNlKS0+XG4gICAgbXNnID0gXCJUaHVtYm5haWxzIGZvciAje2Fzc2V0LmlkfSDigJRcIlxuXG4gICAgaWYgbm90IG92ZXJ3cml0ZVxuICAgICAgaGFzMTI4ID0gUmVhZC5zeW5jLmV4aXN0cyBQYXRocy50aHVtYm5haWwgYXNzZXQsIFwiMTI4LmpwZ1wiXG4gICAgICBoYXM1MTIgPSBSZWFkLnN5bmMuZXhpc3RzIFBhdGhzLnRodW1ibmFpbCBhc3NldCwgXCI1MTIuanBnXCJcbiAgICAgIGlmIGhhczEyOCBhbmQgaGFzNTEyXG4gICAgICAgIExvZyBcIiN7bXNnfSBhbHJlYWR5IGV4aXN0IDopXCIsIGNvbG9yOiBcImhzbCgzMzAsIDU1JSwgNTAlKVwiICMgdmlvbGV0XG4gICAgICAgIHJldHVyblxuXG4gICAgaWYgYXNzZXQubmV3U2hvdD9cbiAgICAgIHBhdGggPSBQYXRocy5uZXdTaG90IGFzc2V0XG4gICAgICBoYXMxMjggPSBhd2FpdCBUaHVtYm5haWwgYXNzZXQsIHBhdGgsIDEyOFxuICAgICAgaGFzNTEyID0gYXdhaXQgVGh1bWJuYWlsIGFzc2V0LCBwYXRoLCA1MTJcbiAgICAgIExvZyBcIiN7bXNnfSB1c2luZyBuZXcgc2hvdCA8M1wiLCBcImhzbCgyMjAsIDUwJSwgNTAlKVwiICMgYmx1ZVxuICAgICAgcmV0dXJuXG5cbiAgICAjIE5vIHNwZWNpZmllZCBzaG90LCBhdHRlbXB0IHRvIHVzZSBhIHJhbmRvbSBmaWxlLlxuICAgIGlmIGFzc2V0LmZpbGVzPy5jb3VudCA+IDBcbiAgICAgIGZvciBmaWxlIGluIGFzc2V0LmZpbGVzLmNoaWxkcmVuXG4gICAgICAgIExvZyBcIiN7bXNnfSB0cnlpbmcgZmlsZXMuLi4gI3tmaWxlLm5hbWV9XCJcbiAgICAgICAgaWYgYXdhaXQgVGh1bWJuYWlsIGFzc2V0LCBmaWxlLnBhdGgsIDEyOFxuICAgICAgICAgIGlmIGF3YWl0IFRodW1ibmFpbCBhc3NldCwgZmlsZS5wYXRoLCA1MTJcbiAgICAgICAgICAgIExvZyBcIiN7bXNnfSB1c2VkIGZpbGUgI3tmaWxlLm5hbWV9IDp9XCIsIGNvbG9yOiBcImhzbCgxODAsIDEwMCUsIDI5JSlcIiAjIHRlYWxcbiAgICAgICAgICAgIHJldHVybiBjYXB0dXJlTmV3U2hvdCBhc3NldCwgZmlsZS5wYXRoICMgc3VjY2Vzc1xuXG4gICAgTG9nIFwiI3ttc2d9IG5vIGRpY2UgOihcIiwgY29sb3I6IFwiaHNsKDI1LCAxMDAlLCA1OSUpXCIgIyBvcmFuZ2VcbiAgICBudWxsXG5cblxuICBjYXB0dXJlTmV3U2hvdCA9IChhc3NldCwgc2hvdEZpbGUpLT5cbiAgICAjIFdlIHdhbnQgdG8gc2hvdyB3aGljaCBmaWxlIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSB0aHVtYm5haWwuXG4gICAgIyBUaGUgc2ltcGxlc3QgdGhpbmcgaXMganVzdCB0byBtYWtlIGEgY29weSBvZiB0aGUgc291cmNlIGZpbGUgYW5kIHNhdmUgaXQuXG4gICAgIyBUaGF0IHdheSwgd2UgZG9uJ3QgbmVlZCB0byB3b3JyeSBhYm91dCB3aGF0IGhhcHBlbnMgaWYgdGhlIHNvdXJjZSBmaWxlIGlzIHJlbmFtZWRcbiAgICAjIG9yIGRlbGV0ZWQgb3Igd2hhdGV2ZXIg4oCUIHdlIGhhdmUgb3VyIGNvcHkgb2YgdGhlIHNob3QsIGFuZCB0aGUgdXNlciBjYW4gc2VlIHdoYXRcbiAgICAjIGZpbGUgd2FzIHVzZWQgKGJlY2F1c2UgdGhlIGZpbGVuYW1lIHdpbGwgYmUgdGhlcmUgdG9vIOKAlCBnb29kIGVub3VnaCkgYW5kIGlmIHRoZVxuICAgICMgdXNlciBkZWxldGVkIHRoYXQgb3JpZ2luYWwgZmlsZSBhbmQgd2FudHMgdGhlIHNob3QgdG8gY2hhbmdlLCB0aGV5IGNhbiBqdXN0IGNoYW5nZVxuICAgICMgdGhlIHNob3QsIGdvb2QgZW5vdWdoLlxuICAgIG5ld1Nob3RzRm9sZGVyID0gUGF0aHMubmV3U2hvdHMgYXNzZXRcbiAgICBXcml0ZS5zeW5jLm1rZGlyIG5ld1Nob3RzRm9sZGVyXG4gICAgZm9yIGZpbGUgaW4gUmVhZCBuZXdTaG90c0ZvbGRlclxuICAgICAgV3JpdGUuc3luYy5ybSBmaWxlXG4gICAgV3JpdGUuc3luYy5jb3B5RmlsZSBzaG90RmlsZSwgUmVhZC5wYXRoIG5ld1Nob3RzRm9sZGVyLCBSZWFkLmxhc3Qgc2hvdEZpbGVcblxuXG5cbiMgZGIvdGh1bWJuYWlscy9qb2ItcmVidWlsZC1maWxlLXRodW1ibmFpbHMuY29mZmVlXG5UYWtlIFtcIkZpbGVUcmVlXCIsIFwiSm9iXCIsIFwiTG9nXCIsIFwiTWVtb3J5XCIsIFwiUGF0aHNcIiwgXCJSZWFkXCIsIFwiVGh1bWJuYWlsXCIsIFwiV3JpdGVcIl0sIChGaWxlVHJlZSwgSm9iLCBMb2csIE1lbW9yeSwgUGF0aHMsIFJlYWQsIFRodW1ibmFpbCwgV3JpdGUpLT5cblxuICBKb2IuaGFuZGxlciBcIlJlYnVpbGQgRmlsZSBUaHVtYm5haWxzXCIsIChhc3NldCktPlxuICAgIHJldHVybiB1bmxlc3MgYXNzZXQ/XG5cbiAgICBuZWVkZWQgPSB7fVxuICAgIGZvciBmaWxlIGluIEZpbGVUcmVlLmZsYXQgYXNzZXQuZmlsZXNcbiAgICAgIHRodW1iID0gUGF0aHMudGh1bWJuYWlsTmFtZSBmaWxlLCAyNTZcbiAgICAgIG5lZWRlZFt0aHVtYl0gPSBmaWxlXG5cbiAgICBpZiBleGlzdGluZyA9IFJlYWQgUGF0aHMudGh1bWJuYWlscyBhc3NldFxuICAgICAgZXhpc3RpbmcgPSBBcnJheS5tYXBUb09iamVjdCBleGlzdGluZ1xuICAgICAgZGVsZXRlIGV4aXN0aW5nW1wiMTI4LmpwZ1wiXSAjIFdlJ3JlIG9ubHkgaW50ZXJlc3RlZCBpbiB0aHVtYnMgZm9yIGZpbGVzLCBub3QgdGhlIGFzc2V0IGl0c2VsZi5cbiAgICAgIGRlbGV0ZSBleGlzdGluZ1tcIjUxMi5qcGdcIl1cbiAgICAgIHRvQ3JlYXRlID0gT2JqZWN0LnN1YnRyYWN0S2V5cyBleGlzdGluZywgbmVlZGVkXG4gICAgICB0b0RlbGV0ZSA9IE9iamVjdC5zdWJ0cmFjdEtleXMgbmVlZGVkLCBleGlzdGluZ1xuICAgIGVsc2VcbiAgICAgIHRvQ3JlYXRlID0gbmVlZGVkXG4gICAgICB0b0RlbGV0ZSA9IHt9XG5cbiAgICBmb3IgdGh1bWIgb2YgdG9EZWxldGVcbiAgICAgIExvZyBcIkRlbGV0ZSBGaWxlIFRodW1ibmFpbDogI3tQYXRocy50aHVtYm5haWwgYXNzZXQsIHRodW1ifVwiXG4gICAgICBXcml0ZS5zeW5jLnJtIFBhdGhzLnRodW1ibmFpbCBhc3NldCwgdGh1bWJcblxuICAgIHByb21pc2VzID0gZm9yIHRodW1iLCBmaWxlIG9mIHRvQ3JlYXRlIHdoZW4gZmlsZS5leHQ/IGFuZCBub3QgUGF0aHMuZXh0Lmljb25bZmlsZS5leHRdXG4gICAgICBUaHVtYm5haWwgYXNzZXQsIGZpbGUucGF0aCwgMjU2LCB0aHVtYlxuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwgcHJvbWlzZXNcblxuXG5cbiMgZGIvdGh1bWJuYWlscy90aHVtYm5haWwuY29mZmVlXG5UYWtlIFtcIkVudlwiLCBcIklQQ1wiLCBcIkpvYlwiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlBhdGhzXCIsIFwiUmVhZFwiLCBcIldyaXRlXCJdLCAoRW52LCBJUEMsIEpvYiwgTG9nLCBNZW1vcnksIFBhdGhzLCBSZWFkLCBXcml0ZSktPlxuXG4gIHByb21pc2VzID0ge31cblxuICBNYWtlLmFzeW5jIFwiVGh1bWJuYWlsXCIsIFRodW1ibmFpbCA9IChhc3NldCwgc291cmNlUGF0aCwgc2l6ZSwgZGVzdE5hbWUpLT5cbiAgICBleHQgPSBBcnJheS5sYXN0KHNvdXJjZVBhdGguc3BsaXQgXCIuXCIpLnRvTG93ZXJDYXNlKClcblxuICAgICMgV2UncmUgZ29pbmcgdG8gYmUgYXNrZWQgdG8gcHJldmlldyBhIGZldyBrbm93biBmb3JtYXRzIHByZXR0eSBvZnRlbixcbiAgICAjIGFuZCB3ZSBkb24ndCB5ZXQgaGF2ZSBhbnkgd2F5IHRvIHByZXZpZXcgdGhlbS4gVGhlIGNhbGxlciBzaG91bGQgdXNlIGFuIGljb24gaW5zdGVhZC5cbiAgICByZXR1cm4gaWYgUGF0aHMuZXh0Lmljb25bZXh0XVxuXG4gICAgYXNzZXRzRm9sZGVyID0gTWVtb3J5IFwiYXNzZXRzRm9sZGVyXCJcbiAgICBzdWJwYXRoID0gc291cmNlUGF0aC5yZXBsYWNlIGFzc2V0c0ZvbGRlciwgXCJcIlxuXG4gICAgZGVzdE5hbWUgPz0gXCIje3NpemV9LmpwZ1wiXG5cbiAgICBkZXN0UGF0aCA9IFBhdGhzLnRodW1ibmFpbCBhc3NldCwgZGVzdE5hbWVcblxuICAgIFdyaXRlLnN5bmMubWtkaXIgUGF0aHMudGh1bWJuYWlscyBhc3NldFxuXG4gICAgaGFuZGxlciA9IGlmIEVudi5pc01hYyBhbmQgUGF0aHMuZXh0LnNpcHNbZXh0XT8gdGhlbiBcIlNpcHNUaHVtYm5haWxcIiBlbHNlIFwiTmF0aXZlVGh1bWJuYWlsXCJcbiAgICBKb2IgMiwgaGFuZGxlciwgc291cmNlUGF0aCwgZGVzdFBhdGgsIHNpemUsIHN1YnBhdGhcblxuXG4gIGNoaWxkUHJvY2VzcyA9IG51bGxcblxuICBKb2IuaGFuZGxlciBcIlNpcHNUaHVtYm5haWxcIiwgKHNvdXJjZSwgZGVzdCwgc2l6ZSwgc3VicGF0aCktPlxuICAgIG5ldyBQcm9taXNlIChyZXNvbHZlKS0+XG4gICAgICBMb2cgXCJTaXBzIFRodW1ibmFpbDogI3tzb3VyY2V9XCJcbiAgICAgIGNoaWxkUHJvY2VzcyA/PSByZXF1aXJlIFwiY2hpbGRfcHJvY2Vzc1wiXG4gICAgICBjaGlsZFByb2Nlc3MuZXhlYyBcInNpcHMgLXMgZm9ybWF0IGpwZWcgLXMgZm9ybWF0T3B0aW9ucyA5MSAtWiAje3NpemV9IFxcXCIje3NvdXJjZX1cXFwiIC0tb3V0IFxcXCIje2Rlc3R9XFxcIlwiLCAoZXJyKS0+XG4gICAgICAgIGlmIGVycj9cbiAgICAgICAgICBoYW5kbGVFcnIgc3VicGF0aCwgZXJyXG4gICAgICAgICAgcmVzb2x2ZSBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXNvbHZlIGRlc3RcblxuXG4gIG5hdGl2ZUltYWdlID0gbnVsbFxuXG4gIEpvYi5oYW5kbGVyIFwiTmF0aXZlVGh1bWJuYWlsXCIsIChzb3VyY2UsIGRlc3QsIHNpemUsIHN1YnBhdGgpLT5cbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSktPlxuICAgICAgTG9nIFwiTmF0aXZlIFRodW1ibmFpbDogI3tzb3VyY2V9XCJcbiAgICAgIHRyeVxuICAgICAgICBuYXRpdmVJbWFnZSA/PSByZXF1aXJlKFwiZWxlY3Ryb25cIikubmF0aXZlSW1hZ2VcbiAgICAgICAgaW1hZ2UgPSBhd2FpdCBuYXRpdmVJbWFnZS5jcmVhdGVUaHVtYm5haWxGcm9tUGF0aCBzb3VyY2UsIHt3aWR0aDogc2l6ZSwgaGVpZ2h0OiBzaXplfVxuICAgICAgICBidWYgPSBpbWFnZS50b0pQRUcgOTFcbiAgICAgICAgV3JpdGUuc3luYy5maWxlIGRlc3QsIGJ1ZiAjIFRPRE86IFNob3VsZCBiZSBhc3luY1xuICAgICAgICByZXNvbHZlIGRlc3RcbiAgICAgIGNhdGNoIGVyclxuICAgICAgICBoYW5kbGVFcnIgc3VicGF0aCwgZXJyXG4gICAgICAgIHJlc29sdmUgbnVsbFxuXG5cbiAgZXJyQ291bnQgPSAwXG4gIGltcG9ydGFudEVycm9yTWVzc2FnZXMgPSBbXG4gICAgIyBBZGQgbWVzc2FnZXMgdG8gdGhpcyBsaXN0IGlmIHdlIHdhbnQgdG8gYWxlcnQgdGhlIHVzZXIgYWJvdXQgdGhlbS5cbiAgICAjIElmIG9uZSBvZiB0aGVzZSBtZXNzYWdlcyBvY2N1cnMsIHRoYXQgdXN1YWxseSBtZWFucyBlaXRoZXIgdGhlIGZpbGUgaXMgY29ycnVwdFxuICAgICMgKHNvIHRoZSB1c2VyIG91Z2h0IHRvIGludmVzdGlhZ2UgYW5kIGZpeCB0aGUgZmlsZSBpZiBwb3NzaWJsZSksIG9yIHRoZSBmaWxlXG4gICAgIyBpcyBpbiBhIGZvcm1hdCB0aGF0IHdlIGNhbid0IGdlbmVyYXRlIGEgdGh1bWJuYWlsIGZvciAoaW4gd2hpY2ggY2FzZSB0aGUgZmlsZVxuICAgICMgZXh0ZW5zaW9uIHNob3VsZCBiZSBhZGRlZCB0byBQYXRocy5leHQuaWNvbilcbiAgICBcIlVuYWJsZSB0byByZW5kZXIgZGVzdGluYXRpb24gaW1hZ2VcIlxuICBdXG4gIHVuaW1wb3J0YW50RXJyb3JNZXNzYWdlcyA9IFtcbiAgICAjIEFkZCBtZXNzYWdlcyB0byB0aGlzIGxpc3QgaWYgd2UgZG9uJ3Qgd2FudCB0byBib3RoZXIgYWxlcnRpbmcgdGhlIHVzZXIgYWJvdXQgdGhlbVxuICAgIFwiVW5hYmxlIHRvIHJldHJpZXZlIHRodW1ibmFpbCBwcmV2aWV3IGltYWdlIGZvciB0aGUgZ2l2ZW4gcGF0aFwiXG4gICAgXCJDYW5ub3QgZXh0cmFjdCBpbWFnZSBmcm9tIGZpbGVcIlxuICAgIFwiRmFpbGVkIHRvIGdldCB0aHVtYm5haWwgZnJvbSBsb2NhbCB0aHVtYm5haWwgY2FjaGUgcmVmZXJlbmNlXCJcbiAgXVxuXG4gIGhhbmRsZUVyciA9IChzdWJwYXRoLCBlcnIpLT5cbiAgICBMb2cuZXJyIFwiRXJyb3IgZ2VuZXJhdGluZyB0aHVtYm5haWwgZm9yICN7c3VicGF0aH06XFxuICN7ZXJyLnRvU3RyaW5nKCl9XCJcblxuICAgIGZvciBtZXNzYWdlIGluIHVuaW1wb3J0YW50RXJyb3JNZXNzYWdlc1xuICAgICAgaWYgLTEgaXNudCBlcnIubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YgbWVzc2FnZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIHJldHVyblxuXG4gICAgcmV0dXJuIGlmICsrZXJyQ291bnQgPiAzXG5cbiAgICBmb3IgbWVzc2FnZSBpbiBpbXBvcnRhbnRFcnJvck1lc3NhZ2VzXG4gICAgICBpZiAtMSBpc250IGVyci5tZXNzYWdlLnRvTG93ZXJDYXNlKCkuaW5kZXhPZiBtZXNzYWdlLnRvTG93ZXJDYXNlKClcbiAgICAgICAgYWxlcnQgPSBtZXNzYWdlXG4gICAgICAgIGJyZWFrXG5cbiAgICBhbGVydCA/PSBlcnIubWVzc2FnZVxuXG4gICAgSVBDLnNlbmQgXCJhbGVydFwiLCBtZXNzYWdlOiBcIkFuIGVycm9yIG9jY3VycmVkIHdoaWxlIGdlbmVyYXRpbmcgYSB0aHVtYm5haWwuIFBsZWFzZSBjYXB0dXJlIGEgc2NyZWVuc2hvdCBvZiB0aGlzIHBvcHVwIGFuZCBzZW5kIGl0IHRvIEl2YW4uIFxcblxcbiBUaGUgc291cmNlIGZpbGU6ICN7c3VicGF0aH0gXFxuXFxuIFRoZSBlcnJvcjogI3thbGVydH1cIlxuXG4gICAgaWYgZXJyQ291bnQgaXMgM1xuICAgICAgSVBDLnNlbmQgXCJhbGVydFwiLCBtZXNzYWdlOiBcIkl0IHNlZW1zIGxpa2UgdGhpcyBpcyBoYXBwZW5pbmcgYSBsb3QsIHNvIHdlIHdvbid0IHRlbGwgeW91IGFib3V0IGFueSBtb3JlIGZhaWx1cmVzLiBUbyBzZWUgdGhlbSBhbGwsIG9wZW4gdGhlIERlYnVnIExvZy5cIlxuIl19
//# sourceURL=coffeescript
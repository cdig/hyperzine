// browser/browser.coffee
Take(["Log", "Memory", "PubSub", "Render"], function(Log, Memory, {Pub, Sub}, Render) {
  Sub("Render", Render);
  return Memory.subscribe("assets", true, Render);
});

// browser/coffee/render.coffee
Take(["AssetCard", "ADSR", "DOOM", "Env", "Frustration", "Iterated", "Log", "Memory", "Search", "State"], function(AssetCard, ADSR, DOOM, Env, Frustration, Iterated, Log, Memory, Search, State) {
  var Render, assetCount, assetsToRender, elm, first, lastQuery, noAssets, rainbowClouds, renderCount, update;
  elm = document.querySelector("asset-list");
  noAssets = document.querySelector("no-assets");
  rainbowClouds = document.querySelector("rainbow-clouds");
  assetCount = document.querySelector("asset-count");
  renderCount = 1;
  assetsToRender = [];
  lastQuery = null;
  first = true;
  Render = ADSR(function() {
    var assets, hasResults, query;
    assets = Memory("assets");
    if (assets == null) {
      return;
    }
    if (first) {
      Log(`First Render ${Object.keys(assets).length}`);
    }
    first = false;
    query = State("search");
    if (query !== lastQuery) {
      lastQuery = query;
      elm.scrollTo(0, 0);
      AssetCard.unbuildCards();
    }
    AssetCard.clearIndexes();
    assetsToRender = Search(assets, query);
    hasResults = assetsToRender.length > 0;
    elm.replaceChildren();
    if (hasResults) {
      update();
    }
    DOOM(assetCount, {
      innerHTML: String.pluralize(assetsToRender.length, "%% <span>Asset") + "</span>"
    });
    DOOM(noAssets, {
      display: hasResults ? "none" : "block"
    });
    if (Env.isMac) {
      DOOM(rainbowClouds, {
        display: hasResults ? "none" : "block"
      });
      rainbowClouds.style.animationPlayState = hasResults ? "paused" : "playing";
    }
    if (!hasResults) {
      // Log renderCount
      DOOM(noAssets.querySelector("h1"), {
        textContent: Frustration(renderCount)
      });
    }
    return renderCount++;
  });
  update = Iterated(5, function(more) {
    var asset, card, frag, i, j, len;
    frag = new DocumentFragment();
    for (i = j = 0, len = assetsToRender.length; j < len; i = ++j) {
      asset = assetsToRender[i];
      if (!(asset)) {
        continue;
      }
      card = AssetCard(asset, i);
      assetsToRender[i] = null;
      DOOM.append(frag, card);
      if (!more()) {
        break;
      }
    }
    return DOOM.append(elm, frag);
  });
  return Make("Render", Render);
});

// browser/coffee/search.coffee
Take(["Env"], function(Env) {
  var Search, bail, computePoints, matchesOp, matchesToken, sortByName, tokenizeQuery;
  sortByName = function(a, b) {
    return a.name.localeCompare(b.name);
  };
  bail = function(assets) {
    return Object.values(assets).sort(sortByName);
  };
  matchesToken = function(value, token) {
    return (value != null ? value.length : void 0) > 0 && (token != null ? token.length : void 0) > 0 && -1 !== value.indexOf(token);
  };
  matchesOp = function(ref, op) {
    return (op == null) || op === ref;
  };
  tokenizeQuery = function(input) {
    var j, len, normalizedToken, output, token, tokens;
    tokens = input.split(" ").map(function(token) {
      if (token.charAt(0) === "-" || token.indexOf(":-") !== -1) {
        return token; // negated tokens are not split on common dash-like punctuation
      } else {
        return token.split(/[-_]+/g); // positive tokens are split on common dash-like punctuations
      }
    }).flat().map(function(t) {
      return t.replace(/[^\w\d-_:]*/g, "");
    }).filter(function(t) {
      return t !== "" && t !== "-";
    });
    // Remove redundant tokens, including mixed negations
    output = {};
    for (j = 0, len = tokens.length; j < len; j++) {
      token = tokens[j];
      normalizedToken = token.replace(/^-/, "");
      if (output[normalizedToken] == null) {
        output[normalizedToken] = token;
      }
    }
    return Object.values(output);
  };
  computePoints = function(asset, queryTokens, input) {
    var ext, file, frac, j, k, l, len, len1, len2, len3, len4, m, n, op, points, ref1, ref2, ref3, ref4, token, tokenPoints;
    points = 0;
    if (asset.search.id === input) {
      // We'll do any exact-match checking up here
      points += 16;
    }
    if (asset.search.name === input) {
      points += 16;
    }
    for (j = 0, len = queryTokens.length; j < len; j++) {
      token = queryTokens[j];
      if (token.indexOf(":") !== -1) {
        [op, token] = token.split(":");
      }
      if (op === "" || token === "") {
        // Ignore empty operators
        continue;
      }
      if ("-" === token.charAt(0) || "-" === (op != null ? op.charAt(0) : void 0)) {
        token = token.slice(1);
        if (matchesOp("id", op) && matchesToken(asset.id, token)) {
          // If the asset matches any negative token, it fails the entire query
          return 0;
        }
        if (matchesOp("name", op) && matchesToken(asset.search.name, token)) {
          return 0;
        }
        if (matchesOp("tag", op) && matchesToken(asset.search.tags, token)) {
          return 0;
        }
        if (matchesOp("file", op)) {
          ref1 = asset.search.files;
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            file = ref1[k];
            if (matchesToken(file, token)) {
              return 0;
            }
          }
        }
        if (matchesOp("ext", op)) {
          ref2 = asset.search.exts;
          for (l = 0, len2 = ref2.length; l < len2; l++) {
            ext = ref2[l];
            if (matchesToken(ext, token)) {
              return 0;
            }
          }
        }
      } else {
        tokenPoints = 0;
        if (matchesOp("id", op) && matchesToken(asset.search.id, token)) {
          tokenPoints += 2;
        }
        if (matchesOp("name", op) && matchesToken(asset.search.name, token)) {
          tokenPoints += 2;
        }
        if (matchesOp("tag", op) && matchesToken(asset.search.tags, token)) {
          tokenPoints += 1;
        }
        if (matchesOp("file", op)) {
          frac = 1 / asset.search.files.length;
          ref3 = asset.search.files;
          for (m = 0, len3 = ref3.length; m < len3; m++) {
            file = ref3[m];
            if (matchesToken(file, token)) {
              tokenPoints += frac;
            }
          }
        }
        if (matchesOp("ext", op)) {
          frac = 1 / asset.search.exts.length;
          ref4 = asset.search.exts;
          for (n = 0, len4 = ref4.length; n < len4; n++) {
            ext = ref4[n];
            if (matchesToken(ext, token)) {
              tokenPoints += frac;
            }
          }
        }
        if (tokenPoints === 0) {
          // If the asset doesn't match every positive token, it fails the entire query
          return 0;
        }
        points += tokenPoints;
      }
    }
    return points;
  };
  Make("Search", Search = function(assets, input) {
    var asset, id, j, key, len, points, queryTokens, rankedMatches, ref1, sortedAssets, sortedRank;
    if (input == null) {
      return bail(assets);
    }
    if (input instanceof Array) {
      input = input.join(" ");
    }
    input = input.toLowerCase();
    queryTokens = tokenizeQuery(input);
    if (queryTokens.length === 0) {
      return bail(assets);
    }
    rankedMatches = {};
    for (id in assets) {
      asset = assets[id];
      points = computePoints(asset, queryTokens, input);
      if (points > 0) { // asset matched all positive tokens, and no negative tokens
        points = Math.roundTo(points, .1);
        asset._points = points;
        (rankedMatches[points] != null ? rankedMatches[points] : rankedMatches[points] = []).push(asset);
      }
    }
    sortedAssets = [];
    ref1 = Array.sortNumericDescending(Object.keys(rankedMatches).map(function(v) {
      return +v;
    }));
    for (j = 0, len = ref1.length; j < len; j++) {
      key = ref1[j];
      sortedRank = rankedMatches[key].sort(sortByName);
      sortedAssets = sortedAssets.concat(sortedRank);
    }
    return sortedAssets;
  });
  if (Env.isDev) {
    return Tests("Search", function() {
      Test("split queries on spaces, internal dashes, and underscores", ["f00", "BAR", "2baz", "bash"], tokenizeQuery("f00-BAR_2baz bash"));
      Test("preserve leading dashes", tokenizeQuery("-f00"), ["-f00"]);
      Test("remove duplicate tokens, including redundant negations", tokenizeQuery("foo -bar foo -bar -foo bar"), ["foo", "-bar"]);
      Test("remove floating negatives", tokenizeQuery("- foo - -"), ["foo"]);
      Test("only split leading dashes on space", tokenizeQuery("-f00-BAR_2baz bash"), ["-f00-BAR_2baz", "bash"]);
      Test("remove punctuation, even when negated", tokenizeQuery("(foo) [bar]!@_#$%-^&*() -[baz]!@_baz#$%^&*()"), ["foo", "bar", "-baz_baz"]);
      Test("empty value does not match", matchesToken("", "foo"), false);
      Test("empty token does not match", matchesToken("foo", ""), false);
      Test("different token and value do not match", matchesToken("foo", "bar"), false);
      Test("same token does match", matchesToken("foo", "foo"), true);
      Test("value containing token does match", matchesToken("foo", "f"), true);
      Test("value containing only part of the token does not", matchesToken("f", "foo"), false);
      Test("null op always matches", matchesOp("foo", null), true);
      Test("same op does match", matchesOp("foo", "foo"), true);
      Test("different op does not match", matchesOp("foo", "bar"), false);
      Test("zero points for an empty asset", computePoints({
        search: {
          id: "",
          name: "",
          tags: "",
          files: [],
          exts: []
        }
      }, ["foo"], "foo"), 0);
      Test("positive points for a basic match", computePoints({
        search: {
          id: "",
          name: "foo bar",
          tags: "",
          files: [],
          exts: []
        }
      }, ["foo"], "foo"), 2);
      Test("more points for a better match", computePoints({
        search: {
          id: "",
          name: "foo bar",
          tags: "foo",
          files: ["foo"],
          exts: []
        }
      }, ["foo"], "foo"), 4);
      Test("more points for an exact match", computePoints({
        search: {
          id: "exactly 123",
          name: "",
          tags: "",
          files: [],
          exts: []
        }
      }, ["exactly", "123"], "exactly 123"), 20);
      Test("zero points for an partial match", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "foo",
          files: ["foo"],
          exts: []
        }
      }, ["foo", "bar"], "foo bar"), 0);
      Test("zero points for a negative match", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "foo",
          files: ["foo"],
          exts: []
        }
      }, ["-foo"], "-foo"), 0);
      Test("zero points for a mixed match", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "foo",
          files: ["bar"],
          exts: []
        }
      }, ["foo", "-bar"], "foo -bar"), 0);
      Test("positive points for a negative miss", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["foo", "-bar"], "foo -bar"), 2);
      Test("positive points for a match with an operator", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["name:foo"], "name:foo"), 2);
      Test("zero points for a negative match with an operator", computePoints({
        search: {
          id: "test",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["test", "name:-foo"], "test name:-foo"), 0);
      Test("ignore empty operators when scoring", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["foo", "name:", ":foo", ":"], "foo name: :foo :"), 2);
      Test("tags, files, and exts also match once each", computePoints({
        search: {
          id: "foo",
          name: "foo",
          tags: "",
          files: ["foo"],
          exts: ["foo"]
        }
      }, ["name:foo", "file:foo", "ext:foo"], "name:foo file:foo ext:foo"), computePoints({
        search: {
          id: "foo",
          name: "foo",
          tags: "",
          files: ["bar"],
          exts: ["baz"]
        }
      }, ["name:foo", "file:bar", "ext:baz"], "name:foo file:bar ext:baz"), 4);
      return Test("zero points for misses with an operator", computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["name:bar"], "name:bar"), computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["file:foo"], "file:foo"), computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["id:foo"], "id:foo"), computePoints({
        search: {
          id: "",
          name: "foo",
          tags: "",
          files: [],
          exts: []
        }
      }, ["ext:foo"], "ext:foo"), 0);
    });
  }
});

// browser/components/asset-card.coffee
Take(["DB", "DOOM", "Env", "Frustration", "IPC", "Log", "Memory", "MemoryField", "OnScreen", "Paths", "PubSub", "Read", "State", "TagList", "Validations"], function(DB, DOOM, Env, Frustration, IPC, Log, Memory, MemoryField, OnScreen, Paths, {Sub}, Read, State, TagList, Validations) {
  var AssetCard, assetChanged, build, cards, frustration, loadImage, onScreen, rebuildCard, unbuild, unloadImage, update;
  cards = {};
  unloadImage = function(card) {
    var ref1, ref2;
    if ((ref1 = card._img) != null) {
      if ((ref2 = ref1.style) != null) {
        ref2.display = "none";
      }
    }
    return card._loaded = false;
  };
  loadImage = function(card) {
    var asset, img, path, size;
    asset = card._asset;
    if (card._loaded) {
      card._img.style.display = "inline-block";
      return;
    }
    card._loaded = true;
    size = DOOM(document.body, "hideLabels") === "" ? 128 : 512;
    path = Paths.thumbnail(asset, `${size}.jpg?cachebust=${Math.randInt(0, 100000)}`);
    img = DOOM.create("img", null, {
      src: path,
      click: function() {
        return IPC.send("open-asset", asset.id);
      }
    });
    img.addEventListener("error", function() {
      return frustration(card, asset);
    });
    card._assetImageElm.replaceChildren(img);
    return card._img = img;
  };
  frustration = function(card, asset) {
    var hue, img;
    img = DOOM.create("div", null, {
      class: "frustration",
      click: function() {
        return IPC.send("open-asset", asset.id);
      }
    });
    DOOM.create("span", img, {
      textContent: Frustration(asset.hash)
    });
    hue = 71 * asset.hash % 360;
    img.style.setProperty("--lit", d3.lch(90, 30, hue));
    img.style.setProperty("--shaded", d3.lch(50, 70, hue));
    img.style.setProperty("--shadow", d3.lch(30, 90, hue));
    img.style.setProperty("--glow", d3.lch(120, 60, hue));
    img.style.setProperty("--bg", d3.lch(120, 20, hue));
    card._assetImageElm.replaceChildren(img);
    return card._img = img;
  };
  build = function(card) {
    var asset, assetName, fileCount, frag, label, searchPoints, tagList;
    card._built = true;
    frag = new DocumentFragment();
    asset = card._asset;
    if (card._assetImageElm == null) {
      card._assetImageElm = DOOM.create("asset-image");
    }
    frag.append(card._assetImageElm);
    label = DOOM.create("asset-label", frag);
    assetName = DOOM.create("asset-name", label, {
      class: "basic-field"
    });
    MemoryField(`assets.${asset.id}.name`, assetName, {
      validate: Validations.asset.name,
      update: function(v) {
        return DB.send("Rename Asset", asset.id, v);
      }
    });
    tagList = DOOM.create("tag-list", label);
    if (asset._points && Env.isDev) {
      searchPoints = DOOM.create("search-points", tagList, {
        textContent: String.pluralize(Math.roundTo(asset._points, .1), "%% Point")
      });
    }
    fileCount = DOOM.create("file-count", tagList, {
      textContent: String.pluralize(asset.files.count, "%% File")
    });
    tagList.append(TagList(asset, {
      click: function(tag, elm) {
        var current;
        current = State("search");
        if (!current) {
          return State("search", `tag:${tag}`);
        } else if (current.indexOf(tag) === -1) {
          return State("search", [current, `tag:${tag}`].join(" "));
        }
      }
    }));
    return card.replaceChildren(frag);
  };
  unbuild = function(card) {
    unloadImage(card);
    card._built = false;
    return card.replaceChildren();
  };
  update = function(card) {
    if (card._visible && !card._built) {
      build(card);
    }
    if (card._visible && !card._loaded) {
      loadImage(card);
    }
    if (!card._visible && card._loaded && ((card._index == null) || card._index > 100)) {
      return unloadImage(card);
    }
  };
  // The last part of this conditional (about _index) stops the results that are up near the search bar
  // from flickering as you type in a search (due to OnScreen quickly alternating between invisible and visible).
  // unbuild card if not card._visible and card._loaded and (not card._index? or card._index > 100)
  onScreen = function(card, visible) {
    card._visible = visible;
    return update(card);
  };
  assetChanged = function(card, assetId) {
    var cb;
    return cb = function(asset) {
      if (asset != null) {
        card._asset = asset;
        card._loaded = false;
        card._built = false;
        return update(card);
      } else {
        card.remove();
        delete cards[assetId];
        return Memory.unsubscribe(`assets.${assetId}`, cb);
      }
    };
  };
  rebuildCard = function(card, assetId) {
    return function() {
      return assetChanged(card, assetId)(Memory(`assets.${assetId}`));
    };
  };
  Make.async("AssetCard", AssetCard = function(asset, index) {
    var card;
    card = cards[asset.id];
    if (card == null) {
      card = cards[asset.id] = DOOM.create("asset-card");
      card._asset = asset;
      OnScreen(card, onScreen);
      Memory.subscribe(`assets.${asset.id}`, false, assetChanged(card, asset.id));
    }
    // This is for testing whether we see flashing
    // setInterval rebuildCard(card, asset.id), 500
    card._index = index;
    return card;
  });
  AssetCard.unbuildCards = function() {
    var assetId, card, results;
    results = [];
    for (assetId in cards) {
      card = cards[assetId];
      if (card._built && !card._visible) {
        results.push(unbuild(card));
      }
    }
    return results;
  };
  Sub("Unbuild Cards", AssetCard.unbuildCards);
  return AssetCard.clearIndexes = function() {
    var assetId, card, results;
    results = [];
    for (assetId in cards) {
      card = cards[assetId];
      results.push(card._index = null);
    }
    return results;
  };
});

// browser/components/asset-size.coffee
Take(["ADSR", "DOOM", "Memory", "PubSub"], function(ADSR, DOOM, Memory, {Pub}) {
  var newSize, oldSize, scroller, slider, update;
  newSize = 1;
  oldSize = 1;
  slider = document.querySelector("[asset-size]");
  scroller = document.querySelector("asset-list");
  update = ADSR(1, 1, function() {
    if (newSize === oldSize) {
      return;
    }
    document.body.style.setProperty("--browser-asset-size", newSize + "em");
    document.body.style.setProperty("--browser-label-size", (1 / newSize ** 0.5) + "em");
    DOOM(document.body, {
      hideLabels: newSize <= 0.5 ? "" : null
    });
    oldSize = newSize;
    scroller.scrollTo(0, 0);
    return Pub("Unbuild Cards");
  });
  update();
  slider.oninput = slider.onchange = function(e) {
    newSize = slider.value;
    Memory("browserThumbnailSize", newSize);
    return update();
  };
  return Memory.subscribe("browserThumbnailSize", true, function(v) {
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

// browser/components/new-asset.coffee
Take(["DB", "DOOM", "IPC", "Log", "Memory"], function(DB, DOOM, IPC, Log, Memory) {
  var elm;
  elm = document.querySelector("[new-asset]");
  return elm.onclick = function() {
    return DB.send("New Asset");
  };
});

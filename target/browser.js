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
    if (Function.notEquivalent(query, lastQuery)) {
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
  var Search, bail, computePoints, matchesOp, matchesToken, sortByName, tokenizeQueryText;
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
  tokenizeQueryText = function(input) {
    var tokens;
    tokens = input.split(/[\- —_:]+/g).map(function(t) { // input is split on typical separator chars
      return t.replace(/[^\w\d]*/g, ""); // remove special chars
    }).filter(function(t) {
      return t !== ""; // remove empty tokens
    });
    return Array.unique(tokens);
  };
  computePoints = function(asset, queryText, queryTokens, queryTags) {
    var ext, file, frac, j, k, l, len, len1, len2, len3, len4, len5, len6, m, n, o, p, points, queryTag, queryToken, ref1, ref2, ref3, ref4, ref5, tag, tagPart, tagPoints, tokenPoints;
    points = 0;
    if (asset.search.id === queryText) {
      // We'll do any exact-match checking up here
      return 100;
    }
    if (asset.search.name === queryText) {
      return 50;
    }
    for (j = 0, len = queryTokens.length; j < len; j++) {
      queryToken = queryTokens[j];
      tokenPoints = 0;
      if (matchesToken(asset.search.id, queryToken)) {
        tokenPoints += 2;
      }
      if (matchesToken(asset.search.name, queryToken)) {
        tokenPoints += 2;
      }
      ref1 = asset.search.tags;
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        tag = ref1[k];
        ref2 = tag.split(" ");
        for (l = 0, len2 = ref2.length; l < len2; l++) {
          tagPart = ref2[l];
          if (matchesToken(tagPart, queryToken)) {
            tokenPoints += 1;
          }
        }
      }
      frac = 1 / asset.search.files.length;
      ref3 = asset.search.files;
      for (m = 0, len3 = ref3.length; m < len3; m++) {
        file = ref3[m];
        if (matchesToken(file, queryToken)) {
          tokenPoints += frac;
        }
      }
      frac = 1 / asset.search.exts.length;
      ref4 = asset.search.exts;
      for (n = 0, len4 = ref4.length; n < len4; n++) {
        ext = ref4[n];
        if (matchesToken(ext, queryToken)) {
          tokenPoints += frac;
        }
      }
      if (tokenPoints === 0) {
        // If the asset doesn't match every queryToken, it fails the entire query
        return 0;
      }
      points += tokenPoints;
    }
    for (o = 0, len5 = queryTags.length; o < len5; o++) {
      queryTag = queryTags[o];
      tagPoints = 0;
      ref5 = asset.search.tags;
      for (p = 0, len6 = ref5.length; p < len6; p++) {
        tag = ref5[p];
        if (matchesToken(tag, queryTag)) {
          tagPoints += 2;
        }
      }
      if (tagPoints === 0) {
        // If the asset doesn't match every queryTag, it fails the entire query
        return 0;
      }
      points += tagPoints;
    }
    return points;
  };
  Make("Search", Search = function(assets, input) {
    var asset, id, j, key, len, points, queryTags, queryText, queryTokens, rankedMatches, ref1, sortedAssets, sortedRank;
    if (input == null) {
      return bail(assets);
    }
    queryText = input.text.toLowerCase();
    queryTokens = tokenizeQueryText(queryText);
    queryTags = input.tags.map(function(t) {
      return t.toLowerCase();
    });
    if (input.tagCandidate != null) {
      queryTags.push(input.tagCandidate.toLowerCase());
    }
    if (!(queryTokens.length > 0 || queryTags.length > 0)) {
      return bail(assets);
    }
    rankedMatches = {};
    for (id in assets) {
      asset = assets[id];
      points = computePoints(asset, queryText, queryTokens, queryTags);
      if (points > 0) { // asset matched all tokens
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
  // TESTS
  if (Env.isDev) {
    return Tests("Search", function() {
      Test("split queries on common separators", ["f00", "BAR", "2baz", "bash"], tokenizeQueryText("-f00-BAR_2baz  -  bash"));
      Test("remove duplicate tokens", tokenizeQueryText("foo-bar foo -bar foo bar"), ["foo", "bar"]);
      Test("remove punctuation", tokenizeQueryText("(foo) [bar]!@_#$%-^&*() -[baz]!@_baz#$%^&*()"), ["foo", "bar", "baz"]);
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
          id: "X",
          name: "X",
          tags: [],
          files: [],
          exts: []
        }
      }, "foo", ["foo"], []), 0);
      Test("positive points for a basic match", computePoints({
        search: {
          id: "X",
          name: "foo",
          tags: [],
          files: [],
          exts: []
        }
      }, "f", ["f"], []), 2);
      Test("positive points for a tag match", computePoints({
        search: {
          id: "X",
          name: "X",
          tags: ["baz"],
          files: [],
          exts: []
        }
      }, "", [], ["baz"]), 2);
      Test("partial points for a partial tag match", computePoints({
        search: {
          id: "X",
          name: "X",
          tags: ["bazinga"],
          files: [],
          exts: []
        }
      }, "baz", ["baz"], []), 1);
      Test("more points for a better match", computePoints({
        search: {
          id: "X",
          name: "foo bar",
          tags: ["bar"],
          files: ["foo"],
          exts: []
        }
      }, "foo", ["foo"], ["bar"]), 5);
      Test("more points for an exact match", computePoints({
        search: {
          id: "exactly 123",
          name: "X",
          tags: [],
          files: [],
          exts: []
        }
      }, "exactly 123", ["exactly", "123"], []), 100);
      Test("zero points for a partial match", computePoints({
        search: {
          id: "X",
          name: "foo",
          tags: [],
          files: ["foo"],
          exts: []
        }
      }, "foo bar", ["foo", "bar"], []), 0);
      Test("zero points for a partial match with tags too", computePoints({
        search: {
          id: "X",
          name: "foo",
          tags: ["bar"],
          files: ["foo"],
          exts: []
        }
      }, "foo baz", ["foo", "baz"], ["bar"]), 0);
      return Test("zero points for a partial match with only tags", computePoints({
        search: {
          id: "X",
          name: "X",
          tags: ["foo", "bar"],
          files: [],
          exts: []
        }
      }, "", [""], ["foo", "baz"]), 0);
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
    tagList.append(TagList(asset.tags, {
      click: function(tag, elm) {
        return console.log("TODO");
      }
    }));
    // current = State "search"
    // if not current
    //   State "search", "tag:#{tag}"
    // else if current.indexOf(tag) is -1
    //   State "search", [current, "tag:#{tag}"].join " "
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

// browser/components/search-box.coffee
Take(["Memory", "State", "SuggestionList", "TagList"], function(Memory, State, SuggestionList, TagList) {
  var chooseSuggestion, getSuggestions, input, removeTag, tagList, updateCandidate;
  getSuggestions = function(value) {
    var hasInput, hint, j, len, ref1, results, suggestion, tag;
    value = value.toLowerCase();
    hasInput = value.length > 0;
    ref1 = Array.sortAlphabetic(Object.keys(Memory("tags")));
    results = [];
    for (j = 0, len = ref1.length; j < len; j++) {
      tag = ref1[j];
      if (hasInput && tag.toLowerCase().indexOf(value) === -1) {
        continue;
      }
      suggestion = {
        text: tag
      };
      if (hint = Memory(`Tag Descriptions.${tag}`)) {
        suggestion.hint = hint;
      }
      results.push(suggestion);
    }
    return results;
  };
  chooseSuggestion = function(value) {
    return State.update("search", function(search) {
      return {
        text: "",
        tagCandidate: null,
        tags: search.tags.concat(value)
      };
    });
  };
  updateCandidate = function(value) {
    return State.update("search", function(search) {
      return {
        text: "",
        tagCandidate: value,
        tags: search.tags
      };
    });
  };
  input = document.querySelector("search-box input");
  input.addEventListener("keydown", function(e) {
    switch (e.keyCode) {
      case 8: // delete
        if (input.value === "") {
          return State.update("search.tags", function(tags) {
            return Array.butLast(tags);
          });
        }
    }
  });
  SuggestionList(input, getSuggestions, chooseSuggestion, {updateCandidate});
  tagList = document.querySelector("search-box tag-list");
  removeTag = function(tag) {
    return State.mutate("search.tags", function(tags) {
      return Array.pull(tags, tag);
    });
  };
  return State.subscribe("search.tags", function(tags) {
    return tagList.replaceChildren(TagList(tags, {
      noSort: true,
      removeFn: removeTag
    }));
  });
});

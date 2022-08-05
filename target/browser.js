// browser/browser.coffee
Take(["Log", "Memory", "PubSub", "Render"], function(Log, Memory, {Pub, Sub}, Render) {
  Sub("Render", Render);
  return Memory.subscribe("assets", true, Render);
});

// browser/coffee/render.coffee
Take(["AssetCard", "ADSR", "DOOM", "Env", "Frustration", "Iterated", "Log", "Memory", "Search", "State", "DOMContentLoaded"], function(AssetCard, ADSR, DOOM, Env, Frustration, Iterated, Log, Memory, Search, State) {
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
Take(["DB", "DOOM", "Env", "Frustration", "IPC", "Log", "Memory", "MemoryField", "OnScreen", "Paths", "PubSub", "Read", "State", "TagList", "Validations", "DOMContentLoaded"], function(DB, DOOM, Env, Frustration, IPC, Log, Memory, MemoryField, OnScreen, Paths, {Sub}, Read, State, TagList, Validations) {
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
Take(["ADSR", "DOOM", "Memory", "PubSub", "DOMContentLoaded"], function(ADSR, DOOM, Memory, {Pub}) {
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
Take(["DB", "DOOM", "IPC", "Log", "Memory", "DOMContentLoaded"], function(DB, DOOM, IPC, Log, Memory) {
  var elm;
  elm = document.querySelector("[new-asset]");
  return elm.onclick = function() {
    return DB.send("New Asset");
  };
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiPGFub255bW91cz4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQXdCO0FBQ3hCLElBQUEsQ0FBSyxDQUFDLEtBQUQsRUFBUSxRQUFSLEVBQWtCLFFBQWxCLEVBQTRCLFFBQTVCLENBQUwsRUFBNEMsUUFBQSxDQUFDLEdBQUQsRUFBTSxNQUFOLEVBQWMsQ0FBQyxHQUFELEVBQU0sR0FBTixDQUFkLEVBQTBCLE1BQTFCLENBQUE7RUFDMUMsR0FBQSxDQUFJLFFBQUosRUFBYyxNQUFkO1NBQ0EsTUFBTSxDQUFDLFNBQVAsQ0FBaUIsUUFBakIsRUFBMkIsSUFBM0IsRUFBaUMsTUFBakM7QUFGMEMsQ0FBNUMsRUFEd0I7OztBQVF4QixJQUFBLENBQUssQ0FBQyxXQUFELEVBQWMsTUFBZCxFQUFzQixNQUF0QixFQUE4QixLQUE5QixFQUFxQyxhQUFyQyxFQUFvRCxVQUFwRCxFQUFnRSxLQUFoRSxFQUF1RSxRQUF2RSxFQUFpRixRQUFqRixFQUEyRixPQUEzRixFQUFvRyxrQkFBcEcsQ0FBTCxFQUE4SCxRQUFBLENBQUMsU0FBRCxFQUFZLElBQVosRUFBa0IsSUFBbEIsRUFBd0IsR0FBeEIsRUFBNkIsV0FBN0IsRUFBMEMsUUFBMUMsRUFBb0QsR0FBcEQsRUFBeUQsTUFBekQsRUFBaUUsTUFBakUsRUFBeUUsS0FBekUsQ0FBQTtBQUM5SCxNQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsY0FBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQSxhQUFBLEVBQUEsV0FBQSxFQUFBO0VBQUUsR0FBQSxHQUFNLFFBQVEsQ0FBQyxhQUFULENBQXVCLFlBQXZCO0VBQ04sUUFBQSxHQUFXLFFBQVEsQ0FBQyxhQUFULENBQXVCLFdBQXZCO0VBQ1gsYUFBQSxHQUFnQixRQUFRLENBQUMsYUFBVCxDQUF1QixnQkFBdkI7RUFDaEIsVUFBQSxHQUFhLFFBQVEsQ0FBQyxhQUFULENBQXVCLGFBQXZCO0VB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QyxFQUFELEVBQUssSUFBTCxFQUFXLEdBQVgsRUFBZ0IsR0FBaEIsRUFBcUIsTUFBckIsQ0FBQTtBQUVqRSxNQUFBO0VBQUUsR0FBQSxHQUFNLFFBQVEsQ0FBQyxhQUFULENBQXVCLGFBQXZCO1NBRU4sR0FBRyxDQUFDLE9BQUosR0FBYyxRQUFBLENBQUEsQ0FBQTtXQUNaLEVBQUUsQ0FBQyxJQUFILENBQVEsV0FBUjtFQURZO0FBSmlELENBQWpFIiwic291cmNlc0NvbnRlbnQiOlsiIyBicm93c2VyL2Jyb3dzZXIuY29mZmVlXG5UYWtlIFtcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlB1YlN1YlwiLCBcIlJlbmRlclwiXSwgKExvZywgTWVtb3J5LCB7UHViLCBTdWJ9LCBSZW5kZXIpLT5cbiAgU3ViIFwiUmVuZGVyXCIsIFJlbmRlclxuICBNZW1vcnkuc3Vic2NyaWJlIFwiYXNzZXRzXCIsIHRydWUsIFJlbmRlclxuXG5cblxuIyBicm93c2VyL2NvZmZlZS9yZW5kZXIuY29mZmVlXG5UYWtlIFtcIkFzc2V0Q2FyZFwiLCBcIkFEU1JcIiwgXCJET09NXCIsIFwiRW52XCIsIFwiRnJ1c3RyYXRpb25cIiwgXCJJdGVyYXRlZFwiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIlNlYXJjaFwiLCBcIlN0YXRlXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKEFzc2V0Q2FyZCwgQURTUiwgRE9PTSwgRW52LCBGcnVzdHJhdGlvbiwgSXRlcmF0ZWQsIExvZywgTWVtb3J5LCBTZWFyY2gsIFN0YXRlKS0+XG4gIGVsbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJhc3NldC1saXN0XCJcbiAgbm9Bc3NldHMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwibm8tYXNzZXRzXCJcbiAgcmFpbmJvd0Nsb3VkcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJyYWluYm93LWNsb3Vkc1wiXG4gIGFzc2V0Q291bnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yIFwiYXNzZXQtY291bnRcIlxuXG4gIHJlbmRlckNvdW50ID0gMVxuICBhc3NldHNUb1JlbmRlciA9IFtdXG4gIGxhc3RRdWVyeSA9IG51bGxcbiAgZmlyc3QgPSB0cnVlXG5cbiAgUmVuZGVyID0gQURTUiAoKS0+XG4gICAgYXNzZXRzID0gTWVtb3J5IFwiYXNzZXRzXCJcbiAgICByZXR1cm4gdW5sZXNzIGFzc2V0cz9cblxuICAgIExvZyBcIkZpcnN0IFJlbmRlciAje09iamVjdC5rZXlzKGFzc2V0cykubGVuZ3RofVwiIGlmIGZpcnN0XG4gICAgZmlyc3QgPSBmYWxzZVxuXG4gICAgcXVlcnkgPSBTdGF0ZSBcInNlYXJjaFwiXG5cbiAgICBpZiBxdWVyeSBpc250IGxhc3RRdWVyeVxuICAgICAgbGFzdFF1ZXJ5ID0gcXVlcnlcbiAgICAgIGVsbS5zY3JvbGxUbyAwLCAwXG4gICAgICBBc3NldENhcmQudW5idWlsZENhcmRzKClcblxuICAgIEFzc2V0Q2FyZC5jbGVhckluZGV4ZXMoKVxuXG4gICAgYXNzZXRzVG9SZW5kZXIgPSBTZWFyY2ggYXNzZXRzLCBxdWVyeVxuXG4gICAgaGFzUmVzdWx0cyA9IGFzc2V0c1RvUmVuZGVyLmxlbmd0aCA+IDBcblxuICAgIGVsbS5yZXBsYWNlQ2hpbGRyZW4oKVxuXG4gICAgdXBkYXRlKCkgaWYgaGFzUmVzdWx0c1xuXG4gICAgRE9PTSBhc3NldENvdW50LCBpbm5lckhUTUw6IFN0cmluZy5wbHVyYWxpemUoYXNzZXRzVG9SZW5kZXIubGVuZ3RoLCBcIiUlIDxzcGFuPkFzc2V0XCIpICsgXCI8L3NwYW4+XCJcblxuICAgIERPT00gbm9Bc3NldHMsIGRpc3BsYXk6IGlmIGhhc1Jlc3VsdHMgdGhlbiBcIm5vbmVcIiBlbHNlIFwiYmxvY2tcIlxuXG4gICAgaWYgRW52LmlzTWFjXG4gICAgICBET09NIHJhaW5ib3dDbG91ZHMsIGRpc3BsYXk6IGlmIGhhc1Jlc3VsdHMgdGhlbiBcIm5vbmVcIiBlbHNlIFwiYmxvY2tcIlxuICAgICAgcmFpbmJvd0Nsb3Vkcy5zdHlsZS5hbmltYXRpb25QbGF5U3RhdGUgPSBpZiBoYXNSZXN1bHRzIHRoZW4gXCJwYXVzZWRcIiBlbHNlIFwicGxheWluZ1wiXG5cbiAgICAjIExvZyByZW5kZXJDb3VudFxuICAgIERPT00gbm9Bc3NldHMucXVlcnlTZWxlY3RvcihcImgxXCIpLCB0ZXh0Q29udGVudDogRnJ1c3RyYXRpb24gcmVuZGVyQ291bnQgdW5sZXNzIGhhc1Jlc3VsdHNcbiAgICByZW5kZXJDb3VudCsrXG5cbiAgdXBkYXRlID0gSXRlcmF0ZWQgNSwgKG1vcmUpLT5cbiAgICBmcmFnID0gbmV3IERvY3VtZW50RnJhZ21lbnQoKVxuICAgIGZvciBhc3NldCwgaSBpbiBhc3NldHNUb1JlbmRlciB3aGVuIGFzc2V0XG4gICAgICBjYXJkID0gQXNzZXRDYXJkIGFzc2V0LCBpXG4gICAgICBhc3NldHNUb1JlbmRlcltpXSA9IG51bGxcbiAgICAgIERPT00uYXBwZW5kIGZyYWcsIGNhcmRcbiAgICAgIGJyZWFrIHVubGVzcyBtb3JlKClcbiAgICBET09NLmFwcGVuZCBlbG0sIGZyYWdcblxuXG4gIE1ha2UgXCJSZW5kZXJcIiwgUmVuZGVyXG5cblxuXG4jIGJyb3dzZXIvY29mZmVlL3NlYXJjaC5jb2ZmZWVcblRha2UgW1wiRW52XCJdLCAoRW52KS0+XG5cbiAgc29ydEJ5TmFtZSA9IChhLCBiKS0+XG4gICAgYS5uYW1lLmxvY2FsZUNvbXBhcmUgYi5uYW1lXG5cbiAgYmFpbCA9IChhc3NldHMpLT5cbiAgICBPYmplY3QudmFsdWVzKGFzc2V0cykuc29ydCBzb3J0QnlOYW1lXG5cbiAgbWF0Y2hlc1Rva2VuID0gKHZhbHVlLCB0b2tlbiktPiB2YWx1ZT8ubGVuZ3RoID4gMCBhbmQgdG9rZW4/Lmxlbmd0aCA+IDAgYW5kIC0xIGlzbnQgdmFsdWUuaW5kZXhPZiB0b2tlblxuICBtYXRjaGVzT3AgPSAocmVmLCBvcCktPiBub3Qgb3A/IG9yIG9wIGlzIHJlZlxuXG4gIHRva2VuaXplUXVlcnkgPSAoaW5wdXQpLT5cbiAgICB0b2tlbnMgPSBpbnB1dFxuICAgICAgLnNwbGl0IFwiIFwiXG5cbiAgICAgIC5tYXAgKHRva2VuKS0+XG4gICAgICAgIGlmIHRva2VuLmNoYXJBdCgwKSBpcyBcIi1cIiBvciB0b2tlbi5pbmRleE9mKFwiOi1cIikgaXNudCAtMVxuICAgICAgICAgIHRva2VuICMgbmVnYXRlZCB0b2tlbnMgYXJlIG5vdCBzcGxpdCBvbiBjb21tb24gZGFzaC1saWtlIHB1bmN0dWF0aW9uXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0b2tlbi5zcGxpdCAvWy1fXSsvZyAjIHBvc2l0aXZlIHRva2VucyBhcmUgc3BsaXQgb24gY29tbW9uIGRhc2gtbGlrZSBwdW5jdHVhdGlvbnNcbiAgICAgIC5mbGF0KClcbiAgICAgIC5tYXAgKHQpLT4gdC5yZXBsYWNlIC9bXlxcd1xcZC1fOl0qL2csIFwiXCJcbiAgICAgIC5maWx0ZXIgKHQpLT4gdCBub3QgaW4gW1wiXCIsIFwiLVwiXVxuXG4gICAgIyBSZW1vdmUgcmVkdW5kYW50IHRva2VucywgaW5jbHVkaW5nIG1peGVkIG5lZ2F0aW9uc1xuICAgIG91dHB1dCA9IHt9XG4gICAgZm9yIHRva2VuIGluIHRva2Vuc1xuICAgICAgbm9ybWFsaXplZFRva2VuID0gdG9rZW4ucmVwbGFjZSAvXi0vLCBcIlwiXG4gICAgICBvdXRwdXRbbm9ybWFsaXplZFRva2VuXSA/PSB0b2tlblxuICAgIE9iamVjdC52YWx1ZXMgb3V0cHV0XG5cblxuXG4gIGNvbXB1dGVQb2ludHMgPSAoYXNzZXQsIHF1ZXJ5VG9rZW5zLCBpbnB1dCktPlxuICAgIHBvaW50cyA9IDBcblxuICAgICMgV2UnbGwgZG8gYW55IGV4YWN0LW1hdGNoIGNoZWNraW5nIHVwIGhlcmVcbiAgICBwb2ludHMgKz0gMTYgaWYgYXNzZXQuc2VhcmNoLmlkIGlzIGlucHV0XG4gICAgcG9pbnRzICs9IDE2IGlmIGFzc2V0LnNlYXJjaC5uYW1lIGlzIGlucHV0XG5cbiAgICBmb3IgdG9rZW4gaW4gcXVlcnlUb2tlbnNcblxuICAgICAgaWYgdG9rZW4uaW5kZXhPZihcIjpcIikgaXNudCAtMVxuICAgICAgICBbb3AsIHRva2VuXSA9IHRva2VuLnNwbGl0IFwiOlwiXG5cbiAgICAgICMgSWdub3JlIGVtcHR5IG9wZXJhdG9yc1xuICAgICAgY29udGludWUgaWYgb3AgaXMgXCJcIiBvciB0b2tlbiBpcyBcIlwiXG5cbiAgICAgIGlmIFwiLVwiIGlzIHRva2VuLmNoYXJBdCgwKSBvciBcIi1cIiBpcyBvcD8uY2hhckF0KDApXG4gICAgICAgIHRva2VuID0gdG9rZW5bMS4uXVxuICAgICAgICAjIElmIHRoZSBhc3NldCBtYXRjaGVzIGFueSBuZWdhdGl2ZSB0b2tlbiwgaXQgZmFpbHMgdGhlIGVudGlyZSBxdWVyeVxuICAgICAgICByZXR1cm4gMCBpZiBtYXRjaGVzT3AoXCJpZFwiLCBvcCkgYW5kIG1hdGNoZXNUb2tlbiBhc3NldC5pZCwgdG9rZW5cbiAgICAgICAgcmV0dXJuIDAgaWYgbWF0Y2hlc09wKFwibmFtZVwiLCBvcCkgYW5kIG1hdGNoZXNUb2tlbiBhc3NldC5zZWFyY2gubmFtZSwgdG9rZW5cbiAgICAgICAgcmV0dXJuIDAgaWYgbWF0Y2hlc09wKFwidGFnXCIsIG9wKSBhbmQgbWF0Y2hlc1Rva2VuIGFzc2V0LnNlYXJjaC50YWdzLCB0b2tlblxuICAgICAgICBpZiBtYXRjaGVzT3AgXCJmaWxlXCIsIG9wXG4gICAgICAgICAgZm9yIGZpbGUgaW4gYXNzZXQuc2VhcmNoLmZpbGVzIHdoZW4gbWF0Y2hlc1Rva2VuIGZpbGUsIHRva2VuXG4gICAgICAgICAgICByZXR1cm4gMFxuICAgICAgICBpZiBtYXRjaGVzT3AgXCJleHRcIiwgb3BcbiAgICAgICAgICBmb3IgZXh0IGluIGFzc2V0LnNlYXJjaC5leHRzIHdoZW4gbWF0Y2hlc1Rva2VuIGV4dCwgdG9rZW5cbiAgICAgICAgICAgIHJldHVybiAwXG5cbiAgICAgIGVsc2VcbiAgICAgICAgdG9rZW5Qb2ludHMgPSAwXG4gICAgICAgIHRva2VuUG9pbnRzICs9IDIgaWYgbWF0Y2hlc09wKFwiaWRcIiwgb3ApIGFuZCBtYXRjaGVzVG9rZW4gYXNzZXQuc2VhcmNoLmlkLCB0b2tlblxuICAgICAgICB0b2tlblBvaW50cyArPSAyIGlmIG1hdGNoZXNPcChcIm5hbWVcIiwgb3ApIGFuZCBtYXRjaGVzVG9rZW4gYXNzZXQuc2VhcmNoLm5hbWUsIHRva2VuXG4gICAgICAgIHRva2VuUG9pbnRzICs9IDEgaWYgbWF0Y2hlc09wKFwidGFnXCIsIG9wKSBhbmQgbWF0Y2hlc1Rva2VuIGFzc2V0LnNlYXJjaC50YWdzLCB0b2tlblxuICAgICAgICBpZiBtYXRjaGVzT3AgXCJmaWxlXCIsIG9wXG4gICAgICAgICAgZnJhYyA9IDEvYXNzZXQuc2VhcmNoLmZpbGVzLmxlbmd0aFxuICAgICAgICAgIGZvciBmaWxlIGluIGFzc2V0LnNlYXJjaC5maWxlcyB3aGVuIG1hdGNoZXNUb2tlbiBmaWxlLCB0b2tlblxuICAgICAgICAgICAgdG9rZW5Qb2ludHMgKz0gZnJhY1xuICAgICAgICBpZiBtYXRjaGVzT3AgXCJleHRcIiwgb3BcbiAgICAgICAgICBmcmFjID0gMS9hc3NldC5zZWFyY2guZXh0cy5sZW5ndGhcbiAgICAgICAgICBmb3IgZXh0IGluIGFzc2V0LnNlYXJjaC5leHRzIHdoZW4gbWF0Y2hlc1Rva2VuIGV4dCwgdG9rZW5cbiAgICAgICAgICAgIHRva2VuUG9pbnRzICs9IGZyYWNcblxuICAgICAgICAjIElmIHRoZSBhc3NldCBkb2Vzbid0IG1hdGNoIGV2ZXJ5IHBvc2l0aXZlIHRva2VuLCBpdCBmYWlscyB0aGUgZW50aXJlIHF1ZXJ5XG4gICAgICAgIHJldHVybiAwIGlmIHRva2VuUG9pbnRzIGlzIDBcblxuICAgICAgICBwb2ludHMgKz0gdG9rZW5Qb2ludHNcblxuICAgIHJldHVybiBwb2ludHNcblxuXG4gIE1ha2UgXCJTZWFyY2hcIiwgU2VhcmNoID0gKGFzc2V0cywgaW5wdXQpLT5cbiAgICByZXR1cm4gYmFpbCBhc3NldHMgdW5sZXNzIGlucHV0P1xuXG4gICAgaW5wdXQgPSBpbnB1dC5qb2luIFwiIFwiIGlmIGlucHV0IGluc3RhbmNlb2YgQXJyYXlcbiAgICBpbnB1dCA9IGlucHV0LnRvTG93ZXJDYXNlKClcbiAgICBxdWVyeVRva2VucyA9IHRva2VuaXplUXVlcnkgaW5wdXRcblxuICAgIHJldHVybiBiYWlsIGFzc2V0cyBpZiBxdWVyeVRva2Vucy5sZW5ndGggaXMgMFxuXG4gICAgcmFua2VkTWF0Y2hlcyA9IHt9XG5cbiAgICBmb3IgaWQsIGFzc2V0IG9mIGFzc2V0c1xuICAgICAgcG9pbnRzID0gY29tcHV0ZVBvaW50cyBhc3NldCwgcXVlcnlUb2tlbnMsIGlucHV0XG5cbiAgICAgIGlmIHBvaW50cyA+IDAgIyBhc3NldCBtYXRjaGVkIGFsbCBwb3NpdGl2ZSB0b2tlbnMsIGFuZCBubyBuZWdhdGl2ZSB0b2tlbnNcbiAgICAgICAgcG9pbnRzID0gTWF0aC5yb3VuZFRvIHBvaW50cywgLjFcbiAgICAgICAgYXNzZXQuX3BvaW50cyA9IHBvaW50c1xuICAgICAgICAocmFua2VkTWF0Y2hlc1twb2ludHNdID89IFtdKS5wdXNoIGFzc2V0XG5cbiAgICBzb3J0ZWRBc3NldHMgPSBbXVxuXG4gICAgZm9yIGtleSBpbiBBcnJheS5zb3J0TnVtZXJpY0Rlc2NlbmRpbmcgT2JqZWN0LmtleXMocmFua2VkTWF0Y2hlcykubWFwICh2KS0+ICt2XG4gICAgICBzb3J0ZWRSYW5rID0gcmFua2VkTWF0Y2hlc1trZXldLnNvcnQgc29ydEJ5TmFtZVxuICAgICAgc29ydGVkQXNzZXRzID0gc29ydGVkQXNzZXRzLmNvbmNhdCBzb3J0ZWRSYW5rXG5cbiAgICByZXR1cm4gc29ydGVkQXNzZXRzXG5cbiAgaWYgRW52LmlzRGV2IHRoZW4gVGVzdHMgXCJTZWFyY2hcIiwgKCktPlxuXG4gICAgVGVzdCBcInNwbGl0IHF1ZXJpZXMgb24gc3BhY2VzLCBpbnRlcm5hbCBkYXNoZXMsIGFuZCB1bmRlcnNjb3Jlc1wiLFxuICAgICAgW1wiZjAwXCIsIFwiQkFSXCIsIFwiMmJhelwiLCBcImJhc2hcIl0sXG4gICAgICB0b2tlbml6ZVF1ZXJ5IFwiZjAwLUJBUl8yYmF6IGJhc2hcIlxuXG4gICAgVGVzdCBcInByZXNlcnZlIGxlYWRpbmcgZGFzaGVzXCIsXG4gICAgICB0b2tlbml6ZVF1ZXJ5IFwiLWYwMFwiXG4gICAgICBbXCItZjAwXCJdXG5cbiAgICBUZXN0IFwicmVtb3ZlIGR1cGxpY2F0ZSB0b2tlbnMsIGluY2x1ZGluZyByZWR1bmRhbnQgbmVnYXRpb25zXCIsXG4gICAgICB0b2tlbml6ZVF1ZXJ5IFwiZm9vIC1iYXIgZm9vIC1iYXIgLWZvbyBiYXJcIlxuICAgICAgW1wiZm9vXCIsIFwiLWJhclwiXVxuXG4gICAgVGVzdCBcInJlbW92ZSBmbG9hdGluZyBuZWdhdGl2ZXNcIixcbiAgICAgIHRva2VuaXplUXVlcnkgXCItIGZvbyAtIC1cIlxuICAgICAgW1wiZm9vXCJdXG5cbiAgICBUZXN0IFwib25seSBzcGxpdCBsZWFkaW5nIGRhc2hlcyBvbiBzcGFjZVwiLFxuICAgICAgdG9rZW5pemVRdWVyeSBcIi1mMDAtQkFSXzJiYXogYmFzaFwiXG4gICAgICBbXCItZjAwLUJBUl8yYmF6XCIsIFwiYmFzaFwiXVxuXG4gICAgVGVzdCBcInJlbW92ZSBwdW5jdHVhdGlvbiwgZXZlbiB3aGVuIG5lZ2F0ZWRcIixcbiAgICAgIHRva2VuaXplUXVlcnkgXCIoZm9vKSBbYmFyXSFAXyMkJS1eJiooKSAtW2Jhel0hQF9iYXojJCVeJiooKVwiXG4gICAgICBbXCJmb29cIiwgXCJiYXJcIiwgXCItYmF6X2JhelwiXVxuXG4gICAgVGVzdCBcImVtcHR5IHZhbHVlIGRvZXMgbm90IG1hdGNoXCIsXG4gICAgICBtYXRjaGVzVG9rZW4gXCJcIiwgXCJmb29cIlxuICAgICAgZmFsc2VcblxuICAgIFRlc3QgXCJlbXB0eSB0b2tlbiBkb2VzIG5vdCBtYXRjaFwiLFxuICAgICAgbWF0Y2hlc1Rva2VuIFwiZm9vXCIsIFwiXCJcbiAgICAgIGZhbHNlXG5cbiAgICBUZXN0IFwiZGlmZmVyZW50IHRva2VuIGFuZCB2YWx1ZSBkbyBub3QgbWF0Y2hcIixcbiAgICAgIG1hdGNoZXNUb2tlbiBcImZvb1wiLCBcImJhclwiXG4gICAgICBmYWxzZVxuXG4gICAgVGVzdCBcInNhbWUgdG9rZW4gZG9lcyBtYXRjaFwiLFxuICAgICAgbWF0Y2hlc1Rva2VuIFwiZm9vXCIsIFwiZm9vXCJcbiAgICAgIHRydWVcblxuICAgIFRlc3QgXCJ2YWx1ZSBjb250YWluaW5nIHRva2VuIGRvZXMgbWF0Y2hcIixcbiAgICAgIG1hdGNoZXNUb2tlbiBcImZvb1wiLCBcImZcIlxuICAgICAgdHJ1ZVxuXG4gICAgVGVzdCBcInZhbHVlIGNvbnRhaW5pbmcgb25seSBwYXJ0IG9mIHRoZSB0b2tlbiBkb2VzIG5vdFwiLFxuICAgICAgbWF0Y2hlc1Rva2VuIFwiZlwiLCBcImZvb1wiXG4gICAgICBmYWxzZVxuXG4gICAgVGVzdCBcIm51bGwgb3AgYWx3YXlzIG1hdGNoZXNcIixcbiAgICAgIG1hdGNoZXNPcCBcImZvb1wiLCBudWxsXG4gICAgICB0cnVlXG5cbiAgICBUZXN0IFwic2FtZSBvcCBkb2VzIG1hdGNoXCIsXG4gICAgICBtYXRjaGVzT3AgXCJmb29cIiwgXCJmb29cIlxuICAgICAgdHJ1ZVxuXG4gICAgVGVzdCBcImRpZmZlcmVudCBvcCBkb2VzIG5vdCBtYXRjaFwiLFxuICAgICAgbWF0Y2hlc09wIFwiZm9vXCIsIFwiYmFyXCJcbiAgICAgIGZhbHNlXG5cbiAgICBUZXN0IFwiemVybyBwb2ludHMgZm9yIGFuIGVtcHR5IGFzc2V0XCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcIlwiLHRhZ3M6XCJcIixmaWxlczpbXSxleHRzOltdfX0sIFtcImZvb1wiXSwgXCJmb29cIlxuICAgICAgMFxuXG4gICAgVGVzdCBcInBvc2l0aXZlIHBvaW50cyBmb3IgYSBiYXNpYyBtYXRjaFwiLFxuICAgICAgY29tcHV0ZVBvaW50cyB7c2VhcmNoOntpZDpcIlwiLG5hbWU6XCJmb28gYmFyXCIsdGFnczpcIlwiLGZpbGVzOltdLGV4dHM6W119fSwgW1wiZm9vXCJdLCBcImZvb1wiXG4gICAgICAyXG5cbiAgICBUZXN0IFwibW9yZSBwb2ludHMgZm9yIGEgYmV0dGVyIG1hdGNoXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvbyBiYXJcIix0YWdzOlwiZm9vXCIsZmlsZXM6W1wiZm9vXCJdLGV4dHM6W119fSwgW1wiZm9vXCJdLCBcImZvb1wiXG4gICAgICA0XG5cbiAgICBUZXN0IFwibW9yZSBwb2ludHMgZm9yIGFuIGV4YWN0IG1hdGNoXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiZXhhY3RseSAxMjNcIixuYW1lOlwiXCIsdGFnczpcIlwiLGZpbGVzOltdLGV4dHM6W119fSwgW1wiZXhhY3RseVwiLCBcIjEyM1wiXSwgXCJleGFjdGx5IDEyM1wiXG4gICAgICAyMFxuXG4gICAgVGVzdCBcInplcm8gcG9pbnRzIGZvciBhbiBwYXJ0aWFsIG1hdGNoXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvb1wiLHRhZ3M6XCJmb29cIixmaWxlczpbXCJmb29cIl0sZXh0czpbXX19LCBbXCJmb29cIiwgXCJiYXJcIl0sIFwiZm9vIGJhclwiXG4gICAgICAwXG5cbiAgICBUZXN0IFwiemVybyBwb2ludHMgZm9yIGEgbmVnYXRpdmUgbWF0Y2hcIixcbiAgICAgIGNvbXB1dGVQb2ludHMge3NlYXJjaDp7aWQ6XCJcIixuYW1lOlwiZm9vXCIsdGFnczpcImZvb1wiLGZpbGVzOltcImZvb1wiXSxleHRzOltdfX0sIFtcIi1mb29cIl0sIFwiLWZvb1wiXG4gICAgICAwXG5cbiAgICBUZXN0IFwiemVybyBwb2ludHMgZm9yIGEgbWl4ZWQgbWF0Y2hcIixcbiAgICAgIGNvbXB1dGVQb2ludHMge3NlYXJjaDp7aWQ6XCJcIixuYW1lOlwiZm9vXCIsdGFnczpcImZvb1wiLGZpbGVzOltcImJhclwiXSxleHRzOltdfX0sIFtcImZvb1wiLCBcIi1iYXJcIl0sIFwiZm9vIC1iYXJcIlxuICAgICAgMFxuXG4gICAgVGVzdCBcInBvc2l0aXZlIHBvaW50cyBmb3IgYSBuZWdhdGl2ZSBtaXNzXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvb1wiLHRhZ3M6XCJcIixmaWxlczpbXSxleHRzOltdfX0sIFtcImZvb1wiLCBcIi1iYXJcIl0sIFwiZm9vIC1iYXJcIlxuICAgICAgMlxuXG4gICAgVGVzdCBcInBvc2l0aXZlIHBvaW50cyBmb3IgYSBtYXRjaCB3aXRoIGFuIG9wZXJhdG9yXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvb1wiLHRhZ3M6XCJcIixmaWxlczpbXSxleHRzOltdfX0sIFtcIm5hbWU6Zm9vXCJdLCBcIm5hbWU6Zm9vXCJcbiAgICAgIDJcblxuICAgIFRlc3QgXCJ6ZXJvIHBvaW50cyBmb3IgYSBuZWdhdGl2ZSBtYXRjaCB3aXRoIGFuIG9wZXJhdG9yXCIsXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwidGVzdFwiLG5hbWU6XCJmb29cIix0YWdzOlwiXCIsZmlsZXM6W10sZXh0czpbXX19LCBbXCJ0ZXN0XCIsIFwibmFtZTotZm9vXCJdLCBcInRlc3QgbmFtZTotZm9vXCJcbiAgICAgIDBcblxuICAgIFRlc3QgXCJpZ25vcmUgZW1wdHkgb3BlcmF0b3JzIHdoZW4gc2NvcmluZ1wiLFxuICAgICAgY29tcHV0ZVBvaW50cyB7c2VhcmNoOntpZDpcIlwiLG5hbWU6XCJmb29cIix0YWdzOlwiXCIsZmlsZXM6W10sZXh0czpbXX19LCBbXCJmb29cIiwgXCJuYW1lOlwiLCBcIjpmb29cIiwgXCI6XCJdLCBcImZvbyBuYW1lOiA6Zm9vIDpcIlxuICAgICAgMlxuXG4gICAgVGVzdCBcInRhZ3MsIGZpbGVzLCBhbmQgZXh0cyBhbHNvIG1hdGNoIG9uY2UgZWFjaFwiLFxuICAgICAgY29tcHV0ZVBvaW50cyB7c2VhcmNoOntpZDpcImZvb1wiLG5hbWU6XCJmb29cIix0YWdzOlwiXCIsZmlsZXM6W1wiZm9vXCJdLGV4dHM6W1wiZm9vXCJdfX0sIFtcIm5hbWU6Zm9vXCIsIFwiZmlsZTpmb29cIiwgXCJleHQ6Zm9vXCJdLCBcIm5hbWU6Zm9vIGZpbGU6Zm9vIGV4dDpmb29cIlxuICAgICAgY29tcHV0ZVBvaW50cyB7c2VhcmNoOntpZDpcImZvb1wiLG5hbWU6XCJmb29cIix0YWdzOlwiXCIsZmlsZXM6W1wiYmFyXCJdLGV4dHM6W1wiYmF6XCJdfX0sIFtcIm5hbWU6Zm9vXCIsIFwiZmlsZTpiYXJcIiwgXCJleHQ6YmF6XCJdLCBcIm5hbWU6Zm9vIGZpbGU6YmFyIGV4dDpiYXpcIlxuICAgICAgNFxuXG4gICAgVGVzdCBcInplcm8gcG9pbnRzIGZvciBtaXNzZXMgd2l0aCBhbiBvcGVyYXRvclwiLFxuICAgICAgY29tcHV0ZVBvaW50cyB7c2VhcmNoOntpZDpcIlwiLG5hbWU6XCJmb29cIix0YWdzOlwiXCIsZmlsZXM6W10sZXh0czpbXX19LCBbXCJuYW1lOmJhclwiXSwgXCJuYW1lOmJhclwiXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvb1wiLHRhZ3M6XCJcIixmaWxlczpbXSxleHRzOltdfX0sIFtcImZpbGU6Zm9vXCJdLCBcImZpbGU6Zm9vXCJcbiAgICAgIGNvbXB1dGVQb2ludHMge3NlYXJjaDp7aWQ6XCJcIixuYW1lOlwiZm9vXCIsdGFnczpcIlwiLGZpbGVzOltdLGV4dHM6W119fSwgW1wiaWQ6Zm9vXCJdLCBcImlkOmZvb1wiXG4gICAgICBjb21wdXRlUG9pbnRzIHtzZWFyY2g6e2lkOlwiXCIsbmFtZTpcImZvb1wiLHRhZ3M6XCJcIixmaWxlczpbXSxleHRzOltdfX0sIFtcImV4dDpmb29cIl0sIFwiZXh0OmZvb1wiXG4gICAgICAwXG5cblxuXG4jIGJyb3dzZXIvY29tcG9uZW50cy9hc3NldC1jYXJkLmNvZmZlZVxuVGFrZSBbXCJEQlwiLCBcIkRPT01cIiwgXCJFbnZcIiwgXCJGcnVzdHJhdGlvblwiLCBcIklQQ1wiLCBcIkxvZ1wiLCBcIk1lbW9yeVwiLCBcIk1lbW9yeUZpZWxkXCIsIFwiT25TY3JlZW5cIiwgXCJQYXRoc1wiLCBcIlB1YlN1YlwiLCBcIlJlYWRcIiwgXCJTdGF0ZVwiLCBcIlRhZ0xpc3RcIiwgXCJWYWxpZGF0aW9uc1wiLCBcIkRPTUNvbnRlbnRMb2FkZWRcIl0sIChEQiwgRE9PTSwgRW52LCBGcnVzdHJhdGlvbiwgSVBDLCBMb2csIE1lbW9yeSwgTWVtb3J5RmllbGQsIE9uU2NyZWVuLCBQYXRocywge1N1Yn0sIFJlYWQsIFN0YXRlLCBUYWdMaXN0LCBWYWxpZGF0aW9ucyktPlxuICBjYXJkcyA9IHt9XG5cblxuICB1bmxvYWRJbWFnZSA9IChjYXJkKS0+XG4gICAgY2FyZC5faW1nPy5zdHlsZT8uZGlzcGxheSA9IFwibm9uZVwiXG4gICAgY2FyZC5fbG9hZGVkID0gZmFsc2VcblxuXG4gIGxvYWRJbWFnZSA9IChjYXJkKS0+XG4gICAgYXNzZXQgPSBjYXJkLl9hc3NldFxuXG4gICAgaWYgY2FyZC5fbG9hZGVkXG4gICAgICBjYXJkLl9pbWcuc3R5bGUuZGlzcGxheSA9IFwiaW5saW5lLWJsb2NrXCJcbiAgICAgIHJldHVyblxuXG4gICAgY2FyZC5fbG9hZGVkID0gdHJ1ZVxuICAgIHNpemUgPSBpZiBET09NKGRvY3VtZW50LmJvZHksIFwiaGlkZUxhYmVsc1wiKSBpcyBcIlwiIHRoZW4gMTI4IGVsc2UgNTEyXG4gICAgcGF0aCA9IFBhdGhzLnRodW1ibmFpbCBhc3NldCwgXCIje3NpemV9LmpwZz9jYWNoZWJ1c3Q9I3tNYXRoLnJhbmRJbnQgMCwgMTAwMDAwfVwiXG4gICAgaW1nID0gRE9PTS5jcmVhdGUgXCJpbWdcIiwgbnVsbCwgc3JjOiBwYXRoLCBjbGljazogKCktPiBJUEMuc2VuZCBcIm9wZW4tYXNzZXRcIiwgYXNzZXQuaWRcbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lciBcImVycm9yXCIsICgpLT4gZnJ1c3RyYXRpb24gY2FyZCwgYXNzZXRcbiAgICBjYXJkLl9hc3NldEltYWdlRWxtLnJlcGxhY2VDaGlsZHJlbiBpbWdcbiAgICBjYXJkLl9pbWcgPSBpbWdcblxuXG4gIGZydXN0cmF0aW9uID0gKGNhcmQsIGFzc2V0KS0+XG4gICAgaW1nID0gRE9PTS5jcmVhdGUgXCJkaXZcIiwgbnVsbCwgY2xhc3M6IFwiZnJ1c3RyYXRpb25cIiwgY2xpY2s6ICgpLT4gSVBDLnNlbmQgXCJvcGVuLWFzc2V0XCIsIGFzc2V0LmlkXG4gICAgRE9PTS5jcmVhdGUgXCJzcGFuXCIsIGltZywgdGV4dENvbnRlbnQ6IEZydXN0cmF0aW9uIGFzc2V0Lmhhc2hcbiAgICBodWUgPSA3MSAqIGFzc2V0Lmhhc2ggJSAzNjBcbiAgICBpbWcuc3R5bGUuc2V0UHJvcGVydHkgXCItLWxpdFwiLCAgICBkMy5sY2ggIDkwLCAzMCwgaHVlXG4gICAgaW1nLnN0eWxlLnNldFByb3BlcnR5IFwiLS1zaGFkZWRcIiwgZDMubGNoICA1MCwgNzAsIGh1ZVxuICAgIGltZy5zdHlsZS5zZXRQcm9wZXJ0eSBcIi0tc2hhZG93XCIsIGQzLmxjaCAgMzAsIDkwLCBodWVcbiAgICBpbWcuc3R5bGUuc2V0UHJvcGVydHkgXCItLWdsb3dcIiwgICBkMy5sY2ggMTIwLCA2MCwgaHVlXG4gICAgaW1nLnN0eWxlLnNldFByb3BlcnR5IFwiLS1iZ1wiLCAgICAgZDMubGNoIDEyMCwgMjAsIGh1ZVxuICAgIGNhcmQuX2Fzc2V0SW1hZ2VFbG0ucmVwbGFjZUNoaWxkcmVuIGltZ1xuICAgIGNhcmQuX2ltZyA9IGltZ1xuXG5cbiAgYnVpbGQgPSAoY2FyZCktPlxuICAgIGNhcmQuX2J1aWx0ID0gdHJ1ZVxuXG4gICAgZnJhZyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KClcbiAgICBhc3NldCA9IGNhcmQuX2Fzc2V0XG5cbiAgICBjYXJkLl9hc3NldEltYWdlRWxtID89IERPT00uY3JlYXRlIFwiYXNzZXQtaW1hZ2VcIlxuICAgIGZyYWcuYXBwZW5kIGNhcmQuX2Fzc2V0SW1hZ2VFbG1cblxuICAgIGxhYmVsID0gRE9PTS5jcmVhdGUgXCJhc3NldC1sYWJlbFwiLCBmcmFnXG5cbiAgICBhc3NldE5hbWUgPSBET09NLmNyZWF0ZSBcImFzc2V0LW5hbWVcIiwgbGFiZWwsIGNsYXNzOiBcImJhc2ljLWZpZWxkXCJcblxuICAgIE1lbW9yeUZpZWxkIFwiYXNzZXRzLiN7YXNzZXQuaWR9Lm5hbWVcIiwgYXNzZXROYW1lLFxuICAgICAgdmFsaWRhdGU6IFZhbGlkYXRpb25zLmFzc2V0Lm5hbWVcbiAgICAgIHVwZGF0ZTogKHYpLT4gREIuc2VuZCBcIlJlbmFtZSBBc3NldFwiLCBhc3NldC5pZCwgdlxuXG4gICAgdGFnTGlzdCA9IERPT00uY3JlYXRlIFwidGFnLWxpc3RcIiwgbGFiZWxcblxuICAgIGlmIGFzc2V0Ll9wb2ludHMgYW5kIEVudi5pc0RldlxuICAgICAgc2VhcmNoUG9pbnRzID0gRE9PTS5jcmVhdGUgXCJzZWFyY2gtcG9pbnRzXCIsIHRhZ0xpc3QsXG4gICAgICAgIHRleHRDb250ZW50OiBTdHJpbmcucGx1cmFsaXplIE1hdGgucm91bmRUbyhhc3NldC5fcG9pbnRzLCAuMSksIFwiJSUgUG9pbnRcIlxuXG4gICAgZmlsZUNvdW50ID0gRE9PTS5jcmVhdGUgXCJmaWxlLWNvdW50XCIsIHRhZ0xpc3QsXG4gICAgICB0ZXh0Q29udGVudDogU3RyaW5nLnBsdXJhbGl6ZSBhc3NldC5maWxlcy5jb3VudCwgXCIlJSBGaWxlXCJcblxuICAgIHRhZ0xpc3QuYXBwZW5kIFRhZ0xpc3QgYXNzZXQsIGNsaWNrOiAodGFnLCBlbG0pLT5cbiAgICAgIGN1cnJlbnQgPSBTdGF0ZSBcInNlYXJjaFwiXG4gICAgICBpZiBub3QgY3VycmVudFxuICAgICAgICBTdGF0ZSBcInNlYXJjaFwiLCBcInRhZzoje3RhZ31cIlxuICAgICAgZWxzZSBpZiBjdXJyZW50LmluZGV4T2YodGFnKSBpcyAtMVxuICAgICAgICBTdGF0ZSBcInNlYXJjaFwiLCBbY3VycmVudCwgXCJ0YWc6I3t0YWd9XCJdLmpvaW4gXCIgXCJcblxuICAgIGNhcmQucmVwbGFjZUNoaWxkcmVuIGZyYWdcblxuXG4gIHVuYnVpbGQgPSAoY2FyZCktPlxuICAgIHVubG9hZEltYWdlIGNhcmRcbiAgICBjYXJkLl9idWlsdCA9IGZhbHNlXG4gICAgY2FyZC5yZXBsYWNlQ2hpbGRyZW4oKVxuXG5cbiAgdXBkYXRlID0gKGNhcmQpLT5cbiAgICBidWlsZCBjYXJkIGlmIGNhcmQuX3Zpc2libGUgYW5kIG5vdCBjYXJkLl9idWlsdFxuICAgIGxvYWRJbWFnZSBjYXJkIGlmIGNhcmQuX3Zpc2libGUgYW5kIG5vdCBjYXJkLl9sb2FkZWRcbiAgICB1bmxvYWRJbWFnZSBjYXJkIGlmIG5vdCBjYXJkLl92aXNpYmxlIGFuZCBjYXJkLl9sb2FkZWQgYW5kIChub3QgY2FyZC5faW5kZXg/IG9yIGNhcmQuX2luZGV4ID4gMTAwKVxuICAgICMgVGhlIGxhc3QgcGFydCBvZiB0aGlzIGNvbmRpdGlvbmFsIChhYm91dCBfaW5kZXgpIHN0b3BzIHRoZSByZXN1bHRzIHRoYXQgYXJlIHVwIG5lYXIgdGhlIHNlYXJjaCBiYXJcbiAgICAjIGZyb20gZmxpY2tlcmluZyBhcyB5b3UgdHlwZSBpbiBhIHNlYXJjaCAoZHVlIHRvIE9uU2NyZWVuIHF1aWNrbHkgYWx0ZXJuYXRpbmcgYmV0d2VlbiBpbnZpc2libGUgYW5kIHZpc2libGUpLlxuICAgICMgdW5idWlsZCBjYXJkIGlmIG5vdCBjYXJkLl92aXNpYmxlIGFuZCBjYXJkLl9sb2FkZWQgYW5kIChub3QgY2FyZC5faW5kZXg/IG9yIGNhcmQuX2luZGV4ID4gMTAwKVxuXG5cbiAgb25TY3JlZW4gPSAoY2FyZCwgdmlzaWJsZSktPlxuICAgIGNhcmQuX3Zpc2libGUgPSB2aXNpYmxlXG4gICAgdXBkYXRlIGNhcmRcblxuXG4gIGFzc2V0Q2hhbmdlZCA9IChjYXJkLCBhc3NldElkKS0+IGNiID0gKGFzc2V0KS0+XG4gICAgaWYgYXNzZXQ/XG4gICAgICBjYXJkLl9hc3NldCA9IGFzc2V0XG4gICAgICBjYXJkLl9sb2FkZWQgPSBmYWxzZVxuICAgICAgY2FyZC5fYnVpbHQgPSBmYWxzZVxuICAgICAgdXBkYXRlIGNhcmRcbiAgICBlbHNlXG4gICAgICBjYXJkLnJlbW92ZSgpXG4gICAgICBkZWxldGUgY2FyZHNbYXNzZXRJZF1cbiAgICAgIE1lbW9yeS51bnN1YnNjcmliZSBcImFzc2V0cy4je2Fzc2V0SWR9XCIsIGNiXG5cbiAgcmVidWlsZENhcmQgPSAoY2FyZCwgYXNzZXRJZCktPiAoKS0+XG4gICAgYXNzZXRDaGFuZ2VkKGNhcmQsIGFzc2V0SWQpIE1lbW9yeSBcImFzc2V0cy4je2Fzc2V0SWR9XCJcblxuICBNYWtlLmFzeW5jIFwiQXNzZXRDYXJkXCIsIEFzc2V0Q2FyZCA9IChhc3NldCwgaW5kZXgpLT5cbiAgICBjYXJkID0gY2FyZHNbYXNzZXQuaWRdXG4gICAgaWYgbm90IGNhcmQ/XG4gICAgICBjYXJkID0gY2FyZHNbYXNzZXQuaWRdID0gRE9PTS5jcmVhdGUgXCJhc3NldC1jYXJkXCJcbiAgICAgIGNhcmQuX2Fzc2V0ID0gYXNzZXRcbiAgICAgIE9uU2NyZWVuIGNhcmQsIG9uU2NyZWVuXG4gICAgICBNZW1vcnkuc3Vic2NyaWJlIFwiYXNzZXRzLiN7YXNzZXQuaWR9XCIsIGZhbHNlLCBhc3NldENoYW5nZWQgY2FyZCwgYXNzZXQuaWRcbiAgICAgICMgVGhpcyBpcyBmb3IgdGVzdGluZyB3aGV0aGVyIHdlIHNlZSBmbGFzaGluZ1xuICAgICAgIyBzZXRJbnRlcnZhbCByZWJ1aWxkQ2FyZChjYXJkLCBhc3NldC5pZCksIDUwMFxuICAgIGNhcmQuX2luZGV4ID0gaW5kZXhcbiAgICBjYXJkXG5cblxuICBBc3NldENhcmQudW5idWlsZENhcmRzID0gKCktPlxuICAgIGZvciBhc3NldElkLCBjYXJkIG9mIGNhcmRzIHdoZW4gY2FyZC5fYnVpbHQgYW5kIG5vdCBjYXJkLl92aXNpYmxlXG4gICAgICB1bmJ1aWxkIGNhcmRcblxuICBTdWIgXCJVbmJ1aWxkIENhcmRzXCIsIEFzc2V0Q2FyZC51bmJ1aWxkQ2FyZHNcblxuICBBc3NldENhcmQuY2xlYXJJbmRleGVzID0gKCktPlxuICAgIGZvciBhc3NldElkLCBjYXJkIG9mIGNhcmRzXG4gICAgICBjYXJkLl9pbmRleCA9IG51bGxcblxuXG5cbiMgYnJvd3Nlci9jb21wb25lbnRzL2Fzc2V0LXNpemUuY29mZmVlXG5UYWtlIFtcIkFEU1JcIiwgXCJET09NXCIsIFwiTWVtb3J5XCIsIFwiUHViU3ViXCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKEFEU1IsIERPT00sIE1lbW9yeSwge1B1Yn0pLT5cblxuICBuZXdTaXplID0gMVxuICBvbGRTaXplID0gMVxuXG4gIHNsaWRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJbYXNzZXQtc2l6ZV1cIlxuICBzY3JvbGxlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgXCJhc3NldC1saXN0XCJcblxuICB1cGRhdGUgPSBBRFNSIDEsIDEsICgpLT5cbiAgICByZXR1cm4gdW5sZXNzIG5ld1NpemUgaXNudCBvbGRTaXplXG4gICAgZG9jdW1lbnQuYm9keS5zdHlsZS5zZXRQcm9wZXJ0eSBcIi0tYnJvd3Nlci1hc3NldC1zaXplXCIsIG5ld1NpemUgKyBcImVtXCJcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnNldFByb3BlcnR5IFwiLS1icm93c2VyLWxhYmVsLXNpemVcIiwgKDEvbmV3U2l6ZSAqKiAwLjUpICsgXCJlbVwiXG4gICAgRE9PTSBkb2N1bWVudC5ib2R5LCBoaWRlTGFiZWxzOiBpZiBuZXdTaXplIDw9IDAuNSB0aGVuIFwiXCIgZWxzZSBudWxsXG4gICAgb2xkU2l6ZSA9IG5ld1NpemVcbiAgICBzY3JvbGxlci5zY3JvbGxUbyAwLCAwXG4gICAgUHViIFwiVW5idWlsZCBDYXJkc1wiXG5cbiAgdXBkYXRlKClcblxuICBzbGlkZXIub25pbnB1dCA9IHNsaWRlci5vbmNoYW5nZSA9IChlKS0+XG4gICAgbmV3U2l6ZSA9IHNsaWRlci52YWx1ZVxuICAgIE1lbW9yeSBcImJyb3dzZXJUaHVtYm5haWxTaXplXCIsIG5ld1NpemVcbiAgICB1cGRhdGUoKVxuXG4gIE1lbW9yeS5zdWJzY3JpYmUgXCJicm93c2VyVGh1bWJuYWlsU2l6ZVwiLCB0cnVlLCAodiktPlxuICAgIHJldHVybiB1bmxlc3Mgdj9cbiAgICBuZXdTaXplID0gdlxuICAgIHNsaWRlci52YWx1ZSA9IG5ld1NpemUgdW5sZXNzIHNsaWRlci52YWx1ZSBpcyBuZXdTaXplXG4gICAgdXBkYXRlKClcblxuXG5cbiMgYnJvd3Nlci9jb21wb25lbnRzL25ldy1hc3NldC5jb2ZmZWVcblRha2UgW1wiREJcIiwgXCJET09NXCIsIFwiSVBDXCIsIFwiTG9nXCIsIFwiTWVtb3J5XCIsIFwiRE9NQ29udGVudExvYWRlZFwiXSwgKERCLCBET09NLCBJUEMsIExvZywgTWVtb3J5KS0+XG5cbiAgZWxtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciBcIltuZXctYXNzZXRdXCJcblxuICBlbG0ub25jbGljayA9ICgpLT5cbiAgICBEQi5zZW5kIFwiTmV3IEFzc2V0XCJcbiJdfQ==
//# sourceURL=coffeescript
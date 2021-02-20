Take [], ()->
  Make "TagView", (asset, tag, checked)->
    Preact.h "label", {onchange: ()-> Pub "Toggle Asset Tag", asset, tag},
      Preact.h "input", {type: "checkbox", checked}
      Preact.h "span", null, tag

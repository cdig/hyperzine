Take ["Asset"], (Asset)->
  change = (asset, tag)-> ()->
    Asset.toggleTag asset, tag

  Make "TagView", (asset, tag, checked)->
    Preact.h "label", {onchange: change asset, tag},
      Preact.h "input", {type: "checkbox", checked}
      Preact.h "span", null, tag

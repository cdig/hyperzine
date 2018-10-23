Take ["Globals"], ()->

  RenderTemplate = (template)->
    return template unless template instanceof Array

    tag = template.shift()
    unless typeof tag is "string" then throw "The first element of a template must be a tag string, not: #{tag}"

    elm = DOOM.create tag

    attrs = template.shift() if Util.Object.isObject template[0]
    if attrs?
      for k, v of attrs when k.indexOf("on") is 0
        console.log event = k.replace("on", "")
        elm.addEventListener event, v
        delete attrs[k]
      DOOM elm, attrs

    if template.length > 0
      for child in template
        inner = RenderTemplate child
        if inner instanceof Node
          DOOM.append elm, inner
        else if typeof inner is "string"
          DOOM elm, textContent: inner
        else
          throw "Unknown child type: #{inner}"


    return elm

  window.RenderTemplate = RenderTemplate
  Make "RenderTemplate", RenderTemplate

Take [], ()->

  Util = {}

  Util.getIn = (node, path)->
    parts = path.split "."
    lastPart = parts.pop()
    node = node[part] ?= {} for part in parts
    [node, lastPart, parts]

  Make "Util", Util

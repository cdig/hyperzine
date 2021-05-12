Take [], ()->

  Util = {}

  Util.getIn = (k, root)->
    node = root
    parts = k.split "."
    lastPart = parts.pop()
    node = node[part] ?= {} for part in parts
    [node, lastPart]

  Make "Util", Util

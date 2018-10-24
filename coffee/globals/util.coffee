Take [], ()->
  Util =

    Array:
      pull: (arr, elm)->
        return unless arr? and elm?
        while (i = arr.indexOf elm) > -1
          arr.splice i, 1

    Math:
      TAU: Math.PI * 2
      clip: (v, min, max)-> Math.max min, Math.min max, v

    Object:
      isObject: (obj)-> "[object Object]" is Object.prototype.toString.call obj
      clone: (obj)-> JSON.parse JSON.stringify obj

    String:
      pluralize: (count, string, suffix = "s")->
        suffix = "" if count is 1
        (string + suffix).replace("%%", count)


  window.Util = Util
  Make "Util", Util

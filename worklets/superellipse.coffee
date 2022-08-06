# To use this, add the following CSS:
# border-radius: [whatever]
# mask-image: paint(superellipse);
# Currently only supported in Chrome.
# Currently does not work on <a href> elements or any of their descendants, due to the risk of leaking :visited

class SuperellipsePainter
  paint: (ctx, geom, properties)->
    TAU = Math.PI*2
    width = geom.width / 2
    height = geom.height / 2
    quality = Math.min 120, Math.max geom.width, geom.height # number of segments for the ellipse
    first = true

    ctx.translate width, height
    ctx.beginPath()

    for corner, cornerIndex in ["bottom-right", "bottom-left", "top-left", "top-right"]

      cornerRadius = properties.get("border-#{corner}-radius").toString()
      [rx, ry] = cornerRadius.replace(/[%px]/g, "").split(" ").map (v)-> +v
      ry ?= rx

      if cornerRadius.indexOf("%") > -1
        # This scaling makes the superellipse look most similar to the provided border-radius %
        rx *= 0.02
        ry *= 0.02
      else
        # This scaling makes the superellipse look most similar to the provided border-radius px
        rx /= width
        ry /= height

      rx = Math.min rx, 1
      ry = Math.min ry, 1

      start = cornerIndex * TAU/4
      end = start + TAU/4

      for t in [start...end] by TAU/quality
        cos = Math.cos t
        sin = Math.sin t
        x = Math.abs(cos) ** rx * width * Math.sign cos
        y = Math.abs(sin) ** ry * height * Math.sign sin
        if first
          first = false
          ctx.moveTo x, y
        else
          ctx.lineTo x, y

    ctx.closePath()
    ctx.fill()

Object.defineProperty SuperellipsePainter, "inputProperties",
  get: ()-> ["border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius"]

registerPaint "superellipse", SuperellipsePainter

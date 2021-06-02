Take ["Debounced", "DOMContentLoaded"], (Debounced)->

  colors = [
    "hsl(20, 100%, 50%)"
    "hsl(170, 100%, 50%)"
    "hsl(250, 100%, 50%)"
  ]

  if elm = document.querySelector "window-top-rainbow"
    colors = Array.shuffle colors
    elm.style.setProperty "--color-a", colors[0]
    elm.style.setProperty "--color-b", colors[1]
    elm.style.setProperty "--color-c", colors[2]

  scroll = Debounced.raf ()->
    delay -= 1
    elm.style.setProperty "--delay", "#{delay}ms"

  for scrollable in document.querySelectorAll ".scrollable"
    delay = 0
    scrollable.addEventListener "wheel", scroll, passive: true

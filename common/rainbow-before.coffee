Take ["ADSR", "Rainbow", "DOMContentLoaded"], (ADSR, Rainbow)->

  scroll = ADSR 1, 1, ()->
    Rainbow.move 0.5

  scroll()

  for scrollable in document.querySelectorAll ".scrollable"
    scrollable.addEventListener "wheel", scroll, passive: true

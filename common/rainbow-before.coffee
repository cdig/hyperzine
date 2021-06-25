Take ["Debounced", "State", "DOMContentLoaded"], (Debounced, State)->

  State "rainbow-before-delay", 0

  scroll = Debounced.raf ()->
    delay = State("rainbow-before-delay") - 0.5
    State "rainbow-before-delay", delay
    document.body.style.setProperty "--rainbow-delay", "#{delay}ms"

  for scrollable in document.querySelectorAll ".scrollable"
    scrollable.addEventListener "wheel", scroll, passive: true

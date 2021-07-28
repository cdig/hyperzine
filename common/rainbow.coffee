Take ["State"], (State)->

  State "rainbow-before-delay", Math.randInt 0, -1000

  Make "Rainbow", Rainbow =
    move: (delta)->
      delay = State("rainbow-before-delay") - delta
      State "rainbow-before-delay", delay
      document.body.style.setProperty "--rainbow-before-delay", "#{delay}ms"
      document.body.style.setProperty "--rainbow-focus", d3.lch  50, 30, -delay/2

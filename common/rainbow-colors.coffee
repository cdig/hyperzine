do ()->

  colors = [
    "hsl(20, 100%, 50%)"
    "hsl(170, 100%, 50%)"
    "hsl(250, 100%, 50%)"
  ]

  colors = Array.shuffle colors
  document.body.style.setProperty "--rainbow-a", colors[0]
  document.body.style.setProperty "--rainbow-b", colors[1]
  document.body.style.setProperty "--rainbow-c", colors[2]

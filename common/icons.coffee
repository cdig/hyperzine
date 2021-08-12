Take ["DOOM", "DOMContentLoaded"], (DOOM)->
  DOOM.create "svg", document.body,
    id: "icons"
    innerHTML:"""
      <defs>
        <path id="i-check" d="M20 100L75 155 185 45"/>
        <path id="i-ex" d="M35 165 L165 35 M35 35 L165 165"/>
        <path id="i-arrow" d="M40 100 L180 100 M110 30 L40 100 110 170"/>
        <path id="i-diamond" d="M165 100L100 165 35 100 100 35z"/>
        <g id="i-eye" transform="scale(1.8, 1.8) translate(0, 15)" stroke-width="10">
          <path d="M55.5 5c19 0 35.4 11.9 49.6 34.5C91 62.1 74.5 74 55.5 74S20.1 62.1 5.9 39.5C20 16.9 36.5 5 55.5 5z"/>
          <circle cx="55.5" cy="39.5" r="18.5"/>
        </g>
        <g id="i-file" stroke-width="18">
          <path d="M38,19 L108,19 C110,19 112,19 114,21 L159,65 C161,67 162,69 162,71 L162,180 L162,180 L38,180 L38,19 Z"/>
          <polyline points="162 70 108 70 108 19"/>
        </g>
      </defs>
    """

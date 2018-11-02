remote = require('electron').remote

Take [], ()->

  Sub "After Render", ()->
    nav = document.querySelector "nav"
    offset = nav.offsetHeight
    remote.getCurrentWindow().setSheetOffset offset

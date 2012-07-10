// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

//require('core/core.js');

$(document).ready(function() {
  p("welcome to universal");
});


function UniversalViewport(wrapper) {
  Viewport.call(this, wrapper);
}


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

var view;

$(document).ready(function() {
  view = new Viewport($('#viewporthtmlwrapper'));

  view.dom[0].innerHTML = "hello world!";

  view.registerKeyHandler(asc('G'), function() {
    view.dialog("Jump to address", function(data) {
      p('got '+data);
    });
  });

});



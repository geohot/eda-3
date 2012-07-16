// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');
require('js/tags.js');

require('universal/tabcontroller.js');
require('universal/console.js');
require('universal/movebar.js');

require('universal/tabs/functioncontroller.js');

require('ida/ida.js');
require('flat/flat.js');

require('core/core.js');

window.mousedown = function(e) {
  e.preventDefault();
  return false; 
};

$(document).ready(function() {
  p("welcome to universal");
  var leftTab = new TabController($('#lefttabbar')[0], $('#leftcontent'));
  var rightTab = new TabController($('#righttabbar')[0], $('#rightcontent'));

  leftTab.addTab('core', $('<div id="core"><input type="button" value="step" onclick="idaStep()" /><input type="button" id="until" value="until" onclick="runUntilStart()" /><input type="button" value="stop" onclick="stopRunUntil()" /><br/><input type="button" value="remotestep" onclick="idaRemoteStep()" /><br/><span id="frequency"></span><br/><div id="registers"></div><br/><div id="iview"><select id="changes" size="4"></select><div id="changelist"></div></div></div>'), true);

  var mbc = new MoveBarController($('#movebar'), 0x8000, 0x9800, 4);

  new ConsoleController($('#console'));
  consolePrint('welcome to EDA');
  consolePrompt();

  var fc = new FunctionController($('<div id="functions"></div>'));
  fc.render();
  leftTab.addTab('functions', fc.dom, false);

  var graphTab = $('<div id="graphviewport"></div>');
  rightTab.addTab('graph', graphTab, true);
  view = new IDAViewport($('#graphviewport'));
  view.registerDefaultHandlers();
  view.focus(0x8000);
  initCore('arm');

  var flatviewdom = $('<div id="flatviewport"></div>');
  rightTab.addTab('flat', flatviewdom,false);
  var flatview = new FlatViewport(flatviewdom, 0x8000, 0x20, 0x8000, 0x100);
  flatview.registerDefaultHandlers();

  // hacky shit
  var hexviewdom = $('<iframe id="hexviewframe" src="/eda/xvi"></iframe>');
  rightTab.addTab('hex', hexviewdom,false);
});


/*function UniversalViewport(wrapper) {
  Viewport.call(this, wrapper);
}*/


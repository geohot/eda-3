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

var leftTab, rightTab;

window.mousedown = function(e) {
  e.preventDefault();
  return false; 
};

window.onkeydown = function(e) {
  var atd = rightTab.activeTabData;
  var keynum = e.which;
  //p('key: '+keynum);
  if (atd.dialogBox != null) {
    if (keynum == KEY_ESC) {
      atd.dialogDismiss(false);
    }
    if (keynum == KEY_ENTER) {
      atd.dialogDismiss(true);
    }
    return;
  }
  if (e.ctrlKey) keynum += KEY_CTRL;
  if (atd.keyBindings[keynum] != null) {
    atd.keyBindings[keynum](e);
    return false;
  }
};

window.onhashchange = function() {
  p('hash change');
  rightTab.activeTabData.focus(fhex(window.location.hash.substr(1)));
};


$(document).ready(function() {
  p("welcome to universal");

  leftTab = new TabController($('#lefttabbar')[0], $('#leftcontent'));
  rightTab = new TabController($('#righttabbar')[0], $('#rightcontent'));

  leftTab.addTab('core', $('<div id="core"><input type="button" value="step" onclick="idaStep()" /><input type="button" id="until" value="until" onclick="runUntilStart()" /><input type="button" value="stop" onclick="stopRunUntil()" /><br/><input type="button" value="remotestep" onclick="idaRemoteStep()" /><br/><span id="frequency"></span><br/><div id="registers"></div><br/><div id="iview"><select id="changes" size="4"></select><div id="changelist"></div></div></div>'), null, true);
  initCore('arm');

  db.precache(0, 0x4000);
  p('precache done');

  var mbc = new MoveBarController($('#movebar'), 0x0, 0x4000, 0x10);

  new ConsoleController($('#console'));
  consolePrint('welcome to EDA');
  consolePrompt();

  var fc = new FunctionController($('<div id="functions"></div>'));
  fc.render();
  leftTab.addTab('functions', fc.dom, fc, false);

  var graphTab = $('<div id="graphviewport"></div>');
  graphview = new IDAViewport(graphTab);
  graphview.registerDefaultHandlers();
  rightTab.addTab('graph', graphTab, graphview, true);
  // focus can only be called when tab is active
  graphview.focus(0);

  var flatviewdom = $('<div id="flatviewport"></div>');
  var flatview = new FlatViewport(flatviewdom, 0, 0x20, 0, 0x100);
  flatview.registerDefaultHandlers();
  rightTab.addTab('flat', flatviewdom, flatview, false);

  // hacky shit
  var hexviewdom = $('<iframe id="hexviewframe" src="/eda/xvi"></iframe>');
  rightTab.addTab('hex', hexviewdom,false);
});


/*function UniversalViewport(wrapper) {
  Viewport.call(this, wrapper);
}*/


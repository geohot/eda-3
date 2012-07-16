// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

var consolecon;
function ConsoleController(dom) {
  this.dom = dom;
  consolecon = this;
}

function consolePrint(d) {
  consolecon.dom.append($('<div class="consolestatement">'+d+'</div>'));
}

function consolePrompt() {
  consolecon.dom.append($('<div class="consoleprompt">&gt;</div>'));
}



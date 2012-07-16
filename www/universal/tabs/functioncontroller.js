// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

function FunctionController(dom) {
  this.dom = dom;
}

// render should probably be called w/e tab switches
FunctionController.prototype.render = function() {
  this.dom[0].innerHTML = "";
  var json = xx('/eda/edadb/searchtagsbyname.php?tagname=name');
  for (addr in json) {
    var a = document.createElement('div');
    a.className = 'line';
    if ((addr&0xFFFF0000) == -308281344) { // 0xEDA00000
      a.innerHTML = displayParsed('\\L{'+addr+'}');
    } else {
      a.innerHTML = displayParsed('\\l{'+addr+'}');
    }
    this.dom[0].appendChild(a);
  }
};


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');
require('js/parser.js');

require('static/analyser.js');

/* eda "kernel" log for static */
function l(d, depth) {
  for (var i = 0; i < depth; i++) {
    d = "  "+d;
  }
  p(d);
}

function FlatViewport(wrapper, addr, linecount) {
  Viewport.call(this, wrapper);
  this.viewLines = linecount;
  db.precacheTags(0xEDA00000, 0x80);
  this.focus(addr, false);
  this.setSelectedLine(addr);
  this.registerKeyHandler(asc('A'), function() {
    var sa = this.selectedLine;
    var ea = sa;
    var str = "";
    while (db.raw(ea, 1)[0] != 0) {
      str += chr(db.raw(ea, 1)[0]);
      ea++;
    }
    p(shex(sa)+"-"+shex(ea));
    p(str)
    db.setTag(sa, "len", sdec(ea-sa));
    db.setTag(sa, "name", "a_"+str);
    db.setTag(sa, "comment",str);
    this.render();
  }.bind(this));

  this.registerKeyHandler(asc('C'), function() {
    p("analyse at "+shex(this.selectedLine));
    analyze_callback = function() {
      db.flushTagCache();
      this.render();
    }.bind(this);
    start_analysis(this.selectedLine);
  }.bind(this));

  this.registerKeyHandler(asc('U'), function() {
    var sa = this.selectedLine;
    /* err, wrong, no way to clear tags */
    db.setTag(sa, 'len', '1');
    db.setTag(sa, 'endian', '');
    this.render();
  }.bind(this));

  this.registerKeyHandler(asc('D'), function() {
    var sa = this.selectedLine;
    if (db.tags(sa)['len'] == "1") {
      db.setTag(sa, 'endian', db.globalTags()['endian']);
      db.setTag(sa, 'len', '2');
    } else if (db.tags(sa)['len'] == "2") {
      db.setTag(sa, 'len', '4');
    } else if (db.tags(sa)['len'] == "4") {
      db.setTag(sa, 'len', '8');
    } else if (db.tags(sa)['len'] == "8") {
      db.setTag(sa, 'len', '1');
      db.setTag(sa, 'endian', '');
    }
    this.render();
  }.bind(this));

  this.registerDblClickHandler('flataddr', function(a) {
    window.open("/eda/xvi/index.html#"+a.innerHTML);
  }.bind(this));

  this.registerKeyHandler(KEY_SPACE, function() {
    if (db.tags(this.selectedLine)['scope']) {
      window.location = "/eda/ida/index.html#"+shex(this.selectedLine);
    }
  }.bind(this));
}

FlatViewport.prototype = new Viewport();
FlatViewport.prototype.constructor = FlatViewport;
FlatViewport.prototype.parent = Viewport;

// overloaded
FlatViewport.prototype.handleScrolling = function(delta) {
  this.viewAddress -= Math.floor(delta/20);
  this.render();
  return false;
}


FlatViewport.prototype.focus = function(addr, nopush) {
  p("focus on "+shex(addr)+" "+nopush);
  if (nopush !== true) {
    p("pushing state "+shex(addr));
    window.location.hash = shex(addr);
    window.history.replaceState(addr);
    //window.history.pushState(addr);
  }
  this.viewAddress = addr;
  //db.precache(this.viewAddress, this.viewLength+4);
  this.render();
};


FlatViewport.prototype.render = function() {
  var addr = this.viewAddress;
  var len = this.viewLength;
  var i = addr;
  var html = '<table>';
  var linecount = 0;
  while (linecount < this.viewLines) {
    html += '<tr class="line" id='+i+'>';
    var tags = db.tags(i);

    // add default tags
    if (tags === undefined) {
      tags = {};
    }
    if (tags['len'] === undefined) {
      tags['len'] = '1';
    }

    html += '<td class="flataddr" width="80px">'+shex(i, 8)+'</td>';
    //p(i + " " + fnum(tags['len']));
    html += '<td width="160px">'+
      displayDumpFromRaw(fnum(tags['len']),
                         db.raw(i, fnum(tags['len'])))
                         +'</td>';
    if (tags['parsed'] !== undefined) {
      html += '<td width="300px">' + displayParsed(tags['parsed']) + '</td>';
      if (tags['flow'] !== undefined) {
        html += '<td>' + tags['flow'] + '</td>';
      }
    } else if (tags['endian'] !== undefined) {
      html += '<td>'+
        displayImmedFromRaw(fnum(tags['len']),
                            tags['endian'],
                            db.raw(i, fnum(tags['len'])))
                            +'</td>';
    }
     
    if (tags['comment'] !== undefined) {
      html += '<td class="comment">;&nbsp;' + tags['comment'] + '</td>';
    }


    html += '</tr>';
    i += fnum(tags['len']);
    linecount++;
  }
  html += '</table>';
  this.dom[0].innerHTML = html;
};


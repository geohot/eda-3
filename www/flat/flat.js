// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

function FlatViewport(wrapper, addr, linecount, maxaddr, maxlen) {
  Viewport.call(this, wrapper);
  this.viewLines = linecount;
  db.precache(maxaddr, maxlen);
  db.precacheTags(0xEDA00000, 0x80);
  this.focus(addr);
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
  if (nopush !== true) {
    window.history.pushState(addr);
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
    html += '<tr>';
    var tags = db.tags(i);

    // add default tags
    if (tags === undefined) {
      tags = {};
    }
    if (tags['len'] === undefined) {
      tags['len'] = '1';
    }

    html += '<td width="80px">'+shex(i, 8)+'</td>'
    html += '<td width="100px">'+
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


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

$(document).ready(function() {
  view = new FlatViewport($('#viewporthtmlwrapper'), 0x67A, 0x40);
  view.render();
  view.registerKeyHandler(asc('G'), function() {
    view.dialog("Jump to address", function(data) {
      var addr = fhex(data);
      if (addr != NaN) {
        view.focus(addr);
      }
    });
  });

  view.registerKeyHandler(KEY_ESC, function() {
    if (view.history.length > 0) {
      view.focus(view.history.pop());
      view.history.pop();
    }
  });

  view.registerDblClickHandler('i_location', function(ele) {
    view.focus(fhex(ele.childNodes[0].value));
  });

});

function FlatViewport(wrapper, addr, len) {
  Viewport.call(this, wrapper);
  this.history = [];
  this.viewAddress = addr;
  this.viewLength = len;
  db.precache(this.viewAddress, this.viewLength+4);
}

FlatViewport.prototype = new Viewport();
FlatViewport.prototype.constructor = FlatViewport;
FlatViewport.prototype.parent = Viewport;

FlatViewport.prototype.focus = function(addr) {
  this.history.push(this.viewAddress);
  this.viewAddress = addr;
  db.precache(this.viewAddress, this.viewLength+4);
  this.render();
};

FlatViewport.prototype.render = function() {
  var addr = this.viewAddress;
  var len = this.viewLength;
  var i;
  var html = '<table>';
  for (i = addr; i < (addr+len);) {
    html += '<tr>';
    var tags = db.tags(i);

    // add default tags
    if (tags === undefined) {
      tags = {};
    }
    if (tags['len'] === undefined) {
      tags['len'] = '1';
    }

    html += '<td>'+shex(i, 8)+'</td>'
    html += '<td>'+
      displayDumpFromRaw(fnum(tags['len']),
                         db.raw(i, fnum(tags['len'])))
                         +'</td>';
    if (tags['parsed'] !== undefined) {
      html += '<td>' + displayParsed(tags['parsed']) + '</td>';
    } else if (tags['endian'] !== undefined) {
      html += '<td>'+
        displayImmedFromRaw(fnum(tags['len']),
                            tags['endian'],
                            db.raw(i, fnum(tags['len'])))
                            +'</td>';
    }


    html += '</tr>';
    i += fnum(tags['len']);
  }
  html += '</table>';
  this.dom[0].innerHTML = html;
};


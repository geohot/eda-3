// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

$(document).ready(function() {
  view = new IDAViewport($('#viewporthtmlwrapper'));
  view.registerDefaultHandlers();
});

function IDAViewport(wrapper) {
  Viewport.call(this, wrapper);
  this.g = new Graph();

// for testing
  this.focus(0x4778);
}

IDAViewport.prototype = new Viewport();
IDAViewport.prototype.constructor = IDAViewport;
IDAViewport.prototype.parent = Viewport;

IDAViewport.prototype.focus = function(addr) {
  var functiontag = db.tags(addr)['function'];
  if (functiontag === undefined) return false;

  var extents = functiontag.split(' ');
  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    db.precache(extent_addr, extent_len);
    var start = extent_addr;
    p('processing extent '+shex(extent_addr)+'-'+shex(extent_addr + extent_len));
    for (var j = extent_addr; j <= (extent_addr + extent_len);) {
      var tags = db.tags(j);
      if (tags['len'] === undefined) {
        p('!!!ERROR, no length tag in function');
      }
      var len = fnum(tags['len']);
      if (tags['flow'] !== undefined) {
        var flow = eval(tags['flow']);
        //p('flow @ '+shex(j)+' : '+flow);
        for (var k = 0; k < flow.length; k++) {
          if (flow[k].substr(0,1) == 'O') {
            // optional, this goes red to next, green to
            this.g.addVertex(start, (j-start)+len);
            this.g.addEdge(start, j+len, 'red');
            this.g.addEdge(start, fhex(flow[k].substr(1)), 'green');
            start = j+len;
          } else if (flow[k].substr(0,1) == 'A') {
            this.g.addVertex(start, (j-start)+len);
            this.g.addEdge(start, j+len, 'blue');
            start = j+len;
          } else if (flow[k].substr(0,1) == 'R') {
            this.g.addVertex(start, (j-start)+len);
          }
        }
      }
      j += len;
    }
  }
  this.g.debugPrint();
};

IDAViewport.prototype.isAddressInFunction = function(addr) {

};

// vertices are the first address in the basic block
// edges are the two addresses + direction + color
// size doesn't matter for the graph layout algo...i think
function Graph() {
  this.vertices = {};
  this.edges = [];
}

Graph.prototype.addVertex = function(addr, vlen) {
  this.vertices[shex(addr)] = {'len': vlen};
};

// v1 -> v2
Graph.prototype.addEdge = function(v1, v2, color) {
  this.edges.push({'from': v1, 'to': v2, 'color': color});
};

Graph.prototype.debugPrint = function() {
  p('vertices: ');
  for (addr in this.vertices) {
    p('  '+addr+': '+shex(this.vertices[addr]['len']));
  }
  p('edges: ');
  for (var i = 0; i < this.edges.length; i++) {
    p('  '+shex(this.edges[i]['from'])+' -'+this.edges[i]['color']+'> '+shex(this.edges[i]['to']));
  }

};


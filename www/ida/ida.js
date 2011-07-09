// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

var view;

$(document).ready(function() {
  view = new IDAViewport($('#viewporthtmlwrapper'));
  view.registerDefaultHandlers();
  view.focus(0x4778);
});

function IDAViewport(wrapper) {
  Viewport.call(this, wrapper);
}

IDAViewport.prototype = new Viewport();
IDAViewport.prototype.constructor = IDAViewport;
IDAViewport.prototype.parent = Viewport;

IDAViewport.prototype.focus = function(addr, nopush) {
  var functiontag = db.tags(addr)['function'];
  if (functiontag === undefined) return false;
  if (nopush !== true) {
    window.history.pushState(addr);
  }

  this.g = new Graph();
  this.dom[0].innerHTML = "";


  var extents = functiontag.split(' ');
  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    db.precache(extent_addr, extent_len);
    var start = extent_addr;
    var bbreaks = [extent_addr];
    var paths = [];
    p('processing extent '+shex(extent_addr)+'-'+shex(extent_addr + extent_len));
    for (var j = extent_addr; j <= (extent_addr + extent_len);) {
      var tags = db.tags(j);
      if (tags['len'] === undefined) {
        p('!!!ERROR, no length tag in function');
      }
      var len = fnum(tags['len']);
      if (tags['flow'] !== undefined) {
        var flow = eval(tags['flow']);
        p('flow @ '+shex(j)+' : '+flow);
        for (var k = 0; k < flow.length; k++) {
          if (flow[k].substr(0,1) == 'O') {
            start = j+len;
            bbreaks.push(j+len);
            bbreaks.push(fhex(flow[k].substr(1)));
            paths.push([j, j+len]);
            paths.push([j, fhex(flow[k].substr(1))]);
          } else if (flow[k].substr(0,1) == 'A') {
            bbreaks.push(fhex(flow[k].substr(1)));
            paths.push([j, fhex(flow[k].substr(1))]);
          } else if (flow[k].substr(0,1) == 'R') {
            //this.g.addVertex(start, (j-start)+len);
            bbreaks.push(j+len);
          }
        }
      }
      j += len;
    }
    p(bbreaks);
    p(paths);

    bbreaks = jQuery.unique(bbreaks);
    bbreaks.sort();

    for (var j = 0; j < bbreaks.length-1; j++) {
      this.g.addVertex(bbreaks[j], bbreaks[j+1]-bbreaks[j]);
    }
    for (var k = 0; k < paths.length; k++) {
      var from = paths[k][0];
      var to = paths[k][1];
      for (var j = 1; j < bbreaks.length-1; j++) {
        if (bbreaks[j] > from) {
          from = bbreaks[j-1];
          break;
        }
      }
      this.g.addEdge(from, to);
    }
  }
  this.g.render();
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


// sugiyama is four steps, prove you are smarter now :P
// * rank -- order vertically
// * ordering -- order horizontally
// * position -- place horizontally
// * make_splines -- draw graph


Graph.prototype.addVertex = function(addr, vlen) {
  if (this.vertices[addr] === undefined) {
    this.vertices[addr] = {};
    this.vertices[addr]['parents'] = [];
    this.vertices[addr]['children'] = [];
    this.vertices[addr]['level'] = undefined;  // useless?
  }
  if (vlen !== undefined) {
    p('add vertex '+shex(addr)+' - '+shex(addr+vlen));
    this.vertices[addr]['len'] = vlen;
    this.vertices[addr]['rendered'] = this.renderVertex(addr);
  }
};

Graph.prototype.assignLevels = function() {
  this.levels = [[]];
  for (saddr in this.vertices) {
    var addr = fdec(saddr);
    if (this.vertices[addr]['children'].length === 0) {
      this.levels[0].push(addr);
      this.vertices[addr]['level'] = 0;
    }
  }
  // got all sinks on level 0
  var onlevel = 0;
  while (this.levels[onlevel].length > 0) {
    this.levels.push([]); // add new level
    for (var i=0; i<this.levels[onlevel].length; i++) {
      // loop over all in the current level
      var addr = this.levels[onlevel][i];
      var vertex = this.vertices[addr];
      for (var j=0; j< vertex['parents'].length; j++) {
        var paddr = vertex.parents[j];
        var pvertex = this.vertices[paddr];
        if (paddr != addr) {
          if (this.vertices[paddr]['level'] !== undefined) {
            var lvl = this.vertices[paddr]['level'];
            this.levels[lvl].splice(this.levels[lvl].indexOf(paddr), 1);
          }
          this.vertices[paddr]['level'] = onlevel+1;
          this.levels[onlevel+1].push(paddr);
        }
      }
    }
    onlevel++;
  }
  this.levels.pop(); // last level should be empty
};

Graph.prototype.inLineage = function(addr, qaddr, seen) {
  seen = seen || [];
  for (var i = 0; i < this.vertices[addr]['parents'].length; i++) {
    var taddr = this.vertices[addr]['parents'][i];
    if (taddr === addr) return true;
    if (seen.indexOf(taddr) !== -1) return false;

    if (inLineage(taddr, qaddr, seen) === true) {
      return true;
    }
  }
  return false;
};

// breath
Graph.prototype.convertToDAG = function() {
  /*p('making dag');
  var seen = [];
  var stack = [];
  for (saddr in this.vertices) {
    var addr = fdec(saddr);
    if (this.vertices[addr]['parents'].length === 0) {
      seen.push(addr);
      stack.push(addr);
    }
  }

  while (stack.length > 0) {
    var addr = stack.pop();
    for (var i = 0; i < this.vertices[addr]['children'].length; i++) {
      var naddr = this.vertices[addr]['children'][i];
      p(shex(addr) + ' has child ' + shex(naddr));
      if (this.inLineage(addr, naddr) === true) {
        this.reverseEdge(this.findEdge(addr, naddr));
      }
    }
  }*/
};

// this runs sugiyama...
Graph.prototype.render = function() {
  //this.convertToDAG();
  this.assignLevels();
  this.debugPrint();
  this.placeBoxes();
  return;
};

Graph.prototype.placeBoxes = function() {
  var datable = document.createElement('table');
  for (var i = this.levels.length-1; i >= 0; i--) {
    var tablerow = document.createElement('tr');
    var tableshit = document.createElement('td');
    for (var j = 0; j < this.levels[i].length; j++) {
      tableshit.appendChild(this.vertices[this.levels[i][j]].rendered);
    }
    tablerow.appendChild(tableshit);
    datable.appendChild(tablerow);
  }
  view.dom[0].appendChild(datable);
};

// returns DOM object containing the vertex
Graph.prototype.renderVertex = function(addr) {
  var ret = document.createElement('div');
  ret.className = 'block';
  for (var i = addr; i < addr+this.vertices[addr]['len'];) {
    var t = document.createElement('div');
    t.className = 'line';
    var tags = db.tags(i);
    t.innerHTML = displayParsed(tags['parsed']);
    ret.appendChild(t);
    i += fnum(tags['len']);
  }
  return ret;
};

Graph.prototype.findEdge = function(from, to) {
  for (var i = 0; i < this.edges.length; i++) {
    if (this.edges[i]['from'] == from && this.edges[i]['to'] == to) {
      return i;
    }
  }
  return -1;
};

Graph.prototype.reverseEdge = function(edgenum) {
  var v1 = this.edges[edgenum]['from'];
  var v2 = this.edges[edgenum]['to'];
  this.vertices[v1]['children'].splice(this.vertices[v1]['children'].indexOf(v2), 1);
  this.vertices[v2]['parents'].splice(this.vertices[v2]['parents'].indexOf(v1), 1);

  this.edges[edgenum]['from'] = v2;
  this.edges[edgenum]['to'] = v1;
  this.edges[edgenum]['reversed'] = true;
  this.vertices[v2]['children'].push(v1);
  this.vertices[v1]['parents'].push(v2);
};

// v1 -> v2
Graph.prototype.addEdge = function(v1, v2, color) {
  p('add edge '+shex(v1)+' -> '+shex(v2));
  var reversed = false;
  if (v1 > v2) {
    var t = v2;
    v2 = v1;
    v1 = t;
    reversed = true;
  }
  //this.addVertex(v1);
  //this.addVertex(v2);
  this.edges.push({'from': v1, 'to': v2, 'color': color, 'reversed': reversed});
  this.vertices[v1]['children'].push(v2);
  this.vertices[v2]['parents'].push(v1);
};

Graph.prototype.debugPrint = function() {
  p('vertices: ');
  for (saddr in this.vertices) {
    var addr = fdec(saddr);
    var vertex = this.vertices[addr];
    p('  '+addr+': '+vertex['len'] + ' ' + vertex['level'] + ' p:' + vertex['parents'] + ' c:' + vertex['children']);
  }
  p('edges: ');
  for (var i = 0; i < this.edges.length; i++) {
    p('  '+shex(this.edges[i]['from'])+' -'+this.edges[i]['color']+'> '+shex(this.edges[i]['to']));
  }

  /*for (saddr in this.vertices) {
    var addr = fdec(saddr);
    view.dom[0].appendChild(this.renderVertex(addr));
  }*/
};


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

var view;

$(document).ready(function() {
  view = new IDAViewport($('#viewporthtmlwrapper'));
  view.registerDefaultHandlers();
  view.focus(0x4000A0D4);
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

  var bblocks = {};

  var get_bblock_start = function(addr) {
    for (sa in bblocks) {
      var a = fnum(sa);
      if (a <= addr && addr < a+bblocks[a]) return a;
    }
    return null;
  };

  var bblock_split = function(addr) {
    for (sa in bblocks) {
      var a = fnum(sa);
      if (a == addr) return;
      if (a == addr+bblocks[a]) return;
      if (a < addr && addr < (a+bblocks[a])) {
        bblocks[addr] = bblocks[a] - (addr-a);
        bblocks[a] = addr-a;
        return;
      }
    }
    p('CANT SPLIT BBLOCK '+shex(addr));
  };

  var extents = functiontag.split(' ');
  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    db.precache(extent_addr, extent_len);
    p('processing extent '+shex(extent_addr)+'-'+shex(extent_addr + extent_len));
    bblocks[extent_addr] = extent_len;
  }

  var edges_pending = [];

  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    for (var j = extent_addr; j < (extent_addr + extent_len);) {
      var tags = db.tags(j);
      var len = fnum(tags['len']);

      if (tags['flow'] !== undefined) {
        var flow = eval(tags['flow']);
        p('flow @ '+shex(j)+' : '+flow);
        for (var k = 0; k < flow.length; k++) {
          if (flow[k].substr(0,1) == 'O') {
            var t = fhex(flow[k].substr(1));
            bblock_split(t);
            bblock_split(j+len);
            edges_pending.push([j, j+len, 'red']);
            edges_pending.push([j, t, 'green']);
          } else if (flow[k].substr(0,1) == 'A') {
            var t = fhex(flow[k].substr(1));
            bblock_split(t);
            bblock_split(j+len);
            edges_pending.push([j, t, 'blue']);
          } else if (flow[k].substr(0,1) == 'R') {
            bblock_split(j+len);
          }
        }
      }

      j += len;
    }
  }

  for (b in bblocks) {
    this.g.addVertex(fnum(b), bblocks[b]);
  }

  p(edges_pending);
  for (var i=0; i<edges_pending.length; i++) {
    this.g.addEdge(get_bblock_start(edges_pending[i][0]), edges_pending[i][1], edges_pending[i][2]);
  }

  for (b in bblocks) {
    var a = fnum(b);
    if (this.g.vertices[a].children.length == 0) {
      var ta = get_bblock_start(a+bblocks[a]);
      if (ta !== null) {
        this.g.addEdge(a, ta, 'blue');
      }
    }
  }

  /*var ins = {};
  var outs = {};
  var defaults = {};

  var extents = functiontag.split(' ');
  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    db.precache(extent_addr, extent_len);
    p('processing extent '+shex(extent_addr)+'-'+shex(extent_addr + extent_len));
    for (var j = extent_addr; j < (extent_addr + extent_len);) {
      var tags = db.tags(j);
      if (tags['len'] === undefined) {
        p('!!!ERROR, no length tag in function');
      }
      var len = fnum(tags['len']);
      ins[j] = [];
      outs[j] = [];
      j += len;
    }
  }

  p(ins);
  p(outs);
  p('swagg');

  for (var i = 0; i < extents.length; i++) {
    var extent = extents[i].split(':');
    var extent_addr = fhex(extent[0]);
    var extent_len = fhex(extent[1]);
    var end;
    for (var j = extent_addr; j < (extent_addr + extent_len);) {
      var tags = db.tags(j);
      if (tags['len'] === undefined) {
        p('!!!ERROR, no length tag in function');
      }
      var len = fnum(tags['len']);
      var nodefault = false;

      if (tags['flow'] !== undefined) {
        var flow = eval(tags['flow']);
        p('flow @ '+shex(j)+' : '+flow);
        for (var k = 0; k < flow.length; k++) {
          if (flow[k].substr(0,1) == 'O') {
            outs[j].push(fhex(flow[k].substr(1))+'-green');
            //outs[j].push(fhex(flow[k].substr(1)));
            ins[fhex(flow[k].substr(1))].push(j);

            outs[j].push((j+len)+'-red');
            //outs[j].push((j+len));
            ins[j+len].push(j);
            nodefault = true;
          } else if (flow[k].substr(0,1) == 'A') {
            outs[j].push(fhex(flow[k].substr(1)));
            ins[fhex(flow[k].substr(1))].push(j);
            nodefault = true;
          } else if (flow[k].substr(0,1) == 'R') {
            nodefault = true;
          }
        }
      }

      if (nodefault === false) {
        outs[j].push(j+len);
        ins[j+len].push(j);
      }
      defaults[j] = j+len;
      j += len;
      end = j;
    }

    p(ins);
    p(outs);

    var start = extent_addr;
    var addr;
    for (saddr in ins) {
      addr = fnum(saddr);
      if (ins[addr].length > 1) {
        this.g.addVertex(start, addr-start);
        if (start != addr) {
          this.g.addEdge(start, addr, "blue");
        }
        start = addr;
      }

      if ( (outs[addr].length != 1) || (outs[addr][0] !== defaults[addr])) {
        var len = fnum(db.tags(addr)['len']);
        this.g.addVertex(start, addr-start+len);
        for (var i = 0; i < outs[addr].length; i++) {
          if (typeof outs[addr][i] == "string") {
            var o = outs[addr][i].split('-');
            this.g.addEdge(start, fnum(o[0]), o[1]);
          } else {
            this.g.addEdge(start, outs[addr][i], "blue");
          }
        }
        start = addr+len;
      }
    }*/

    /*p(bbreaks);
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
  }*/
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
    var remove = []
    for (var i=0; i<this.levels[onlevel].length; i++) {
      // loop over all in the current level
      var addr = this.levels[onlevel][i];
      var vertex = this.vertices[addr];
      for (var j=0; j< vertex['parents'].length; j++) {
        var paddr = vertex.parents[j];
        var pvertex = this.vertices[paddr];
        if (paddr != addr) {
          if (pvertex['level'] !== undefined) {
            remove.push([paddr,pvertex['level']]);
          }
          pvertex['level'] = onlevel+1;
          this.levels[onlevel+1].push(paddr);
        }
      }
    }
    for (var i=0; i<remove.length;i++) {
      var paddr = remove[i][0];
      var lvl = remove[i][1];
      this.levels[lvl].splice(this.levels[lvl].indexOf(paddr), 1);
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
  /*this.assignLevels();
  this.debugPrint();
  this.placeBoxes();*/

  var send = "digraph graphname {\n";

  var gbox = document.createElement('div');
  view.dom[0].appendChild(gbox);

  for (saddr in this.vertices) {
    var addr = fnum(saddr);
    var r = this.vertices[addr].rendered;
    gbox.appendChild(r);
    var width = (r.offsetWidth * 1.0) / 72.;
    var height = (r.offsetHeight * 1.0) / 72.;

    send += 'N' + shex(addr) + ' [width="'+width+'", height="'+height+'", shape="box"];'+"\n";
  }
  for (var i = 0; i < this.edges.length; i++) {
    send += 'N' + shex(this.edges[i]['from']) + ' -> N' + shex(this.edges[i]['to']) + ' [color='+this.edges[i]['color']+', headport=n, tailport=s]'+";\n";

  }
  send += "}\n";

  var req = new XMLHttpRequest();
  req.open('POST', '/eda/graph/dot.php', false);
  req.send(send);

  p(send);
  p(req.response);

  var resp = req.response.split('\n');

  var gdata = resp[2].split('"')[1].split(',');

  gbox.style.width = fnum(gdata[2])+10;
  gbox.style.height = fnum(gdata[3])+10;

  gbox.style.position = "absolute";
  gbox.style.left = "50";
  gbox.style.top = "50";

  for (var i = 3;true;i++) {
    if (resp[i].indexOf('->') != -1) break;
    if (resp[i].indexOf('}') != -1) break;

    var addr = resp[i].split(' ')[0].split('N')[1];
    var pos = resp[i].slice(resp[i].indexOf('pos=')).split('"')[1].split(',');

    var r = this.vertices[fhex(addr)].rendered;

    r.style.position = "absolute";
    r.style.left = fnum(pos[0]) - (r.offsetWidth/2);
    r.style.top = fnum(gdata[3]) - (fnum(pos[1]) + (r.offsetHeight/2));
  }

  var lines = new Image(fnum(gdata[2]), fnum(gdata[3])+3);
  lines.src = "/eda/graph/out.gif?"+Math.random();
  lines.style.position = "absolute";
  lines.style.top = "0";
  lines.style.left = "0";
  lines.style.zIndex = -2;
  gbox.appendChild(lines);
  //p(resp);
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
  /*var a = document.createElement('div');
  a.className = 'line';
  a.innerHTML = displayParsed('\\l{'+addr+'}');
  ret.appendChild(a);*/
  for (var i = addr; i < addr+this.vertices[addr]['len'];) {
    var t = document.createElement('div');
    t.className = 'line';
    t.id = i;
    var tags = db.tags(i);
    p(shex(i));
    p(tags);
    t.innerHTML = displayParsed(tags['parsed']);
    if (tags['comment'] !== undefined) {
      t.innerHTML += '<span class="comment">; '+tags['comment']+'</span>';
    }
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
  /*if (v1 > v2) {
    var t = v2;
    v2 = v1;
    v1 = t;
    reversed = true;
  }*/
  this.addVertex(v1);
  this.addVertex(v2);
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


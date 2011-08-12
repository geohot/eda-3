// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

var view;

var gbox;
var miniscale;

$(document).ready(function() {
  view = new IDAViewport($('#viewporthtmlwrapper'));
  view.registerDefaultHandlers();
  //view.focus(0x50DC);
  if (window.location.hash == "") {
    view.focus(0x80108000);
  } else {
    view.focus(fhex(window.location.hash.substr(1)));
  }
});

function IDAViewport(wrapper) {
  Viewport.call(this, wrapper);

  var basex, basey;
  var isDown = false;

  this.positions = {};
  this.focused = null;

  this.minimap = $('#minimap')[0];
  this.miniframe = $('#miniframe')[0];
  this.miniframectx = this.miniframe.getContext("2d");

  window.onmousedown = function(e) {
    isDown = true;
    basex = e.x - fnum(gbox.style.left);
    basey = e.y - fnum(gbox.style.top);
    return false;
  }.bind(this);

  window.onmouseup = function(e) {
    isDown = false;
  };

  window.onmousemove = function(e) {
    if (isDown && !minidown) {
      this.scrollTo(e.x-basex, e.y-basey);
    }
  }.bind(this);

  window.onmousewheel = function(e) {
    this.scrollTo(e.wheelDeltaX + fnum(gbox.style.left),
                  e.wheelDeltaY + fnum(gbox.style.top));
  }.bind(this);

  var minidown = false;
  this.minimap.onmousedown = function(e) {
    //p(e);
    var x = (e.offsetX - 5)*miniscale*-1;
    var y = (e.offsetY - 5)*miniscale*-1;
    this.scrollTo(x+(window.innerWidth/2), y+(window.innerHeight/2));
    minidown = true;
  }.bind(this);

  this.minimap.onmousemove = function(e) {
    if (minidown == true) {
      var x = (e.offsetX - 5)*miniscale*-1;
      var y = (e.offsetY - 5)*miniscale*-1;
      this.scrollTo(x+(window.innerWidth/2), y+(window.innerHeight/2));
    }
  }.bind(this);

  this.minimap.onmouseup = function(e) { minidown = false; };
}

IDAViewport.prototype = new Viewport();
IDAViewport.prototype.constructor = IDAViewport;
IDAViewport.prototype.parent = Viewport;

window.onhashchange = function() {
  p('hash change');
  view.focus(fhex(window.location.hash.substr(1)));
}

IDAViewport.prototype.scrollTo = function(x, y) {
  var mctx = this.miniframectx;
  var w = window.innerWidth;
  var h = window.innerHeight;
  var t = y*-1;
  var l = x*-1;
  this.miniframe.width = this.miniframe.width;
  mctx.beginPath()
  mctx.moveTo(l/miniscale, t/miniscale)
  mctx.lineTo((l+w)/miniscale, t/miniscale);
  mctx.lineTo((l+w)/miniscale, (t+h)/miniscale);
  mctx.lineTo(l/miniscale, (t+h)/miniscale);
  mctx.lineTo(l/miniscale, t/miniscale);
  mctx.stroke();
  gbox.style.left = x;
  gbox.style.top = y;
}

IDAViewport.prototype.focus = function(addr_inner, nopush) {
  var scope = db.tags(addr_inner)['scope'];
  if (scope === undefined) return false;
  var addr = fhex(scope);

  if (this.focused !== null) {
    this.positions[this.focused] = [fnum(gbox.style.left), fnum(gbox.style.top)];
  }

  if (addr == this.focused) {
    this.setSelectedLine(addr_inner);
    var d = $('#'+addr_inner)[0];
    var x=0, y=0;
    x += d.offsetWidth/2;
    y += d.offsetHeight/2;
    while (d != gbox) {
      x += d.offsetLeft;
      y += d.offsetTop;
      d = d.parentNode;
    }

    var basex = 0 - fnum(gbox.style.left);
    var basey = 0 - fnum(gbox.style.top);
    var basew = window.innerWidth;
    var baseh = window.innerHeight;

    if ( (x < basex) || (y < basey) || (x > (basex+basew)) || (y > (basey+baseh)) ) {
      p('not in window '+basex+' '+basey+' '+(basex+basew)+' '+(basey+baseh));
      p('yo '+x+' '+y);
      x *= -1;
      y *= -1;
      x += window.innerWidth/2;
      y += window.innerHeight/2;
      this.scrollTo(x,y);
    }
    return false;
  }

  var functiontag = db.tags(addr)['function'];
  if (functiontag === undefined) return false;

  if (nopush !== true) {
    window.location.hash = shex(addr);
    //window.history.pushState(addr);
  }

  this.focused = addr;

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
        //p('flow @ '+shex(j)+' : '+flow);
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

  //p(edges_pending);
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
  this.render();
  this.setSelectedLine(addr_inner);
};

IDAViewport.prototype.render = function() {
  this.g.render();
  if (this.positions[this.focused] !== undefined) {
    this.scrollTo(this.positions[this.focused][0], this.positions[this.focused][1]);
  } else {
    this.scrollTo(50,50);
  }
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
    //p('add vertex '+shex(addr)+' - '+shex(addr+vlen));
    this.vertices[addr]['len'] = vlen;
    //this.vertices[addr]['rendered'] = this.renderVertex(addr);
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

  //p('rendering...');

  // render vertices here instead
  for (addr in this.vertices) {
    if (this.vertices[addr]['len'] !== undefined) {
      p('rendering '+shex(fnum(addr))+'-'+shex(fnum(addr)+this.vertices[addr]['len']));
      this.vertices[addr]['rendered'] = this.renderVertex(fnum(addr));
    }
  }

  var send = "digraph graphname {\n";

  gbox = document.createElement('div');
  view.dom[0].innerHTML = ""; // what a hack...
  view.dom[0].appendChild(gbox);

  for (saddr in this.vertices) {
    var addr = fnum(saddr);
    var r = this.vertices[addr].rendered;
    if (r !== undefined) {
      gbox.appendChild(r);
      var width = (r.offsetWidth * 1.0) / 72.;
      var height = (r.offsetHeight * 1.0) / 72.;
      send += 'N' + shex(addr) + ' [width="'+width+'", height="'+height+'", shape="box"];'+"\n";
    }
  }
  for (var i = 0; i < this.edges.length; i++) {
    send += 'N' + shex(this.edges[i]['from']) + ' -> N' + shex(this.edges[i]['to']) + ' [color='+this.edges[i]['color']+', headport=n, tailport=s]'+";\n";

  }
  send += "}\n";

  var req = new XMLHttpRequest();
  req.open('POST', '/eda/graph/dot.php', false);
  req.send(send);

  //p(send);

  var i;
  var respfirst = req.response.split('\n');
  var resp = [];

  for (var i=0; i<respfirst.length; i++) {
    var str = respfirst[i];
    while (str.substr(str.length-1) === "\\") {
      str = str.substr(0, str.length-1);
      i++;
      str += respfirst[i];
    }
    resp.push(str);
  }

  //p(resp.join("\n"));

  var gdata = resp[2].split('"')[1].split(',');

  gbox.style.width = fnum(gdata[2])+10;
  gbox.style.height = fnum(gdata[3])+10;

  gbox.style.position = "absolute";
  gbox.style.left = "50";
  gbox.style.top = "50";

  var minimap = $('#minimap')[0];
  var xscale = fnum(gdata[2])/100;
  var yscale = fnum(gdata[3])/300;
  miniscale = (xscale>yscale)?xscale:yscale;
  minimap.style.width = fnum(gdata[2])/miniscale+10;
  minimap.style.height = fnum(gdata[3])/miniscale+10;
  minimap.style.display = "";

  var miniframe = $('#miniframe')[0];
  miniframe.width = fnum(gdata[2])/miniscale;
  miniframe.height = fnum(gdata[3])/miniscale;

  var minicanvas = $('#minicanvas')[0];
  minicanvas.width = fnum(gdata[2])/miniscale;
  minicanvas.width = minicanvas.width;
  minicanvas.height = fnum(gdata[3])/miniscale;
  minimap.appendChild(minicanvas);
  var mctx = minicanvas.getContext("2d");

  for (i = 3;true;i++) {
    if (resp[i].indexOf('->') != -1) break;
    if (resp[i].indexOf('}') != -1) break;

    var addr = resp[i].split(' ')[0].split('N')[1];
    var pos = resp[i].slice(resp[i].indexOf('pos=')).split('"')[1].split(',');

    var r = this.vertices[fhex(addr)].rendered;

    if (r !== undefined) {
      var left = fnum(pos[0]) - (r.offsetWidth/2);
      var top = fnum(gdata[3]) - (fnum(pos[1]) + (r.offsetHeight/2));

      r.style.position = "absolute";
      r.style.left = left;
      r.style.top = top;

      var minir = document.createElement('div');
      mctx.beginPath()
      mctx.moveTo(left/miniscale, top/miniscale)
      mctx.lineTo((left+r.offsetWidth)/miniscale, top/miniscale);
      mctx.lineTo((left+r.offsetWidth)/miniscale, (top+r.offsetHeight)/miniscale);
      mctx.lineTo(left/miniscale, (top+r.offsetHeight)/miniscale);
      mctx.lineTo(left/miniscale, top/miniscale);
      mctx.stroke();
      //r.style.opacity = ".3";
      //r.style.visibility = "hidden";
    }
  }

  var canvas = document.createElement("canvas");
  canvas.width = fnum(gdata[2])+10;
  canvas.height = fnum(gdata[3])+10;
  gbox.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  while(true) {
    if (resp[i].indexOf('}') != -1) break;
    var color = resp[i].substr(resp[i].indexOf('color=')+6).split(',')[0];
    var posstr = resp[i].substr(resp[i].indexOf('pos="')+7).split('"')[0].split(' ');
    var pos = [];
    for (var j=0; j<(posstr.length); j++) {
      var to = posstr[j].split(',');
      pos.push({x:parseFloat(to[0]), y:fnum(gdata[3]) - parseFloat(to[1])});
    }

    // draw spline
    ctx.beginPath();
    // pos[0] is end
    // pos[1] is start
    ctx.moveTo(pos[1].x, pos[1].y);
    for (var j=2; j<pos.length; j+=3) {
      ctx.bezierCurveTo(pos[j].x, pos[j].y, pos[j+1].x, pos[j+1].y, pos[j+2].x, pos[j+2].y);
    }
    ctx.lineTo(pos[0].x, pos[0].y);

    if (pos[1].y < pos[0].y) {
      ctx.lineWidth = 1;
    } else {
      ctx.lineWidth = 2;
    }

    ctx.strokeStyle = color;
    ctx.stroke();

    // draw arrow
    ctx.beginPath();
    ctx.moveTo(pos[0].x, pos[0].y);
    ctx.lineTo(pos[0].x-5, pos[0].y-10);
    ctx.lineTo(pos[0].x+5, pos[0].y-10);
    ctx.lineWidth = 1;
    ctx.fillStyle = color;
    ctx.fill();

    // draw in minimap
    mctx.beginPath();
    mctx.moveTo(pos[1].x/miniscale, pos[1].y/miniscale);
    for (var j=2; j<pos.length; j+=3) {
      mctx.bezierCurveTo(pos[j].x/miniscale, pos[j].y/miniscale,
        pos[j+1].x/miniscale, pos[j+1].y/miniscale,
        pos[j+2].x/miniscale, pos[j+2].y/miniscale);
    }
    mctx.lineTo(pos[0].x/miniscale, pos[0].y/miniscale);
    mctx.lineWidth = 1;
    mctx.strokeStyle = color;
    mctx.stroke();

    i++;
  }

  /*var lines = new Image(fnum(gdata[2]), fnum(gdata[3])+3);
  lines.src = "/eda/graph/out.gif?"+Math.random();
  lines.style.position = "absolute";
  lines.style.top = "0";
  lines.style.left = "0";
  lines.style.zIndex = -2;
  gbox.appendChild(lines);*/
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

  var a = document.createElement('div');
  a.className = 'line';
  a.innerHTML = displayParsed('\\l{'+addr+'}');
  ret.appendChild(a);

  for (var i = addr; i < addr+this.vertices[addr]['len'];) {
    var t = document.createElement('div');
    t.className = 'line';
    t.id = i;
    var tags = db.tags(i);
    //p(shex(i));
    //p(tags);
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
  //p('add edge '+shex(v1)+' -> '+shex(v2));
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


// vertices are the first address in the basic block
// edges are the two addresses + direction + color
// size doesn't matter for the graph layout algo...i think
function Graph(graphview) {
  this.vertices = {};
  this.edges = [];
  this.graphview = graphview;
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
  gbox.id = 'gbox';
  this.graphview.dom[0].innerHTML = ""; // what a hack...
  this.graphview.dom[0].appendChild(gbox);

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


  // gbox absolute isn't good
  gbox.style.left = "50";
  gbox.style.top = "50";

  /* rescale the minimap */
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

      //r.style.position = "absolute";
      r.style.left = left;
      r.style.top = top;

      var minir = document.createElement('div');
      /* draw the boxes in the minimap */
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
  this.graphview.dom[0].appendChild(datable);
};

// returns DOM object containing the vertex
Graph.prototype.renderVertex = function(addr) {
  var ret = document.createElement('div');
  ret.className = 'block gblock';

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
      t.innerHTML += displayComment(tags['comment']);
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


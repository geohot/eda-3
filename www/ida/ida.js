// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/viewport.js');

require('core/core.js');

var view;

var gbox;
var miniscale;

function IDAViewport(wrapper) {
  Viewport.call(this, wrapper);

  var basex, basey;
  var isDown = false;

  this.positions = {};
  this.focused = null;

  this.wrapper = wrapper;

  var creatingMinimap = $('<div class="minimap" id="minimap"><canvas id="minicanvas" width=0 height=0></canvas><canvas id="miniframe" width=0 height=0></canvas></div>');

  wrapper.prepend(creatingMinimap);

  this.minimap = creatingMinimap[0];
  this.miniframe = creatingMinimap.children('#miniframe')[0];
  this.miniframectx = this.miniframe.getContext("2d");

  /* space to switch views */
  this.registerKeyHandler(KEY_SPACE, function() {
    //p(this.selectedLine);
    window.location = "/eda/flat/index.html#"+shex(this.selectedLine);
  }.bind(this));

  wrapper[0].ontouchstart = function(e) {
    var x = e.changedTouches[0].pageX;
    var y = e.changedTouches[0].pageY;
    basex = x - fnum(gbox.style.left);
    basey = y - fnum(gbox.style.top);
  }.bind(this);

  wrapper[0].ontouchmove = function(e) {
    var x = e.changedTouches[0].pageX;
    var y = e.changedTouches[0].pageY;
    this.scrollTo(x-basex, y-basey);
    return false;
  }.bind(this);

  wrapper[0].onmousedown = function(e) {
    if (gbox == undefined) return;
    isDown = true;
    basex = e.x - fnum(gbox.style.left);
    basey = e.y - fnum(gbox.style.top);
    //p(e);
    /*if (e.target.nodeName === "OPTION")
      return true;
    else*/
      return false;
  }.bind(this);

  wrapper[0].onmouseup = function(e) {
    isDown = false;
  };

  wrapper[0].onmouseout = function(e) {
    isDown = false;
  };

  wrapper[0].onmousemove = function(e) {
    if (gbox == undefined) return;
    if (isDown && !minidown) {
      this.scrollTo(e.x-basex, e.y-basey);
    }
  }.bind(this);

  wrapper[0].onmousewheel = function(e) {
    if (gbox == undefined) return;
    this.scrollTo(e.wheelDeltaX + fnum(gbox.style.left),
                  e.wheelDeltaY + fnum(gbox.style.top));
  }.bind(this);

  var minidown = false;
  this.minimap.onmousedown = function(e) {
    if (gbox == undefined) return;
    //p(e);
    var x = (e.offsetX - 5)*miniscale*-1;
    var y = (e.offsetY - 5)*miniscale*-1;
    this.scrollTo(x+(wrapper[0].offsetWidth/2), y+(wrapper[0].offsetHeight/2));
    minidown = true;
  }.bind(this);

  this.minimap.onmousemove = function(e) {
    if (gbox == undefined) return;
    if (minidown == true) {
      var x = (e.offsetX - 5)*miniscale*-1;
      var y = (e.offsetY - 5)*miniscale*-1;
      this.scrollTo(x+(wrapper[0].offsetWidth/2), y+(wrapper[0].offsetHeight/2));
    }
  }.bind(this);

  this.minimap.onmouseup = function(e) { minidown = false; };
}

IDAViewport.prototype = new Viewport();
IDAViewport.prototype.constructor = IDAViewport;
IDAViewport.prototype.parent = Viewport;

IDAViewport.prototype.scrollTo = function(x, y) {
  if (gbox == undefined) return;
  //p('scrollto '+x+'  '+y);
  var mctx = this.miniframectx;
  var w = this.wrapper[0].offsetWidth;
  var h = this.wrapper[0].offsetHeight;
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
  p("focus on "+shex(addr_inner));
  var scope = db.tags(addr_inner)['scope'];
  if (scope === undefined) {
    /* replace this with jump to flat view */
    p('cant focus on '+shex(addr_inner));
    window.location = "/eda/flat/index.html#"+shex(addr_inner);
    return false;
  }
  var addr = fhex(scope);

  if (this.focused !== null) {
    this.positions[this.focused] = [fnum(gbox.style.left), fnum(gbox.style.top)];
  }

  if (addr === this.focused) {
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
    var basew = this.wrapper[0].offsetWidth;
    var baseh = this.wrapper[0].offsetHeight;

    if ( (x < basex) || (y < basey) || (x > (basex+basew)) || (y > (basey+baseh)) ) {
      p('not in window '+basex+' '+basey+' '+(basex+basew)+' '+(basey+baseh));
      p('yo '+x+' '+y);
      x *= -1;
      y *= -1;
      // over 2 was overkill
      x += basew/4;
      y += baseh/4;
      this.scrollTo(x,y);
    }
    return false;
  }

  var functiontag = db.tags(addr)['function'];
  if (functiontag === undefined) return false;

  if (nopush !== true) {
    window.location.hash = shex(addr_inner);
    window.history.replaceState(addr);
    //window.history.pushState(addr);
  }

  this.focused = addr;

  this.g = new Graph(this);
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
    var flow = db.tags(a)['flow'];
    if (flow != null && flow.indexOf('R') != -1) continue;
    if (this.g.vertices[a].children.length == 0) {
      var ta = get_bblock_start(a+bblocks[a]);
      if (ta !== null) {
        // hack for arm/thumb
        // no easy way to get the last whole thing in a bblock
        var flow = db.tags(ta-2)['flow'];
        if (flow != null && flow.indexOf('R') != -1) continue;
        var flow = db.tags(ta-4)['flow'];
        if (flow != null && flow.indexOf('R') != -1) continue;
        this.g.addEdge(a, ta, 'blue');
      }
    }
  }

  this.render();
  //this.setSelectedLine(addr_inner);
  this.focus(addr_inner);
};

IDAViewport.prototype.render = function() {
  this.g.render();
  if (this.positions[this.focused] !== undefined) {
    this.scrollTo(this.positions[this.focused][0], this.positions[this.focused][1]);
  } else {
    this.scrollTo(300,50);
  }
};


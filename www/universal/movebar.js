// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

function MoveBarController(dom, se, ee, step) {
  this.se = se;
  this.ee = ee;
  this.step = step;
  this.swidth = 1;
  this.dom = dom;
  this.canvas = $('<canvas id="movebarspace"></canvas>');
  // don't use style to resize canvas
  this.canvas[0].height = 30;
  this.canvas[0].width = (((this.ee-this.se)/this.step)*this.swidth);
  this.dom.append(this.canvas);
  this.render();
}

MoveBarController.prototype.render = function() {
  var ctx = this.canvas[0].getContext('2d');
  var a = 0;
  for (var i = this.se; i < this.ee; i+= this.step) {
    var color = "#B6B66B";
    var tags = db.tags(i);
    if (tags['scope'] !== undefined) {
      // inside function
      color = "#00A2E8";
    }
    ctx.fillStyle = color;
    ctx.fillRect(a, 0, this.swidth, 30);
    a += this.swidth;
  }
}


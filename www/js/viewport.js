// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var KEY_DOWNARROW = 40;
var KEY_UPARROW = 38;
var KEY_RIGHTARROW = 39;
var KEY_LEFTARROW = 37;
var KEY_BACKSPACE = 8;

var KEY_PAGEUP = 33;
var KEY_PAGEDOWN = 34;

var KEY_LEFTCHOKE = 219;
var KEY_RIGHTCHOKE = 221;

var KEY_FKEY = 111; // FKEY+3 = F3 etc...

var KEY_SPACE = 32;

var KEY_ENTER = 13;
var KEY_ESC = 27;
var KEY_CTRL = 0x100;

var KEY_SEMICOLON = 186;

window.onkeydown = function(e) {
  var keynum = e.which;
  //p('key: '+keynum);
  if (view.dialogBox != null) {
    if (keynum == KEY_ESC) {
      view.dialogDismiss(false);
    }
    if (keynum == KEY_ENTER) {
      view.dialogDismiss(true);
    }
    return;
  }
  if (e.ctrlKey) keynum += KEY_CTRL;
  if (view.keyBindings[keynum] != null) {
    view.keyBindings[keynum](e);
    return false;
  }
};

// constructor
function Viewport(wrapper) {
  if (wrapper == undefined) return;
  this.keyBindings = [];
  this.clickBindings = [];
  this.dblClickBindings = [];
  this.wrapper = wrapper;
  this.dom = $(document.createElement('div'));
  this.dom[0].className = "viewport";
  this.wrapper[0].appendChild(this.dom[0]);
  this.dialogBox = null;
  this.focused = null;

  this.selectedLine = null;
  this.selectedLocation = null;

  var handleWithBindings = function(e, bindings) {
    var node = e.target;
    while (node && node.className != 'viewport') {
      //p('  '+node.className);
      var classes = node.className.split(' ');
      for (var i = 0; i < classes.length; i++) {
        var binding = bindings[classes[i]];
        if (binding !== undefined) {
          p("calling "+classes[i]);
          var stop = binding(node, e);
          if (stop === true) break;
        }
      }
      node = node.parentNode;
    }
  };

  this.dom[0].onclick = function(e) {
    p('click '+e.target.className);
    handleWithBindings(e, this.clickBindings);
  }.bind(this);

  this.dom[0].ondblclick = function(e) {
    p('dblclick '+e.target.className);
    handleWithBindings(e, this.dblClickBindings);
  }.bind(this);

  this.dom[0].onmousewheel = function(e) {
    if (this.handleScrolling !== undefined) {
      return this.handleScrolling(e.wheelDelta);
    }
  }.bind(this);

  this.dom[0].onselectstart = function(e) { return false; }
};

Viewport.prototype.setSelectedLine = function(addr) {
  if (this.selectedLine !== null) {
    $('#'+this.selectedLine).removeClass('line_selected');
    this.selectedLine = null;
  }
  if ($('#'+addr).length != 0) {
    this.selectedLine = addr;
    $('#'+this.selectedLine).addClass('line_selected');
    p('selected '+shex(addr));
    // only in ida
    //updateCausedChanges(addr);
  }
  return false;
};

Viewport.prototype.setSelectedLocation = function(ele) {
  if (this.selectedLocation !== null) {
    //$(this.selectedLocation).removeClass('location_selected');
    $('.'+this.selectedLocation.childNodes[0].className).parent().removeClass('location_selected');
  }
  this.selectedLocation = ele;
  if (ele !== null) {
    //$(this.selectedLocation).addClass('location_selected');
    $('.'+this.selectedLocation.childNodes[0].className).parent().addClass('location_selected');
  }
  return false;
};

Viewport.prototype.registerDefaultHandlers = function() {
  this.registerKeyHandler(asc('G'), function() {
    this.dialog("Jump to address", function(data) {
      var isname = false;
      // can be a name, check
      for (var i=0; i<data.length; i++) {
        if ('0123456789abcdefABCDEF'.indexOf(data.substr(i, 1)) == -1) {
          isname = true;
          break;
        }
      }
      if (isname == true) {
        var findings = db.search('name', data);
        if (findings.length > 0) {
          this.focus(findings[0]);
        }
      } else {
        var addr = fhex(data);
        if (addr != NaN) {
          this.focus(addr);
        }
      }
    }.bind(this));
  }.bind(this));

  this.registerKeyHandler(KEY_SEMICOLON, function() {
    if (this.selectedLine !== null) {
      this.dialog("Enter comment", function(data) {
        this.positions[this.focused] = [fnum(gbox.style.left), fnum(gbox.style.top)];
        db.setTag(this.selectedLine, 'comment', data);
        this.render();
      }.bind(this), db.tags(this.selectedLine)['comment']);
    }
  }.bind(this));

  this.registerKeyHandler(asc('N'), function() {
    if (this.selectedLocation !== null) {
      var loc = fhex(this.selectedLocation.childNodes[0].value);
      this.dialog("Rename 0x"+shex(loc), function(data) {
        this.positions[this.focused] = [fnum(gbox.style.left), fnum(gbox.style.top)];
        db.setTag(loc, 'name', data);
        this.render();
      }.bind(this), db.tags(loc)['name']);
    }
  }.bind(this));

  this.registerKeyHandler(asc('X'), function() {
    var loc = fhex(this.selectedLocation.childNodes[0].value);
    p("xrefs for "+loc);
    var flow = eval(db.tags(loc)['flow']);
    if (flow !== undefined) {
      var xrefs = flow.filter(function(x) { if(x.substr(0,1)=='X') return true; });
      for (var i=0;i<xrefs.length;i++) {
        var addr = fhex(xrefs[i].substr(1));
        var scope = fhex(db.tags(addr)['scope']);
        var s = '\\l{'+addr+'}';
        if (scope !== undefined) {
          s += ' in \\l{'+scope+'}';
        }
        xrefs[i] = displayParsed(s);

        //xrefs[i] = displayParsed('\\l{'+fhex(xrefs[i].substr(1))+'}');
      }
      if (xrefs.length > 0) {
        this.dialogList("xrefs for "+shex(loc), function(data) {
          var tmp = document.createElement('span');
          tmp.innerHTML = data;
          var addr = tmp.childNodes[0].value
          this.focus(fhex(addr));
        }.bind(this), xrefs);
        //p(xrefs);
      }
    }
  }.bind(this));

  this.registerKeyHandler(KEY_ESC, function() {
    window.history.back();
  });

  this.registerDblClickHandler('i_location', function(ele) {
    this.focus(fhex(ele.childNodes[0].value));
  }.bind(this));

  this.registerDblClickHandler('i_deref', function(ele) {
    this.focus(fhex(ele.childNodes[0].value));
  }.bind(this));

  this.registerClickHandler('line', function(ele) {
    return this.setSelectedLine(fnum(ele.id));
  }.bind(this));

  this.registerClickHandler('i_location i_corelocation', function(ele) {
    return this.setSelectedLocation(ele);
  }.bind(this));

  this.registerClickHandler('i_deref', function(ele) {
    return this.setSelectedLocation(ele);
  }.bind(this));

  window.onpopstate = function(e) {
    e.preventDefault();
    if (e.state !== null) {
      p(e);
      this.focus(e.state, true);
    }
    return false;
  }.bind(this);
}

Viewport.prototype.registerKeyHandler = function(num, fxn) {
  p("adding key binding "+num)
  this.keyBindings[num] = fxn;
};

Viewport.prototype.registerClickHandler = function(classnames, fxn) {
  classes = classnames.split(' ');
  for (var i=0;i < classes.length; i++) {
    this.clickBindings[classes[i]] = fxn;
  }
};

Viewport.prototype.registerDblClickHandler = function(classnames, fxn) {
  classes = classnames.split(' ');
  for (var i=0;i < classes.length; i++) {
    this.dblClickBindings[classes[i]] = fxn;
  }
};

Viewport.prototype.dialogDismiss = function(do_callback) {
  var box = $(this.dialogBox);
  var value;
  if (this.dialogInput.value !== undefined) {
    var value = this.dialogInput.value;
  }

  this.dialogBox = null;
  if (do_callback === true) {
    this.dialogCallback(value);
  }
  box.remove();
  this.dom[0].style.opacity = 1;
};

Viewport.prototype.dialogList = function(text, callback, list) {
  this.dom[0].style.opacity = 0.6;

  this.dialogBox = document.createElement('div');
  this.dialogBox.className = 'dialogBox';
  this.dialogCallback = callback;
  var dialogText = document.createElement('div');
  dialogText.innerHTML = text;

  this.dialogInput = document.createElement('div');
  var ih = "";
  for (var i = 0; i < list.length; i++) {
    var td = document.createElement('div');
    td.innerHTML = list[i];
    td.className = 'xrefBox';
    td.onclick = function(e) {
      this.dialogDismiss(false);
      callback(e.target.innerHTML);
    }.bind(this);
    this.dialogInput.appendChild(td);
  }

  this.dialogBox.appendChild(dialogText);
  this.dialogBox.appendChild(this.dialogInput);

  this.wrapper[0].appendChild(this.dialogBox);
};

Viewport.prototype.dialog = function(text, callback, inputvalue) {
  inputvalue = inputvalue || "";
  this.dom[0].style.opacity = 0.6;

  this.dialogBox = document.createElement('div');
  this.dialogBox.className = 'dialogBox';
  this.dialogCallback = callback;
  var dialogText = document.createElement('div');
  dialogText.innerHTML = text;

  this.dialogInput = document.createElement('input');
  this.dialogInput.value = inputvalue;

  this.dialogBox.appendChild(dialogText);
  this.dialogBox.appendChild(this.dialogInput);

  this.wrapper[0].appendChild(this.dialogBox);

  this.dialogInput.focus();
};


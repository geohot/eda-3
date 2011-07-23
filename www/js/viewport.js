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

var KEY_ENTER = 13;
var KEY_ESC = 27;
var KEY_CTRL = 0x100;

var KEY_SEMICOLON = 186;

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

  this.selectedLine = null;
  this.selectedLocation = null;

  window.onkeydown = function(e) {
    var keynum = e.which;
    p('key: '+keynum);
    if (this.dialogBox != null) {
      if (keynum == KEY_ESC) {
        this.dialogDismiss(false);
      }
      if (keynum == KEY_ENTER) {
        this.dialogDismiss(true);
      }
      return;
    }
    if (e.ctrlKey) keynum += KEY_CTRL;
    if (this.keyBindings[keynum] != null) {
      this.keyBindings[keynum](e);
      return false;
    }
  }.bind(this);

  var handleWithBindings = function(e, bindings) {
    var node = e.target;
    while (node.className != 'viewport') {
      p('  '+node.className);
      var classes = node.className.split(' ');
      for (var i = 0; i < classes.length; i++) {
        var binding = bindings[classes[i]];
        if (binding !== undefined) {
          var stop = binding(node);
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
      this.handleScrolling(e.wheelDelta);
    }
  }.bind(this);

  this.dom[0].onselectstart = function(e) { return false; }
};

Viewport.prototype.setSelectedLine = function(addr) {
  p('selected '+shex(addr));
  if (this.selectedLine !== null) {
    $('#'+this.selectedLine).removeClass('line_selected');
    this.selectedLine = null;
  }
  if ($('#'+addr).length != 0) {
    this.selectedLine = addr;
    $('#'+this.selectedLine).addClass('line_selected');
  }
  return false;
};

Viewport.prototype.setSelectedLocation = function(ele) {
  if (this.selectedLocation !== null) {
    $(this.selectedLocation).removeClass('location_selected');
  }
  this.selectedLocation = ele;
  if (ele !== null) {
    $(this.selectedLocation).addClass('location_selected');
  }
  return false;
};

Viewport.prototype.registerDefaultHandlers = function() {
  this.registerKeyHandler(asc('G'), function() {
    this.dialog("Jump to address", function(data) {
      var addr = fhex(data);
      if (addr != NaN) {
        this.focus(addr);
      }
    }.bind(this));
  }.bind(this));

  this.registerKeyHandler(KEY_SEMICOLON, function() {
    if (this.selectedLine !== null) {
      this.dialog("Enter comment", function(data) {
        db.setTag(this.selectedLine, 'comment', data);
        this.g.render();
      }.bind(this), db.tags(this.selectedLine)['comment']);
    }
  }.bind(this));

  this.registerKeyHandler(asc('N'), function() {
    if (this.selectedLocation !== null) {
      var loc = fhex(this.selectedLocation.childNodes[0].value);
      this.dialog("Rename 0x"+shex(loc), function(data) {
        db.setTag(loc, 'name', data);
        this.g.render();
      }.bind(this), db.tags(loc)['name']);
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

  this.registerClickHandler('i_location', function(ele) {
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
  this.keyBindings[num] = fxn;
};

Viewport.prototype.registerClickHandler = function(classname, fxn) {
  this.clickBindings[classname] = fxn;
};

Viewport.prototype.registerDblClickHandler = function(classname, fxn) {
  this.dblClickBindings[classname] = fxn;
};


Viewport.prototype.dialogDismiss = function(do_callback) {
  var box = $(this.dialogBox);
  var value = this.dialogInput.value;
  this.dialogBox = null;
  if (do_callback === true) {
    this.dialogCallback(value);
  }
  box.remove();
  this.dom[0].style.opacity = 1;
};

Viewport.prototype.dialog = function(text, callback, inputvalue) {
  inputvalue = inputvalue || "";
  this.dom[0].style.opacity = 0.6;

  this.dialogBox = document.createElement('div');
  this.dialogBox.className = 'dialogBox';

  var dialogText = document.createElement('div');
  dialogText.innerHTML = text;
  this.dialogInput = document.createElement('input');
  this.dialogInput.value = inputvalue;
  this.dialogCallback = callback;

  this.dialogBox.appendChild(dialogText);
  this.dialogBox.appendChild(this.dialogInput);

  this.wrapper[0].appendChild(this.dialogBox);

  this.dialogInput.focus();
};


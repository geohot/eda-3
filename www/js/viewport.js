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

  window.onkeydown = function(e) {
    var keynum = e.which;
    //p(keynum);
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

  this.dom[0].onclick = function(e) {
    var binding = this.clickBindings[e.target.className];
    if (binding !== undefined) {
      binding(e.target);
    }
  }.bind(this);

  this.dom[0].ondblclick = function(e) {
    var binding = this.dblClickBindings[e.target.className];
    if (binding !== undefined) {
      binding(e.target);
    }
  }.bind(this);

};

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

Viewport.prototype.dialog = function(text, callback) {
  this.dom[0].style.opacity = 0.6;

  this.dialogBox = document.createElement('div');
  this.dialogBox.className = 'dialogBox';

  var dialogText = document.createElement('div');
  dialogText.innerHTML = text;
  this.dialogInput = document.createElement('input');
  this.dialogCallback = callback;

  this.dialogBox.appendChild(dialogText);
  this.dialogBox.appendChild(this.dialogInput);

  this.wrapper[0].appendChild(this.dialogBox);

  this.dialogInput.focus();
};


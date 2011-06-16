// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

// this is all the keyboard functions

var DOWNARROW = 40;
var UPARROW = 38;
var RIGHTARROW = 39;
var LEFTARROW = 37;
var BACKSPACE = 8;

var PAGEUP = 33;
var PAGEDOWN = 34;

var LEFTCHOKE = 219;
var RIGHTCHOKE = 221;

var FKEY = 111; // FKEY+3 = F3 etc...

var CTRL = 0x100;

// function registerKeyHandler(key, function)

// selectAddress will move if the address isn't on the page
// 3rd optional param to selectAddress is selectAtBottom


// ** movement functions **

registerKeyHandler(BACKSPACE, function() {
  selectAddress(selectedAddress - 1, selectedType);
});

registerKeyHandler(LEFTARROW, function() {
  selectAddress(selectedAddress - 1, selectedType);
});

registerKeyHandler(RIGHTARROW, function() {
  selectAddress(selectedAddress + 1, selectedType, true);
});

registerKeyHandler(UPARROW, function() {
  selectAddress(selectedAddress - 0x10, selectedType);
});

registerKeyHandler(DOWNARROW, function() {
  selectAddress(selectedAddress + 0x10, selectedType, true);
});

registerKeyHandler(PAGEUP, function() {
  viewportAddress -= viewportLength - viewportWidth;
  renderHexViewport(viewportAddress, viewportLength);
  selectAddress(selectedAddress - (viewportLength - viewportWidth), selectedType);
});

registerKeyHandler(PAGEDOWN, function() {
  viewportAddress += viewportLength - viewportWidth;
  renderHexViewport(viewportAddress, viewportLength);
  selectAddress(selectedAddress + (viewportLength - viewportWidth), selectedType);
});


// ** selection functions **

registerKeyHandler(CTRL | asc('G'), function() {
  $('#addressinput')[0].select();
});

registerKeyHandler(CTRL | asc('C'), function() {
  $('#hchangeinput')[0].select();
});

registerKeyHandler(CTRL | asc('V'), function() {
  $('#vchangeinput')[0].select();
});


// ** action functions **

registerKeyHandler(CTRL | asc('S'), function() {
  handleCommit();
});


// ** metamovement functions **

registerKeyHandler(CTRL | LEFTCHOKE, function(e) {
  if (currentChangeNumber != 0) {
    currentChangeNumber = (currentChangeNumber - 1);
  } else {
    currentChangeNumber = maxChangeNumber;
  }
  updateControlBox();
  renderHexViewport(viewportAddress, viewportLength);
  selectAddress(selectedAddress, selectedType);
});

registerKeyHandler(CTRL | RIGHTCHOKE, function(e) {
  if (currentChangeNumber < maxChangeNumber) {
    currentChangeNumber = (currentChangeNumber + 1);
  } else {
    currentChangeNumber = 0;
  }
  updateControlBox();
  renderHexViewport(viewportAddress, viewportLength);
  selectAddress(selectedAddress, selectedType);
});

registerKeyHandler(LEFTCHOKE, function(e) {
  if (highlightedChange != 0) {
    highlightChange(highlightedChange - 1);
  } else {
    highlightChange(maxChangeNumber);
  }
});

registerKeyHandler(RIGHTCHOKE, function(e) {
  if (highlightedChange < maxChangeNumber) {
    highlightChange(highlightedChange + 1);
  } else {
    highlightChange(0);
  }
});

// ** metamovement handlers **

$('#addressinput')[0].onkeydown = function(e) {
  if (e.keyCode == 13) {
    $('#addressinput')[0].blur();
    var val = $('#addressinput')[0].value;
    if (val.substr(0,1) == '-') { viewportAddress = viewportAddress - fhex(val.substr(1)); }
    else if (val.substr(0,1) == '+') { viewportAddress = viewportAddress + fhex(val.substr(1)); }
    else { viewportAddress = fhex(val); }
    renderHexViewport(viewportAddress, viewportLength);
    selectAddress(viewportAddress, 'H');
  }
};

$('#hchangeinput')[0].onkeydown = function(e) {
  if (e.keyCode == 13) {
    $('#hchangeinput')[0].blur();
    highlightChange(fdec($('#hchangeinput')[0].value));
  }
};

$('#vchangeinput')[0].onkeydown = function(e) {
  if (e.keyCode == 13) {
    $('#vchangeinput')[0].blur();
    currentChangeNumber = fdec($('#vchangeinput')[0].value);
    updateControlBox();
    renderHexViewport(viewportAddress, viewportLength);
    selectAddress(selectedAddress, selectedType);
  }
};


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/parser.js');

var iset = "arm";
var registerList;

var PC = 0xEDA0003C;

$(document).ready(function() {
  rebuildParser();
  registerList = db.search('type', 'register');
  registerList.forEach(function(r) {
    db.setimmed(r, 0);
  });
  db.setimmed(PC, 8);
  //db.setimmed(0xEDA00000, 0xAABBCCDD);
  displayRegisters();
});

function displayRegisters() {
  var dom = $('#registers')[0];
  dom.innerHTML = "";
  registerList.forEach(function(r) {
    var ins = document.createElement('div');
    ins.innerHTML = db.tags(r)['name'] + ' = 0x' + shex(db.immed(r));
    dom.appendChild(ins);
  });
}

function doStep() {
  var dom = $('#run')[0];

  var addr = db.immed(PC)-8;
  var parseobj = parseInstruction(addr, db.raw(addr, 16));
  var runobj = runInstruction(addr, db.raw(addr, 16));

  var ins = document.createElement('div');
  ins.innerHTML = '0x'+shex(addr)+': '+displayParsed(parseobj['parsed']);
  dom.appendChild(ins);

  //p(runobj);
  var didSetPC = false;
  runobj.forEach(function(set) {
    if (set[0][0] == PC) {
      didSetPC = true;
    }
    db.setimmed(set[0][0], set[1], set[0][1]);
  });

  if (didSetPC === false) {
    db.setimmed(PC, db.immed(PC)+parseobj['len']);
  }

  displayRegisters();
}


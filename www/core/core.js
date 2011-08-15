// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/parser.js');
require('js/viewport.js');

var registerList;

var PC = 0xEDA0003C;

var instructionsRun = 0;
var lastInstructionsRun = 0;

function getFrequency() {
  //p( (instructionsRun - lastInstructionsRun) + " hz");
  $('#frequency')[0].innerHTML = (instructionsRun - lastInstructionsRun) + " hz";
  lastInstructionsRun = instructionsRun;
  setTimeout(getFrequency, 1000);

  // hacky
  db.flushCommitCache();
}

function initCore(liset) {
  iset = liset;
  rebuildParser();
  registerList = db.search('type', 'register');
  displayRegisters();
  getFrequency();
}

function doRun() {
  doStep();
  setTimeout(doRun, 0);
}

function editRegister(e) {
  var addr = fnum(e.target.id.substr(4));
  view.dialog(db.tags(addr)['name'], function(ret) {
    db.setimmed(addr, fhex(ret), 4);
    p('committed '+commit());
    displayRegisters();
  }, e.target.innerHTML);
}

function displayRegisters() {
  var dom = $('#registers')[0];
  dom.innerHTML = "";
  registerList.forEach(function(r) {
    var ins = document.createElement('div');
    var inreg = document.createElement('span');
    inreg.innerHTML = '0x'+shex(db.immed(r));
    inreg.id = 'reg_'+r;
    inreg.onclick = editRegister;

    ins.innerHTML = db.tags(r)['name'] + ' = ';
    ins.appendChild(inreg);

    dom.appendChild(ins);
  });
}

function getAddr() {
  var addr = db.immed(PC);
  if (iset == 'arm') addr-=8;
  else if (iset == 'thumb') addr-=4;
  return addr;
}

function renderIntoBuffer(parseobj, dom) {
  var ins = document.createElement('div');
  ins.innerHTML = '0x'+shex(addr)+': '+displayParsed(parseobj['parsed']);
  if (dom.childNodes.length > 0x20) {
    dom.removeChild(dom.childNodes[0]);
  }
  dom.appendChild(ins);
}

function doStep() {
  var addr = getAddr();
  var parseobj = parseInstruction(addr, db.raw(addr, 16));
  var runobj = runInstruction(addr, db.raw(addr, 16));

  var dom = $('#run')[0];

  if (dom !== undefined) {
    renderIntoBuffer(parseobj, dom);
  }

  //p(runobj);
  var didSetPC = false;
  runobj.forEach(function(set) {
    if (set[0][0] == PC) {
      didSetPC = true;
    }
    db.setimmed(set[0][0], set[1], set[0][1]);
    if (registerList.indexOf(set[0][0]) !== -1) {
      $('#reg_'+set[0][0])[0].innerHTML = '0x'+shex(set[1]);
    }
  });

  if (didSetPC === false) {

    db.setimmed(PC, db.immed(PC)+parseobj['len'], 4);
    $('#reg_'+PC)[0].innerHTML = '0x'+shex(db.immed(PC));
  }

  //p('committed '+commit());
  db.cacheCommit();
  instructionsRun++;

  //displayRegisters();
}


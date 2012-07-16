// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/db.js');
require('js/parser.js');
require('js/viewport.js');

var registerList;

var PC = 0xEDA0003C;

var instructionsRun = 0;
var lastInstructionsRun = 0;


/* copied from IDA, belongs here */

function idaStep() {
  doStep();
  rightTab.activeTabData.focus(getAddr());
}

function idaRemoteStep() {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/step.php?n=1', false);
  req.send(null);
  db.invalidateDCachePage(0xEDA00000);
  displayRegisters();
  rightTab.activeTabData.focus(getAddr());
}

var untilAddr = null;
function runUntilStart() {
  untilAddr = rightTab.activeTabData.selectedLine;
  $('#until')[0].value = 'until 0x'+shex(untilAddr);
  runUntil();
}

function runUntil() {
  if (untilAddr !== null) {
    idaStep();
    if (getAddr() !== untilAddr) {
      setTimeout(runUntil, 0);
    } else {
      $('#until')[0].value = 'until';
      untilAddr = null;
    }
  }
}

function stopRunUntil() {
  $('#until')[0].value = 'until';
  untilAddr = null;
}

function clickChange(change) {
  $('#change_'+change)[0].selected = true;
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/getchangelist.php?n='+change, false);
  req.send(null);
  var json = jQuery.parseJSON(req.response);
  var ih = "";
  var pending = "";
  var pendnum;
  var pendcount = 0;
  var pendval = 0;
  for (c in json) {
    if ((pending !== "" && pendnum != fhex(c)-1) || pendcount == 4) {
      ih += pending + shex(pendval)+'<br/>';
      pending = "";
      pendcount = 0;
      pendval = 0;
    }

    if (pending === "") {
      var name = c;
      var tags = db.tags(fhex(c))
      //p(tags);
      if (tags['name'] !== undefined) {
        name = tags['name'];
      }
      pending += name+": ";
      pendval = json[c];
      pendnum = fhex(c);
      pendcount++;
    } else {
      pendval += json[c] << (pendcount*8);
      pendnum++;
      pendcount++;
    }
  }
  if (pending !== "") {
    ih += pending + shex(pendval)+'<br/>';
  }
  $('#changelist')[0].innerHTML = ih;
}

function updateCausedChanges(addr) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/getreaderlist.php?addr='+addr, false);
  req.send(null);
  var json = jQuery.parseJSON(req.response);
  var ih = "";
  var first = true;
  var firstaddr;
  for (addr in json){
    ih += '<option class="change" onclick="clickChange('+addr+')" id="change_'+addr+'" ';
    if (first) {
      firstaddr = addr;
      ih += 'selected ';
      first = false;
    }
    ih += '>'+addr+'</option>';
  } 
  //ih += '<option onclick="clickChange(0)" id="change_0" class="change" value="0">0</option>';
  $('#changes')[0].innerHTML = ih;
  if (firstaddr !== undefined) {
    clickChange(firstaddr);
  } else {
    $('#changelist')[0].innerHTML = "";
  }
}
/* end */

function getFrequency() {
  //p( (instructionsRun - lastInstructionsRun) + " hz");
  var freqdiv = $('frequency');
  if (freqdiv.length > 0) {
    freqdiv[0].innerHTML = (instructionsRun - lastInstructionsRun) + " hz";
  }

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
    p('setimmed '+shex(addr)+' = '+ret);
    p('committed '+db.commit());
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

  var didSetPC = false;
  if (runobj != null) {
    runobj.forEach(function(set) {
      if (set[0][0] == PC) {
        didSetPC = true;
      }
      db.setimmed(set[0][0], set[1], set[0][1]);
      if (registerList.indexOf(set[0][0]) !== -1) {
        $('#reg_'+set[0][0])[0].innerHTML = '0x'+shex(set[1]);
      }
    });
  } else {
    p("WARNING: "+shex(getAddr())+" didn't do anything");
  }

  if (didSetPC === false) {
    db.setimmed(PC, db.immed(PC)+parseobj['len'], 4);
    $('#reg_'+PC)[0].innerHTML = '0x'+shex(db.immed(PC));
  }

  //p('committed '+commit());
  db.cacheCommit();
  instructionsRun++;

  //displayRegisters();
}


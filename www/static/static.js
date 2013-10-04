// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var lbox;

// l is for log
function l(d, depth) {
  depth = depth || 0;
  var indent = '';
  for (var i = 0; i < depth; i++) indent += '&nbsp;';

  var newp = document.createElement('span');
  newp.innerHTML = indent+d+'<br/>';

  lbox.appendChild(newp);
  lbox.scrollTop = lbox.scrollHeight;
}

function trash(e) {
  e.stopPropagation();
  e.preventDefault();
}

$(document).ready(function() {
  lbox = $('#output')[0];
  l('welcome to static analyzer');
  l('drag and drop .idc files here');
  $('#output')[0].addEventListener("dragenter", trash, false);
  $('#output')[0].addEventListener("dragexit", trash, false);
  $('#output')[0].addEventListener("dragover", trash, false);
  $('#output')[0].addEventListener("drop", handleIDCDrop, false);
  var ep = shex(fdec(db.globalTags()['entrypoint']));
  var rs = shex(fdec(db.globalTags()['rangestart']));
  var rl = shex(fdec(db.globalTags()['rangelength']));
  $('#rangestart')[0].value = rs;
  $('#rangelength')[0].value = rl;
  $('#staticstart')[0].value = ep;
  $('#iset')[0].value = db.globalTags()['iset'];
});


function handleIDCDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  if (e.dataTransfer.files.length > 0) {
    var file = e.dataTransfer.files[0];
    if (file.name.substr(file.name.length-4) == ".idc") {
      l('reading idc file '+file.name);
      var reader = new FileReader();
      reader.onloadend = handleIDC;
      reader.readAsText(file);
    } else if (file.name.substr(file.name.length-3) == ".il") {
      l('reading il file '+file.name);
      var reader = new FileReader();
      reader.onloadend = handleIL;
      reader.readAsText(file);
    } else {
      l('not an idc file');
    }
  }
  return false;
}

function handleIL(e) {
  init();
  il = e.target.result.split("\n");
  addr = -1
  for (var i = 0; i < il.length; i++) {
    cmd = il[i].split(" ")
    if (cmd[0] == "addr") {
      addr = fhex(cmd[1])
      tagsList[addr] = {}
      tagsList[addr]['parsed'] = il[i].split('"')[1]
    } else if (cmd[0] == "label") {
      tagsList[addr]['name'] = cmd[1]
    /*} else if (cmd[0] == "cjmp") {
      tagsList[addr]['flow'].append( cmd[1]*/
    }
  }
  upload_tags_to_server();
}

var idc;

function handleIDC(e) {
  init();
  idc = e.target.result.split("\n");
  for (var i = 0; i < idc.length; i++) {
  //for (var i = 0; i < 400; i++) {
    if (idc[i].indexOf('MakeCode') !== -1) { eval(idc[i]); }
    if (idc[i].indexOf('MakeRptCmt') !== -1) { eval(idc[i]); }
    if (idc[i].indexOf('MakeFunction') !== -1) { eval(idc[i]); }
    if (idc[i].indexOf('MakeName') !== -1) { eval(idc[i]); }
    if (idc[i].indexOf('MakeByte') !== -1) { eval(idc[i]); }
    if (idc[i].indexOf('MakeDword') !== -1) { eval(idc[i]); }
  }
  l('done with phase 1');
  //do_resume();
  analyze_subfunction();
  upload_tags_to_server();
}

/* idc parsing functions */

function MakeCode(addr) {
  var inst = parseInstruction(addr, rawdata.subarray(addr-rangestart));
  if (inst !== null) {
    //tagsList[addr] = mergeObjects(tagsList[addr], getCommitObject(inst));
    stack.push(addr);
  } 
}

function MakeRptCmt(addr, comment) {
  //p('comment '+shex(addr)+'  '+comment);
  if (tagsList[addr] === undefined) tagsList[addr] = {};
  tagsList[addr]['comment'] = comment;
}

function MakeFunction(start, end) {
  if (tagsList[start] === undefined) tagsList[start] = {};
  tagsList[start]['function'] = shex(start)+":"+shex(end-start);
  for (var i = start; i < end; i += 4) {
    if (tagsList[i] === undefined) tagsList[i] = {};
    tagsList[i]['scope'] = shex(start);
  }
}

function MakeName(addr, name) {
  if (tagsList[addr] === undefined) tagsList[addr] = {};
  tagsList[addr]['name'] = name;
}

var SN_LOCAL = "SN_LOCAL";
function MakeNameEx(addr, name, crap) {
  if (tagsList[addr] === undefined) tagsList[addr] = {};
  tagsList[addr]['name'] = name;
}

function MakeByte(addr) {
  if (tagsList[addr] === undefined) tagsList[addr] = {};
  tagsList[addr]['len'] = '1';
  tagsList[addr]['endian'] = 'little';
}

function MakeDword(addr) {
  if (tagsList[addr] === undefined) tagsList[addr] = {};
  tagsList[addr]['len'] = '4';
  tagsList[addr]['endian'] = 'little';
}


/* done */

function go() {
  start_analysis(
    fhex($('#staticstart')[0].value),
    fhex($('#rangestart')[0].value),
    fhex($('#rangelength')[0].value),
    $('#iset')[0].value);
}





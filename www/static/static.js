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


$(document).ready(function() {
  lbox = $('#output')[0];
  l('welcome to static analyzer');
});

var rawdata;
var rangestart;
var rangelength;

var going = false;

var starttime;

var tagsList = {};
var calls = [];

function go() {
  rangestart = fhex($('#rangestart')[0].value);
  rangelength = fhex($('#rangelength')[0].value);
  var staticstart = fhex($('#staticstart')[0].value);
  iset = $('#iset')[0].value;
  rebuildParser();
  l('using iset: '+iset);
  rawdata = fetchRawAddressRange(rangestart, rangelength);

  seen = [];
  stack = [];
  for(var i=0;i<rangelength;i++) { seen.push(false); }
  l('rawdata and seen ready');

  tagsList = {};

  going = true;
  starttime = (new Date).getTime();
  //re(staticstart, true);
  calls.push([staticstart, 0]);
  analyze_function();
}

function stop() {
  going = false;
}

// objects are shitty hash maps
var seen;
var stack;
var s_addr, s_start;

function do_resume() {
  going = true;
  analyze_function();
}

function mergeObjects(obj1, obj2) {
  if (obj1 === undefined) {
    return obj2;
  }
  if (obj2 === undefined) {
    return obj1;
  }
  for (key in obj2) {
    if (obj1[key] == undefined) {
      obj1[key] = obj2[key];
    } else {
      obj1[key] = obj1[key].concat(' '+obj2[key]);
    }
  }
  return obj1;
}

function analyze_function() {
  if (going == false) {
    return;
  }
  if (calls.length == 0) {
    var elapsedtime = (new Date).getTime() - starttime;
    l('done in '+(elapsedtime/1000.)+' seconds');
    setMultiTag(JSON.stringify(tagsList));
    elapsedtime = (new Date).getTime() - starttime;
    l('tags uploaded in '+(elapsedtime/1000.)+' seconds');
    return;
  }
  var call = calls.pop();
  var faddr = call[0];
  var depth = call[1];

  if (seen[faddr] !== true) {
    l('s '+shex(faddr), depth);
  }

  var stack = [];

  var fi = [];

  stack.push(faddr);
  while (stack.length > 0) {
    var addr = stack.pop();
    if (seen[addr] === true) {
      continue;
    }
    fi.push(addr);
    seen[addr] = true;
    var inst = parseInstruction(addr, rawdata.subarray(addr-rangestart));
    stack.push(addr + inst['len']);

    tagsList[addr] = mergeObjects(tagsList[addr], getCommitObject(inst));

    if (inst['flow']) {
      var flow = eval(inst['flow']);
      for (var i=0; i<flow.length; i++) {
        if (flow[i] == 'R') {
          l('r '+shex(addr), depth);
          stack.pop();
        } else if(flow[i].substr(0,1) == 'A') {
          // always branch, we follow
          var naddr = fhex(flow[i].substr(1));
          stack.pop();
          stack.push(naddr);
        } else if(flow[i].substr(0,1) == 'C') {
          var fstart = fhex(flow[i].substr(1));
          l('c '+shex(fstart)+' @ '+shex(addr), depth);
          // start function definer
          // add xref
          tagsList[fstart] = mergeObjects(tagsList[fstart], {"xref": shex(addr)});
          calls.push([fstart, depth+1]);
        } else if(flow[i].substr(0,1) == 'O') {
          // for optional, push it but don't depth dive
          stack.push(fhex(flow[i].substr(1)));
        }
      }
    }
  }

// add function information to tag db
  if (fi.length > 0) {
    var func = "";
    fi.sort();
    var extentaddr = fi[0];
    var extentlength = 0;
    for (var i = 0; i < (fi.length-1); i++) {
      extentlength += tagsList[fi[i]]['len'];
      if ( (fi[i] + tagsList[fi[i]]['len']) != fi[i+1]) {
        if (func != "") func += " ";
        func += shex(extentaddr)+":"+shex(extentlength);
        extentaddr = fi[i+1];
        extentlength = 0;
      }
    }
    if (func != "") func += " ";
    func += shex(extentaddr)+":"+shex(extentlength);

    tagsList[faddr] = mergeObjects(tagsList[faddr], {'function': func});
    l('f '+func, depth);
  }

  setTimeout(analyze_function, 0);
}

// trace function
//   build list of all calls
function resume() {
  re(s_addr, s_start);
}

// this is the recursion function
function re(addr, start) {
  if (going == false) {
    s_addr = addr;
    s_start = start;
    return;
  }
  if (seen[addr] === false) {
    seen[addr] = true;
    var inst = parseInstruction(addr, rawdata.subarray(addr-rangestart));
    stack.push(addr + inst['len']);

    if (start == true) {
      l('s '+shex(addr), stack.length);
      start = false;
    }

    tagsList[addr] = getCommitObject(inst);

    if (inst['flow']) {
      p(shex(addr));
      var flow = eval(inst['flow']);
      for (var i=0; i<flow.length; i++) {
        if (flow[i] == 'R') {
          l('r '+shex(addr), stack.length);
          stack.pop();
        } else if(flow[i].substr(0,1) == 'A') {
          // always branch, we follow
          var naddr = fhex(flow[i].substr(1));
          stack.pop();
          stack.push(naddr);
        } else if(flow[i].substr(0,1) == 'C') {
          var fstart = fhex(flow[i].substr(1));
          l('c '+shex(fstart)+' @ '+shex(addr), stack.length);
          // start function definer
          // add xref
          start = true;
          stack.push(fstart);
        } else if(flow[i].substr(0,1) == 'O') {
          // for optional, push it but don't depth dive
          stack.push(fhex(flow[i].substr(1)));
        }
      }
    }
  }
  if (stack.length > 0) {
    s_addr = stack.pop();
    s_start = start;
    setTimeout(resume, 0);
  } else {
    var elapsedtime = (new Date).getTime() - starttime;
    l('done in '+(elapsedtime/1000.)+' seconds');
    setMultiTag(JSON.stringify(tagsList));
    l('tags uploaded');
  }
}


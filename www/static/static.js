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

  going = true;
  starttime = (new Date).getTime();
  re(staticstart, true);
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
  resume();
}

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
  if (seen[addr] === true) {
    if (stack.length > 0) {
      s_addr = stack.pop();
      s_start = start;
      setTimeout(resume, 0);
    } else {
      var elapsedtime = (new Date).getTime() - starttime;
      l('done in '+(elapsedtime/1000.)+' seconds')
    }
    return;
  }
  if (start == true) {
    l('s '+shex(addr), stack.length);
    start = false;
  }
  seen[addr] = true;
  var inst = parseInstruction(addr, rawdata.subarray(addr-rangestart));
  stack.push(addr + inst['len']);

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
  if (stack.length > 0) {
    s_addr = stack.pop();
    s_start = start;
    setTimeout(resume, 0);
  } else {
    var elapsedtime = (new Date).getTime() - starttime;
    l('done in '+(elapsedtime/1000.)+' seconds')
  }
}


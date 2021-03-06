
/* SUPPORT FUNCTIONS */
function upload_tags_to_server() {
  setMultiTagAsync(JSON.stringify(tagsList), function() {
    elapsedtime = (new Date).getTime() - starttime;
    l('tags uploaded in '+(elapsedtime/1000.)+' seconds');
    if (analyze_callback !== undefined) {
      analyze_callback();
    }
  });
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
      if (obj1[key].substr(0,1) == '[') {
        // handle array merge
        obj1[key] = obj1[key].substr(0, obj1[key].length-1) +','+ obj2[key].substr(1);
      } else {
        obj1[key] = obj1[key].concat(' '+obj2[key]);
      }
    }
  }
  return obj1;
}
/* END SUPPORT FUNCTIONS */

/* globals */
var rawdata;
var rangestart;
var rangelength;
var staticstart;

var going = false;

var starttime;

var tagsList = {};
var calls = [];

var iset;
var depth;

// objects are shitty hash maps
var seen;
var stack = [];
var fi = [];
var s_addr, s_start;

/* done */

function start_analysis(ss, rs, rl, is) {
  staticstart = ss;
  if (rs === undefined) rs = fdec(db.globalTags()['rangestart']);
  if (rl === undefined) rl = fdec(db.globalTags()['rangelength']);
  if (is === undefined) is = db.globalTags()['iset'];
  p(shex(ss)+" "+shex(rs)+" "+shex(rl)+" "+is);
  rangestart = rs;
  rangelength = rl;
  iset = is;

  rebuildParser();
  l('using iset: '+iset);
  rawdata = fetchRawAddressRange(rangestart, rangelength);

  starttime = (new Date).getTime();

  seen = [];
  stack = [];

  for(var i=0;i<rangelength;i++) { seen.push(false); }
  l('rawdata and seen ready');

  tagsList = {};

  going = true;
  //re(staticstart, true);
  calls.push([staticstart, 0, iset]);
  setTimeout(analyze_function, 0);
}

function stop() {
  going = false;
}

function do_resume() {
  going = true;
  setTimeout(analyze_function, 0);
}


/* THE REAL ANALYSER */
function analyze_subfunction() {
  while (stack.length > 0) {
    var addr = stack.pop();
    if (seen[addr] === true) {
      continue;
    }
    if (addr < rangestart || addr > (rangestart + rangelength)) {
      p('out of range: '+shex(addr));
      continue;
    }
    var inst = parseInstruction(addr, rawdata.subarray(addr-rangestart));
    if (inst === null) {
      l('undefined instruction @ '+shex(addr));
      // not fatal
      continue;
      /*upload_tags_to_server();
      return;*/
    }
    fi.push(addr);
    seen[addr] = true;
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
        } else if(flow[i].substr(0,1) == 'C' || flow[i].substr(0,1) == 'I') {
          var fstart = fhex(flow[i].substr(1));
          l('c '+shex(fstart)+' @ '+shex(addr), depth);
          // start function definer
          // add xref
          tagsList[fstart] = mergeObjects(tagsList[fstart], {"flow": '[\'X'+shex(addr)+'\']'});
          if (flow[i].substr(0,1) == 'I') {
            if (iset === 'thumb') {
              calls.push([fstart, depth+1, 'arm']);
            } else {
              calls.push([fstart, depth+1, 'thumb']);
            }
          } else {
            calls.push([fstart, depth+1, iset]);
          }
        } else if(flow[i].substr(0,1) == 'O') {
          var fland = fhex(flow[i].substr(1));
          // L is a landing zone
          // that's stupid, add in always jump to the previous instruction
          //tagsList[fland] = mergeObjects(tagsList[fland], {"flow": '[\'L'+shex(addr)+'\']'});
          // hack for thumb
          //tagsList[fland-2] = mergeObjects(tagsList[fland-2], {"flow": '[\'A'+shex(fland)+'\']'});
          // for optional, push it but don't depth dive
          stack.push(fhex(flow[i].substr(1)));
        }
      }
    }
  }
}

function analyze_function() {
  if (going == false) {
    return;
  }
  if (calls.length == 0) {
    var elapsedtime = (new Date).getTime() - starttime;
    l('done in '+(elapsedtime/1000.)+' seconds, uploading...');
    upload_tags_to_server();
    return;
  }
  var call = calls.pop();
  var faddr = call[0];
  depth = call[1];
  if (call[2] !== iset) {
    iset = call[2];
    rebuildParser();
    l('using iset: '+iset);
  }

  if (seen[faddr] !== true) {
    l('s '+shex(faddr), depth);
  }

  stack = [];

  fi = [];

  stack.push(faddr);
  analyze_subfunction();

// add function information to tag db
  if (fi.length > 0) {
    var func = "";
    fi.sort();
    var extentaddr = fi[0];
    var extentlength = 0;
    for (var i = 0; true; i++) {
      extentlength += tagsList[fi[i]]['len'];
      if (i == fi.length-1) break;
      if ( (fi[i] + tagsList[fi[i]]['len']) != fi[i+1]) {
        if (func != "") func += " ";
        func += shex(extentaddr)+":"+shex(extentlength);
        extentaddr = fi[i+1];
        extentlength = 0;
      }
    }
    if (func != "") func += " ";
    func += shex(extentaddr)+":"+shex(extentlength);

    for (var i = 0; i < fi.length; i++) {
      tagsList[fi[i]]['scope'] = shex(faddr);
    }

    tagsList[faddr] = mergeObjects(tagsList[faddr], {'function': func});
    l('f '+func, depth);
  }

  setTimeout(analyze_function, 0);
}

// trace function
//   build list of all calls
/*function resume() {
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
}*/


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var iset;
var endian;
var unsaved;

$(document).ready(function() {
  setiset('thumb');
  runtest();
});

function savetoserver() {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/isdf/saveiset.php', false);
  req.send(package_iset());
  unsaved = false;
}

function loadfromserver() {
  if (unsaved == true) {
    alert('you have unsaved changes!');
    return;
  }
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/isdf/loadiset.php?iset='+iset, false);
  req.send(null);
  var big_obj = jQuery.parseJSON(req.response);
  if (big_obj['iset'] != iset) {
    p('load failed');
    return;
  }

  localStorage[iset+'_local'] = JSON.stringify(big_obj['local']);
  localStorage[iset+'_parsed'] = JSON.stringify(big_obj['parsed']);
  localStorage[iset+'_endian'] = big_obj['endian'];

  setiset(iset);
}

function package_iset() {
  var big_obj = {};
  big_obj['iset'] = iset;
  big_obj['endian'] = endian;
  big_obj['local'] = jQuery.parseJSON(localStorage[iset+'_local']);
  big_obj['parsed'] = jQuery.parseJSON(localStorage[iset+'_parsed']);
  return JSON.stringify(big_obj);
}

function runtest() {
  var teststart = fhex($('#teststart')[0].value);
  var testlength = fhex($('#testlength')[0].value);
  var testskip = fhex($('#testskip')[0].value);
  p("test "+teststart+" "+testlength);

  var rawdata = fetchRawAddressRange(teststart, testlength);

  var ret = '';

  rebuildParser();
  p("rebuilt");

  p(rawdata);

  var i;
  for (i=0;i<testlength;) {
    var parseobj = parseInstruction(teststart+i, rawdata.subarray(i));
    if (parseobj == null) {
      ret += '<tr><td>';
      ret += shex(teststart+i)+'</td><td>';
      ret += displayDumpFromRaw(testskip, rawdata.subarray(i));
      ret += '</td><td>invalid</td></tr>';
      i += testskip;
      continue;
    }

    ret += '<tr><td>';
    ret += shex(teststart+i)+'</td><td>';
    ret += displayDumpFromRaw(testskip, rawdata.subarray(i))+'</td><td>';
    ret += displayParsed(parseobj['parsed']);
    ret += '</td></tr>';
    i += parseobj['len'];
  }

  $('#testresults')[0].innerHTML = ret;
  p("test done");
}

function setiset(new_iset) {
  iset = new_iset;
  $('#iset')[0].value = iset;
  endian = localStorage[iset+'_endian'];
  $('#endian')[0].value = endian;
  localSaveCallback(null, null, 'local');
  localSaveCallback(null, null, 'parsed');
  unsaved = false;
}

function setendian(new_endian) {
  endian = new_endian;
  $('#endian')[0].value = endian;
  localStorage[iset+'_endian'] = endian;
}

registerObjectEditor('local', localSaveCallback);
registerObjectEditor('parsed', localSaveCallback);

function localSaveCallback(key, value, name) {
  //p(name+': '+key+' = '+value);
  var locale = jQuery.parseJSON(localStorage[iset+'_'+name]);
  if (locale == null) {
    locale = {};
  }
  if (key !== null) {
    if (value == "") {
      delete locale[key];
    } else {
      locale[key] = value;
    }
    localStorage[iset+'_'+name] = JSON.stringify(locale);
  }
  updateObjectEditor(name, locale, 40, 150);
  unsaved = true;
}

var local_built = "";
var parsed_built = [];

function rebuildParser() {
  var local = jQuery.parseJSON(localStorage[iset+'_local']);
  var parsed = jQuery.parseJSON(localStorage[iset+'_parsed']);

  local_built = "";
  for (f in local) {
    var fname = f.substr(0, f.indexOf('('));
    var fparams = f.substr(f.indexOf('('));
    local_built += 'var '+fname+' = function'+fparams+'{'+local[f]+'};';
  }

  parsed_built = [];
  var matched = false;
  for (sk in parsed) {
    // ignore spaces
    k = "";
    for (var i = 0; i < sk.length; i++) {
      var c = sk.substr(i, 1);
      if (c != ' ') k += c;
    }

    var obj = {};
    var mask = 0;
    var match = 0;
    var letters = '';
    for (var i = 0; i < k.length; i++) {
      var c = k.substr(i, 1);
      if (('01*'+letters).indexOf(c) == -1) {
        letters += c;
      }
      //p(c);
      mask <<= 1;
      match <<= 1;
      mask |= (c == '0' || c == '1');
      match |= (c == '1');
    }
    obj['mask'] = mask;
    obj['match'] = match;
    obj['letters'] = letters;
    obj['k'] = k;
    obj['bytecount'] = (k.length)/8;
    obj['out'] = parsed[sk];
    parsed_built.push(obj);
  }
}


// addr is available to the inside functions, hence no meta
function parseInstruction(addr, rawdata) {
  eval(local_built);

  var meta_matched = false;
  for (var meta_i = 0; meta_i < parsed_built.length; meta_i++) {
    var meta_obj = parsed_built[meta_i];
    var meta_inst = immed(meta_obj['bytecount'], endian, rawdata, 0);
    if ( (meta_inst & meta_obj['mask']) == meta_obj['match']) {
      meta_matched = true;
      break;
    }
  }
  if (meta_matched == false) return null;

  for (var meta_i = 0; meta_i < meta_obj['letters'].length; meta_i++) {
    var meta_c = meta_obj['letters'].substr(meta_i, 1);
    eval('var '+meta_c+' = 0');
  }
  for (var meta_i = 0; meta_i < meta_obj['k'].length; meta_i++) {
    var meta_c = meta_obj['k'].substr(meta_i, 1);
    if (meta_obj['letters'].indexOf(meta_c) != -1) {
      var meta_bit = (meta_inst >> ((meta_obj['k'].length-1)-meta_i)) & 1;
      eval(meta_c+' <<= 1');
      eval(meta_c+' |= '+meta_bit);
    }
  }
  var meta_retobj = {};
  meta_retobj['len'] = meta_obj['bytecount'];
  meta_retobj['parsed'] = eval(meta_obj['out']);
  return meta_retobj;
}


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var iset;
var endian;

$(document).ready(function() {
  setiset('arm');
  runtest();
});

function runtest() {
  var teststart = fhex($('#teststart')[0].value);
  var testlength = fhex($('#testlength')[0].value);
  var testskip = fhex($('#testskip')[0].value);
  p("test "+teststart+" "+testlength);

  var rawdata = fetchRawAddressRange(teststart, testlength);

  var ret = '';

  rebuildParser();

  var i;
  for (i=0;i<testlength;i+=testskip) {
    var parsed = parseInstruction(teststart+i, immed(testskip, endian, rawdata, i));
    ret += '<tr><td>';
    ret += displayDumpFromRaw(testskip, rawdata, i);
    ret += '</td><td>'+parsed+'</td><td>';
    ret += displayParsed(parsed);
    ret += '</td></tr>';
  }

  $('#testresults')[0].innerHTML = ret;
}

function setiset(new_iset) {
  iset = new_iset;
  $('#iset')[0].value = iset;
  endian = localStorage[iset+'_endian'];
  $('#endian')[0].value = endian;
  localSaveCallback(null, null, 'local');
  localSaveCallback(null, null, 'parsed');
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
  for (k in parsed) {
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
    obj['out'] = parsed[k];
    parsed_built.push(obj);
  }
}


// addr is available to the inside functions, hence no meta
function parseInstruction(addr, meta_inst) {
  /*var meta_local = jQuery.parseJSON(localStorage[iset+'_local']);
  var meta_parsed = jQuery.parseJSON(localStorage[iset+'_parsed']);

  for (meta_f in meta_local) {
    var meta_fname = meta_f.substr(0, meta_f.indexOf('('));
    var meta_fparams = meta_f.substr(meta_f.indexOf('('));
    eval('var '+meta_fname+' = function'+meta_fparams+'{'+meta_local[meta_f]+'};');
  }

  // this could build a fast array for this
  var meta_matched = false;
  for (meta_k in meta_parsed) {
    var meta_mask = 0;
    var meta_match = 0;
    var meta_letters = '';
    for (var meta_i = 0; meta_i < meta_k.length; meta_i++) {
      var meta_c = meta_k.substr(meta_i, 1);
      if (('01*'+meta_letters).indexOf(meta_c) == -1) {
        meta_letters += meta_c;
      }
      //p(meta_c);
      meta_mask <<= 1;
      meta_match <<= 1;
      meta_mask |= (meta_c == '0' || meta_c == '1');
      meta_match |= (meta_c == '1');
    }
    if ( (meta_inst & meta_mask) == meta_match) {
      p("match: "+meta_k+" "+meta_letters);
      meta_matched = true;
      break;
    }
  }*/

  eval(local_built);
  if (meta_matched == false) return "invalid";
  for (var meta_i = 0; meta_i < meta_obj['letters'].length; meta_i++) {
    var meta_c = meta_obj['letters'].substr(meta_i, 1);
    eval('var '+meta_c+' = 0');
  }
  for (var meta_i = 0; meta_i < meta_obj['k'].length; meta_i++) {
    var meta_c = meta_obj['k'].substr(meta_i, 1);
    if (meta_letters.indexOf(meta_c) != -1) {
      var meta_bit = (meta_inst >> ((meta_obj['k'].length-1)-meta_i)) & 1;
      eval(meta_c+' <<= 1');
      eval(meta_c+' |= '+meta_bit);
    }
  }
  return eval(meta_obj['out']);
}


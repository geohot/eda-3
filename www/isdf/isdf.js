// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

// iset and endian have moved to parser
var unsaved;

$(document).ready(function() {
  registerObjectEditor('local', localSaveCallback);
  registerObjectEditor('parsed', localSaveCallback);
  registerObjectEditor('env', localSaveCallback);

  setiset('arm');
  runtest(false);
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
  localStorage[iset+'_env'] = JSON.stringify(big_obj['env']);
  localStorage[iset+'_endian'] = big_obj['endian'];

  setiset(iset);
}

function package_iset() {
  var big_obj = {};
  big_obj['iset'] = iset;
  big_obj['endian'] = endian;
  big_obj['local'] = jQuery.parseJSON(localStorage[iset+'_local']);
  big_obj['parsed'] = jQuery.parseJSON(localStorage[iset+'_parsed']);
  big_obj['env'] = jQuery.parseJSON(localStorage[iset+'_env']);
  return JSON.stringify(big_obj);
}

function runtest(commitflag) {
  var teststart = fhex($('#teststart')[0].value);
  var testlength = fhex($('#testlength')[0].value);
  var testskip = fhex($('#testskip')[0].value);
  p("test "+teststart+" "+testlength);

  var rawdata = fetchRawAddressRange(teststart, testlength+0x10);

  var ret = '';

  rebuildParser();
  //p("rebuilt");

  //p(rawdata);

  var i;
  for (i=0;i<testlength;) {
    var parseobj = parseInstruction(teststart+i, rawdata.subarray(i));
    //p(parseobj);
    if (parseobj == null) {
      ret += '<tr><td>';
      ret += shex(teststart+i)+'</td><td>';
      ret += displayDumpFromRaw(testskip, rawdata.subarray(i));
      ret += '</td><td>invalid</td></tr>';
      i += testskip;
      continue;
    }

    if (commitflag == true) {
      var addr = teststart+i;
      commitAddress(addr, parseobj);
    }

    ret += '<tr><td>';
    ret += shex(teststart+i)+'</td><td>';
    ret += displayDumpFromRaw(parseobj['len'], rawdata.subarray(i))+'</td><td>';
    ret += displayParsed(parseobj['parsed'])+'</td>';
    if (parseobj['flow'] !== undefined) {
      ret += '<td>'+parseobj['flow'];
    }
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
  localSaveCallback(null, null, 'env');
  unsaved = false;
}

function setenvtags() {
  var env = jQuery.parseJSON(localStorage[iset+'_env']);
  for (haddr in env) {
    var addr = fhex(haddr);
    var settags = jQuery.parseJSON(env[haddr].replace(/'/g,'"'));
    for (tag in settags) {
      setTag(addr, tag, settags[tag]);
    }
  }
}

function setendian(new_endian) {
  endian = new_endian;
  $('#endian')[0].value = endian;
  localStorage[iset+'_endian'] = endian;
}

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



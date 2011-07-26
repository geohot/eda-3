// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

// iset and endian have moved to parser

$(document).ready(function() {
  registerObjectEditor('local', localSaveCallback);
  registerObjectEditor('parsed', localSaveCallbackParsed);
  registerObjectEditor('env', localSaveCallback);

  setiset('arm');
  //runtest(false);
});

function savetoserver() {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/isdf/saveiset.php', false);
  req.send(package_iset());
  if (req.response.length != 0) {
    alert("SAVE FAILED!!!");
  }
}

function loadfromserver() {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/isdf/loadiset.php?iset='+iset, false);
  req.send(null);
  var big_obj = jQuery.parseJSON(req.response);
  if (big_obj['iset'] != iset) {
    p('load failed');
    return;
  }

  if (localStorage[iset+'_local'] != JSON.stringify(big_obj['local']) ||
      localStorage[iset+'_parsed'] != JSON.stringify(big_obj['parsed']) ||
      localStorage[iset+'_env'] != JSON.stringify(big_obj['env']) ||
      localStorage[iset+'_endian'] != big_obj['endian']) {
    if(!confirm("you have unsaved changes, overwrite?")) {
      return;
    }
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
  localSaveCallbackParsed(null, null, 'parsed');
  localSaveCallback(null, null, 'env');
}

function setenvtags() {
  var env = JSON.parse(localStorage[iset+'_env']);
  for (haddr in env) {
    var addr = fhex(haddr);
    var settags = JSON.parse(env[haddr].replace(/'/g,'"'));
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
  var locale = JSON.parse(localStorage[iset+'_'+name]);
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

function localSaveCallbackParsed(key, value, name, index) {
  //p(name+': '+key+' = '+value);
  var locale = JSON.parse(localStorage[iset+'_'+name]);
  if (locale == null) {
    locale = {};
  }
  if (key !== null) {
    if (index === -1) {
      locale[key] = [];
    } else {
      locale[key][index] = value;
      var dodelete = true;
      for (var i = 0; i < locale[key].length; i++) {
        if (locale[key][i] !== "" &&
            locale[key][i] !== null &&
            locale[key][i] !== undefined) {
          dodelete = false;
          break;
        }
      }
      if (dodelete) {
        delete locale[key];
      }
    }

    localStorage[iset+'_'+name] = JSON.stringify(locale);
  }
  updateObjectEditorArray(name, locale, 40, 150, 3);
}


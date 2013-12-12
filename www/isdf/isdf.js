// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

// iset and endian have moved to parser

$(document).ready(function() {
  $('.aobject').live('click', function(e) {
    highlightMatch(e.currentTarget);
  });

  $('.behave').live('change', function() {
    var str = stringifyBehaviorBox();
    var dom = $('.matched .arrayedit1');
    dom[0].value = str;

    renderBehaviorBox(str);
  });

  registerObjectEditor('local', localSaveCallback);
  registerObjectEditor('parsed', localSaveCallbackParsed);
  registerObjectEditor('env', localSaveCallback);

  //setiset('thumb');
  setiset('aarch64');
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

function showBitMatchBox(data, pattern) {
  var r = '<table><tr>';
  for (var i = 0; i < pattern.length; i++) {
    r += '<td>'+pattern.substr(i, 1)+'</td>';
  }
  p(data);
  r += '</tr><tr>';
  for (var i = 0; i < data.byteLength; i++) {
    var d;
    // only for little endian
    d = data[(data.byteLength-1)-i];
    for (var j = 0; j < 8; j++) {
      r += '<td>'+((d>>7)&1)+'</td>';
      d <<= 1;
    }
  }

  r += '</tr></table>';
  $('#bitmatch')[0].innerHTML = r;
}

function doBehaviorSave() {
  $('.matched .arrayedit1').trigger({'type':'keydown','keyCode':13});
  $('#behaviorbox')[0].innerHTML = '';
}

function renderBehaviorBox(s) {
  var arr = eval(s);
  $('#behaviorbox')[0].innerHTML = '';
  var ret = '<table>';

  ret += '<input onclick="doBehaviorSave()" type="button" value="save"></input>';

  if (arr !== undefined) {
    arr.forEach(function(i) {
      ret += '<tr>';
      ret += '<td class="behave"><input value="'+i[0].join(' ')+'"/></input></td>';
      ret += '<td class="behave"><input value="'+i[1]+'"/></input></td>';
      ret += '<td class="behave"><input value="'+i[2]+'"/></input></td>';
      ret += '<td class="behave"><input value="'+i[3]+'"/></input></td>';
      ret += '</tr>';
    });
  }

  ret += '<tr>';
  ret += '<td class="behave"><input></input></td>';
  ret += '<td class="behave"><input></input></td>';
  ret += '<td class="behave"><input></input></td>';
  ret += '<td class="behave"><input></input></td>';
  ret += '</tr>';

  ret += '</table>';
  $('#behaviorbox')[0].innerHTML = ret;
}

function stringifyBehaviorBox() {
  var dom = $('#behaviorbox')[0].childNodes[1].childNodes[0];
  var bigarr = [];
  for (var j = 0; j<dom.childNodes.length; j++) {
    var node = dom.childNodes[j];
    var i = [];
    if (node.childNodes[0].childNodes[0].value === "") {
      i[0] = [];
    } else {
      i[0] = node.childNodes[0].childNodes[0].value.split(' ');
    }
    i[1] = node.childNodes[1].childNodes[0].value;
    i[2] = node.childNodes[2].childNodes[0].value;
    i[3] = node.childNodes[3].childNodes[0].value;
    if (i[0].length !== 0 || i[1] !== '' || i[2] !== '' || i[3] !== '') {
      bigarr.push(i);
    }
  }
  //p(bigarr);
  return JSON.stringify(bigarr).replace(/"/g, "'");
}

function highlightMatch(n) {
  /*if ($('.matched').length > 0) {
    doBehaviorSave();
  }*/
  $('.matched').removeClass("matched");
  $(n).addClass("matched");

  var behavior = $('.matched .arrayedit1')[0].value;
  renderBehaviorBox(behavior);
}

function highlightMatched(e) {
  var arr = e.id.split('-');
  var addr = fnum(arr[1]);
  var len = fnum(arr[2]);
  var parseobj = parseInstruction(addr, db.raw(addr,len+16));
  var isetparser = jQuery.parseJSON(localStorage[iset+'_parsed']);


  for (pmatch in isetparser) {
    var pmatchs = pmatch.split(' ').join('');
    if (pmatchs === parseobj['match']) {
      var parsededitor = $('#parsededitor')[0];
      var ypos = parsededitor.offsetTop;
      parsededitor = parsededitor.childNodes[0]; // tbody
      for (var i = 0; i < parsededitor.childNodes.length; i++) {
        if (parsededitor.childNodes[i].childNodes[0].innerHTML == pmatch) {
          highlightMatch(parsededitor.childNodes[i]);
          //p('highlighted');
          ypos += parsededitor.childNodes[i].offsetTop;
          showBitMatchBox(db.raw(addr, len), pmatchs);
          window.scrollTo(0, ypos-50);
        }
      }
      break;
    }
  }
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
    //p(parseobj['parsed']);
    //var runobj = runInstruction(teststart+i, rawdata.subarray(i));
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

    ret += '<tr onclick="highlightMatched(this)" id="T-'+(teststart+i)+'-'+parseobj['len']+'"><td>';
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
  if (localStorage[iset+'_'+name] === undefined) localStorage[iset+'_'+name] = '{}';
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
  if (localStorage[iset+'_'+name] === undefined) localStorage[iset+'_'+name] = '{}';
  var locale = JSON.parse(localStorage[iset+'_'+name]);
  if (locale == null) {
    locale = {};
  }
  if (key !== null) {
    if (index === -1 && locale[key] === undefined) {
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


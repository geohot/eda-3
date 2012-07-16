// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var included = {};

// hack for node
if (typeof window !== 'undefined') {
 window.require = function(name) {
    if (included[name] == true) return;
    included[name] = true;
    p('including '+name);

    var req = new XMLHttpRequest();
    req.open('GET', '/eda/'+name, false);
    req.send(null);

    /*with(window) {
      eval(req.response);
      //p(req.response);
    }*/
    window.eval(req.response);
    //document.head.innerHTML += '<script src="/eda/'+name+'"></script>';
  }
}

function xx(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url, false);
  req.send(null);
  return jQuery.parseJSON(req.response);
}

function p(printme) {
  console.log(printme);
}

function objfirst(obj) {
  for (key in obj) {
    return key;
  }
  return null;
}

function objcount(obj) {
  var i = 0;
  for (key in obj) {
    i++;
  }
  return i;
}

function shex(num, len) {
  if (num === undefined) {
    return 'UNDEFINED';
  }
  if (num < 0) num = 0x100000000+num;  // eww 32-bit
  var ret = num.toString(16).toUpperCase();
  if (len != null) {
    while (ret.length < len) {
      ret = '0' + ret;
    }
  }
  return ret;
}

function fhex(str) {
  return parseInt(str, 16);
}

function fdec(str) {
  return parseInt(str, 10);
}

function fnum(str) {
  if (str.substr(0,2) == "0x") {
    return fhex(str);
  } else {
    return fdec(str);
  }
}

function chr(num) {
  return String.fromCharCode(num);
}

function toPrintable(chr) {
  if (chr >= 0x20 && chr < 0x80) {
    return String.fromCharCode(chr);
  } else if (chr >= 0xA0 && chr < 0x100 && chr != 0xAD) {
    return String.fromCharCode(chr);
  } else {
    //return String.fromCharCode(0x1700);
    return '#';
  }
}


function asc(str, offset) {
  if (offset == null) offset = 0;
  return str.charCodeAt(offset);
}

function hexdump(data) {
  var line = "";
  var chars = "";
  for (var i = 0; i < data.byteLength; i++) {
    if (i!=0 && (i%0x10)==0) {
      p(line + " | "+chars);
      line = "";
      chars = "";
    }
    line += shex(data[i], 2)+" ";
    chars += toPrintable(data[i]);
  }
  if ((data.byteLength%0x10) !== 0) {
    for (var i = 0; i < (0x10-(data.byteLength%0x10)); i++) {
      line += "   ";
    }
  }
  p(line + " | "+chars);
}


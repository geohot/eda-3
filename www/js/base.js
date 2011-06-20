// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

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

// this shouldn't be in base...and shouldn't use offset
function immed(length, endian, rawdata, offset) {
  var i;
  var addr = offset;
  if (endian == 'little') {
    addr += length-1;
  }
  var ret = 0;
  for (i=0;i<length;i++) {
    ret <<= 8;
    ret |= rawdata[addr];
    if (endian == 'little') {
      addr -= 1;
    } else {
      addr += 1;
    }
  }
  return ret;
}

function asc(str, offset) {
  if (offset == null) offset = 0;
  return str.charCodeAt(offset);
}


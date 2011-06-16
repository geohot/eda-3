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

function chr(num) {
  return String.fromCharCode(num);
}

function asc(str) {
  return str.charCodeAt(0);
}


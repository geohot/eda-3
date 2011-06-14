// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.


function p(printme) {
  console.log(printme);
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


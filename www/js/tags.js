// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var spanlookup = {
  't':'i_tab',
  'o':'i_opcode',
  'c':'i_condition',
  'f':'i_flags',
  'l':'i_location',
  'd':'i_deref',
  'i':'i_immed'};

var spanfunction = {
  't':displayParsed,
  'i':parseImmed,
  'd':parseDeref,
  'l':parseLocation};

function displayParsed(parsed) {
  var ret = "";
  var i;
  for (i = 0; i < parsed.length; i++) {
    var c = parsed.substr(i, 1);
    if (c == '\\') {
      i += 1;
      var m = parsed.substr(i, 1);
      i += 2;
      var ss = "";
      var nested = 1;
      var j;
      while (i < parsed.length) {
        c = parsed.substr(i, 1);
        if (c == '{') nested++;
        if (c == '}') nested--;
        if (nested == 0) break;
        ss += c;
        i++;
      }
      if (spanfunction[m] !== undefined) {
        ss = spanfunction[m](ss);
      }
      ret += '<span class="'+spanlookup[m]+'">'+ss+'</span>';
    } else {
      ret += c;
    }
  }
  return ret;
}

function parseImmed(immed) {
  var i = fnum(immed);
  if (i < 10) return shex(i);
  else return '0x'+shex(i);
}

function parseDeref(ss) {
  var paddr = fnum(ss.substr(2));
  var len = fnum(ss.substr(0,1));
  var endian = (ss.substr(1,1)=='l')?'little':'big';

  p('dereffing '+shex(paddr));

  var data = immed(len, endian, fetchRawAddressRange(paddr, len, 0));

  return parseLocation(data);
}

// this shouldn't have to do a network fetch
// and now we have a cache
function parseLocation(ss) {
  if (typeof ss == "string") {
    var addr = fnum(ss);
  } else {
    var addr = ss;
  }
  var tags = getTagsCached(addr);
  if (tags['name'] !== undefined) {
    return tags['name'];
  } else {
    return '0x'+shex(addr);
  }
}

function displayComment(comment) {
  return '<span class="comment">// '+comment+'</span>';
}

function displayImmedFromRaw(length, endian, rawdata) {
  var row = '<span class="i_immed">0x';
  var i;
  var addr = 0;
  if (endian == 'little') {
    addr += length-1;
  }
  for (i=0;i<length;i++) {
    row += shex(rawdata[addr],2);
    if (endian == 'little') {
      addr -= 1;
    } else {
      addr += 1;
    }
  }
  row += '</span>';
  return row;
}

function displayDumpFromRaw(length, rawdata) {
  var row = '<span class="i_dump">';
  for (var i=0; i<length; i++) {
    row += shex(rawdata[i],2)+" ";
  }
  row += '</span>';
  return row;
}


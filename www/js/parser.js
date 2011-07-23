// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var iset;
var endian;

var local_built = "";
var parsed_built = [];

function commitAddress(addr, parseobj) {
  setTag(addr, 'iset', iset);
  setTag(addr, 'endian', endian);
  setTag(addr, 'len', parseobj['len']);
  if (parseobj['flow'] !== undefined) {
    setTag(addr, 'flow', parseobj['flow']);
  }
  setTag(addr, 'parsed', parseobj['parsed']);
}

function getCommitObject(inst) {
  var newtags = {};
  newtags['iset'] = iset;
  newtags['endian'] = endian;
  newtags['len'] = inst['len'];
  newtags['parsed'] = inst['parsed'];
  if (inst['flow'] !== undefined) {
    newtags['flow'] = inst['flow'];
  }
  return newtags;
}

function rebuildParser() {
  var local = jQuery.parseJSON(localStorage[iset+'_local']);
  var parsed = jQuery.parseJSON(localStorage[iset+'_parsed']);
  endian = localStorage[iset+'_endian'];

  local_built = [];
  for (f in local) {
    var fname = f.substr(0, f.indexOf('('));
    var fparams = f.substr(f.indexOf('('));
    local_built.push('var '+fname+' = function'+fparams+'{'+local[f]+'};');
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
    obj['out'] = parsed[sk][0];  // change to support the new format
    parsed_built.push(obj);
  }

// objects are built, sort them by the bit count in the mask
  parsed_built.sort(function(a, b) {
    var am = a['mask'];
    var bm = b['mask'];
    var a1c = 0, b1c = 0;
    while (am > 0 || bm > 0) {
      a1c += am&1;
      b1c += bm&1;
      am >>= 1;
      bm >>= 1;
    }
    return (b1c - a1c);
  });

  //p(parsed_built);

// non closure version
/*}

function parseInstruction(addr, meta_rawdata) {
  var addr;
  eval(local_built);
// these are functions accessible to the parser
  var addFlow = function(addr, t) {
    if (meta_retobj['flow'] == undefined) {
      meta_retobj['flow'] = [];
    }
    meta_retobj['flow'].push(t+shex(addr));
    return addr;
  };

  var addReturn = function() {
    if (meta_retobj['flow'] == undefined) {
      meta_retobj['flow'] = [];
    }
    meta_retobj['flow'].push('R');
    return '';
  };
// post globals
  var meta_matched = false;
  for (var meta_i = 0; meta_i < parsed_built.length; meta_i++) {
    var meta_obj = parsed_built[meta_i];
    var meta_inst = immed(meta_obj['bytecount'], endian, meta_rawdata, 0);
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

  if (meta_retobj['flow'] !== undefined) {
    var meta_flow = JSON.stringify(meta_retobj['flow']);
    meta_retobj['flow'] = meta_flow.replace(/"/g, '\'');
  }
  return meta_retobj;
}*/


// closure version
  setupParseInstruction();
}

var parseInstruction;

function setupParseInstruction() {
  var addr;
  var meta_retobj;
  for (var i = 0;i < local_built.length; i++) {
    try {
      eval(local_built[i]);
    } catch(err) {
      p(err+' *** '+local_built[i]);
    }
  }

// these are functions accessible to the parser
  var addFlow = function(addr, t) {
    if (meta_retobj['flow'] == undefined) {
      meta_retobj['flow'] = [];
    }
    meta_retobj['flow'].push(t+shex(addr));
    return addr;
  };

  var addReturn = function() {
    if (meta_retobj['flow'] == undefined) {
      meta_retobj['flow'] = [];
    }
    meta_retobj['flow'].push('R');
    return '';
  };

// these are function accessible to the computer
  var s32 = function(addr, val) {
    var val32 = val & 0xFFFFFFFF;
    p('setting '+shex(addr)+' = '+shex(val32));
  };

// addr is available to the inside functions, hence no meta
// this is a closure
parseInstruction = function(laddr, meta_rawdata) {
  addr = laddr;
  var meta_matched = false;
  for (var meta_i = 0; meta_i < parsed_built.length; meta_i++) {
    var meta_obj = parsed_built[meta_i];
    var meta_inst = immed(meta_obj['bytecount'], endian, meta_rawdata, 0);
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
  meta_retobj = {};

  meta_retobj['len'] = meta_obj['bytecount'];
  try {
    meta_retobj['parsed'] = eval(meta_obj['out']);
  } catch(err) {
    p('parse error '+shex(addr)+': '+meta_obj['out']);
    meta_retobj['parsed'] = 'ERROR!';
  }

  if (meta_retobj['flow'] !== undefined) {
    var meta_flow = JSON.stringify(meta_retobj['flow']);
    meta_retobj['flow'] = meta_flow.replace(/"/g, '\'');
  }
  return meta_retobj;
};
// done parseInstruction
}

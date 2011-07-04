// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/dbmanager.js');

// requires data be precached
// mad broken if data ain't in cache <-- fixed
var db = {
  data_cache: {},
  tags_cache: {},
  precache: function(addr, len) {
    this.precacheData(addr, len);
    this.precacheTags(addr, len);
  },
  precacheData: function(addr, len) {
    if (typeof addr !== "number") p('precache: addr type mismatch '+(typeof addr));
    this.data_cache[addr] = fetchRawAddressRange(addr, len);
  },
  precacheTags: function(addr, len) {
    jQuery.extend(this.tags_cache, getMultiTag(addr, len));
    // cache the empty ones as empty
    for (var i=addr; i<addr+len; i++) {
      if (this.tags_cache[i] === undefined) {
        this.tags_cache[i] = {};
      }
    }
  },
  raw: function(addr, len) {
    if (typeof addr !== "number") p('raw: addr type mismatch '+(typeof addr));
    if (typeof len !== "number") p('raw: len type mismatch '+(typeof len));
    for (saddr_str in this.data_cache) {
      var saddr = fdec(saddr_str);
      if ( (saddr <= addr) && ((addr+len) <= (saddr+this.data_cache[saddr_str].length)) ) {
        //p(saddr+' '+addr+' '+len+' '+(saddr+this.data_cache[saddr].length));
        var offset = addr-saddr;
        return this.data_cache[saddr_str].subarray(offset, offset+len);
      }
    }
    // not in cache
    this.precacheData(addr, len);
    p("cache miss ");
    return this.data_cache[addr];
  },
  tags: function(addr) {
    if (this.tags_cache[addr] === undefined) {
      this.tags_cache[addr] = getTags(addr);
      return this.tags_cache[addr];
    }
    return this.tags_cache[addr];
  },
  immed: function(addr, len, endian) {
    len = len || this.tags(addr)['len'];
    endian = endian || this.tags(addr)['endian'];
    if (endian == 'little') {
      addr += length-1;
    }
    var ret = 0;
    for (i=0;i<length;i++) {
      ret <<= 8;
      ret |= this.raw(addr, 1)[0];
      if (endian == 'little') {
        addr -= 1;
      } else {
        addr += 1;
      }
    }
    return ret;
  }
};


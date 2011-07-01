// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/dbmanager.js');

// requires things be precached
var db = {
  rawdata_start: null,
  rawdata_cache: null,
  tags_cache: null,
  precache: function(addr, len) {
    this.rawdata_start = addr;
    this.rawdata_cache = fetchRawAddressRange(addr, len);
    this.tags_cache = getMultiTag(addr, len);
  },
  raw: function(addr, len) {
    var offset = addr-this.rawdata_start;
    return this.rawdata_cache.subarray(offset, offset+len);
  },
  tags: function(addr) {
    return this.tags_cache[addr];
  },
  immed: function(addr) {
    var len = this.tags(addr)['len'];
    if (this.tags(addr)['endian'] == 'little') {
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


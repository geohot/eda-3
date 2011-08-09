// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/dbmanager.js');

// requires data be precached
// mad broken if data ain't in cache <-- fixed
var db = {
  data_cache: {},
  tags_cache: {},
  precache: function(addr, len) {
    p('precaching: '+shex(addr)+' - '+shex(addr+len));
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
    // not in cache, add some prefetching
    this.precacheData(addr-0x100, 0x100);
    this.precacheData(addr, len+0x100);
    //p("cache miss");
    p("cache miss "+shex(addr));
    //console.trace();
    return this.data_cache[addr];
  },
  setTag: function(addr, name, data) {
    if (this.tags_cache[addr] === undefined) {
      this.tags_cache[addr] = {};
    }
    if (data != "") {
      this.tags_cache[addr][name] = data;
    } else {
      delete this.tags_cache[addr][name];
    }
    setTag(addr, name, data);
  },
  tags: function(addr) {
    if (this.tags_cache[addr] === undefined) {
      p("tag cache miss "+shex(addr));
      this.tags_cache[addr] = getTags(addr);
      return this.tags_cache[addr];
    }
    return this.tags_cache[addr];
  },
  immed: function(addr, len, endian) {
    len = len || this.tags(addr)['len'];
    endian = endian || this.tags(addr)['endian'];
    if (endian == 'little') {
      addr += len-1;
    }
    var ret = 0;
    for (i=0;i<len;i++) {
      ret <<= 8;
      ret |= this.raw(addr, 1)[0];
      if (endian == 'little') {
        addr -= 1;
      } else {
        addr += 1;
      }
    }

    // negative numbers suck
    if(ret < 0) ret = 0x100000000+ret;
    return ret;
  },
  search: function(name, data) {
    var req = new XMLHttpRequest();
    req.open('GET', '/eda/edadb/searchtags.php?tagname='+name+'&data='+data, false);
    req.send(null);
    var json = jQuery.parseJSON(req.response);
    var ret = [];
    for (a in json) {
      ret.push(fnum(a));
    }
    return ret;
  }
};


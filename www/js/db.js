// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

require('js/dbmanager.js');

// requires data be precached
// mad broken if data ain't in cache <-- fixed
var db = {
  // data_cache is 0x100 chunks
  // everything must be precached
  data_cache: {},
  tags_cache: {},
  pending_commit: {},
  cached_commits: [],
  precache: function(addr, len) {
    p('precaching: '+shex(addr)+' - '+shex(addr+len));
    this.precacheData(addr, len);
    this.precacheTags(addr, len);
  },
  precacheData: function(addr, len) {
    if (typeof addr !== "number") p('precache: addr type mismatch '+(typeof addr));
    for (var i = (addr&0xFFFFFF00); i <= ((addr+len)&0xFFFFFF00); i += 0x100) {
      if (i<0) {
        this.data_cache[i] = fetchRawAddressRange(0x100000000+i, 0x100);
      } else {
        this.data_cache[i] = fetchRawAddressRange(i, 0x100);
      }
      p('dcache miss 0x'+shex(i));
    }
  },
  precacheTags: function(addr, len) {
    if (addr < 0x100) addr = 0;
    else addr -= 0x100;
    len += 0x200;
    jQuery.extend(this.tags_cache, getMultiTag(addr, len));
    // cache the empty ones as empty
    for (var i=addr; i<addr+len; i++) {
      if (this.tags_cache[i] === undefined) {
        this.tags_cache[i] = {};
      }
    }
  },
  write: function(addr, data) {
    if (this.data_cache[addr&0xFFFFFF00] === undefined) {
      this.precacheData(addr, data.length);
    }

    // unaligned writes are cool i guess
    for (var i=addr; i<(addr+data.length); i++) {
      this.data_cache[i&0xFFFFFF00][i&0xFF] = data[i-addr];
    }
  },
  raw: function(addr, len) {
    if (typeof addr !== "number") p('raw: addr type mismatch '+(typeof addr));
    if (typeof len !== "number") p('raw: len type mismatch '+(typeof len));

    if ((addr&0xFFFFFF00) == ((addr+len-1)&0xFFFFFF00)) {
      if (this.data_cache[addr&0xFFFFFF00] === undefined) {
        this.precacheData(addr, len);
      }
      return this.data_cache[addr&0xFFFFFF00].subarray(addr&0xFF, (addr&0xFF)+len);
    } else {
      // please align your accesses stupid bitch
      var ret = new Uint8Array(len);
      var rlen = len;
      var ptr = 0;
      for (var i = (addr&0xFFFFFF00); i <= ((addr+len)&0xFFFFFF00); i += 0x100) {
        if (i < addr) {
          for (var j = 0; j < 0x100-(addr-i); j++) {
            ret[j] = this.data_cache[i][(addr-i)+j];
          }
          rlen -= 0x100-(addr-i);
          ptr += 0x100-(addr-i);
        } else {
          for (var j = 0; j < ((rlen>0x100)?0x100:rlen); j++) {
            ret[ptr+j] = this.data_cache[i][j];
          }
        }
      }
      return ret;
    }
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
      //p("tag cache miss "+shex(addr));
      //this.tags_cache[addr] = getTags(addr);
      this.precacheTags(addr, 1);
      return this.tags_cache[addr];
    }
    return this.tags_cache[addr];
  },
  setimmed: function(taddr, data, len, endian) {
    var addr = taddr;
    len = len || this.tags(addr)['len'];
    endian = endian || this.tags(addr)['endian'];
    if (endian == 'big') {
      addr += len-1;
    }
    var d = new Uint8Array(len);
    for (var i=0;i<len;i++) {
      d[i] = (data&0xFF);
      //storeByteInPendingCommit(addr, d[i]);
      this.toPendingCommit(addr, d[i]);
      data >>= 8;
      if (endian == 'big') {
        addr -= 1;
      } else {
        addr += 1;
      }
    }
    this.write(taddr, d);
  },
  toPendingCommit: function(addr, data) {
    this.pending_commit[shex(addr)] = data;
  },
  cacheCommit: function() {
    this.cached_commits.push(this.pending_commit);
    this.pending_commit = {};
  },
  // async FTW
  flushCommitCache: function() {
    if (this.cached_commits.length > 0) {
      var req = new XMLHttpRequest();
      req.open('POST', '/eda/edadb/multicommit.php', true);
      var data = JSON.stringify(this.cached_commits);
      this.cached_commits = [];
      req.send(data);
    }
  },
  immed: function(taddr, len, endian) {
    var addr = taddr;
    len = len || this.tags(addr)['len'];
    endian = endian || this.tags(addr)['endian'];
    if (typeof len !== "number") len = fnum(len);
    var raw = this.raw(taddr, len);
    if (endian == 'little') {
      addr += len-1;
    }
    var ret = 0;
    for (var i=0;i<len;i++) {
      ret <<= 8;
      ret |= raw[addr-taddr];
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


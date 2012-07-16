// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include <map>
using std::make_pair;

#include "cores/core.h"

// ***really generic core shit***

// wtf, why do i need this?
uint64_t Core::step() {
  printf("I can't step, I'm a generic core\n");
  return 0;
}

// set32, set16, and set8 defined in header
void Core::set(uint64_t addr, uint64_t data, int len) {
  // like write this bro
  string r = "";
  for (int i = 0; i < len; i++) {
    r.push_back(data&0xFF);
    data >>= 8;
  }

  commit.insert(make_pair(addr, r));
}

// get32, get16, and get8 defined in header
uint64_t Core::get(uint64_t addr, int len) {
  ExtentsReq req;
  ExtentsMap resp;
  req.insert(make_pair(addr, len));
  Memory::Inst()->fetchExtents(resp, req, 0, true);

  string r = resp[addr];
  uint64_t ret = 0;
  // little endian
  for (int i = r.length()-1; i >= 0; i--) {
    ret <<= 8;
    ret |= ((uint8_t)r[i]) & 0xFF;
  }
  return ret;
}


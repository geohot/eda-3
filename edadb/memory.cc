// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/memory.h"

namespace edadb {

Memory* Memory::inst_ = NULL;

Memory* Memory::Inst() {
  if (inst_ == NULL) {
    inst_ = new Memory();
  }
  return inst_;
}

Memory::Memory() {
  change_ = 0;
  nullbyte_ = new Byte();
  nullbyte_->commit(0, 0xAA);  // good way of seeing the nulls vs the 00
}

uint64_t Memory::commitExtents(const ExtentsMap& extents) {
  // next changelist is the one we are committing
  change_++;
  for (map<uint64_t, string>::const_iterator iter = extents.begin();
       iter != extents.end(); ++iter) {
    for (int i = 0; i < iter->second.size(); i++) {
      uint64_t addr = iter->first + i;
      Byte* byte = get(addr);
      if (byte == nullbyte_) {
        byte = memory_.insert(std::make_pair(addr, new Byte())).first->second;
      }
      byte->commit(change_, iter->second[i]);
    }
  }
  return change_;
}

void Memory::fetchExtents(
    ExtentsMap& _return,
    const ExtentsReq& extentreqs,
    uint64_t changenumber,
    bool tag) const {
  for (map<uint64_t, uint32_t>::const_iterator iter = extentreqs.begin();
       iter != extentreqs.end(); ++iter) {
    string extent;
    for (int i = 0; i < iter->second; i++) {
      uint64_t addr = iter->first + i;
      Byte* byte = get(addr);
      if (tag == true) {
        byte->addReader(change_ + 1);
      }
      extent.push_back(byte->get(changenumber));
    }
    _return.insert(make_pair(iter->first, extent));
  }
}

void Memory::getMatchingList(ChangelistList& _return,
    const ExtentsMap& extents) const {
  // TODO(geohot) implement this
}

void Memory::getWriterList(ChangelistList& _return, uint64_t addr) const {
  get(addr)->getWriterList(_return);
}

// null byte behavior is interesting here, see the exception changelists
void Memory::getReaderList(ChangelistList& _return, uint64_t addr) const {
  get(addr)->getReaderList(_return);
}

// private function
Byte* Memory::get(uint64_t addr) const {
  map<uint64_t, Byte*>::const_iterator byte = memory_.find(addr);
  if (byte == memory_.end()) {
    return nullbyte_;
  } else {
    return byte->second;
  }
}

}  // namespace edadb


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/byte.h"

namespace edadb {

Byte::Byte() {
  // initial so no crashing
  datamap_[0] = 0;
}

void Byte::commit(uint64_t changelist_number, uint8_t data) {
  datamap_[changelist_number] = data;
}

void Byte::addReader(uint64_t changelist_number) {
  readerset_.insert(changelist_number);
}

void Byte::getReaderList(ChangelistList& _return) const {
  _return = readerset_;
}

void Byte::getWriterList(ChangelistList& _return) const {
  for (map<uint64_t, uint8_t>::const_iterator iter = datamap_.begin();
       iter != datamap_.end(); ++iter) {
    if (iter->first == 0) {
      continue;
    }
    _return.insert(iter->first);
  }
}

uint8_t Byte::get(uint64_t changelist_number) const {
  if (changelist_number == 0) {
    return datamap_.rbegin()->second;
  } else {
    return (--datamap_.upper_bound(changelist_number))->second;
  }
}

}  // namespace edadb


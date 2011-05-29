// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/byte.h"

namespace edadb {

void Byte::commit(uint64_t changelist_number, uint8_t data) {
  datamap_[changelist_number] = data;
}

uint8_t Byte::get(uint64_t changelist_number) {
  if (datamap_.empty()) {
    return 0;
  }
  if (changelist_number == 0) {
    return datamap_.rbegin()->second;
  } else {
    return (--datamap_.upper_bound(changelist_number))->second;
  }
}

}  // namespace edadb


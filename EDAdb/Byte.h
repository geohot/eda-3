// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDADB_BYTE_H_
#define EDADB_BYTE_H_

#include <cstdint>
#include <map>

namespace eda3 {

// Represents one byte in the memory space
class Byte {
 public:
  void commit(uint64_t changelist_number, uint8_t data);

  // if 0, get the most recent change
  // if a number is given, find the first change before that one
  uint8_t get(uint64_t changelist_number);
 private:
  // map from changelist number to data
  map<uint64_t, uint8_t> datamap_;
};

}  // namespace eda3
#endif  // EDADB_BYTE_H_


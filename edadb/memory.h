// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDADB_MEMORY_H_
#define EDADB_MEMORY_H_

#include <stdint.h>
#include <map>
#include <set>
#include <string>

#include "edadb/byte.h"

using std::set;
using std::map;
using std::string;

namespace edadb {

typedef map<uint64_t, string> ExtentsMap;
typedef map<uint64_t, uint32_t> ExtentsReq;

class Memory {
 public:
  static Memory* Inst();

  // this will create any bytes that don't exist
  uint64_t commitExtents(const ExtentsMap& extents);

  // this will be mad if things don't exist
  // non existent things get the nullByte
  void fetchExtents(
      ExtentsMap& _return,
      const ExtentsReq& extentreqs,
      uint64_t changenumber,
      bool tag) const;

  void getMatchingList(ChangelistList& _return,
                       const ExtentsMap& extents) const;
  void getWriterList(ChangelistList& _return, uint64_t addr) const;
  void getReaderList(ChangelistList& _return, uint64_t addr) const;

  uint64_t getMaxChangelist() const { return change_; }

 protected:
  Memory();  // Memory is a singleton
 private:
  map<uint64_t, Byte*> memory_;
  uint64_t change_;

  Byte* get(uint64_t addr) const;
  Byte* nullbyte_;

  static Memory* inst_;
};

}  // namespace edadb
#endif  // EDADB_MEMORY_H_


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDADB_BYTE_H_
#define EDADB_BYTE_H_

#include <stdint.h>
#include <map>
#include <set>

#include <boost/archive/tmpdir.hpp>

#include <boost/archive/binary_oarchive.hpp>
#include <boost/archive/binary_iarchive.hpp>

#include <boost/serialization/map.hpp>
#include <boost/serialization/set.hpp>

using std::map;
using std::set;

namespace edadb {

typedef set<uint64_t> ChangelistList;

// Represents one byte in the memory space
class Byte {
 public:
  Byte();

  void commit(uint64_t changelist_number, uint8_t data);

  void addReader(uint64_t changelist_number);

  void getReaderList(ChangelistList& _return) const;
  void getWriterList(ChangelistList& _return) const;

  // if 0, get the most recent change
  // if a number is given, find the first change before that one
  uint8_t get(uint64_t changelist_number) const;
 private:
  friend class boost::serialization::access;
  template<class Archive>
  void serialize(Archive & ar, const unsigned int version) {
    ar & datamap_;
    ar & readerset_;
  }
  // map from changelist number to data
  map<uint64_t, uint8_t> datamap_;
  // set of changelists that used this data
  // it's assumed to have used the most recent at the time
  set<uint64_t> readerset_;
};

}  // namespace edadb
#endif  // EDADB_BYTE_H_


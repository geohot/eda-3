// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDADB_MEMORY_H_
#define EDADB_MEMORY_H_

#include <stdint.h>
#include <map>
#include <set>
#include <string>
#include <vector>
#include <fstream>
#include <iostream>

#include "edadb/byte.h"

#include <boost/archive/tmpdir.hpp>

#include <boost/archive/binary_oarchive.hpp>
#include <boost/archive/binary_iarchive.hpp>

#include <boost/serialization/base_object.hpp>
#include <boost/serialization/map.hpp>
#include <boost/serialization/vector.hpp>

using std::set;
using std::map;
using std::string;
using std::vector;
using std::pair;

namespace edadb {

typedef map<uint64_t, string> ExtentsMap;
typedef map<uint64_t, uint32_t> ExtentsReq;

typedef map<string, string> TagsObject;

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
      bool tag);

  void getMatchingList(ChangelistList& _return,
                       const ExtentsMap& extents) const;
  void getWriterList(ChangelistList& _return, uint64_t addr) const;
  void getReaderList(ChangelistList& _return, uint64_t addr) const;

  void getChangelistWrittenExtents(ExtentsMap& _return, uint64_t changenumber) const;
  void getChangelistReadExtents(ExtentsMap& _return, uint64_t changenumber) const;

  uint64_t getMaxChangelist() const { return change_; }

  void setTag(uint64_t addr, const string& tagname, const string& data);
  void getTags(TagsObject& _return, uint64_t addr) const;

  void searchTags(set<uint64_t>& addr, const string& tagname, const string& data);

  void dumpToFile(const string& filename);
  void readFromFile(const string& filename);

  void trash();

 protected:
  Memory();  // Memory is a singleton
 private:
  friend class boost::serialization::access;
  template<class Archive>
  void serialize(Archive & ar, const unsigned int version) {
    ar & memory_;
    ar & change_;
    ar & memory_tags_;
    ar & history_written_;
    ar & history_read_;
    ar & nullbyte_;
    ar & memory_reverse_tags_;
  }

  map<uint64_t, Byte*> memory_;
  uint64_t change_;   // current max changelist number

// storage for the memory metadata
  map<uint64_t, TagsObject> memory_tags_;
  map<pair<string, string>, set<uint64_t> > memory_reverse_tags_;

// this tracks all the changelists
  vector<ExtentsMap> history_written_;
  vector<ExtentsMap> history_read_;

  Byte* get(uint64_t addr) const;
  Byte* nullbyte_;

  static Memory* inst_;
};

}  // namespace edadb
#endif  // EDADB_MEMORY_H_


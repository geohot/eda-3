// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

namespace cpp edadb

service EDAdb {
  // returns changelist number of the commit after success
  i64 commitExtents(1:map<i64, binary> extents),

  // fetches a SubMemory for display or disassembly
  // tag will tag these as read
  map<i64, binary> fetchExtents(1:map<i64, i32> extentreqs,
                                2:i64 changenumber,
                                3:bool tag),

  // searchpattern is a SubMemory where every byte matches
  // if it stays matching, this will return the earliest changelist it
  // matched at, and multiple if it changed and changed back
  set<i64> getMatchingList(1:map<i64, binary> searchpattern),

  // Get a list of changelists that wrote this address
  set<i64> getWriterList(1:i64 address),

  // Get a list of changelists that read this address
  set<i64> getReaderList(1:i64 address),

  // Get highest changelist number
  i64 getMaxChangelist(),

  // Get changelist extents, not sure where this is stored yet
  map<i64, binary> getChangelistWrittenExtents(1:i64 changenumber),
  map<i64, binary> getChangelistReadExtents(1:i64 changenumber),

  // Get and set the tags
  //   name : R0
  //   length : 4
  //   endian : "little"
  //   parsed : "MOV R0, #1"
  //   comment : "this is a chicken"
  //   infunction : 31330
  //   statelistChangelist : "[R0] <- 1; [PC] <- [PC]+4"

  // Or
  //   slaveto : 31337
  map<string, string> getTags(1:i64 address),
  void setTag(1:i64 address, 2:string tagname, 3:string data),

  // this is the accessor used by tid
  // currently poorly imped
  map<i64, map<string, string>> getTagsInRange(1:i64 address_start, 2:i64 address_end),

  void dumpToFile(1:string filename),
  void readFromFile(1:string filename),
}


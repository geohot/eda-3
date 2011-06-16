// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

namespace cpp edadb

struct ThriftExtent {
  1:i64 addr,
  2:i32 len,
  3:i32 endian,
}

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
  //   endian : "little"
  //   parsed : "MOV R0, #1"
  //   comment : "this is a chicken"
  //   statelistChangelist : "[R0] <- 1; [PC] <- [PC]+4"
  map<string, string> getTags(1:i64 address),
  void setTag(1:i64 address, 2:string tagname, 3:string data),

  void setNamedExtent(1:string name, 2:ThriftExtent extent),
  ThriftExtent getNamedExtent(1:string name),
}

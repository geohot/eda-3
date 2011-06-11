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
  i64 getMaxChangelist()
}


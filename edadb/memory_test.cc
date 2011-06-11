// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/memory.h"
#include "gtest/gtest.h"

namespace edadb {

class MemoryTest : public testing::Test {
 protected:
  virtual void SetUp() {
    if (Memory::Inst()->getMaxChangelist() == 0) {
      ExtentsMap extents;
      extents.insert(std::make_pair(1337, "geohot"));
      extents.insert(std::make_pair(31337, "George Hotz"));
      Memory::Inst()->commitExtents(extents);
      ExtentsMap extents2;
      extents2.insert(std::make_pair(31337, "Bob Blick"));
      Memory::Inst()->commitExtents(extents2);
      ExtentsReq req;
      req.insert(std::make_pair(31337, 6));
      ExtentsMap resp;
      Memory::Inst()->fetchExtents(resp, req, 0, true);
    }
  }
};

TEST_F(MemoryTest, FetchExtents) {
  ExtentsReq req;
  req.insert(std::make_pair(1337, 6));
  req.insert(std::make_pair(31337, 5));
  ExtentsMap resp;
  Memory::Inst()->fetchExtents(resp, req, 0, false);
  EXPECT_EQ("geohot", resp[1337]);
  EXPECT_EQ("Bob B", resp[31337]);
}

TEST_F(MemoryTest, FetchExtentsOldChange) {
  ExtentsReq req;
  req.insert(std::make_pair(31337, 6));
  ExtentsMap resp;
  Memory::Inst()->fetchExtents(resp, req, 1, false);
  EXPECT_EQ("George", resp[31337]);
}

TEST_F(MemoryTest, MaxChangelist) {
  EXPECT_EQ(2, Memory::Inst()->getMaxChangelist());
}

TEST_F(MemoryTest, NullByte) {
  ExtentsReq req;
  req.insert(std::make_pair(131337, 1));
  ExtentsMap resp;
  Memory::Inst()->fetchExtents(resp, req, 1, false);
  string eq;
  eq.push_back(0xAA);
  EXPECT_EQ(eq, resp[131337]);
}

TEST_F(MemoryTest, WriterList) {
  ChangelistList cll;
  Memory::Inst()->getWriterList(cll, 31337);
  ChangelistList::iterator iter = cll.begin();
  EXPECT_EQ(1, *iter);
  iter++;
  EXPECT_EQ(2, *iter);
  iter++;
  EXPECT_TRUE(iter == cll.end());
}

TEST_F(MemoryTest, ReaderList) {
  ChangelistList cll;
  Memory::Inst()->getReaderList(cll, 31337+3);
  ChangelistList::iterator iter = cll.begin();
  EXPECT_EQ(3, *iter);
  iter++;
  EXPECT_TRUE(iter == cll.end());
}

}  // namespace edadb


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
      Memory::Inst()->commitExtents(extents);  // this is changelist 1
      ExtentsMap extents2;
      extents2.insert(std::make_pair(31337, "Bob Blick"));
      Memory::Inst()->commitExtents(extents2);  // this is changelist 2
      ExtentsReq req;
      req.insert(std::make_pair(31337, 6));
      ExtentsMap resp;
      // read for changelist 3
      Memory::Inst()->fetchExtents(resp, req, 0, true);

      Memory::Inst()->setTag(1337, "comment", "awesome");
      Memory::Inst()->setTag(1337, "parsed", "jumper");
      Memory::Inst()->setTag(1337, "comment", "blows");

      Memory::Inst()->setTag(31337, "bye", "b");
      Memory::Inst()->setTag(31337, "hi", "a");
      Memory::Inst()->setTag(31337, "hi", "");
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

TEST_F(MemoryTest, WrittenExtents) {
  ExtentsMap ret;
  Memory::Inst()->getChangelistWrittenExtents(ret, 1);
  ExtentsMap::iterator iter = ret.find(31337);
  EXPECT_EQ("George Hotz", iter->second);
}

TEST_F(MemoryTest, ReadExtents) {
  ExtentsMap ret;
  Memory::Inst()->getChangelistReadExtents(ret, 3);
  ExtentsMap::iterator iter = ret.find(31337);
  EXPECT_EQ("Bob Bl", iter->second);
}

TEST_F(MemoryTest, GetTags) {
  TagsObject tags;
  Memory::Inst()->getTags(tags, 1337);
  EXPECT_EQ("blows", tags["comment"]);
  EXPECT_EQ("jumper", tags["parsed"]);
}

TEST_F(MemoryTest, GetEmptyTag) {
  TagsObject tags;
  Memory::Inst()->getTags(tags, 31337);
  EXPECT_EQ("b", tags["bye"]);
  EXPECT_TRUE(tags.find("hi") == tags.end());
}

}  // namespace edadb


// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/memory.h"

namespace edadb {

Memory* Memory::inst_ = NULL;

Memory* Memory::Inst() {
  if (inst_ == NULL) {
    inst_ = new Memory();
  }
  return inst_;
}

Memory::Memory() {
  change_ = 0;
  nullbyte_ = new Byte();
  nullbyte_->commit(0, 0xAA);  // good way of seeing the nulls vs the 00

  // empty histories for the 0 changelist
  history_written_.resize(1);
  history_read_.resize(2);

  // changelist 1 is empty
  ExtentsMap empty;
  commitExtents(empty);
}

uint64_t Memory::commitExtents(const ExtentsMap& extents) {
  // next changelist is the one we are committing
  change_++;

  // put this in the history
  history_written_.push_back(extents);
  history_read_.resize(change_ + 2);  // zero changelist + next changelist

  for (map<uint64_t, string>::const_iterator iter = extents.begin();
       iter != extents.end(); ++iter) {
    for (int i = 0; i < iter->second.size(); i++) {
      uint64_t addr = iter->first + i;
      Byte* byte = get(addr);
      if (byte == nullbyte_) {
        byte = memory_.insert(std::make_pair(addr, new Byte())).first->second;
      }
      byte->commit(change_, iter->second[i]);
    }
  }
  return change_;
}

void Memory::fetchExtents(
    ExtentsMap& _return,
    const ExtentsReq& extentreqs,
    uint64_t changenumber,
    bool tag) {
  for (map<uint64_t, uint32_t>::const_iterator iter = extentreqs.begin();
       iter != extentreqs.end(); ++iter) {
    string extent;
    for (int i = 0; i < iter->second; i++) {
      uint64_t addr = iter->first + i;
      Byte* byte = get(addr);
      if (tag == true) {
        byte->addReader(change_ + 1);
      }
      extent.push_back(byte->get(changenumber));
    }
    _return.insert(make_pair(iter->first, extent));
  }

  // put this in history
  history_read_[change_ + 1].insert(_return.begin(), _return.end());
}

void Memory::getMatchingList(ChangelistList& _return,
    const ExtentsMap& extents) const {
  map<Byte*, uint8_t> matching_set;
  for (ExtentsMap::const_iterator iter = extents.begin(); iter != extents.end(); ++iter) {
    for (int i = 0; i < iter->second.length(); i++) {
      map<uint64_t, Byte*>::const_iterator a = memory_.find(i);
      if (a == memory_.end()) {
        // if a byte isn't defined, there's no way in hell it'll match
        return;
      }
      matching_set.insert(std::make_pair(a->second, iter->second[i]));
    }
  }

  // matching_set is built
  // write this stupidly, fix later
  for (uint64_t i = 0; i < change_; i++) {
    bool match = true;
    for (map<Byte*, uint8_t>::iterator iter = matching_set.begin(); iter != matching_set.end(); ++iter) {
      if (iter->second != iter->first->get(i)) {
        match = false;
        break;
      }
    }
    if (match) {
      _return.insert(i);
    }
  }
}

void Memory::getWriterList(ChangelistList& _return, uint64_t addr) const {
  get(addr)->getWriterList(_return);
}

// null byte behavior is interesting here, see the exception changelists
void Memory::getReaderList(ChangelistList& _return, uint64_t addr) const {
  get(addr)->getReaderList(_return);
}

void Memory::getChangelistWrittenExtents(ExtentsMap& _return,
                                         uint64_t changenumber) const {
  if (changenumber <= change_) {
    _return = history_written_[changenumber];
  }
}

void Memory::getChangelistReadExtents(ExtentsMap& _return,
                                      uint64_t changenumber) const {
  if (changenumber <= (change_ + 1)) {
    _return = history_read_[changenumber];
  }
}

void Memory::setTag(uint64_t addr, const string& tagname, const string& data) {
  TagsObject newobj;
  map<uint64_t, TagsObject>::iterator iter = memory_tags_.insert(make_pair(addr, newobj)).first;
  if (data.length() == 0) {
    iter->second.erase(tagname);
  } else {
    TagsObject::iterator titer = iter->second.insert(make_pair(tagname, data)).first;
    titer->second = data;
  }

  set<uint64_t> d;
  map<pair<string, string>, set<uint64_t> >::iterator iterr = memory_reverse_tags_.insert(make_pair(make_pair(tagname, data), d)).first;
  iterr->second.insert(addr);

  map<uint64_t, string> d2;
  map<string, map<uint64_t, string> >::iterator iterrr = memory_reverse_tagnames_.insert(make_pair(tagname, d2)).first;
  iterrr->second.insert(make_pair(addr, data));
}

void Memory::getTags(TagsObject& _return, uint64_t addr) const {
  map<uint64_t, TagsObject>::const_iterator iter = memory_tags_.find(addr);
  if (iter != memory_tags_.end()) {
    _return = iter->second;
  }
}

string Memory::getTag(uint64_t addr, const string& tagname) {
  map<uint64_t, TagsObject>::const_iterator iter = memory_tags_.find(addr);
  if (iter != memory_tags_.end()) {
    map<string, string>::const_iterator titer = iter->second.find(tagname);
    if (titer != iter->second.end()) {
      return titer->second;
    }
  }
  return "";
}

void Memory::allTagsWithName(map<uint64_t, string>& addr, const string& tagname) {
  map<string, map<uint64_t, string> >::iterator iter = memory_reverse_tagnames_.find(tagname);
  if (iter != memory_reverse_tagnames_.end()) {
    addr = iter->second;
  }
}

void Memory::searchTags(set<uint64_t>& addr, const string& tagname, const string& data) {
  map<pair<string, string>, set<uint64_t> >::iterator iter = memory_reverse_tags_.find(make_pair(tagname, data));
  if (iter != memory_reverse_tags_.end()) {
    addr = iter->second;
  }
}

// private function
Byte* Memory::get(uint64_t addr) const {
  map<uint64_t, Byte*>::const_iterator byte = memory_.find(addr);
  if (byte == memory_.end()) {
    return nullbyte_;
  } else {
    return byte->second;
  }
}

void Memory::dumpToFile(const std::string& filename) {
  printf("dumping to file %s...\n", filename.c_str());
  std::ofstream ofs(filename.c_str(), std::ios::binary);
  boost::archive::binary_oarchive oa(ofs);
  //oa << this;
  printf("done\n");
}

void Memory::readFromFile(const std::string& filename) {
  printf("reading from file %s...\n", filename.c_str());
  std::ifstream ifs(filename.c_str(), std::ios::binary);
  boost::archive::binary_iarchive ia(ifs);
  // this is hacky, any saved ptrs to Inst need to die
  Memory* replace = new Memory;
  ia >> replace;
  delete inst_;
  inst_ = replace;
  printf("done\n");
}

void Memory::trash() {
  Memory* replace = new Memory;
  delete inst_;
  inst_ = replace;
}

}  // namespace edadb


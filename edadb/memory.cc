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
  // TODO(geohot) implement this
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
}

void Memory::getTags(TagsObject& _return, uint64_t addr) const {
  map<uint64_t, TagsObject>::const_iterator iter = memory_tags_.find(addr);
  if (iter != memory_tags_.end()) {
    _return = iter->second;
  }
}

void Memory::setNamedExtent(const string& name, Extent extent) {
  map<string, Extent>::iterator iter = named_extent_.insert(make_pair(name, extent)).first;
  if (extent.len == 0) {
    named_extent_.erase(iter);
  } else {
    iter->second = extent;
  }
}

void Memory::getNamedExtent(Extent& _return, const string& name) const {
  map<string, Extent>::const_iterator iter = named_extent_.find(name);
  if (iter != named_extent_.end()) {
    _return = iter->second;
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

}  // namespace edadb

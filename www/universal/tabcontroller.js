// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

function TabController(tabs, view) {
  this.tabRoot = tabs;
  this.tabView = view;
  this.tabSelected = null;

  this.tabs = [];
}

TabController.prototype.redrawView = function() {
  for (var i = 0; i< this.tabs.length; i++) {
    $(this.tabRoot).append(this.tabs[i].dom);
  }
};

TabController.prototype.selectTab = function(tab) {
  if (this.tabSelected != null) {
    this.tabSelected.selected = false;
    this.tabSelected.dom[0].style.backgroundColor = 'white';
  }
  this.tabView.empty();
  this.tabView.append(tab.tab);
  tab.selected = true;
  tab.dom[0].style.backgroundColor = '#FF4433';
  this.tabSelected = tab;
  this.activeTabData = tab.data;
};

TabController.prototype.tabClicked = function(e) {
  e.data[0].selectTab(e.data[1]);
};

TabController.prototype.addTab = function(name, dom, data, selected) {
  var ele = $('<div class="tab">'+name+'</div>');
  var newtab = {name: name, tab: dom, dom: ele, data: data, selected: false};
  ele.click([this, newtab], this.tabClicked);
  this.tabs.push(newtab);
  this.redrawView();
  if (selected) {
    this.selectTab(newtab);
  }
};


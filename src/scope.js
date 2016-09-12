
function initWatchVal() { }

function Scope() {
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function (watchFn, listenerFn, valueEq) {
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function () { },
    valueEq : !!valueEq,
    last: initWatchVal
  };
  this.$$watchers.push(watcher);
  this.$$lastDirtyWatch = null;
};

Scope.prototype.$$digestOnce = function () {
  var _this = this;
  var newValue, oldValue, dirty;
  _.forEach(this.$$watchers, function (watcher) {
    newValue = watcher.watchFn(_this);
    oldValue = watcher.last;
    if (!_this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
      _this.$$lastDirtyWatch = watcher;
      watcher.last = watcher.valueEq? _.cloneDeep(newValue):newValue;
      watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), _this);
      dirty = true;
    }
    else if(_this.$$lastDirtyWatch === watcher){
      return false;
    }
  });
  return dirty;
};

Scope.prototype.$digest = function () {
  var ttl = 10;
  var dirty;
  this.$$lastDirtyWatch = null;
  do {
    dirty = this.$$digestOnce();
    if (dirty && !(ttl--)) {
      throw "10 digest iterations reached";
    }
  } while (dirty);
};

Scope.prototype.$$areEqual = function(newValue, oldValue, valueEq){
  if(valueEq){
    return _.isEqual(newValue, oldValue);
  }
  else{
    return newValue === oldValue || ( typeof newValue === 'number' &&  typeof oldValue === 'number' &&  isNaN(oldValue) &&  isNaN(newValue) );
  }
};
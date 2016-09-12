
class initWatchVal{ }

class Scope {
  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
  }

  $watch(watchFn, listenerFn, valueEq) {
    var watcher = {
      watchFn: watchFn,
      listenerFn: listenerFn || function () { },
      valueEq: !!valueEq,
      last: initWatchVal
    };
    this.$$watchers.push(watcher);
    this.$$lastDirtyWatch = null;
  }

  $$digestOnce() {
    var _this = this;
    var newValue, oldValue, dirty;
    _.forEach(this.$$watchers, function (watcher) {
      newValue = watcher.watchFn(_this);
      oldValue = watcher.last;
      if (!_this.$$areEqual(newValue, oldValue, watcher.valueEq)) {
        _this.$$lastDirtyWatch = watcher;
        watcher.last = watcher.valueEq ? _.cloneDeep(newValue) : newValue;
        watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue), _this);
        dirty = true;
      }
      else if (_this.$$lastDirtyWatch === watcher) {
        return false;
      }
    });
    return dirty;
  }

  $digest() {
    var ttl = 10;
    var dirty;
    this.$$lastDirtyWatch = null;
    do {
      dirty = this.$$digestOnce();
      if (dirty && !(ttl--)) {
        throw "10 digest iterations reached";
      }
    } while (dirty);
  }

  $$areEqual(newValue, oldValue, valueEq) {
    if (valueEq) {
      return _.isEqual(newValue, oldValue);
    }
    else {
      return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(oldValue) && isNaN(newValue));
    }
  }

  $eval(expr, locals) {
    return expr(this, locals);
  }

  $apply(expr){
    try {
      return this.$eval(expr);
    } finally {
      this.$digest();
    }
  }
}

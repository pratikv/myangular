
class initWatchVal{ }

class Scope {
  constructor() {
    this.$$watchers = [];
    this.$$lastDirtyWatch = null;
    this.$$asyncQueue = [];
    this.$$phase = null;
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
    this.$beginPhase('$digest');
    do {
      while(this.$$asyncQueue.length){
        var asyncTask = this.$$asyncQueue.shift();
        asyncTask.scope.$eval(asyncTask.expression);
      }
      dirty = this.$$digestOnce();
      if ( ( dirty || this.$$asyncQueue.length ) && !(ttl--)) {
        this.$clearPhase();
        throw "10 digest iterations reached";
      }
    } while (dirty || this.$$asyncQueue.length);
    this.$clearPhase();
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
      this.$beginPhase('$apply');
      return this.$eval(expr);
    } finally {
      this.$clearPhase();
      this.$digest();
    }
  }

  $evalAsync(expr){
    var _this = this;
    if(!_this.$$phase && !_this.$$asyncQueue.length){
      setTimeout(function() {
        if(_this.$$asyncQueue.length){
          _this.$digest();
        }
      }, 0);
    }
    this.$$asyncQueue.push({scope : this, expression : expr} );
  }

  $beginPhase(phase){
    if(this.$$phase){
      throw this.$$phase + ' already in progress';
    }
    this.$$phase = phase;
  }

  $clearPhase(){
    this.$$phase = null;
  }

}

/* jshint globalstrict : true */
/* global Scope : false */
'use strict';

describe("Scope", function () {
  it("can be constructed and used as an object", function () {
    var scope = new Scope();
    scope.aProperty = 1;

    expect(scope.aProperty).toBe(1);
  });

  describe("digest", function () {
    var scope;

    beforeEach(function () {
      scope = new Scope();
    });

    it("calls the listener function of a watch on first $digest", function () {
      var watchFn = function () { return "wat"; };
      var listenerFn = jasmine.createSpy();
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(listenerFn).toHaveBeenCalled();
    });

    it("calls the watch function wuth scope as the first argument", function () {
      var watchFn = jasmine.createSpy();
      var listenerFn = function () { };
      scope.$watch(watchFn, listenerFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalledWith(scope);
    });

    it("calls a listner function when the watch value changes", function () {
      scope.someValue = 'a';
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.someValue; },
        function (newValue, oldValue, scope) { scope.counter++; }
      );

      expect(scope.counter).toBe(0);

      scope.$digest();

      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(1);
      scope.someValue = 'b';
      expect(scope.counter).toBe(1);
      scope.$digest();
      expect(scope.counter).toBe(2);

    });

    it("calls a listener when the watch value is first undefined", function () {
      scope.counter = 0;
      scope.$watch(
        function (scope) { return scope.someValue; },
        function (newValue, oldValue, scope) { scope.counter++; }
      );
      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it("calls listener with new value as old value the first time", function () {
      scope.someValue = 123;
      var oldValueGiven;

      scope.$watch(
        function (scope) { return scope.someValue; },
        function (newValue, oldValue, scope) { oldValueGiven = oldValue; }
      );

      scope.$digest();
      expect(oldValueGiven).toBe(123);
    });

    it("may have watchers that omit the listener function", function () {
      var watchFn = jasmine.createSpy().and.returnValue("something");
      scope.$watch(watchFn);
      scope.$digest();
      expect(watchFn).toHaveBeenCalled();
    });

    it('triggers chained watchers in the same digest', function () {
      scope.name = "Jane";

      scope.$watch(
        function (scope) { return scope.nameUpper; },
        function (newValue, oldValue, scope) {
          if (newValue) {
            scope.initial = newValue.substring(0, 1) + '.';
          }
        }
      );

      scope.$watch(
        function (scope) { return scope.name; },
        function (nv, ov, scope) {
          if (nv) {
            scope.nameUpper = nv.toUpperCase();
          }
        }
      );

      scope.$digest();
      expect(scope.initial).toBe("J.");

      scope.name = "Bob";
      scope.$digest();
      expect(scope.initial).toBe("B.");

    });

    it("gives up on watches after 10 itereations", function () {
      scope.counterA = 0;
      scope.counterB = 0;

      scope.$watch(
        function (scope) { return scope.counterA; },
        function (newValue, oldValue, scope) {
          scope.counterA++;
        }
      );

      scope.$watch(
        function (scope) { return scope.counterB; },
        function (newValue, oldValue, scope) {
          scope.counterB++;
        }
      );

      expect(function () { scope.$digest(); }).toThrow();
    });

    it('ends when the last digest is clean', function () {
      scope.array = _.range(100);
      var watchExecutions = 0;
      _.times(100, function (i) {
        scope.$watch(
          function (scope) {
            watchExecutions++;
            return scope.array[i];
          },
          function (newValue, oldValue, scope) {
          }
        );
      });

      scope.$digest();
      expect(watchExecutions).toBe(200);

      scope.array[0] = 420;
      scope.$digest();
      expect(watchExecutions).toBe(301);
    });

    it('does not end digest so that new watches are not run', function () {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.$watch(
            function (scope) { return scope.aValue; },
            function (newValue, oldValue, scope) {
              scope.counter++;
            }
          );
        }
      );
      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it('compares based on value if enabled', function () {
      scope.aValue = [1, 2, 3];
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        },
        true
      );
      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.aValue.push(4);
      scope.$digest();
      expect(scope.counter).toBe(2);
    });

    it('correctly handles NaNs', () => {
      scope.number = 0 / 0;
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.number; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);
    });


    it("executes $eval'ed function and returns result", () => {
      scope.aValue = 42;

      var result = scope.$eval(function (scope) {
        return scope.aValue;
      });
      expect(result).toBe(42);
    });

    it('passes the second $eval argument straight through', () => {
      scope.aValue = 42;
      var result = scope.$eval(function (scope, arg) {
        return scope.aValue + arg;
      }, 2);
      expect(result).toBe(44);
    });

    it("executes $aaply'ed function and starts the digest", function () {
      scope.aValue = "someValue";
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$apply(function (scope) {
        scope.aValue = 'someOtherValue';
      });
      expect(scope.counter).toBe(2);
    });


    it("executes $evalAsync'ed function later in the same cycle", () => {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluated = false;
      scope.asyncEvaluatedImmediately = false;

      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.$evalAsync(function (scope) {
            scope.asyncEvaluated = true;
          });
          scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
        }
      );

      scope.$digest();
      expect(scope.asyncEvaluated).toBe(true);
      expect(scope.asyncEvaluatedImmediately).toBe(false);
    });

    it('excecutes $evalAsync functions added by watch functions', () => {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluated = false;

      scope.$watch(
        function (scope) {
          if (!scope.asyncEvaluated) {
            scope.$evalAsync(function (scope) {
              scope.asyncEvaluated = true;
            });
          }
        },
        function (newValue, oldValue, scope) { }
      );

      scope.$digest();
      expect(scope.asyncEvaluated).toBe(true);

    });

    it('executes $evalAsync functions even when not dirty', () => {
      scope.aValue = [1, 2, 3];
      scope.asyncEvaluatedTimes = 0;

      scope.$watch(
        function (scope) {
          if (scope.asyncEvaluatedTimes < 2) {
            scope.$evalAsync(function (scope) {
              scope.asyncEvaluatedTimes++;
            });
          }
        },
        function (newValue, oldValue, scope) { }
      );

      scope.$digest();
      expect(scope.asyncEvaluatedTimes).toBe(2);

    });

    it("eventually halts $evalAsync(s) added by watches", function () {
      scope.aValue = [1, 2, 3];
      scope.$watch(
        function (scope) {
          scope.$evalAsync(function () { });
          return scope.aValue;
        },
        function (newVal, oldVal, scope) { }
      );

      expect(function () { scope.$digest() }).toThrow();
    });

    it("has a $$phase field whose value is the current digest phase", function () {
      scope.aValue = [1, 2, 3];
      scope.phaseInWatchFunction = undefined;
      scope.phaseInListenerFunction = undefined;
      scope.phaseInApplyFunction = undefined;

      scope.$watch(
        function (scope) {
          scope.phaseInWatchFunction = scope.$$phase;
          return scope.aValue;
        },
        function (newValue, oldValue, scope) {
          scope.phaseInListenerFunction = scope.$$phase;
        }
      );

      scope.$apply(function (scope) {
        scope.phaseInApplyFunction = scope.$$phase;
      });

      expect(scope.phaseInWatchFunction).toBe('$digest');
      expect(scope.phaseInListenerFunction).toBe('$digest');
      expect(scope.phaseInApplyFunction).toBe('$apply');
    });

    it("schedules a digest in $evalAsync", function (done) {
      scope.aValue = 'abc';
      scope.counter = 0;

      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        }
      );

      scope.$evalAsync(function (scope) {
      });

      expect(scope.counter).toBe(0);
      setTimeout(function () {
        expect(scope.counter).toBe(1);
        done();
      }, 50);
    });


    it('allows async $apply with $applyAsync', function (done) {
      scope.counter = 0;
      scope.$watch(function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.counter++;
        });

      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$applyAsync(function (scope) {
        scope.aValue = 'abc';
      });
      expect(scope.counter).toBe(1);
      setTimeout(function () {
        expect(scope.counter).toBe(2);
        done();
      }, 50);
    });

    it("never executes $applyAsync'd function in the same cycle", function (done) {
      scope.aValue = [1, 2, 3];
      scope.asyncApplied = false;
      scope.$watch(
        function (scope) { return scope.aValue; },
        function (newValue, oldValue, scope) {
          scope.$applyAsync(function (scope) {
            scope.asyncApplied = true;
          });
        }
      );

      scope.$digest();
      expect(scope.asyncApplied).toBe(false);
      setTimeout(function () {
        expect(scope.asyncApplied).toBe(true);
        done();
      }, 50);
    });

    it("coalsasces many calls to $applyAsync", function (done) {
      scope.counter = 0;

      scope.$watch(
        function (scope) {
          scope.counter++;
          return scope.aValue;
        }, 
        function (newValue, oldValue, scope) { }
        );
      scope.$applyAsync(function (scope) {
        scope.aValue = 'abc';
      });
      scope.$applyAsync(function (scope) {
        scope.aValue = 'def';
      });

      setTimeout(function () {
        expect(scope.counter).toBe(2);
        done();
      }, 50)
    });

    it("cancels and flushes $applyAsync if digested first", function(done){
      scope.counter = 0;
      scope.$watch(
        function(scope){
          scope.counter++;
          return scope.aValue;
        },
        function(newValue, oldValue, scope){}
      );
      scope.$applyAsync(function(scope){
        scope.aValue = 'abc';
      });
      scope.$applyAsync(function(scope){
        scope.aValue = 'def';
      });

      scope.$digest();

      expect(scope.counter).toBe(2);

      expect(scope.aValue).toBe('def');

      setTimeout(function(){
        expect(scope.counter).toBe(2);
          done();
      },50);
    });

    it("runs a $$postDigest after each digest", function(){
      scope.counter = 0;

      scope.$$postDigest(function(){
        scope.counter++;
      });

      expect(scope.counter).toBe(0);
      scope.$digest();
      expect(scope.counter).toBe(1);

      scope.$digest();
      expect(scope.counter).toBe(1);
    });

    it("doest not include $$postDigest in the digest", function(){
      scope.aValue = "Original Value";

      scope.$$postDigest(function(){
        scope.aValue = "Changed Value";
      });

      scope.$watch(
        function(scope){
          return scope.aValue;
        },
        function(newValue, oldValue, scope){
          scope.watchedValue = newValue;
        }
      );

      scope.$digest();
      expect(scope.watchedValue).toBe("Original Value");

      scope.$digest();
      expect(scope.watchedValue).toBe("Changed Value");
    });

  });

});

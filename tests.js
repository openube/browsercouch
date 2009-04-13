var Tests = {
  run: function(listener, container, setTimeout) {
    if (!container)
      container = this;
    if (!setTimeout)
      setTimeout = window.setTimeout;

    var tests = [];

    for (name in container)
      if (name.indexOf("test") == "0") {
        var test = {
          name: name,
          func: container[name],
          isAsync: name.indexOf("_async") != -1,
          console: console,
          id: tests.length,
          assertEqual: function assertEqual(a, b) {
            if (a != b)
              throw new Error(a + " != " + b);
          }
        };
        tests.push(test);
      }

    listener.onReady(tests);
    var nextTest = 0;

    function runNextTest() {
      if (nextTest < tests.length) {
        var test = tests[nextTest];
        listener.onRun(test);
        test.done = function() {
          listener.onFinish(this);
          setTimeout(runNextTest, 0);
        };
        test.func(test);
        if (!test.isAsync)
          test.done();
        nextTest++;
      }
    }

    runNextTest();
  },
  testDictionary: function(self) {
    var dict = new BrowserCouch._Dictionary();
    dict.set('foo', {a: 'hello'});
    dict.set('bar', {b: 'goodbye'});
    self.assertEqual(dict.get('foo').a, 'hello');
    self.assertEqual(dict.get('bar').b, 'goodbye');
    self.assertEqual(dict.getKeys().length, 2);
    self.assertEqual(dict.has('foo'), true);
    self.assertEqual(dict.has('bar'), true);
    self.assertEqual(dict.has('spatula'), false);
    dict.delete('bar');
    self.assertEqual(dict.getKeys().length, 1);
    self.assertEqual(dict.has('foo'), true);
  },
  testDbView_async: function(self) {
    BrowserCouch.get(
      "blarg",
      function(db) {
        var progressCalled = false;
        db.put(
          [{id: "monkey",
            content: "hello there dude"},
           {id: "chunky",
            content: "hello there dogen"}],
          function() {
            var timesProgressCalled = 0;
            db.view(
              {map: function(doc, emit) {
                 var words = doc.content.split(" ");
                 for (var i = 0; i < words.length; i++)
                   emit(words[i], 1);
               },
               reduce: function(keys, values) {
                 var sum = 0;
                 for (var i = 0; i < values.length; i++)
                   sum += values[i];
                 return sum;
               },
               chunkSize: 1,
               progress: function(phase, percentDone, resume) {
                 if (phase == "map") {
                   self.assertEqual(percentDone, 0.5);
                   progressCalled = true;
                 }
                 resume();
               },
               finished: function(result) {
                 self.assertEqual(progressCalled, true);

                 var expected = {rows: [{key: "dogen", value: 1},
                                        {key: "dude", value: 1},
                                        {key: "hello", value: 2},
                                        {key: "there", value: 2}]};

                 self.assertEqual(JSON.stringify(expected),
                                  JSON.stringify(result));
                 self.done();
               }});
          });
      });
  }
};

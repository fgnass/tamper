const tamper = require('..');
const http = require('http');
const parse = require('url').parse;
const qs = require('querystring');
const request = require('supertest');
const assert = require('assert');

// Test-content to be replaced by the middleware
const content = 'Content to be replaced';

// Replaces all occurrences of the test-content
function replace(body) {
  return body.replace(new RegExp(content, 'g'), 'Replaced content');
}

// A versatile handler to test the various ServerResponse methods
function fixtureHandler(req, res) {
  const url = parse(req.url);
  const q = qs.parse(url.query);
  const headers = JSON.parse(q.headers || null);

  // call writeHead() if `status` or `headers` parameter is present
  if (q.status || headers) {
    res.writeHead(q.status || 200, headers);
  }

  // pipe the request to the response in case of POST requests
  if (req.method == 'POST') {
    req.pipe(res);
  } else {
    if (q.fill) {
      // write a buffer filled with 'x'
      var b = Buffer.alloc(parseInt(q.fill, 10));
      b.fill('x');
      res.write(b);
    }

    // call write() with the content of the `write` parameter
    if (q.write) res.write(q.write);

    // call end() with the content of the `end` parameter
    res.end(q.end);
  }
}

// Creates a HttpServer with the given middleware
function createServer(tamperMiddleware) {
  return http.createServer((req, res) => {
    const next = () => {
      fixtureHandler(req, res);
    };
    tamperMiddleware(req, res, next);
  });
}

// Returns a function that can be passed to describe().
function test(app, expected) {
  return () => {
    // shut down the server
    after(function() {
      app.close();
    });

    it('should echo the body upon POST', done => {
      request(app)
        .post('/')
        .send(content)
        .expect(200)
        .expect(expected, done);
    });

    it('should echo the write parameter upon GET', done => {
      request(app)
        .get('/')
        .query({ write: content })
        .expect(200)
        .expect(expected, done);
    });

    it('should echo the end parameter upon GET', done => {
      request(app)
        .get('/')
        .query({ end: content })
        .expect(200)
        .expect(expected, done);
    });

    it('should work with large responses', done => {
      request(app)
        .get('/')
        .query({ fill: 65536, end: content })
        .expect(200)
        .end((err, res) => {
          assert.equal(res.text.length, 65536 + expected.length);
          done();
        });
    });

    it('should echo both parameters', done => {
      request(app)
        .get('/')
        .query({ write: content, end: content })
        .expect(200)
        .expect(expected + expected, done);
    });

    it('should set the status', done => {
      request(app)
        .get('/')
        .query({ status: 202 })
        .expect(202, done);
    });

    it('should set headers', done => {
      request(app)
        .get('/')
        .query({ headers: '{"X-Works": "Yes"}' })
        .expect('X-Works', 'Yes')
        .expect(200, done);
    });

    it('should honor the X-Tamper header', done => {
      request(app)
        .get('/')
        .query({ write: content, headers: '{"X-Tamper": "No"}' })
        .expect(content, done);
    });
  };
}

// A server without the tamper middleware
var plain = createServer((req, res, next) => {
  next(req, res);
});

// A server with a tamper middleware that does nothing
var inactive = createServer(tamper(() => {}));

// A server that replaces content unless the X-Tamper header is set to 'No'
var active = createServer(
  tamper((req, res) => (res.getHeader('X-Tamper') == 'No' ? false : replace))
);

// A server that replaces content unless the X-Tamper header is set to 'No'
var asynchronous = createServer(
  tamper((req, res) => {
    if (res.getHeader('X-Tamper') == 'No') return false;
    return body =>
      new Promise(function(resolve) {
        process.nextTick(() => {
          resolve(replace(body));
        });
      });
  })
);

describe('The test handler', test(plain, content));
describe('A present but inactive middleware', test(inactive, content));
describe('A tampering middleware', test(active, replace(content)));
describe('An async tampering middleware', test(asynchronous, replace(content)));

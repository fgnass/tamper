# tamper
## Node.js middleware to capture and modify response bodies

[![Build Status](https://secure.travis-ci.org/fgnass/tamper.png)](http://travis-ci.org/fgnass/tamper)

## Installation

  npm install tamper

## Usage

```javascript
var tamper = require('tamper');

app.use(tamper(function(req, res) {

  // Look at the request or the response headers and decide what to do.

  // In this case we only want to modify html responses:
  if (res.getHeader('Content-Type') != 'text/html') {

    // When returning a falsy value processing will continue as usual
    // without any performance impact.
    return;
  }

  // Return a function in order to capture and modify the response body:
  return function(body) {
    // The function may either return a Promise or a string
    return body.replace(/foo/g, 'bar');
  };

});
```

## License

MIT
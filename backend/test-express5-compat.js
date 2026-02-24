const express = require('express');
console.log('Express version:', require('express/package.json').version);

const app = express();

// Test 1: express-mongo-sanitize
try {
  const mongoSanitize = require('express-mongo-sanitize');
  app.use(mongoSanitize({ replaceWith: '_' }));
  console.log('express-mongo-sanitize: OK');
} catch(e) {
  console.log('express-mongo-sanitize: FAIL -', e.message);
}

// Test 2: xss-clean
try {
  const xss = require('xss-clean');
  app.use(xss());
  console.log('xss-clean: OK');
} catch(e) {
  console.log('xss-clean: FAIL -', e.message);
}

// Test 3: express-session
try {
  const session = require('express-session');
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  console.log('express-session: OK');
} catch(e) {
  console.log('express-session: FAIL -', e.message);
}

// Test 4: express-rate-limit
try {
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use(limiter);
  console.log('express-rate-limit: OK');
} catch(e) {
  console.log('express-rate-limit: FAIL -', e.message);
}

// Test 5: passport
try {
  const passport = require('passport');
  app.use(passport.initialize());
  console.log('passport: OK');
} catch(e) {
  console.log('passport: FAIL -', e.message);
}

// Test 6: multer
try {
  const multer = require('multer');
  const upload = multer({ storage: multer.memoryStorage() });
  console.log('multer: OK');
} catch(e) {
  console.log('multer: FAIL -', e.message);
}

// Test 7: morgan
try {
  const morgan = require('morgan');
  app.use(morgan('dev'));
  console.log('morgan: OK');
} catch(e) {
  console.log('morgan: FAIL -', e.message);
}

// Test 8: cors
try {
  const cors = require('cors');
  app.use(cors());
  console.log('cors: OK');
} catch(e) {
  console.log('cors: FAIL -', e.message);
}

// Test 9: helmet
try {
  const helmet = require('helmet');
  app.use(helmet());
  console.log('helmet: OK');
} catch(e) {
  console.log('helmet: FAIL -', e.message);
}

// Test 10: Check error handler with 4 params
try {
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  console.log('Error handler (4 params): OK');
} catch(e) {
  console.log('Error handler: FAIL -', e.message);
}

// Test 11: Check req.query mutability (Express v5 makes it immutable by default with getter)
const http = require('http');
const server = app.listen(0, () => {
  const port = server.address().port;
  
  app.get('/test-query', (req, res) => {
    try {
      // In Express v5, req.query is re-parsed from the URL each time you access it
      // and the query parser may return a different object
      const q1 = req.query;
      const q2 = req.query;
      console.log('req.query identity check:', q1 === q2 ? 'SAME object' : 'DIFFERENT objects (Express v5 behavior)');
      res.json({ ok: true });
    } catch(e) {
      console.log('req.query test FAIL:', e.message);
      res.json({ ok: false });
    }
  });
  
  http.get(`http://localhost:${port}/test-query?foo=bar`, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('\nAll tests complete');
      server.close();
    });
  });
});

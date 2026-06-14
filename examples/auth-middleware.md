# JWT Auth Middleware

**Task:** "Add JWT authentication middleware to this Express app. It should verify the token on each request, attach the decoded user to req.user, and return 401 on invalid or expired tokens."

## Without Snip

```
src/
├── auth/
│   ├── AuthService.js          ← class with verifyToken(), extractBearerToken(), isExpired()
│   ├── JwtMiddleware.js        ← class wrapping AuthService
│   ├── AuthError.js            ← custom error extending Error
│   ├── TokenExtractor.js       ← dedicated class for header parsing
│   └── index.js                ← re-exports everything
```

```js
// auth/AuthService.js
class AuthService {
  constructor(secret, options = {}) {
    this.secret = secret;
    this.options = { algorithms: ['HS256'], ...options };
  }

  extractBearerToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
  }

  isExpired(payload) {
    return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
  }

  async verifyToken(token) {
    try {
      const payload = jwt.verify(token, this.secret, this.options);
      if (this.isExpired(payload)) throw new AuthError('Token expired', 401);
      return payload;
    } catch (err) {
      throw new AuthError(err.message, 401);
    }
  }
}

// auth/JwtMiddleware.js
class JwtMiddleware {
  constructor(authService) {
    this.authService = authService;
  }

  middleware() {
    return async (req, res, next) => {
      try {
        const token = this.authService.extractBearerToken(req.headers.authorization);
        if (!token) return res.status(401).json({ error: 'No token provided' });
        req.user = await this.authService.verifyToken(token);
        next();
      } catch (err) {
        res.status(err.statusCode || 401).json({ error: err.message });
      }
    };
  }
}
```

Five files, two classes, a custom error class, and dependency injection — wrapping three lines of `jsonwebtoken`.

## With Snip

```js
// snip:prod — trust boundary: token verification must not be simplified
import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    req.user = jwt.verify(
      req.headers.authorization?.split(' ')[1],
      process.env.JWT_SECRET
    );
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
};
```

**5 files, ~60 lines → 10 lines.** The `// snip:prod` tag tells the next engineer: this is not over-engineered. This is a trust boundary. Do not compress it further without understanding why `jwt.verify` throws and what those errors mean. The `AuthService`, `JwtMiddleware`, and `TokenExtractor` were ceremony — they added no logic, only indirection.

Add a service layer when a second caller needs to verify tokens in a different way, if that ever happens.

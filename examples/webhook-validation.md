# Webhook Signature Validation

**Task:** "Validate incoming Stripe webhook signatures before processing events."

## Without Snip

```ts
class WebhookSignatureError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

class WebhookTimestampValidator {
  private readonly toleranceSeconds: number;

  constructor(toleranceSeconds = 300) {
    this.toleranceSeconds = toleranceSeconds;
  }

  validate(timestamp: string): void {
    const ts = parseInt(timestamp, 10);
    const age = Math.floor(Date.now() / 1000) - ts;
    if (age > this.toleranceSeconds) {
      throw new WebhookSignatureError('Timestamp too old', 'TIMESTAMP_EXPIRED');
    }
  }
}

class WebhookSignatureExtractor {
  extract(signatureHeader: string): { timestamp: string; signatures: string[] } {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map(p => p.split('=') as [string, string])
    );
    return {
      timestamp: parts['t'],
      signatures: signatureHeader.split(',')
        .filter(p => p.startsWith('v1='))
        .map(p => p.slice(3)),
    };
  }
}

class WebhookValidator {
  constructor(
    private readonly secret: string,
    private readonly extractor = new WebhookSignatureExtractor(),
    private readonly timestampValidator = new WebhookTimestampValidator()
  ) {}

  validate(body: Buffer, signatureHeader: string): void {
    const { timestamp, signatures } = this.extractor.extract(signatureHeader);
    this.timestampValidator.validate(timestamp);
    const { createHmac, timingSafeEqual } = require('crypto');
    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${body}`)
      .digest();
    const valid = signatures.some(sig =>
      timingSafeEqual(expected, Buffer.from(sig, 'hex'))
    );
    if (!valid) throw new WebhookSignatureError('Invalid signature', 'INVALID_SIGNATURE');
  }
}
```

Five classes (including two custom errors and an extractor), dependency injection, and a `validate()` method — for three lines of `crypto`.

## With Snip

```ts
// snip:prod — HMAC verification is a timing-attack boundary; timingSafeEqual is
// mandatory here. Timestamp check prevents replay attacks. Do not simplify.
import { createHmac, timingSafeEqual } from 'crypto';

function verifyStripeWebhook(body: Buffer, sig: string, secret: string): boolean {
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')));
  const ts = parts['t'];
  if (Math.floor(Date.now() / 1000) - parseInt(ts, 10) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${ts}.${body}`).digest();
  const provided = Buffer.from(parts['v1'] ?? '', 'hex');
  return provided.length > 0 && timingSafeEqual(expected, provided);
}
```

**~80 lines → 8 lines.** The `// snip:prod` tag explains why this code is exactly as long as it is: `timingSafeEqual` prevents timing side-channels, the timestamp check prevents replay attacks, and both are security requirements, not style choices. The four surrounding classes added no security — they added indirection over stdlib crypto.

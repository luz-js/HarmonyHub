import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LoginRateLimiter, TooManyLoginAttemptsError } from './login-rate-limiter';

function createLimiter() {
  let now = 0;
  const limiter = new LoginRateLimiter({ maxAttempts: 3, windowMs: 60_000, blockMs: 120_000 }, () => now);
  return { limiter, advance: (ms: number) => (now += ms) };
}

test('LoginRateLimiter bloquea tras el maximo de fallos dentro de la ventana', () => {
  const { limiter } = createLimiter();
  const key = LoginRateLimiter.key('1.1.1.1', 'Ana@Mail.com ');
  limiter.registerFailure(key);
  limiter.registerFailure(key);
  assert.doesNotThrow(() => limiter.assertAllowed(key));
  limiter.registerFailure(key);
  assert.throws(() => limiter.assertAllowed(key), TooManyLoginAttemptsError);
});

test('LoginRateLimiter libera la clave al terminar el bloqueo', () => {
  const { limiter, advance } = createLimiter();
  const key = LoginRateLimiter.key('1.1.1.1', 'ana@mail.com');
  for (let attempt = 0; attempt < 3; attempt += 1) limiter.registerFailure(key);
  advance(119_000);
  assert.throws(() => limiter.assertAllowed(key), TooManyLoginAttemptsError);
  advance(2_000);
  assert.doesNotThrow(() => limiter.assertAllowed(key));
});

test('LoginRateLimiter reinicia la ventana y limpia con un login exitoso', () => {
  const { limiter, advance } = createLimiter();
  const key = LoginRateLimiter.key(undefined, 'ana@mail.com');
  limiter.registerFailure(key);
  limiter.registerFailure(key);
  advance(61_000);
  limiter.registerFailure(key);
  assert.doesNotThrow(() => limiter.assertAllowed(key));
  limiter.registerFailure(key);
  limiter.registerSuccess(key);
  limiter.registerFailure(key);
  assert.doesNotThrow(() => limiter.assertAllowed(key));
});

test('LoginRateLimiter separa claves por ip y correo normalizado', () => {
  assert.equal(LoginRateLimiter.key('1.1.1.1', ' ANA@mail.com'), '1.1.1.1|ana@mail.com');
  assert.notEqual(LoginRateLimiter.key('1.1.1.1', 'ana@mail.com'), LoginRateLimiter.key('2.2.2.2', 'ana@mail.com'));
});

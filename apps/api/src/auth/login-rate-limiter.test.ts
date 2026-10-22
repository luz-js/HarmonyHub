import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyFailure, AttemptState, DEFAULT_LOGIN_LIMITS, LoginRateLimiter, remainingBlockMs, TooManyLoginAttemptsError } from './login-rate-limiter';

const options = { maxAttempts: 3, windowMs: 60_000, blockMs: 120_000 };
const at = (ms: number) => new Date(ms);

/** Aplica `n` fallos seguidos en los instantes indicados. */
function failures(times: number[], start: AttemptState | null = null) {
  return times.reduce<AttemptState | null>((state, ms) => applyFailure(state, at(ms), options), start);
}

test('los valores de siempre: 5 fallos en 15 min bloquean 15 min', () => {
  assert.deepEqual(DEFAULT_LOGIN_LIMITS, { maxAttempts: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
});

test('bloquea al llegar al maximo de fallos dentro de la ventana', () => {
  const two = failures([0, 1_000]);
  assert.equal(remainingBlockMs(two, at(1_000)), 0);
  const three = applyFailure(two, at(2_000), options);
  assert.equal(three.count, 3);
  assert.equal(remainingBlockMs(three, at(2_000)), 120_000);
});

test('libera la clave al terminar el bloqueo y el siguiente fallo empieza de cero', () => {
  const blocked = failures([0, 1_000, 2_000]);
  assert.ok(remainingBlockMs(blocked, at(121_000)) > 0);
  assert.equal(remainingBlockMs(blocked, at(122_000)), 0);
  const after = applyFailure(blocked, at(130_000), options);
  assert.deepEqual(after, { count: 1, windowStart: at(130_000), blockedUntil: null });
});

test('si la ventana ya paso, los fallos viejos no cuentan', () => {
  const old = failures([0, 1_000]);
  const fresh = applyFailure(old, at(61_001), options);
  assert.deepEqual(fresh, { count: 1, windowStart: at(61_001), blockedUntil: null });
  // Justo en el borde de la ventana todavia cuenta (igual que antes: "mas de" windowMs).
  assert.equal(applyFailure(old, at(60_000), options).count, 3);
});

test('una fila recien creada (count 0) cuenta como primer fallo', () => {
  assert.equal(applyFailure({ count: 0, windowStart: at(5_000), blockedUntil: null }, at(5_000), options).count, 1);
});

test('la clave es un hash de ip + correo normalizado (no guarda el correo en claro)', () => {
  const key = LoginRateLimiter.key('1.1.1.1', ' Ana@Mail.com ');
  assert.equal(key, LoginRateLimiter.key('1.1.1.1', 'ana@mail.com'));
  assert.notEqual(key, LoginRateLimiter.key('2.2.2.2', 'ana@mail.com'));
  assert.equal(LoginRateLimiter.key(undefined, 'ana@mail.com'), LoginRateLimiter.key('unknown', 'ana@mail.com'));
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.ok(!key.includes('ana'));
});

test('el mensaje del error es el mismo de siempre (en minutos, minimo 1)', () => {
  assert.match(new TooManyLoginAttemptsError(30).message, /Intenta de nuevo en 1 min\./);
  assert.match(new TooManyLoginAttemptsError(15 * 60).message, /Intenta de nuevo en 15 min\./);
});

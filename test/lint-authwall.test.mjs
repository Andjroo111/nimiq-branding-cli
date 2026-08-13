// `nq lint` must refuse to grade an auth wall.
//
// A Cloudflare Access gate answers HTTP 200 with a fully rendered sign-in page served from
// gdkc.cloudflareaccess.com. Nothing in the response says "this is not the site", so the linter
// happily measured Cloudflare's login form and attributed it to the origin. That produced a
// confident, wrong diagnosis — nimiq.tech and nimiq.school were both reported as shipping the
// wrong typeface, when both load Mulish from Google Fonts and the -apple-system reading came
// entirely from the login page.
//
// Same lesson as `nq lint <file>` vs `nq lint <url>`: if the page is not reachable, the report is
// not evidence of anything. The predicate is pure so this needs no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { authWall } = await import(join(ROOT, 'scripts', 'lint.mjs'));

// the real redirect, captured from `curl -sL -o /dev/null -w %{url_effective} https://nimiq.tech`
const CF_ACCESS = 'https://gdkc.cloudflareaccess.com/cdn-cgi/access/login/nimiq.tech'
  + '?kid=07be759c&meta=eyJ0eXAiOiJKV1QifQ&redirect_url=%2F';

test('a Cloudflare Access redirect is reported as an auth wall', () => {
  assert.equal(authWall('https://nimiq.tech', CF_ACCESS), 'gdkc.cloudflareaccess.com');
  assert.equal(authWall('https://nimiq.school', CF_ACCESS), 'gdkc.cloudflareaccess.com');
});

test('Access serving its login on the requested host is still an auth wall', () => {
  // Access can answer on the origin itself rather than redirecting to the team domain.
  assert.equal(
    authWall('https://nimiq.tech', 'https://nimiq.tech/cdn-cgi/access/login/nimiq.tech?redirect_url=%2F'),
    'nimiq.tech',
  );
});

test('other identity providers are covered too', () => {
  assert.equal(authWall('https://app.example.com', 'https://example.okta.com/login'), 'example.okta.com');
  assert.equal(authWall('https://app.example.com', 'https://example.auth0.com/u/login'), 'example.auth0.com');
});

test('an ordinary page is never mistaken for an auth wall', () => {
  assert.equal(authWall('https://www.nimiq.com', 'https://www.nimiq.com/'), null);
  assert.equal(authWall('https://nimiq.blog', 'https://nimiq.blog/'), null);
  // a plain apex -> www redirect changes hostname and must NOT trip the check
  assert.equal(authWall('https://nimiq.com', 'https://www.nimiq.com/'), null);
  // a login PAGE on the site's own domain is the site's own page, not a gateway standing in for it
  assert.equal(authWall('https://example.com', 'https://example.com/login'), null);
});

test('a file:// target is left alone', () => {
  assert.equal(authWall('file:///tmp/page.html', 'file:///tmp/page.html'), null);
  assert.equal(authWall('not a url', 'also not a url'), null);
});

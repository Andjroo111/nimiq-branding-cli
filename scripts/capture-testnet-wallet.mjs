// Capture authentic LOGGED-IN Nimiq wallet reference screens from the TESTNET wallet.
//
// Why: the skill's pixel-verified registry covers component building blocks, but the
// composed logged-in screens (home, address overview, Receive, Send) can't be captured
// headlessly without an account. This script creates (once) a throwaway TESTNET account
// in a persistent browser profile, funds it from the public testnet faucet (no real
// value), then screenshots the key screens into references/screenshots/wallet-app/logged-in/.
//
// Run:  node scripts/capture-testnet-wallet.mjs
// Reuses the account on subsequent runs (persistent profile). Mobile 390×844 @2x.
//
// Proven 2026-06-27. Selectors track the live wallet/hub/keyguard; if the onboarding UI
// changes, re-derive them (the flow: wallet → hub/onboard "Create Account" → keyguard
// create → set-password → repeat → download Login File → back to wallet).

import { createRequire } from 'module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}references/screenshots/wallet-app/logged-in`;
const PROFILE = `${process.env.HOME}/.nimiq-wallet-capture/profile`;
const PW = process.env.NIMIQ_TESTNET_PW || 'BitmeshTestnet1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE, {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = ctx.pages()[0] || await ctx.newPage();
page.on('download', async d => { try { await d.saveAs(`${OUT}/_login-file.png`); } catch {} });

const shot = async n => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('  📸', n); };
const tap = async (re, t = 4000) => {
  for (const loc of [page.getByRole('button', { name: new RegExp(re, 'i') }), page.getByText(new RegExp(re, 'i'))]) {
    try { await loc.first().click({ timeout: t }); return true; } catch {}
  }
  return false;
};
const typePw = async () => {
  const inp = page.locator('input[type=password]').first();
  await inp.click({ timeout: 4000 }).catch(() => {}); await inp.fill('').catch(() => {});
  await page.keyboard.type(PW, { delay: 35 });
};
const home = async () => { await page.goto('https://wallet.nimiq-testnet.com/', { waitUntil: 'domcontentloaded' }).catch(() => {}); await sleep(4000); await page.keyboard.press('Escape').catch(() => {}); await sleep(700); };

// --- onboard if needed ---
await page.goto('https://wallet.nimiq-testnet.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(7000);
const needsOnboard = await page.evaluate(() => /onboard/i.test(location.href) || /Welcome to the Nimiq|Create a new account/i.test(document.body.innerText));
if (needsOnboard) {
  console.log('onboarding a new testnet account…');
  await tap('Create Account'); await sleep(5000);
  await tap('Set password'); await sleep(2500);
  await page.waitForSelector('input[type=password]', { timeout: 8000 }).catch(() => {});
  await typePw(); await sleep(1000);
  await tap('Repeat password'); await sleep(2500);
  await page.waitForFunction(() => /Repeat your password/i.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
  await typePw(); await sleep(800); await page.keyboard.press('Enter').catch(() => {}); await sleep(4500);
  // download Login File (an <a download href="blob:">) then the hidden arrow continue
  const dl = page.waitForEvent('download', { timeout: 12000 }).catch(() => null);
  await page.getByText(/^download$/i).first().click({ timeout: 5000 }).catch(() => {});
  await dl; await sleep(2500);
  await page.locator('button.nq-button.continue, button.continue').first().click({ timeout: 4000 }).catch(() => {});
  await sleep(6000);
  console.log('onboarded:', page.url());
  // fund from the public testnet faucet
  const addr = await page.evaluate(() => { const m = (document.body.innerText || '').match(/NQ[0-9A-Z ]{40,52}/); return m ? m[0].replace(/\s+/g, ' ').trim() : ''; });
  if (addr) {
    try {
      const r = await fetch('https://faucet.pos.nimiq-testnet.com/tapit', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'address=' + encodeURIComponent(addr) });
      console.log('faucet:', (await r.text()).slice(0, 120));
    } catch (e) { console.log('faucet error:', e.message); }
    await sleep(15000); // let it confirm + the wallet sync
  }
}

// --- capture the screens ---
const drill = async () => { await sleep(3000); for (const l of [page.getByText('110 000 NIM').last(), page.getByText('Purple Address').last(), page.getByText(/Address$/i).last()]) { try { await l.click({ timeout: 3000 }); return true; } catch {} } return false; };

await home(); await shot('home-overview-mobile');
await home(); if (await tap('Purple Address') || await tap(/Address$/i)) { await sleep(3500); await shot('nim-address-overview-mobile'); }
await home(); if (await tap('Receive')) { await shot('receive-choose-recipient-mobile'); if (await drill()) { await sleep(3000); await shot('receive-nim-address-mobile'); } }
await home(); if (await tap('Send')) { await shot('send-choose-sender-mobile'); if (await drill()) { await sleep(3000); await shot('send-transaction-enter-address-mobile'); } }

console.log('done →', OUT);
await ctx.close();

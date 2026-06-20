// Shared browser bootstrap for `nq lint` and `nq verify`.
// Playwright is intentionally NOT a runtime dependency (it pulls a ~hundreds-of-MB browser),
// so we load it lazily and, if it's missing, print a one-line fix instead of a raw stack
// trace. Exit code 2 = "setup needed", distinct from lint's 1 = violations / 0 = clean.
export async function launchChromium(cmd = 'this command') {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(
      `\nnq: ${cmd} needs Playwright (a headless browser) to render pages.\n` +
      `It isn't bundled, to keep installs light. One-time setup:\n\n` +
      `  npm i -g playwright && npx playwright install chromium\n\n` +
      `Then re-run. Only \`nq lint\` and \`nq verify\` need it — the rest of nq works without it.\n`,
    );
    process.exit(2);
  }
  try {
    return await chromium.launch();
  } catch (e) {
    if (/Executable doesn't exist|playwright install|please run the following/i.test(String(e))) {
      console.error(`\nnq: Playwright is installed but its browser isn't. Run:\n\n  npx playwright install chromium\n`);
      process.exit(2);
    }
    throw e;
  }
}

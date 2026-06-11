#!/usr/bin/env node
import { main } from '../src/cli.js';

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});

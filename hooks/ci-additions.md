# CI additions for nq align / new / hooks

The OAuth token used to open this PR lacks the `workflow` scope, so `.github/workflows`
could not be modified from this branch. A maintainer with `workflow` scope should apply
the two changes below (they are otherwise ready and locally verified).

## 1. `.github/workflows/verify.yml` — extend `cli-smoke` + add a `unit-tests` job

Append to the end of the `cli-smoke` job's run step:

```yaml
      - name: nq new / align / hooks smoke
        run: |
          cd /tmp
          node "$GITHUB_WORKSPACE/bin/nq.js" new smoke-app
          test -f smoke-app/nimiq-stack.json
          test -f smoke-app/src/server.ts
          test -f smoke-app/Dockerfile
          # a freshly-scaffolded canonical app must align CLEAN (exit 0)
          node "$GITHUB_WORKSPACE/bin/nq.js" align smoke-app
          # the settlement gate must FAIL on a real light-client path (exit 1)
          printf "const c = Client.create(cfg);\n" > smoke-app/src/bad.ts
          if node "$GITHUB_WORKSPACE/bin/nq.js" align smoke-app --fail-on=settlement; then
            echo "ERROR: light-client path did not fail the settlement gate"; exit 1
          fi
          echo "align gate OK"
          rm smoke-app/src/bad.ts
          git -C smoke-app init -q
          node "$GITHUB_WORKSPACE/bin/nq.js" hooks install smoke-app
          test -x smoke-app/.git/hooks/pre-commit
          echo "new/align/hooks smoke OK"
```

Add a new job:

```yaml
  unit-tests:
    name: node --test (align / new / hooks)
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
```

## 2. `.github/workflows/stack-align.yml` — the weekly fleet-alignment Action

Copy `hooks/stack-align.yml` (committed in this PR) to `.github/workflows/stack-align.yml`.
It mirrors `audit.yml`: `nq align --all` weekly, PR safe manifest fixes (`nq align --fix`)
on safe-drift, and a rolling `stack-drift` issue on risky-fail.

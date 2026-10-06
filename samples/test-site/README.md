# Oathmark test site (hostable promise page + manifest)

A ready-to-deploy static site that gives you a **real HTTPS URL** for the manual workflows: one promise page (the
frozen source) and the well-known authority manifest location. Deploy the contents of this folder to any host where
you control the domain root, then use that domain as the pledge's canonical domain.

## Contents

| File | Serves as | Purpose |
| ---- | --------- | ------- |
| `index.html` | `https://<your-domain>/` | The official source page; contains the sample clause verbatim plus edit recipes for the NARROWED / REMOVED / SOURCE_UNAVAILABLE checkpoint cases |
| `.well-known/oathmark.json` | `https://<your-domain>/.well-known/oathmark.json` | Authority manifest (template — replace with the file the app generates) |
| `vercel.json` | — | No-cache headers so edited sources are seen by the very next checkpoint |

## Option 1 — Vercel (fastest)

```bash
cd samples/test-site
npx vercel --prod --yes
```

Take the assigned domain (e.g. `oathmark-test-abc123.vercel.app`):

1. Register the pledge in the app with:
   - Canonical domain: `oathmark-test-abc123.vercel.app`
   - Source URL: `https://oathmark-test-abc123.vercel.app/`
   - Clause: `The service maintains at least 99 percent monthly uptime.`
2. In the app, download the generated manifest (compose sidebar or record page).
3. Overwrite `.well-known/oathmark.json` with that exact file, then redeploy (`npx vercel --prod --yes`).
4. Back in the app, run **Verify baseline & activate**.

## Option 2 — GitHub Pages (user site)

GitHub Pages serves the well-known path only at your **user-site root**, so use your `username.github.io` repository
(not a project page):

```bash
# inside your username.github.io repository
mkdir -p .well-known
cp samples/test-site/index.html oathmark-source.html
cp samples/test-site/.well-known/oathmark.json .well-known/oathmark.json
touch .nojekyll
git add -A && git commit -m "Oathmark test fixture" && git push
```

- Source URL: `https://<username>.github.io/oathmark-source.html`
- Manifest: `https://<username>.github.io/.well-known/oathmark.json`
- Canonical domain: `<username>.github.io`

## Option 3 — Netlify / Cloudflare Pages

Drag-and-drop this folder into a new site; both serve dotfile directories at the domain root. Use the assigned domain
exactly as in Option 1.

## After the baseline is active

Follow [docs/MANUAL_TEST_CASES.md](../../docs/MANUAL_TEST_CASES.md). For the checkpoint cases (E3–E5), edit
`index.html` using the recipes in its HTML comments, redeploy, and run the next checkpoint — the no-cache headers make
the change visible immediately.

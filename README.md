# AI Hub

A clean, single-page chat interface for OpenAI, Google Gemini, and Anthropic Claude. Static HTML/CSS/JS — built to run on GitHub Pages with no build step, no backend, and no database.

## Add your API keys

Open `app.js` and find this block near the top:

```js
const API_KEYS = {
  openai:    "PUT_OPENAI_KEY_HERE",
  gemini:    "PUT_GEMINI_KEY_HERE",
  anthropic: "PUT_ANTHROPIC_KEY_HERE",
};
```

Replace each placeholder with your own key. You only need to fill in the providers you want to offer — visitors never see or enter keys themselves.

**Important:** this is a static site, so anything in `app.js` — including these keys — is visible to anyone who opens the site or views its source. Only use keys you're comfortable exposing: burner accounts, low/no-spend-cap keys, or keys scoped with usage limits on the provider's dashboard. Don't put a production key with a real budget here.

## Deploy to GitHub Pages

1. Create a new GitHub repository (public or private, Pages works with either on a paid plan; public repos get Pages free).
2. Upload `index.html`, `style.css`, `app.js`, and `README.md` to the repository (drag-and-drop on github.com works, or `git push`).
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to "Deploy from a branch," pick your default branch and the `/ (root)` folder, then save.
5. Wait a minute for the deploy, then open the URL GitHub gives you (something like `https://yourusername.github.io/your-repo-name/`).

That's it — no npm, no build command, no server.

## Adding or removing models

Everything about providers and models lives in one place in `app.js`:

```js
const PROVIDERS = {
  anthropic: {
    name: "Anthropic",
    color: "var(--anthropic)",
    models: [
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      ...
    ],
  },
  ...
};
```

Add a new `{ id, label }` entry to add a model, or remove one to retire it. `id` must match the exact model name the provider's API expects.

## What's stored, and where

Conversations and settings are saved in the browser's `localStorage`, per-device, per-browser. There is no server-side database — clearing browser data or using a different browser/device starts fresh. Nothing is sent anywhere except directly to the AI provider whose model is selected.

## Notes

- If a provider's API doesn't allow direct browser calls with your account type (some organizations restrict this), that provider's requests may fail with a CORS or permissions error — this shows up as a clean in-chat error message with a retry button rather than crashing the page.
- To rotate a key, just edit `app.js` and re-upload/push — no redeploy pipeline needed beyond GitHub Pages picking up the change.

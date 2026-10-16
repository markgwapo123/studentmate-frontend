# StudentMate frontend

Upload these files directly to the root of a GitHub repository. Import that repository into Vercel. Framework: Other; Root Directory: repository root; no build or install command; Output Directory: .

Backend: https://studentmate-backend-6y11.onrender.com

After deployment, add the exact Vercel production origin (https://your-project.vercel.app, without a trailing slash) to ALLOWED_ORIGINS in Render. Preserve existing origins using comma separation. Save and redeploy the Render service. Then verify register, login, cloud saves, and sign-out.

The frontend password minimum is 8 characters. The Render backend also needs the supplied 8-character password patch deployed. This frontend archive does not change the backend.

## API startup and scheduled checks

`api-client.js` centralizes the public API base URL, defaulting to https://studentmate-backend-6y11.onrender.com. To override it, define `window.STUDENTMATE_API_BASE_URL` in a script before loading api-client.js (both index.html and app.html). A Vercel environment variable alone cannot configure plain browser JavaScript.

Both pages warm up `/health` silently on load. Requests have a 60-second timeout covering fetch and response body. The first actual API operation shows a polite notice after three seconds and clears it on success or failure. Its initial GET can retry once on a transport timeout/network failure or HTTP 502/503/504. Initial login/registration waits for the health probe (with one retry) and submits the write once, avoiding duplicate account/session creation. HTTP 400/401/403/409 responses and later operations are not automatically replayed.

Run `node --test test/api-client.test.cjs`. Regenerate the service worker with `node prepare-pwa.mjs` after any further edit; the generated sw.js is included in this update. Serve the repository with `python3 -m http.server 8080` and open `/app.html`. For a local API, set the override before api-client.js on both pages and add `http://localhost:8080` to the local backend ALLOWED_ORIGINS. Test slow/offline mode in browser developer tools: a first operation delayed more than three seconds shows the notice; failures hide it and show the existing error message. Verify login, registration, cloud saving, sign-out, and schedule imports.

Upload `.github/workflows/keep-alive.yml` to this frontend repository, on its default branch. In GitHub Settings → Secrets and variables → Actions → Variables, add `RENDER_EXTERNAL_URL` = `https://studentmate-backend-6y11.onrender.com` (base URL, no /health). A secret with the same name also works; the variable takes precedence. Run Actions → Keep StudentMate API awake → Run workflow and confirm curl returns healthy JSON. Scheduled runs are every five minutes in UTC but GitHub can delay or disable inactive schedules. This reduces cold starts; it does not guarantee uptime or bypass Render usage limits.

The existing Android wrapper was checked: MainActivity loads the Vercel URL, onProgressChanged drives its ProgressBar, and main-frame onReceivedError opens a Retry dialog. The manifest includes INTERNET permission. No Android code or APK was changed. Device check: open online, observe the loading bar, then relaunch offline and use Retry after restoring internet. APK compilation/device execution were not available in this environment.

## In-app Android APK update system (Option A)

The Android wrapper now contains a user-approved APK update checker, a manual **Settings → Check for APK updates** button, release metadata under `downloads/apk-release.json`, and a signed-release GitHub Actions pipeline. **Read [APK-UPDATER-SETUP.md](APK-UPDATER-SETUP.md) before publishing an update** to configure stable signing and safely handle migration from older debug-signed APKs. A normal green testing workflow alone does **not** publish an in-app update.

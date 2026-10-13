StudentMate installable PWA

1. Extract and upload ALL files and the icons folder to the ROOT of studentmate-frontend on GitHub. Replace matching existing files. Do not upload the ZIP or nest everything in a new folder.
2. Commit. Vercel must run the build command: node prepare-pwa.mjs. Output directory: . Framework: Other. The included vercel.json sets this. Confirm the build log includes Prepared StudentMate release.
3. Wait for Ready, then open the production link in Chrome on Android. Settings > Install StudentMate (or browser menu > Install app / Add to home screen). iPhone: Safari > Share > Add to Home Screen. In-app browsers may require Open in browser first.

Updates: each Vercel build hashes the app files and generates a new service worker release. Installed apps check when opened/resumed online and every minute while visible. Users get Update now when a release is ready. No reinstall needed. Changes cannot reach offline devices until they reconnect. Browser installation still requires a user tap.

The shell is cached; sign-in and cloud operations still need the Render backend and internet. API responses and credentials are never cached by this service worker. Update now asks users to finish forms/pause focus sessions and sync pending changes before reloading. Existing login UI is preserved.

Includes the latest complete frontend redesign. No Render/backend changes needed. Real Android/iPhone install and update verification should be performed after deployment.

package com.studentmate.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** Optional user-approved APK updater for the official self-distributed StudentMate APK. */
final class ApkUpdater {
    private static final String FEED_URL =
            "https://studentmate-frontend.vercel.app/downloads/apk-release.json";
    private static final String RELEASE_ROOT =
            "https://github.com/markgwapo123/studentmate-frontend/releases/download/";
    private static final String PREFS = "studentmate_apk_updater";
    private static final String CHECK_TIME = "last_automatic_check";
    private static final long CHECK_INTERVAL_MS = 24L * 60 * 60 * 1000;
    private static final long MAX_APK_BYTES = 150L * 1024 * 1024;

    private final Activity activity;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private final AtomicBoolean cancelDownload = new AtomicBoolean(false);
    private boolean destroyed = false;
    private boolean promptVisible = false;

    ApkUpdater(Activity activity) { this.activity = activity; }

    String getInstalledVersion() {
        try {
            return activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0).versionName;
        } catch (Exception ignored) { return "unknown"; }
    }

    void checkAutomatically() {
        if (destroyed) return;
        long last = activity.getSharedPreferences(PREFS, 0).getLong(CHECK_TIME, 0);
        if (System.currentTimeMillis() - last < CHECK_INTERVAL_MS) return;
        check(false);
    }

    void checkManually() { check(true); }

    private void check(boolean manual) {
        if (destroyed || !busy.compareAndSet(false, true)) return;
        if (!manual) {
            activity.getSharedPreferences(PREFS, 0).edit()
                    .putLong(CHECK_TIME, System.currentTimeMillis()).apply();
        }
        executor.execute(() -> {
            try {
                Release release = fetchRelease();
                long current = installedCode();
                ui.post(() -> {
                    busy.set(false);
                    if (destroyed) return;
                    if (!release.published) {
                        if (manual) message("No signed release yet",
                                "The developer has not published a signed APK update yet.");
                    } else if (release.versionCode <= current) {
                        if (manual) message("You're up to date",
                                "StudentMate v" + getInstalledVersion() + " is the latest APK version.");
                    } else {
                        offerUpdate(release);
                    }
                });
            } catch (Exception error) {
                ui.post(() -> {
                    busy.set(false);
                    if (!destroyed && manual) message("Update check failed",
                            "Could not check for APK updates. Check your connection and try again.");
                });
            }
        });
    }

    private static class Release {
        final boolean published;
        final String version, url, sha256, notes;
        final int versionCode;
        Release(boolean p, String v, int c, String u, String h, String n) {
            published = p; version = v; versionCode = c; url = u; sha256 = h; notes = n;
        }
    }

    private Release fetchRelease() throws Exception {
        URL url = new URL(FEED_URL + "?t=" + System.currentTimeMillis());
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setInstanceFollowRedirects(false);
        c.setConnectTimeout(12000);
        c.setReadTimeout(12000);
        c.setRequestProperty("Accept", "application/json");
        try {
            if (c.getResponseCode() != 200) throw new Exception("Metadata unavailable");
            if (c.getContentLengthLong() > 32768) throw new Exception("Metadata too large");
            byte[] buffer = new byte[4096];
            java.io.ByteArrayOutputStream data = new java.io.ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) {
                int n;
                while ((n = in.read(buffer)) != -1) {
                    if (data.size() + n > 32768) throw new Exception("Metadata too large");
                    data.write(buffer, 0, n);
                }
            }
            JSONObject json = new JSONObject(data.toString("UTF-8"));
            boolean published = json.optBoolean("published", false);
            if (!published) return new Release(false, "", 0, "", "", "");
            String version = json.getString("version");
            int code = json.getInt("versionCode");
            String apkUrl = json.getString("apkUrl");
            String sha = json.getString("sha256").toLowerCase(java.util.Locale.ROOT);
            String notes = json.optString("notes", "Improvements and bug fixes.");
            if (!version.matches("[0-9]+(\\.[0-9]+){1,3}") || code < 1
                    || !sha.matches("[0-9a-f]{64}")) throw new Exception("Invalid update information");
            // Require exactly this project's versioned asset; never allow arbitrary download URLs.
            if (!apkUrl.equals(RELEASE_ROOT + "v" + version + "/StudentMate-v" + version + ".apk"))
                throw new Exception("Unexpected APK URL");
            if (notes.length() > 300) notes = notes.substring(0, 300);
            return new Release(true, version, code, apkUrl, sha, notes);
        } finally { c.disconnect(); }
    }

    private long installedCode() throws Exception {
        PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
        return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
    }

    private void offerUpdate(Release release) {
        if (promptVisible) return;
        promptVisible = true;
        new AlertDialog.Builder(activity)
                .setTitle("StudentMate v" + release.version + " available")
                .setMessage("A new Android APK update is available.\n\n" + release.notes
                        + "\n\nYou can continue using StudentMate and update later.")
                .setNegativeButton("Later", (d, which) -> {})
                .setPositiveButton("Update Now", (d, which) -> beginDownload(release))
                .setOnDismissListener(d -> promptVisible = false)
                .show();
    }

    private void beginDownload(Release release) {
        if (Build.VERSION.SDK_INT >= 26
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(activity)
                    .setTitle("Allow APK updates")
                    .setMessage("To update StudentMate without uninstalling, allow this app to install "
                            + "updates in Android settings. After allowing it, tap Check for APK updates again.")
                    .setNegativeButton("Later", null)
                    .setPositiveButton("Open Settings", (d, which) -> {
                        try {
                            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:" + activity.getPackageName()));
                            activity.startActivity(intent);
                        } catch (ActivityNotFoundException ignored) {
                            message("Settings unavailable", "Open Android Settings to allow app updates.");
                        }
                    }).show();
            return;
        }
        if (!busy.compareAndSet(false, true)) return;
        cancelDownload.set(false);
        LinearLayout wrapper = new LinearLayout(activity);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        wrapper.setPadding(48, 24, 48, 16);
        TextView label = new TextView(activity);
        label.setText("Preparing secure APK download…");
        ProgressBar bar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        bar.setIndeterminate(true);
        bar.setMax(100);
        wrapper.addView(label);
        wrapper.addView(bar);
        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setTitle("Downloading StudentMate v" + release.version)
                .setView(wrapper)
                .setNegativeButton("Cancel", (d, w) -> cancelDownload.set(true))
                .setCancelable(false).create();
        dialog.show();
        executor.execute(() -> {
            File target = null;
            try {
                File folder = new File(activity.getCacheDir(), "apk_updates");
                if (!folder.exists() && !folder.mkdirs()) throw new Exception("Cannot create download folder");
                target = new File(folder, "StudentMate-v" + release.version + ".apk");
                downloadAndVerify(release, target, (received, total) -> ui.post(() -> {
                    if (destroyed || !dialog.isShowing()) return;
                    if (total > 0) {
                        bar.setIndeterminate(false);
                        bar.setProgress((int) Math.min(100, 100 * received / total));
                        label.setText("Downloading… " + (100 * received / total) + "%");
                    } else label.setText("Downloading… " + (received / 1024) + " KB");
                }));
                if (cancelDownload.get()) throw new Exception("cancelled");
                if (!verifyPackage(target, release.versionCode))
                    throw new Exception("APK package, version, or signing certificate mismatch");
                File downloaded = target;
                ui.post(() -> {
                    busy.set(false);
                    dialog.dismiss();
                    if (!destroyed && !cancelDownload.get()) install(downloaded);
                });
            } catch (Exception error) {
                if (target != null) target.delete();
                String detail = error.getMessage();
                ui.post(() -> {
                    busy.set(false);
                    dialog.dismiss();
                    if (!destroyed && !cancelDownload.get()) {
                        message("APK update could not be installed",
                                "The update was not applied. " +
                                (detail != null && detail.contains("signing certificate")
                                ? "The installed APK and new release are signed differently. Back up and "
                                + "sync your data before planning a one-time migration. Do not uninstall yet."
                                : "Please try again when you have a stable connection."));
                    }
                });
            }
        });
    }

    private interface Progress { void onBytes(long got, long total); }

    private void downloadAndVerify(Release release, File output, Progress progress) throws Exception {
        URL url = new URL(release.url);
        HttpURLConnection connection = null;
        try {
            for (int redirects = 0; redirects <= 5; redirects++) {
                if (!"https".equalsIgnoreCase(url.getProtocol())) throw new Exception("Non-HTTPS download");
                String host = url.getHost().toLowerCase(java.util.Locale.ROOT);
                boolean permitted = (host.equals("github.com")
                        && url.toString().startsWith(RELEASE_ROOT))
                        || host.equals("release-assets.githubusercontent.com")
                        || host.equals("objects.githubusercontent.com");
                if (!permitted) throw new Exception("Unexpected download host");
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(20000);
                int status = connection.getResponseCode();
                if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                    String next = connection.getHeaderField("Location");
                    if (next == null) throw new Exception("Missing redirect location");
                    URL redirected = new URL(url, next);
                    connection.disconnect();
                    connection = null;
                    url = redirected;
                    continue;
                }
                if (status != 200) throw new Exception("Download failed: HTTP " + status);
                long total = connection.getContentLengthLong();
                if (total > MAX_APK_BYTES) throw new Exception("APK too large");
                MessageDigest hash = MessageDigest.getInstance("SHA-256");
                long received = 0;
                byte[] buf = new byte[32 * 1024];
                try (InputStream in = new BufferedInputStream(connection.getInputStream());
                     BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(output))) {
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        if (cancelDownload.get()) throw new Exception("cancelled");
                        received += n;
                        if (received > MAX_APK_BYTES) throw new Exception("APK exceeds size limit");
                        out.write(buf, 0, n);
                        hash.update(buf, 0, n);
                        progress.onBytes(received, total);
                    }
                }
                if (received < 1024 || (total >= 0 && received != total))
                    throw new Exception("Incomplete download");
                byte[] digest = hash.digest();
                StringBuilder hex = new StringBuilder();
                for (byte b : digest) hex.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
                if (!release.sha256.equals(hex.toString())) throw new Exception("APK checksum mismatch");
                return;
            }
            throw new Exception("Too many download redirects");
        } finally { if (connection != null) connection.disconnect(); }
    }

    @SuppressWarnings("deprecation")
    private boolean verifyPackage(File file, long minVersionCode) throws Exception {
        PackageManager pm = activity.getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28
                ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo archive = pm.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        PackageInfo installed = pm.getPackageInfo(activity.getPackageName(), flags);
        if (archive == null || !activity.getPackageName().equals(archive.packageName)) return false;
        long updateCode = Build.VERSION.SDK_INT >= 28
                ? archive.getLongVersionCode() : archive.versionCode;
        long currentCode = Build.VERSION.SDK_INT >= 28
                ? installed.getLongVersionCode() : installed.versionCode;
        if (updateCode != minVersionCode || updateCode <= currentCode) return false;
        Signature[] newSigns = Build.VERSION.SDK_INT >= 28 && archive.signingInfo != null
                ? archive.signingInfo.getApkContentsSigners() : archive.signatures;
        Signature[] oldSigns = Build.VERSION.SDK_INT >= 28 && installed.signingInfo != null
                ? installed.signingInfo.getApkContentsSigners() : installed.signatures;
        if (newSigns == null || oldSigns == null || newSigns.length == 0) return false;
        // Compatible keys are required; the Android OS will verify the signature again.
        return Arrays.equals(newSigns, oldSigns);
    }

    private void install(File file) {
        try {
            Uri uri = FileProvider.getUriForFile(activity,
                    activity.getPackageName() + ".apkfiles", file);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent); // Android asks the user to confirm installation.
        } catch (Exception ignored) {
            message("Could not open installer",
                    "Android couldn't open the update installer. No changes were made.");
        }
    }

    private void message(String title, String msg) {
        if (!destroyed && !activity.isFinishing())
            new AlertDialog.Builder(activity).setTitle(title).setMessage(msg)
                    .setPositiveButton("OK", null).show();
    }

    void destroy() {
        destroyed = true;
        cancelDownload.set(true);
        executor.shutdownNow();
    }
}

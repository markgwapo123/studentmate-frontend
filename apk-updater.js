// APK updates belong to the Android wrapper, not to the PWA/web refresher.
(() => {
  const native = window.StudentMateNative;
  if (!/StudentMateAndroid\//.test(navigator.userAgent) ||
      !native || typeof native.getApkVersion !== 'function' ||
      typeof native.checkForApkUpdate !== 'function') return;

  function renderSettingsButton() {
    const container = document.getElementById('content');
    if (!container || container.dataset.page !== 'settings' || document.getElementById('apk-settings')) return;
    const section = document.createElement('section');
    section.className = 'card apk-settings-card';
    section.id = 'apk-settings';
    const version = document.createElement('p');
    version.className = 'subtitle';
    try { version.textContent = 'Installed APK version: ' + native.getApkVersion(); }
    catch { version.textContent = 'Installed Android app'; }
    const heading = document.createElement('h2');
    heading.textContent = 'Android app updates';
    const description = document.createElement('p');
    description.textContent = 'Check for a new Android version. New APK installs require your approval.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary apk-check-button';
    button.textContent = 'Check for APK updates';
    button.addEventListener('click', () => {
      try { native.checkForApkUpdate(); }
      catch { if (typeof toast === 'function') toast('Could not check for APK updates.'); }
    });
    section.append(heading, version, description, button);
    container.append(section);
  }
  const root = document.getElementById('content');
  if (root) {
    new MutationObserver(renderSettingsButton).observe(root, {childList: true, subtree: false});
    renderSettingsButton();
  }
})();

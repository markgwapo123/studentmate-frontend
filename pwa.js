(() => {
  let installPrompt=null,registration=null,refreshing=false,needsReload=false;
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const notice=document.createElement('section');
  notice.id='pwa-update';notice.hidden=true;notice.setAttribute('aria-live','polite');
  notice.innerHTML='<div><strong>A new StudentMate update is ready</strong><p>Refresh to use the latest version.</p></div><button type="button" id="pwa-refresh">Update now</button><button type="button" id="pwa-dismiss" aria-label="Dismiss update notice">×</button>';
  document.body.append(notice);
  const dialog=document.createElement('dialog');dialog.id='pwa-install-help';dialog.setAttribute('aria-label','Install StudentMate');
  dialog.innerHTML='<h2>StudentMate on your phone</h2><p id="pwa-install-message"></p><button type="button" id="pwa-install-close">Got it</button>';
  document.body.append(dialog);
  document.getElementById('pwa-install-close').onclick=()=>dialog.close();
  document.getElementById('pwa-dismiss').onclick=()=>{notice.hidden=true};
  function installLabel(){return installed()?'Installed on this device':installPrompt?'Install StudentMate':'How to install StudentMate'}
  function renderInstall(){
    if(!document.querySelector('#content[data-page="settings"]'))return;
    let section=document.getElementById('pwa-settings');
    if(!section){section=document.createElement('section');section.id='pwa-settings';section.className='card';section.innerHTML='<div><h2>StudentMate app</h2><p>Open your study space from your home screen.</p></div><button type="button" id="pwa-install-button"></button>';document.getElementById('content').append(section);document.getElementById('pwa-install-button').onclick=install;}
    const button=document.getElementById('pwa-install-button');
    const label=installLabel();if(button.textContent!==label)button.textContent=label;
    button.disabled=installed();
  }
  async function install(){
    if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;renderInstall();return;}
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
    document.getElementById('pwa-install-message').textContent=ios?'Open this link in Safari. Tap Share, choose Add to Home Screen, then tap Add.':'Open this link in Chrome on your phone. Open the browser menu (⋮), then choose Install app or Add to Home screen. If you opened it in Messenger or Facebook, choose Open in browser first.';
    dialog.showModal();
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;renderInstall()});
  window.addEventListener('appinstalled',()=>{installPrompt=null;renderInstall();toast('StudentMate installed')});
  new MutationObserver(renderInstall).observe(document.getElementById('content'),{childList:true,subtree:true});
  renderInstall();
  function showUpdate(){notice.hidden=false;document.getElementById('pwa-refresh').disabled=false;document.getElementById('pwa-refresh').textContent='Update now'}
  async function readyToReload(){
    if(typeof sending!=='undefined'&&sending){toast('Please wait for the current save to finish.');return false;}
    if(typeof interval!=='undefined'&&interval){toast('Pause your focus timer before updating.');return false;}
    const hasForm=[...document.querySelectorAll('dialog[open]')].some(d=>d.id!=='auth'&&d.id!=='pwa-install-help');
    if(hasForm){toast('Save or close your open form before updating.');return false;}
    if(document.getElementById('auth')?.open&&[...document.querySelectorAll('#auth input')].some(i=>i.value)){toast('Finish signing in or clear the form before updating.');return false;}
    if(typeof account!=='undefined'&&account&&typeof dirty!=='undefined'&&dirty){await syncNow();if(dirty){toast('Save your changes to the cloud before updating.');return false;}}
    return true;
  }
  document.getElementById('pwa-refresh').onclick=async()=>{
    const button=document.getElementById('pwa-refresh');button.disabled=true;button.textContent='Preparing…';
    if(!await readyToReload()){button.disabled=false;button.textContent='Update now';return;}
    if(needsReload||!registration?.waiting){location.reload();return;}
    refreshing=true;button.textContent='Updating…';registration.waiting.postMessage({type:'SKIP_WAITING'});
  };
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing){location.reload();return;}needsReload=true;showUpdate()});
  navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
    registration=reg;
    if(reg.waiting&&navigator.serviceWorker.controller)showUpdate();
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate()})});
    const check=()=>{if(navigator.onLine&&document.visibilityState==='visible')reg.update().catch(()=>{})};
    document.addEventListener('visibilitychange',check);window.addEventListener('online',check);setInterval(check,60000);check();
  }).catch(()=>{});
})();

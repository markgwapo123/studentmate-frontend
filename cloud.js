const authIcons={"mail": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/></g>", "lock": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></g>", "arrow-right": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 12h14m-7-7l7 7l-7 7\"/>", "graduation-cap": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M22 10v6M2 10l10-5l10 5l-10 5z\"/><path d=\"M6 12v5c3 3 9 3 12 0v-5\"/></g>", "users": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87m-3-12a4 4 0 0 1 0 7.75\"/></g>", "user": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></g>"};
function authIcon(name){return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${authIcons[name]}</svg>`}
const API_BASE_URL=StudentMateAPI.baseUrl;
const AUTH_KEY='studentmate.auth.v1';
let account=null,revision=0,dirty=false,sending=false,syncTimer=null,syncMessage='This browser only',conflict=false,cloudReady=false,adminData=null,adminError='',adminLoading=false;
const localSave=save,localRender=render;
const copy=x=>JSON.parse(JSON.stringify(x));
const blank=()=>({name:'Master',subjects:[],tasks:[],notes:[],schedule:[],sessions:0,focus:25,break:5});
function guestState(){try{const d=JSON.parse(localStorage.getItem(KEY));return validData(d)?d:blank()}catch{return blank()}}
function draftKey(){return 'studentmate.draft.'+account.user.id}
function keepDraft(){try{sessionStorage.setItem(draftKey(),JSON.stringify({data:state,revision,dirty}));return true}catch{toast('Could not keep a temporary copy. Export a backup.');return false}}
async function request(path,method='GET',body,token=account?.token){return StudentMateAPI.request(path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined})}
document.addEventListener('studentmate:api-wait',event=>{
 let message=document.getElementById('api-startup-message');
 if(!message){message=document.createElement('p');message.id='api-startup-message';message.className='api-startup-message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');}
 message.textContent='Wait a seconds — StudentMate is waking up. Please keep this page open.';
 const form=document.getElementById('auth-form');
 if(form&&document.getElementById('auth')?.open){form.insertBefore(message,document.getElementById('auth-error'));message.classList.remove('is-floating');}
 else{document.body.append(message);message.classList.add('is-floating');}
 message.hidden=!event.detail.visible;
});

function accountUI(){const label=account?syncMessage:'Sign in · Cloud save';$('cloud-status').textContent=label;if(page==='settings'){const badge=account?(cloudReady?'Cloud synced':'Connecting'):'Browser only';$('content').insertAdjacentHTML('afterbegin',`<section class="card account-card"><div class="account-card-heading"><div class="account-heading-copy"><div class="eyebrow">YOUR ACCOUNT</div><h2>${account?esc(account.user.email):'Keep your studies with you'}</h2><p class="subtitle">${account?esc(syncMessage):'Sign in or create an account to save to the cloud and use your workspace on another device. You can also keep using this browser.'}</p></div><span class="account-status ${account?'is-cloud':'is-local'}"><i aria-hidden="true"></i>${badge}</span></div><div class="account-card-actions">${account?`<button class="account-signout" onclick="signOut()">Sign out</button>`:`<button class="primary" onclick="openAuth('login')">Sign in</button><button class="secondary" onclick="openAuth('register')">Create account</button>`}</div></section>`)}}
render=function(){if(account?.user?.role==='admin'){document.body.classList.add('admin-mode');renderAdmin();return}document.body.classList.remove('admin-mode');localRender();accountUI()};
function renderAdmin(){const m=adminData?.metrics;const cards=m?[['Students',m.students,'Registered accounts'],['Assignments',m.assignments,'Tracked across accounts'],['Subjects',m.subjects,'Created by students'],['Notes',m.notes,'Private content stays hidden'],['Active sessions',m.activeSessions,'Currently valid sessions']]:[];$('content').innerHTML=`<section class="admin-page"><div class="admin-top"><div><div class="eyebrow">STUDENTMATE ADMIN</div><h1>Admin dashboard</h1><p>Account activity at a glance. Student notes and assignment details remain private.</p></div><div><button class="secondary" onclick="loadAdminDashboard()">↻ Refresh</button> <button class="secondary" onclick="startTutorial()">Replay tutorial</button> <button class="secondary" onclick="signOut()">Sign out</button></div></div>${adminError?`<div class="admin-error">${esc(adminError)}</div>`:''}<div class="admin-stats">${cards.map(c=>`<article class="admin-stat"><span>${esc(c[0])}</span><strong>${Number(c[1]).toLocaleString()}</strong><small>${esc(c[2])}</small></article>`).join('')}</div><section class="admin-users"><div class="admin-table-head"><div><h2>Student accounts</h2><p>Latest 50 accounts · summary only</p></div><span>${m?m.students:0} total</span></div>${adminLoading?'<p class="admin-message">Loading account summaries…</p>':adminData?.users?.length?`<div class="admin-table-wrap"><table><thead><tr><th>STUDENT</th><th>CREATED</th><th>SUBJECTS</th><th>ASSIGNMENTS</th><th>NOTES</th></tr></thead><tbody>${adminData.users.map(u=>`<tr><td><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></td><td>${u.createdAt?new Date(u.createdAt).toLocaleDateString():'—'}</td><td>${u.subjects}</td><td>${u.assignments}</td><td>${u.notes}</td></tr>`).join('')}</tbody></table></div>`:'<p class="admin-message">No student accounts yet.</p>'}</section><p class="admin-foot">Signed in as ${esc(account?.user?.email||'admin')} · Student records are separated by account.</p></section>`;if(!adminData&&!adminLoading)loadAdminDashboard()}
async function loadAdminDashboard(){if(!account||account.user.role!=='admin'||adminLoading)return;adminLoading=true;adminError='';renderAdmin();try{adminData=await request('/api/admin/dashboard');}catch(e){adminError=e.status===403?'This account does not have admin permission.':e.message}finally{adminLoading=false;renderAdmin()}}
function status(message){syncMessage=message;$('cloud-status').textContent=account?message:'Sign in · Cloud save';if(accountActionBusy&&!['Saving to cloud…','Changes waiting to save','Saved to cloud','Already saved to cloud'].includes(message)&&$('account-action-error'))$('account-action-error').textContent=message;if(page==='settings')render()}
save=function(){if(!account)return localSave();dirty=true;const kept=keepDraft();if(!conflict)status('Changes waiting to save');clearTimeout(syncTimer);syncTimer=setTimeout(syncNow,700);return kept};
async function syncNow(){if(!account||sending||conflict)return false;if(!cloudReady){await resumeAccount();return cloudReady}if(!dirty){status('Already saved to cloud');return true} sending=true;const snapshot=JSON.stringify(state);status('Saving to cloud…');let succeeded=false;try{const result=await request('/api/workspace','PUT',{data:JSON.parse(snapshot),revision});revision=result.revision;dirty=JSON.stringify(state)!==snapshot;keepDraft();status(dirty?'Changes waiting to save':'Saved to cloud');succeeded=true}catch(e){conflict=e.status===409;status(conflict?'Another device changed this workspace. Export your copy, then load the cloud copy.':e.status===401?'Session expired. Export unsaved work, then sign out and sign in.':e.message)}finally{sending=false;if(dirty&&!conflict&&syncMessage==='Changes waiting to save')syncTimer=setTimeout(syncNow,700)}return succeeded}
function switchState(data){selectedTaskIds.clear();clearInterval(interval);interval=null;state=copy(data);seconds=state.focus*60;render()}
async function loadCloud(){openAccountAction('load')}
function importGuest(){openAccountAction('copy')}
let pendingAccountAction='',accountActionBusy=false;
const accountActionInfo={retry:{title:'Retry cloud save?',description:'Send your pending StudentMate changes to your cloud workspace.',button:'Save to cloud',busy:'Saving to cloud…'},load:{title:'Load cloud copy?',description:'Replace the workspace currently open here with the latest cloud copy. Any unsaved changes in this account workspace will be discarded.',button:'Load cloud copy',busy:'Loading cloud copy…'},copy:{title:'Copy browser records?',description:'Replace your account workspace with records saved in this browser. Your browser copy will remain available.',button:'Copy records',busy:'Copying records…'}};
function openAccountAction(action){if(!account||sending||accountActionBusy)return;if(action==='copy'&&!cloudReady){toast('Wait until your cloud workspace finishes connecting.');return}pendingAccountAction=action;const info=accountActionInfo[action],dialog=$('account-action-confirm');dialog.innerHTML=`<section class="signout-panel" aria-labelledby="account-action-title" aria-describedby="account-action-description"><div class="signout-icon" aria-hidden="true">↻</div><div class="eyebrow">STUDENTMATE CLOUD</div><h2 id="account-action-title">${info.title}</h2><p id="account-action-description">${info.description}</p><p id="account-action-error" role="alert"></p><div class="signout-actions"><button class="secondary" id="account-action-cancel" type="button" onclick="closeAccountAction()">Cancel</button><button class="primary" id="account-action-submit" type="button" onclick="completeAccountAction()">${info.button}</button></div></section>`;if(!dialog.open)dialog.showModal()}
function closeAccountAction(){if(accountActionBusy)return;const dialog=$('account-action-confirm');if(dialog.open)dialog.close();pendingAccountAction=''}
async function completeAccountAction(){if(accountActionBusy||!pendingAccountAction||!account)return;const action=pendingAccountAction,info=accountActionInfo[action],button=$('account-action-submit'),cancel=$('account-action-cancel');accountActionBusy=true;button.disabled=true;cancel.disabled=true;button.innerHTML=`<span class="signout-spinner" aria-hidden="true"></span><span>${info.busy}</span>`;let ok=false;try{if(action==='retry'){if(!dirty){status('Already saved to cloud');ok=true}else ok=await syncNow()}else if(action==='load'){clearInterval(interval);interval=null;$('content').inert=true;try{const remote=await request('/api/workspace');if(!validData(remote.data))throw Error('Invalid cloud workspace.');revision=remote.revision;dirty=false;conflict=false;cloudReady=true;switchState(remote.data);keepDraft();status('Saved to cloud');ok=true}catch(e){status(e.message);$('account-action-error').textContent=e.message}finally{$('content').inert=false}}else if(action==='copy'){clearTimeout(syncTimer);switchState(guestState());save();ok=await syncNow();if(!ok)$('account-action-error').textContent=conflict?'Another device changed this workspace. Load the cloud copy or resolve the conflict first.':syncMessage}}catch(e){$('account-action-error').textContent=e.message||'Could not complete this action. Please try again.'}finally{accountActionBusy=false;if(ok){const dialog=$('account-action-confirm');if(dialog.open)dialog.close();pendingAccountAction=''}else{button.disabled=false;cancel.disabled=false;button.textContent=info.button}}}

function openAuth(mode = 'login') {
  const gate = document.body.classList.contains('auth-required');

  if (account && !gate) {
    go('settings');
    return;
  }

  if (!gate) $('auth').innerHTML = '';

  const target = gate ? $('auth-slot') : $('auth');

  target.innerHTML = `
    <form id="auth-form">
      ${mode === 'register' ? `
        <div class="modal-head">
          <h2>Create your account</h2>
          <button type="button" class="close"
            aria-label="Close"
            onclick="$('auth').close()">×</button>
        </div>
      ` : ''}

      ${mode === 'register' ? `
        <label for="auth-name">Your name</label>
        <div class="auth-field">
          <span class="auth-field-icon">${authIcon('user')}</span>
          <input id="auth-name" name="name"
            placeholder="Enter your name"
            autocomplete="name" required maxlength="40">
        </div>
      ` : ''}

      <label for="auth-email">Email</label>
      <div class="auth-field">
        <span class="auth-field-icon">${authIcon('mail')}</span>
        <input id="auth-email" name="email" type="email"
          placeholder="Enter your email address"
          autocomplete="username" required maxlength="254">
      </div>

      <label for="auth-password">Password</label>
      <input id="auth-password" name="password"
        placeholder="Enter your password"
        type="password"
        autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}"
        minlength="8" maxlength="128" required
        ${mode === 'register' ? 'aria-describedby="register-password-rules"' : ''}>

      <p class="meta" id="register-password-rules">
        ${mode === 'register'
          ? 'Use 8–128 characters with an uppercase letter (A–Z), a number (0–9), and a special character (e.g. ! @ #).'
          : 'Use at least 8 characters. Keep your password somewhere safe; password recovery is not available yet.'}
      </p>

      <p id="auth-error" role="alert"></p>

      <div class="modal-actions">
        <button class="secondary" type="button"
          onclick="openAuth('${mode === 'register' ? 'login' : 'register'}')">
          ${mode === 'register' ? 'Sign in instead' : 'Create account'}
        </button>

        <button class="primary" id="auth-submit">
          ${mode === 'register' ? 'Create account' : 'Sign in'}
          ${authIcon('arrow-right')}
        </button>
      </div>
    </form>
  `;

  $('auth-form').onsubmit = e => authenticateUser(e, mode);

  if (mode === 'register') {
    $('auth-password').addEventListener('input', checkRegistrationPassword);
    checkRegistrationPassword();
  }

  if (!gate && !$('auth').open) {
    $('auth').showModal();
  }
}

function validRegistrationPassword(password){return typeof password==='string'&&password.length>=8&&password.length<=128&&/[A-Z]/.test(password)&&/[0-9]/.test(password)&&/[^\p{L}\p{N}\s]/u.test(password)}
function checkRegistrationPassword(){const input=$('auth-password');input.setCustomValidity(input.value&&!validRegistrationPassword(input.value)?'Use at least 8 characters with an uppercase letter, a number and a special character.':'')}
async function authenticateUser(e,mode){e.preventDefault();const form=e.target,button=$('auth-submit');button.disabled=true;$('auth-error').textContent='Connecting… This may take a moment.';try{const credentials=Object.fromEntries(new FormData(form));const result=await request('/api/auth/'+mode,'POST',credentials,null);if(result.user.role==='admin'){sessionStorage.setItem(AUTH_KEY,JSON.stringify(result));account=result;dirty=false;conflict=false;cloudReady=true;adminData=null;form.reset();$('auth').close();document.body.classList.remove('auth-required');document.body.classList.add('admin-mode');renderAdmin();toast('Admin signed in');return}const remote=await request('/api/workspace','GET',undefined,result.token);if(!validData(remote.data))throw Error('Invalid cloud workspace.');sessionStorage.setItem(AUTH_KEY,JSON.stringify(result));account=result;revision=remote.revision;dirty=false;conflict=false;cloudReady=true;switchState(remote.data);keepDraft();form.reset();$('auth').close();document.body.classList.remove('auth-required');status('Saved to cloud');go('home');if(!tutorialSeen())startTutorial();toast(mode==='register'?'Account created. Your cloud workspace is ready.':'Signed in successfully')}catch(err){$('auth-error').textContent=err.message}finally{button.disabled=false}}
function signOut(){if(sending){toast('Please wait for the current save to finish.');return}if(!account)return;const dialog=$('signout-confirm');const hasDraft=dirty&&account.user.role!=='admin';dialog.innerHTML=`<section class="signout-panel" aria-labelledby="signout-title" aria-describedby="signout-description"><div class="signout-icon" aria-hidden="true">↗</div><div class="eyebrow">STUDENTMATE ACCOUNT</div><h2 id="signout-title">Sign out?</h2><p id="signout-description">${hasDraft?'You have unsaved changes. Signing out will discard them. Cancel and export a backup first if you need to keep them.':'You can sign back in anytime to continue using your account.'}</p><p id="signout-error" role="alert"></p><div class="signout-actions"><button class="secondary" id="signout-cancel" type="button" onclick="closeSignOut()">Stay signed in</button><button class="account-signout" id="signout-submit" type="button" onclick="completeSignOut()">${hasDraft?'Sign out and discard':'Sign out'}</button></div></section>`;if(!dialog.open)dialog.showModal()}
function closeSignOut(){const dialog=$('signout-confirm');if(dialog.open)dialog.close()}
async function completeSignOut(){if(sending||!account)return;const button=$('signout-submit'),cancel=$('signout-cancel');sending=true;button.disabled=true;cancel.disabled=true;button.innerHTML='<span class="signout-spinner" aria-hidden="true"></span><span>Signing out…</span>';try{await request('/api/auth/logout','POST')}catch(e){if(e.status!==401){$('signout-error').textContent='Could not sign out. Check your connection and try again.';button.disabled=false;cancel.disabled=false;button.textContent=dirty&&account.user.role!=='admin'?'Sign out and discard':'Sign out';sending=false;return}}sessionStorage.removeItem(draftKey());sessionStorage.removeItem(AUTH_KEY);account=null;dirty=false;conflict=false;cloudReady=false;clearTimeout(syncTimer);closeSignOut();switchState(guestState());document.body.classList.remove('admin-mode');document.body.classList.add('auth-required');showAccountGate('login');toast('Signed out.');sending=false}
async function resumeAccount(){let stored;try{stored=JSON.parse(sessionStorage.getItem(AUTH_KEY))}catch{}if(!stored?.token||!stored?.user?.id)return;account=stored;if(account.user.role==='admin'){document.body.classList.remove('auth-required');document.body.classList.add('admin-mode');$('auth').close();adminData=null;renderAdmin();return}let draft;try{draft=JSON.parse(sessionStorage.getItem(draftKey()))}catch{}if(draft&&validData(draft.data)){revision=draft.revision;dirty=!!draft.dirty;switchState(draft.data)}else switchState(blank());status('Connecting to cloud…');$('content').inert=true;try{const remote=await request('/api/workspace');if(!validData(remote.data))throw Error('Invalid cloud workspace.');cloudReady=true;document.body.classList.remove('auth-required');$('auth').close();if(dirty){conflict=remote.revision!==revision;if(conflict)status('Another device changed this workspace. Export your copy, then load the cloud copy.');else await syncNow()}else{revision=remote.revision;switchState(remote.data);keepDraft();status('Saved to cloud')}}catch(e){if(e.status===401){account=null;sessionStorage.removeItem(AUTH_KEY);sessionStorage.removeItem(draftKey());dirty=false;cloudReady=false;showAccountGate('login','Your session expired. Please sign in again.')}else status(e.message)}finally{$('content').inert=false}if(account&&cloudReady&&!tutorialIsAdmin())offerTutorial()}
document.querySelector('.header-right').insertAdjacentHTML('afterbegin','<button class="text-button" id="cloud-status" onclick="openAuth()">Sign in · Cloud save</button>');document.body.insertAdjacentHTML('beforeend','<dialog id="auth" aria-label="StudentMate account"></dialog><dialog id="signout-confirm" aria-label="Confirm sign out"></dialog><dialog id="account-action-confirm" aria-label="Confirm cloud action"></dialog>');
document.addEventListener('click',event=>{const button=event.target.closest('.account-card-actions button');if(button?.textContent.trim()==='Retry save'){event.preventDefault();event.stopImmediatePropagation();openAccountAction('retry')}},true);
function showAccountGate(mode='login',message=''){document.body.classList.add('auth-required');const dialog=$('auth');dialog.innerHTML=`<div class="auth-screen"><div class="auth-brand"><span>✦</span> StudentMate<span class="brand-dot">.</span><i class="auth-brand-accent" aria-hidden="true"></i></div><div class="auth-panel"><div class="auth-tabs"><button type="button" class="${mode==='login'?'selected':''}" onclick="showAccountGate('login')">${authIcon('graduation-cap')}<span>LOGIN TO STUDENTMATE</span></button><button type="button" class="${mode==='register'?'selected':''}" onclick="showAccountGate('register')">${authIcon('users')}<span>JOIN IN STUDENTMATE</span></button></div>${message?`<p class="auth-notice">${esc(message)}</p>`:''}<div id="auth-slot"></div></div></div>`;openAuth(mode);if(!dialog.open)dialog.showModal()}
window.addEventListener('online',()=>{if(account){if(!cloudReady)resumeAccount();else syncNow()}});window.addEventListener('beforeunload',e=>{if(account&&dirty){e.preventDefault();e.returnValue=''}});
document.addEventListener('studentmate:splash-ready',()=>{showAccountGate('login');render();resumeAccount()},{once:true});
function ensurePasswordToggle(){const input=$('auth-password');if(!input||input.dataset.passwordToggle)return;input.dataset.passwordToggle='ready';const wrapper=document.createElement('div');wrapper.className='password-field auth-field';wrapper.innerHTML='<span class="auth-field-icon">'+authIcon('lock')+'</span>';input.parentNode.insertBefore(wrapper,input);wrapper.append(input);const button=document.createElement('button');button.type='button';button.className='password-toggle';button.textContent='Show';button.setAttribute('aria-label','Show password');button.setAttribute('aria-controls','auth-password');button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{const visible=input.type==='password';input.type=visible?'text':'password';button.textContent=visible?'Hide':'Show';button.setAttribute('aria-label',`${visible?'Hide':'Show'} password`);button.setAttribute('aria-pressed',String(visible))});wrapper.append(button)}
const passwordToggleObserver=new MutationObserver(ensurePasswordToggle);passwordToggleObserver.observe(document.body,{childList:true,subtree:true});ensurePasswordToggle();

// Mobile keyboards resize the visual viewport, including in in-app browsers.
let authViewportBaseline=window.visualViewport?.height||window.innerHeight;
let authViewportFrame;
let authFocusTimer;
function updateAuthViewport(keepFocusedVisible=false){
  cancelAnimationFrame(authViewportFrame);
  authViewportFrame=requestAnimationFrame(()=>{
    const viewport=window.visualViewport;
    const height=viewport?.height||window.innerHeight;
    const dialog=$('auth');
    const focused=document.activeElement;
    const editing=dialog?.contains(focused)&&focused.matches('input');
    if(!editing)authViewportBaseline=Math.max(authViewportBaseline,height);
    const keyboardOpen=!!editing&&authViewportBaseline-height>100;
    const keyboardWasOpen=document.body.classList.contains('auth-keyboard-open');
    document.body.classList.toggle('auth-keyboard-open',keyboardOpen);
    document.documentElement.style.setProperty('--auth-viewport-height',`${height}px`);
    document.documentElement.style.setProperty('--auth-viewport-top',`${viewport?.offsetTop||0}px`);
    if(!dialog?.open)return;
    if(keyboardWasOpen&&!keyboardOpen){
      clearTimeout(authFocusTimer);
      dialog.scrollTo({top:0,behavior:authScrollBehavior()});
    }
    if(!keepFocusedVisible||!editing)return;
    clearTimeout(authFocusTimer);
    // Wait for the keyboard to settle instead of moving on every resize frame.
    authFocusTimer=setTimeout(()=>{
      if(document.activeElement!==focused||!dialog.open)return;
      const field=focused.closest('.auth-field')||focused;
      const bounds=field.getBoundingClientRect();
      const visible=dialog.getBoundingClientRect();
      const padding=Math.min(64,visible.height*.15);
      let bottom=bounds.bottom;
      // Keep both email and password reachable when they fit together.
      if(focused.id==='auth-email'){
        const password=$('auth-password')?.getBoundingClientRect();
        if(password&&password.bottom-bounds.top<visible.height-padding*2)bottom=password.bottom;
      }
      let delta=0;
      if(bottom>visible.bottom-padding)delta=bottom-visible.bottom+padding;
      if(bounds.top-delta<visible.top+padding)delta=bounds.top-visible.top-padding;
      if(Math.abs(delta)>2)dialog.scrollTo({top:dialog.scrollTop+delta,behavior:authScrollBehavior()});
    },160);
  });
}
function authScrollBehavior(){return window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}
document.addEventListener('focusin',event=>{if(event.target.closest('#auth'))updateAuthViewport(true)});
document.addEventListener('focusout',()=>updateAuthViewport());
window.addEventListener('resize',()=>updateAuthViewport(true));
window.visualViewport?.addEventListener('resize',()=>updateAuthViewport(true));
window.visualViewport?.addEventListener('scroll',()=>updateAuthViewport());
updateAuthViewport();

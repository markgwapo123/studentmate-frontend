// Shared public API URL for the landing page and app. No database secrets belong here.
(function (root) {
 'use strict';
 function createClient({baseUrl, fetchFn=root.fetch.bind(root), timeoutMs=60000, waitMs=3000, onWait=()=>{}}) {
  baseUrl=baseUrl.replace(/\/+$/, '');
  let initial=true, warmup;
  async function attempt(path, options={}) {
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(), timeoutMs);
   try {
    const response=await fetchFn(baseUrl+path, {...options, signal:controller.signal});
    const data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return {};});
    if(!response.ok){const error=new Error(data.error||`Request failed (${response.status}). Please retry.`);error.status=response.status;throw error;}
    return data;
   } finally {clearTimeout(timer);}
  }
  async function retryRead(path, options) {
   for(let count=0;count<2;count++){
    try{return await attempt(path, options);}
    catch(error){if(count===1||(error.status&&! [502,503,504].includes(error.status)))throw error;}
   }
  }
  function warmUp() {
   // Always handled: a failed silent warm-up must not cause an unhandled rejection.
   if(!warmup)warmup=retryRead('/health',{method:'GET',cache:'no-store'}).then(()=>true,()=>false);
   return warmup;
  }
  async function request(path, options={}) {
   const first=initial;initial=false;
   const timer=first?setTimeout(()=>onWait(true),waitMs):null;
   try {
    const method=(options.method||'GET').toUpperCase();
    if(first&&method!=='GET')await warmUp();
    // Only reads are replayed. A lost write response may already have changed data.
    return first&&method==='GET'?await retryRead(path,options):await attempt(path,options);
   } catch(error) {
    if(error.status)throw error;
    throw new Error('Cannot reach the server. Check your connection and retry.');
   } finally {clearTimeout(timer);if(first)onWait(false);}
  }
  return {baseUrl,request,warmUp};
 }
 root.createStudentMateAPIClient=createClient;
 root.StudentMateAPI=createClient({
  baseUrl:root.STUDENTMATE_API_BASE_URL||'https://studentmate-backend-6y11.onrender.com',
  onWait:visible=>root.document.dispatchEvent(new CustomEvent('studentmate:api-wait',{detail:{visible}}))
 });
 root.StudentMateAPI.warmUp();
})(window);

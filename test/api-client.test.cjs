const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function factory(){
 const window={fetch:async()=>({ok:true,json:async()=>({status:'ok'})}),document:{dispatchEvent(){} }};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../api-client.js'),'utf8'),{window,AbortController,setTimeout,clearTimeout,CustomEvent:class{}});
 return window.createStudentMateAPIClient;
}
const response=(status=200,data={ok:true})=>({ok:status<400,status,json:async()=>data});
test('initial GET retries once; later calls do not retry',async()=>{
 let calls=0;const client=factory()({baseUrl:'https://api.example/',fetchFn:async()=>{calls++;if(calls===1||calls>=3)throw Error('Offline');return response();}});
 assert((await client.request('/api/workspace')).ok);assert.equal(calls,2);
 await assert.rejects(client.request('/api/workspace'));assert.equal(calls,3);
});
test('slow startup displays and clears notice; timeout retries once',async()=>{
 const changes=[];let calls=0;
 const client=factory()({baseUrl:'https://api.example',timeoutMs:20,waitMs:5,onWait:value=>changes.push(value),fetchFn:(url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('Timeout'))));}});
 await assert.rejects(client.request('/api/workspace'));assert.equal(calls,2);assert.deepEqual(changes,[true,false]);
});
test('initial write retries readiness probe, never the write; silent failure is handled',async()=>{
 const paths=[];const client=factory()({baseUrl:'https://api.example',fetchFn:async url=>{paths.push(url);if(url.endsWith('/health'))return response(503);throw Error('Lost write response');}});
 assert.equal(await client.warmUp(),false);
 await assert.rejects(client.request('/api/auth/register',{method:'POST'}));
 assert.deepEqual(paths,['https://api.example/health','https://api.example/health','https://api.example/api/auth/register']);
});
test('authentication failures are not retried',async()=>{
 let calls=0;const client=factory()({baseUrl:'https://api.example',fetchFn:async()=>{calls++;return response(401,{error:'Sign in required.'});}});
 await assert.rejects(client.request('/api/workspace'),error=>error.status===401);assert.equal(calls,1);
});

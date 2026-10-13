/* Camera, image preparation and on-device OCR for schedule imports. */
(function(root){
'use strict';
let library=null;
const MAX_DIMENSION=2400;
const cancelled=()=>Object.assign(new Error('cancelled'),{name:'AbortError'});
function absolute(path){return new URL(path,location.href).href;}
function requireOCR(){
 if(root.Tesseract)return Promise.resolve(root.Tesseract);
 if(!library)library=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=absolute('vendor/ocr/tesseract.min.js');s.onload=()=>resolve(root.Tesseract);s.onerror=()=>{s.remove();library=null;reject(Error('The photo reader could not load. Reconnect and try again.'));};document.head.append(s);});
 return library;
}
function stop(stream){if(stream)for(const track of stream.getTracks())track.stop();}
async function camera(video,facing='environment',active=()=>true){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Live camera is unavailable here. Use Choose from gallery, or open StudentMate in Chrome or Safari.');
 if(/StudentMateAndroid\/1\.0\b/.test(navigator.userAgent))throw Error('Live capture needs the updated StudentMate APK. Install the new version, or use Chrome or Choose from gallery.');
 let stream;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:2048},height:{ideal:1536}}});
  if(!active()){stop(stream);throw cancelled();}
  video.srcObject=stream;video.muted=true;video.playsInline=true;await video.play();
  if(!active()){stop(stream);video.srcObject=null;throw cancelled();}
  return stream;
 }catch(error){stop(stream);video.srcObject=null;if(error.name==='AbortError')throw error;if(['NotAllowedError','SecurityError'].includes(error.name))throw Error('Camera access was denied. Allow camera access in your browser or app settings, or choose a photo from the gallery.');if(['NotFoundError','OverconstrainedError'].includes(error.name))throw Error('No usable camera was found. Choose an image from your gallery instead.');if(error.name==='NotReadableError')throw Error('The camera is busy. Close other camera apps and try again.');throw error;}
}
async function decode(file){
 if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}}
 const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('This image could not be read. Choose a JPG, PNG or WebP image.'));image.src=url;});}finally{URL.revokeObjectURL(url);}
}
function canvas(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
async function prepare(file,rotation=0){
 const image=await decode(file);try{
  const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;if(!width||!height)throw Error('This image has no readable pixels.');
  if(width*height>80000000)throw Error('This image is too large. Crop or resize it before importing.');
  const scale=Math.min(MAX_DIMENSION/Math.max(width,height),Math.max(1,Math.min(2,1600/Math.max(width,height)))),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
  const angle=((rotation%360)+360)%360,quarter=angle===90||angle===270,c=canvas(quarter?h:w,quarter?w:h),ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Image processing is unavailable in this browser.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(image,-w/2,-h/2,w,h);return c;
 }finally{image.close?.();}
}
function photoBlob(canvas,type='image/jpeg'){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not prepare the image. Please try again.')),type,.94));}
async function capture(video){if(!video.videoWidth||!video.videoHeight)throw Error('Wait for the camera preview, then try again.');const scale=Math.min(1,MAX_DIMENSION/Math.max(video.videoWidth,video.videoHeight)),c=canvas(Math.round(video.videoWidth*scale),Math.round(video.videoHeight*scale)),ctx=c.getContext('2d');if(!ctx)throw Error('Capture is unavailable. Choose a photo from the gallery.');ctx.drawImage(video,0,0,c.width,c.height);const blob=await photoBlob(c);return new File([blob],'schedule-photo.jpg',{type:'image/jpeg'});}
function wordsFromTSV(tsv){
 const items=[];for(const line of String(tsv||'').split('\n').slice(1)){const v=line.split('\t');if(v[0]!=='5'||v.length<12)continue;const str=v.slice(11).join('\t').trim(),x=Number(v[6]),top=Number(v[7]),width=Number(v[8]),height=Number(v[9]),confidence=Number(v[10]);if(!str||!Number.isFinite(x)||!Number.isFinite(top)||width<=0||height<=0||confidence<0)continue;items.push({str,width,transform:[1,0,0,height,x,-(top+height)]});}return items;
}
function abortable(promise,signal){
 if(!signal)return promise;if(signal.aborted)return Promise.reject(cancelled());
 return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(cancelled());};signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});
}
async function recognize(canvas,{active=()=>true,progress=()=>{},register=()=>{},signal}={}){
 const T=await requireOCR();if(!active())throw cancelled();let worker=null;
 try{
  worker=await T.createWorker('eng',1,{workerPath:absolute('vendor/ocr/worker.min.js'),corePath:absolute('vendor/ocr/core'),langPath:absolute('vendor/ocr/lang'),workerBlobURL:false,gzip:true,cacheMethod:'write',logger:m=>{if(active())progress(m);}});
  register(worker);if(!active())throw cancelled();
  await worker.setParameters({tessedit_pageseg_mode:T.PSM.AUTO,preserve_interword_spaces:'1'});
  const blob=await photoBlob(canvas,'image/png');if(!active())throw cancelled();const {data}=await abortable(worker.recognize(blob,{}, {text:true,tsv:true}),signal);if(!active())throw cancelled();
  return {text:String(data.text||''),items:wordsFromTSV(data.tsv),confidence:Number(data.confidence)||0};
 }finally{register(null);if(worker)await worker.terminate().catch(()=>{});}
}
root.StudentMatePhoto={camera,stop,prepare,capture,recognize,wordsFromTSV,photoBlob};
})(typeof window==='object'?window:globalThis);

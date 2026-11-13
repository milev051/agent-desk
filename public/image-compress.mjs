// Sažima PNG/JPG u pregledaču pre slanja, da telefon preko mobilne mreže ne šalje original od nekoliko MB.
// WebP 75% kao na serveru; Safari ne pravi WebP iz canvas-a, pa tada ide JPEG 80%. Original ostaje ako novi nije manji.
const convertible=/^image\/(png|jpeg)$/i;

export async function compressImage(file,{minSize=200*1024,maxSide=4096,quality=0.75,decode=globalThis.createImageBitmap,makeCanvas=defaultCanvas}={}){
  if(!file || !convertible.test(file.type || '') || file.size<minSize || typeof decode!=='function')return file;
  try{
    const bitmap=await decode(file,{imageOrientation:'from-image'});
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=makeCanvas(width,height);canvas.getContext('2d').drawImage(bitmap,0,0,width,height);bitmap.close?.();
    let blob=await toBlob(canvas,'image/webp',quality);
    if(!blob || blob.type!=='image/webp')blob=await toBlob(canvas,'image/jpeg',0.8);
    if(!blob || blob.size>=file.size)return file;
    const ext=blob.type==='image/webp'?'webp':'jpg',base=(file.name || 'slika').replace(/\.[^.]+$/,'');
    return new File([blob],`${base}.${ext}`,{type:blob.type,lastModified:file.lastModified});
  }catch{return file;}
}

function defaultCanvas(width,height){
  if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(width,height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;
}

function toBlob(canvas,type,quality){
  if(canvas.convertToBlob)return canvas.convertToBlob({type,quality}).catch(()=>null);
  return new Promise(resolve=>canvas.toBlob(resolve,type,quality));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {compressImage} from '../public/image-compress.mjs';

const big=(type,name='foto.jpg')=>new File([new Uint8Array(500*1024)],name,{type});
const fakeCanvas=(types)=>(w,h)=>({w,h,getContext:()=>({drawImage(){}}),convertToBlob:async({type})=>types.includes(type)?new Blob([new Uint8Array(1000)],{type}):new Blob([new Uint8Array(1000)],{type:'image/png'})});
const decode=async()=>({width:8000,height:4000,close(){}});

test('telefon šalje WebP umesto originala',async()=>{
  let size;const out=await compressImage(big('image/jpeg'),{decode,makeCanvas:(w,h)=>{size=[w,h];return fakeCanvas(['image/webp'])(w,h);}});
  assert.equal(out.name,'foto.webp');assert.equal(out.type,'image/webp');assert.deepEqual(size,[4096,2048]);
});

test('bez WebP enkodera (Safari) ide JPEG',async()=>{
  const out=await compressImage(big('image/png','snimak.png'),{decode,makeCanvas:fakeCanvas(['image/jpeg'])});
  assert.equal(out.name,'snimak.jpg');assert.equal(out.type,'image/jpeg');
});

test('mali fajlovi, ostali tipovi i greške ostaju original',async()=>{
  const small=new File([new Uint8Array(1000)],'a.png',{type:'image/png'});
  assert.equal(await compressImage(small,{decode,makeCanvas:fakeCanvas(['image/webp'])}),small);
  const pdf=big('application/pdf','a.pdf');assert.equal(await compressImage(pdf,{decode}),pdf);
  const broken=big('image/jpeg');assert.equal(await compressImage(broken,{decode:async()=>{throw Error('x');}}),broken);
});

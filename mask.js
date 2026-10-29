(()=>{
"use strict";

function ByteBuf(){let a=new Uint8Array(1<<20),n=0;return{b(v){if(n>=a.length){const z=new Uint8Array(a.length*2);z.set(a);a=z}a[n++]=v&255},w16(v){this.b(v);this.b(v>>8)},out(){return a.slice(0,n)}}}
function lzw(idx,minSize,buf){buf.b(minSize);const clear=1<<minSize,eoi=clear+1;let size=minSize+1,next=eoi+1;const dict=new Map();let cur=0,nb=0;const sub=new Uint8Array(255);let sl=0;
const put=v=>{sub[sl++]=v;if(sl===255){buf.b(255);for(let i=0;i<255;i++)buf.b(sub[i]);sl=0}};
const emit=c=>{cur|=c<<nb;nb+=size;while(nb>=8){put(cur&255);cur>>>=8;nb-=8}};
const bump=()=>{if(next>(1<<size)-1&&size<12)size++};
emit(clear);let prefix=idx[0];
for(let i=1;i<idx.length;i++){const c=idx[i];const key=(prefix<<8)|c;const v=dict.get(key);if(v!==undefined){prefix=v;continue}
emit(prefix);bump();if(next<4096){dict.set(key,next++)}else{emit(clear);dict.clear();next=eoi+1;size=minSize+1}prefix=c}
emit(prefix);bump();emit(eoi);if(nb>0)put(cur&255);if(sl){buf.b(sl);for(let i=0;i<sl;i++)buf.b(sub[i])}buf.b(0)}
function GifWriter(w,h,pal){const B=ByteBuf();for(const c of 'GIF89a')B.b(c.charCodeAt(0));B.w16(w);B.w16(h);B.b(0xF7);B.b(0);B.b(0);
for(let i=0;i<256;i++){const p=pal[i]||[0,0,0];B.b(p[0]);B.b(p[1]);B.b(p[2])}
B.b(0x21);B.b(0xFF);B.b(11);for(const c of 'NETSCAPE2.0')B.b(c.charCodeAt(0));B.b(3);B.b(1);B.w16(0);B.b(0);
return{frame(idx,x,y,fw,fh,delay,disposal=1,transparent=-1){B.b(0x21);B.b(0xF9);B.b(4);B.b((disposal<<2)|(transparent>=0?1:0));B.w16(delay);B.b(transparent>=0?transparent:0);B.b(0);B.b(0x2C);B.w16(x);B.w16(y);B.w16(fw);B.w16(fh);B.b(0);lzw(idx,8,B)},end(){B.b(0x3B);return B.out()}}}


const $=id=>document.getElementById(id);
const clamp=v=>v<0?0:v>1?1:v;
const eIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
function hex(h){const v=parseInt(h.slice(1),16);return[v>>16&255,v>>8&255,v&255]}
function normHex(v){v=String(v).trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(v))v=v.split('').map(c=>c+c).join('');return /^[0-9a-f]{6}$/i.test(v)?'#'+v.toLowerCase():null}
function el(tag,attrs,kids){const e=document.createElement(tag);for(const k in(attrs||{})){if(k==='style')e.setAttribute('style',attrs[k]);else e[k]=attrs[k]}(kids||[]).forEach(k=>k&&e.append(k));return e}

const IMG={};
function getImg(src){let o=IMG[src];if(!o){o=IMG[src]={img:new Image(),ready:false,duo:{}};o.p=new Promise(r=>{o.img.onload=()=>{o.ready=true;r()};o.img.onerror=()=>r()});o.img.src=src}return o}
function duotone(src,dark,light){const o=getImg(src);if(!o.ready)return null;const k=dark+light;if(o.duo[k])return o.duo[k];
 const im=o.img,c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);
 const d=x.getImageData(0,0,c.width,c.height),a=d.data,A=hex(dark),B=hex(light);let mn=255,mx=0;
 for(let i=0;i<a.length;i+=16){const l=.299*a[i]+.587*a[i+1]+.114*a[i+2];if(l<mn)mn=l;if(l>mx)mx=l}const rg=Math.max(1,mx-mn);
 for(let i=0;i<a.length;i+=4){let f=clamp((.299*a[i]+.587*a[i+1]+.114*a[i+2]-mn)/rg);f=f*f*(3-2*f);a[i]=A[0]+(B[0]-A[0])*f;a[i+1]=A[1]+(B[1]-A[1])*f;a[i+2]=A[2]+(B[2]-A[2])*f}
 x.putImageData(d,0,0);o.duo[k]=c;return c}
function loadPhoto(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onerror=rej;fr.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error('Could not read the image'));im.onload=()=>{const m=1400/Math.max(im.width,im.height),sc=Math.min(1,m),c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/png'))};im.src=fr.result};fr.readAsDataURL(file)})}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function makeQuant(pal,matte,transp,dith){const lut=new Int16Array(1<<18).fill(-1),M=hex(matte),T=transp?pal.length:-1;
 const near=(r,g,b)=>{const k=(r>>2)<<12|(g>>2)<<6|(b>>2);let v=lut[k];if(v>=0)return v;let best=0,bd=1e9;for(let i=0;i<pal.length;i++){const p=pal[i],d=(p[0]-r)**2*2+(p[1]-g)**2*4+(p[2]-b)**2*3;if(d<bd){bd=d;best=i}}lut[k]=best;return best};
 const cl=v=>v<0?0:v>255?255:v|0;
 return{T,full:transp?pal.concat([M]):pal,run(d,W,H){const idx=new Uint8Array(W*H);for(let y=0,i=0;y<H;y++)for(let x=0;x<W;x++,i++){const j=i*4,a=d[j+3];
  if(transp&&a<128){idx[i]=T;continue}let r=d[j],g=d[j+1],b=d[j+2];if(a<255){const f=a/255;r=r*f+M[0]*(1-f);g=g*f+M[1]*(1-f);b=b*f+M[2]*(1-f)}
  if(dith){const o=(BAYER[(y&3)*4+(x&3)]/16-.47)*14;r+=o;g+=o;b+=o}idx[i]=near(cl(r),cl(g),cl(b))}return idx}}}
// Photo masks
const SHAPES={
 rectangle:{name:'Rectangle',vb:[0,0,1600,900],els:[{d:'M0,0 H1600 V900 H0 Z',m:[1,0,0,1,0,0],r:'nonzero'}]},
 circle:{name:'Circle',vb:[0,0,1000,1000],els:[{d:'M1000,500 A500,500 0 1 0 0,500 A500,500 0 1 0 1000,500 Z',m:[1,0,0,1,0,0],r:'nonzero'}]},
 square:{name:'Square',vb:[0,0,1000,1000],els:[{d:'M0,0 H1000 V1000 H0 Z',m:[1,0,0,1,0,0],r:'nonzero'}]},
 ohio:{name:'Ohio',vb:[0,0,1126.69,1184.4],els:[{d:'M1034.6,54.51l-262.12,160.72-283.17,20.41-102.04-99.49H63.27v801.05l127.56,25.51,22.96,81.64,117.35,43.37,176.03-35.72,91.84,104.6,73.98-35.72,48.47-178.58,56.12,48.47,76.53-153.07,130.11-107.15,68.88-265.32-18.5-410.73ZM283.85,778.63c-24.27,0-43.95-19.68-43.95-43.95s19.68-43.95,43.95-43.95,43.95,19.68,43.95,43.95-19.68,43.95-43.95,43.95Z',m:[1,0,0,1,0,0],r:'nonzero'}]},
 b11:{name:'US-B-D-11',vb:[0,0,797.59,1201.47],els:[{d:'M758.31,984.83l-32.39-217.55,45.04-93.04-127.74-593.74-471.25-13.76L58.78,783.26l18.67,342.85,62.17,9.82,15.91-100.68,57.82,133.57,81.19-72.16-57.02-100.04,520.8-11.79ZM426.15,373.95c24.12,3.81,40.59,26.46,36.78,50.57-3.81,24.12-26.46,40.59-50.58,36.78-24.12-3.81-40.57-26.46-36.76-50.58,3.81-24.1,26.44-40.58,50.56-36.77Z',m:[1,0,0,1,0,0],r:'nonzero'}]}};
const DEF2={shape:'ohio',custom:null,photos:[],dur:2.5,trans:'wipe',zoom:false,fmt:'shape',duo:true,bg:'#f5f3ef',dark:'#416855',light:'#e6e8e1'};
const MAX_PHOTOS=50;
const KEY2='mascara-fotos-v1';
let S2;try{S2=JSON.parse(localStorage.getItem(KEY2)||'null')}catch(e){S2=null}
S2=Object.assign({},JSON.parse(JSON.stringify(DEF2)),S2||{});
S2.photos=(S2.photos||[]).map(p=>typeof p==='string'?{src:p,x:.5,y:.5,z:1}:Object.assign({x:.5,y:.5,z:1},p));
// Remove only the two legacy demo images, preserving uploaded photos.
const legacySamples=new Set(['39171:3470587560', '39383:1635448167']);
function photoSignature(src){let h=2166136261;for(let i=0;i<src.length;i++)h=Math.imul(h^src.charCodeAt(i),16777619);return src.length+':'+(h>>>0)}
const photoCountBeforeMigration=S2.photos.length;
S2.photos=S2.photos.filter(p=>!legacySamples.has(photoSignature(p.src)));
if(S2.photos.length!==photoCountBeforeMigration)save2();
let EDIT=-1,CURK=0,GEO=null;
function save2(){try{localStorage.setItem(KEY2,JSON.stringify(S2));$('m_savewarn').hidden=true}catch(e){$('m_savewarn').hidden=false}}

function shapeOf(){return S2.shape==='custom'&&S2.custom?S2.custom:SHAPES[S2.shape]||SHAPES.ohio}
const SHC={};
function shapeKey(sh){return sh===S2.custom?'c'+JSON.stringify(sh).length+(sh.els[0]?sh.els[0].d.slice(0,40):''):sh.name}
function fillShape(ctx,sh,s,ox,oy){ctx.setTransform(s,0,0,s,ox-sh.vb[0]*s,oy-sh.vb[1]*s);
 for(const e of sh.els){try{const p=new Path2D();p.addPath(new Path2D(e.d),new DOMMatrix(e.m));ctx.fill(p,e.r==='evenodd'?'evenodd':'nonzero')}catch(err){}}
 ctx.setTransform(1,0,0,1,0,0)}
function shapeBox(sh){const k=shapeKey(sh);if(SHC[k])return SHC[k];
 const R=500,s=R/Math.max(sh.vb[2],sh.vb[3]),w=Math.ceil(sh.vb[2]*s)+2,h=Math.ceil(sh.vb[3]*s)+2,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#000';fillShape(x,sh,s,1,1);
 const a=x.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let i=0;i<w;i++)if(a[(y*w+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y}
 const bb=x1<0?{x:sh.vb[0],y:sh.vb[1],w:sh.vb[2],h:sh.vb[3]}:{x:sh.vb[0]+(x0-1)/s,y:sh.vb[1]+(y0-1)/s,w:(x1-x0+1)/s,h:(y1-y0+1)/s};
 return SHC[k]={bb,empty:x1<0}}
const MASKS={};
function maskCanvas(sh,bb,w,h){const k=shapeKey(sh)+'|'+w+'x'+h;if(MASKS[k])return MASKS[k];const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#000';const s=w/bb.w;fillShape(x,sh,s,-(bb.x-sh.vb[0])*s,-(bb.y-sh.vb[1])*s);return MASKS[k]=c}

function parseSvg(text){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');const src=doc.querySelector('svg');if(!src||doc.querySelector('parsererror'))throw new Error('This file is not a valid SVG.');
 const allowed=new Set(['g','path','polygon','polyline','rect','circle','ellipse','defs','clipPath','mask','symbol','pattern','marker','title','desc']);
 src.querySelectorAll('*').forEach(e=>{if(!allowed.has(e.localName)){e.remove();return}for(const a of [...e.attributes])if(!['d','points','x','y','width','height','cx','cy','r','rx','ry','transform','fill','fill-rule','fill-opacity','display','visibility'].includes(a.name)||/url\s*\(/i.test(a.value))e.removeAttribute(a.name)});
 for(const a of [...src.attributes])if(!['viewBox','width','height','xmlns'].includes(a.name))src.removeAttribute(a.name);
 const host=document.createElement('div');host.style.cssText='position:absolute;left:-10000px;top:0;width:10px;height:10px;overflow:hidden;opacity:0;pointer-events:none';
 const node=document.importNode(src,true);host.append(node);document.body.append(host);
 try{let vb=node.viewBox&&node.viewBox.baseVal&&node.viewBox.baseVal.width?[node.viewBox.baseVal.x,node.viewBox.baseVal.y,node.viewBox.baseVal.width,node.viewBox.baseVal.height]:null;
  if(!vb){const w=parseFloat(node.getAttribute('width')),h=parseFloat(node.getAttribute('height'));vb=w&&h?[0,0,w,h]:null}
  const els=[];
  node.querySelectorAll('path,polygon,polyline,rect,circle,ellipse').forEach(el=>{
   if(el.closest('defs,clipPath,mask,symbol,pattern,marker'))return;const cs=getComputedStyle(el);
   if(cs.fill==='none'||cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.fillOpacity)===0)return;
   const n=el.tagName.toLowerCase(),g=a=>parseFloat(el.getAttribute(a))||0;let d='';
   if(n==='path')d=el.getAttribute('d')||'';
   else if(n==='rect')d='M'+g('x')+','+g('y')+'h'+g('width')+'v'+g('height')+'h'+(-g('width'))+'Z';
   else if(n==='circle'||n==='ellipse'){const cx=g('cx'),cy=g('cy'),rx=n==='circle'?g('r'):g('rx'),ry=n==='circle'?g('r'):g('ry');d='M'+(cx-rx)+','+cy+'a'+rx+','+ry+' 0 1 0 '+2*rx+',0a'+rx+','+ry+' 0 1 0 '+(-2*rx)+',0Z'}
   else d='M'+(el.getAttribute('points')||'').trim()+'Z';
   if(!d)return;let m=new DOMMatrix(),e=el;const chain=[];
   while(e&&e!==node.parentNode){if(e.transform&&e.transform.baseVal&&e.transform.baseVal.numberOfItems){const c=e.transform.baseVal.consolidate();if(c)chain.unshift(c.matrix)}e=e.parentNode}
   chain.forEach(x=>m=m.multiply(DOMMatrix.fromMatrix(x)));
   els.push({d,m:[m.a,m.b,m.c,m.d,m.e,m.f],r:cs.fillRule==='evenodd'?'evenodd':'nonzero'})});
  if(!els.length)throw new Error('No filled shapes were found in this SVG.');
  if(!vb){const b=node.getBBox();vb=[b.x,b.y,b.width,b.height]}
  return{name:'Custom SVG',vb,els}}
 finally{host.remove()}
}

function photoSrc(src){if(S2.duo)return duotone(src,S2.dark,S2.light);const o=getImg(src);return o.ready?o.img:null}
function coverAt(ctx,c,x,y,w,h,z,fx,fy){const cw=c.width||c.naturalWidth,ch=c.height||c.naturalHeight,s=Math.max(w/cw,h/ch)*z,sw=w/s,sh=h/s;ctx.drawImage(c,(cw-sw)*fx,(ch-sh)*fy,sw,sh,x,y,w,h);return{s,cw,ch,sw,sh}}
function fitAt(ctx,c,x,y,w,h,z,fx,fy){const cw=c.width||c.naturalWidth,ch=c.height||c.naturalHeight,s=Math.min(w/cw,h/ch)*z,dw=cw*s,dh=ch*s;ctx.drawImage(c,x+(w-dw)*fx,y+(h-dh)*fy,dw,dh);return{s,cw,ch,sw:w/s,sh:h/s,free:true}}
function frameSize2(W){if(S2.shape==='none'){const first=S2.photos[0],im=first&&getImg(first.src),ratio=S2.fmt==='shape'?(im&&im.ready?im.img.naturalHeight/im.img.naturalWidth:1):RATIO2[S2.fmt];return[W,Math.max(2,Math.round(W*ratio/2)*2)]}const sh=shapeOf(),bb=shapeBox(sh).bb;if(S2.fmt==='shape'){const pad=.05;return[W,Math.round(W*(bb.h*(1+2*pad))/(bb.w*(1+2*pad))/2)*2]}return[W,Math.round(W*RATIO2[S2.fmt]/2)*2]}
const RATIO2={'1:1':1,'4:5':1.25,'9:16':16/9,'16:9':9/16};
const OFF={};
function render2(ctx,W,H,T,noBg,edit){
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';if(noBg)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S2.bg;ctx.fillRect(0,0,W,H)}
 const free=S2.shape==='none',sh=shapeOf(),info=free?{bb:{w:W,h:H}}:shapeBox(sh);if(info.empty)return;const bb=info.bb,drawPhoto=free?fitAt:coverAt;
 const pad=free?0:S2.fmt==='shape'?.05*Math.min(W/(1.1),W):.07*Math.min(W,H),s=Math.min((W-2*pad)/bb.w,(H-2*pad)/bb.h),sw=Math.max(2,Math.round(bb.w*s)),shh=Math.max(2,Math.round(bb.h*s));
 const ox=Math.round((W-sw)/2),oy=Math.round((H-shh)/2),key=sw+'x'+shh;
 let off=OFF[key];if(!off){off=OFF[key]=document.createElement('canvas');off.width=sw;off.height=shh}const o=off.getContext('2d');
 o.globalCompositeOperation='source-over';o.globalAlpha=1;o.clearRect(0,0,sw,shh);
 const P=S2.photos,n=P.length,D=S2.dur;
 if(!n){o.fillStyle=S2.light;o.fillRect(0,0,sw,shh)}else if(edit>=0&&edit<n){const ph=P[edit],c=photoSrc(ph.src);
  if(c){const g=drawPhoto(o,c,0,0,sw,shh,ph.z,ph.x,ph.y);GEO=Object.assign(g,{scale:sw/(W),ox,oy,w:sw,h:shh})}else{o.fillStyle=S2.light;o.fillRect(0,0,sw,shh)}}else{
  const k=((Math.floor(T/D)%n)+n)%n,t=T-Math.floor(T/D)*D,tr=Math.min(.75,D*.32),p=n>1&&S2.trans!=='cut'?eIO(clamp(t/tr)):1;
  const zc=S2.zoom?1.07-.07*clamp(t/D):1;
  CURK=k;const pc=P[k],pp=P[(k-1+n)%n],cur=photoSrc(pc.src),prv=n>1?photoSrc(pp.src):null;
  const draw=(c,x,z)=>{const ph=c===cur?pc:pp;if(c)drawPhoto(o,c,x,0,sw,shh,z*ph.z,ph.x,ph.y);else{o.fillStyle=S2.light;o.fillRect(x,0,sw,shh)}};
  if(p>=1)draw(cur,0,zc);
  else if(S2.trans==='fade'){draw(prv,0,1);o.globalAlpha=p;draw(cur,0,zc);o.globalAlpha=1}
  else if(S2.trans==='slide'){draw(prv,-sw*p,1);draw(cur,sw*(1-p),zc)}
  else{draw(prv,0,1);o.save();o.beginPath();o.rect(0,0,sw,shh*p);o.clip();draw(cur,0,zc);o.restore()}
 }
 if(!free){o.globalCompositeOperation='destination-in';o.drawImage(maskCanvas(sh,bb,sw,shh),0,0);o.globalCompositeOperation='source-over'}
 ctx.drawImage(off,ox,oy);
}

const pv2=$('pv2'),p2ctx=pv2.getContext('2d');let playing2=true,t02=performance.now(),paused2=0;
function tick2(now){if(!$("maskWorkspace").hidden&&!document.hidden){const T=Math.max(0,playing2?(now-t02)/1000:paused2),[W,H]=frameSize2(1080);if(pv2.width!==W)pv2.width=W;if(pv2.height!==H)pv2.height=H;render2(p2ctx,W,H,T,false,EDIT)}requestAnimationFrame(tick2)}
$('play2').onclick=()=>{if(playing2){paused2=(performance.now()-t02)/1000;playing2=false;$('play2').textContent='Play'}else{t02=performance.now()-paused2*1000;playing2=true;$('play2').textContent='Pause'}};

function drawPhotos(){const box=$('m_photos');box.textContent='';
 S2.photos.forEach((ph,i)=>{const b=(t,l,f)=>{const x=el('button',{className:'icon',textContent:t,title:l,onclick:e=>{e.stopPropagation();f()}});x.setAttribute('aria-label',l+' photo '+(i+1));return x};
  const sel=i===EDIT;
  const thumb=el('button',{className:'pbtn',title:sel?'Finish editing':'Adjust crop',onclick:()=>setEdit(sel?-1:i)},[el('img',{src:ph.src,className:'pthumb',alt:''})]);thumb.setAttribute('aria-label',(sel?'Finish editing':'Adjust crop for')+' photo '+(i+1));thumb.setAttribute('aria-pressed',String(sel));
  const row=el('div',{className:'prow'+(sel?' on':'')},[el('div',{className:'n',textContent:String(i+1).padStart(2,'0')}),thumb,
   el('div',{className:'ptools'},[el('button',{className:'adj',textContent:sel?'Done':'Adjust',onclick:()=>setEdit(sel?-1:i)}),b('↑','Reorder earlier',()=>mv2(i,-1)),b('↓','Reorder later',()=>mv2(i,1)),b('×','Remove',()=>{S2.photos.splice(i,1);if(EDIT===i)EDIT=-1;else if(EDIT>i)EDIT--;save2();drawPhotos()})])]);
  box.append(row);
  if(sel){const z=el('input',{type:'range',min:'1',max:'3',step:'0.01',value:String(ph.z)});z.setAttribute('aria-label','Scale for photo '+(i+1));
   const zv=el('span',{className:'zv',textContent:Math.round(ph.z*100)+'%'});
   z.oninput=()=>{ph.z=parseFloat(z.value);zv.textContent=Math.round(ph.z*100)+'%';save2()};
   box.append(el('div',{className:'pedit'},[el('p',{className:'hint',textContent:'Use the direction buttons or drag the preview to reposition the photo. Increase Scale for more room to move. Arrow keys also work on the preview.'}),
    el('div',{className:'zrow'},[el('label',{textContent:'Scale'}),z,zv]),
    el('div',{className:'position-controls',role:'group',ariaLabel:'Photo position'},[['↑','Up',0,-1],['←','Left',-1,0],['↓','Down',0,1],['→','Right',1,0]].map(([arrow,label,dx,dy])=>el('button',{type:'button',textContent:arrow+' '+label,title:'Move photo '+label.toLowerCase(),onclick:()=>movePhoto(dx*20,dy*20)}))),
    el('div',{style:'display:flex;gap:8px'},[el('button',{textContent:'Center',onclick:()=>{ph.x=.5;ph.y=.5;ph.z=1;save2();drawPhotos()}}),el('button',{textContent:'Done',onclick:()=>setEdit(-1)})])]))}
 });
 const n=S2.photos.length;$('m_count').textContent=n+' of '+MAX_PHOTOS+(n?', '+(n*S2.dur).toFixed(1)+' s loop':'');
 $('m_addwrap').hidden=n>=MAX_PHOTOS;$('export2').disabled=!n;$('m_empty').hidden=n>0;
 pv2.classList.toggle('editing',EDIT>=0);$('play2').disabled=!n||EDIT>=0}
function setEdit(i){const was=EDIT;EDIT=i;if(i<0&&was>=0){paused2=was*S2.dur+.01;t02=performance.now()-paused2*1000}drawPhotos()}
let drag=null;
pv2.addEventListener('pointerdown',e=>{if(!S2.photos.length)return;if(EDIT<0){setEdit(CURK)}drag={x:e.clientX,y:e.clientY};pv2.setPointerCapture(e.pointerId)});
pv2.addEventListener('pointermove',e=>{if(!drag||EDIT<0||!GEO)return;const r=pv2.getBoundingClientRect(),k=pv2.width/r.width;nudge((e.clientX-drag.x)*k,(e.clientY-drag.y)*k);drag={x:e.clientX,y:e.clientY}});
const endDrag=()=>{if(drag){drag=null;save2()}};pv2.addEventListener('pointerup',endDrag);pv2.addEventListener('pointercancel',endDrag);
function nudge(dx,dy){const ph=S2.photos[EDIT],g=GEO;if(!ph||!g)return;if(g.free){if(Math.abs(g.sw-g.cw)>.5)ph.x=clamp(ph.x+dx/g.s/(g.sw-g.cw));if(Math.abs(g.sh-g.ch)>.5)ph.y=clamp(ph.y+dy/g.s/(g.sh-g.ch));return}if(g.cw>g.sw+.5)ph.x=clamp(ph.x-(dx/g.s)/(g.cw-g.sw));if(g.ch>g.sh+.5)ph.y=clamp(ph.y-(dy/g.s)/(g.ch-g.sh))}
function movePhoto(dx,dy){if(EDIT<0)return;render2(p2ctx,pv2.width,pv2.height,paused2,false,EDIT);nudge(dx,dy);save2()}
pv2.addEventListener('wheel',e=>{if(EDIT<0)return;e.preventDefault();const ph=S2.photos[EDIT];ph.z=Math.max(1,Math.min(3,ph.z*Math.exp(-e.deltaY*.0015)));save2();const z=$('m_photos').querySelector('.pedit input[type=range]');if(z){z.value=ph.z;z.nextSibling.textContent=Math.round(ph.z*100)+'%'}},{passive:false});
pv2.addEventListener('keydown',e=>{if(EDIT<0)return;const st=e.shiftKey?40:10,m={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key];if(m){e.preventDefault();movePhoto(m[0],m[1])}if(e.key==='Escape')setEdit(-1)});
function mv2(i,d){const j=i+d;if(j<0||j>=S2.photos.length)return;[S2.photos[i],S2.photos[j]]=[S2.photos[j],S2.photos[i]];if(EDIT===i)EDIT=j;else if(EDIT===j)EDIT=i;save2();drawPhotos()}
$('m_add').onchange=async e=>{const files=[...e.target.files];e.target.value='';const room=Math.max(0,MAX_PHOTOS-S2.photos.length),use=files.slice(0,room);$('m_msg').textContent=use.length?'Loading '+use.length+(use.length===1?' photo':' photos'):'';
 let bad=0;for(const f of use){try{S2.photos.push({src:await loadPhoto(f),x:.5,y:.5,z:1})}catch(err){bad++}}
 save2();drawPhotos();const notes=[];if(files.length>room)notes.push('Maximum '+MAX_PHOTOS+' photos; skipped '+(files.length-room)+'.');if(bad)notes.push(bad+(bad===1?' file could not be read.':' files could not be read.'));$('m_msg').textContent=notes.join(' ')};
$('m_shape').value=S2.shape==='custom'&&!S2.custom?'ohio':S2.shape;
$('m_shape').onchange=()=>{const v=$('m_shape').value;if(v==='custom'&&!S2.custom){$('m_svg').click();$('m_shape').value=S2.shape;return}S2.shape=v;save2();svgMsg()};
function svgMsg(){$('m_fmt').querySelector('[value="shape"]').textContent=S2.shape==='none'?'Fit to first photo':'Fit to shape';$('m_svgmsg').textContent=S2.shape==='none'?'No mask: images keep their proportions and fit inside the canvas. Fit to first photo uses the first image’s aspect ratio.':S2.shape==='custom'&&S2.custom?'Using your SVG ('+S2.custom.els.length+(S2.custom.els.length===1?' shape).':' shapes).'):'Upload an SVG to use its shape as a mask. Cutouts are preserved.'}
$('m_svg').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const sh=parseSvg(await f.text());S2.custom=sh;S2.shape='custom';$('m_shape').value='custom';save2();svgMsg()}catch(err){$('m_svgmsg').textContent=err.message||'Could not read this SVG.'}};
['trans','fmt'].forEach(k=>{const e=$('m_'+k);e.value=S2[k];e.onchange=()=>{S2[k]=e.value;save2()}});
$('m_dur').value=S2.dur;const durTxt=()=>$('m_durv').textContent=S2.dur.toFixed(1)+' s';durTxt();
$('m_dur').oninput=()=>{S2.dur=parseFloat($('m_dur').value);durTxt();save2();drawPhotos()};
$('m_zoom').checked=S2.zoom;$('m_zoom').onchange=()=>{S2.zoom=$('m_zoom').checked;save2()};
$('m_duo').checked=S2.duo;$('m_duo').onchange=()=>{S2.duo=$('m_duo').checked;save2()};
const COLS2=[['bg','Background'],['dark','Shadows'],['light','Highlights']];
function drawColors2(){const box=$('m_colors');box.textContent='';COLS2.forEach(([key,lab])=>{const id='m_c_'+key;
 const pick=el('input',{type:'color',value:S2[key]});pick.setAttribute('aria-label',lab+', color picker');
 const txt=el('input',{type:'text',value:S2[key].toUpperCase(),id,spellcheck:false,maxLength:7,placeholder:'#416855'});
 const err=el('div',{className:'cerr',textContent:'Use a 6-digit HEX code, such as #416855',hidden:true});
 const ok=h=>{S2[key]=h;pick.value=h;txt.classList.remove('bad');err.hidden=true;save2()};
 pick.oninput=()=>{ok(pick.value);txt.value=pick.value.toUpperCase()};
 txt.oninput=()=>{const h=normHex(txt.value);if(h)ok(h);else if(txt.value.replace('#','').length>=6){txt.classList.add('bad');err.hidden=false}};
 txt.onblur=()=>{const h=normHex(txt.value);if(h)txt.value=h.toUpperCase();else{txt.classList.add('bad');err.hidden=false}};
 txt.onkeydown=e=>{if(e.key==='Enter')txt.blur()};
 box.append(el('div',{className:'crow'},[el('label',{htmlFor:id,textContent:lab}),pick,txt,err]))})}
drawColors2();
$('m_pal').onclick=()=>{Object.assign(S2,{dark:$('c1').value,light:$('c2').value,duo:true});$('m_duo').checked=true;save2();drawColors2()};

function medianCut(px,k){let boxes=[px];
 const range=b=>{let mn=[255,255,255],mx=[0,0,0];for(const p of b)for(let c=0;c<3;c++){if(p[c]<mn[c])mn[c]=p[c];if(p[c]>mx[c])mx[c]=p[c]}const r=[0,1,2].map(c=>mx[c]-mn[c]);const ch=r.indexOf(Math.max(...r));return[r[ch],ch]};
 while(boxes.length<k){let bi=-1,bs=-1,bc=0;boxes.forEach((b,i)=>{if(b.length<2)return;const[r,ch]=range(b),sc=r*Math.sqrt(b.length);if(sc>bs){bs=sc;bi=i;bc=ch}});if(bi<0||bs<=0)break;
  const b=boxes[bi].sort((a,c)=>a[bc]-c[bc]),m=b.length>>1;boxes.splice(bi,1,b.slice(0,m),b.slice(m))}
 return boxes.map(b=>{const s=[0,0,0];for(const p of b){s[0]+=p[0];s[1]+=p[1];s[2]+=p[2]}return s.map(v=>Math.round(v/b.length))})}
async function exportGif2(){
 const btn=$('export2'), controls=[...$('maskWorkspace').querySelectorAll('button,input,select')].map(e=>[e,e.disabled]);controls.forEach(([e])=>e.disabled=true);$('fallback2').hidden=true;
 try{await Promise.all(S2.photos.map(s=>getImg(s.src).p));
  const fps=+$('fps2').value,delay=Math.round(100/fps),[W,H]=frameSize2(+$('size2').value),n=S2.photos.length,total=Math.round(n*S2.dur*fps);
  const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{willReadFrequently:true});
  const keepEdit=EDIT;$('status2').textContent='Preparing colors';await new Promise(r=>setTimeout(r,0));
  const samp=[],step=Math.max(1,Math.floor(W*H/9000));const times=[];for(let i=0;i<n;i++){times.push(i*S2.dur+S2.dur*.6);if(n>1&&S2.trans==='fade')times.push(i*S2.dur+.3)}
  const transp=$('tr2').checked;
  for(const T of times){render2(ctx,W,H,T);const d=ctx.getImageData(0,0,W,H).data;for(let i=0;i<W*H;i+=step){const j=i*4;samp.push([d[j],d[j+1],d[j+2]])}}
  const fixed=[S2.bg,S2.dark,S2.light].map(hex),pal=fixed.concat(medianCut(samp,252)).slice(0,255);
  const Q=makeQuant(pal,S2.bg,transp,$('dith2').checked),gw=GifWriter(W,H,Q.full);let prev=null;
  for(let f=0;f<total;f++){render2(ctx,W,H,f/fps,transp);const idx=Q.run(ctx.getImageData(0,0,W,H).data,W,H);
   if(transp)gw.frame(idx,0,0,W,H,delay,2,Q.T);else if(!prev)gw.frame(idx,0,0,W,H,delay,1,Q.T);else{let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++){const o=y*W;for(let x=0;x<W;x++)if(idx[o+x]!==prev[o+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;y1=y}}
    if(x1<0){x0=0;y0=0;x1=0;y1=0}const fw=x1-x0+1,fh=y1-y0+1,sub=new Uint8Array(fw*fh);for(let y=0;y<fh;y++)sub.set(idx.subarray((y+y0)*W+x0,(y+y0)*W+x0+fw),y*fw);gw.frame(sub,x0,y0,fw,fh,delay,1,Q.T)}
   prev=idx;if(f%2===0){$('status2').textContent='Generating GIF, frame '+(f+1)+' of '+total;await new Promise(r=>setTimeout(r,0))}}
  const bytes=gw.end(),blob=new Blob([bytes],{type:'image/gif'}),mb=(bytes.length/1048576).toFixed(1),name=(S2.shape==='none'?'public-free-':'public-mask-')+n+'-photos.gif';
  const url=URL.createObjectURL(blob),a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  $('status2').textContent='GIF downloaded ('+mb+' MB): '+name;
 }catch(e){$('status2').textContent='Could not generate the GIF: '+(e&&e.message||e)}finally{controls.forEach(([e,disabled])=>e.disabled=disabled);btn.disabled=!S2.photos.length}}
$('export2').onclick=exportGif2;
$('tr2').onchange=()=>$('trh2').hidden=!$('tr2').checked;


drawPhotos();svgMsg();document.fonts.ready.then(()=>requestAnimationFrame(tick2));

})();

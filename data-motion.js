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
function GifWriter(w,h,pal,transparent=false){const B=ByteBuf();for(const c of 'GIF89a')B.b(c.charCodeAt(0));B.w16(w);B.w16(h);B.b(0xF7);B.b(0);B.b(0);
for(let i=0;i<256;i++){const p=pal[i]||[0,0,0];B.b(p[0]);B.b(p[1]);B.b(p[2])}
B.b(0x21);B.b(0xFF);B.b(11);for(const c of 'NETSCAPE2.0')B.b(c.charCodeAt(0));B.b(3);B.b(1);B.w16(0);B.b(0);
return{frame(idx,x,y,fw,fh,delay){B.b(0x21);B.b(0xF9);B.b(4);B.b(transparent?0x09:0x04);B.w16(delay);B.b(0);B.b(0);B.b(0x2C);B.w16(x);B.w16(y);B.w16(fw);B.w16(fh);B.b(0);lzw(idx,8,B)},end(){B.b(0x3B);return B.out()}}}


const $=id=>document.getElementById('dm_'+id);
const RATIO={'1:1':1,'4:5':1.25,'9:16':16/9,'16:9':9/16,'5:1':1/5};
const DEF={items:[],fmt:'1:1',dur:3,numStyle:'roll',transparent:false,bg:'#f0ecdd',map:'#cdd0db',ink:'#495a99',acc:'#495a99',dot:'#ffffff'};
const KEY='public-data-motion-v1';
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
S={...DEF,...S};if(!Array.isArray(S.items))S.items=[];
let selected=0,playing=true,paused=0,t0=performance.now(),exporting=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));$('status').textContent=''}catch(e){$('status').textContent='Browser storage is full. Keep this page open to retain your changes.'}}
function layout(fmt,W,H){return{x0:W*.07,xr:W*.93,numY:H*.24,numSize:Math.min(W*.19,H*.25),textW:W*.86,bottom:H*.92}}
const clamp=v=>v<0?0:v>1?1:v;
const eOut=p=>1-Math.pow(1-p,3),eIn=p=>p*p*p,eIO=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
function setFont(ctx,w,px,ls){ctx.font=w+' '+px+'px Instrument Sans, "Helvetica Neue", Arial, sans-serif';if('letterSpacing' in ctx)ctx.letterSpacing=(ls||0)+'px'}
function parseNum(v){const m=/^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/.exec(String(v).trim());if(!m)return null;const raw=m[2];return{pre:m[1],num:parseFloat(raw.replace(/,/g,'')),dec:(raw.split('.')[1]||'').length,comma:raw.includes(','),suf:m[3]}}
function parseRatio(v){const m=/(\d+)\s*(?:in|of|de|en|\/)\s*(\d+)/i.exec(String(v));return m?[+m[1],+m[2]]:null}
function fmtNum(p,x){const s=p.comma?x.toLocaleString('en-US',{minimumFractionDigits:p.dec,maximumFractionDigits:p.dec}):x.toFixed(p.dec);return p.pre+s+p.suf}
function wrap(ctx,text,maxW){const words=String(text).split(/\s+/).filter(Boolean),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
function hex(h){const v=parseInt(h.slice(1),16);return[v>>16&255,v>>8&255,v&255]}

function slideLine(ctx,text,x,y,asc,desc,t,delay,D,W){
 const inP=eOut(clamp((t-delay)/.55)),outP=eIn(clamp((t-(D-.42)-delay*.4)/.36));
 const h=asc+desc,off=(1-inP)*h-outP*h;if(inP<=0||outP>=1)return;
 ctx.save();ctx.beginPath();ctx.rect(0,y-asc,W,h);ctx.clip();ctx.fillText(text,x,y+off);ctx.restore();
}
function rollNumber(ctx,str,x,y,size,t,D,W){
 const asc=size*.95,desc=size*.36,h=asc+desc,outP=eIn(clamp((t-(D-.42))/.36));if(outP>=1)return;const off=-outP*h;
 ctx.save();ctx.beginPath();ctx.rect(0,y-asc,W,h);ctx.clip();
 const nd=(str.match(/\d/g)||[]).length;let j=0;
 for(let i=0;i<str.length;i++){const ch=str[i],px=x+ctx.measureText(str.slice(0,i)).width;
  if(!/\d/.test(ch)){const p=eOut(clamp((t-.15)/.5));ctx.fillText(ch,px,y+off+(1-p)*h);continue}
  const cw=ctx.measureText(ch).width,spins=1+Math.min(2,j),travel=spins*10+(+ch);
  const p=eOut(clamp((t-.03*j)/(.8+.1*j))),v=p*travel,lo=Math.floor(v),fr=v-lo,a=lo%10,b=(lo+1)%10;
  const cx=px+cw/2;ctx.textAlign='center';
  ctx.fillText(String(a),cx,y+off-fr*h);if(fr>0)ctx.fillText(String(b),cx,y+off+(1-fr)*h);
  ctx.textAlign='left';j++;if(j>=nd)j=nd}
 ctx.restore();
}
function textInfo(ctx,L,it,u){
 let size=L.numSize;setFont(ctx,600,size,-.045*size);const full=it.value||' ',mw=ctx.measureText(full).width;if(mw>L.textW)size*=L.textW/mw;
 const ls=Math.min(42*u,L.numSize*.25);setFont(ctx,600,ls,-.6*u);const lines=wrap(ctx,it.label||'',L.textW*.82);
 let y=L.numY+size*.36+ls*1.15;const ly=[];lines.forEach(()=>{ly.push(y);y+=ls*1.18});
 const ns=Math.min(26*u,L.numSize*.16),ny=[];let nl=[];if(it.note){setFont(ctx,500,ns);y+=ns*.7;nl=wrap(ctx,it.note,L.textW*.7);nl.forEach(()=>{ny.push(y);y+=ns*1.35})}
 const bottom=nl.length?ny[ny.length-1]+ns*.4:ly.length?ly[ly.length-1]+ls*.3:L.numY+size*.36;
 return{size,ls,lines,ly,ns,nl,ny,bottom};
}


const VIS=[['number','Number only'],['rectangle','Rectangle · number + text'],['circle','Circles'],['square','Squares'],['triangle','Triangles'],['diamond','Diamonds'],['house','Houses'],['car','Cars'],['person','People'],['building','Buildings'],['tree','Trees'],['briefcase','Jobs / briefcases'],['bar','Progress bar'],['donut','Donut chart']];
const bounded=(v,min,max,fallback)=>Number.isFinite(+v)&&v!==''?Math.max(min,Math.min(max,+v)):fallback;
function counts(it){const total=Math.round(bounded(it.total,1,100,10));return[Math.round(bounded(it.on,0,total,0)),total]}
function iconPath(ctx,type,x,y,s){
 ctx.beginPath();const p=(a,b)=>[x+a*s,y+b*s];
 const poly=pts=>{ctx.moveTo(...p(...pts[0]));pts.slice(1).forEach(q=>ctx.lineTo(...p(...q)));ctx.closePath()};
 const rect=(a,b,w,h)=>ctx.rect(x+a*s,y+b*s,w*s,h*s);
 const circle=(a,b,r)=>{ctx.moveTo(x+(a+r)*s,y+b*s);ctx.arc(x+a*s,y+b*s,r*s,0,2*Math.PI)};
 if(type==='circle')circle(.5,.5,.43);
 else if(type==='triangle')poly([[.5,.06],[.95,.94],[.05,.94]]);
 else if(type==='diamond')poly([[.5,.02],[.98,.5],[.5,.98],[.02,.5]]);
 else if(type==='house')poly([[.05,.43],[.5,.05],[.95,.43],[.95,.95],[.05,.95]]);
 else if(type==='car'){poly([[.03,.4],[.18,.35],[.3,.12],[.69,.12],[.83,.35],[.97,.43],[.97,.74],[.03,.74]]);circle(.24,.82,.12);circle(.76,.82,.12)}
 else if(type==='person'){circle(.5,.16,.13);poly([[.33,.35],[.67,.35],[.79,.64],[.65,.68],[.61,.95],[.39,.95],[.35,.68],[.21,.64]])}
 else if(type==='building'){rect(.12,.3,.76,.65);rect(.3,.05,.4,.25)}
 else if(type==='tree'){poly([[.5,.04],[.9,.52],[.73,.52],[.98,.8],[.57,.8],[.57,.98],[.43,.98],[.43,.8],[.02,.8],[.27,.52],[.1,.52]])}
 else if(type==='briefcase'){rect(.04,.3,.92,.6);rect(.32,.1,.36,.2)}
 else rect(.07,.07,.86,.86);
}
function drawVisual(ctx,L,S,it,t,T,TI,W,H){
 t=t*3/S.dur;const v=it.visual||'number';if(v==='number')return;
 const top=TI.bottom+H*.055,ah=L.bottom-top,aw=L.xr-L.x0;if(ah<20)return;
 const [on,total]=counts(it),progress=eOut(clamp((t-.25)/.9)),ratio=on/total;
 ctx.lineJoin='round';ctx.lineCap='round';
 if(v==='bar'){
  const h=Math.min(ah*.45,W*.085),y=top+(ah-h)/2;ctx.fillStyle=S.map;ctx.fillRect(L.x0,y,aw,h);ctx.fillStyle=S.ink;ctx.fillRect(L.x0,y,aw*ratio*progress,h);return;
 }
 if(v==='donut'){ctx.lineCap='butt';
  const r=Math.min(aw,ah)*.38,cx=W/2,cy=top+ah/2;ctx.lineWidth=r*.3;ctx.strokeStyle=S.map;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  if(on){ctx.strokeStyle=S.ink;ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+2*Math.PI*ratio*progress);ctx.stroke()}return;
 }
 const cols=total<=5?total:total<=12?Math.min(6,total):Math.min(10,Math.ceil(Math.sqrt(total*aw/ah))),rows=Math.ceil(total/cols);
 const cell=Math.min(aw/cols,ah/rows,W*.22),size=cell*.72,left=L.x0+(aw-cell*cols)/2;
 for(let i=0;i<total;i++){
  const appear=eOut(clamp((t-.6*i/Math.max(1,total))/.3));if(!appear)continue;
  const x=left+(i%cols)*cell+cell*.14,y=top+Math.floor(i/cols)*cell+cell*.1+(1-appear)*cell*.15;
  ctx.globalAlpha=appear;ctx.lineWidth=Math.max(1.5,W/400);ctx.strokeStyle=S.ink;
  iconPath(ctx,v,x,y,size);ctx.fillStyle=S.map;ctx.fill();ctx.stroke();
  if(i<on){const fill=eOut(clamp((t-.3-.6*i/Math.max(on,1))/.35));ctx.save();iconPath(ctx,v,x,y,size);ctx.clip();ctx.fillStyle=S.ink;ctx.fillRect(x,y+size*(1-fill),size,size*fill+1);ctx.restore()}
  ctx.globalAlpha=1;
 }
}
function rectangleBlocks(it){
 if(!Array.isArray(it.blocks)||!it.blocks.length)it.blocks=[{value:it.value||'',label:it.label||''}];
 return it.blocks.slice(0,6);
}
function drawRectangle(ctx,W,H,t,S,it){
 const blocks=rectangleBlocks(it),bw=W*.88/blocks.length,cw=bw*.86;
 const panelH=Math.min(H,W/5),top=(H-panelH)/2;
 // Keep a horizontal composition in every export format.
 const titleSize=panelH*.075;
 if(it.title){setFont(ctx,400,titleSize);ctx.fillStyle=S.ink;ctx.fillText(it.title,W*.06,top+panelH*.18,W*.88)}
 const numberY=top+panelH*(it.title?.60:.53),labelY=numberY+panelH*.19;
 const duration=S.dur,local=t/duration*3;
 blocks.forEach((block,i)=>{
  const delay=i*.13,p=eOut(clamp((local-delay)/.48)),out=eIn(clamp((local-2.7)/.3));
  if(!p||out>=1)return;
  ctx.save();ctx.globalAlpha=p*(1-out);ctx.translate(0,(1-p)*panelH*.09);
  const value=String(block.value||''),label=String(block.label||'').trim().split(/\s+/).slice(0,4).join(' '),center=W*.06+bw*(i+.5);
  let size=panelH*.33;setFont(ctx,600,size,-size*.045);size*=Math.min(1,cw/Math.max(1,ctx.measureText(value).width));setFont(ctx,600,size,-size*.045);
  ctx.fillStyle=S.ink;const x=center-ctx.measureText(value).width/2,pn=parseNum(value),nt=Math.max(0,local-delay);
  if(S.numStyle==='roll'&&pn)rollNumber(ctx,value,x,numberY,size,nt,10,W);
  else{const shown=S.numStyle==='count'&&pn?fmtNum(pn,pn.num*eOut(clamp(nt/.8))):value;ctx.textAlign='center';ctx.fillText(shown,center,numberY)}
  let ls=panelH*.105;setFont(ctx,400,ls);let lines=wrap(ctx,label,cw);
  while(ls>panelH*.045&&(lines.length>2||lines.some(line=>ctx.measureText(line).width>cw))){ls*=.9;setFont(ctx,400,ls);lines=wrap(ctx,label,cw)}
  ctx.textAlign='center';lines.forEach((line,j)=>ctx.fillText(line,center,labelY+j*ls*1.15,cw));ctx.restore();
 });
 setFont(ctx,400,16,0);
}
function sig(it){return it.visual||'number'}
function render(ctx,W,H,T,S){
 const L=layout(S.fmt,W,H),u=W/1080,n=S.items.length,D=S.dur;
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.globalAlpha=1;
 if(S.transparent)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S.bg;ctx.fillRect(0,0,W,H);}
 if(!n)return
 const k=Math.floor(T/D)%n,t=T-Math.floor(T/D)*D,it=S.items[k];
 if(it.visual==='rectangle'){drawRectangle(ctx,W,H,t,S,it);return}
 const TI=textInfo(ctx,L,it,u);
 const prev=S.items[(k-1+n)%n],wipe=n>1&&sig(prev)!==sig(it)&&prev.visual!=='rectangle'&&t<.6;
 if(wipe){drawVisual(ctx,L,S,prev,D,T,textInfo(ctx,L,prev,u),W,H);const p=eIO(t/.6);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H*p);ctx.clip();if(S.transparent)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=S.bg;ctx.fillRect(0,0,W,H);}drawVisual(ctx,L,S,it,t,T,TI,W,H);ctx.restore()}
 else drawVisual(ctx,L,S,it,t,T,TI,W,H);
 ctx.fillStyle=S.ink;const size=TI.size;setFont(ctx,600,size,-.045*size);
 const pn=parseNum(it.value),x=L.x0-size*.04;
 if(S.numStyle==='roll'&&pn)rollNumber(ctx,it.value.trim(),x,L.numY,size,t,D,W);
 else{const shown=S.numStyle==='count'&&pn?fmtNum(pn,pn.num*eOut(clamp(t/.95))):(it.value||' ');slideLine(ctx,shown,x,L.numY,size*.95,size*.36,t,0,D,W)}
 setFont(ctx,600,TI.ls,-.6*u);TI.lines.forEach((ln,i)=>slideLine(ctx,ln,L.x0,TI.ly[i],TI.ls,TI.ls*.3,t,.09+i*.05,D,W));
 if(TI.nl.length){ctx.fillStyle=S.acc;setFont(ctx,500,TI.ns);TI.nl.forEach((ln,i)=>slideLine(ctx,ln,L.x0,TI.ny[i],TI.ns*1.05,TI.ns*.35,t,.2+i*.04,D,W))}
 setFont(ctx,400,16,0);
}


const pv=$('preview'),ctx=pv.getContext('2d');
function time(){return playing?(performance.now()-t0)/1000:paused}
function tick(){if(!document.getElementById('dataWorkspace').hidden&&!document.hidden){const H=Math.round(1080*RATIO[S.fmt]);if(pv.height!==H)pv.height=H;render(ctx,1080,H,time(),S);$('position').textContent=S.items.length?'Frame '+(Math.floor(time()/S.dur)%S.items.length+1)+' of '+S.items.length:'Add a data item to begin'}requestAnimationFrame(tick)}
function focusItem(i){selected=i;paused=i*S.dur+Math.min(1.5,S.dur*.6);playing=false;$('play').textContent='Play';drawItems()}
function el(tag,attrs={},kids=[]){const e=document.createElement(tag);Object.assign(e,attrs);kids.forEach(k=>k&&e.append(k));return e}
function rectangleEditor(it,itemIndex){
 const blocks=rectangleBlocks(it),box=el('div',{className:'dm-blocks'});
 box.append(el('p',{className:'hint',textContent:'1–6 blocks · up to 4 words per label · appears left to right.'}));
 blocks.forEach((block,j)=>{
  const row=el('div',{className:'dm-block'});
  for(const [key,label]of [['value','Number'],['label','Text (max. 4 words)']]){
   const input=el('input',{type:'text',value:block[key]||'',maxLength:key==='value'?24:100});
   input.setAttribute('aria-label',label+' for block '+(j+1)+' of item '+(itemIndex+1));
   input.oninput=()=>{if(key==='label'&&input.value.trim().split(/\s+/).length>4)input.value=input.value.trim().split(/\s+/).slice(0,4).join(' ');block[key]=input.value;save()};
   row.append(el('label',{className:'dm-field'},[el('span',{textContent:label}),input]));
  }
  const actions=el('div',{className:'dm-actions'});
  for(const [text,label,disabled,fn]of [
   ['←','Move block left',j===0,()=>{[it.blocks[j-1],it.blocks[j]]=[it.blocks[j],it.blocks[j-1]]}],
   ['→','Move block right',j===blocks.length-1,()=>{[it.blocks[j+1],it.blocks[j]]=[it.blocks[j],it.blocks[j+1]]}],
   ['×','Remove block',blocks.length===1,()=>it.blocks.splice(j,1)]]){
   const button=el('button',{className:'btn small',textContent:text,disabled,title:label,onclick:()=>{fn();save();drawItems()}});button.setAttribute('aria-label',label+' '+(j+1));actions.append(button);
  }
  row.append(actions);box.append(row);
 });
 box.append(el('button',{className:'btn small',textContent:'+ Add block ('+blocks.length+' / 6)',disabled:blocks.length>=6,onclick:()=>{it.blocks.push({value:'',label:''});save();drawItems()}}));
 return box;
}
function drawItems(){
 const box=$('items');box.textContent='';
 S.items.forEach((it,i)=>{
  const field=(key,label,type='text')=>{const input=el('input',{type,value:it[key]??'',maxLength:key==='value'?24:key==='label'?100:140});input.setAttribute('aria-label',label+' for item '+(i+1));if(type==='number'){input.min=key==='total'?'1':'0';input.max='100';input.step='1'}input.oninput=()=>{it[key]=input.value;if(type==='number'){const [on,total]=counts(it);it.on=on;it.total=total}save()};input.onchange=()=>{if(type==='number')drawItems()};return el('label',{className:'dm-field'},[el('span',{textContent:label}),input])};
  const visual=el('select');VIS.forEach(([value,textContent])=>visual.append(el('option',{value,textContent})));visual.value=it.visual;visual.setAttribute('aria-label','Visual for item '+(i+1));visual.onchange=()=>{it.visual=visual.value;if(it.visual==='rectangle'){rectangleBlocks(it);S.fmt='5:1';$('fmt').value=S.fmt}save();focusItem(i)};
  const action=(text,label,fn)=>{const b=el('button',{className:'btn small',textContent:text,title:label,onclick:fn});b.setAttribute('aria-label',label+' item '+(i+1));return b};
  box.append(el('section',{className:'dm-item'+(selected===i?' selected':'')},[
   el('div',{className:'toolbar'},[action('Preview '+(i+1),'Preview',()=>focusItem(i)),el('div',{className:'dm-actions'},[
    action('↑','Move earlier',()=>move(i,-1)),action('↓','Move later',()=>move(i,1)),action('Copy','Duplicate',()=>{if(S.items.length>=20)return;S.items.splice(i+1,0,JSON.parse(JSON.stringify(it)));save();focusItem(i+1)}),action('×','Remove',()=>{S.items.splice(i,1);save();focusItem(Math.max(0,Math.min(i,S.items.length-1)))})])]),
   ...(it.visual==='rectangle'?[field('title','Title (optional)'),rectangleEditor(it,i)]:[field('value','Value'),field('label','Label'),field('note','Source / note')]),el('label',{className:'dm-field'},[el('span',{textContent:'Visual'}),visual]),
   !['number','rectangle'].includes(it.visual)?el('div',{className:'dm-counts'},[field('on','Highlighted','number'),field('total','Total','number')]):null
  ]));
 });
 $('empty').hidden=!!S.items.length;$('export').disabled=!S.items.length;$('png').disabled=!S.items.length;$('play').disabled=!S.items.length;$('add').disabled=S.items.length>=20;
 $('count').textContent=S.items.length+' / 20';
}
function move(i,d){const j=i+d;if(j<0||j>=S.items.length)return;[S.items[i],S.items[j]]=[S.items[j],S.items[i]];save();focusItem(j)}
$('add').onclick=()=>{if(S.items.length>=20)return;S.items.push({value:'',label:'',note:'',visual:'circle',on:0,total:10});save();focusItem(S.items.length-1)};
$('play').onclick=()=>{if(playing){paused=time();playing=false}else{t0=performance.now()-paused*1000;playing=true}$('play').textContent=playing?'Pause':'Play'};
$('restart').onclick=()=>{paused=0;t0=performance.now();playing=true;$('play').textContent='Pause'};
for(const key of ['fmt','dur','numStyle']){const e=$(key);e.value=S[key];e.oninput=()=>{S[key]=key==='dur'?+e.value:e.value;$('durValue').textContent=S.dur.toFixed(1)+' s';paused=Math.min(selected,Math.max(0,S.items.length-1))*S.dur+S.dur*.6;t0=performance.now()-paused*1000;save()}}
$('durValue').textContent=S.dur.toFixed(1)+' s';
$('transparent').checked=!!S.transparent;
pv.classList.toggle('dm-transparent',!!S.transparent);
$('transparent').onchange=()=>{S.transparent=$('transparent').checked;pv.classList.toggle('dm-transparent',S.transparent);save()};
function drawColors(){const box=$('colors');box.textContent='';for(const [key,label] of [['bg','Background'],['ink','Text / filled'],['map','Unfilled'],['acc','Source / note']]){const input=el('input',{type:'color',value:S[key]});input.setAttribute('aria-label',label);input.oninput=()=>{S[key]=input.value;save()};box.append(el('label',{className:'dm-color'},[el('span',{textContent:label}),input]))}}
$('palette').onclick=()=>{S.ink=document.getElementById('c1').value;S.map=document.getElementById('c2').value;S.acc=S.ink;save();drawColors()};
function buildPalette(){const base=[...new Set([S.bg,S.map,S.ink,S.acc,S.dot,'#ffffff'].map(x=>x.toLowerCase()))].map(hex);const pal=base.slice();
 const pairs=[];for(let i=0;i<base.length;i++)for(let j=i+1;j<base.length;j++)pairs.push([base[i],base[j]]);
 const ink=hex(S.ink.toLowerCase()),mp=hex(S.map.toLowerCase());const extra=40;for(let s=1;s<=extra;s++){const f=s/(extra+1);pal.push([0,1,2].map(c=>Math.round(ink[c]+(mp[c]-ink[c])*f)))}
 const steps=Math.max(2,Math.floor((256-pal.length)/Math.max(1,pairs.length)));
 for(const[a,b]of pairs)for(let s=1;s<=steps;s++){const f=s/(steps+1);pal.push([0,1,2].map(c=>Math.round(a[c]+(b[c]-a[c])*f)))}
 return pal.slice(0,256)}

function download(blob,name){const url=URL.createObjectURL(blob),a=el('a',{href:url,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('png').onclick=async()=>{await document.fonts.ready;const W=+$('size').value,H=Math.round(W*RATIO[S.fmt]),c=document.createElement('canvas');c.width=W;c.height=H;render(c.getContext('2d'),W,H,Math.min(selected,S.items.length-1)*10+5,{...S,dur:10});c.toBlob(blob=>{if(blob){download(blob,'public-data-motion.png');$('status').textContent='PNG downloaded'}})};
$('export').onclick=async()=>{
 if(exporting||!S.items.length)return;exporting=true;const controls=[...document.getElementById('dataWorkspace').querySelectorAll('button,input,select')].map(e=>[e,e.disabled]);controls.forEach(([e])=>e.disabled=true);
 try{
  await document.fonts.ready;const W=+$('size').value,H=Math.round(W*RATIO[S.fmt]/2)*2,fps=+$('fps').value,total=Math.round(S.items.length*S.dur*fps),delay=Math.round(100/fps),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d',{willReadFrequently:true}),pal=S.transparent?[[0,0,0],...buildPalette().slice(0,255)]:buildPalette(),lut=new Int16Array(1<<18).fill(-1),gif=GifWriter(W,H,pal,S.transparent);
  function near(r,g,b){const key=(r>>2)<<12|(g>>2)<<6|(b>>2);if(lut[key]>=0)return lut[key];let best=0,dist=Infinity;pal.forEach((p,i)=>{if(S.transparent&&i===0)return;const d=2*(p[0]-r)**2+4*(p[1]-g)**2+3*(p[2]-b)**2;if(d<dist){dist=d;best=i}});return lut[key]=best}
  for(let f=0;f<total;f++){render(x,W,H,f/fps,S);const data=x.getImageData(0,0,W,H).data,idx=new Uint8Array(W*H);for(let i=0;i<idx.length;i++)idx[i]=S.transparent&&data[i*4+3]<128?0:near(data[i*4],data[i*4+1],data[i*4+2]);gif.frame(idx,0,0,W,H,delay);if(f%2===0){$('status').textContent='Generating GIF: '+(f+1)+' / '+total+' frames';await new Promise(r=>setTimeout(r,0))}}
  const blob=new Blob([gif.end()],{type:'image/gif'});download(blob,'public-data-motion.gif');$('status').textContent='GIF downloaded ('+(blob.size/1048576).toFixed(1)+' MB)';
 }catch(e){$('status').textContent='Could not export GIF: '+e.message}finally{exporting=false;controls.forEach(([e,disabled])=>e.disabled=disabled)}
};
drawItems();drawColors();document.fonts.ready.then(()=>requestAnimationFrame(tick));
})();

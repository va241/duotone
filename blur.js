/* Local background processing. Edge replication prevents dark borders. */
const BackgroundBlur = (() => {
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function box(src,dst,w,h,r,horizontal){
    const length=horizontal?w:h,lines=horizontal?h:w,step=horizontal?4:w*4;
    const size=2*r+1;
    for(let line=0;line<lines;line++){
      const start=horizontal?line*w*4:line*4;
      for(let ch=0;ch<4;ch++){
        let sum=0;
        for(let k=-r;k<=r;k++)sum+=src[start+Math.max(0,Math.min(length-1,k))*step+ch];
        for(let i=0;i<length;i++){
          dst[start+i*step+ch]=sum/size;
          sum+=src[start+Math.min(length-1,i+r+1)*step+ch]-src[start+Math.max(0,i-r)*step+ch];
        }
      }
    }
  }
  function gaussian(ctx,sigma){
    const {width:w,height:h}=ctx.canvas,im=ctx.getImageData(0,0,w,h);
    const a=new Float32Array(im.data.length),b=new Float32Array(a.length);
    // Premultiply so transparent pixels cannot produce colored halos.
    for(let i=0;i<a.length;i+=4){const alpha=im.data[i+3]/255;for(let c=0;c<3;c++)a[i+c]=im.data[i+c]*alpha;a[i+3]=im.data[i+3];}
    // Three sliding box passes approximate a Gaussian, with work independent of radius.
    let low=Math.floor(Math.sqrt(4*sigma*sigma+1));if(low%2===0)low--;low=Math.max(1,low);
    const high=low+2,m=Math.round((12*sigma*sigma-3*low*low-12*low-9)/(-4*low-4));
    for(let pass=0;pass<3;pass++){
      const r=((pass<m?low:high)-1)/2;
      box(a,b,w,h,r,true);box(b,a,w,h,r,false);
    }
    for(let i=0;i<a.length;i+=4){const alpha=a[i+3]/255;for(let c=0;c<3;c++)im.data[i+c]=alpha>0?a[i+c]/alpha:0;im.data[i+3]=a[i+3];}
    ctx.putImageData(im,0,0);
  }
  function motion(ctx,distance,angle){
    const {width:w,height:h}=ctx.canvas,rad=angle*Math.PI/180;
    const dx=Math.cos(rad),dy=Math.sin(rad);
    const px=Math.ceil(Math.abs(dx)*distance/2)+2,py=Math.ceil(Math.abs(dy)*distance/2)+2;
    let a=surface(w+px*2,h+py*2),b=surface(a.width,a.height),x=a.getContext('2d');
    // Extend the four edges and corners before accumulating shifted copies.
    const source=ctx.canvas;
    x.drawImage(source,px,py);
    x.drawImage(source,0,0,w,1,px,0,w,py);x.drawImage(source,0,h-1,w,1,px,py+h,w,py);
    x.drawImage(source,0,0,1,h,0,py,px,h);x.drawImage(source,w-1,0,1,h,px+w,py,px,h);
    for(const right of [false,true])for(const bottom of [false,true])x.drawImage(source,right?w-1:0,bottom?h-1:0,1,1,right?px+w:0,bottom?py+h:0,px,py);
    // Doubling the samples each pass gives a continuous directional blur in O(log distance) draws.
    const count=2**Math.ceil(Math.log2(Math.max(2,distance*2))),step=distance/(count-1);
    for(let samples=1;samples<count;samples*=2){
      x=b.getContext('2d');x.clearRect(0,0,b.width,b.height);x.globalAlpha=.5;x.globalCompositeOperation='lighter';
      const offset=step*samples/2;
      x.drawImage(a,-dx*offset,-dy*offset);x.drawImage(a,dx*offset,dy*offset);
      x.globalAlpha=1;x.globalCompositeOperation='source-over';[a,b]=[b,a];
    }
    ctx.clearRect(0,0,w,h);ctx.drawImage(a,px,py,w,h,0,0,w,h);
  }
  return {apply(ctx,type,amount,angle){
    if(amount<=0)return;
    const size=Math.min(ctx.canvas.width,ctx.canvas.height)*amount/100;
    if(type==='motion')motion(ctx,size*4,angle);else gaussian(ctx,size);
  }};
})();

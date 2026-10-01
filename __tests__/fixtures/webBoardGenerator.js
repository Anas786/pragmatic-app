/* eslint-disable no-bitwise, no-return-assign, no-sequences, no-shadow, yoda -- verbatim minifier output, byte-identical on purpose */
/**
 * VERBATIM minified web board generator, extracted mechanically (no
 * retyping) from the production web bundle: `ac` (clamp), `ah` (segment
 * builder) and the anonymous generator the web calls with
 * {width, height, keepOut, seed: 7, tl}. Used ONLY by
 * __tests__/splashBoard.test.ts as the parity oracle for
 * src/components/screens/Onboarding/Splash/board.ts.
 * Lint rules above are disabled: minifier output, kept byte-identical.
 */
const ac=(e,o,r)=>Math.min(r,Math.max(o,e));
const ah=(e,o)=>{let r=[0];for(let o=1;o<e.length;o++)r.push(r[o-1]+Math.hypot(e[o].x-e[o-1].x,e[o].y-e[o-1].y));let t=[];for(let o=1;o<e.length-1;o++)t.push({x:e[o].x,y:e[o].y,at:r[o]});return{pts:e,seg:r,len:r[r.length-1],vias:t,...o}};
const webBoard = function({width:e,height:o,keepOut:r,seed:t=11,tl:n}){let l,i=(l=t>>>0,()=>{let e=l=l+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}),{cx:a,cy:s,rx:d,ry:c}=r,h=ac(Math.round(e*o/3e4),24,56),u=[];for(let r=0;r<h;r++){let t=2*Math.PI/h,l=(r+.5)*t+(i()-.5)*t*.8,p=Math.cos(l),k=Math.sin(l),m=1+i()*(Math.abs(k)>.7?.7:.42),g={x:a+d*m*p,y:s+c*m*k},f=p>=0?1:-1,M=k>=0?1:-1,y=Math.abs(p),v=y>=Math.abs(k)?"x":"y",b=y>.45&&y<.9&&.5>i(),w=f>0?e+48:-48,C=M>0?o+48:-48,x=(e,o,r)=>"x"===o?{x:e.x+f*r,y:e.y}:{x:e.x,y:e.y+M*r},j=(e,o,r,t=1)=>"x"===o?{x:e.x+f*r,y:e.y+M*t*r}:{x:e.x+f*t*r,y:e.y+M*r},L=(e,o)=>"x"===o?{x:w,y:e.y}:{x:e.x,y:C},V=[g],z=null,H=g;if(b){H=j(H,v,50+190*i()),V.push(H);let e=.5>i()?"x":"y";.25>i()?(H=x(H,e,60+170*i()),V.push(H),z=H):V.push(L(H,e))}else H=x(H,v,24+i()*("y"===v?220:150)),V.push(H),H=j(H,v,36+170*i()),V.push(H),.42>i()&&(H=x(H,v,70+220*i()),V.push(H),H=j(H,v,30+110*i(),.6>i()?1:-1),V.push(H)),.2>i()?(H=x(H,v,60+170*i()),V.push(H),z=H):V.push(L(H,v));u.push(ah(V,{pad:z,kind:.3>i()?"fine":"main",start:n.traceStart+i()*n.traceJitter,r0:Math.hypot(g.x-a,g.y-s),hasPacket:.6>i(),period:1800+1800*i(),phase:3e3*i()}))}return{traces:u,maxR:Math.max(...[[0,0],[e,0],[0,o],[e,o]].map(([e,o])=>Math.hypot(e-a,o-s))),keepOut:r,width:e,height:o}};
module.exports = { webBoard, ac, ah };

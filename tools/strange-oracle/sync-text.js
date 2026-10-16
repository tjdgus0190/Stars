// 사용: node tools/strange-oracle/sync-text.js products/strange-oracle  (clean-draft.js 다음에 돌린다)
// index.html의 data-t(자식 태그 없는 요소)와 head meta를 data.js·data-saju.js 현재 문구로 맞춘다
const fs=require("fs"),path=require("path"),vm=require("vm");
const dir=process.argv[2];const sb={window:{},console};sb.window.window=sb.window;vm.createContext(sb);
for(const f of ["data.js","data-saju.js"])vm.runInContext(fs.readFileSync(path.join(dir,f),"utf8").replace(/^\s*(const|let)\s+/gm,"var "),sb);
const T=sb.window.TEXT,SAJU=sb.window.SAJU;const app=fs.readFileSync(path.join(dir,"app.js"),"utf8");
const s=app.indexOf("function mergeSajuText()");let i=app.indexOf("{",s),d=0;for(;i<app.length;i++){if(app[i]==="{")d++;else if(app[i]==="}"&&--d===0)break;}
new Function("T","SAJU",app.slice(s,i+1)+";mergeSajuText();")(T,SAJU);
const get=p=>p.split(".").reduce((o,k)=>o==null?o:o[k],T);const esc=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");const escA=x=>esc(x).replace(/"/g,"&quot;");
const file=path.join(dir,"index.html");let h=fs.readFileSync(file,"utf8");let n=0,miss=[];
h=h.replace(/(<([a-z0-9]+)\b[^>]*\bdata-t="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g,(m,o,tag,k,txt,c)=>{const v=get(k);if(typeof v!=="string"){miss.push(k);return m;}const nv=esc(v);if(nv!==txt){n++;}return o+nv+c;});
const M=T.meta||{},O=T.og||{};let meta=0;
const setAttr=(re,val)=>{if(val==null)return;h=h.replace(re,(m,a,b)=>{meta++;return a+escA(val)+b;});};
h=h.replace(/<title>[^<]*<\/title>/,()=>{meta++;return `<title>${esc(M.title)}</title>`;});
setAttr(/(<meta name="description" content=")[^"]*(")/,M.description);
setAttr(/(<meta property="og:title" content=")[^"]*(")/,O.title||M.title);
setAttr(/(<meta property="og:description" content=")[^"]*(")/,O.description||M.description);
console.log({changed:n,meta,missingKeys:[...new Set(miss)].slice(0,20)});
fs.writeFileSync(file,h);

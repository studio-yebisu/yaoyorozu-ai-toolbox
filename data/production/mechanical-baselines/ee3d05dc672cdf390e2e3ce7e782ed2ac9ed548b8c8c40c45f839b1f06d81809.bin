// 八百万図AIツールボックス original demo, 2026. MIT License.
// Same export.mjs contract as before/before.mjs; UI changes follow review.md.
import {summarize,serializeExport} from './export.mjs';

const FILE_NAME='atelier-delivery.json';
const PRESETS={all:['c01','c02','c03'],two:['c02','c03'],one:['c02']};
const MESSAGES={
  ready:'まだ書き出していません。押すとブラウザー内でJSONを作ります。',
  empty:'0件のため書き出せません。カットを1件以上選んでください。',
  stale:'書き出した後に選択か設定を変えました。今の内容で渡すには、もう一度書き出してください。',
  busy:'ブラウザー内でJSONを準備しています。',
  noInput:'入力を読み込めていないため、書き出せません。'
};

const $=s=>document.querySelector(s);
const list=$('#clip-list'),loading=$('#loading'),loadError=$('#load-error'),loadErrorText=$('#load-error-text'),retry=$('#retry');
const notes=$('#notes'),button=$('#export'),message=$('#status'),selectAll=$('#select-all'),count=$('#count'),time=$('#time');
let data=null,exported=false,busy=false;

// Only touch the live region when the text actually changes, so repeated checks are not re-announced.
function setMessage(text,tone){
  if(message.textContent!==text)message.textContent=text;
  message.dataset.tone=tone;
}
function setState(state){
  button.dataset.state=state;
  button.setAttribute('aria-busy',String(state==='busy'));
}

function span(className,text,id){
  const el=document.createElement('span');el.className=className;
  if(text!==undefined)el.textContent=text;
  if(id)el.id=id;
  return el;
}
function row(clip){
  const id='clip-'+clip.id;
  const label=document.createElement('label');label.className='clip';
  const input=document.createElement('input');
  input.type='checkbox';input.checked=true;input.value=clip.id;input.id=id;
  input.setAttribute('aria-labelledby',id+'-title');
  input.setAttribute('aria-describedby',id+'-note '+id+'-time');
  const info=span('clip-info');
  info.append(span('clip-title',clip.title,id+'-title'),span('clip-note',clip.note,id+'-note'));
  label.append(input,info,span('clip-time',summarize(data,[clip.id]).time,id+'-time'));
  return label;
}

const selectedIds=()=>[...list.querySelectorAll('input:checked')].map(x=>x.value);

function update(){
  const s=summarize(data,selectedIds());
  count.textContent=String(s.count);
  time.textContent=s.time;
  button.disabled=s.count===0;
  selectAll.hidden=s.count!==0;
  if(busy)return;
  if(s.count===0){setState('ready');setMessage(MESSAGES.empty,'empty')}
  else if(exported){setState('ready');setMessage(MESSAGES.stale,'stale')}
  else{setState('ready');setMessage(MESSAGES.ready,'ready')}
}

// #all / #two / #one set the real native checkboxes, then recompute through export.mjs.
function applyHash(){
  const ids=PRESETS[location.hash.slice(1)];
  if(!ids||!data)return false;
  for(const input of list.querySelectorAll('input'))input.checked=ids.includes(input.value);
  notes.checked=true;
  update();
  return true;
}

async function load(){
  data=null;
  loadError.hidden=true;
  list.replaceChildren(loading);
  count.textContent='–';time.textContent='--:--';
  button.disabled=true;selectAll.hidden=true;
  setState('ready');setMessage('入力を読み込んでいます。','ready');
  try{
    const response=await fetch('clips.json');
    if(!response.ok)throw new Error('HTTP '+response.status);
    const value=await response.json();
    if(!Array.isArray(value?.clips))throw new Error('clips の一覧がありません');
    data=value;
  }catch(error){
    // No placeholder rows: show the reason and a real retry.
    list.replaceChildren();
    loadErrorText.textContent='入力 clips.json を読み込めませんでした（'+(error?.message||'理由不明')+'）。仮のカットは表示していません。このフォルダーをローカルサーバー（例：python -m http.server 8000）で開いているか確かめてから、もう一度読み込んでください。';
    loadError.hidden=false;
    setMessage(MESSAGES.noInput,'error');
    return;
  }
  list.replaceChildren(...data.clips.map(row));
  if(!applyHash())update();
}

async function exportJson(){
  if(busy||!data)return;
  const ids=selectedIds(),includeNotes=notes.checked;
  busy=true;
  setState('busy');setMessage(MESSAGES.busy,'busy');
  // Expose preparation state; a frame callback does not guarantee a separately visible waiting interval.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  let url=null;
  try{
    const text=serializeExport(data,ids,includeNotes);
    url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=FILE_NAME;link.click();
    exported=true;
    setState('done');
    setMessage(FILE_NAME+'（'+summarize(data,ids).count+'件・メモ'+(includeNotes?'あり':'なし')+'）をブラウザーへ渡しました。保存できたかはブラウザーのダウンロード表示で確かめてください。','done');
  }catch(error){
    setState('error');
    setMessage('書き出せませんでした：'+(error?.message||'理由不明')+'。選択を確かめて、もう一度押してください。','error');
  }finally{
    busy=false;
    // Release the object URL after the browser has taken the download (cleanup only, as in before.mjs).
    if(url)setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
}

list.addEventListener('change',update);
notes.addEventListener('change',()=>{if(data)update()});
button.addEventListener('click',exportJson);
selectAll.addEventListener('click',()=>{
  for(const input of list.querySelectorAll('input'))input.checked=true;
  update();
  button.focus(); // the select-all button hides itself, so keep focus on the next step
});
retry.addEventListener('click',async()=>{
  await load();
  if(data)list.querySelector('input')?.focus();
  else retry.focus();
});
addEventListener('hashchange',applyHash);
// Clicking the link for the hash already in the URL fires no hashchange; apply it directly.
$('#specimens').addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link&&link.hash===location.hash)applyHash();
});

load();

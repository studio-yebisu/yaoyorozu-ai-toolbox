'use strict';
(async()=>{
  const tabs=document.querySelector('#sample-tabs'),result=document.querySelector('#sample-result');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try{
    const response=await fetch('facts.json');if(!response.ok)throw new Error('架空データを読み込めませんでした。時間をおいてページを開き直してください。');
    const facts=await response.json();if(!Array.isArray(facts.samples)||facts.samples.length!==4)throw new Error('架空データ4件の構成を確認できませんでした。');
    const labels={V001:'読み取りと科目候補',V004:'資産として検討',V038:'外貨のため保留',V070:'支払先を本人が補正'};
    const decisions={propose:'候補あり',asset_review:'資産を検討',hold:'確認まで保留',block:'登録を停止'};
    function show(id){
      const c=facts.samples.find(x=>x.id===id);if(!c)return;
      for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));
      const a=c.actual,manual=c.manual_corrections||[];
      result.innerHTML=`<article class="sample-card"><figure class="original"><img src="${esc(c.image)}" alt="${esc(c.id+' '+c.title)}"><a href="${esc(c.pdf)}" target="_blank" rel="noopener">架空の原本PDFを開く ↗</a></figure><div><span class="badge">${esc(c.id)} / ${esc(decisions[a.decision]||a.decision)}</span><h3>${esc(c.title)}</h3><dl><dt>日付</dt><dd>${esc(a.date||'未確定')}</dd><dt>支払先</dt><dd>${esc(a.merchant||'未確定')}</dd><dt>税込円額</dt><dd>${a.total==null?'未確定':esc(Number(a.total).toLocaleString('ja-JP')+'円')}</dd><dt>勘定科目の候補</dt><dd>${esc(a.account||'未確定')}</dd></dl><p class="sample-note">${esc(c.review_note)}</p>${manual.map(m=>`<p class="correction"><strong>確認欄だけを利用者が補正</strong><br>${esc(m.before)} → ${esc(m.after)}<br>${esc(m.basis)}。補正前の候補と過去の採点はそのまま残しています。</p>`).join('')}<p class="small">実行記録: ${esc(c.source_run)} / 保存済みの架空例であり、帳簿への登録や税務上の確定を表しません。</p></div></article>`;
    }
    for(const c of facts.samples){const b=document.createElement('button');b.type='button';b.dataset.id=c.id;b.textContent=c.id+' '+labels[c.id];b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>show(c.id));tabs.append(b);}show('V001');
  }catch(error){result.className='error';result.textContent=error.message;tabs.replaceChildren();}
})();

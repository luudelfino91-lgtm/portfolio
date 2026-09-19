/* ============================ RENDER ============================ */
const $ = (s,el=document)=>el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function rng(seed){let h=0;for(const c of seed)h=(h*31+c.charCodeAt(0))>>>0;return()=>((h=(h*1664525+1013904223)>>>0)/4294967296);}

/* Prévia ilustrativa de dashboard (usada quando não há imagem real) */
function mockSVG(p){
  const r=rng(p.slug), W=640,H=360;
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Prévia ilustrativa do relatório ${esc(p.title)}" xmlns="http://www.w3.org/2000/svg">`;
  s+=`<rect width="${W}" height="${H}" style="fill:var(--mock-bg)"/>`;
  s+=`<rect x="0" y="0" width="54" height="${H}" style="fill:var(--mock-c)" opacity=".92"/>`;
  for(let i=0;i<5;i++) s+=`<rect x="17" y="${58+i*34}" width="20" height="20" rx="5" style="fill:${i==1?'var(--mock-a)':'var(--mock-bg)'}" opacity="${i==1?1:.18}"/>`;
  s+=`<rect x="72" y="20" width="180" height="12" rx="4" style="fill:var(--mock-c)" opacity=".85"/><rect x="72" y="40" width="110" height="7" rx="3" style="fill:var(--mock-c)" opacity=".3"/>`;
  const kx=72, kw=(W-72-18-3*12)/4;
  for(let i=0;i<4;i++){const x=kx+i*(kw+12);
    s+=`<rect x="${x}" y="62" width="${kw}" height="62" rx="10" style="fill:var(--mock-panel);stroke:var(--mock-line)"/>`;
    s+=`<rect x="${x+12}" y="76" width="${kw*.45}" height="6" rx="3" style="fill:var(--mock-c)" opacity=".3"/>`;
    s+=`<rect x="${x+12}" y="92" width="${kw*(.35+r()*.3)}" height="16" rx="4" style="fill:${i==0?'var(--mock-a)':'var(--mock-c)'}" opacity="${i==0?1:.8}"/>`;}
  const mx=72,my=138,mw=350,mh=204;
  s+=`<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="12" style="fill:var(--mock-panel);stroke:var(--mock-line)"/>`;
  s+=`<rect x="${mx+14}" y="${my+14}" width="120" height="7" rx="3" style="fill:var(--mock-c)" opacity=".45"/>`;
  const cx0=mx+18,cy0=my+mh-20,cw=mw-36,ch=mh-60;
  for(let g=0;g<4;g++) s+=`<line x1="${cx0}" x2="${cx0+cw}" y1="${cy0-g*ch/3}" y2="${cy0-g*ch/3}" style="stroke:var(--mock-line)"/>`;
  if(p.mock==="bars"){const n=12,bw=cw/n*.62;for(let i=0;i<n;i++){const v=.25+r()*.7,h=v*ch;s+=`<rect x="${cx0+i*cw/n+(cw/n-bw)/2}" y="${cy0-h}" width="${bw}" height="${h}" rx="3" style="fill:${i>=7?'var(--mock-a)':'var(--mock-b)'}"/>`;}}
  else if(p.mock==="donut"){const cx=mx+mw/2,cy=my+mh/2+10,R=62;let a=-Math.PI/2;const parts=[.46,.27,.17,.10],cols=['var(--mock-a)','var(--mock-b)','var(--mock-d)','var(--mock-line)'];
    parts.forEach((f,i)=>{const a2=a+f*Math.PI*2,x1=cx+R*Math.cos(a),y1=cy+R*Math.sin(a),x2=cx+R*Math.cos(a2),y2=cy+R*Math.sin(a2);s+=`<path d="M${x1} ${y1} A${R} ${R} 0 ${f>.5?1:0} 1 ${x2} ${y2}" style="fill:none;stroke:${cols[i]};stroke-width:26"/>`;a=a2;});}
  else if(p.mock==="pipeline"){const steps=["extrair","tratar","validar","enviar"];steps.forEach((t,i)=>{const x=cx0+i*(cw/4)+6,y=my+80,w=cw/4-18;s+=`<rect x="${x}" y="${y}" width="${w}" height="54" rx="10" style="fill:${i==3?'var(--mock-a)':'var(--mock-bg)'};stroke:var(--mock-line)"/><text x="${x+w/2}" y="${y+32}" text-anchor="middle" style="fill:${i==3?'var(--mock-panel)':'var(--mock-c)'};font:500 12px var(--f-mono)">${t}.py</text>`;if(i<3)s+=`<path d="M${x+w+2} ${y+27} l10 0" style="stroke:var(--mock-a);stroke-width:2"/>`;});
    s+=`<text x="${cx0}" y="${cy0-8}" style="fill:var(--mock-c);font:500 11px var(--f-mono)" opacity=".6">13 rotinas · agendadas · 0 cliques</text>`;}
  else{const n=24;let pts=[],v=.35;for(let i=0;i<n;i++){v=Math.min(.95,Math.max(.1,v+(r()-.42)*.18));pts.push([cx0+i*cw/(n-1),cy0-v*ch]);}
    const d=pts.map((q,i)=>(i?"L":"M")+q[0].toFixed(1)+" "+q[1].toFixed(1)).join(" ");
    if(p.mock==="area") s+=`<path d="${d} L${cx0+cw} ${cy0} L${cx0} ${cy0}Z" style="fill:var(--mock-b)" opacity=".45"/>`;
    s+=`<path d="${d}" style="fill:none;stroke:var(--mock-a);stroke-width:2.5"/>`;const e=pts[n-1];s+=`<circle cx="${e[0]}" cy="${e[1]}" r="5" style="fill:var(--mock-a)"/>`;}
  const sx=mx+mw+12,sw=W-sx-18;
  s+=`<rect x="${sx}" y="${my}" width="${sw}" height="${mh}" rx="12" style="fill:var(--mock-panel);stroke:var(--mock-line)"/>`;
  s+=`<rect x="${sx+14}" y="${my+14}" width="90" height="7" rx="3" style="fill:var(--mock-c)" opacity=".45"/>`;
  let vals=Array.from({length:6},()=>.3+r()*.7).sort((a,b)=>b-a);
  vals.forEach((v,i)=>{const y=my+40+i*26;s+=`<rect x="${sx+14}" y="${y}" width="46" height="6" rx="3" style="fill:var(--mock-c)" opacity=".3"/><rect x="${sx+68}" y="${y-3}" width="${(sw-84)*v}" height="12" rx="3" style="fill:${i==0?'var(--mock-a)':'var(--mock-b)'}"/>`;});
  return s+"</svg>";
}

function projectCard(p){
  const hasReport=!!p.report;
  const preview = p.cover ? `<img src="${esc(p.cover)}" alt="Captura do relatório ${esc(p.title)}" loading="lazy">` : mockSVG(p);
  const viewHref = hasReport ? p.report : `#/case/${p.slug}`;
  const ext = hasReport ? ' target="_blank" rel="noopener"' : '';
  return `<article class="proj" data-tools="${esc(p.tools.join('|'))}" id="p-${p.slug}">
    <div class="proj-top">
      <div><span class="domain">${esc(p.domain)}</span><h3>${esc(p.title)}</h3></div>
      <div class="kpi"><b>${esc(p.kpi.v)}</b><span>${esc(p.kpi.l)}</span></div>
    </div>
    <div class="proj-body"><p>${esc(p.lede)}</p><p>${esc(p.side)}</p></div>
    <div class="proj-foot">
      <div class="tags">${[...p.tools,...p.tags].map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div class="actions">
        <a class="btn btn-dark" href="#/case/${p.slug}">Ver case técnico <span class="arrow">→</span></a>
        ${hasReport?`<a class="btn btn-ghost" href="${esc(p.report)}" target="_blank" rel="noopener">Abrir relatório <span class="arrow">↗</span></a>`:""}
      </div>
    </div>
    <div class="frame">
      <div class="frame-bar"><div class="lights"><i></i><i></i><i></i><span class="mono">${esc(p.file)}</span></div><span class="live">${p.internal?"PROJETO INTERNO":"RELATÓRIO PUBLICADO"}</span></div>
      <a class="frame-view" href="${esc(viewHref)}"${ext} aria-label="${hasReport?"Abrir relatório":"Ver case"} ${esc(p.title)}">${preview}<span class="play"><span>${hasReport?"Abrir relatório interativo ↗":"Ver como foi feito →"}</span></span></a>
    </div>
  </article>`;
}

function renderHome(){
  $("#laneIndex").innerHTML = LANES.map((l,i)=>{const n=PROJECTS.filter(p=>p.lane===l.id).length;return `<li><a href="#lane-${l.id}" data-lane="${l.id}" class="${i?'':'on'}"><span>${esc(l.name)}</span><span class="count">${n}</span></a></li>`}).join("");
  $("#lanes").innerHTML = LANES.map(l=>{const ps=PROJECTS.filter(p=>p.lane===l.id);
    return `<div class="lane" id="lane-${l.id}"><div class="lane-head"><div><h3>${esc(l.name)}</h3><p>${esc(l.desc)}</p></div><span class="count">${ps.length} ${ps.length>1?"projetos":"projeto"}</span></div>${ps.map(projectCard).join("")}</div>`}).join("");
  const tools=[...new Set(PROJECTS.flatMap(p=>p.tools))];
  $("#toolFilter").innerHTML = ["Todos",...tools].map((t,i)=>`<button type="button" aria-pressed="${i?'false':'true'}" data-tool="${esc(t)}">${esc(t)}</button>`).join("");
  $("#toolFilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    document.querySelectorAll("#toolFilter button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    const t=b.dataset.tool;document.querySelectorAll(".proj").forEach(c=>c.classList.toggle("hidden",t!=="Todos"&&!c.dataset.tools.split("|").includes(t)));
    document.querySelectorAll(".lane").forEach(l=>l.hidden=!l.querySelector(".proj:not(.hidden)"));});
  $("#timeline").innerHTML = JOURNEY.map(j=>`<li class="${j.ph}${j.now?' now':''}"><div class="t-when">${esc(j.when)}</div><div class="t-role">${esc(j.role)}</div><div class="t-org">${esc(j.org)}</div><p class="t-desc">${esc(j.desc)}</p></li>`).join("");
}

function renderCase(slug){
  const p=PROJECTS.find(x=>x.slug===slug); if(!p) return false;
  const c=p.case, lane=LANES.find(l=>l.id===p.lane);
  const i=PROJECTS.indexOf(p), next=PROJECTS[(i+1)%PROJECTS.length];
  const dax=c.dax?`<pre class="code">${esc(c.dax).replace(/^(.*?=)/,'<span class="k">$1</span>').replace(/\b(VAR|RETURN|CALCULATE|DIVIDE|SAMEPERIODLASTYEAR)\b/g,'<span class="k">$1</span>')}</pre>`:"";
  $("#case").innerHTML = `
    <a class="back" href="#p-${p.slug}">← Voltar ao portfólio</a>
    <div class="case-head">
      <div><span class="eyebrow">${esc(lane.name)} · ${esc(p.domain)}</span><h1>${esc(p.title)}</h1><p class="lede">${esc(p.lede)} ${esc(p.side)}</p></div>
      <div class="kpi"><b style="font-size:40px">${esc(p.kpi.v)}</b><span>${esc(p.kpi.l)}</span></div>
    </div>
    ${SHOW_DRAFT_NOTES&&p.draft?`<div class="draft"><b>Rascunho.</b> Texto-base gerado a partir do resumo do projeto. Revise os detalhes técnicos e desligue este aviso em SHOW_DRAFT_NOTES.</div>`:""}
    <div class="frame" style="margin-top:28px"><div class="frame-bar"><div class="lights"><i></i><i></i><i></i><span class="mono">${esc(p.file)}</span></div><span class="live">${p.internal?"PROJETO INTERNO":"PRÉVIA"}</span></div>
      <div class="frame-view">${p.cover?`<img src="${esc(p.cover)}" alt="Captura do relatório ${esc(p.title)}">`:mockSVG(p)}</div></div>
    <div class="case-grid">
      <aside class="meta"><dl style="margin:0;display:grid;gap:18px">
        <div><dt>Domínio</dt><dd>${esc(p.domain)}</dd></div>
        <div><dt>Ferramentas</dt><dd>${esc(p.tools.join(" · "))}</dd></div>
        <div><dt>Temas</dt><dd>${esc(p.tags.join(" · "))}</dd></div></dl>
        <div class="actions">
          ${p.report?`<a class="btn btn-accent" href="${esc(p.report)}" target="_blank" rel="noopener">Abrir relatório ↗</a>`:""}
          ${p.repo?`<a class="btn btn-ghost" href="${esc(p.repo)}" target="_blank" rel="noopener">Ver no GitHub ↗</a>`:""}
        </div>
      </aside>
      <div class="case-body">
        <section><h2>A pergunta de negócio</h2><p>${esc(c.pergunta)}</p></section>
        <section><h2>Dados e modelagem</h2><ul>${c.dados.map(d=>`<li>${esc(d)}</li>`).join("")}</ul></section>
        <section><h2>Como foi construído</h2><ul>${c.tecnicas.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>${dax}</section>
        <section><h2>Resultado</h2><p>${esc(c.resultado)}</p></section>
        <section><a class="btn btn-ghost" href="#/case/${next.slug}">Próximo case: ${esc(next.title)} <span class="arrow">→</span></a></section>
      </div>
    </div>`;
  return true;
}

/* ============================ ROTAS & UI ============================ */
function route(){
  const m=location.hash.match(/^#\/case\/([\w-]+)/);
  if(m && renderCase(m[1])){ $("#home").hidden=true; $("#case").hidden=false; window.scrollTo({top:0,behavior:"instant"}); }
  else{
    const wasCase=!$("#case").hidden;
    $("#case").hidden=true; $("#home").hidden=false;
    const t=location.hash && document.getElementById(location.hash.slice(1));
    if(wasCase && t) requestAnimationFrame(()=>t.scrollIntoView({behavior:"instant",block:"start"}));
  }
  $("#links").classList.remove("open");
}
renderHome(); route(); addEventListener("hashchange",route);

/* Destaque de seção ativa (índice e menu) */
const spy=new IntersectionObserver(es=>es.forEach(e=>{ if(!e.isIntersecting) return;
  const id=e.target.id;
  if(id.startsWith("lane-")) document.querySelectorAll("#laneIndex a").forEach(a=>a.classList.toggle("on",a.dataset.lane===id.slice(5)));
  else document.querySelectorAll("[data-nav]").forEach(a=>a.classList.toggle("on",a.dataset.nav===id));
}),{rootMargin:"-45% 0px -50% 0px"});
document.querySelectorAll(".lane,#projetos,#trajetoria,#stack,#contato").forEach(el=>spy.observe(el));

/* Tema */
$("#themeBtn").addEventListener("click",()=>{const r=document.documentElement;
  const dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
  r.dataset.theme=dark?"light":"dark"; try{localStorage.setItem("ld-theme",r.dataset.theme)}catch(e){} });
try{const t=localStorage.getItem("ld-theme"); if(t) document.documentElement.dataset.theme=t;}catch(e){}

/* Menu mobile */
$("#menuBtn").addEventListener("click",e=>{const o=$("#links").classList.toggle("open");e.currentTarget.setAttribute("aria-expanded",o);});

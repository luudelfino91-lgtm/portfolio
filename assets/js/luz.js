/* =====================================================================
   LUZ — abertura com som, rolagem suave, transições por desfoque,
   manifesto letra a letra, trilho de seções e lâmpada do tema.
   Tudo é opcional: sem JS (ou com movimento reduzido) o site funciona igual.
   ===================================================================== */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $=function(s){return document.querySelector(s);};
  var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s));};
  var pt=function(){return window.LANG==="pt";};

  /* =================================================================
     SOM — sintetizado na hora (Web Audio), sem arquivos de áudio.
     O navegador só libera som depois de um clique ou toque.
     ================================================================= */
  var SND={ctx:null,master:null};
  var soundOn=true; try{ soundOn=localStorage.getItem("ld-sound")!=="off"; }catch(e){}
  function ac(){
    if(!soundOn) return null;
    try{
      if(!SND.ctx){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
        SND.ctx=new C(); SND.master=SND.ctx.createGain(); SND.master.gain.value=.16;
        var comp=SND.ctx.createDynamicsCompressor(); SND.master.connect(comp); comp.connect(SND.ctx.destination); }
      if(SND.ctx.state==="suspended") SND.ctx.resume();
      /* sem interação, o navegador deixa o áudio suspenso: aí a abertura roda em silêncio */
      return SND.ctx.state==="running"?SND.ctx:null;
    }catch(e){ return null; }
  }
  function noise(ctx,dur){ var n=Math.ceil(ctx.sampleRate*dur), b=ctx.createBuffer(1,n,ctx.sampleRate), d=b.getChannelData(0);
    for(var i=0;i<n;i++) d[i]=Math.random()*2-1; var s=ctx.createBufferSource(); s.buffer=b; return s; }
  function pan(ctx){ return ctx.createStereoPanner?ctx.createStereoPanner():null; }

  /* neon passando: sopro filtrado + zumbido elétrico, da esquerda para a direita */
  function sfxSweep(delay,dur){
    var ctx=ac(); if(!ctx) return; var t=ctx.currentTime+(delay||0); dur=dur||1.05;
    var p=pan(ctx), out=p||ctx.createGain(); if(p){ p.pan.setValueAtTime(-.9,t); p.pan.linearRampToValueAtTime(.9,t+dur); }
    out.connect(SND.master);
    var n=noise(ctx,dur+.3), bp=ctx.createBiquadFilter(), g=ctx.createGain();
    bp.type="bandpass"; bp.Q.value=.9; bp.frequency.setValueAtTime(300,t); bp.frequency.exponentialRampToValueAtTime(1500,t+dur*.5); bp.frequency.exponentialRampToValueAtTime(500,t+dur);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.7,t+dur*.5); g.gain.exponentialRampToValueAtTime(.001,t+dur+.35);
    n.connect(bp); bp.connect(g); g.connect(out); n.start(t); n.stop(t+dur+.3);
    var o1=ctx.createOscillator(), o2=ctx.createOscillator(), lp=ctx.createBiquadFilter(), hg=ctx.createGain(), lfo=ctx.createOscillator(), lg=ctx.createGain();
    o1.type="triangle"; o1.frequency.value=120; o2.type="sine"; o2.frequency.value=240.6;
    lp.type="lowpass"; lp.frequency.setValueAtTime(400,t); lp.frequency.linearRampToValueAtTime(900,t+dur*.5); lp.frequency.linearRampToValueAtTime(400,t+dur);
    lfo.frequency.value=31; lg.gain.value=.02; lfo.connect(lg); lg.connect(hg.gain);
    hg.gain.setValueAtTime(0,t); hg.gain.linearRampToValueAtTime(.08,t+dur*.45); hg.gain.linearRampToValueAtTime(0,t+dur+.1);
    o1.connect(lp); o2.connect(lp); lp.connect(hg); hg.connect(out);
    [o1,o2,lfo].forEach(function(o){ o.start(t); o.stop(t+dur+.15); });
  }
  /* clique de interruptor: estalo agudo + batida grave, e o retorno da mola */
  function sfxClick(delay,soft){
    var ctx=ac(); if(!ctx) return; var t=ctx.currentTime+(delay||0), k=soft?.5:1;
    function tick(at,vol,hp){ var n=noise(ctx,.03), f=ctx.createBiquadFilter(), g=ctx.createGain();
      f.type="bandpass"; f.frequency.value=hp; f.Q.value=.8; g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(vol*k,at+.003); g.gain.exponentialRampToValueAtTime(.001,at+.03);
      n.connect(f); f.connect(g); g.connect(SND.master); n.start(at); n.stop(at+.03); }
    function thump(at,vol){ var o=ctx.createOscillator(), g=ctx.createGain(); o.type="sine";
      o.frequency.setValueAtTime(130,at); o.frequency.exponentialRampToValueAtTime(60,at+.06);
      g.gain.setValueAtTime(vol*k,at); g.gain.exponentialRampToValueAtTime(.001,at+.08); o.connect(g); g.connect(SND.master); o.start(at); o.stop(at+.09); }
    tick(t,.45,1600); thump(t,.35); tick(t+.075,.18,2000);
  }
  /* filamento acendendo: zumbido que pisca no mesmo ritmo da luz e um brilho quente */
  function sfxIgnite(delay){
    var ctx=ac(); if(!ctx) return; var t=ctx.currentTime+(delay||0);
    var o=ctx.createOscillator(), bp=ctx.createBiquadFilter(), g=ctx.createGain();
    o.type="triangle"; o.frequency.value=100; bp.type="bandpass"; bp.frequency.value=700; bp.Q.value=2;
    [[0,.12],[.076,.02],[.126,.1],[.185,.02],[.244,.12],[.42,.03],[1.1,0]].forEach(function(s){ g.gain.setValueAtTime(s[1],t+s[0]); });
    o.connect(bp); bp.connect(g); g.connect(SND.master); o.start(t); o.stop(t+1.15);
    [261.6,392,523.3].forEach(function(f,i){ var w=ctx.createOscillator(), wg=ctx.createGain(); w.type="sine"; w.frequency.value=f;
      wg.gain.setValueAtTime(0,t+.24); wg.gain.linearRampToValueAtTime(.12/(i+1),t+.45); wg.gain.exponentialRampToValueAtTime(.001,t+1.6);
      w.connect(wg); wg.connect(SND.master); w.start(t+.24); w.stop(t+1.65); });
  }

  /* =================================================================
     ROLAGEM SUAVE (Lenis)
     ================================================================= */
  var lenis=null;
  if(!reduce&&window.Lenis){
    try{
      lenis=new Lenis({lerp:.09,wheelMultiplier:.9,anchors:{offset:-96}});
      (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      lenis.on("scroll",function(){ onScroll(); });
    }catch(e){ lenis=null; }
  }
  if(!lenis) addEventListener("scroll",function(){ onScroll(); },{passive:true});

  /* =================================================================
     ENTRADAS POR DESFOQUE (opacidade + blur + deslocamento)
     ================================================================= */
  var io=("IntersectionObserver" in window)&&!reduce?new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  },{rootMargin:"0px 0px -10% 0px"}):null;
  function tag(sel,stagger){ $$(sel).forEach(function(el,i){ if(!el.classList.contains("fx")){ el.classList.add("fx"); if(stagger) el.style.setProperty("--d",i%stagger); } }); }
  function words(h){
    if(h.dataset.split&&h.dataset.split===h.innerHTML) return;
    var i=0;
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){ var parts=n.textContent.split(/(\s+)/), frag=document.createDocumentFragment();
          parts.forEach(function(p){ if(!p) return; if(/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
            else { var w=document.createElement("span"); w.className="w"; w.style.setProperty("--i",i++); w.textContent=p; frag.appendChild(w);} });
          n.parentNode.replaceChild(frag,n); }
        else if(n.nodeType===1){ if(n.classList.contains("grad")){ n.classList.add("w"); n.style.setProperty("--i",i++); } else walk(n); }
      });
    })(h);
    h.classList.add("fx-words"); h.dataset.split=h.innerHTML;
  }
  function watch(){
    tag(".sec-head",0); tag(".stats .stat",4); tag(".recog figure",2); tag(".r-facts li",3);
    tag(".bento .tile",4); tag(".journey-intro",0); tag(".timeline li",8); tag(".contact",0); tag(".work-bar",0);
    $$("#workGrid .w-card").forEach(function(c,i){ c.style.setProperty("--d",i%3); });
    $$(".sec-head h2,.journey-intro h2,.contact h2").forEach(words);
    $$(".fx:not(.in),.fx-words:not(.in)").forEach(function(el){ io?io.observe(el):el.classList.add("in"); });
  }

  /* =================================================================
     MANIFESTO: seção presa, letras saem do desfoque conforme a rolagem
     ================================================================= */
  var man=$("#manifesto"), mtxt=man&&man.querySelector(".m-txt"), chars=[];
  function buildManifesto(){
    if(!man) return;
    var spans=man.querySelectorAll(".m-src [data-i]"), html="";
    Array.prototype.forEach.call(spans,function(sp,si){
      sp.textContent.split(/(\s+)/).forEach(function(w){ if(!w) return;
        if(/^\s+$/.test(w)){ html+=" "; return; }
        html+='<span class="mw'+(si?" em":"")+'">'+w.split("").map(function(c){ return '<span class="mc">'+c.replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</span>'; }).join("")+"</span>";
      });
      html+=" ";
    });
    mtxt.innerHTML=html; chars=Array.prototype.slice.call(mtxt.querySelectorAll(".mc"));
    paintManifesto();
  }
  function paintManifesto(){
    if(!man||!chars.length) return;
    if(reduce){ return; }
    var r=man.getBoundingClientRect(), total=Math.max(1,man.offsetHeight-innerHeight);
    var p=Math.min(1,Math.max(0,(-r.top+innerHeight*.2)/(total*.85)));
    var n=chars.length, span=7;
    for(var i=0;i<n;i++){
      var k=Math.min(1,Math.max(0,p*(n+span)-i)/span);
      var c=chars[i]; if(c._k===k) continue; c._k=k;
      c.style.opacity=(.08+.92*k).toFixed(3);
      c.style.filter=k>=1?"none":"blur("+((1-k)*12).toFixed(1)+"px)";
      c.style.transform=k>=1?"none":"translateY("+((1-k)*12).toFixed(1)+"px)";
    }
  }

  /* =================================================================
     TRILHO DE SEÇÕES (lado direito) e seção ativa
     ================================================================= */
  var SECS=[["top","Início","Home"],["manifesto","Manifesto","Manifesto"],["produtos","Produtos","Products"],["projetos","Projetos","Projects"],["destaque","Reconhecimento","Recognition"],["trajetoria","Trajetória","Journey"],["stack","Stack","Stack"],["contato","Contato","Contact"]];
  var rail=$("#rail"), curSec="";
  function buildRail(){ if(!rail) return;
    rail.innerHTML=SECS.map(function(s){ return '<a href="#'+s[0]+'" data-sec="'+s[0]+'"><span>'+(pt()?s[1]:s[2])+'</span><i></i></a>'; }).join(""); }
  function onScroll(){
    paintManifesto();
    if(!rail) return;
    var y=innerHeight*.45, id="top", c=$("#case");
    SECS.forEach(function(s){ var el=document.getElementById(s[0]); if(el&&el.offsetParent!==null&&el.getBoundingClientRect().top<y) id=s[0]; });
    if(id!==curSec){ curSec=id; $$("#rail a").forEach(function(a){ a.classList.toggle("on",a.dataset.sec===id); }); }
    rail.classList.toggle("show",scrollY>innerHeight*.5&&(!c||c.hidden));
  }

  /* =================================================================
     Detalhes: luz nos cartões e cursor, números, trajetória
     ================================================================= */
  document.addEventListener("pointermove",function(e){
    var c=e.target.closest&&e.target.closest(".w-card");
    if(c){ var r=c.getBoundingClientRect(); c.style.setProperty("--x",(e.clientX-r.left)+"px"); c.style.setProperty("--y",(e.clientY-r.top)+"px"); }
    if(e.pointerType==="mouse"){ document.body.style.setProperty("--mx",e.clientX+"px"); document.body.style.setProperty("--my",e.clientY+"px"); }
  },{passive:true});

  function countUp(el){
    var raw=el.textContent, m=raw.match(/^(\D*)(\d+)(.*)$/);
    if(!m||reduce||+m[2]<2||el.children.length) return;
    var end=+m[2], t0=null, dur=1300;
    function step(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/dur), v=Math.round(end*(1-Math.pow(1-k,4)));
      el.textContent=m[1]+v+m[3]; if(k<1) requestAnimationFrame(step); else el.textContent=raw; }
    el.textContent=m[1]+"0"+m[3]; requestAnimationFrame(step);
  }
  var stats=$(".stats"), startStats=null;
  if(stats&&("IntersectionObserver" in window)){
    var so=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return;
      e.target.querySelectorAll(".stat b").forEach(countUp); so.disconnect(); }); },{threshold:.5});
    startStats=function(){ so.observe(stats); };
  }

  var more=$("#moreJourney"), tl=$("#timeline");
  function moreLabel(){ if(!more) return; var open=!tl.classList.contains("short");
    more.innerHTML=(open?(pt()?"Mostrar menos":"Show less"):(pt()?"Ver trajetória completa":"See the full journey"))+' <span class="arrow">'+(open?"↑":"↓")+'</span>';
    more.setAttribute("aria-expanded",open); }
  if(more) more.addEventListener("click",function(){ tl.classList.toggle("short"); moreLabel(); watch();
    if(lenis) lenis.resize();
    if(tl.classList.contains("short")){ var tgt=$("#trajetoria"); lenis?lenis.scrollTo(tgt,{offset:-96}):tgt.scrollIntoView(); } });

  /* lâmpada do tema: pisca e faz clique (se o som estiver ligado) */
  var tb=$("#themeBtn");
  if(tb) tb.addEventListener("click",function(){ tb.classList.remove("flick"); void tb.offsetWidth; tb.classList.add("flick"); sfxClick(0,true); });

  /* =================================================================
     ABERTURA
     ================================================================= */
  var intro=$("#intro");
  function done(){
    try{ sessionStorage.setItem("ld-intro","1"); }catch(e){}
    root.classList.remove("intro-on"); root.classList.add("lit");
    if(intro) intro.hidden=true;
    if(lenis) lenis.start();
    if(startStats) startStats();
    onScroll();
  }
  function setSnd(){ var b=$("#introSnd"); if(b) b.setAttribute("aria-pressed",!!(soundOn&&SND.ctx&&SND.ctx.state==="running")); }
  function play(){
    var lamp=$("#lamp"), timers=[], state="wait", raf=0;
    if(lenis) lenis.stop();
    ac(); setSnd();
    function at(ms,f){ timers.push(setTimeout(f,ms)); }
    function finish(fast){
      if(state==="done") return; state="done"; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      if(fast){ intro.style.transition="opacity .4s ease, filter .4s ease"; intro.style.opacity="0"; intro.style.filter="blur(8px)"; setTimeout(done,410); }
      else done();
    }
    function reveal(){
      var r=lamp.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height*(160/300);
      intro.style.setProperty("--cx",cx+"px"); intro.style.setProperty("--cy",cy+"px");
      var max=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy))+4, t0=null, dur=950;
      function step(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/dur), e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
        intro.style.setProperty("--r",(max*e)+"px"); if(k<1) raf=requestAnimationFrame(step); }
      raf=requestAnimationFrame(step);
      root.classList.add("lit");
      intro.classList.add("out");
      var b=tb&&tb.getBoundingClientRect();
      if(b&&b.width){
        var gh=r.height*(118/300), s=Math.max(.06,(b.height*.62)/gh);
        lamp.style.transformOrigin="50% "+(160/300*100)+"%";
        lamp.style.transition="transform .95s cubic-bezier(.65,0,.25,1), opacity .3s ease .75s";
        lamp.style.transform="translate("+((b.left+b.width/2)-cx)+"px,"+((b.top+b.height/2)-cy)+"px) scale("+s+")";
        lamp.style.opacity="0";
        at(960,function(){ tb.classList.add("landed"); setTimeout(function(){tb.classList.remove("landed");},950); });
      } else { lamp.style.transition="opacity .4s"; lamp.style.opacity="0"; }
    }
    function go(){
      if(state!=="wait") return; state="run";
      intro.classList.add("go");
      sfxSweep(.15,1.05);
      at(1400,function(){ intro.classList.add("pull"); sfxClick(.06); });
      at(1660,function(){ intro.classList.add("on"); sfxIgnite(0); });
      at(2450,reveal);
      at(3500,function(){ finish(false); });
    }
    /* sem som liberado, o botão vira "Ativar som": o toque dele libera o áudio no navegador */
    $("#introSnd").addEventListener("click",function(e){ e.stopPropagation();
      var playing=soundOn&&SND.ctx&&SND.ctx.state==="running"; soundOn=!playing;
      try{ localStorage.setItem("ld-sound",soundOn?"on":"off"); }catch(x){}
      if(soundOn){ ac(); if(SND.ctx&&SND.ctx.resume) SND.ctx.resume().then(setSnd,setSnd); } setSnd(); });
    $("#introSkip").addEventListener("click",function(e){ e.stopPropagation(); finish(true); });
    intro.addEventListener("click",function(){ if(state==="wait") go(); else finish(true); });
    document.addEventListener("keydown",function k(e){
      if(state==="done"){ document.removeEventListener("keydown",k); return; }
      if(e.key==="Escape"){ finish(true); return; }
      if((e.key==="Enter"||e.key===" ")&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest("#introSnd,#introSkip")) return;
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); if(state==="wait") go(); else finish(true); }
    });
    /* começa sozinha; o som só toca se o navegador permitir (ou depois que a pessoa tocar no botão de som) */
    at(450,go);
  }

  /* =================================================================
     Inicialização e troca de idioma
     ================================================================= */
  function refresh(){ watch(); moreLabel(); buildManifesto(); buildRail(); curSec=""; onScroll(); if(lenis) lenis.resize(); }
  window.LUZ={refresh:function(){ refresh(); }};
  (window.onLang=window.onLang||[]).push(function(){
    $$(".fx-words").forEach(function(h){ h.dataset.split=""; h.classList.add("in"); });
    refresh(); $$(".fx-words").forEach(function(h){ h.classList.add("in"); }); });
  addEventListener("resize",function(){ paintManifesto(); },{passive:true});
  addEventListener("hashchange",function(){ setTimeout(function(){ if(lenis) lenis.resize(); onScroll(); },60); });
  refresh();
  if(intro&&root.classList.contains("intro-on")&&!reduce) play(); else done();
})();

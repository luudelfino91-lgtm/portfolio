/* =====================================================================
   LUZ — abertura, lâmpada do tema, luz do cursor, contagem dos números
   e entradas suaves. Tudo opcional: sem JS, o site funciona igual.
   ===================================================================== */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $=function(s){return document.querySelector(s);};

  /* ---------------- Entradas suaves ---------------- */
  var io=("IntersectionObserver" in window)&&!reduce?new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  },{rootMargin:"0px 0px -8% 0px"}):null;
  function watch(){ document.querySelectorAll(".fx:not(.in)").forEach(function(el){ io?io.observe(el):el.classList.add("in"); }); }

  /* ---------------- Luz nos cartões ---------------- */
  document.addEventListener("pointermove",function(e){
    var c=e.target.closest&&e.target.closest(".w-card");
    if(c){ var r=c.getBoundingClientRect(); c.style.setProperty("--x",(e.clientX-r.left)+"px"); c.style.setProperty("--y",(e.clientY-r.top)+"px"); }
    if(e.pointerType==="mouse"){ document.body.style.setProperty("--mx",e.clientX+"px"); document.body.style.setProperty("--my",e.clientY+"px"); }
  },{passive:true});

  /* ---------------- Números que contam ---------------- */
  function countUp(el){
    var raw=el.textContent, m=raw.match(/^(\D*)(\d+)(.*)$/);
    if(!m||reduce||+m[2]<2) return;
    var end=+m[2], t0=null, dur=1100;
    function step(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/dur), v=Math.round(end*(1-Math.pow(1-k,3)));
      el.textContent=m[1]+v+m[3]; if(k<1) requestAnimationFrame(step); else el.textContent=raw; }
    el.textContent=m[1]+"0"+m[3]; requestAnimationFrame(step);
  }
  var stats=$(".stats");
  if(stats&&("IntersectionObserver" in window)){
    var so=new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return;
      e.target.querySelectorAll(".stat b").forEach(countUp); so.disconnect(); }); },{threshold:.5});
    var startStats=function(){ so.observe(stats); };
  }

  /* ---------------- Trajetória recolhida ---------------- */
  var more=$("#moreJourney"), tl=$("#timeline");
  function moreLabel(){ if(!more) return; var open=!tl.classList.contains("short"), pt=window.LANG==="pt";
    more.innerHTML=(open?(pt?"Mostrar menos":"Show less"):(pt?"Ver trajetória completa":"See the full journey"))+' <span class="arrow">'+(open?"↑":"↓")+'</span>';
    more.setAttribute("aria-expanded",open); }
  if(more){ more.addEventListener("click",function(){ tl.classList.toggle("short"); moreLabel();
    if(tl.classList.contains("short")) $("#trajetoria").scrollIntoView({behavior:reduce?"auto":"smooth"}); });
    (window.onLang=window.onLang||[]).push(moreLabel); }

  /* ---------------- Lâmpada do tema ---------------- */
  var tb=$("#themeBtn");
  if(tb) tb.addEventListener("click",function(){ tb.classList.remove("flick"); void tb.offsetWidth; tb.classList.add("flick"); });

  /* ---------------- Abertura ---------------- */
  var intro=$("#intro");
  function done(){
    try{ sessionStorage.setItem("ld-intro","1"); }catch(e){}
    root.classList.remove("intro-on");
    if(intro) intro.hidden=true;
    if(startStats) startStats();
  }
  function play(){
    var lamp=$("#lamp"), timers=[], finished=false, raf=0;
    function at(ms,f){ timers.push(setTimeout(f,ms)); }
    function finish(fast){
      if(finished) return; finished=true; timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      if(fast){ intro.style.transition="opacity .28s ease"; intro.style.opacity="0"; setTimeout(done,290); }
      else done();
    }
    function reveal(){
      var r=lamp.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height*(160/300);
      intro.style.setProperty("--cx",cx+"px"); intro.style.setProperty("--cy",cy+"px");
      var max=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy))+4, t0=null, dur=820;
      function step(ts){ if(!t0) t0=ts; var k=Math.min(1,(ts-t0)/dur), e=k*k*k;
        intro.style.setProperty("--r",(max*e)+"px"); if(k<1) raf=requestAnimationFrame(step); }
      raf=requestAnimationFrame(step);
      /* a lâmpada voa até o botão de tema e vira o interruptor do site */
      var b=tb&&tb.getBoundingClientRect();
      intro.classList.add("out");
      if(b&&b.width){
        var gh=r.height*(118/300), s=Math.max(.06,(b.height*.62)/gh);
        lamp.style.transformOrigin="50% "+(160/300*100)+"%";
        lamp.style.transition="transform .8s cubic-bezier(.65,0,.25,1), opacity .3s ease .62s";
        lamp.style.transform="translate("+((b.left+b.width/2)-cx)+"px,"+((b.top+b.height/2)-cy)+"px) scale("+s+")";
        lamp.style.opacity="0";
        at(840,function(){ tb.classList.add("landed"); setTimeout(function(){tb.classList.remove("landed");},950); });
      } else { lamp.style.transition="opacity .4s"; lamp.style.opacity="0"; }
    }
    at(1400,function(){ intro.classList.add("pull"); });
    at(1640,function(){ intro.classList.add("on"); });
    at(2280,reveal);
    at(3150,function(){ finish(false); });
    intro.addEventListener("click",function(){ finish(true); });
    document.addEventListener("keydown",function k(e){ if(e.key==="Escape"||e.key==="Enter"||e.key===" "){ document.removeEventListener("keydown",k); finish(true); } });
  }

  window.LUZ={refresh:function(){ watch(); moreLabel(); }};
  watch(); moreLabel();
  if(intro&&root.classList.contains("intro-on")&&!reduce) play(); else done();
})();

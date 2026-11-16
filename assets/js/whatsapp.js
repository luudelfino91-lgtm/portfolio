/* =====================================================================
   BOTÃO FLUTUANTE DO WHATSAPP
   - Único lugar para trocar o número: WA_NUMBER (formato internacional,
     só dígitos: 55 + DDD + número).
   - A mensagem inicial acompanha o idioma do site (EN/PT).
   - Sem JS, o botão leva para a seção #contato.
   ===================================================================== */
(function(){
  var WA_NUMBER = "55XXXXXXXXXXX";
  var MSG = {
    en: "Hi Lucas! I saw your portfolio and would like to talk.",
    pt: "Olá, Lucas! Vi seu portfólio e gostaria de conversar."
  };
  var a = document.getElementById("waFab");
  if(!a) return;
  function update(){
    var l = window.LANG === "pt" ? "pt" : "en";
    a.href = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(MSG[l]);
    a.target = "_blank";
    a.rel = "noopener";
  }
  update();
  if(window.onLang) window.onLang.push(update);
})();

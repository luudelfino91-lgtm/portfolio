// Executado como script externo same-origin (permitido pela CSP) numa pagina com a CSP real do Hub.
window.__probe = {};
try { eval('1'); window.__probe.eval = 'EXECUTOU'; } catch (e) { window.__probe.eval = 'bloqueado'; }
try { new Function('return 1')(); window.__probe.fn = 'EXECUTOU'; } catch (e) { window.__probe.fn = 'bloqueado'; }

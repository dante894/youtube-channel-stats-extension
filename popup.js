const $ = id => document.getElementById(id);
const f = n => Number(n).toLocaleString("es");

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

async function render() {
  const { last, error } = await chrome.storage.local.get(["last", "error"]);
  const { apiKey, channel } = await chrome.storage.sync.get(["apiKey", "channel"]);
  const app = $("app");

  if (!apiKey || !channel) {
    app.innerHTML = `<div class="msg">Falta configurar tu canal y tu clave de API.<br><br>
      <button id="opt">Abrir configuración</button></div>`;
    $("opt").onclick = () => chrome.runtime.openOptionsPage();
    return;
  }
  if (error) {
    app.innerHTML = `<div class="msg err">${esc(error)}</div>
      <footer><button id="opt">Configuración</button><button id="ref">Reintentar</button></footer>`;
    $("opt").onclick = () => chrome.runtime.openOptionsPage();
    $("ref").onclick = () => { chrome.runtime.sendMessage("refresh"); setTimeout(render, 2500); };
    return;
  }
  if (!last) { app.innerHTML = `<div class="msg">Consultando YouTube…</div>`; setTimeout(render, 1500); return; }

  const hora = new Date(last.updatedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  app.innerHTML = `
    <header>${last.thumb ? `<img src="${esc(last.thumb)}" alt="">` : ""}<strong>${esc(last.title)}</strong></header>
    <div class="hero">
      <div class="n">${last.hiddenSubs ? "Oculto" : f(last.subscribers)}</div>
      <div class="l">suscriptores</div>
    </div>
    <dl>
      <div><dt>Vistas totales</dt><dd>${f(last.views)}</dd></div>
      <div><dt>Videos publicados</dt><dd>${f(last.videoCount)}</dd></div>
      <div><dt>Likes en tus videos</dt><dd>${f(last.likes)}</dd></div>
      <div><dt>Comentarios</dt><dd>${f(last.comments)}</dd></div>
    </dl>
    ${last.top ? `<div class="top">Más visto: <a href="https://youtu.be/${esc(last.top.id)}" target="_blank">${esc(last.top.title)}</a> (${f(last.top.views)})</div>` : ""}
    <footer><span>Actualizado ${hora}</span><span><button id="opt">Ajustes</button> <button id="ref">Actualizar</button></span></footer>`;
  $("opt").onclick = () => chrome.runtime.openOptionsPage();
  $("ref").onclick = () => { chrome.runtime.sendMessage("refresh"); $("ref").textContent = "…"; setTimeout(render, 2500); };
}

render();

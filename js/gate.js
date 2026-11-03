// Schermata con password all'apertura del sito.
// ATTENZIONE: è una protezione di cortesia, non di sicurezza.
// Il sito è statico e il repository pubblico: chi conosce l'indirizzo
// dei file (per esempio data/...) li può aprire senza password.

(function () {
  // Impronta SHA-256 della password (la password non compare in chiaro).
  // Per cambiarla chiedi a Claude una nuova impronta.
  const PASSWORD_HASH = "514cc557c816e2bfbe061aead16dbcbbd4d252012d00776d913130bad7ef48d8";
  const KEY = "prototipo-sbloccato";

  const gate = document.getElementById("gate");
  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-input");
  const error = document.getElementById("gate-error");

  function unlock() {
    gate.remove();
    document.body.classList.remove("locked");
    window.startApp();
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Già sbloccato in questa sessione del browser?
  try {
    if (sessionStorage.getItem(KEY) === "1") { unlock(); return; }
  } catch (e) { /* archiviazione non disponibile: si chiede la password */ }

  input.focus();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if ((await sha256(input.value.trim())) === PASSWORD_HASH) {
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
      unlock();
    } else {
      error.hidden = false;
      input.select();
    }
  });
})();

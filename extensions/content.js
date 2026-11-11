// Orthodidacte – Compteur de temps (v1.1)
// SPA (Aurelia) : on observe le DOM et on réagit quand le temps
// d'un exercice terminé apparaît. Logs préfixés [ODT] dans la console.

(() => {
  const log = (...a) => console.log("%c[ODT]", "color:#2f9e5d;font-weight:bold", ...a);
  const TIME_RE = /^\s*(\d+)\s*h\s*(\d+)\s*min\s*(\d+)\s*s\s*$/i;
  const DEDUP_WINDOW_MS = 5 * 60 * 1000;

  log("script chargé sur", location.href, window === window.top ? "(page)" : "(iframe)");

  const parseTime = (text) => {
    const m = TIME_RE.exec(text || "");
    return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null;
  };

  const fmt = (sec) => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? `${h} h ` : "") + `${m} min ${String(s).padStart(2, "0")} s`;
  };

  // Valeur à côté d'un libellé donné ("Thème", "Type d'exercice"…)
  function valueNextTo(labelStart) {
    for (const el of document.querySelectorAll("p, span, div, dt, td, label")) {
      if (el.children.length) continue;
      const t = el.textContent.trim().toLowerCase();
      if (t.startsWith(labelStart)) {
        const v = el.nextElementSibling?.textContent?.trim();
        if (v) return v;
      }
    }
    return "";
  }

  // Trouve les éléments "feuilles" dont le texte est exactement un temps "X h YY min ZZ s"
  function findTimeElements() {
    const found = new Set();
    // 1) par la classe connue
    document.querySelectorAll('[class*="exerciseDetail-block-value"]').forEach((el) => {
      if (parseTime(el.textContent) !== null) found.add(el);
    });
    // 2) secours : tout élément sans enfant qui contient un temps, près de "Temps écoulé"
    if (!found.size && /temps\s+écoulé/i.test(document.body.innerText || "")) {
      document.querySelectorAll("p, span, div, td, dd, strong, b").forEach((el) => {
        if (!el.children.length && parseTime(el.textContent) !== null) found.add(el);
      });
    }
    return [...found];
  }

  function toast(msg, color = "#2f9e5d") {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: 2147483647,
      background: color, color: "#fff", padding: "10px 14px", borderRadius: "8px",
      font: "600 14px Lato, Arial, sans-serif", boxShadow: "0 4px 14px rgba(0,0,0,.2)",
      transition: "opacity .4s"
    });
    document.body.appendChild(t);
    setTimeout(() => (t.style.opacity = "0"), 3500);
    setTimeout(() => t.remove(), 4000);
  }

  async function record(seconds) {
    const details = { theme: valueNextTo("thème"), type: valueNextTo("type d") };
    const fp = `${seconds}|${details.theme}|${details.type}`;
    const now = Date.now();
    const data = await chrome.storage.local.get({ sessions: [], last: null });

    if (data.last && data.last.fp === fp && now - data.last.at < DEDUP_WINDOW_MS) {
      log("déjà compté il y a moins de 5 min, ignoré :", fp);
      toast(`Déjà compté (${fmt(seconds)})`, "#888");
      return;
    }

    data.sessions.push({ at: now, seconds, ...details });
    await chrome.storage.local.set({ sessions: data.sessions, last: { fp, at: now } });
    const total = data.sessions.reduce((a, s) => a + s.seconds, 0);
    log("enregistré :", seconds, "s", details, "— total :", total, "s");
    toast(`+${fmt(seconds)}  ·  Total : ${fmt(total)}`);
  }

  function scan() {
    for (const el of findTimeElements()) {
      if (el.dataset.odtCounted) continue;
      el.dataset.odtCounted = "1";
      const seconds = parseTime(el.textContent);
      log("temps détecté :", JSON.stringify(el.textContent.trim()), "→", seconds, "s", el);
      if (seconds > 0) record(seconds).catch((e) => log("erreur d'enregistrement", e));
    }
  }

  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(scan, 400);
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  scan();
})();

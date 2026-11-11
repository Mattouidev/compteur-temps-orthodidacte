function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
}
const sum = (arr) => arr.reduce((a, s) => a + s.seconds, 0);

async function render() {
  const { sessions } = await chrome.storage.local.get({ sessions: [] });
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const weekAgo = Date.now() - 7 * 86400000;

  document.getElementById("total").textContent = fmt(sum(sessions));
  document.getElementById("today").textContent = fmt(sum(sessions.filter((s) => s.at >= startToday.getTime())));
  document.getElementById("week").textContent = fmt(sum(sessions.filter((s) => s.at >= weekAgo)));
  document.getElementById("count").textContent = sessions.length;

  const list = document.getElementById("list");
  list.innerHTML = "";
  sessions.slice(-15).reverse().forEach((s) => {
    const li = document.createElement("li");
    const d = new Date(s.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
    li.textContent = `${d} — ${fmt(s.seconds)}${s.theme ? " · " + s.theme : ""}`;
    list.appendChild(li);
  });
}

document.getElementById("reset").addEventListener("click", async () => {
  if (!confirm("Remettre le compteur à zéro ?")) return;
  await chrome.storage.local.set({ sessions: [], last: null });
  render();
});

document.getElementById("export").addEventListener("click", async () => {
  const { sessions } = await chrome.storage.local.get({ sessions: [] });
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["date", "secondes", "theme", "type"]].concat(
    sessions.map((s) => [new Date(s.at).toISOString(), s.seconds, s.theme, s.type])
  );
  const csv = rows.map((r) => r.map(esc).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = "orthodidacte-temps.csv"; a.click();
  URL.revokeObjectURL(url);
});

chrome.storage.onChanged.addListener(render);
render();

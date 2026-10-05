importScripts("api.js");

const ALARM = "revisar-canal";

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + "M";
  if (n >= 1e4) return Math.round(n / 1e3) + "K";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(".0", "") + "K";
  return String(n);
}

async function refresh() {
  const { apiKey, channel, minutes } = await chrome.storage.sync.get(["apiKey", "channel", "minutes"]);
  if (!apiKey || !channel) return;

  try {
    const stats = await fetchStats(channel, apiKey);
    const { last } = await chrome.storage.local.get("last");

    // Avisos cuando algo sube
    if (last) {
      const dSubs = stats.subscribers - last.subscribers;
      const dVideos = stats.videoCount - last.videoCount;
      if (dSubs > 0) notify("¡Nuevos suscriptores!", `+${dSubs} (ahora tienes ${stats.subscribers.toLocaleString("es")})`);
      else if (dSubs < 0) notify("Bajaron tus suscriptores", `${dSubs} (ahora tienes ${stats.subscribers.toLocaleString("es")})`);
      if (dVideos > 0) notify("Video nuevo detectado", `Ya tienes ${stats.videoCount} videos en el canal.`);
    }

    await chrome.storage.local.set({ last: stats, error: null });
    chrome.action.setBadgeBackgroundColor({ color: "#1f6f4a" });
    chrome.action.setBadgeText({ text: stats.hiddenSubs ? "" : fmt(stats.subscribers) });
  } catch (e) {
    await chrome.storage.local.set({ error: e.message });
    chrome.action.setBadgeBackgroundColor({ color: "#b3261e" });
    chrome.action.setBadgeText({ text: "!" });
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title, message
  });
}

async function schedule() {
  const { minutes } = await chrome.storage.sync.get("minutes");
  await chrome.alarms.clear(ALARM);
  chrome.alarms.create(ALARM, { periodInMinutes: Math.max(5, Number(minutes) || 15) });
}

chrome.runtime.onInstalled.addListener(() => { schedule(); refresh(); });
chrome.runtime.onStartup.addListener(() => { schedule(); refresh(); });
chrome.alarms.onAlarm.addListener(a => a.name === ALARM && refresh());
chrome.storage.onChanged.addListener((c, area) => {
  if (area === "sync") { schedule(); refresh(); }
});
chrome.runtime.onMessage.addListener((msg) => { if (msg === "refresh") refresh(); });

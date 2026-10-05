const $ = id => document.getElementById(id);
chrome.storage.sync.get(["channel", "apiKey", "minutes"]).then(v => {
  $("channel").value = v.channel || "";
  $("apiKey").value = v.apiKey || "";
  $("minutes").value = v.minutes || 15;
});
$("save").onclick = async () => {
  await chrome.storage.sync.set({
    channel: $("channel").value.trim(),
    apiKey: $("apiKey").value.trim(),
    minutes: Math.max(5, Number($("minutes").value) || 15)
  });
  $("ok").textContent = "Guardado ✔";
  setTimeout(() => $("ok").textContent = "", 2000);
};

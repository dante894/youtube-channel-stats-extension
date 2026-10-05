// Funciones compartidas para hablar con la API de YouTube Data v3
const API = "https://www.googleapis.com/youtube/v3";

async function yt(path, params, apiKey) {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: apiKey })}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Error ${res.status}`);
  return data;
}

// Acepta @usuario, ID de canal (UC...) o URL del canal
async function resolveChannel(input, apiKey) {
  input = input.trim();
  const fromUrl = input.match(/youtube\.com\/(channel\/(UC[\w-]+)|@([\w.-]+))/);
  let params;
  if (fromUrl?.[2] || /^UC[\w-]{20,}$/.test(input)) {
    params = { part: "snippet,statistics,contentDetails", id: fromUrl?.[2] || input };
  } else {
    const handle = (fromUrl?.[3] || input).replace(/^@/, "");
    params = { part: "snippet,statistics,contentDetails", forHandle: handle };
  }
  const data = await yt("channels", params, apiKey);
  if (!data.items?.length) throw new Error("No encontré ese canal.");
  return data.items[0];
}

async function fetchStats(channelInput, apiKey) {
  const ch = await resolveChannel(channelInput, apiKey);
  const uploads = ch.contentDetails.relatedPlaylists.uploads;

  // IDs de todos los videos (máx. 200 para cuidar la cuota)
  let ids = [], pageToken;
  do {
    const page = await yt("playlistItems", {
      part: "contentDetails", playlistId: uploads, maxResults: 50,
      ...(pageToken && { pageToken })
    }, apiKey);
    ids.push(...page.items.map(i => i.contentDetails.videoId));
    pageToken = page.nextPageToken;
  } while (pageToken && ids.length < 200);

  // Estadísticas por video
  let videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await yt("videos", {
      part: "snippet,statistics", id: ids.slice(i, i + 50).join(",")
    }, apiKey);
    videos.push(...v.items);
  }

  const n = x => Number(x || 0);
  const totalLikes = videos.reduce((s, v) => s + n(v.statistics.likeCount), 0);
  const totalComments = videos.reduce((s, v) => s + n(v.statistics.commentCount), 0);
  const top = [...videos].sort((a, b) => n(b.statistics.viewCount) - n(a.statistics.viewCount))[0];

  return {
    channelId: ch.id,
    title: ch.snippet.title,
    thumb: ch.snippet.thumbnails?.default?.url,
    subscribers: n(ch.statistics.subscriberCount),
    hiddenSubs: !!ch.statistics.hiddenSubscriberCount,
    views: n(ch.statistics.viewCount),
    videoCount: n(ch.statistics.videoCount),
    likes: totalLikes,
    comments: totalComments,
    top: top && { title: top.snippet.title, id: top.id, views: n(top.statistics.viewCount) },
    updatedAt: Date.now()
  };
}

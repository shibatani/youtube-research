import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fukuokaScoutVideo } from "../../db/repository";
import type { FukuokaScoutVideo } from "../../db/schema";

const formatNumber = (n: number): string => n.toLocaleString("ja-JP");

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const buildVideoCard = (video: FukuokaScoutVideo): string => `
  <div class="card" data-view-count="${video.viewCount}" data-spread-rate="${video.spreadRate}" data-spread-ratio="${video.spreadRatio}" data-title="${escapeHtml(video.title)}" data-channel="${escapeHtml(video.channelName)}">
    <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener">
      <img src="https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg" alt="${escapeHtml(video.title)}" loading="lazy" />
    </a>
    <div class="card-body">
      <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" rel="noopener" class="title">${escapeHtml(video.title)}</a>
      <div class="channel">${escapeHtml(video.channelName)}</div>
      <div class="metrics">
        <span class="metric"><b>${formatNumber(video.viewCount)}</b> 再生</span>
        <span class="metric">登録者 <b>${formatNumber(video.subscriberCount)}</b></span>
      </div>
      <div class="metrics">
        <span class="metric">拡散率 <b>${Math.round(video.spreadRate * 100) / 100}</b></span>
        <span class="metric">拡散比率 <b>${Math.round(video.spreadRatio)}%</b></span>
      </div>
    </div>
  </div>`;

const buildHtml = (videos: FukuokaScoutVideo[]): string => `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>fukuoka-scout</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 16px; }
h1 { font-size: 1.4rem; margin-bottom: 12px; }
.info { font-size: 0.85rem; color: #666; margin-bottom: 16px; }
.filters { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.filter-group { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; }
.filter-group label { white-space: nowrap; font-weight: 600; }
.filter-group input[type="number"] { width: 80px; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem; }
.filter-group input[type="text"] { width: 160px; padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem; }
.filter-group select { padding: 4px 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.15s; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
.card-body { padding: 12px; }
.title { font-size: 0.9rem; font-weight: 600; color: #333; text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
.title:hover { color: #065fd4; }
.channel { font-size: 0.8rem; color: #666; margin-top: 4px; }
.metrics { display: flex; gap: 12px; margin-top: 6px; font-size: 0.8rem; color: #555; }
.metric b { color: #333; }
.count { font-size: 0.85rem; color: #666; margin-bottom: 8px; }
.hidden { display: none !important; }
</style>
</head>
<body>
<h1>fukuoka-scout</h1>
<div class="info">福岡関連YouTube動画 | ${videos.length}件 | 再生5万回以上</div>

<div class="filters">
  <div class="filter-group">
    <label>再生数</label>
    <input type="number" id="viewMin" placeholder="min">
    <span>〜</span>
    <input type="number" id="viewMax" placeholder="max">
  </div>
  <div class="filter-group">
    <label>拡散率</label>
    <input type="number" id="srMin" placeholder="min" step="0.1">
    <span>〜</span>
    <input type="number" id="srMax" placeholder="max" step="0.1">
  </div>
  <div class="filter-group">
    <label>拡散比率(%)</label>
    <input type="number" id="ratioMin" placeholder="min">
    <span>〜</span>
    <input type="number" id="ratioMax" placeholder="max">
  </div>
  <div class="filter-group">
    <label>検索</label>
    <input type="text" id="textSearch" placeholder="タイトル・CH名">
  </div>
  <div class="filter-group">
    <label>ソート</label>
    <select id="sortBy">
      <option value="viewCount">再生数順</option>
      <option value="spreadRate">拡散率順</option>
      <option value="spreadRatio">拡散比率順</option>
    </select>
  </div>
</div>

<div class="count" id="count"></div>
<div class="grid" id="grid">
${videos.map(buildVideoCard).join("\n")}
</div>

<script>
(function() {
  const grid = document.getElementById("grid");
  const cards = Array.from(grid.children);
  const countEl = document.getElementById("count");
  const inputs = ["viewMin","viewMax","srMin","srMax","ratioMin","ratioMax","textSearch","sortBy"];

  function getVal(id) { return document.getElementById(id).value; }
  function getNum(id) { const v = getVal(id); return v === "" ? null : Number(v); }

  function applyFilters() {
    const viewMin = getNum("viewMin"), viewMax = getNum("viewMax");
    const srMin = getNum("srMin"), srMax = getNum("srMax");
    const ratioMin = getNum("ratioMin"), ratioMax = getNum("ratioMax");
    const text = getVal("textSearch").toLowerCase();
    const sortBy = getVal("sortBy");

    let visible = 0;
    cards.forEach(function(card) {
      const vc = Number(card.dataset.viewCount);
      const sr = Number(card.dataset.spreadRate);
      const ratio = Number(card.dataset.spreadRatio);
      const title = card.dataset.title.toLowerCase();
      const channel = card.dataset.channel.toLowerCase();

      let show = true;
      if (viewMin !== null && vc < viewMin) show = false;
      if (viewMax !== null && vc > viewMax) show = false;
      if (srMin !== null && sr < srMin) show = false;
      if (srMax !== null && sr > srMax) show = false;
      if (ratioMin !== null && ratio < ratioMin) show = false;
      if (ratioMax !== null && ratio > ratioMax) show = false;
      if (text && !title.includes(text) && !channel.includes(text)) show = false;

      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });

    cards.sort(function(a, b) {
      return Number(b.dataset[sortBy]) - Number(a.dataset[sortBy]);
    });
    cards.forEach(function(card) { grid.appendChild(card); });

    countEl.textContent = visible + " / " + cards.length + " 件表示";
  }

  inputs.forEach(function(id) {
    var el = document.getElementById(id);
    el.addEventListener("input", applyFilters);
    el.addEventListener("change", applyFilters);
  });

  applyFilters();
})();
</script>
</body>
</html>`;

/**
 * DBから全データ取得してHTMLを生成し、docs/fukuoka-scout/index.html に書き出す
 */
export const generatePage = async (): Promise<void> => {
  const videos = await fukuokaScoutVideo.getAllOrderByViewCount();
  const html = buildHtml(videos);
  const outputDir = resolve(__dirname, "../../../docs/fukuoka-scout");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "index.html");
  writeFileSync(outputPath, html, "utf-8");
  console.log(`📄 HTML出力: ${outputPath} (${videos.length}件)`);
};

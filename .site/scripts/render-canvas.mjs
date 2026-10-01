// Render the original Obsidian Canvas coordinates and text without editing the vault.
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char])
const colors = { "1": "#e05264", "2": "#df8743", "3": "#c6a044", "4": "#55a870", "5": "#4ba5af", "6": "#9974c4" }
const palette = (color) => colors[color] ?? (/^#[0-9a-f]{6}$/i.test(color ?? "") ? color : "#b8b8b8")
const position = (node, side) => {
  const x = Number(node.x), y = Number(node.y), w = Number(node.width), h = Number(node.height)
  return { top: [x + w / 2, y], bottom: [x + w / 2, y + h], left: [x, y + h / 2], right: [x + w, y + h / 2] }[side] ?? [x + w / 2, y + h / 2]
}
const direction = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }

export function renderCanvas(canvas, title) {
  const nodes = (canvas.nodes ?? []).filter((n) => [n.x, n.y, n.width, n.height].every(Number.isFinite))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const minX = Math.min(0, ...nodes.map((n) => n.x)) - 70
  const minY = Math.min(0, ...nodes.map((n) => n.y)) - 70
  const maxX = Math.max(0, ...nodes.map((n) => n.x + n.width)) + 70
  const maxY = Math.max(0, ...nodes.map((n) => n.y + n.height)) + 70
  const width = maxX - minX, height = maxY - minY
  const edges = (canvas.edges ?? []).map((edge, index) => {
    const from = byId.get(edge.fromNode), to = byId.get(edge.toNode)
    if (!from || !to) return ""
    const a = position(from, edge.fromSide), b = position(to, edge.toSide)
    const da = direction[edge.fromSide] ?? [0, 1], db = direction[edge.toSide] ?? [0, -1]
    const bend = Math.max(50, Math.hypot(a[0] - b[0], a[1] - b[1]) * 0.35)
    const c1 = [a[0] + da[0] * bend, a[1] + da[1] * bend]
    const c2 = [b[0] + db[0] * bend, b[1] + db[1] * bend]
    const color = palette(edge.color)
    return `<g style="color:${color}"><defs><marker id="arrow-${index}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs><path d="M ${a} C ${c1} ${c2} ${b}" fill="none" stroke="currentColor" stroke-width="2" ${edge.fromEnd === "arrow" ? `marker-start="url(#arrow-${index})"` : ""} ${edge.toEnd !== "none" ? `marker-end="url(#arrow-${index})"` : ""}/>${edge.label ? `<text x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 - 8}" text-anchor="middle" fill="#555">${escape(edge.label)}</text>` : ""}</g>`
  }).join("")
  const cards = nodes.map((node) => {
    // Links to notes outside this public vault remain their original readable labels.
    const text = (node.text ?? node.label ?? node.file ?? node.url ?? "").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label ?? target)
    return `<section class="card ${node.type === "group" ? "group" : ""} ${node.height <= 70 ? "compact" : ""}" aria-label="${escape(text.split("\n")[0])}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--card-color:${palette(node.color)};${node.color ? "--card-bg:color-mix(in srgb,var(--card-color) 7%,white)" : ""}"><div>${escape(text)}</div></section>`
  }).join("")
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — Canvas</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#252525;background:#fafafa}
#viewport{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;background-image:radial-gradient(#ddd .8px,transparent .8px);background-size:20px 20px}#viewport.dragging{cursor:grabbing}
#world{position:absolute;left:0;top:0;transform-origin:0 0;width:${width}px;height:${height}px;will-change:transform}svg{position:absolute;overflow:visible;pointer-events:none;width:100%;height:100%}
.card{position:absolute;border:2px solid var(--card-color);border-radius:7px;background:var(--card-bg,#fff);overflow:auto;cursor:text;touch-action:pan-y;scrollbar-width:thin;user-select:text}.card>div{padding:14px;white-space:pre-wrap;overflow-wrap:anywhere}.card.group{background:transparent;z-index:-1}
.card.compact>div{padding:4px 10px;font-size:14px;line-height:1.35}
.toolbar{position:absolute;z-index:3;top:14px;right:14px;display:flex;gap:6px;padding:6px;border:1px solid #ddd;background:#fffffff2;border-radius:12px;box-shadow:0 4px 20px #00000009}.toolbar button{font:500 14px/1 system-ui;background:#fff;color:#252525;border:1px solid #ddd;border-radius:8px;min-width:40px;height:40px;padding:0 12px;cursor:pointer}.toolbar button:hover{background:#efefed}.toolbar button:focus-visible{outline:2px solid #252525;outline-offset:2px}#zoom{font-variant-numeric:tabular-nums;min-width:72px}
.hint{position:absolute;bottom:12px;left:12px;margin:0;padding:6px 10px;border-radius:8px;background:#fffffff0;font-size:12px;color:#666;pointer-events:none}@media(max-width:500px){.toolbar{top:8px;right:8px;gap:4px}.toolbar button{padding:0 9px;min-width:36px}.hint{font-size:11px}}
</style></head><body>
<div id="viewport" aria-label="${escape(title)}: поле Canvas"><div id="world"><svg aria-hidden="true">${edges}</svg>${cards}</div></div>
<nav class="toolbar" aria-label="Управление Canvas"><button id="minus" aria-label="Уменьшить">−</button><button id="zoom" aria-label="Показать весь Canvas">Вписать</button><button id="plus" aria-label="Увеличить">+</button><button id="fullscreen" aria-label="Открыть Canvas на весь экран">⛶</button></nav>
<p class="hint">Перетаскивай поле · Масштаб: + / − или жест двумя пальцами</p>
<script>
const viewport=document.querySelector('#viewport'),world=document.querySelector('#world'),zoomLabel=document.querySelector('#zoom');
let scale=1,x=0,y=0;const points=new Map();
function draw(){world.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';zoomLabel.textContent=Math.round(scale*100)+'%'}
function fit(){scale=Math.min((innerWidth-40)/${width},(innerHeight-100)/${height},1);x=(innerWidth-${width}*scale)/2-(${minX})*scale;y=(innerHeight-${height}*scale)/2-(${minY})*scale+20;draw()}
function zoom(factor,cx=innerWidth/2,cy=innerHeight/2){const next=Math.max(.08,Math.min(2.5,scale*factor));x=cx-(cx-x)*next/scale;y=cy-(cy-y)*next/scale;scale=next;draw()}
document.querySelector('#plus').onclick=()=>zoom(1.3);document.querySelector('#minus').onclick=()=>zoom(1/1.3);zoomLabel.onclick=fit;
document.querySelector('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>{})};
viewport.addEventListener('wheel',e=>{if(e.target.closest('.card')&&!e.ctrlKey&&!e.metaKey)return;e.preventDefault();if(e.ctrlKey||e.metaKey)zoom(Math.exp(-e.deltaY*.008),e.clientX,e.clientY);else{x-=e.deltaX;y-=e.deltaY;draw()}},{passive:false});
function span(){const p=[...points.values()];return p.length===2?{distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:null}
viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.target.closest('.card'))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging')});
viewport.addEventListener('pointermove',e=>{const old=points.get(e.pointerId);if(!old)return;const before=span();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const after=span();if(before&&after){zoom(after.distance/Math.max(1,before.distance),before.x,before.y);x+=after.x-before.x;y+=after.y-before.y}else{x+=e.clientX-old.x;y+=e.clientY-old.y}draw()});
function end(e){points.delete(e.pointerId);if(!points.size)viewport.classList.remove('dragging')};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
addEventListener('resize',fit);addEventListener('keydown',e=>{if(e.key==='+'||e.key==='=')zoom(1.3);if(e.key==='-')zoom(1/1.3);if(e.key==='0')fit()});fit();
</script></body></html>`
}

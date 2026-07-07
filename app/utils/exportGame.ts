import type { Project } from '~/types'

/**
 * 将当前项目导出为一个可玩的 H5 游戏文件夹（index.html + assets/）。
 *
 * 实现思路：
 *  1. 收集项目中所有被引用的资源（按 asset id 与 url 两种形式）。
 *  2. 把本地资源映射为相对路径 `assets/<filename>`，运行时由浏览器按需加载，
 *     避免单文件 base64 内联导致的体积膨胀与卡顿；远程 URL 原样保留。
 *  3. 把项目数据（资源已转为相对路径）+ 一段原生 JS 游戏运行时拼装成 index.html。
 *
 * 调用方（composable）负责选择目录、复制资源文件、写入 index.html。
 */
export async function exportProjectForFolder(project: Project): Promise<{ html: string; assetFiles: string[] }> {
  const referenced = collectReferencedAssets(project)
  const { idToPath, urlToPath, assetFiles } = buildAssetPathMaps(project, referenced)

  // 生成精简后的运行数据：去掉编辑器专用字段，避免泄露本地路径。
  const runtimeData = buildRuntimeData(project, idToPath, urlToPath)
  const dataJson = JSON.stringify(runtimeData)

  const html = buildHtmlShell(dataJson)
  return { html, assetFiles }
}

// ============== 资源收集 ==============

interface CollectedAssets {
  /** 直接以 url/文件名形式引用的资源 */
  urlRefs: Set<string>
}

function addUrlRef(set: Set<string>, value: unknown) {
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (!trimmed) return
  set.add(trimmed)
}

/**
 * 扫描整个项目，收集所有可能引用本地资源文件的字符串值。
 * 覆盖：素材库 url、起始页背景/BGM/标题/按钮图、节点媒体字段、
 * 角色头像与图集、数值图标、成就图片等。
 */
function collectReferencedAssets(project: Project): CollectedAssets {
  const urlRefs = new Set<string>()

  // 1) 素材库中所有资源的 url（这些是真实文件名）
  for (const video of project.assets.videos) addUrlRef(urlRefs, video.url)
  for (const image of project.assets.images) addUrlRef(urlRefs, image.url)
  for (const audio of project.assets.audios) addUrlRef(urlRefs, audio.url)
  for (const subtitle of project.assets.subtitles) addUrlRef(urlRefs, subtitle.url)

  // 2) 起始页直接 url 字段
  const sp = project.startPage
  if (sp) {
    addUrlRef(urlRefs, sp.backgroundMedia)
    addUrlRef(urlRefs, sp.bgm)
    addUrlRef(urlRefs, sp.titleImage)
    if (sp.buttonStyles) {
      addUrlRef(urlRefs, sp.buttonStyles.start?.image)
      addUrlRef(urlRefs, sp.buttonStyles.continue?.image)
      addUrlRef(urlRefs, sp.buttonStyles.achievements?.image)
      addUrlRef(urlRefs, sp.buttonStyles.collection?.image)
      addUrlRef(urlRefs, sp.buttonStyles.settings?.image)
    }
  }

  // 3) 章节节点中的媒体字段
  for (const chapter of project.chapters) {
    for (const node of chapter.nodes) {
      switch (node.type) {
        case 'video':
          // videoId 是 asset id，由 idMap 处理；无需放入 urlRefs
          break
        case 'ending':
          addUrlRef(urlRefs, node.endingImage)
          break
        default:
          break
      }
    }
  }

  // 4) 角色：avatar 可能是 asset id 或 url；images 通常是 asset id
  for (const char of project.characters) {
    addUrlRef(urlRefs, char.avatar)
    for (const img of char.images) addUrlRef(urlRefs, img)
  }

  // 5) 数值图标、成就图片
  for (const val of project.gameValues) addUrlRef(urlRefs, val.icon)
  for (const ach of project.achievements) addUrlRef(urlRefs, ach.image)

  return { urlRefs }
}

// ============== 资源路径映射 ==============

/**
 * 判断引用是否为本地资源文件名（需要被复制到导出目录）。
 * 已是 data URI / 远程地址 / blob 的不处理，原样保留。
 */
function isLocalAssetRef(ref: string): boolean {
  if (!ref) return false
  if (ref.startsWith('data:')) return false
  if (ref.startsWith('http://') || ref.startsWith('https://')) return false
  if (ref.startsWith('blob:')) return false
  if (ref.startsWith('//')) return false
  return true
}

/**
 * 将文件名编码为 URL 安全的相对路径（按 / 分段编码，与编辑器 getAssetUrl 一致）。
 */
function encodeAssetPath(filename: string): string {
  return 'assets/' + filename
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

/**
 * 建立本地资源 → `assets/<filename>` 相对路径的映射。
 * 返回：
 *  - idToPath / urlToPath：运行时数据构建时用到的两张映射表
 *  - assetFiles：需要复制到导出目录 assets/ 下的原始文件名列表（去重）
 */
function buildAssetPathMaps(
  project: Project,
  collected: CollectedAssets
): { idToPath: Record<string, string>; urlToPath: Record<string, string>; assetFiles: string[] } {
  const urlToPath: Record<string, string> = {}
  const idToPath: Record<string, string> = {}
  const assetFiles: string[] = []

  for (const ref of collected.urlRefs) {
    if (isLocalAssetRef(ref)) {
      urlToPath[ref] = encodeAssetPath(ref)
      assetFiles.push(ref)
    }
    // 远程/data 引用不进映射表，运行时原样返回
  }

  // 为每个素材建立 id → 相对路径映射（通过其 url）
  const allAssets = [
    ...project.assets.videos,
    ...project.assets.images,
    ...project.assets.audios,
    ...project.assets.subtitles,
  ]
  for (const asset of allAssets) {
    const url = (asset.url || '').trim()
    if (!url) continue
    const mapped = urlToPath[url] || (isLocalAssetRef(url) ? null : url)
    if (mapped) idToPath[asset.id] = mapped
  }

  return { idToPath, urlToPath, assetFiles }
}

// ============== 运行时数据构建 ==============

function buildRuntimeData(
  project: Project,
  idToPath: Record<string, string>,
  urlToPath: Record<string, string>
) {
  // 统一的资源解析器：先按 asset id，再按 url，最后保留原值
  const resolve = (ref: unknown): string => {
    if (typeof ref !== 'string' || !ref) return ''
    if (idToPath[ref]) return idToPath[ref]
    if (urlToPath[ref]) return urlToPath[ref]
    // 已是 data/http 或无法映射的资源，原样返回
    return ref
  }

  return {
    name: project.name,
    cover: resolve(project.cover),
    gameValues: project.gameValues.map(v => ({
      id: v.id,
      name: v.name,
      icon: resolve(v.icon),
      defaultValue: v.defaultValue,
      minValue: v.minValue,
      maxValue: v.maxValue,
    })),
    characters: project.characters.map(c => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      avatar: resolve(c.avatar),
      description: c.description,
      images: (c.images || []).map(resolve).filter(Boolean),
    })),
    chapters: project.chapters.map(ch => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      backgroundAudioId: ch.backgroundAudioId,
      order: ch.order,
      startNodeId: ch.startNodeId,
      nodes: ch.nodes.map(node => normalizeNode(node, resolve)),
    })),
    achievements: project.achievements.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      image: resolve(a.image),
      conditions: a.conditions || [],
    })),
    collection: project.collection.map(c => ({
      id: c.id,
      characterId: c.characterId,
      description: c.description,
      unlockConditions: c.unlockConditions || [],
    })),
    startPage: normalizeStartPage(project.startPage, resolve),
    assets: {
      videos: project.assets.videos.map(v => ({ id: v.id, name: v.name, url: resolve(v.url), duration: v.duration })),
      audios: project.assets.audios.map(a => ({ id: a.id, name: a.name, url: resolve(a.url) })),
      subtitles: project.assets.subtitles.map(s => ({ id: s.id, name: s.name, url: resolve(s.url) })),
    },
  }
}

function normalizeNode(node: any, resolve: (ref: unknown) => string): any {
  switch (node.type) {
    case 'video':
      return {
        id: node.id, type: node.type, name: node.name,
        videoId: node.videoId,
        subtitleEnabled: !!node.subtitleEnabled,
        subtitleId: node.subtitleId,
        nextNodeId: node.nextNodeId,
        valueChanges: node.valueChanges || [],
      }
    case 'choice':
      return {
        id: node.id, type: node.type, name: node.name,
        prompt: node.prompt,
        hasCountdown: !!node.hasCountdown,
        countdownSeconds: node.countdownSeconds,
        defaultOptionId: node.defaultOptionId,
        options: (node.options || []).map((o: any) => ({
          id: o.id, text: o.text, nextNodeId: o.nextNodeId, valueChanges: o.valueChanges || [],
        })),
      }
    case 'ending':
      return {
        id: node.id, type: node.type, name: node.name,
        title: node.title, description: node.description,
        endingImage: resolve(node.endingImage),
      }
    case 'clear':
      return {
        id: node.id, type: node.type, name: node.name,
        title: node.title, description: node.description,
      }
    case 'condition':
      return {
        id: node.id, type: node.type, name: node.name,
        conditionGroup: node.conditionGroup,
        trueNodeId: node.trueNodeId,
        falseNodeId: node.falseNodeId,
      }
    default:
      return { ...node }
  }
}

function normalizeStartPage(sp: any, resolve: (ref: unknown) => string): any {
  if (!sp) return null
  const bs = sp.buttonStyles || {}
  return {
    backgroundType: sp.backgroundType || 'image',
    backgroundMedia: resolve(sp.backgroundMedia),
    bgm: resolve(sp.bgm),
    titleMode: sp.titleMode || 'text',
    titleText: sp.titleText || '',
    titleImage: resolve(sp.titleImage),
    menuPosition: sp.menuPosition || { x: -0.35, y: 0.05 },
    titlePosition: sp.titlePosition || { x: -0.2, y: -0.35 },
    settingsPosition: sp.settingsPosition || { x: 0.4, y: -0.4 },
    buttonStyles: {
      start: normalizeButtonStyle(bs.start),
      continue: normalizeButtonStyle(bs.continue),
      achievements: normalizeButtonStyle(bs.achievements),
      collection: normalizeButtonStyle(bs.collection),
      settings: normalizeButtonStyle(bs.settings),
    },
  }

  function normalizeButtonStyle(style: any) {
    if (!style) return { mode: 'normal', text: '', textColor: '#ffffff', backgroundColor: '#1f2937', image: '' }
    return {
      mode: style.mode || 'normal',
      text: style.text || '',
      textColor: style.textColor || '#ffffff',
      backgroundColor: style.backgroundColor || '#1f2937',
      image: resolve(style.image),
    }
  }
}

// ============== 工具 ==============

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '').trim()
  return cleaned || 'game'
}

function buildHtmlShell(dataJson: string): string {
  // 注意：runtime 脚本中不能用反引号，因为整个脚本要被插入到模板字符串里；
  // 这里采用字符串数组拼接，避免与外层模板字符串冲突。
  const runtimeJs = RUNTIME_JS
  const escapedData = dataJson
    .replace(/<\/script>/gi, '<\\/script>')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>互动影游</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { width: 100%; height: 100%; background: #000; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: #fff; }
#app { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
#stage { position: relative; background: #111; overflow: hidden; box-shadow: 0 0 60px rgba(0,0,0,0.6); }
.layer { position: absolute; inset: 0; }
.btn { cursor: pointer; border: none; outline: none; font-family: inherit; transition: transform .12s ease, filter .12s ease; }
.btn:active { transform: scale(0.97); }
.center-col { position: absolute; display: flex; flex-direction: column; gap: 12px; }
.menu { display: flex; flex-direction: column; gap: 12px; width: 220px; }
.menu .btn { width: 100%; padding: 12px 16px; border-radius: 12px; font-size: 16px; font-weight: 600; text-align: center; }
.title { font-size: clamp(28px, 5vw, 56px); font-weight: 800; letter-spacing: 2px; text-shadow: 0 4px 24px rgba(0,0,0,0.6); }
.subtitle { font-size: 14px; opacity: 0.85; }
.choice-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 24px; gap: 12px; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.1) 60%, transparent); }
.choice-prompt { font-size: clamp(18px, 3vw, 26px); font-weight: 700; text-align: center; margin-bottom: 8px; text-shadow: 0 2px 12px rgba(0,0,0,0.8); max-width: 80%; }
.choice-btn { width: min(520px, 90%); padding: 14px 20px; border-radius: 12px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: #fff; font-size: 16px; font-weight: 600; backdrop-filter: blur(6px); }
.choice-btn:hover { background: rgba(255,255,255,0.22); }
.countdown { position: absolute; top: 16px; right: 16px; font-size: 22px; font-weight: 800; background: rgba(0,0,0,0.5); padding: 6px 14px; border-radius: 999px; }
.ending-wrap, .clear-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; gap: 16px; background: rgba(0,0,0,0.7); text-align: center; }
.ending-img { max-width: 70%; max-height: 50vh; border-radius: 12px; object-fit: contain; }
.panel { position: absolute; inset: 0; background: rgba(10,12,20,0.92); overflow-y: auto; padding: 24px; }
.panel h2 { font-size: 22px; margin-bottom: 16px; }
.panel .close { position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.12); color: #fff; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; display: flex; align-items: center; justify-content: center; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; }
.card.locked { opacity: 0.45; filter: grayscale(0.6); }
.card img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; background: #222; }
.card h4 { font-size: 15px; margin-bottom: 4px; }
.card p { font-size: 12px; opacity: 0.7; line-height: 1.5; }
.topbar { position: absolute; top: 12px; left: 12px; display: flex; gap: 8px; z-index: 20; }
.topbar .btn { background: rgba(0,0,0,0.45); color: #fff; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; }
.hidden { display: none !important; }
.video-el { width: 100%; height: 100%; object-fit: contain; background: #000; }
.toast { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.75); color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 14px; z-index: 50; }
/* 时间线面板：叠加层，盖在 topbar 之上，不清空舞台 */
.timeline-overlay { z-index: 30; }
.timeline-overlay h2 { display: flex; align-items: center; gap: 8px; }
.timeline-hint { margin-top: -8px; }
/* 章节容器：居中列布局，章节作为外框分组 */
.timeline-chapter { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 18px 16px 20px; margin-bottom: 18px; }
/* 章节标题 */
.timeline-chapter-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.timeline-chapter-anchor { width: 30px; height: 30px; flex-shrink: 0; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; box-shadow: 0 0 0 4px rgba(99,102,241,0.18); }
.timeline-chapter-name { font-size: 17px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.3; }
.timeline-chapter-desc { font-size: 12px; opacity: 0.6; margin-top: 2px; font-weight: 400; }
/* 流程节点：每张卡片居中显示 */
.timeline-event { display: flex; justify-content: center; }
.timeline-event-card { width: 100%; max-width: 420px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-left: 4px solid #6366f1; border-radius: 12px; padding: 12px 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
.timeline-event.end .timeline-event-card { border-left-color: #ef4444; background: rgba(239,68,68,0.1); box-shadow: 0 0 16px rgba(239,68,68,0.2); }
.timeline-event-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.timeline-event-main { flex: 1; min-width: 0; }
.timeline-event-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(99,102,241,0.2); color: #c7d2fe; margin-bottom: 6px; }
.timeline-event.end .timeline-event-tag { background: rgba(239,68,68,0.22); color: #fecaca; }
.timeline-event-title { font-size: 14px; font-weight: 600; line-height: 1.4; word-break: break-word; }
.timeline-event-detail { font-size: 12px; opacity: 0.78; margin-top: 4px; line-height: 1.45; word-break: break-word; }
.timeline-event-ts { flex-shrink: 0; font-size: 11px; opacity: 0.6; font-variant-numeric: tabular-nums; padding-top: 2px; white-space: nowrap; }
/* 节点之间的箭头连线 ▼ */
.timeline-arrow { display: flex; justify-content: center; color: rgba(99,102,241,0.6); font-size: 16px; line-height: 1; margin: 6px 0; }
</style>
</head>
<body>
<div id="app"><div id="stage"></div></div>
<script>
window.__DRAMA_DATA__ = ${escapedData};
</script>
<script>${runtimeJs}</script>
</body>
</html>`
}

// 运行时引擎（原生 JS，无依赖）。使用字符串数组拼接以避免与外层模板字符串冲突。
const RUNTIME_JS = [
  '(function(){',
  '  "use strict";',
  '  var DATA = window.__DRAMA_DATA__ || {};',
  '  var SAVE_KEY = "drama_save_" + (DATA.name || "game");',
  '  var stage = document.getElementById("stage");',
  '',
  '  // ===== 状态 =====',
  '  var state = createInitialState();',
  '  function createInitialState(){',
  '    var values = {};',
  '    (DATA.gameValues||[]).forEach(function(v){',
  '      (DATA.characters||[]).forEach(function(c){ values[c.id+"|"+v.id] = v.defaultValue; });',
  '      // 允许无角色绑定的全局数值',
  '      values["|"+v.id] = v.defaultValue;',
  '    });',
  '    return { values: values, visitedChapters: {}, playedNodes: {}, unlockedAchievements: {}, unlockedCollection: {}, currentChapterId: null, currentNodeId: null, timeline: [] };',
  '  }',
  '',
  '  // ===== 资源解析 =====',
  '  function findVideo(id){ return (DATA.assets.videos||[]).find(function(v){return v.id===id;}); }',
  '  function findAudio(id){ return (DATA.assets.audios||[]).find(function(a){return a.id===id;}); }',
  '  function findSubtitle(id){ return (DATA.assets.subtitles||[]).find(function(s){return s.id===id;}); }',
  '  function findCharacter(id){ return (DATA.characters||[]).find(function(c){return c.id===id;}); }',
  '  function findChapter(id){ return (DATA.chapters||[]).find(function(c){return c.id===id;}); }',
  '  function firstChapter(){ return (DATA.chapters||[])[0] || null; }',
  '',
  '  // ===== 舞台尺寸（响应式填满浏览器窗口）=====',
  '  function fitStage(){',
  '    var vw = window.innerWidth, vh = window.innerHeight;',
  '    stage.style.width = vw+"px"; stage.style.height = vh+"px";',
  '    stage.style.fontSize = Math.max(12, vw/40)+"px";',
  '  }',
  '  window.addEventListener("resize", fitStage);',
  '  fitStage();',
  '',
  '  // ===== 渲染辅助 =====',
  '  function clear(){ stage.innerHTML = ""; }',
  '  function el(tag, cls, html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }',
  '  function layer(){ var l=el("div","layer"); stage.appendChild(l); return l; }',
  '  function toast(msg, ms){ var t=el("div","toast",msg); stage.appendChild(t); setTimeout(function(){ t.remove(); }, ms||1800); }',
  '  function percent(x,y){ return { left:(x==null?0:x)+"px", top:(y==null?0:y)+"px", position:"absolute" }; }',
  '',
  '  function applyButtonStyle(btn, style, isSettings){',
  '    if(!style) return;',
  '    if(style.mode === "image" && style.image){',
  '      btn.style.backgroundImage = "url(\'"+style.image+"\')";',
  '      btn.style.backgroundSize="cover"; btn.style.backgroundPosition="center";',
  '      btn.style.backgroundColor="transparent"; btn.style.color="transparent";',
  '      btn.style.minHeight = isSettings ? "32px":"44px";',
  '      return;',
  '    }',
  '    btn.style.backgroundColor = style.backgroundColor || "#1f2937";',
  '    btn.style.color = style.textColor || "#ffffff";',
  '  }',
  '',
  '  // ===== 数值与条件 =====',
  '  function applyValueChanges(changes){ (changes||[]).forEach(function(ch){',
  '    var key = (ch.characterId||"")+"|"+(ch.valueId||"");',
  '    var gv = (DATA.gameValues||[]).find(function(v){return v.id===ch.valueId;});',
  '    var max = gv?gv.maxValue:null, min = gv?gv.minValue:null;',
  '    var cur = state.values[key]; if(cur==null) cur = gv?gv.defaultValue:0;',
  '    cur += (ch.delta||0);',
  '    if(max!=null) cur=Math.min(cur,max); if(min!=null) cur=Math.max(cur,min);',
  '    state.values[key]=cur;',
  '  }); checkAchievementsAndCollection(); }',
  '',
  '  function evalCondition(cond){',
  '    if(!cond) return true;',
  '    var key=(cond.characterId||"")+"|"+(cond.valueId||"");',
  '    var val=state.values[key]; if(val==null) val=0;',
  '    var t=cond.targetValue||0;',
  '    switch(cond.operator){ case ">":return val>t; case "<":return val<t; case ">=":return val>=t; case "<=":return val<=t; case "==":return val==t; case "!=":return val!=t; } return true;',
  '  }',
  '  function evalGroup(group){',
  '    if(!group||!group.conditions||!group.conditions.length) return true;',
  '    var isAnd = group.logic!=="or";',
  '    for(var i=0;i<group.conditions.length;i++){ var r=evalCondition(group.conditions[i]); if(isAnd&&!r)return false; if(!isAnd&&r)return true; }',
  '    return isAnd;',
  '  }',
  '',
  '  // ===== 成就/图鉴 =====',
  '  function checkAchievementsAndCollection(){',
  '    (DATA.achievements||[]).forEach(function(a){ if(state.unlockedAchievements[a.id])return; if(evalConditionsAny(a.conditions)){ state.unlockedAchievements[a.id]=true; toast("🏆 成就解锁："+a.name); } });',
  '    (DATA.collection||[]).forEach(function(c){ if(state.unlockedCollection[c.id])return; if(evalConditionsAny(c.unlockConditions)){ state.unlockedCollection[c.id]=true; } });',
  '  }',
  '  function evalConditionsAny(conds){ if(!conds||!conds.length)return false; for(var i=0;i<conds.length;i++){ var c=conds[i]; var ok=false;',
  '    if(c.type==="value") ok=evalCondition(c);',
  '    else if(c.type==="chapter_unlock") ok=!!state.visitedChapters[c.chapterId];',
  '    else if(c.type==="node_played") ok=!!state.playedNodes[c.nodeId];',
  '    if(!ok)return false; } return true; }',
  '',
  '  // ===== 时间线（玩家游玩经历记录）=====',
  '  // 记录一条时间线事件；同一 nodeId+subkey 只记录一次（"已解锁"语义，',
  '  // 也避免读档重入当前节点时重复记录）。返回是否真正新增。',
  '  function recordTimelineEvent(chapterId, nodeId, type, title, detail, subkey){',
  '    if(!state.timeline) state.timeline=[];',
  '    var key = (nodeId||"")+"|"+(subkey||"");',
  '    for(var i=0;i<state.timeline.length;i++){ if(state.timeline[i]._key===key) return false; }',
  '    state.timeline.push({ chapterId:chapterId||"", nodeId:nodeId||"", type:type||"", title:title||"", detail:detail||"", ts:Date.now(), _key:key });',
  '    return true;',
  '  }',
  '  function fmtTs(ts){',
  '    if(!state.timeline||!state.timeline.length) return "00:00";',
  '    var base = state.timeline[0].ts;',
  '    var diff = Math.max(0, Math.floor(((ts||base)-base)/1000));',
  '    var m = Math.floor(diff/60), s = diff%60;',
  '    return (m<10?"0":"")+m+":"+(s<10?"0":"")+s;',
  '  }',
  '',
  '  // ===== 存档 =====',
  '  function saveProgress(){ try{ var snap={ values:state.values, visitedChapters:state.visitedChapters, playedNodes:state.playedNodes, unlockedAchievements:state.unlockedAchievements, unlockedCollection:state.unlockedCollection, currentChapterId:state.currentChapterId, currentNodeId:state.currentNodeId, timeline:state.timeline||[] }; localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); }catch(e){} }',
  '  function loadProgress(){ try{ var raw=localStorage.getItem(SAVE_KEY); if(!raw)return false; var snap=JSON.parse(raw); state.values=snap.values||state.values; state.visitedChapters=snap.visitedChapters||{}; state.playedNodes=snap.playedNodes||{}; state.unlockedAchievements=snap.unlockedAchievements||{}; state.unlockedCollection=snap.unlockedCollection||{}; state.timeline=snap.timeline||[]; return !!snap.currentNodeId; }catch(e){ return false; } }',
  '  function hasProgress(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }',
  '',
  '  // ===== BGM =====',
  '  var bgmEl=null;',
  '  // 当前媒体节点的暂停/恢复句柄（用于打开时间线时冻结视频/倒计时）',
  '  var activePlayback=null;',
  '  function playBgm(url){ if(bgmEl){ bgmEl.pause(); bgmEl=null; } if(!url)return; bgmEl=new Audio(url); bgmEl.loop=true; bgmEl.volume=0.5; bgmEl.play().catch(function(){}); }',
  '',
  '  // ===== 场景：起始页 =====',
  '  function renderStartPage(){',
  '    clear();',
  '    var sp = DATA.startPage || {};',
  '    // 相对舞台中心的偏移百分比定位：left = w/2 + x*w，top = h/2 + y*h，锚点在元素中心',
  '    var sw = stage.offsetWidth, sh = stage.offsetHeight;',
  '    function place(el, pos){ if(!pos)pos={x:0,y:0}; el.style.position="absolute"; el.style.left=(sw/2 + pos.x*sw)+"px"; el.style.top=(sh/2 + pos.y*sh)+"px"; el.style.transform="translate(-50%, -50%)"; }',
  '    var base = layer();',
  '    // 背景',
  '    if(sp.backgroundType==="video" && sp.backgroundMedia){',
  '      var v=el("video"); v.src=sp.backgroundMedia; v.className="video-el"; v.autoplay=true; v.loop=true; v.muted=true; v.playsInline=true; base.appendChild(v);',
  '    } else if(sp.backgroundMedia){',
  '      base.style.backgroundImage="url(\'"+sp.backgroundMedia+"\')"; base.style.backgroundSize="cover"; base.style.backgroundPosition="center";',
  '    } else { base.style.background="linear-gradient(135deg,#667eea,#764ba2)"; }',
  '    var dim=el("div","layer"); dim.style.background="rgba(0,0,0,0.4)"; stage.appendChild(dim);',
  '    // 标题',
  '    if(sp.titleMode!=="none"){',
  '      var titleWrap=el("div"); place(titleWrap, sp.titlePosition);',
  '      if(sp.titleMode==="text"){ titleWrap.appendChild(el("h1","title",escapeHtml(sp.titleText||DATA.name||"互动影游"))); }',
  '      else if(sp.titleMode==="image"&&sp.titleImage){ var img=el("img"); img.src=sp.titleImage; img.style.maxHeight="120px"; img.style.maxWidth="60vw"; titleWrap.appendChild(img); }',
  '      stage.appendChild(titleWrap);',
  '    }',
  '    // 菜单',
  '    var bs=sp.buttonStyles||{};',
  '    var menu=el("div","menu"); place(menu, sp.menuPosition);',
  '    var startBtn=el("button","btn"); startBtn.textContent=btnText(bs.start,"开始游戏"); applyButtonStyle(startBtn,bs.start); startBtn.onclick=startGame; menu.appendChild(startBtn);',
  '    var contBtn=el("button","btn"); contBtn.textContent=btnText(bs.continue,"继续游戏"); applyButtonStyle(contBtn,bs.continue); contBtn.onclick=function(){ if(loadProgress()){ enterFromSave(); } else { toast("暂无存档"); } }; if(!hasProgress()) contBtn.style.opacity="0.5"; menu.appendChild(contBtn);',
  '    if((DATA.achievements||[]).length){ var achBtn=el("button","btn"); achBtn.textContent=btnText(bs.achievements,"游戏成就"); applyButtonStyle(achBtn,bs.achievements); achBtn.onclick=renderAchievements; menu.appendChild(achBtn); }',
  '    if((DATA.collection||[]).length){ var colBtn=el("button","btn"); colBtn.textContent=btnText(bs.collection,"图鉴"); applyButtonStyle(colBtn,bs.collection); colBtn.onclick=renderCollection; menu.appendChild(colBtn); }',
  '    stage.appendChild(menu);',
  '    // 设置按钮',
  '    var setBtn=el("button","btn"); place(setBtn, sp.settingsPosition); setBtn.textContent=btnText(bs.settings,"设置"); applyButtonStyle(setBtn,bs.settings,true); setBtn.onclick=renderSettings; stage.appendChild(setBtn);',
  '    // BGM',
  '    playBgm(sp.bgm);',
  '  }',
  '  function btnText(style, fallback){ if(!style||style.mode!=="image") return (style&&style.text)||fallback; return style.image?"":fallback; }',
  '',
  '  // ===== 开始/继续 =====',
  '  function resetGameRun(){ var values={}; (DATA.gameValues||[]).forEach(function(v){ (DATA.characters||[]).forEach(function(c){ values[c.id+"|"+v.id]=v.defaultValue; }); values["|"+v.id]=v.defaultValue; }); state.values=values; state.visitedChapters={}; state.playedNodes={}; state.timeline=[]; }',
  '  function startGame(){ var ch=firstChapter(); if(!ch){ toast("项目中暂无章节"); return; } resetGameRun(); enterChapter(ch.id, ch.startNodeId); }',
  '  function enterFromSave(){ var ch=findChapter(state.currentChapterId)||firstChapter(); if(!ch)return; renderNodeInChapter(ch, state.currentNodeId); }',
  '',
  '  // ===== 章节/节点 =====',
  '  function enterChapter(chapterId, nodeId){',
  '    var ch=findChapter(chapterId); if(!ch){ toast("章节不存在"); return; }',
  '    state.currentChapterId=chapterId; state.visitedChapters[chapterId]=true;',
  '    var bgm=findAudio(ch.backgroundAudioId); playBgm(bgm?bgm.url:null);',
  '    var targetId = nodeId || ch.startNodeId;',
  '    if(!targetId && ch.nodes.length) targetId=ch.nodes[0].id;',
  '    renderNodeInChapter(ch, targetId);',
  '  }',
  '  function findNodeInChapter(ch, id){ return (ch.nodes||[]).find(function(n){return n.id===id;}); }',
  '  function renderNodeInChapter(ch, nodeId){',
  '    if(!nodeId){ renderEndingScreen("流程结束","当前分支已结束。",null,function(){ goHome(); }); return; }',
  '    var node=findNodeInChapter(ch,nodeId);',
  '    if(!node){ renderEndingScreen("节点缺失","找不到该节点。",null,function(){ goHome(); }); return; }',
  '    state.currentChapterId=ch.id; state.currentNodeId=nodeId; state.playedNodes[nodeId]=true; checkAchievementsAndCollection(); saveProgress();',
  '    activePlayback=null;',
  '    clear(); topbar(ch);',
  '    switch(node.type){ case "video": renderVideo(ch,node); break; case "choice": renderChoice(ch,node); break; case "ending": renderEnding(ch,node); break; case "clear": renderClear(ch,node); break; case "condition": evalConditionNode(ch,node); break; default: renderEndingScreen("未知节点","节点类型不支持。",null,function(){ goHome(); }); }',
  '  }',
  '',
  '  function topbar(ch){ var bar=el("div","topbar"); var back=el("button","btn","返回首页"); back.onclick=function(){ if(confirm("返回首页？当前进度已保存。")) goHome(); }; bar.appendChild(back); var tl=el("button","btn","⏱ 时间线"); tl.onclick=openTimeline; bar.appendChild(tl); stage.appendChild(bar); }',
  '',
  '  function gotoNode(ch, nodeId){ if(nodeId){ renderNodeInChapter(ch, nodeId); } else { renderEndingScreen("流程结束","当前分支已结束。",null,function(){ goHome(); }); } }',
  '',
  '  // 播片',
  '  function renderVideo(ch, node){',
  '    var v=findVideo(node.videoId);',
  '    if(!v||!v.url){ renderEndingScreen("无视频","该节点未配置可播放的视频。",null,function(){ gotoNode(ch,node.nextNodeId); }); return; }',
  '    recordTimelineEvent(ch.id, node.id, "video", node.name||v.name||"播片", "", "");',
  '    var ve=el("video","video-el"); ve.src=v.url; ve.playsInline=true; ve.controls=true; stage.appendChild(ve);',
  '    applyValueChanges(node.valueChanges);',
  '    var advanced=false; function next(){ if(advanced)return; advanced=true; gotoNode(ch,node.nextNodeId); }',
  '    ve.addEventListener("ended", next);',
  '    var skip=el("button","btn","跳过 ▶"); skip.style.position="absolute"; skip.style.bottom="16px"; skip.style.right="16px"; skip.style.background="rgba(0,0,0,0.6)"; skip.style.padding="8px 16px"; skip.style.borderRadius="8px"; skip.onclick=next; stage.appendChild(skip);',
  '    // 提供给时间线：暂停/恢复视频，进度由 currentTime 保留',
  '    activePlayback={ pause:function(){ try{ve.pause();}catch(e){} }, resume:function(){ ve.play().catch(function(){}); } };',
  '    ve.play().catch(function(){});',
  '  }',
  '',
  '  // 选择',
  '  function renderChoice(ch, node){',
  '    var wrap=el("div","choice-wrap");',
  '    wrap.appendChild(el("div","choice-prompt",escapeHtml(node.prompt||"请做出选择")));',
  '    if(node.hasCountdown){',
  '      var cd=el("div","countdown"); cd.textContent=node.countdownSeconds+"s"; wrap.appendChild(cd);',
  '      var left=node.countdownSeconds||10;',
  '      function fireDefault(){ var def=(node.options||[]).find(function(o){return o.id===node.defaultOptionId;})||node.options[0]; if(def) pickOption(ch,node,def); }',
  '      function startTimer(){ cd.textContent=left+"s"; timer=setInterval(function(){ left--; cd.textContent=left+"s"; if(left<=0){ stopTimer(); fireDefault(); } },1000); }',
  '      function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }',
  '      var timer=null; startTimer();',
  '      // 倒计时暂停/恢复（resume 用剩余秒数重建定时器）',
  '      activePlayback={ pause:stopTimer, resume:startTimer };',
  '    }',
  '    (node.options||[]).forEach(function(opt){ var b=el("button","choice-btn btn",escapeHtml(opt.text||"选项")); b.onclick=function(){ pickOption(ch,node,opt); }; wrap.appendChild(b); });',
  '    stage.appendChild(wrap);',
  '  }',
  '  function pickOption(ch,node,opt){ recordTimelineEvent(ch.id, node.id, "choice", node.prompt||"做出选择", "选择："+(opt.text||"选项"), opt.id); applyValueChanges(opt.valueChanges); gotoNode(ch, opt.nextNodeId); }',
  '',
  '  // 结局',
  '  function renderEnding(ch, node){ recordTimelineEvent(ch.id, node.id, "ending", node.title||"结局", node.description||"", ""); var img=node.endingImage?el("img","ending-img"):null; if(img)img.src=node.endingImage; renderEndingScreen(node.title||"结局", node.description||"", img, function(){ goHome(); }, "回到首页"); }',
  '  function renderClear(ch, node){ recordTimelineEvent(ch.id, node.id, "clear", node.title||"恭喜通关！", node.description||"", ""); renderEndingScreen(node.title||"恭喜通关！", node.description||"", null, function(){ goHome(); }, "回到首页"); }',
  '  function renderEndingScreen(title, desc, img, onAction, actionLabel){ var wrap=el("div","ending-wrap"); if(img)wrap.appendChild(img); wrap.appendChild(el("div","title",escapeHtml(title))); if(desc)wrap.appendChild(el("div","subtitle",escapeHtml(desc))); var b=el("button","btn"); b.textContent=actionLabel||"继续"; b.style.background="#2563eb"; b.style.color="#fff"; b.style.padding="12px 28px"; b.style.borderRadius="12px"; b.style.fontSize="16px"; b.onclick=onAction; wrap.appendChild(b); stage.appendChild(wrap); }',
  '',
  '  // 条件分支',
  '  function evalConditionNode(ch, node){ var ok=evalGroup(node.conditionGroup); gotoNode(ch, ok?node.trueNodeId:node.falseNodeId); }',
  '',
  '  // ===== 面板：成就 / 图鉴 / 设置 =====',
  '  function renderPanel(title, renderer){ clear(); var p=el("div","panel"); var h=el("h2","",escapeHtml(title)); p.appendChild(h); var close=el("button","close","×"); close.onclick=goHome; p.appendChild(close); var body=el("div"); renderer(body); p.appendChild(body); stage.appendChild(p); }',
  '  function renderAchievements(){ renderPanel("游戏成就", function(body){ var g=el("div","grid"); (DATA.achievements||[]).forEach(function(a){ var c=el("div","card"+(state.unlockedAchievements[a.id]?"":" locked")); var img=a.image?el("img"):el("div"); if(a.image){img.src=a.image;} else { img.style.height="120px"; img.style.display="flex"; img.style.alignItems="center"; img.style.justifyContent="center"; img.textContent="🏆"; } c.appendChild(img); c.appendChild(el("h4","",escapeHtml(a.name))); c.appendChild(el("p","",escapeHtml(a.description))); g.appendChild(c); }); if(!(DATA.achievements||[]).length) body.appendChild(el("p","subtitle","暂无成就")); else body.appendChild(g); }); }',
  '  function renderCollection(){ renderPanel("图鉴", function(body){ var g=el("div","grid"); (DATA.collection||[]).forEach(function(en){ var c=el("div","card"+(state.unlockedCollection[en.id]?"":" locked")); var ch=findCharacter(en.characterId); var img=el("div"); img.style.height="120px"; img.style.display="flex"; img.style.alignItems="center"; img.style.justifyContent="center"; img.style.background="#222"; img.style.borderRadius="8px"; img.style.marginBottom="8px"; if(ch&&ch.avatar){ var im=el("img"); im.src=ch.avatar; im.style.width="100%"; im.style.height="120px"; im.style.objectFit="cover"; im.style.borderRadius="8px"; img=im; } else { img.textContent="👤"; img.style.fontSize="40px"; } c.appendChild(img); c.appendChild(el("h4","",escapeHtml(ch?ch.name:"未知角色"))); c.appendChild(el("p","",escapeHtml(en.description))); g.appendChild(c); }); if(!(DATA.collection||[]).length) body.appendChild(el("p","subtitle","暂无图鉴")); else body.appendChild(g); }); }',
  '  function renderSettings(){ renderPanel("设置", function(body){ var s=el("div","card"); s.appendChild(el("h4","",DATA.name||"互动影游")); body.appendChild(s); if(hasProgress()){ var reset=el("button","btn","清除存档并重新开始"); reset.style.marginTop="16px"; reset.style.background="#ef4444"; reset.style.color="#fff"; reset.style.padding="10px 18px"; reset.style.borderRadius="8px"; reset.onclick=function(){ if(confirm("确定清除存档？")){ try{localStorage.removeItem(SAVE_KEY);}catch(e){} goHome(); } }; body.appendChild(reset); } }); }',
  '',
  '  // ===== 时间线面板（叠加层，不清空舞台，可冻结媒体后随时返回）=====',
  '  var timelineOverlay=null;',
  '  function openTimeline(){',
  '    if(timelineOverlay) return;',
  '    // 真正暂停：冻结当前视频/倒计时',
  '    if(activePlayback){ try{ activePlayback.pause(); }catch(e){} }',
  '    var ov=el("div","panel timeline-overlay");',
  '    var h=el("h2","","⏱ 时间线"); ov.appendChild(h);',
  '    var hint=el("p","subtitle timeline-hint","关闭后将回到原处继续"); hint.style.marginBottom="14px"; ov.appendChild(hint);',
  '    var close=el("button","close","×"); close.onclick=closeTimeline; ov.appendChild(close);',
  '    renderTimelineContent(ov);',
  '    stage.appendChild(ov);',
  '    timelineOverlay=ov;',
  '    ov.scrollTop=0;',
  '  }',
  '  function closeTimeline(){',
  '    if(!timelineOverlay) return;',
  '    timelineOverlay.remove();',
  '    timelineOverlay=null;',
  '    // 恢复暂停的媒体',
  '    if(activePlayback){ try{ activePlayback.resume(); }catch(e){} }',
  '  }',
  '  // 时间线内容：按"各章首个事件出现顺序"分组，每条事件展示圆点+标题+明细+经过时间',
  '  function renderTimelineContent(ov){',
  '    var tl=state.timeline||[];',
  '    if(!tl.length){ ov.appendChild(el("p","subtitle","尚未有游戏记录，开始游戏后这里会按顺序记录你的经历。")); return; }',
  '    // 按章节首个事件的出现顺序聚合',
  '    var order=[]; var seen={};',
  '    for(var i=0;i<tl.length;i++){ var cid=tl[i].chapterId; if(!seen[cid]){ seen[cid]=true; order.push(cid); } }',
  '    var eventsByChapter={};',
  '    for(var j=0;j<tl.length;j++){ var key=tl[j].chapterId; if(!eventsByChapter[key]) eventsByChapter[key]=[]; eventsByChapter[key].push(tl[j]); }',
  '    var typeMeta={',
  '      video:{ icon:"🎬", label:"播片" },',
  '      choice:{ icon:"🤔", label:"选择" },',
  '      ending:{ icon:"🎬", label:"结局" },',
  '      clear:{ icon:"🏆", label:"通关" }',
  '    };',
  '    for(var m=0;m<order.length;m++){',
  '      var ch=findChapter(order[m]);',
  '      var card=el("div","timeline-chapter");',
  '      // 章节标题（锚点 + 名称 + 描述）',
  '      var head=el("div","timeline-chapter-head");',
  '      var anchor=el("div","timeline-chapter-anchor", escapeHtml((m+1)+""));',
  '      head.appendChild(anchor);',
  '      var headInfo=el("div","");',
  '      headInfo.appendChild(el("div","timeline-chapter-name", escapeHtml(ch?(ch.name||"未命名章节"):"（未知章节）")));',
  '      if(ch&&ch.description) headInfo.appendChild(el("div","timeline-chapter-desc", escapeHtml(ch.description)));',
  '      head.appendChild(headInfo);',
  '      card.appendChild(head);',
  '      // 该章事件节点：卡片之间用 ▼ 箭头连接，形成流程图',
  '      var evs=eventsByChapter[order[m]]||[];',
  '      for(var n=0;n<evs.length;n++){',
  '        if(n>0) card.appendChild(el("div","timeline-arrow","▼")); // 节点之间的箭头连线',
  '        var ev=evs[n]; var meta=typeMeta[ev.type]||{icon:"●",label:"事件"};',
  '        var isEnd=(ev.type==="ending"||ev.type==="clear");',
  '        var row=el("div","timeline-event"+(isEnd?" end":""));',
  '        var c=el("div","timeline-event-card");',
  '        var inner=el("div","timeline-event-row");',
  '        var mainEl=el("div","timeline-event-main");',
  '        mainEl.appendChild(el("div","timeline-event-tag", escapeHtml(meta.icon+" "+meta.label)));',
  '        mainEl.appendChild(el("div","timeline-event-title", escapeHtml(ev.title||(meta.label))));',
  '        if(ev.detail) mainEl.appendChild(el("div","timeline-event-detail", escapeHtml(ev.detail)));',
  '        inner.appendChild(mainEl);',
  '        inner.appendChild(el("div","timeline-event-ts", fmtTs(ev.ts)));',
  '        c.appendChild(inner);',
  '        row.appendChild(c);',
  '        card.appendChild(row);',
  '      }',
  '      ov.appendChild(card);',
  '    }',
  '  }',
  '',
  '  function goHome(){ if(bgmEl){ bgmEl.pause(); bgmEl=null; } renderStartPage(); }',
  '',
  '  function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];}); }',
  '',
  '  // ===== 启动 =====',
  '  renderStartPage();',
  '})();',
].join('\n')

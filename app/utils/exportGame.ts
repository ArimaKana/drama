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
        case 'explore':
          addUrlRef(urlRefs, node.backgroundImage)
          for (const hs of node.hotspots) {
            // hotspot 没有 image 字段，仅坐标与跳转
            void hs
          }
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
    orientation: project.orientation || 'landscape',
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
    case 'qte':
      return {
        id: node.id, type: node.type, name: node.name,
        description: node.description,
        timeLimit: node.timeLimit,
        successNodeId: node.successNodeId,
        failNodeId: node.failNodeId,
        valueChangesOnSuccess: node.valueChangesOnSuccess || [],
        valueChangesOnFail: node.valueChangesOnFail || [],
      }
    case 'ending':
      return {
        id: node.id, type: node.type, name: node.name,
        title: node.title, description: node.description,
        endingImage: resolve(node.endingImage),
      }
    case 'explore':
      return {
        id: node.id, type: node.type, name: node.name,
        backgroundImage: resolve(node.backgroundImage),
        hotspots: (node.hotspots || []).map((h: any) => ({
          id: h.id, x: h.x, y: h.y, width: h.width, height: h.height,
          label: h.label, nextNodeId: h.nextNodeId, valueChanges: h.valueChanges || [],
        })),
        nextNodeId: node.nextNodeId,
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
    menuPosition: sp.menuPosition || { x: 24, y: 220 },
    titlePosition: sp.titlePosition || { x: 180, y: 48 },
    settingsPosition: sp.settingsPosition || { x: 560, y: 16 },
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
.qte-bar { width: min(560px, 86%); height: 14px; background: rgba(255,255,255,0.15); border-radius: 999px; overflow: hidden; }
.qte-bar > div { height: 100%; background: linear-gradient(90deg, #22c55e, #eab308); }
.qte-action { padding: 22px 40px; border-radius: 16px; font-size: 22px; font-weight: 800; background: #2563eb; color: #fff; box-shadow: 0 8px 30px rgba(37,99,235,0.5); }
.qte-action.fail { background: #6b7280; box-shadow: none; }
.hotspot { position: absolute; border: 2px dashed rgba(255,255,255,0.6); background: rgba(255,255,255,0.12); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; transition: background .15s; }
.hotspot:hover { background: rgba(255,255,255,0.28); }
.hidden { display: none !important; }
.video-el { width: 100%; height: 100%; object-fit: contain; background: #000; }
.toast { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.75); color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 14px; z-index: 50; }
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
  '  var orientation = DATA.orientation === "portrait" ? "portrait" : "landscape";',
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
  '    return { values: values, visitedChapters: {}, playedNodes: {}, unlockedAchievements: {}, unlockedCollection: {}, currentChapterId: null, currentNodeId: null };',
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
  '  // ===== 舞台尺寸 =====',
  '  function fitStage(){',
  '    var vw = window.innerWidth, vh = window.innerHeight;',
  '    var isPortrait = orientation === "portrait";',
  '    var ratio = isPortrait ? 9/16 : 16/9;',
  '    var w, h;',
  '    if (vw/vh > ratio) { h = vh; w = h*ratio; } else { w = vw; h = w/ratio; }',
  '    stage.style.width = w+"px"; stage.style.height = h+"px";',
  '    stage.style.fontSize = Math.max(12, w/40)+"px";',
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
  '  // ===== 存档 =====',
  '  function saveProgress(){ try{ var snap={ values:state.values, visitedChapters:state.visitedChapters, playedNodes:state.playedNodes, unlockedAchievements:state.unlockedAchievements, unlockedCollection:state.unlockedCollection, currentChapterId:state.currentChapterId, currentNodeId:state.currentNodeId }; localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); }catch(e){} }',
  '  function loadProgress(){ try{ var raw=localStorage.getItem(SAVE_KEY); if(!raw)return false; var snap=JSON.parse(raw); state.values=snap.values||state.values; state.visitedChapters=snap.visitedChapters||{}; state.playedNodes=snap.playedNodes||{}; state.unlockedAchievements=snap.unlockedAchievements||{}; state.unlockedCollection=snap.unlockedCollection||{}; return !!snap.currentNodeId; }catch(e){ return false; } }',
  '  function hasProgress(){ try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; } }',
  '',
  '  // ===== BGM =====',
  '  var bgmEl=null;',
  '  function playBgm(url){ if(bgmEl){ bgmEl.pause(); bgmEl=null; } if(!url)return; bgmEl=new Audio(url); bgmEl.loop=true; bgmEl.volume=0.5; bgmEl.play().catch(function(){}); }',
  '',
  '  // ===== 场景：起始页 =====',
  '  function renderStartPage(){',
  '    clear();',
  '    var sp = DATA.startPage || {};',
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
  '      var tp=sp.titlePosition||{x:180,y:48}; var titleWrap=el("div"); titleWrap.style.position="absolute"; titleWrap.style.left=tp.x+"px"; titleWrap.style.top=tp.y+"px";',
  '      if(sp.titleMode==="text"){ titleWrap.appendChild(el("h1","title",escapeHtml(sp.titleText||DATA.name||"互动影游"))); }',
  '      else if(sp.titleMode==="image"&&sp.titleImage){ var img=el("img"); img.src=sp.titleImage; img.style.maxHeight="120px"; img.style.maxWidth="60vw"; titleWrap.appendChild(img); }',
  '      stage.appendChild(titleWrap);',
  '    }',
  '    // 菜单',
  '    var bs=sp.buttonStyles||{};',
  '    var mp=sp.menuPosition||{x:24,y:220};',
  '    var menu=el("div","menu"); menu.style.position="absolute"; menu.style.left=mp.x+"px"; menu.style.top=mp.y+"px";',
  '    var startBtn=el("button","btn"); startBtn.textContent=btnText(bs.start,"开始游戏"); applyButtonStyle(startBtn,bs.start); startBtn.onclick=startGame; menu.appendChild(startBtn);',
  '    var contBtn=el("button","btn"); contBtn.textContent=btnText(bs.continue,"继续游戏"); applyButtonStyle(contBtn,bs.continue); contBtn.onclick=function(){ if(loadProgress()){ enterFromSave(); } else { toast("暂无存档"); } }; if(!hasProgress()) contBtn.style.opacity="0.5"; menu.appendChild(contBtn);',
  '    if((DATA.achievements||[]).length){ var achBtn=el("button","btn"); achBtn.textContent=btnText(bs.achievements,"游戏成就"); applyButtonStyle(achBtn,bs.achievements); achBtn.onclick=renderAchievements; menu.appendChild(achBtn); }',
  '    if((DATA.collection||[]).length){ var colBtn=el("button","btn"); colBtn.textContent=btnText(bs.collection,"图鉴"); applyButtonStyle(colBtn,bs.collection); colBtn.onclick=renderCollection; menu.appendChild(colBtn); }',
  '    stage.appendChild(menu);',
  '    // 设置按钮',
  '    var sp2=sp.settingsPosition||{x:560,y:16}; var setBtn=el("button","btn"); setBtn.style.position="absolute"; setBtn.style.left=sp2.x+"px"; setBtn.style.top=sp2.y+"px"; setBtn.textContent=btnText(bs.settings,"设置"); applyButtonStyle(setBtn,bs.settings,true); setBtn.onclick=renderSettings; stage.appendChild(setBtn);',
  '    // BGM',
  '    playBgm(sp.bgm);',
  '  }',
  '  function btnText(style, fallback){ if(!style||style.mode!=="image") return (style&&style.text)||fallback; return style.image?"":fallback; }',
  '',
  '  // ===== 开始/继续 =====',
  '  function resetGameRun(){ var values={}; (DATA.gameValues||[]).forEach(function(v){ (DATA.characters||[]).forEach(function(c){ values[c.id+"|"+v.id]=v.defaultValue; }); values["|"+v.id]=v.defaultValue; }); state.values=values; state.visitedChapters={}; state.playedNodes={}; }',
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
  '    clear(); topbar(ch);',
  '    switch(node.type){ case "video": renderVideo(ch,node); break; case "choice": renderChoice(ch,node); break; case "qte": renderQte(ch,node); break; case "ending": renderEnding(ch,node); break; case "explore": renderExplore(ch,node); break; case "clear": renderClear(ch,node); break; case "condition": evalConditionNode(ch,node); break; default: renderEndingScreen("未知节点","节点类型不支持。",null,function(){ goHome(); }); }',
  '  }',
  '',
  '  function topbar(ch){ var bar=el("div","topbar"); var back=el("button","btn","返回首页"); back.onclick=function(){ if(confirm("返回首页？当前进度已保存。")) goHome(); }; bar.appendChild(back); stage.appendChild(bar); }',
  '',
  '  function gotoNode(ch, nodeId){ if(nodeId){ renderNodeInChapter(ch, nodeId); } else { renderEndingScreen("流程结束","当前分支已结束。",null,function(){ goHome(); }); } }',
  '',
  '  // 播片',
  '  function renderVideo(ch, node){',
  '    var v=findVideo(node.videoId);',
  '    if(!v||!v.url){ renderEndingScreen("无视频","该节点未配置可播放的视频。",null,function(){ gotoNode(ch,node.nextNodeId); }); return; }',
  '    var ve=el("video","video-el"); ve.src=v.url; ve.playsInline=true; ve.controls=true; stage.appendChild(ve);',
  '    applyValueChanges(node.valueChanges);',
  '    var advanced=false; function next(){ if(advanced)return; advanced=true; gotoNode(ch,node.nextNodeId); }',
  '    ve.addEventListener("ended", next);',
  '    var skip=el("button","btn","跳过 ▶"); skip.style.position="absolute"; skip.style.bottom="16px"; skip.style.right="16px"; skip.style.background="rgba(0,0,0,0.6)"; skip.style.padding="8px 16px"; skip.style.borderRadius="8px"; skip.onclick=next; stage.appendChild(skip);',
  '    ve.play().catch(function(){});',
  '  }',
  '',
  '  // 选择',
  '  function renderChoice(ch, node){',
  '    var wrap=el("div","choice-wrap");',
  '    wrap.appendChild(el("div","choice-prompt",escapeHtml(node.prompt||"请做出选择")));',
  '    if(node.hasCountdown){ var cd=el("div","countdown"); cd.textContent=node.countdownSeconds+"s"; wrap.appendChild(cd); var left=node.countdownSeconds||10; var t=setInterval(function(){ left--; cd.textContent=left+"s"; if(left<=0){ clearInterval(t); var def=node.options.find(function(o){return o.id===node.defaultOptionId;})||node.options[0]; if(def) pickOption(ch,node,def); } },1000); }',
  '    (node.options||[]).forEach(function(opt){ var b=el("button","choice-btn btn",escapeHtml(opt.text||"选项")); b.onclick=function(){ pickOption(ch,node,opt); }; wrap.appendChild(b); });',
  '    stage.appendChild(wrap);',
  '  }',
  '  function pickOption(ch,node,opt){ applyValueChanges(opt.valueChanges); gotoNode(ch, opt.nextNodeId); }',
  '',
  '  // QTE',
  '  function renderQte(ch, node){',
  '    var wrap=el("div","ending-wrap");',
  '    wrap.appendChild(el("div","choice-prompt",escapeHtml(node.description||"快速反应！")));',
  '    var bar=el("div","qte-bar"); var fill=el("div"); fill.style.width="100%"; bar.appendChild(fill); wrap.appendChild(bar);',
  '    var act=el("button","btn qte-action","点我！"); wrap.appendChild(act);',
  '    stage.appendChild(wrap);',
  '    var time=(node.timeLimit||5)*1000, start=Date.now(), done=false;',
  '    function fail(){ if(done)return; done=true; act.textContent="失败"; act.classList.add("fail"); applyValueChanges(node.valueChangesOnFail); setTimeout(function(){ gotoNode(ch,node.failNodeId); },600); }',
  '    function success(){ if(done)return; done=true; act.textContent="成功！"; applyValueChanges(node.valueChangesOnSuccess); setTimeout(function(){ gotoNode(ch,node.successNodeId); },600); }',
  '    act.onclick=success;',
  '    var raf; function tick(){ var p=Math.max(0,1-(Date.now()-start)/time); fill.style.width=(p*100)+"%"; if(p<=0){ fail(); return; } if(!done) raf=requestAnimationFrame(tick); } raf=requestAnimationFrame(tick);',
  '  }',
  '',
  '  // 结局',
  '  function renderEnding(ch, node){ var img=node.endingImage?el("img","ending-img"):null; if(img)img.src=node.endingImage; renderEndingScreen(node.title||"结局", node.description||"", img, function(){ goHome(); }, "回到首页"); }',
  '  function renderClear(ch, node){ renderEndingScreen(node.title||"恭喜通关！", node.description||"", null, function(){ goHome(); }, "回到首页"); }',
  '  function renderEndingScreen(title, desc, img, onAction, actionLabel){ var wrap=el("div","ending-wrap"); if(img)wrap.appendChild(img); wrap.appendChild(el("div","title",escapeHtml(title))); if(desc)wrap.appendChild(el("div","subtitle",escapeHtml(desc))); var b=el("button","btn"); b.textContent=actionLabel||"继续"; b.style.background="#2563eb"; b.style.color="#fff"; b.style.padding="12px 28px"; b.style.borderRadius="12px"; b.style.fontSize="16px"; b.onclick=onAction; wrap.appendChild(b); stage.appendChild(wrap); }',
  '',
  '  // 探索',
  '  function renderExplore(ch, node){',
  '    if(node.backgroundImage){ var bg=layer(); bg.style.backgroundImage="url(\'"+node.backgroundImage+"\')"; bg.style.backgroundSize="cover"; bg.style.backgroundPosition="center"; } else { stage.style.background="#222"; }',
  '    var hint=el("div","subtitle"); hint.style.position="absolute"; hint.style.top="12px"; hint.style.left="50%"; hint.style.transform="translateX(-50%)"; hint.style.background="rgba(0,0,0,0.4)"; hint.style.padding="6px 14px"; hint.style.borderRadius="999px"; hint.textContent="点击场景中的热点探索"; stage.appendChild(hint);',
  '    (node.hotspots||[]).forEach(function(hs){ var b=el("button","hotspot",escapeHtml(hs.label||"")); b.style.left=(hs.x||0)+"px"; b.style.top=(hs.y||0)+"px"; b.style.width=(hs.width||80)+"px"; b.style.height=(hs.height||40)+"px"; b.onclick=function(){ applyValueChanges(hs.valueChanges); gotoNode(ch, hs.nextNodeId||node.nextNodeId); }; stage.appendChild(b); });',
  '    if(node.nextNodeId){ var cont=el("button","btn","继续 ▶"); cont.style.position="absolute"; cont.style.bottom="16px"; cont.style.right="16px"; cont.style.background="rgba(0,0,0,0.6)"; cont.style.padding="8px 16px"; cont.style.borderRadius="8px"; cont.onclick=function(){ gotoNode(ch,node.nextNodeId); }; stage.appendChild(cont); }',
  '  }',
  '',
  '  // 条件分支',
  '  function evalConditionNode(ch, node){ var ok=evalGroup(node.conditionGroup); gotoNode(ch, ok?node.trueNodeId:node.falseNodeId); }',
  '',
  '  // ===== 面板：成就 / 图鉴 / 设置 =====',
  '  function renderPanel(title, renderer){ clear(); var p=el("div","panel"); var h=el("h2","",escapeHtml(title)); p.appendChild(h); var close=el("button","close","×"); close.onclick=goHome; p.appendChild(close); var body=el("div"); renderer(body); p.appendChild(body); stage.appendChild(p); }',
  '  function renderAchievements(){ renderPanel("游戏成就", function(body){ var g=el("div","grid"); (DATA.achievements||[]).forEach(function(a){ var c=el("div","card"+(state.unlockedAchievements[a.id]?"":" locked")); var img=a.image?el("img"):el("div"); if(a.image){img.src=a.image;} else { img.style.height="120px"; img.style.display="flex"; img.style.alignItems="center"; img.style.justifyContent="center"; img.textContent="🏆"; } c.appendChild(img); c.appendChild(el("h4","",escapeHtml(a.name))); c.appendChild(el("p","",escapeHtml(a.description))); g.appendChild(c); }); if(!(DATA.achievements||[]).length) body.appendChild(el("p","subtitle","暂无成就")); else body.appendChild(g); }); }',
  '  function renderCollection(){ renderPanel("图鉴", function(body){ var g=el("div","grid"); (DATA.collection||[]).forEach(function(en){ var c=el("div","card"+(state.unlockedCollection[en.id]?"":" locked")); var ch=findCharacter(en.characterId); var img=el("div"); img.style.height="120px"; img.style.display="flex"; img.style.alignItems="center"; img.style.justifyContent="center"; img.style.background="#222"; img.style.borderRadius="8px"; img.style.marginBottom="8px"; if(ch&&ch.avatar){ var im=el("img"); im.src=ch.avatar; im.style.width="100%"; im.style.height="120px"; im.style.objectFit="cover"; im.style.borderRadius="8px"; img=im; } else { img.textContent="👤"; img.style.fontSize="40px"; } c.appendChild(img); c.appendChild(el("h4","",escapeHtml(ch?ch.name:"未知角色"))); c.appendChild(el("p","",escapeHtml(en.description))); g.appendChild(c); }); if(!(DATA.collection||[]).length) body.appendChild(el("p","subtitle","暂无图鉴")); else body.appendChild(g); }); }',
  '  function renderSettings(){ renderPanel("设置", function(body){ var s=el("div","card"); s.appendChild(el("h4","",DATA.name||"互动影游")); s.appendChild(el("p","","方向："+(orientation==="portrait"?"竖屏":"横屏"))); body.appendChild(s); if(hasProgress()){ var reset=el("button","btn","清除存档并重新开始"); reset.style.marginTop="16px"; reset.style.background="#ef4444"; reset.style.color="#fff"; reset.style.padding="10px 18px"; reset.style.borderRadius="8px"; reset.onclick=function(){ if(confirm("确定清除存档？")){ try{localStorage.removeItem(SAVE_KEY);}catch(e){} goHome(); } }; body.appendChild(reset); } }); }',
  '',
  '  function goHome(){ if(bgmEl){ bgmEl.pause(); bgmEl=null; } renderStartPage(); }',
  '',
  '  function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];}); }',
  '',
  '  // ===== 启动 =====',
  '  renderStartPage();',
  '})();',
].join('\n')

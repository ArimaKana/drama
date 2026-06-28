// 单测：验证 creativeAssistant 的"蓝图→章节"构建逻辑。
// 重点：节点 refId 正确映射成真实 id，跳转字段(nextNodeId/options.nextNodeId/...)
// 不存在悬挂引用（指向不存在节点的 ref 应被解析为 null 而非保留字符串）。
//
// 运行：node scripts/test-creative-assistant.mjs
import fs from 'node:fs'
import { build } from 'esbuild'

const shimTypes = 'export {}'
fs.mkdirSync('node_modules/.cache', { recursive: true })
fs.writeFileSync('node_modules/.cache/_types_shim.js', shimTypes)
fs.writeFileSync('node_modules/.cache/_runtime_shim.mjs',
  'export function isTauriRuntime(){ return false; }')
fs.writeFileSync('node_modules/.cache/_ai_shim.mjs',
  'export function callAiModel(){ return {text:""}; } export const extractBlueprintFromText=()=>({});')
fs.writeFileSync('node_modules/.cache/_gen_shim.mjs',
  'export function generateAndSaveImageAsset(){ return {url:""}; } export function resolveSeedreamApiKey(){ return ""; }')
fs.writeFileSync('node_modules/.cache/_factory_shim.mjs',
  'let i=0; export function createId(){ return "id"+(++i); } export function now(){ return "t"; }')

const result = await build({
  entryPoints: ['app/utils/creativeAssistant.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
  alias: {
    '~/types': fs.realpathSync('node_modules/.cache/_types_shim.js'),
    '~/utils/runtime': fs.realpathSync('node_modules/.cache/_runtime_shim.mjs'),
    '~/utils/ai': fs.realpathSync('node_modules/.cache/_ai_shim.mjs'),
    '~/utils/generateAsset': fs.realpathSync('node_modules/.cache/_gen_shim.mjs'),
    '~/utils/factory': fs.realpathSync('node_modules/.cache/_factory_shim.mjs'),
  },
})
const code = result.outputFiles[0].text
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
const mod = await import(dataUrl)

const {
  buildProjectDataFromBlueprint,
  applyGeneratedImages,
  extractBlueprintFromText,
} = mod

// ---- 构造一个蓝图：1 章，含 video→choice(两选项分叉)→两个结局 ----
const blueprint = {
  title: '测试剧', synopsis: '测试',
  chapters: [{
    refId: 'ch1', name: '第一章', summary: '梗概', startNodeRef: 'n1',
    nodes: [
      { refId: 'n1', type: 'video', name: '开场', nextRef: 'n2' },
      { refId: 'n2', type: 'choice', name: '抉择', prompt: '走哪条路？', hasCountdown: true, countdownSeconds: 8,
        defaultOptionRef: 'o1',
        options: [
          { refId: 'o1', text: '左路', nextRef: 'n3', valueEffects: [{ valueRef: 'gv1', characterRef: 'c1', delta: 5 }] },
          { refId: 'o2', text: '右路', nextRef: 'n4' },
        ] },
      { refId: 'n3', type: 'ending', title: '好结局', description: '好' },
      { refId: 'n4', type: 'ending', title: '坏结局', description: '坏' },
      // 一个引用了不存在节点的选项（悬挂引用），应解析为 null
      { refId: 'n5', type: 'video', name: '彩蛋', nextRef: 'nonexistent' },
    ],
  }],
  characters: [{ refId: 'c1', name: '主角', gender: 'female', description: '', appearance: '' }],
  gameValues: [{ refId: 'gv1', name: '好感度', defaultValue: 0, minValue: 0, maxValue: 100, description: '' }],
  achievements: [{
    refId: 'a1', name: '初见', description: '',
    conditions: [{ type: 'value', valueRef: 'gv1', operator: '>=', targetValue: 5 }],
  }],
  collection: [{ refId: 'col1', characterRef: 'c1', description: '档案', unlockConditions: [{ type: 'chapter_unlock', chapterRef: 'ch1' }] }],
  images: [
    { refId: 'img_c1', name: '主角头像', kind: 'character', characterRef: 'c1', prompt: '头像' },
    { refId: 'img_end1', name: '好结局图', kind: 'ending', nodeRef: 'n3', prompt: '好结局' },
    { refId: 'img_bg', name: '起始页', kind: 'startpage', prompt: '背景' },
  ],
}

const { data, refs } = buildProjectDataFromBlueprint(blueprint)

let pass = true
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name)
  if (!cond) pass = false
}

const ch = data.chapters[0]
check('生成了 1 章', data.chapters.length === 1)
check('章节有 5 个节点', ch.nodes.length === 5)
check('起始节点正确', ch.startNodeId === refs.nodes.get('n1'))

// video n1 → nextNodeId 应等于 choice n2 的真实 id
const n1 = ch.nodes.find(n => n.id === refs.nodes.get('n1'))
const n2 = ch.nodes.find(n => n.id === refs.nodes.get('n2'))
check('n1.nextNodeId 指向 n2', n1.nextNodeId === n2.id)
check('n2 是 choice 节点', n2.type === 'choice' && n2.options.length === 2)
check('n2 默认选项指向 o1 真实id', n2.defaultOptionId === refs.nodes.get('o1'))

// 选项 nextRef 映射到结局节点
const o1 = n2.options[0]
const o2 = n2.options[1]
const n3 = ch.nodes.find(n => n.id === refs.nodes.get('n3'))
const n4 = ch.nodes.find(n => n.id === refs.nodes.get('n4'))
check('o1.nextNodeId 指向结局 n3', o1.nextNodeId === n3.id)
check('o2.nextNodeId 指向结局 n4', o2.nextNodeId === n4.id)
check('o1.valueEffects 映射了真实 valueId', o1.valueChanges[0]?.valueId === refs.values.get('gv1'))
check('o1.valueEffects 映射了真实 characterId', o1.valueChanges[0]?.characterId === refs.characters.get('c1'))

// 悬挂引用应解析为 null，不能残留字符串 'nonexistent'
const n5 = ch.nodes.find(n => n.id === refs.nodes.get('n5'))
check('悬挂 nextRef 解析为 null', n5.nextNodeId === null)
check('节点 id 不含字符串 refId', ch.nodes.every(n => !String(n.id).startsWith('n')))

// 数值/成就/图鉴映射
check('数值 gv1 映射', data.gameValues[0]?.id === refs.values.get('gv1'))
check('成就条件 valueId 映射', data.achievements[0]?.conditions[0]?.valueId === refs.values.get('gv1'))
check('图鉴 characterId 映射', data.collection[0]?.characterId === refs.characters.get('c1'))
check('图鉴 chapterId 映射', data.collection[0]?.unlockConditions[0]?.chapterId === refs.chapters.get('ch1'))
check('角色 c1 映射', data.characters[0]?.id === refs.characters.get('c1'))

// ---- 图片回填 ----
const fakeImages = [
  { asset: { id: 'IA1', name: '主角头像', url: 'avatar.png', category: 'character', createdAt: '', updatedAt: '' }, refId: 'img_c1', kind: 'character', characterRef: 'c1' },
  { asset: { id: 'IA2', name: '好结局图', url: 'end1.png', category: 'storyboard', createdAt: '', updatedAt: '' }, refId: 'img_end1', kind: 'ending', nodeRef: 'n3' },
  { asset: { id: 'IA3', name: '起始页', url: 'bg.png', category: 'scene', createdAt: '', updatedAt: '' }, refId: 'img_bg', kind: 'startpage' },
]
const applied = applyGeneratedImages(data, refs, fakeImages)
check('头像回填到角色', data.characters[0].avatar === 'avatar.png')
check('结局图回填到 ending 节点', n3.endingImage === 'end1.png')
check('起始页背景提取', applied.startPageBackground === 'bg.png')
check('图片全部入库', applied.images.length === 3)

// ============================================================
// 第二部分：容错测试 —— 模拟模型不规范返回，验证不再被"格式不符合预期"拒掉
// ============================================================
console.log('\n--- 容错测试（模型不规范返回） ---')

// 用例 A：字段名用别名（id 而非 refId、next 而非 nextRef、values 而非 gameValues）
const messyA = {
  title: '剧A',
  values: [{ id: 'gv1', name: '好感度' }],
  characters: [{ id: 'c1', name: '主角', gender: '男' }], // 性别用了中文
  chapters: [{
    id: 'ch1', name: '第一章', startNode: 'n1',
    nodes: [
      { id: 'n1', type: 'video', next: 'n2' },
      { id: 'n2', type: 'choice', prompt: '选', options: [
        { id: 'o1', text: '左', next: 'n3', valueChanges: [{ value: 'gv1', amount: 5 }] },
        { id: 'o2', text: '右', next: 'n4' },
      ] },
      { id: 'n3', type: 'ending', title: '好结局' },
      { id: 'n4', type: 'ending', title: '坏结局' },
    ],
  }],
  images: [{ id: 'img_c1', name: '头像', kind: 'character', character: 'c1', prompt: '头像' }],
}
const bpA = extractBlueprintFromText(JSON.stringify(messyA))
check('容错A: 解析成功不抛错', !!bpA)
check('容错A: values 别名归一到 gameValues', bpA.gameValues.length === 1 && bpA.gameValues[0].refId === 'gv1')
check('容错A: 中文性别 catch 为 other', bpA.characters[0].gender === 'other')
check('容错A: id 别名补为 refId', bpA.chapters[0].refId === 'ch1' && bpA.chapters[0].nodes[0].refId === 'n1')
check('容错A: next 别名归一到 nextRef', bpA.chapters[0].nodes[0].nextRef === 'n2')
check('容错A: option.next 别名归一', bpA.chapters[0].nodes[1].options[0].nextRef === 'n3')
check('容错A: valueChanges→valueEffects + amount→delta', bpA.chapters[0].nodes[1].options[0].valueEffects[0].delta === 5)
check('容错A: image.character 别名归一', bpA.images[0].characterRef === 'c1')
// 进一步验证从这份不规范蓝图也能构建出正确的节点 DAG
const builtA = buildProjectDataFromBlueprint(bpA)
const chA = builtA.data.chapters[0]
const aN1 = chA.nodes.find(n => n.id === builtA.refs.nodes.get('n1'))
const aN2 = chA.nodes.find(n => n.id === builtA.refs.nodes.get('n2'))
const aN3 = chA.nodes.find(n => n.id === builtA.refs.nodes.get('n3'))
check('容错A: 构建 DAG - n1.nextNodeId 指向 n2', aN1.nextNodeId === aN2.id)
check('容错A: 构建 DAG - o1.nextNodeId 指向结局 n3', aN2.options[0].nextNodeId === aN3.id)
check('容错A: valueEffects 映射真实 valueId', aN2.options[0].valueChanges[0].valueId === builtA.refs.values.get('gv1'))

// 用例 B：markdown 代码块包裹 + 错误枚举值 + 缺失 refId + 悬挂引用（合法 choice 上）
const messyB = '这是剧情：\n```json\n' + JSON.stringify({
  chapters: [{ name: '章', nodes: [
    { type: 'DIALOG', nextRef: 'n2' },                 // 非法 type → catch 为 video
    { refId: 'n2', type: 'choice', prompt: '选', options: [
      { refId: 'o1', text: 'x', nextRef: 'zzz_nonexistent' },  // 悬挂引用
    ] },
  ] }],
}) + '\n```\n后面还有废话'
const bpB = extractBlueprintFromText(messyB)
check('容错B: markdown 包裹能提取', !!bpB && bpB.chapters.length === 1)
check('容错B: 非法 type catch 为 video', bpB.chapters[0].nodes[0].type === 'video')
check('容错B: 缺失 refId 的节点自动补全', !!bpB.chapters[0].nodes[0].refId)
const builtB = buildProjectDataFromBlueprint(bpB)
const chB = builtB.data.chapters[0]
// n1 是 video（DIALOG→catch），nextRef='n2' 存在，应解析到真实 n2 节点
check('容错B: 合法 nextRef 正确解析（非悬挂）', chB.nodes[0].nextNodeId === chB.nodes[1].id)
// n2 是合法 choice，其 option 的 nextRef='zzz_nonexistent' 悬空，应解析为 null
const n2B = chB.nodes[1]
check('容错B: n2 是 choice 节点', n2B.type === 'choice')
const danglingOpt = n2B.options[0]
check('容错B: 悬挂 option nextRef 解析为 null', danglingOpt.nextNodeId === null)

// 用例 C：根本不是 JSON
let threwC = false
try { extractBlueprintFromText('这不是json，根本没有花括号') } catch (e) { threwC = true }
check('容错C: 非法 JSON 仍抛错（且有清晰提示）', threwC)

console.log(pass ? '\n✅ 全部通过' : '\n❌ 存在失败')
process.exit(pass ? 0 : 1)

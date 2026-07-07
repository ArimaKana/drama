import { z } from 'zod'
import type {
  Chapter,
  Character,
  GameValue,
  Achievement,
  CollectionEntry,
  ImageAsset,
  StoryNode,
  VideoNode,
  ChoiceNode,
  EndingNode,
  ClearNode,
  ConditionNode,
  Gender,
  ImageCategory,
} from '~/types'
import { createId, now } from '~/utils/factory'
import { callAiModel, type AiClientOptions } from '~/utils/ai'
import { generateAndSaveImageAsset } from '~/utils/generateAsset'

// ============== 类型：故事蓝图（模型返回） ==============
// 模型返回的所有引用 id 都用稳定的字符串（refId），构建时统一映射成真实 nanoid。
// 这样模型不需要也不应该生成真实的 nanoid，降低出错概率。
//
// 健壮性策略：schema 尽量宽松 ——
// 1) 字段名差异（id↔refId、next↔nextRef 等）由 normalizeBlueprint 预处理归一化；
// 2) 枚举值用 .catch() 兜底（模型写错枚举不致整份被拒）；
// 3) 数值用 z.coerce.number() 容错字符串数字；
// 4) 缺失 refId 的元素在归一化时自动补一个稳定占位 refId。

const stringSchema = z.string().catch('')
const nullableStringSchema = z.union([z.string(), z.null()]).catch(null).nullable()
const numberSchema = z.coerce.number().catch(0)
const boolSchema = z.coerce.boolean().catch(false)

const genderSchema = z.enum(['male', 'female', 'other']).catch('other')
const operatorSchema = z.enum(['>', '<', '>=', '<=', '==', '!=']).catch('>=')
const nodeTypeSchema = z.enum(['video', 'choice', 'ending', 'clear', 'condition']).catch('video')
const conditionTypeSchema = z.enum(['value', 'chapter_unlock', 'node_played']).catch('value')
const imageKindSchema = z.enum(['character', 'scene', 'ending', 'startpage', 'ui', 'icon', 'storyboard']).catch('scene')
const logicSchema = z.enum(['and', 'or']).catch('and')

/** 节点选项引用的下一个节点 ref（模型可能写成 nextRef/next/target/to） */
const optionRefSchema = z.object({
  refId: stringSchema,
  text: stringSchema.catch('选项'),
  nextRef: nullableStringSchema,
  valueEffects: z.array(z.any()).catch([]),
}).passthrough()

/** 模型返回的单个节点，使用 refId 串接，type 受限（但出错时 catch 为 video） */
const blueprintNodeSchema = z.object({
  refId: stringSchema,
  type: nodeTypeSchema,
  name: stringSchema,
  // video
  nextRef: nullableStringSchema,
  // choice
  prompt: stringSchema,
  hasCountdown: boolSchema,
  countdownSeconds: numberSchema,
  defaultOptionRef: nullableStringSchema,
  options: z.array(optionRefSchema).catch([]),
  // ending / clear
  title: stringSchema,
  // ending
  endingImagePrompt: stringSchema,
  // condition
  conditionLogic: logicSchema,
  conditions: z.array(z.any()).catch([]),
  trueRef: nullableStringSchema,
  falseRef: nullableStringSchema,
  // 公共：播片/选项等带来的数值变更
  valueEffects: z.array(z.any()).catch([]),
}).passthrough()

const blueprintChapterSchema = z.object({
  refId: stringSchema,
  name: stringSchema,
  summary: stringSchema,
  startNodeRef: nullableStringSchema,
  nodes: z.array(blueprintNodeSchema).catch([]),
}).passthrough()

const blueprintCharacterSchema = z.object({
  refId: stringSchema,
  name: stringSchema,
  gender: genderSchema,
  description: stringSchema,
  // 用于生成头像的外观描述
  appearance: stringSchema,
}).passthrough()

const blueprintValueSchema = z.object({
  refId: stringSchema,
  name: stringSchema,
  defaultValue: numberSchema,
  minValue: numberSchema,
  maxValue: numberSchema.catch(100),
  description: stringSchema,
}).passthrough()

const blueprintAchievementSchema = z.object({
  refId: stringSchema,
  name: stringSchema,
  description: stringSchema,
  conditions: z.array(z.any()).catch([]),
}).passthrough()

const blueprintCollectionSchema = z.object({
  refId: stringSchema,
  characterRef: stringSchema,
  description: stringSchema,
  unlockConditions: z.array(z.any()).catch([]),
}).passthrough()

const blueprintImageSchema = z.object({
  refId: stringSchema,
  name: stringSchema,
  kind: imageKindSchema,
  prompt: stringSchema,
  // 绑定的角色 refId（kind=character 时用于回填头像）
  characterRef: nullableStringSchema,
  // 绑定的节点 refId（kind=ending 时用于回填结局图）
  nodeRef: nullableStringSchema,
}).passthrough()

export const storyBlueprintSchema = z.object({
  title: stringSchema,
  synopsis: stringSchema,
  chapters: z.array(blueprintChapterSchema).catch([]),
  characters: z.array(blueprintCharacterSchema).catch([]),
  gameValues: z.array(blueprintValueSchema).catch([]),
  achievements: z.array(blueprintAchievementSchema).catch([]),
  collection: z.array(blueprintCollectionSchema).catch([]),
  images: z.array(blueprintImageSchema).catch([]),
}).passthrough()

export type StoryBlueprint = z.infer<typeof storyBlueprintSchema>

// ============== 1) 解析小说 → 蓝图 ==============

export interface ParseStoryOptions {
  clientOptions: AiClientOptions
  model?: string
  novelContent: string
  extraPrompt?: string
}

export async function parseNovelStory(options: ParseStoryOptions): Promise<StoryBlueprint> {
  const { clientOptions, model, novelContent, extraPrompt } = options
  const truncated = novelContent.slice(0, 30000)

  const prompt = [
    '你是一位资深的互动影游（互动剧情游戏）策划。请把下面的小说改编成一套可直接游玩的互动剧情蓝图。',
    '',
    '【输出格式 - 极其重要】',
    '只返回一个 JSON 对象，第一个字符必须是 {，最后一个字符必须是 }。',
    '禁止输出任何解释文字、前言、后记、markdown 代码块（不要 ```json 包裹）。',
    '',
    '一、设计目标：',
    '1. 生成 4-8 个章节，每章必须包含一条完整可玩的故事线（由 nodes 构成的有向图），',
    '   绝不能只返回章节名/梗概。章与章之间通过章节顺序自然衔接（玩家通关一章进入下一章）。',
    '2. 每章 nodes 至少 5 个，推荐结构：开场播片(video) → 关键选择(choice) → 分支播片 → 结局/过渡。',
    '   重要分支要走到不同结局(ending) 或汇合，最终章用 clear(通关) 收尾。',
    '3. 所有节点用 refId 字符串互相引用（nextRef/successRef/options.nextRef 等），不要用真实 id。',
    '4. 生成 3-6 个核心数值 gameValues（如好感度、信任值、体力），并在选项/节点的 valueEffects 里引用它们（valueRef）。',
    '5. 生成 3-6 个成就 achievements，条件类型覆盖 value/chapter_unlock/node_played。',
    '6. 为每个主要角色生成一条图鉴 collection，characterRef 指向该角色。',
    '7. images 数组：为每个角色生成一张头像图（kind=character, characterRef 指向角色, prompt 描述外观）；',
    '   为关键场景生成 scene 图、为每个结局(ending)节点生成 ending 图（kind=ending, nodeRef 指向该结局节点的 refId）；',
    '   为起始页生成 startpage 背景图。',
    '',
    '二、JSON Schema（字段说明）：',
    '{',
    '  "title": "作品标题",',
    '  "synopsis": "一句话简介",',
    '  "chapters": [{',
    '    "refId": "ch1", "name": "章节名", "summary": "梗概",',
    '    "startNodeRef": "ch1_n1",',
    '    "nodes": [',
    '      {"refId":"ch1_n1","type":"video","name":"开场","nextRef":"ch1_n2"},',
    '      {"refId":"ch1_n2","type":"choice","name":"关键抉择","prompt":"你要怎么做？",',
    '       "options":[{"refId":"ch1_o1","text":"选项A","nextRef":"ch1_n3","valueEffects":[{"valueRef":"gv1","delta":5}]},',
    '                  {"refId":"ch1_o2","text":"选项B","nextRef":"ch1_n4"}]},',
    '      {"refId":"ch1_n3","type":"ending","title":"好结局","endingImagePrompt":"阳光下的重逢"},',
    '      {"refId":"ch1_n4","type":"ending","title":"坏结局","endingImagePrompt":"雨夜离别"}',
    '    ]',
    '  }],',
    '  "characters": [{"refId":"c1","name":"角色名","gender":"male|female|other","description":"设定","appearance":"外观描述，用于画头像"}],',
    '  "gameValues": [{"refId":"gv1","name":"好感度","defaultValue":0,"minValue":0,"maxValue":100}],',
    '  "achievements": [{"refId":"a1","name":"成就名","description":"描述",',
    '    "conditions":[{"type":"value","valueRef":"gv1","operator":">=","targetValue":80}]}],',
    '  "collection": [{"refId":"col1","characterRef":"c1","description":"角色档案",',
    '    "unlockConditions":[{"type":"chapter_unlock","chapterRef":"ch1"}]}],',
    '  "images": [{"refId":"img_c1","name":"角色名-头像","kind":"character","characterRef":"c1","prompt":"半身像，写实风格，纯色背景"},',
    '             {"refId":"img_end1","name":"好结局图","kind":"ending","nodeRef":"ch1_n3","prompt":"阳光下的重逢，暖色调"}]',
    '}',
    '',
    '三、约束：',
    '- gender 仅允许 male/female/other；operator 仅允许 > < >= <= == !=。',
    '- 每个节点的 nextRef/successRef/failRef/trueRef/falseRef/options.nextRef 必须指向同一章节内存在的节点 refId，',
    '  或为 null（null 表示该分支结束/留空，玩家到达后视为流程结束）。',
    '- valueEffects / conditions 里的 valueRef 必须是 gameValues 中已定义的 refId；characterRef 必须是 characters 中已定义的 refId。',
    '- images.kind=character 的条目，characterRef 必须指向真实存在的角色。',
    '- 确保每章 startNodeRef 指向该章 nodes 中的某个节点。',
    extraPrompt?.trim() ? `\n四、补充要求：${extraPrompt.trim()}` : '',
    '',
    '小说内容如下：',
    truncated,
  ].filter(Boolean).join('\n')

  const result = await callAiModel(clientOptions, { kind: 'llm', model, prompt })
  return extractBlueprintFromText(result.text)
}

export function extractBlueprintFromText(text: string): StoryBlueprint {
  const candidate = extractJsonObjectText(text)
  const parsedJson = JSON.parse(candidate)
  const normalized = normalizeBlueprint(parsedJson)
  const parsed = storyBlueprintSchema.safeParse(normalized)
  if (!parsed.success) {
    // 透出第一条具体出错路径，便于排查
    const firstIssue = parsed.error.issues[0]
    const path = firstIssue?.path?.join('.') || 'root'
    const message = firstIssue?.message || '未知错误'
    throw new Error(`模型返回 JSON 校验失败：${path}（${message}）。请重试，或换更强的模型。`)
  }
  return parsed.data
}

/** 从模型文本中提取最外层 JSON 对象的文本（兼容 markdown 代码块包裹） */
function extractJsonObjectText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] || text
  const firstBrace = candidate.indexOf('{')
  const lastBrace = candidate.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error('模型返回内容不是合法 JSON（未找到 JSON 对象）')
  }
  return candidate.slice(firstBrace, lastBrace + 1)
}

/**
 * 预处理：把模型常见的不规范写法归一化到 schema 期望的形态。
 * 处理：
 *  - 顶层把可能出现的别名数组（如 values 对应 gameValues）对齐；
 *  - 每个元素从 id/refId/optionId 等别名里取 refId，缺失时自动补一个稳定占位 refId；
 *  - 节点的跳转字段别名（next/nextRef/targetNode/to/successNode 等）归一到 *Ref；
 *  - options、valueEffects、conditions 也归一化字段名。
 * 归一化是"尽力而为"，不抛错；交给后续 schema 的 .catch 兜底。
 */
function normalizeBlueprint(raw: any): any {
  if (!raw || typeof raw !== 'object') return {}
  const out: any = { ...raw }

  // 顶层别名对齐
  out.gameValues = out.gameValues ?? out.values ?? out.gameValues ?? []
  out.collection = out.collection ?? out.collections ?? out.collection ?? []
  out.chapters = Array.isArray(out.chapters) ? out.chapters : []
  out.characters = Array.isArray(out.characters) ? out.characters : []
  out.achievements = Array.isArray(out.achievements) ? out.achievements : []
  out.images = Array.isArray(out.images) ? out.images : []

  // 章节归一化
  out.chapters = out.chapters.map((ch: any, chIdx: number) => normalizeChapter(ch, chIdx))
  // 角色/数值/成就/图鉴/图片归一化 refId
  out.characters = out.characters.map((c: any, i: number) => withRefId(c, `c${i + 1}`))
  out.gameValues = out.gameValues.map((v: any, i: number) => withRefId(v, `gv${i + 1}`))
  out.achievements = out.achievements.map((a: any, i: number) => withRefId(a, `a${i + 1}`))
  out.collection = out.collection.map((col: any, i: number) => withRefId(col, `col${i + 1}`))
  out.images = out.images.map((img: any, i: number) => normalizeImage(img, i))

  return out
}

function normalizeChapter(ch: any, chIdx: number): any {
  const chapter = { ...ch }
  if (!chapter.refId) {
    chapter.refId = chapter.id || chapter.chapterId || `ch${chIdx + 1}`
  }
  // 章节起始节点别名
  chapter.startNodeRef = pickFirst(chapter, ['startNodeRef', 'startNodeId', 'startNode', 'start', 'startNodeRefId'])

  const rawNodes = Array.isArray(chapter.nodes) ? chapter.nodes : []
  chapter.nodes = rawNodes.map((n: any, nIdx: number) => normalizeNode(n, nIdx, chapter.refId))
  return chapter
}

function normalizeImage(img: any, idx: number): any {
  const out = withRefId(img, `img${idx + 1}`)
  out.characterRef = pickRef(out, ['characterRef', 'characterId', 'character', 'targetCharacter'])
  out.nodeRef = pickRef(out, ['nodeRef', 'nodeId', 'node'])
  // kind 别名归一（大写/中文等交给 schema 的 .catch 兜底）
  if (!out.kind && out.type) out.kind = out.type
  return out
}

function normalizeNode(n: any, nIdx: number, chapterRefId: string): any {
  const node: any = { ...n }
  // refId 别名：refId / id / nodeId / ref
  if (!node.refId) {
    node.refId = node.id || node.nodeId || node.ref || `${chapterRefId}_n${nIdx + 1}`
  }
  // 跳转字段别名归一
  node.nextRef = pickRef(node, ['nextRef', 'nextNodeId', 'next', 'nextNode', 'target', 'targetNode', 'to'])
  node.trueRef = pickRef(node, ['trueRef', 'trueNodeId', 'trueNode', 'onTrue'])
  node.falseRef = pickRef(node, ['falseRef', 'falseNodeId', 'falseNode', 'onFalse'])
  node.defaultOptionRef = pickRef(node, ['defaultOptionRef', 'defaultOptionId', 'defaultOption'])

  // options 归一化
  if (Array.isArray(node.options)) {
    node.options = node.options.map((opt: any, oIdx: number) => {
      const o: any = { ...opt }
      if (!o.refId) {
        o.refId = o.id || o.optionId || o.ref || `${node.refId}_o${oIdx + 1}`
      }
      o.nextRef = pickRef(o, ['nextRef', 'nextNodeId', 'next', 'nextNode', 'target', 'targetNode', 'to'])
      o.valueEffects = normalizeEffects(o.valueEffects ?? o.valueChanges ?? o.effects)
      return o
    })
  }

  // valueEffects / conditions 归一化
  node.valueEffects = normalizeEffects(node.valueEffects ?? node.valueChanges ?? node.effects)
  if (Array.isArray(node.conditions)) {
    node.conditions = node.conditions.map((c: any) => normalizeCondition(c))
  }
  return node
}

function normalizeEffects(effects: any): any[] {
  if (!Array.isArray(effects)) return []
  return effects.map((e: any) => {
    const eff: any = { ...(e || {}) }
    // valueRef 优先取明确的 valueRef/valueId/stat/statId；
    // 注意 value 可能是数字（delta）也可能是字符串（refId），按类型区分。
    eff.valueRef = pickRef(eff, ['valueRef', 'valueId', 'stat', 'statId'])
      ?? (typeof eff.value === 'string' ? eff.value.trim() || null : null)
    eff.characterRef = pickRef(eff, ['characterRef', 'characterId', 'character', 'targetCharacter'])
    // delta：优先取明确的 delta/amount/change；value 仅当为数字时才作为 delta 兜底
    const numericValue = typeof eff.value === 'number' ? eff.value : undefined
    eff.delta = eff.delta ?? eff.amount ?? eff.change ?? numericValue ?? 0
    return eff
  })
}

function normalizeCondition(c: any): any {
  const cond: any = { ...(c || {}) }
  cond.valueRef = pickRef(cond, ['valueRef', 'valueId', 'value', 'stat', 'statId'])
  cond.characterRef = pickRef(cond, ['characterRef', 'characterId', 'character'])
  cond.chapterRef = pickRef(cond, ['chapterRef', 'chapterId', 'chapter'])
  cond.nodeRef = pickRef(cond, ['nodeRef', 'nodeId', 'node'])
  return cond
}

/** 从一组候选键名里取第一个非空字符串/非null值 */
function pickFirst(obj: any, keys: string[]): any {
  if (!obj) return undefined
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}

/** 同 pickFirst，但只接受字符串（用于 ref 字段，过滤掉数字 id 等） */
function pickRef(obj: any, keys: string[]): string | null {
  const v = pickFirst(obj, keys)
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number') return null // 数字 id 不作为 ref
  return null
}

/** 给元素补 refId（优先取 id/refId 等别名） */
function withRefId(obj: any, fallback: string): any {
  if (!obj || typeof obj !== 'object') return { refId: fallback }
  const refId = pickFirst(obj, ['refId', 'id', 'ref']) || fallback
  return { ...obj, refId: String(refId) }
}

// ============== 2) 蓝图 → 真实项目数据（refId 映射） ==============

interface RefMap {
  characters: Map<string, string> // refId -> realId
  values: Map<string, string>
  chapters: Map<string, string>
  nodes: Map<string, string>
  achievements: Map<string, string>
  collection: Map<string, string>
}

function createEmptyRefMap(): RefMap {
  return {
    characters: new Map(),
    values: new Map(),
    chapters: new Map(),
    nodes: new Map(),
    achievements: new Map(),
    collection: new Map(),
  }
}

/** 把蓝图的 valueEffects（用 ref）翻译成项目 ValueChange（用真实 id） */
function mapValueEffects(
  effects: Array<{ characterRef?: string | null; valueRef?: string | null; delta?: number }>,
  refs: RefMap,
) {
  return (effects || [])
    .filter(e => e.valueRef && refs.values.has(e.valueRef!))
    .map(e => ({
      characterId: (e.characterRef && refs.characters.get(e.characterRef)) || '',
      valueId: refs.values.get(e.valueRef!)!,
      delta: e.delta ?? 0,
    }))
}

const LAYOUT_COL_SPACING = 300
const LAYOUT_ROW_SPACING = 220
const LAYOUT_COLS = 3

/** 蛇形布局：把节点按声明顺序排成多行多列 */
function layoutPosition(index: number) {
  const row = Math.floor(index / LAYOUT_COLS)
  const colInRow = index % LAYOUT_COLS
  const reverseRow = row % 2 === 1
  const col = reverseRow ? LAYOUT_COLS - 1 - colInRow : colInRow
  return { x: 80 + col * LAYOUT_COL_SPACING, y: 120 + row * LAYOUT_ROW_SPACING }
}

function mapCondition(cond: {
  characterRef?: string | null
  valueRef?: string | null
  operator?: string
  targetValue?: number
}, refs: RefMap) {
  return {
    characterId: (cond.characterRef && refs.characters.get(cond.characterRef)) || '',
    valueId: (cond.valueRef && refs.values.get(cond.valueRef)) || '',
    operator: (cond.operator as any) || '>=',
    targetValue: cond.targetValue ?? 0,
  }
}

function mapConditionGroup(
  group: { logic?: string; conditions?: Array<any> } | undefined,
  defaultLogic: string,
  refs: RefMap,
) {
  return {
    logic: (group?.logic as 'and' | 'or') || (defaultLogic as 'and' | 'or'),
    conditions: (group?.conditions || []).map(c => mapCondition(c, refs)),
  }
}

/** 构建单章节点（已映射真实 id），返回 nodes + startNodeId */
function buildChapterNodes(
  chapter: StoryBlueprint['chapters'][number],
  refs: RefMap,
): { nodes: StoryNode[]; startNodeId: string | null } {
  const timestamp = now()
  const realNodes: StoryNode[] = []

  // 第一遍：为每个蓝图节点分配真实 id + 坐标
  chapter.nodes.forEach((bn, index) => {
    const realId = createId()
    refs.nodes.set(bn.refId, realId)
    const pos = layoutPosition(index)
    const base: any = {
      id: realId,
      type: bn.type,
      name: bn.name || defaultNodeName(bn.type),
      x: pos.x,
      y: pos.y,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    switch (bn.type) {
      case 'video':
        realNodes.push({
          ...base,
          videoId: '',
          nextNodeId: bn.nextRef ?? null, // 暂存 ref，第二遍映射
          valueChanges: mapValueEffects(bn.valueEffects, refs),
        } as VideoNode)
        break
      case 'choice':
        realNodes.push({
          ...base,
          prompt: bn.prompt || '请做出选择',
          hasCountdown: !!bn.hasCountdown,
          countdownSeconds: bn.countdownSeconds || 10,
          defaultOptionId: bn.defaultOptionRef ?? null, // 暂存 ref
          options: bn.options.map(o => ({
            id: (() => {
              const optRealId = createId()
              refs.nodes.set(o.refId, optRealId)
              return optRealId
            })(),
            text: o.text || '选项',
            nextNodeId: o.nextRef ?? null, // 暂存 ref
            valueChanges: mapValueEffects(o.valueEffects, refs),
          })),
        } as ChoiceNode)
        break
      case 'ending':
        realNodes.push({
          ...base,
          title: bn.title || '结局',
          description: bn.description || '',
          endingImage: '',
        } as EndingNode)
        break
      case 'clear':
        realNodes.push({
          ...base,
          title: bn.title || '恭喜通关',
          description: bn.description || '',
        } as ClearNode)
        break
      case 'condition':
        realNodes.push({
          ...base,
          conditionGroup: {
            logic: bn.conditionLogic as 'and' | 'or',
            conditions: (bn.conditions || []).map(c => mapCondition(c, refs)),
          },
          trueNodeId: bn.trueRef ?? null,
          falseNodeId: bn.falseRef ?? null,
        } as ConditionNode)
        break
    }
  })

  // 第二遍：把所有 ref 形式的跳转字段映射成真实 id
  const resolveRef = (ref: string | null): string | null => {
    if (!ref) return null
    return refs.nodes.get(ref) ?? null
  }
  for (const node of realNodes as any[]) {
    if (node.nextNodeId != null) node.nextNodeId = resolveRef(node.nextNodeId)
    if (node.trueNodeId != null) node.trueNodeId = resolveRef(node.trueNodeId)
    if (node.falseNodeId != null) node.falseNodeId = resolveRef(node.falseNodeId)
    if (node.defaultOptionId != null) node.defaultOptionId = resolveRef(node.defaultOptionId)
    if (Array.isArray(node.options)) {
      for (const opt of node.options) {
        if (opt.nextNodeId != null) opt.nextNodeId = resolveRef(opt.nextNodeId)
      }
    }
  }

  // 起始节点
  let startNodeId: string | null = null
  if (chapter.startNodeRef) {
    startNodeId = refs.nodes.get(chapter.startNodeRef) ?? null
  }
  if (!startNodeId && realNodes.length > 0) {
    startNodeId = realNodes[0]!.id
  }

  return { nodes: realNodes, startNodeId }
}

function defaultNodeName(type: string): string {
  const names: Record<string, string> = {
    video: '剧情',
    choice: '选择',
    ending: '结局',
    clear: '通关',
    condition: '条件分支',
  }
  return names[type] || type
}

/** 从蓝图构建全部章节（带真实 id），并填充 refs */
export function buildChaptersFromBlueprint(blueprint: StoryBlueprint, refs: RefMap): Chapter[] {
  return blueprint.chapters.map((bpChapter, index) => {
    const chapterId = createId()
    refs.chapters.set(bpChapter.refId, chapterId)
    const { nodes, startNodeId } = buildChapterNodes(bpChapter, refs)
    return {
      id: chapterId,
      name: bpChapter.name,
      description: bpChapter.summary,
      order: index,
      nodes,
      startNodeId,
      createdAt: now(),
      updatedAt: now(),
    } satisfies Chapter
  })
}

/** 构建角色（带真实 id），返回角色数组，并填充 refs.characters */
export function buildCharactersFromBlueprint(blueprint: StoryBlueprint, refs: RefMap): Character[] {
  return blueprint.characters.map((bpChar) => {
    const realId = createId()
    refs.characters.set(bpChar.refId, realId)
    return {
      id: realId,
      name: bpChar.name,
      gender: (bpChar.gender as Gender) || 'other',
      avatar: '', // 稍后由图片生成回填
      description: bpChar.description,
      images: [],
      createdAt: now(),
      updatedAt: now(),
    } satisfies Character
  })
}

export function buildGameValuesFromBlueprint(blueprint: StoryBlueprint, refs: RefMap): GameValue[] {
  return blueprint.gameValues.map((bpVal) => {
    const realId = createId()
    refs.values.set(bpVal.refId, realId)
    return {
      id: realId,
      name: bpVal.name,
      icon: '',
      defaultValue: bpVal.defaultValue ?? 0,
      minValue: bpVal.minValue ?? 0,
      maxValue: bpVal.maxValue ?? 100,
      createdAt: now(),
      updatedAt: now(),
    } satisfies GameValue
  })
}

export function buildAchievementsFromBlueprint(blueprint: StoryBlueprint, refs: RefMap): Achievement[] {
  return blueprint.achievements.map((bpAch) => {
    const realId = createId()
    refs.achievements.set(bpAch.refId, realId)
    return {
      id: realId,
      name: bpAch.name,
      description: bpAch.description,
      image: '',
      conditions: (bpAch.conditions || []).map(c => ({
        type: (c.type as any) || 'value',
        characterId: (c.characterRef && refs.characters.get(c.characterRef)) || undefined,
        valueId: (c.valueRef && refs.values.get(c.valueRef)) || undefined,
        operator: c.operator as any,
        targetValue: c.targetValue ?? 0,
        chapterId: (c.chapterRef && refs.chapters.get(c.chapterRef)) || undefined,
        nodeId: (c.nodeRef && refs.nodes.get(c.nodeRef)) || undefined,
      })),
      createdAt: now(),
      updatedAt: now(),
    } satisfies Achievement
  })
}

export function buildCollectionFromBlueprint(blueprint: StoryBlueprint, refs: RefMap): CollectionEntry[] {
  return blueprint.collection.map((bpCol) => {
    const realId = createId()
    refs.collection.set(bpCol.refId, realId)
    return {
      id: realId,
      characterId: refs.characters.get(bpCol.characterRef) || '',
      description: bpCol.description,
      unlockConditions: (bpCol.unlockConditions || []).map(c => ({
        type: (c.type as any) || 'value',
        characterId: (c.characterRef && refs.characters.get(c.characterRef)) || undefined,
        valueId: (c.valueRef && refs.values.get(c.valueRef)) || undefined,
        operator: c.operator as any,
        targetValue: c.targetValue ?? 0,
        chapterId: (c.chapterRef && refs.chapters.get(c.chapterRef)) || undefined,
        nodeId: (c.nodeRef && refs.nodes.get(c.nodeRef)) || undefined,
      })),
      createdAt: now(),
      updatedAt: now(),
    } satisfies CollectionEntry
  })
}

// ============== 3) 图片批量生成 ==============

export interface ImageGenContext {
  apiKey: string
  baseURL?: string
  model?: string
  projectPath?: string
}

export interface GeneratedImageResult {
  asset: ImageAsset
  /** 蓝图图片 refId，用于回填 */
  refId: string
  kind: string
  characterRef?: string | null
  nodeRef?: string | null
}

export interface ImageGenProgress {
  done: number
  total: number
  name: string
}

/**
 * 并发生成蓝图中的所有图片（角色头像/场景/结局/起始页）。
 * 失败的单张会跳过并报告，不阻断整体。
 */
export async function generateBlueprintImages(
  blueprint: StoryBlueprint,
  ctx: ImageGenContext,
  onProgress?: (p: ImageGenProgress) => void,
): Promise<GeneratedImageResult[]> {
  const concurrency = 3
  const tasks = blueprint.images.filter(img => img.prompt && img.prompt.trim())
  const results: GeneratedImageResult[] = []
  let done = 0

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(async (imgTask, batchIndex) => {
        const generated = await generateAndSaveImageAsset({
          apiKey: ctx.apiKey,
          baseURL: ctx.baseURL,
          model: ctx.model,
          projectPath: ctx.projectPath,
          prompt: imgTask.prompt,
          filenamePrefix: imgTask.name || imgTask.kind,
        })
        const category = mapImageKindToCategory(imgTask.kind)
        const timestamp = now()
        const asset: ImageAsset = {
          id: createId(),
          name: imgTask.name || `${imgTask.kind}_${i + batchIndex}`,
          url: generated.url,
          category,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        return {
          asset,
          refId: imgTask.refId,
          kind: imgTask.kind,
          characterRef: imgTask.characterRef ?? null,
          nodeRef: imgTask.nodeRef ?? null,
        } satisfies GeneratedImageResult
      }),
    )
    for (let b = 0; b < batchResults.length; b++) {
      const r = batchResults[b]
      const taskName = batch[b]?.name || batch[b]?.kind || ''
      if (r.status === 'fulfilled') {
        results.push(r.value)
      }
      done += 1
      onProgress?.({ done, total: tasks.length, name: taskName })
    }
  }

  return results
}

function mapImageKindToCategory(kind: string): ImageCategory {
  switch (kind) {
    case 'character': return 'character'
    case 'ui': return 'ui'
    case 'icon': return 'icon'
    case 'scene':
    case 'startpage':
      return 'scene'
    case 'ending':
    case 'storyboard':
    default:
      return 'storyboard'
  }
}

// ============== 4) 组装：把生成结果写入项目（覆盖式） ==============

export interface AssembledProjectData {
  chapters: Chapter[]
  characters: Character[]
  gameValues: GameValue[]
  achievements: Achievement[]
  collection: CollectionEntry[]
  images: ImageAsset[]
  /** 起始页背景图 url（如有） */
  startPageBackground?: string
  /** 标题（如蓝图给出） */
  title?: string
}

/**
 * 一站式：从蓝图构建出可覆盖写入项目的全部数据（不含图片，图片单独生成后回填）。
 * 返回 refs 以便图片生成后回填头像/结局图。
 */
export function buildProjectDataFromBlueprint(blueprint: StoryBlueprint): {
  data: Omit<AssembledProjectData, 'images' | 'startPageBackground'>
  refs: RefMap
} {
  const refs = createEmptyRefMap()
  const gameValues = buildGameValuesFromBlueprint(blueprint, refs)
  const characters = buildCharactersFromBlueprint(blueprint, refs)
  const chapters = buildChaptersFromBlueprint(blueprint, refs)
  const achievements = buildAchievementsFromBlueprint(blueprint, refs)
  const collection = buildCollectionFromBlueprint(blueprint, refs)

  // 清理 ending 节点上临时使用的 _endingImageRef 标记（非标准字段）
  for (const chapter of chapters) {
    for (const node of chapter.nodes) {
      const anyNode = node as EndingNode & { _endingImageRef?: string }
      if (anyNode._endingImageRef) {
        delete anyNode._endingImageRef
      }
    }
  }

  return {
    data: { chapters, characters, gameValues, achievements, collection, title: blueprint.title },
    refs,
  }
}

/**
 * 把生成的图片回填到项目数据：角色头像、结局图、起始页背景。
 * 返回最终图片素材数组（含未被绑定的场景图）。
 */
export function applyGeneratedImages(
  data: ReturnType<typeof buildProjectDataFromBlueprint>['data'],
  refs: RefMap,
  images: GeneratedImageResult[],
): { images: ImageAsset[]; startPageBackground?: string } {
  const finalImages: ImageAsset[] = []
  let startPageBackground: string | undefined

  // 预先建立 node refId -> 真实 EndingNode 的索引（结局节点跨章节全局唯一）
  const endingNodeByRef = new Map<string, EndingNode>()
  for (const chapter of data.chapters) {
    for (const node of chapter.nodes) {
      if (node.type === 'ending') {
        // 反查 refs.nodes：找出哪个 ref 映射到这个真实 id
        for (const [refId, realId] of refs.nodes) {
          if (realId === node.id) {
            endingNodeByRef.set(refId, node as EndingNode)
            break
          }
        }
      }
    }
  }

  for (const img of images) {
    finalImages.push(img.asset)
    // 角色头像回填
    if (img.kind === 'character' && img.characterRef) {
      const charId = refs.characters.get(img.characterRef)
      const target = charId ? data.characters.find(c => c.id === charId) : undefined
      if (target) {
        target.avatar = img.asset.url
        if (!target.images.includes(img.asset.id)) target.images.push(img.asset.id)
      }
      continue
    }
    // 起始页背景回填
    if (img.kind === 'startpage') {
      startPageBackground = img.asset.url
      continue
    }
    // 结局图回填：kind=ending 且 nodeRef 指向某 ending 节点
    if (img.kind === 'ending' && img.nodeRef) {
      const targetNode = endingNodeByRef.get(img.nodeRef)
      if (targetNode) {
        targetNode.endingImage = img.asset.url
        continue
      }
    }
    // 其余（scene/ui/icon/storyboard）仅入库，用户可在流程编辑器手动挂载
  }

  return { images: finalImages, startPageBackground }
}

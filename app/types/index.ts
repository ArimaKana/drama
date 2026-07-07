// 项目数据类型定义

// ============== 基础类型 ==============
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// ============== 素材类型 ==============
export type ImageCategory = 'character' | 'ui' | 'icon' | 'scene' | 'storyboard'

export interface VideoAsset extends BaseEntity {
  name: string
  url: string // 本地文件路径或 base64
  duration?: number
  thumbnail?: string
}

export interface ImageAsset extends BaseEntity {
  name: string
  url: string
  category: ImageCategory
  width?: number
  height?: number
}

export interface AudioAsset extends BaseEntity {
  name: string
  url: string
  duration?: number
}

export interface SubtitleAsset extends BaseEntity {
  name: string
  url: string
}

export interface AssetLibrary {
  videos: VideoAsset[]
  images: ImageAsset[]
  audios: AudioAsset[]
  subtitles: SubtitleAsset[]
}

// ============== 数值类型 ==============
export interface GameValue extends BaseEntity {
  name: string
  icon: string // 图标 url 或 base64
  defaultValue: number
  minValue: number
  maxValue: number
}

// ============== 角色类型 ==============
export type Gender = 'male' | 'female' | 'other'

export interface Character extends BaseEntity {
  name: string
  gender: Gender
  avatar: string // 图片素材 id 或 url
  description: string
  images: string[] // 关联的图片素材 id
}

// ============== 条件类型 ==============
export type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!='
export type ConditionLogic = 'and' | 'or'

export interface ValueCondition {
  characterId: string
  valueId: string
  operator: ConditionOperator
  targetValue: number
}

export interface ConditionGroup {
  logic: ConditionLogic
  conditions: ValueCondition[]
}

// ============== 节点类型 ==============
export type NodeType = 'video' | 'choice' | 'qte' | 'ending' | 'explore' | 'clear' | 'condition'

export interface BaseNode extends BaseEntity {
  type: NodeType
  name: string
  x: number
  y: number
}

// 播片节点
export interface VideoNode extends BaseNode {
  type: 'video'
  videoId: string // 关联的视频素材 id
  subtitleEnabled: boolean
  subtitleId: string | null
  nextNodeId: string | null
  // 播片时的数值变更
  valueChanges: ValueChange[]
}

export interface ValueChange {
  characterId: string
  valueId: string
  delta: number // 增减值
}

// 选项定义
export interface ChoiceOption {
  id: string
  text: string
  nextNodeId: string | null
  valueChanges: ValueChange[]
}

// 选择节点
export interface ChoiceNode extends BaseNode {
  type: 'choice'
  prompt: string
  hasCountdown: boolean
  countdownSeconds: number
  defaultOptionId: string | null // 超时默认选项
  options: ChoiceOption[]
}

// QTE 节点
export interface QTENode extends BaseNode {
  type: 'qte'
  description: string
  timeLimit: number // 秒
  successNodeId: string | null
  failNodeId: string | null
  valueChangesOnSuccess: ValueChange[]
  valueChangesOnFail: ValueChange[]
}

// 结局节点
export interface EndingNode extends BaseNode {
  type: 'ending'
  title: string
  description: string
  endingImage: string
}

// 探索节点
export interface ExploreNode extends BaseNode {
  type: 'explore'
  backgroundImage: string
  hotspots: ExploreHotspot[]
  nextNodeId: string | null
}

export interface ExploreHotspot {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  nextNodeId: string | null
  valueChanges: ValueChange[]
}

// 通关节点
export interface ClearNode extends BaseNode {
  type: 'clear'
  title: string
  description: string
}

// 条件分支节点
export interface ConditionNode extends BaseNode {
  type: 'condition'
  conditionGroup: ConditionGroup
  trueNodeId: string | null
  falseNodeId: string | null
}

export type StoryNode = VideoNode | ChoiceNode | QTENode | EndingNode | ExploreNode | ClearNode | ConditionNode

// ============== 章节类型 ==============
export interface Chapter extends BaseEntity {
  name: string
  description: string
  backgroundAudioId: string | null
  order: number
  nodes: StoryNode[]
  startNodeId: string | null
}

// ============== 成就类型 ==============
export type AchievementConditionType = 'value' | 'chapter_unlock' | 'node_played'

export interface AchievementCondition {
  type: AchievementConditionType
  // value 类型
  characterId?: string
  valueId?: string
  operator?: ConditionOperator
  targetValue?: number
  // chapter_unlock 类型
  chapterId?: string
  // node_played 类型
  nodeId?: string
}

export interface Achievement extends BaseEntity {
  name: string
  description: string
  image: string
  conditions: AchievementCondition[]
}

// ============== 图鉴类型 ==============
export type CollectionConditionType = 'value' | 'chapter_unlock' | 'node_played'

export interface CollectionCondition {
  type: CollectionConditionType
  characterId?: string
  valueId?: string
  operator?: ConditionOperator
  targetValue?: number
  chapterId?: string
  nodeId?: string
}

export interface CollectionEntry extends BaseEntity {
  characterId: string // 关联的角色
  description: string
  unlockConditions: CollectionCondition[]
}

// ============== 起始页面 ==============
export type StartPageBackgroundType = 'image' | 'video'
export type StartPageTitleMode = 'text' | 'image' | 'none'
export type StartPageButtonMode = 'normal' | 'image'

export interface StartPageButtonStyle {
  mode: StartPageButtonMode
  text: string
  textColor: string
  backgroundColor: string
  image: string
}

export interface StartPageButtonStyles {
  start: StartPageButtonStyle
  continue: StartPageButtonStyle
  achievements: StartPageButtonStyle
  collection: StartPageButtonStyle
  settings: StartPageButtonStyle
}

export interface StartPage {
  backgroundType: StartPageBackgroundType
  backgroundMedia: string
  bgm: string
  titleMode: StartPageTitleMode
  titleText: string
  titleImage: string
  menuPosition: {
    x: number
    y: number
  }
  titlePosition: {
    x: number
    y: number
  }
  settingsPosition: {
    x: number
    y: number
  }
  buttonStyles: StartPageButtonStyles
}

export type ProjectLlmProvider = 'zhipu' | 'deepseek' | 'kimi' | 'custom'
export type ProjectImageProvider = 'seedream'
export type ProjectVideoProvider = 'seedance'
export type ProjectAiTokenProvider = ProjectLlmProvider | ProjectImageProvider | ProjectVideoProvider

export interface ProjectLlmConfig {
  provider: ProjectLlmProvider
  model: string
  baseURL: string
}

export interface ProjectImageConfig {
  provider: ProjectImageProvider
  model: string
  baseURL: string
}

export interface ProjectVideoConfig {
  provider: ProjectVideoProvider
  model: string
  baseURL: string
}

export interface ProjectAiConfig {
  text: ProjectLlmConfig
  image: ProjectImageConfig
  video: ProjectVideoConfig
}

export type ProjectOrientation = 'landscape' | 'portrait'

// ============== 项目类型 ==============
export interface Project extends BaseEntity {
  name: string
  orientation: ProjectOrientation
  path?: string // 项目本地路径
  assetServerUrl?: string // 静态资源服务地址
  cover: string
  assets: AssetLibrary
  chapters: Chapter[]
  characters: Character[]
  gameValues: GameValue[]
  startPage: StartPage
  aiConfig: ProjectAiConfig
  achievements: Achievement[]
  collection: CollectionEntry[]
}

// ============== 项目列表项 ==============
export interface ProjectListItem {
  id: string
  name: string
  path?: string
  cover: string
  createdAt: string
  updatedAt: string
}

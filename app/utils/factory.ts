import { nanoid } from 'nanoid'
import type {
  Project,
  Chapter,
  Character,
  GameValue,
  Achievement,
  CollectionEntry,
  VideoAsset,
  ImageAsset,
  StoryNode,
  VideoNode,
  ChoiceNode,
  QTENode,
  EndingNode,
  ExploreNode,
  ClearNode,
  ConditionNode,
} from '~/types'

export function createId(): string {
  return nanoid()
}

export function now(): string {
  return new Date().toISOString()
}

export function createProject(name: string): Project {
  const id = createId()
  const timestamp = now()
  return {
    id,
    name,
    orientation: 'landscape',
    cover: '',
    createdAt: timestamp,
    updatedAt: timestamp,
    assets: { videos: [], images: [], audios: [], subtitles: [] },
    chapters: [],
    characters: [],
    gameValues: [],
    startPage: {
      backgroundType: 'image',
      backgroundMedia: '',
      bgm: '',
      titleMode: 'text',
      titleText: name,
      titleImage: '',
      menuPosition: {
        x: 190,
        y: 126,
      },
      titlePosition: {
        x: 228,
        y: 53,
      },
      settingsPosition: {
        x: 516,
        y: 24,
      },
      buttonStyles: {
        start: { mode: 'normal', text: '开始游戏', textColor: '#ffffff', backgroundColor: '#2563eb', image: '' },
        continue: { mode: 'normal', text: '继续游戏', textColor: '#111827', backgroundColor: '#f3f4f6', image: '' },
        achievements: { mode: 'normal', text: '游戏成就', textColor: '#ffffff', backgroundColor: '#111827', image: '' },
        collection: { mode: 'normal', text: '图鉴', textColor: '#ffffff', backgroundColor: '#111827', image: '' },
        settings: { mode: 'normal', text: '设置', textColor: '#ffffff', backgroundColor: '#374151', image: '' },
      },
    },
    aiConfig: {
      text: {
        provider: 'zhipu',
        model: '',
        baseURL: '',
      },
      image: {
        provider: 'seedream',
        model: 'doubao-seedream-5-0-260128',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      },
      video: {
        provider: 'seedance',
        model: 'doubao-seedance-1-5-pro-251215',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      },
    },
    achievements: [],
    collection: [],
  }
}

export function createChapter(name: string, order: number): Chapter {
  const timestamp = now()
  return {
    id: createId(),
    name,
    description: '',
    backgroundAudioId: null,
    order,
    nodes: [],
    startNodeId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createCharacter(name: string): Character {
  const timestamp = now()
  return {
    id: createId(),
    name,
    gender: 'other',
    avatar: '',
    description: '',
    images: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createGameValue(name: string): GameValue {
  const timestamp = now()
  return {
    id: createId(),
    name,
    icon: '',
    defaultValue: 0,
    minValue: 0,
    maxValue: 100,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createVideoNode(x: number, y: number): VideoNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'video',
    name: '播片节点',
    x,
    y,
    videoId: '',
    subtitleEnabled: false,
    subtitleId: null,
    nextNodeId: null,
    valueChanges: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createChoiceNode(x: number, y: number): ChoiceNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'choice',
    name: '选择节点',
    x,
    y,
    prompt: '请做出选择',
    hasCountdown: false,
    countdownSeconds: 10,
    defaultOptionId: null,
    options: [
      { id: createId(), text: '选项 A', nextNodeId: null, valueChanges: [] },
      { id: createId(), text: '选项 B', nextNodeId: null, valueChanges: [] },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createQTENode(x: number, y: number): QTENode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'qte',
    name: 'QTE 节点',
    x,
    y,
    description: '',
    timeLimit: 5,
    successNodeId: null,
    failNodeId: null,
    valueChangesOnSuccess: [],
    valueChangesOnFail: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createEndingNode(x: number, y: number): EndingNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'ending',
    name: '结局节点',
    x,
    y,
    title: '结局',
    description: '',
    endingImage: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createExploreNode(x: number, y: number): ExploreNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'explore',
    name: '探索节点',
    x,
    y,
    backgroundImage: '',
    hotspots: [],
    nextNodeId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createClearNode(x: number, y: number): ClearNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'clear',
    name: '通关节点',
    x,
    y,
    title: '恭喜通关',
    description: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createConditionNode(x: number, y: number): ConditionNode {
  const timestamp = now()
  return {
    id: createId(),
    type: 'condition',
    name: '条件分支',
    x,
    y,
    conditionGroup: { logic: 'and', conditions: [] },
    trueNodeId: null,
    falseNodeId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createAchievement(name: string): Achievement {
  const timestamp = now()
  return {
    id: createId(),
    name,
    description: '',
    image: '',
    conditions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createCollectionEntry(characterId: string): CollectionEntry {
  const timestamp = now()
  return {
    id: createId(),
    characterId,
    description: '',
    unlockConditions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createNodeByType(type: string, x: number, y: number): StoryNode {
  switch (type) {
    case 'video': return createVideoNode(x, y)
    case 'choice': return createChoiceNode(x, y)
    case 'qte': return createQTENode(x, y)
    case 'ending': return createEndingNode(x, y)
    case 'explore': return createExploreNode(x, y)
    case 'clear': return createClearNode(x, y)
    case 'condition': return createConditionNode(x, y)
    default: return createVideoNode(x, y)
  }
}

import type { ImageCategory, ProjectAiTokenProvider } from '~/types'
import { isTauriRuntime } from '~/utils/runtime'
import { generateSeedreamImage } from '~/utils/seedream'

/**
 * 共享的"生成单张图片并落盘到项目 assets 目录"工具。
 * 复用 Seedream 生图 + Tauri save_base64_asset 落盘，返回项目内文件名（与 assets.vue 中一致）。
 * - 桌面端：生成后保存为本地文件，返回文件名（如 ai_xxx_123.png）。
 * - 浏览器端：返回 data URI（无本地落盘能力时退化）。
 */
export interface GenerateAndSaveImageOptions {
  /** Seedream API Key */
  apiKey: string
  /** 生图模型 baseURL，留空使用默认 */
  baseURL?: string
  /** 生图模型名称，留空使用默认 */
  model?: string
  /** 生图提示词 */
  prompt: string
  /** 参考图（data URI 或公网 URL），可选 */
  referenceImage?: string
  /** 项目本地路径（桌面端落盘用） */
  projectPath?: string
  /** 文件名前缀，用于生成唯一文件名 */
  filenamePrefix?: string
}

export interface GeneratedImageAsset {
  /** 项目内文件名或 data URI */
  url: string
  /** 推断的图片宽度（未知则省略） */
  width?: number
  /** 推断的图片高度（未知则省略） */
  height?: number
}

export async function generateAndSaveImageAsset(
  options: GenerateAndSaveImageOptions
): Promise<GeneratedImageAsset> {
  const { apiKey, prompt, referenceImage, baseURL, model, projectPath, filenamePrefix } = options
  if (!apiKey.trim()) {
    throw new Error('请先配置 Seedream API Key')
  }
  if (!prompt.trim()) {
    throw new Error('生图提示词不能为空')
  }

  const result = await generateSeedreamImage(
    { apiKey, baseURL },
    { prompt, image: referenceImage, model },
  )

  const firstImage = result.images[0]
  if (!firstImage) {
    throw new Error('模型未返回图片')
  }

  let imageUrl = firstImage.url || ''
  if (!imageUrl && firstImage.b64Json) {
    imageUrl = `data:image/png;base64,${firstImage.b64Json}`
  }
  if (!imageUrl) {
    throw new Error('模型返回结果不可用')
  }

  // 桌面端落盘
  if (isTauriRuntime() && projectPath) {
    const base64Payload = toBase64Payload(imageUrl, firstImage.b64Json)
    const ext = inferImageExtension(imageUrl, firstImage.b64Json)
    const safePrefix = sanitizeFilenamePart(filenamePrefix || prompt)
    const filename = `ai_${safePrefix}_${Date.now()}.${ext}`
    const { invoke } = await import('@tauri-apps/api/core')
    const savedFilename = await invoke<string>('save_base64_asset', {
      projectPath,
      base64Data: base64Payload,
      filename,
    })
    return { url: savedFilename }
  }

  // 浏览器端：保留 data URI / 公网 URL
  return { url: imageUrl }
}

export function resolveSeedreamApiKey(
  getToken: (provider: ProjectAiTokenProvider) => string,
  currentTextProvider?: string,
): string {
  const providers: ProjectAiTokenProvider[] = []
  providers.push('seedream')
  if (currentTextProvider && currentTextProvider !== 'ollama') {
    providers.push(currentTextProvider)
  }
  providers.push('custom', 'zhipu', 'deepseek', 'kimi')

  const tried = new Set<ProjectAiTokenProvider>()
  for (const provider of providers) {
    if (tried.has(provider)) continue
    tried.add(provider)
    const token = getToken(provider).trim()
    if (token) return token
  }
  return ''
}

export function sanitizeFilenamePart(value: string): string {
  const sanitized = String(value || '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
  return sanitized || 'ai_image'
}

export function inferImageExtension(imageUrl: string, fallbackBase64?: string): 'png' | 'jpg' {
  const normalized = imageUrl.trim().toLowerCase()
  if (normalized.startsWith('data:image/jpeg') || normalized.startsWith('data:image/jpg')) {
    return 'jpg'
  }
  if (normalized.startsWith('data:image/png')) {
    return 'png'
  }
  if (fallbackBase64 && fallbackBase64.startsWith('/9j/')) {
    return 'jpg'
  }
  return 'png'
}

export function toBase64Payload(imageUrl: string, b64Json?: string): string {
  if (b64Json && b64Json.trim()) {
    return b64Json.trim()
  }
  const normalized = imageUrl.trim()
  const marker = 'base64,'
  const markerIndex = normalized.indexOf(marker)
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex + marker.length).trim()
  }
  return normalized
}

export function imageCategoryLabel(cat: ImageCategory): string {
  const labels: Record<ImageCategory, string> = {
    character: '角色',
    ui: 'UI',
    icon: '图标',
    scene: '场景',
    storyboard: '分镜',
  }
  return labels[cat] || cat
}

import { isTauri } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { sanitizeBaseURL } from '~/utils/url'

export type SupportedVideoProvider = 'seedance'

export interface SeedanceClientOptions {
  provider?: SupportedVideoProvider
  apiKey: string
  baseURL?: string
  headers?: Record<string, string>
}

export interface SeedanceGenerateVideoOptions {
  prompt: string
  model?: string
  firstFrameImageUrl?: string
  lastFrameImageUrl?: string
  ratio?: string
  duration?: number
  watermark?: boolean
  generateAudio?: boolean
  resolution?: string
  pollIntervalMs?: number
  timeoutMs?: number
}

export interface SeedanceGenerateVideoResult {
  kind: 'video'
  provider: SupportedVideoProvider
  model: string
  taskId: string
  status: 'succeeded'
  videoUrl: string
  raw: unknown
}

const SEEDANCE_PROVIDER: SupportedVideoProvider = 'seedance'
const DEFAULT_SEEDANCE_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_SEEDANCE_MODEL = 'doubao-seedance-1-5-pro-251215'

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function normalizeApiBaseURL(baseURL?: string): string {
  // 非法/空 baseURL（相对路径、缺协议等）回落默认值，避免拼出错误的请求地址
  const target = sanitizeBaseURL(baseURL, DEFAULT_SEEDANCE_BASE_URL)
  return target.replace(/\/+$/, '')
}

function normalizeSeedanceErrorMessage(error: unknown): string {
  const root = readObject(error)
  const message = root?.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }
  return '视频生成失败，请稍后重试'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options: SeedanceClientOptions,
): Promise<T> {
  const fetchClient = typeof window !== 'undefined' && isTauri()
    ? (tauriFetch as typeof fetch)
    : globalThis.fetch.bind(globalThis)

  const response = await fetchClient(`${normalizeApiBaseURL(options.baseURL)}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      ...(options.headers || {}),
      ...(init.headers || {}),
    },
  })

  const responseText = await response.text()
  const payload = responseText ? JSON.parse(responseText) as Record<string, unknown> : {}

  if (!response.ok) {
    const errorPayload = readObject(payload.error)
    const errorMessage = typeof errorPayload?.message === 'string'
      ? errorPayload.message
      : `请求失败（${response.status}）`
    throw new Error(errorMessage)
  }

  return payload as T
}

function getTaskStatus(payload: unknown): string {
  const root = readObject(payload)
  const status = root?.status
  return typeof status === 'string' ? status : ''
}

function getTaskVideoUrl(payload: unknown): string {
  const root = readObject(payload)
  const content = readObject(root?.content)
  const videoUrl = content?.video_url
  return typeof videoUrl === 'string' ? videoUrl : ''
}

export async function generateSeedanceVideo(
  clientOptions: SeedanceClientOptions,
  options: SeedanceGenerateVideoOptions,
): Promise<SeedanceGenerateVideoResult> {
  if (!clientOptions.apiKey.trim()) {
    throw new Error('请先配置 Seedance API Token')
  }

  const prompt = options.prompt.trim()
  if (!prompt) {
    throw new Error('生视频提示词不能为空')
  }

  const model = options.model?.trim() || DEFAULT_SEEDANCE_MODEL
  const pollIntervalMs = Math.max(1000, options.pollIntervalMs ?? 5000)
  const timeoutMs = Math.max(10000, options.timeoutMs ?? 600000)

  try {
    const createBody: Record<string, unknown> = {
      model,
      content: [
        {
          type: 'text',
          text: prompt,
        },
      ],
      watermark: options.watermark ?? false,
      ratio: options.ratio || 'adaptive',
    }

    if (typeof options.duration === 'number' && Number.isFinite(options.duration) && options.duration > 0) {
      createBody.duration = Math.floor(options.duration)
    }

    if (typeof options.generateAudio === 'boolean') {
      createBody.generate_audio = options.generateAudio
    }

    if (options.resolution) {
      createBody.resolution = options.resolution
    }

    if (options.firstFrameImageUrl?.trim()) {
      const content = createBody.content as Array<Record<string, unknown>>
      content.push({
        type: 'image_url',
        image_url: {
          url: options.firstFrameImageUrl.trim(),
        },
        role: 'first_frame',
      })
    }

    if (options.lastFrameImageUrl?.trim()) {
      const content = createBody.content as Array<Record<string, unknown>>
      content.push({
        type: 'image_url',
        image_url: {
          url: options.lastFrameImageUrl.trim(),
        },
        role: 'last_frame',
      })
    }

    const createResp = await requestJson<{ id?: unknown }>(
      '/contents/generations/tasks',
      {
        method: 'POST',
        body: JSON.stringify(createBody),
      },
      clientOptions,
    )

    const taskId = typeof createResp.id === 'string' ? createResp.id : ''
    if (!taskId) {
      throw new Error('视频任务创建失败，未返回任务 ID')
    }

    const start = Date.now()
    while (Date.now() - start <= timeoutMs) {
      const taskResp = await requestJson<Record<string, unknown>>(
        `/contents/generations/tasks/${taskId}`,
        { method: 'GET' },
        clientOptions,
      )

      const status = getTaskStatus(taskResp)
      if (status === 'succeeded') {
        const videoUrl = getTaskVideoUrl(taskResp)
        if (!videoUrl) {
          throw new Error('视频生成成功但未返回下载地址')
        }

        return {
          kind: 'video',
          provider: SEEDANCE_PROVIDER,
          model,
          taskId,
          status: 'succeeded',
          videoUrl,
          raw: taskResp,
        }
      }

      if (status === 'failed' || status === 'expired') {
        const errorPayload = readObject(taskResp.error)
        const message = typeof errorPayload?.message === 'string'
          ? errorPayload.message
          : `视频生成任务失败（${status}）`
        throw new Error(message)
      }

      await sleep(pollIntervalMs)
    }

    throw new Error('视频生成超时，请稍后到方舟控制台查看任务状态')
  } catch (error) {
    throw new Error(normalizeSeedanceErrorMessage(error))
  }
}

export const DEFAULT_SEEDANCE_VIDEO_MODEL = DEFAULT_SEEDANCE_MODEL
export const DEFAULT_SEEDANCE_VIDEO_BASE_URL = DEFAULT_SEEDANCE_BASE_URL

import OpenAI from 'openai'
import { isTauri } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import { sanitizeBaseURL } from '~/utils/url'

export type SupportedImageProvider = 'seedream'

export interface SeedreamClientOptions {
  provider?: SupportedImageProvider
  apiKey: string
  baseURL?: string
  organization?: string
  project?: string
  headers?: Record<string, string>
}

export type SeedreamResponseFormat = 'url' | 'b64_json'
export type SeedreamOutputFormat = 'png' | 'jpeg'
export type SeedreamSequentialMode = 'auto' | 'disabled'

export interface SeedreamGenerateImageOptions {
  prompt: string
  model?: string
  image?: string | string[]
  size?: string
  outputFormat?: SeedreamOutputFormat
  responseFormat?: SeedreamResponseFormat
  watermark?: boolean
  stream?: boolean
  sequentialImageGeneration?: SeedreamSequentialMode
  maxImages?: number
  enableWebSearch?: boolean
}

export interface SeedreamGeneratedImage {
  url?: string
  b64Json?: string
  size?: string
}

export interface SeedreamGenerateImageResult {
  kind: 'image'
  provider: SupportedImageProvider
  model: string
  images: SeedreamGeneratedImage[]
  raw: unknown
}

const SEEDREAM_PROVIDER: SupportedImageProvider = 'seedream'
const DEFAULT_SEEDREAM_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const DEFAULT_SEEDREAM_MODEL = 'doubao-seedream-5-0-260128'

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function getErrorPayload(error: unknown): { code?: string; message?: string } | null {
  const root = readObject(error)
  const directError = readObject(root?.error)
  const response = readObject(root?.response)
  const responseData = readObject(response?.data)
  const responseError = readObject(responseData?.error)

  const candidate = directError || responseError
  if (candidate) {
    const codeValue = candidate.code
    const messageValue = candidate.message
    return {
      code: typeof codeValue === 'string' || typeof codeValue === 'number' ? String(codeValue) : undefined,
      message: typeof messageValue === 'string' ? messageValue : undefined,
    }
  }

  const message = root?.message
  if (typeof message === 'string') {
    const trimmed = message.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        const parsedObject = readObject(parsed)
        const parsedError = readObject(parsedObject?.error)
        if (parsedError) {
          const codeValue = parsedError.code
          const messageValue = parsedError.message
          return {
            code: typeof codeValue === 'string' || typeof codeValue === 'number' ? String(codeValue) : undefined,
            message: typeof messageValue === 'string' ? messageValue : undefined,
          }
        }
      } catch {
      }
    }
  }

  return null
}

function normalizeSeedreamErrorMessage(error: unknown): string {
  const payload = getErrorPayload(error)

  if (payload?.message) {
    return payload.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '图片生成失败，请稍后重试'
}

function createSeedreamClient(options: SeedreamClientOptions): OpenAI {
  const useTauriHttp = typeof window !== 'undefined' && isTauri()

  return new OpenAI({
    apiKey: options.apiKey,
    baseURL: sanitizeBaseURL(options.baseURL, DEFAULT_SEEDREAM_BASE_URL),
    organization: options.organization,
    project: options.project,
    defaultHeaders: options.headers,
    fetch: useTauriHttp ? (tauriFetch as typeof fetch) : globalThis.fetch.bind(globalThis),
    dangerouslyAllowBrowser: true,
  })
}

function toGeneratedImages(data: unknown): SeedreamGeneratedImage[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item) => {
    const value = readObject(item)
    const url = value?.url
    const b64Json = value?.b64_json
    const size = value?.size
    return {
      url: typeof url === 'string' ? url : undefined,
      b64Json: typeof b64Json === 'string' ? b64Json : undefined,
      size: typeof size === 'string' ? size : undefined,
    }
  })
}

export async function generateSeedreamImage(
  clientOptions: SeedreamClientOptions,
  options: SeedreamGenerateImageOptions,
): Promise<SeedreamGenerateImageResult> {
  if (!clientOptions.apiKey.trim()) {
    throw new Error('请先配置 Seedream API Key')
  }

  if (!options.prompt.trim()) {
    throw new Error('生图提示词不能为空')
  }

  try {
    const client = createSeedreamClient(clientOptions)
    const model = options.model || DEFAULT_SEEDREAM_MODEL

    const extraBody: Record<string, unknown> = {
      watermark: options.watermark ?? false,
    }

    if (options.image) {
      extraBody.image = options.image
    }

    if (options.sequentialImageGeneration) {
      extraBody.sequential_image_generation = options.sequentialImageGeneration
    }

    if (typeof options.maxImages === 'number' && options.maxImages > 0) {
      extraBody.sequential_image_generation_options = {
        max_images: options.maxImages,
      }
    }

    if (options.enableWebSearch) {
      extraBody.tools = [{ type: 'web_search' }]
    }

    const request = {
      model,
      prompt: options.prompt,
      size: options.size || '2K',
      output_format: options.outputFormat || 'png',
      response_format: options.responseFormat || 'b64_json',
      stream: options.stream ?? false,
      extra_body: extraBody,
    }

    const response = await client.images.generate(request as any)

    return {
      kind: 'image',
      provider: SEEDREAM_PROVIDER,
      model,
      images: toGeneratedImages((response as { data?: unknown }).data),
      raw: response,
    }
  } catch (error) {
    throw new Error(normalizeSeedreamErrorMessage(error))
  }
}

export const DEFAULT_SEEDREAM_IMAGE_MODEL = DEFAULT_SEEDREAM_MODEL
export const DEFAULT_SEEDREAM_IMAGE_BASE_URL = DEFAULT_SEEDREAM_BASE_URL

import OpenAI from 'openai'
import { isTauri } from '@tauri-apps/api/core'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import type { ProjectLlmConfig } from '~/types'
import { isValidHttpBaseURL } from '~/utils/url'

export type SupportedLlmProvider = 'zhipu' | 'deepseek' | 'kimi' | 'custom'

type LlmMessageRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
  role: LlmMessageRole
  content: string
}

export interface AiClientOptions {
  provider: SupportedLlmProvider
  apiKey?: string
  baseURL?: string
  organization?: string
  project?: string
  headers?: Record<string, string>
}

export interface LlmCallOptions {
  kind: 'llm'
  prompt?: string
  messages?: LlmMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
}
export type AiCallOptions = LlmCallOptions

export interface LlmCallResult {
  kind: 'llm'
  provider: SupportedLlmProvider
  model: string
  text: string
  raw: unknown
}
export type AiCallResult = LlmCallResult

export interface LlmStreamCallbacks {
  onChunk?: (chunkText: string, fullText: string) => void
}

type ChatThinkingParam = {
  thinking?: {
    type: 'disabled' | 'enabled' | (string & {})
  }
}

type ChatCompletionCreateParamsStreamingWithThinking = OpenAI.ChatCompletionCreateParamsStreaming & ChatThinkingParam

export type ResolvedProjectLlmRuntime =
  | {
    ok: true
    clientOptions: AiClientOptions
    model?: string
  }
  | {
    ok: false
    error: string
  }

const DEFAULT_BASE_URL_BY_PROVIDER: Record<SupportedLlmProvider, string | undefined> = {
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  deepseek: 'https://api.deepseek.com/v1',
  kimi: 'https://api.moonshot.cn/v1',
  custom: undefined,
}

const DEFAULT_LLM_MODEL_BY_PROVIDER: Record<SupportedLlmProvider, string> = {
  zhipu: 'glm-5',
  deepseek: 'deepseek-v4-pro',
  kimi: 'kimi-k2.5',
  custom: 'gpt-4.1-mini',
}

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

export function normalizeAiErrorMessage(error: unknown): string {
  const payload = getErrorPayload(error)

  if (payload?.code === '1305') {
    return '模型当前访问量过大，请稍后再试'
  }

  if (payload?.message) {
    return payload.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'AI 服务调用失败，请稍后重试'
}

export function resolveProjectLlmRuntime(config: ProjectLlmConfig | undefined, apiKey: string): ResolvedProjectLlmRuntime {
  if (!config) {
    return {
      ok: false,
      error: '未找到项目 AI 配置，请先在项目配置中设置',
    }
  }

  if (!apiKey.trim()) {
    return {
      ok: false,
      error: '请先在项目配置中填写 API Token',
    }
  }

  if (config.provider === 'custom' && !config.baseURL.trim()) {
    return {
      ok: false,
      error: '请先在项目配置中填写自定义 Base URL',
    }
  }

  if (config.provider === 'custom' && !isValidHttpBaseURL(config.baseURL)) {
    return {
      ok: false,
      error: '自定义 Base URL 格式不正确，需以 http:// 或 https:// 开头',
    }
  }

  return {
    ok: true,
    clientOptions: {
      provider: config.provider,
      apiKey: apiKey || undefined,
      baseURL: config.baseURL || undefined,
    },
    model: config.model || undefined,
  }
}

function createOpenAiClient(options: AiClientOptions): OpenAI {
  const baseURL = options.baseURL ?? DEFAULT_BASE_URL_BY_PROVIDER[options.provider]
  const apiKey = options.apiKey ?? undefined
  const useTauriHttp = typeof window !== 'undefined' && isTauri()

  // 兜底：baseURL 非空但非法（相对路径/缺协议等）时，OpenAI SDK 内部 buildURL 会抛
  // 晦涩的 "Failed to construct 'URL': Invalid URL"。这里先校验，给出可读的中文提示。
  // 空字符串是允许的（SDK 会兜底为官方默认 URL）。
  if (baseURL && !isValidHttpBaseURL(baseURL)) {
    throw new Error('AI 服务地址（Base URL）配置无效，请检查项目配置')
  }

  return new OpenAI({
    apiKey,
    baseURL,
    organization: options.organization,
    project: options.project,
    defaultHeaders: options.headers,
    fetch: useTauriHttp ? (tauriFetch as typeof fetch) : globalThis.fetch.bind(globalThis),
    dangerouslyAllowBrowser: true,
  })
}

function normalizeLlmMessages(options: LlmCallOptions): LlmMessage[] {
  if (options.messages && options.messages.length > 0) {
    return options.messages
  }
  if (options.prompt && options.prompt.trim().length > 0) {
    return [{ role: 'user', content: options.prompt }]
  }
  throw new Error('LLM 调用必须提供 prompt 或 messages')
}

function extractTextFromCompletion(message: unknown): string {
  if (!message || typeof message !== 'object') return ''

  const contentValue = (message as { content?: unknown }).content
  if (typeof contentValue === 'string') return contentValue

  if (Array.isArray(contentValue)) {
    return contentValue
      .map((item) => {
        if (!item || typeof item !== 'object') return ''
        const text = (item as { text?: unknown }).text
        return typeof text === 'string' ? text : ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

export async function callAiModel(clientOptions: AiClientOptions, callOptions: AiCallOptions): Promise<AiCallResult> {
  try {
    const client = createOpenAiClient(clientOptions)
    const model = callOptions.model ?? DEFAULT_LLM_MODEL_BY_PROVIDER[clientOptions.provider]
    const messages = normalizeLlmMessages(callOptions)

    const completion = await client.chat.completions.create({
      model,
      messages,
    })

    const text = extractTextFromCompletion(completion.choices?.[0]?.message)

    return {
      kind: 'llm',
      provider: clientOptions.provider,
      model,
      text,
      raw: completion,
    }
  } catch (error) {
    throw new Error(normalizeAiErrorMessage(error))
  }
}

export async function streamLlmModel(
  clientOptions: AiClientOptions,
  callOptions: LlmCallOptions,
  callbacks?: LlmStreamCallbacks,
): Promise<LlmCallResult> {
  try {
    const client = createOpenAiClient(clientOptions)
    const model = callOptions.model ?? DEFAULT_LLM_MODEL_BY_PROVIDER[clientOptions.provider]
    const messages = normalizeLlmMessages(callOptions)

    const streamRequest: ChatCompletionCreateParamsStreamingWithThinking = {
      model,
      messages,
      stream: true,
      thinking: { type: 'disabled' },
    }

    const stream = await client.chat.completions.create(streamRequest)

    let fullText = ''
    const chunks: unknown[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
      const delta = chunk.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta.length > 0) {
        fullText += delta
        callbacks?.onChunk?.(delta, fullText)
      }
    }

    return {
      kind: 'llm',
      provider: clientOptions.provider,
      model,
      text: fullText,
      raw: chunks,
    }
  } catch (error) {
    throw new Error(normalizeAiErrorMessage(error))
  }
}
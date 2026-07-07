// Base URL 相关的共享校验工具。
//
// 背景：OpenAI SDK 内部 buildURL 会在首次请求时执行 new URL(baseURL + path)，
// 当 baseURL 为非空但不含 http(s):// 协议的相对/非法值（如 "/v1"、"my-host/api"）时，
// 会抛出 "Failed to construct 'URL': Invalid URL"。本工具用于在调用 SDK 前拦截这类非法值。

const HTTP_URL_PATTERN = /^https?:\/\//i

/**
 * 判断给定字符串是否为一个合法的 http(s) Base URL。
 * 通过三条标准：非空字符串 + 以 http:// 或 https:// 开头 + 能被 new URL() 成功解析。
 */
export function isValidHttpBaseURL(url: string | undefined | null): boolean {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  if (!HTTP_URL_PATTERN.test(trimmed)) return false
  try {
    // eslint-disable-next-line no-new
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * 归一化 Base URL：合法时返回 trim 后的值，否则返回 fallback。
 * 用于加载旧项目数据时清洗可能残留的非法/空 baseURL，避免传入 SDK 后崩溃。
 */
export function sanitizeBaseURL(url: string | undefined | null, fallback = ''): string {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  return isValidHttpBaseURL(trimmed) ? trimmed : fallback
}

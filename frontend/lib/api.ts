// Usa a URL da API configurada ou detecta automaticamente na Vercel
const getApiBaseUrl = () => {
  // Se estiver configurado explicitamente, usa isso
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Se estiver no navegador, usa a mesma origem (Vercel)
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Fallback para desenvolvimento local
  return 'http://localhost:8000'
}

const API_BASE_URL = getApiBaseUrl()

export interface ChannelConfig {
  channel_id: string
  name: string
}

export interface PostConfig {
  template_text: string
  button_label?: string
  button_url?: string
  delay_min: number
  delay_max: number
}

export interface Config {
  stock_channel?: ChannelConfig
  destination_channels: ChannelConfig[]
  post_config: PostConfig
  status: string
}

export interface LogEntry {
  timestamp: string
  message: string
  level: string
}

export interface Progress {
  current: number
  total: number
  remaining_time: number
  status: string
}

export interface ChannelStats {
  channel_id: string
  name: string
  total_posts: number
  total_failures: number
  last_post_date: string | null
  last_failure_date: string | null
  is_active: boolean
  status: string
}

export interface ChannelStatsSummary {
  total_channels: number
  active_channels: number
  inactive_channels: number
  channels_with_errors: number
  total_posts: number
  total_failures: number
  success_rate: number
}

export async function getConfig(): Promise<Config> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error('Failed to fetch config')
    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout ao carregar configuração')
    }
    throw error
  }
}

export async function saveConfig(config: Config): Promise<Config> {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) throw new Error('Failed to save config')
  return response.json()
}

export async function setStockChannel(channel: ChannelConfig): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/config/stock-channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channel),
  })
  if (!response.ok) throw new Error('Failed to set stock channel')
}

export async function setDestinationChannels(channels: ChannelConfig[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/config/destination-channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channels),
  })
  if (!response.ok) throw new Error('Failed to set destination channels')
}

export async function setPostConfig(postConfig: PostConfig): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/config/post-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postConfig),
  })
  if (!response.ok) throw new Error('Failed to set post config')
}

export async function startPosting(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/control/start`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to start posting')
}

export async function stopPosting(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/control/stop`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to stop posting')
}

export async function getStatus(): Promise<Progress> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/control/status`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error('Failed to get status')
    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout ao obter status')
    }
    throw error
  }
}

export function createLogStream(callback: (log: LogEntry | Progress) => void): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/logs/stream`)
  
  eventSource.onmessage = (event) => {
    try {
      if (!event.data || event.data.trim() === '') {
        return
      }
      
      const data = JSON.parse(event.data)
      
      // Verifica se é um erro
      if (data.error) {
        console.error('Erro no stream:', data.error)
        return
      }
      
      // Verifica se é progresso
      if (data.type === 'progress') {
        const progressData: Progress = {
          current: data.current || 0,
          total: data.total || 0,
          remaining_time: data.remaining_time || 0,
          status: data.status || 'idle'
        }
        callback(progressData)
      } else if (data.timestamp) {
        // É um log
        callback(data as LogEntry)
      } else if (data.current !== undefined || data.status) {
        // É progresso sem type
        callback(data as Progress)
      }
    } catch (error) {
      console.error('Error parsing log stream:', error, 'Data:', event.data)
    }
  }
  
  eventSource.onerror = (error) => {
    console.error('Log stream connection error:', error)
    // Não fecha automaticamente, deixa o componente gerenciar
  }
  
  eventSource.onopen = () => {
    console.log('Log stream conectado')
  }
  
  return eventSource
}

export async function getChannelStats(): Promise<ChannelStats[]> {
  const response = await fetch(`${API_BASE_URL}/api/config/channel-stats`)
  if (!response.ok) throw new Error('Failed to get channel stats')
  return response.json()
}

export async function getChannelStatsSummary(): Promise<ChannelStatsSummary> {
  const response = await fetch(`${API_BASE_URL}/api/config/channel-stats/summary`)
  if (!response.ok) throw new Error('Failed to get channel stats summary')
  return response.json()
}

export async function getLogHistory(): Promise<LogEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/logs/history`)
  if (!response.ok) throw new Error('Failed to get log history')
  return response.json()
}

export async function postNow(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/control/post-now`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to post now')
}

export async function clearQueue(): Promise<{ message: string; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/control/clear-queue`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Failed to clear queue')
  return response.json()
}

export async function exportConfig(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/config/export`)
  if (!response.ok) throw new Error('Failed to export config')
  return response.blob()
}

export async function importConfig(file: File): Promise<{ message: string; config: Config; export_date?: string; version?: string }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(`${API_BASE_URL}/api/config/import`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to import config')
  }
  
  return response.json()
}


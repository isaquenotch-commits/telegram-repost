'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, PlayCircle, PauseCircle, Clock, TrendingUp, FileText, Timer, Power, AlertCircle, X, Download, Upload, Database } from 'lucide-react'
import PostTemplate from '@/components/PostTemplate'
import DelaySlider from '@/components/DelaySlider'
import PostControl from '@/components/PostControl'
import LogViewer from '@/components/LogViewer'
import ProgressBar from '@/components/ProgressBar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getConfig,
  saveConfig,
  setPostConfig,
  startPosting,
  stopPosting,
  getStatus,
  createLogStream,
  getLogHistory,
  postNow,
  clearQueue,
  exportConfig,
  importConfig,
  Config,
  LogEntry,
  Progress,
} from '@/lib/api'

export default function DashboardPage() {
  const [config, setConfig] = useState<Config>({
    stock_channel: undefined,
    destination_channels: [],
    post_config: {
      template_text: '',
      button_label: '',
      button_url: '',
      delay_min: 3600,
      delay_max: 3600,
    },
    status: 'idle',
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState<Progress>({
    current: 0,
    total: 0,
    remaining_time: 0,
    status: 'idle',
  })
  const [loading, setLoading] = useState(true)
  const [totalPostsEver, setTotalPostsEver] = useState(0)
  const [totalFailuresEver, setTotalFailuresEver] = useState(0)

  const loadConfig = useCallback(async () => {
    try {
      const loadedConfig = await getConfig()
      setConfig(loadedConfig)
      
      // Carrega status e estatísticas persistentes
      try {
        const status = await getStatus()
        setProgress(status)
        // Atualiza totais acumulados se disponíveis
        if ('total_posts_ever' in status) {
          setTotalPostsEver(status.total_posts_ever || 0)
        }
        if ('total_failures_ever' in status) {
          setTotalFailuresEver(status.total_failures_ever || 0)
        }
      } catch (statusError) {
        console.error('Erro ao carregar status:', statusError)
      }
      
      // Carrega histórico de logs do backend
      try {
        const history = await getLogHistory()
        if (history && history.length > 0) {
          const recentLogs = history.slice(-100) // Mantém últimos 100 do histórico
          setLogs(recentLogs)
          // Salva no localStorage também
          try {
            localStorage.setItem('telegram_repost_logs', JSON.stringify(recentLogs))
          } catch (e) {
            // Ignora erro de localStorage
          }
        } else {
          // Se não há histórico no backend, tenta localStorage
          try {
            const savedLogs = localStorage.getItem('telegram_repost_logs')
            if (savedLogs) {
              const parsed = JSON.parse(savedLogs)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setLogs(parsed)
              }
            }
          } catch (e) {
            console.error('Erro ao carregar logs do localStorage:', e)
          }
        }
      } catch (logError) {
        console.error('Erro ao carregar histórico de logs:', logError)
        // Tenta carregar do localStorage como fallback
        try {
          const savedLogs = localStorage.getItem('telegram_repost_logs')
          if (savedLogs) {
            const parsed = JSON.parse(savedLogs)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setLogs(parsed)
            }
          }
        } catch (e) {
          console.error('Erro ao carregar logs do localStorage:', e)
        }
      }
      
      // Carrega progresso do localStorage como fallback
      try {
        const savedProgress = localStorage.getItem('telegram_repost_progress')
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress)
          setProgress(prev => ({ ...prev, ...parsed }))
        }
      } catch (e) {
        console.error('Erro ao carregar progresso do localStorage:', e)
      }
      
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
      setConfig({
        stock_channel: undefined,
        destination_channels: [],
        post_config: {
          template_text: '',
          button_label: '',
          button_url: '',
          delay_min: 3600,
          delay_max: 3600,
        },
        status: 'idle',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    loadConfig()
    
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 10000)
    
    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [loadConfig])

  // Salva logs no localStorage quando mudam
  useEffect(() => {
    if (logs.length > 0) {
      try {
        localStorage.setItem('telegram_repost_logs', JSON.stringify(logs.slice(-100)))
      } catch (e) {
        console.error('Erro ao salvar logs no localStorage:', e)
      }
    }
  }, [logs])

  // Salva progresso no localStorage quando muda
  useEffect(() => {
    try {
      localStorage.setItem('telegram_repost_progress', JSON.stringify(progress))
    } catch (e) {
      console.error('Erro ao salvar progresso no localStorage:', e)
    }
  }, [progress])

  // Função para conectar ao stream de logs
  const connectLogStream = useCallback(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    
    const connect = () => {
      try {
        if (eventSource) {
          eventSource.close()
        }
        
        eventSource = createLogStream((data) => {
          try {
            if ('timestamp' in data) {
              setLogs((prev) => {
                const newLogs = [...prev, data as LogEntry].slice(-100)
                return newLogs
              })
            } else if ('type' in data && data.type === 'progress') {
              const progressData = data as Progress
              setProgress(progressData)
              setConfig((prev) => ({ ...prev, status: progressData.status }))
              // Atualiza totais acumulados
              if ('total_posts_ever' in progressData) {
                setTotalPostsEver(progressData.total_posts_ever || 0)
              }
              if ('total_failures_ever' in progressData) {
                setTotalFailuresEver(progressData.total_failures_ever || 0)
              }
            } else if ('current' in data || 'status' in data) {
              // É um objeto de progresso
              setProgress(data as Progress)
              setConfig((prev) => ({ ...prev, status: (data as Progress).status }))
              // Atualiza totais acumulados
              if ('total_posts_ever' in data) {
                setTotalPostsEver((data as any).total_posts_ever || 0)
              }
              if ('total_failures_ever' in data) {
                setTotalFailuresEver((data as any).total_failures_ever || 0)
              }
            }
          } catch (error) {
            console.error('Erro ao processar dados do stream:', error)
          }
        })

        eventSource.onopen = () => {
          console.log('Stream de logs conectado')
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
            reconnectTimeout = null
          }
        }

        eventSource.onerror = (error) => {
          console.error('Erro na conexão de logs:', error)
          // Reconecta após 3 segundos
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }
          reconnectTimeout = setTimeout(() => {
            if (eventSource) {
              eventSource.close()
            }
            connect() // Reconecta
          }, 3000)
        }
      } catch (error) {
        console.error('Erro ao criar stream de logs:', error)
        // Tenta reconectar após 5 segundos
        reconnectTimeout = setTimeout(() => {
          connect()
        }, 5000)
      }
    }
    
    connect()
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  const updateStatus = useCallback(async () => {
    try {
      const status = await getStatus()
      setProgress(status)
      setConfig((prev) => ({ ...prev, status: status.status as any }))
      // Atualiza totais acumulados
      if ('total_posts_ever' in status) {
        setTotalPostsEver(status.total_posts_ever || 0)
      }
      if ('total_failures_ever' in status) {
        setTotalFailuresEver(status.total_failures_ever || 0)
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }, [])

  useEffect(() => {
    return connectLogStream()
  }, [connectLogStream])

  useEffect(() => {
    if (progress.status !== 'running' || loading) {
      return
    }
    
    const interval = setInterval(() => {
      if (progress.status === 'running' && !loading) {
        updateStatus()
      }
    }, 2000) // Atualiza a cada 2 segundos

    return () => clearInterval(interval)
  }, [progress.status, loading, updateStatus])

  // Atualiza status periodicamente mesmo quando não está rodando (para manter dados atualizados)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        updateStatus()
      }
    }, 5000) // Atualiza a cada 5 segundos

    return () => clearInterval(interval)
  }, [loading, updateStatus])

  const handlePostConfigChange = async (postConfig: Config['post_config']) => {
    try {
      await setPostConfig(postConfig)
      setConfig((prev) => ({ ...prev, post_config: postConfig }))
    } catch (error) {
      console.error('Erro ao salvar configuração de postagem:', error)
    }
  }

  const handleStart = async () => {
    try {
      await saveConfig(config)
      await startPosting()
      setConfig((prev) => ({ ...prev, status: 'running' }))
      setProgress((prev) => ({ ...prev, status: 'running' }))
    } catch (error) {
      console.error('Erro ao iniciar postagem:', error)
      alert('Erro ao iniciar postagem. Verifique a configuração.')
    }
  }

  const handleStop = async () => {
    try {
      await stopPosting()
      setConfig((prev) => ({ ...prev, status: 'stopped' }))
      setProgress((prev) => ({ ...prev, status: 'stopped' }))
    } catch (error) {
      console.error('Erro ao parar postagem:', error)
    }
  }

  const handlePostNow = async () => {
    try {
      await postNow()
    } catch (error) {
      console.error('Erro ao forçar postagem:', error)
      alert('Erro ao forçar postagem. Certifique-se de que o sistema está em execução.')
    }
  }

  const handleClearQueue = async () => {
    if (!confirm('Tem certeza que deseja limpar todas as mensagens da fila?')) {
      return
    }
    try {
      const result = await clearQueue()
      alert(result.message)
    } catch (error) {
      console.error('Erro ao limpar fila:', error)
      alert('Erro ao limpar fila.')
    }
  }

  const handleExportBackup = async () => {
    try {
      const blob = await exportConfig()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `telegram-repost-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      alert('Backup exportado com sucesso!')
    } catch (error) {
      console.error('Erro ao exportar backup:', error)
      alert('Erro ao exportar backup. Verifique o console para mais detalhes.')
    }
  }

  const handleImportBackup = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (!confirm('Tem certeza que deseja importar este backup? Isso substituirá sua configuração atual.')) {
        return
      }

      try {
        const result = await importConfig(file)
        // Recarrega a configuração
        await loadConfig()
        alert(`Backup importado com sucesso!${result.export_date ? `\nData do backup: ${new Date(result.export_date).toLocaleString()}` : ''}`)
      } catch (error: any) {
        console.error('Erro ao importar backup:', error)
        alert(`Erro ao importar backup: ${error.message || 'Arquivo inválido ou corrompido'}`)
      }
    }
    input.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div className="text-muted-foreground font-medium">Carregando dashboard...</div>
          </div>
        </Card>
      </div>
    )
  }

  const statusConfig = {
    idle: { icon: PauseCircle, label: 'Parado', variant: 'secondary' as const, color: 'text-muted-foreground' },
    running: { icon: PlayCircle, label: 'Em Execução', variant: 'default' as const, color: 'text-green-500' },
    stopped: { icon: PauseCircle, label: 'Pausado', variant: 'outline' as const, color: 'text-yellow-500' },
    completed: { icon: Activity, label: 'Concluído', variant: 'default' as const, color: 'text-blue-500' },
  }

  const currentStatus = statusConfig[config.status as keyof typeof statusConfig] || statusConfig.idle
  const StatusIcon = currentStatus.icon

  const canStart = config.stock_channel && config.destination_channels.length > 0

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header com Status - DESTACADO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-3xl bg-primary/10 shadow-xl border-2 border-primary/20">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Visão geral e controle do sistema de repostagem
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2.5 border-2 rounded-3xl bg-primary/5 shadow-xl border-primary/20">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("h-5 w-5", currentStatus.color)} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("text-sm font-bold", currentStatus.color)}>
                  {currentStatus.label}
                </p>
              </div>
            </div>
          </Card>
          {config.stock_channel && (
            <Badge variant="outline" className="gap-2 px-3 py-1.5 rounded-3xl bg-primary/5 border-primary/20 shadow-lg">
              <Activity className="h-3.5 w-3.5" />
              {config.destination_channels.length} {config.destination_channels.length === 1 ? 'canal' : 'canais'}
            </Badge>
          )}
        </div>
      </div>

      {/* KPIs e Progresso */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressBar progress={progress} />
        </div>
        <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
                <span className="text-sm text-muted-foreground">Mensagens processadas (sessão)</span>
                <span className="text-lg font-bold text-primary">{progress.current}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
                <span className="text-sm text-muted-foreground">Total de mensagens (sessão)</span>
                <span className="text-lg font-bold text-primary">{progress.total}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-green-500/10 border border-green-500/20 shadow-md">
                <span className="text-sm text-muted-foreground">Total de postagens (acumulado)</span>
                <span className="text-lg font-bold text-green-500">{totalPostsEver}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-md">
                <span className="text-sm text-muted-foreground">Total de falhas (acumulado)</span>
                <span className="text-lg font-bold text-red-500">{totalFailuresEver}</span>
              </div>
              {progress.status === 'running' && progress.remaining_time > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-primary/20">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Tempo restante
                  </span>
                  <span className="text-lg font-bold font-mono text-primary">
                    {Math.floor(progress.remaining_time / 3600)}:
                    {Math.floor((progress.remaining_time % 3600) / 60).toString().padStart(2, '0')}:
                    {(progress.remaining_time % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template e Delay */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-1">
          <PostTemplate
            config={config.post_config}
            onChange={handlePostConfigChange}
          />
        </div>
        <div className="lg:col-span-1">
          <DelaySlider
            config={config.post_config}
            onChange={handlePostConfigChange}
          />
        </div>
      </div>

      {/* Controle de Postagem */}
      <div className="space-y-4">
        <PostControl
          status={config.status}
          onStart={handleStart}
          onStop={handleStop}
          disabled={!canStart}
        />
        
        {/* Botões de Ação Rápida */}
        {config.status === 'running' && (
          <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Power className="h-4 w-4 text-primary" />
                Ações Rápidas
              </CardTitle>
              <CardDescription className="text-xs">
                Controles adicionais para o sistema em execução
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={handlePostNow}
                variant="outline"
                className="flex-1 min-w-[150px] rounded-2xl border-primary/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500"
              >
                <Clock className="h-4 w-4 mr-2" />
                Postar Agora
              </Button>
              <Button
                onClick={handleClearQueue}
                variant="outline"
                className="flex-1 min-w-[150px] rounded-2xl border-primary/20 bg-red-500/10 hover:bg-red-500/20 text-red-500"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Fila
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Backup e Restore */}
        <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Backup e Restore
            </CardTitle>
            <CardDescription className="text-xs">
              Exporte ou importe todas as suas configurações (template, canais, delays, etc)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={handleExportBackup}
              variant="outline"
              className="flex-1 min-w-[150px] rounded-2xl border-primary/20 bg-green-500/10 hover:bg-green-500/20 text-green-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Backup
            </Button>
            <Button
              onClick={handleImportBackup}
              variant="outline"
              className="flex-1 min-w-[150px] rounded-2xl border-primary/20 bg-purple-500/10 hover:bg-purple-500/20 text-purple-500"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Backup
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <div>
        <LogViewer logs={logs} />
      </div>
    </div>
  )
}


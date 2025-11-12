'use client'

import { useState, useEffect, useCallback } from 'react'
import { Hash, RefreshCw } from 'lucide-react'
import ChannelConfig from '@/components/ChannelConfig'
import ChannelListWithStats from '@/components/ChannelListWithStats'
import ChannelKPIs from '@/components/ChannelKPIs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getConfig,
  setStockChannel,
  setDestinationChannels,
  getChannelStatsSummary,
  Config,
  ChannelStatsSummary,
} from '@/lib/api'

export default function CanaisPage() {
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
  const [loading, setLoading] = useState(true)
  const [statsSummary, setStatsSummary] = useState<ChannelStatsSummary>({
    total_channels: 0,
    active_channels: 0,
    inactive_channels: 0,
    channels_with_errors: 0,
    total_posts: 0,
    total_failures: 0,
    success_rate: 0.0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  const loadConfig = useCallback(async () => {
    try {
      const loadedConfig = await getConfig()
      setConfig(loadedConfig)
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

  const loadStats = useCallback(async () => {
    try {
      const summary = await getChannelStatsSummary()
      setStatsSummary(summary)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    loadConfig()
    loadStats()
    
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 10000)
    
    // Atualiza estatísticas a cada 10 segundos
    const statsInterval = setInterval(() => {
      if (mounted) {
        loadStats()
      }
    }, 10000)
    
    return () => {
      mounted = false
      clearTimeout(timeout)
      clearInterval(statsInterval)
    }
  }, [loadConfig, loadStats])

  const handleStockChannelChange = async (channel: Config['stock_channel']) => {
    if (channel) {
      try {
        await setStockChannel(channel)
        setConfig((prev) => ({ ...prev, stock_channel: channel }))
      } catch (error) {
        console.error('Erro ao salvar canal de estoque:', error)
      }
    }
  }

  const handleDestinationChannelsChange = async (channels: Config['destination_channels']) => {
    try {
      await setDestinationChannels(channels)
      setConfig((prev) => ({ ...prev, destination_channels: channels }))
    } catch (error) {
      console.error('Erro ao salvar canais de destino:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div className="text-muted-foreground font-medium">Carregando canais...</div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Hash className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Canais</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Gerencie os canais de estoque e de destino para postagens
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadStats()
            loadConfig()
          }}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <ChannelKPIs summary={statsSummary} loading={loadingStats} />

      {/* Grid de Canais */}
      <div className="grid gap-6 lg:grid-cols-1">
        {/* Canal de Estoque */}
        <div>
          <ChannelConfig
            channel={config.stock_channel}
            onChange={handleStockChannelChange}
          />
        </div>

        {/* Canais de Destino com Estatísticas */}
        <div>
          <ChannelListWithStats
            channels={config.destination_channels}
            onChange={handleDestinationChannelsChange}
          />
        </div>
      </div>
    </div>
  )
}


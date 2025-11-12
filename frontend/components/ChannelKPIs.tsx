'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Hash, CheckCircle2, XCircle, AlertCircle, TrendingUp, Activity } from 'lucide-react'
import { ChannelStatsSummary } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ChannelKPIsProps {
  summary: ChannelStatsSummary
  loading?: boolean
}

export default function ChannelKPIs({ summary, loading = false }: ChannelKPIsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const kpis = [
    {
      title: 'Canais Ativos',
      value: summary.active_channels,
      total: summary.total_channels,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: `${summary.inactive_channels} inativos`
    },
    {
      title: 'Total de Postagens',
      value: summary.total_posts,
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: `${summary.total_failures} falhas`
    },
    {
      title: 'Taxa de Sucesso',
      value: `${summary.success_rate}%`,
      icon: Activity,
      color: summary.success_rate >= 90 ? 'text-green-500' : summary.success_rate >= 70 ? 'text-yellow-500' : 'text-red-500',
      bgColor: summary.success_rate >= 90 ? 'bg-green-500/10' : summary.success_rate >= 70 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      description: `${summary.total_posts + summary.total_failures} tentativas`
    },
    {
      title: 'Canais com Erros',
      value: summary.channels_with_errors,
      total: summary.total_channels,
      icon: AlertCircle,
      color: summary.channels_with_errors > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: summary.channels_with_errors > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
      description: summary.channels_with_errors > 0 ? 'Requer atenção' : 'Tudo funcionando'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
                <Icon className={cn("h-4 w-4", kpi.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className={cn("text-2xl font-bold", kpi.color)}>
                  {kpi.value}
                </div>
                {kpi.total !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    / {kpi.total}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}




'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Progress as ProgressType } from '@/lib/api'
import { Activity, Clock, TrendingUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: ProgressType
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const percentage = progress.total > 0 
    ? (progress.current / progress.total) * 100 
    : 0

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'running':
        return 'text-green-500'
      case 'stopped':
        return 'text-yellow-500'
      case 'completed':
        return 'text-blue-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'running':
        return 'Em execução'
      case 'stopped':
        return 'Pausado'
      case 'completed':
        return 'Concluído'
      default:
        return 'Aguardando'
    }
  }

  return (
    <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-4 w-4 text-primary" />
          Progresso
        </CardTitle>
        <CardDescription className="text-xs">
          Acompanhe o progresso das postagens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
            <div className="flex items-center gap-2">
              <Activity className={cn("h-4 w-4", getStatusColor())} />
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
            </div>
            <span className={cn("text-sm font-semibold", getStatusColor())}>
              {getStatusText()}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
            <Progress value={percentage} max={100} className="w-full h-3" />
          </div>
          <div className="flex items-center justify-between text-sm p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                {progress.current} de {progress.total} mensagens
              </span>
            </div>
            <span className="font-mono font-semibold text-primary">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        {progress.status === 'running' && progress.remaining_time > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t border-primary/20 p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              Tempo restante: <span className="font-mono font-semibold text-primary">{formatTime(progress.remaining_time)}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LogEntry } from '@/lib/api'
import { Play, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogViewerProps {
  logs: LogEntry[]
}

export default function LogViewer({ logs }: LogViewerProps) {
  const getIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Play className="h-4 w-4 text-blue-500" />
    }
  }

  const getTextColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-500 dark:text-green-400'
      case 'error':
        return 'text-red-500 dark:text-red-400'
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400'
      default:
        return 'text-foreground'
    }
  }

  const getBgColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'bg-primary/5 border-primary/10'
    }
  }

  const parseLogMessage = (message: string) => {
    // Extrai informações do log
    const parts = message.split(' | ')
    const mainMessage = parts[0]
    const timeInfo = parts.find(p => p.includes('Próxima') || p.includes('tentativa'))
    
    return { mainMessage, timeInfo }
  }

  return (
    <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-4 w-4 text-primary" />
          Logs do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-primary/10 backdrop-blur-sm border-2 border-primary/20 p-4 rounded-2xl h-64 overflow-y-auto space-y-2 font-mono text-sm shadow-inner">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum log ainda...</p>
              <p className="text-xs">Os logs aparecerão aqui quando o sistema estiver em execução</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const { mainMessage, timeInfo } = parseLogMessage(log.message)
              return (
                <div 
                  key={index} 
                  className={cn(
                    "flex flex-col gap-1.5 py-2.5 px-3 rounded-xl border last:border-0 transition-all hover:shadow-md",
                    getBgColor(log.level)
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground text-xs shrink-0 font-mono mt-0.5">
                      {log.timestamp}
                    </span>
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="mt-0.5">
                        {getIcon(log.level)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("break-words font-medium", getTextColor(log.level))}>
                          {mainMessage}
                        </span>
                        {timeInfo && (
                          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-current/20">
                            <Clock className="h-3 w-3 text-blue-400 shrink-0" />
                            <span className="text-xs text-blue-400 font-medium">
                              {timeInfo}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}


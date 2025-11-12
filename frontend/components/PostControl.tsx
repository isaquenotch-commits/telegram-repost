'use client'

import { Button } from '@/components/ui/button'
import { Play, Square, AlertCircle, Send, Power } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PostControlProps {
  status: string
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export default function PostControl({ status, onStart, onStop, disabled }: PostControlProps) {
  const isRunning = status === 'running'

  return (
    <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Power className="h-4 w-4 text-primary" />
          Controle de Postagem
        </CardTitle>
        <CardDescription className="text-xs">
          Inicie ou pare o processo de repostagem automática
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {disabled && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/60 backdrop-blur-sm border border-border/50 shadow-sm">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Configuração incompleta</p>
              <p className="text-xs text-muted-foreground">
                Configure o canal de estoque e adicione pelo menos um canal de destino para iniciar
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-center">
          <Button
            onClick={isRunning ? onStop : onStart}
            disabled={disabled || status === 'completed'}
            size="lg"
            className={cn(
              "w-full max-w-md gap-2",
              isRunning && "bg-destructive hover:bg-destructive/90"
            )}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? (
              <>
                <Square className="h-5 w-5" />
                Parar Postagens
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Iniciar Postagens
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


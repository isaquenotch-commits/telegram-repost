'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PostConfig } from '@/lib/api'
import { Timer, Shuffle } from 'lucide-react'

interface DelaySliderProps {
  config: PostConfig
  onChange: (config: PostConfig) => void
}

export default function DelaySlider({ config, onChange }: DelaySliderProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} segundo${seconds !== 1 ? 's' : ''}`
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    const parts: string[] = []
    if (hours > 0) {
      parts.push(`${hours} hora${hours !== 1 ? 's' : ''}`)
    }
    if (minutes > 0) {
      parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`)
    }
    if (secs > 0 && hours === 0) {
      parts.push(`${secs} segundo${secs !== 1 ? 's' : ''}`)
    }
    
    return parts.join(' e ') || '0 segundos'
  }

  // Funções para delay mínimo
  const getMinHours = () => Math.floor(config.delay_min / 3600)
  const getMinMinutes = () => Math.floor((config.delay_min % 3600) / 60)
  const getMinSeconds = () => config.delay_min % 60

  // Funções para delay máximo
  const getMaxHours = () => Math.floor(config.delay_max / 3600)
  const getMaxMinutes = () => Math.floor((config.delay_max % 3600) / 60)
  const getMaxSeconds = () => config.delay_max % 60

  const updateDelayMin = (hours: number, minutes: number, seconds: number) => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    if (totalSeconds >= 1 && totalSeconds <= config.delay_max) {
      onChange({
        ...config,
        delay_min: totalSeconds,
      })
    }
  }

  const updateDelayMax = (hours: number, minutes: number, seconds: number) => {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    if (totalSeconds >= 1 && totalSeconds >= config.delay_min) {
      onChange({
        ...config,
        delay_max: totalSeconds,
      })
    }
  }

  const handleMinHoursChange = (value: string) => {
    const hours = parseInt(value) || 0
    updateDelayMin(hours, getMinMinutes(), getMinSeconds())
  }

  const handleMinMinutesChange = (value: string) => {
    const minutes = parseInt(value) || 0
    updateDelayMin(getMinHours(), minutes, getMinSeconds())
  }

  const handleMinSecondsChange = (value: string) => {
    const secs = parseInt(value) || 0
    updateDelayMin(getMinHours(), getMinMinutes(), secs)
  }

  const handleMaxHoursChange = (value: string) => {
    const hours = parseInt(value) || 0
    updateDelayMax(hours, getMaxMinutes(), getMaxSeconds())
  }

  const handleMaxMinutesChange = (value: string) => {
    const minutes = parseInt(value) || 0
    updateDelayMax(getMaxHours(), minutes, getMaxSeconds())
  }

  const handleMaxSecondsChange = (value: string) => {
    const secs = parseInt(value) || 0
    updateDelayMax(getMaxHours(), getMaxMinutes(), secs)
  }

  return (
    <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-4 w-4 text-primary" />
          Delay entre Postagens (Intervalo Aleatório)
        </CardTitle>
        <CardDescription className="text-xs">
          Configure o intervalo de tempo aleatório entre cada postagem para evitar spam no Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Delay Mínimo */}
        <div className="space-y-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-primary">Delay Mínimo</Label>
            <span className="text-xs text-muted-foreground">(tempo mínimo de espera)</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="delay-min-hours" className="text-xs">Horas</Label>
              <Input
                id="delay-min-hours"
                type="number"
                min="0"
                placeholder="0"
                value={getMinHours()}
                onChange={(e) => handleMinHoursChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-min-minutes" className="text-xs">Minutos</Label>
              <Input
                id="delay-min-minutes"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={getMinMinutes()}
                onChange={(e) => handleMinMinutesChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-min-seconds" className="text-xs">Segundos</Label>
              <Input
                id="delay-min-seconds"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={getMinSeconds()}
                onChange={(e) => handleMinSecondsChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-primary/20">
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatTime(config.delay_min)}</span> ({config.delay_min} segundos)
            </span>
          </div>
        </div>

        {/* Delay Máximo */}
        <div className="space-y-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-primary">Delay Máximo</Label>
            <span className="text-xs text-muted-foreground">(tempo máximo de espera)</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="delay-max-hours" className="text-xs">Horas</Label>
              <Input
                id="delay-max-hours"
                type="number"
                min="0"
                placeholder="0"
                value={getMaxHours()}
                onChange={(e) => handleMaxHoursChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-max-minutes" className="text-xs">Minutos</Label>
              <Input
                id="delay-max-minutes"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={getMaxMinutes()}
                onChange={(e) => handleMaxMinutesChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-max-seconds" className="text-xs">Segundos</Label>
              <Input
                id="delay-max-seconds"
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={getMaxSeconds()}
                onChange={(e) => handleMaxSecondsChange(e.target.value)}
                className="rounded-xl border-primary/20"
              />
            </div>
          </div>
          <div className="pt-2 border-t border-primary/20">
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{formatTime(config.delay_max)}</span> ({config.delay_max} segundos)
            </span>
          </div>
        </div>
        
        {/* Informação sobre o intervalo */}
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <div className="flex items-start gap-2">
            <Shuffle className="h-4 w-4 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                O sistema aguardará um tempo <span className="font-semibold text-foreground">aleatório</span> entre{' '}
                <span className="font-semibold text-foreground">{formatTime(config.delay_min)}</span> e{' '}
                <span className="font-semibold text-foreground">{formatTime(config.delay_max)}</span> antes de cada postagem.
              </p>
              {config.delay_min === config.delay_max ? (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  ⚠️ Os valores mínimo e máximo são iguais. Configure valores diferentes para ativar o intervalo aleatório.
                </p>
              ) : (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✅ Intervalo aleatório ativo! Isso ajuda a evitar detecção de spam no Telegram.
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

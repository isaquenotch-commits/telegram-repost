'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChannelConfig as ChannelConfigType } from '@/lib/api'
import { Hash, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChannelConfigProps {
  channel: ChannelConfigType | undefined
  onChange: (channel: ChannelConfigType) => void
}

export default function ChannelConfig({ channel, onChange }: ChannelConfigProps) {
  const [copied, setCopied] = useState(false)

  const handleChange = (field: 'channel_id' | 'name', value: string) => {
    onChange({
      channel_id: field === 'channel_id' ? value : channel?.channel_id || '',
      name: field === 'name' ? value : channel?.name || '',
    })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hash className="h-4 w-4" />
          Canal de Estoque
        </CardTitle>
        <CardDescription className="text-xs">
          Configure o canal de origem de onde as mensagens serão repostadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2">
          <Label htmlFor="channel-id">ID do Canal</Label>
          <Input
            id="channel-id"
            placeholder="@estoque ou -1001234567890"
            value={channel?.channel_id || ''}
            onChange={(e) => handleChange('channel_id', e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Use @username para canais públicos ou o ID numérico para canais privados
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="channel-name">Nome do Canal (Opcional)</Label>
          <Input
            id="channel-name"
            placeholder="Nome descritivo do canal"
            value={channel?.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        {channel?.channel_id && (
          <div className="p-4 rounded-lg bg-muted/60 backdrop-blur-sm border border-border/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">ID Configurado:</p>
                <p className="text-base font-mono font-semibold text-foreground break-all">
                  {channel.channel_id}
                </p>
                {channel.name && (
                  <p className="text-sm text-muted-foreground">
                    Nome: {channel.name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(channel.channel_id)}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


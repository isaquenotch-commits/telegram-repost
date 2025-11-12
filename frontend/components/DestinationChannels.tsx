'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, X, Hash, Edit2, Save, Copy, Check } from 'lucide-react'
import { ChannelConfig } from '@/lib/api'
import { cn } from '@/lib/utils'

interface DestinationChannelsProps {
  channels: ChannelConfig[]
  onChange: (channels: ChannelConfig[]) => void
}

export default function DestinationChannels({ channels, onChange }: DestinationChannelsProps) {
  const [newChannelId, setNewChannelId] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ id: string; name: string }>({ id: '', name: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set(channels.map(c => c.channel_id))
  )

  // Sincroniza selectedChannels quando channels mudar externamente
  useEffect(() => {
    const currentChannelIds = new Set(channels.map(c => c.channel_id))
    // Mantém apenas os selecionados que ainda existem
    setSelectedChannels(prev => {
      const updated = new Set<string>()
      prev.forEach(id => {
        if (currentChannelIds.has(id)) {
          updated.add(id)
        }
      })
      // Adiciona novos canais como selecionados por padrão
      currentChannelIds.forEach(id => {
        if (!updated.has(id)) {
          updated.add(id)
        }
      })
      return updated
    })
  }, [channels])

  const handleToggleChannel = (channelId: string) => {
    const newSelected = new Set(selectedChannels)
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId)
    } else {
      newSelected.add(channelId)
    }
    setSelectedChannels(newSelected)
    onChange(channels.filter(c => newSelected.has(c.channel_id)))
  }

  const handleAddChannel = () => {
    if (newChannelId.trim()) {
      const newChannel: ChannelConfig = {
        channel_id: newChannelId.trim(),
        name: newChannelName.trim() || newChannelId.trim(),
      }
      onChange([...channels, newChannel])
      setSelectedChannels(new Set([...selectedChannels, newChannel.channel_id]))
      setNewChannelId('')
      setNewChannelName('')
    }
  }

  const handleRemoveChannel = (channelId: string) => {
    if (confirm('Tem certeza que deseja remover este canal?')) {
      onChange(channels.filter(c => c.channel_id !== channelId))
      const newSelected = new Set(selectedChannels)
      newSelected.delete(channelId)
      setSelectedChannels(newSelected)
    }
  }

  const handleStartEdit = (channel: ChannelConfig) => {
    setEditingId(channel.channel_id)
    setEditValues({ id: channel.channel_id, name: channel.name })
  }

  const handleSaveEdit = () => {
    if (editingId && editValues.id.trim()) {
      const updatedChannels = channels.map(c => 
        c.channel_id === editingId
          ? { channel_id: editValues.id.trim(), name: editValues.name.trim() || editValues.id.trim() }
          : c
      )
      onChange(updatedChannels)
      setEditingId(null)
      setEditValues({ id: '', name: '' })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValues({ id: '', name: '' })
  }

  const copyToClipboard = async (text: string, channelId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(channelId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hash className="h-4 w-4" />
          Canais de Destino
        </CardTitle>
        <CardDescription className="text-xs">
          Gerencie os canais para onde as mensagens serão repostadas. Ative/desative com o checkbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {channels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Hash className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum canal adicionado ainda</p>
            <p className="text-sm">Adicione canais usando o formulário abaixo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => {
              const isEditing = editingId === channel.channel_id
              const isSelected = selectedChannels.has(channel.channel_id)
              
              return (
                <div
                  key={channel.channel_id}
                  className={cn(
                    "p-3 rounded-md border transition-all backdrop-blur-sm",
                    isSelected 
                      ? "bg-accent/70 border-accent-foreground/30 shadow-md" 
                      : "bg-card/50 border-border/50 opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={channel.channel_id}
                      checked={isSelected}
                      onCheckedChange={() => handleToggleChannel(channel.channel_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="ID do canal"
                            value={editValues.id}
                            onChange={(e) => setEditValues({ ...editValues, id: e.target.value })}
                            className="font-mono text-sm"
                          />
                          <Input
                            placeholder="Nome do canal"
                            value={editValues.name}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-8"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={channel.channel_id}
                              className={cn(
                                "font-semibold cursor-pointer",
                                isSelected ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {channel.name}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                              {channel.channel_id}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(channel.channel_id, channel.channel_id)}
                            >
                              {copiedId === channel.channel_id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleStartEdit(channel)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveChannel(channel.channel_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        <div className="pt-4 border-t border-border">
          <Label className="text-sm font-medium mb-2 block">Adicionar Novo Canal</Label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="ID do canal (ex: @canal ou -1001234567890)"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                className="font-mono"
              />
              <Input
                placeholder="Nome do canal (opcional)"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
              />
            </div>
            <Button 
              onClick={handleAddChannel} 
              className="self-end"
              disabled={!newChannelId.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


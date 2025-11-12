'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PostConfig } from '@/lib/api'
import { FileText, Link2 } from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

interface PostTemplateProps {
  config: PostConfig
  onChange: (config: PostConfig) => void
}

export default function PostTemplate({ config, onChange }: PostTemplateProps) {
  const handleChange = (field: keyof PostConfig, value: string | number) => {
    onChange({
      ...config,
      [field]: value,
    })
  }

  return (
    <Card className="rounded-3xl bg-primary/5 border-2 border-primary/20 shadow-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-4 w-4 text-primary" />
          Template de Postagem
        </CardTitle>
        <CardDescription className="text-xs">
          Configure o texto padrão com formatação rica (negrito, itálico, links, emojis) e botões que serão adicionados às mensagens repostadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="space-y-2 p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <Label htmlFor="template-text">Texto padrão do post</Label>
          <RichTextEditor
            value={config.template_text}
            onChange={(value) => handleChange('template_text', value)}
            placeholder="Digite o texto que será adicionado antes da mensagem original... Use os botões acima para formatar!"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Este texto será adicionado no início de cada mensagem repostada. Suporta formatação HTML do Telegram (negrito, itálico, links, emojis, etc.)
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="button-label" className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              Label do Botão
            </Label>
            <Input
              id="button-label"
              placeholder="Saiba mais"
              value={config.button_label || ''}
              onChange={(e) => handleChange('button_label', e.target.value)}
              className="rounded-xl border-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="button-url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              URL do Botão
            </Label>
            <Input
              id="button-url"
              type="url"
              placeholder="https://example.com"
              value={config.button_url || ''}
              onChange={(e) => handleChange('button_url', e.target.value)}
              className="font-mono text-sm rounded-xl border-primary/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


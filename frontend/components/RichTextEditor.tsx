'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Link, 
  Code, 
  Smile,
  Eye,
  Type
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite seu texto...',
  rows = 4,
  className
}: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Insere tag HTML na posição do cursor
  const insertTag = (openTag: string, closeTag: string, placeholder?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const textBefore = value.substring(0, start)
    const textAfter = value.substring(end)

    let newText: string
    if (selectedText) {
      // Se há texto selecionado, envolve com as tags
      newText = `${textBefore}${openTag}${selectedText}${closeTag}${textAfter}`
    } else {
      // Se não há seleção, insere tags com placeholder
      const insertText = placeholder || 'texto'
      newText = `${textBefore}${openTag}${insertText}${closeTag}${textAfter}`
    }

    onChange(newText)

    // Reposiciona cursor após inserção
    setTimeout(() => {
      if (textarea) {
        const newPosition = start + openTag.length + (selectedText.length || placeholder?.length || 0)
        textarea.focus()
        textarea.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  const insertBold = () => insertTag('<b>', '</b>', 'texto em negrito')
  const insertItalic = () => insertTag('<i>', '</i>', 'texto em itálico')
  const insertUnderline = () => insertTag('<u>', '</u>', 'texto sublinhado')
  const insertStrikethrough = () => insertTag('<s>', '</s>', 'texto riscado')
  const insertCode = () => insertTag('<code>', '</code>', 'código')
  const insertPre = () => insertTag('<pre>', '</pre>', 'bloco de código')

  const insertLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const textBefore = value.substring(0, start)
    const textAfter = value.substring(end)

    const linkText = selectedText || 'texto do link'
    const linkUrl = 'https://example.com'
    const newText = `${textBefore}<a href="${linkUrl}">${linkText}</a>${textAfter}`
    
    onChange(newText)

    setTimeout(() => {
      if (textarea) {
        const urlStart = start + `<a href="${linkUrl}">`.length
        const urlEnd = urlStart + linkUrl.length
        textarea.focus()
        textarea.setSelectionRange(urlStart, urlEnd)
      }
    }, 0)
  }

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const textBefore = value.substring(0, start)
    const textAfter = value.substring(start)
    const newText = `${textBefore}${emoji}${textAfter}`
    
    onChange(newText)

    setTimeout(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(start + emoji.length, start + emoji.length)
      }
    }, 0)
  }

  // Renderiza preview HTML
  const renderPreview = () => {
    // Converte HTML básico para visualização (sem executar scripts)
    const html = value
      .replace(/<b>(.*?)<\/b>/gi, '<strong>$1</strong>')
      .replace(/<i>(.*?)<\/i>/gi, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>')
      .replace(/<s>(.*?)<\/s>/gi, '<s>$1</s>')
      .replace(/<code>(.*?)<\/code>/gi, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
      .replace(/<pre>(.*?)<\/pre>/gi, '<pre style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; font-family: monospace; white-space: pre-wrap;">$1</pre>')
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '<a href="$1" style="color: #3b82f6; text-decoration: underline;">$2</a>')
      .replace(/\n/g, '<br>')

    return { __html: html }
  }

  // Emojis organizados por categoria
  const emojiCategories = {
    'Faces': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'],
    'Gestos': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    'Objetos': ['💍', '👑', '👒', '🎩', '🎓', '🧢', '⛑️', '🪖', '💄', '💋', '👄', '🦷', '🦴', '👀', '👁️', '👅', '👂', '🦻', '👃', '👣', '👤', '👥', '🫂', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '👳‍♂️', '🧕', '👮‍♀️', '👮', '👮‍♂️', '👷‍♀️', '👷', '👷‍♂️', '💂‍♀️', '💂', '💂‍♂️', '🕵️‍♀️', '🕵️', '🕵️‍♂️', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍🌾', '🧑‍🌾', '👨‍🌾', '👩‍🍳', '🧑‍🍳', '👨‍🍳', '👩‍🎓', '🧑‍🎓', '👨‍🎓', '👩‍🎤', '🧑‍🎤', '👨‍🎤', '👩‍🏫', '🧑‍🏫', '👨‍🏫', '👩‍🏭', '🧑‍🏭', '👨‍🏭', '👩‍💻', '🧑‍💻', '👨‍💻', '👩‍💼', '🧑‍💼', '👨‍💼', '👩‍🔧', '🧑‍🔧', '👨‍🔧', '👩‍🔬', '🧑‍🔬', '👨‍🔬', '👩‍🎨', '🧑‍🎨', '👨‍🎨', '👩‍🚒', '🧑‍🚒', '👨‍🚒', '👩‍✈️', '🧑‍✈️', '👨‍✈️', '👩‍🚀', '🧑‍🚀', '👨‍🚀', '👩‍⚖️', '🧑‍⚖️', '👨‍⚖️', '👰‍♀️', '👰', '👰‍♂️', '🤵‍♀️', '🤵', '🤵‍♂️', '👸', '🤴', '🦸‍♀️', '🦸', '🦸‍♂️', '🦹‍♀️', '🦹', '🦹‍♂️', '🤶', '🎅', '🧙‍♀️', '🧙', '🧙‍♂️', '🧝‍♀️', '🧝', '🧝‍♂️', '🧛‍♀️', '🧛', '🧛‍♂️', '🧟‍♀️', '🧟', '🧟‍♂️', '🧞‍♀️', '🧞', '🧞‍♂️', '🧜‍♀️', '🧜', '🧜‍♂️', '🧚‍♀️', '🧚', '🧚‍♂️', '👼', '🤰', '🤱', '👩‍🍼', '🧑‍🍼', '👨‍🍼', '🙇‍♀️', '🙇', '🙇‍♂️', '💁‍♀️', '💁', '💁‍♂️', '🙅‍♀️', '🙅', '🙅‍♂️', '🙆‍♀️', '🙆', '🙆‍♂️', '🙋‍♀️', '🙋', '🙋‍♂️', '🧏‍♀️', '🧏', '🧏‍♂️', '🤦‍♀️', '🤦', '🤦‍♂️', '🤷‍♀️', '🤷', '🤷‍♂️', '🙎‍♀️', '🙎', '🙎‍♂️', '🙍‍♀️', '🙍', '🙍‍♂️', '💇‍♀️', '💇', '💇‍♂️', '💆‍♀️', '💆', '💆‍♂️', '🧖‍♀️', '🧖', '🧖‍♂️', '💃', '🕺', '🕴️', '👩‍🦽', '🧑‍🦽', '👨‍🦽', '👩‍🦼', '🧑‍🦼', '👨‍🦼', '🚶‍♀️', '🚶', '🚶‍♂️', '👩‍🦯', '🧑‍🦯', '👨‍🦯', '🧎‍♀️', '🧎', '🧎‍♂️', '🏃‍♀️', '🏃', '🏃‍♂️', '🧍‍♀️', '🧍', '🧍‍♂️', '👭', '👫', '👬', '💏', '💑', '👪', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👩‍👩‍👦', '👩‍👩‍👧', '👩‍👩‍👧‍👦', '👩‍👩‍👦‍👦', '👩‍👩‍👧‍👧', '👨‍👨‍👦', '👨‍👨‍👧', '👨‍👨‍👧‍👦', '👨‍👨‍👦‍👦', '👨‍👨‍👧‍👧', '👩‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👦‍👦', '👩‍👧‍👧', '👨‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👦‍👦', '👨‍👧‍👧'],
    'Símbolos': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🔢', '🔟', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔲', '🔳', '⚫', '⚪', '🔴', '🔵', '🟤', '🟡', '🟢', '🟠', '🟣', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔘', '🔳', '🔲']
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-1 border-r border-primary/20 pr-2 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertBold}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Negrito"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertItalic}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Itálico"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertUnderline}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Sublinhado"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertStrikethrough}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Riscado"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 border-r border-primary/20 pr-2 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertLink}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Link"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertCode}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Código inline"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={insertPre}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title="Bloco de código"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="h-8 w-8 p-0 hover:bg-primary/20"
              title="Emojis"
            >
              <Smile className="h-4 w-4" />
            </Button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-background border border-primary/20 rounded-xl shadow-lg z-50 max-h-80 w-80 overflow-y-auto">
                {Object.entries(emojiCategories).map(([category, emojis]) => (
                  <div key={category} className="mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">{category}</div>
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.slice(0, 32).map((emoji, idx) => (
                        <button
                          key={`${category}-${idx}`}
                          type="button"
                          onClick={() => {
                            insertEmoji(emoji)
                            setShowEmojiPicker(false)
                          }}
                          className="p-1 hover:bg-primary/10 rounded text-lg transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 w-8 p-0 hover:bg-primary/20"
            title={showPreview ? 'Editar' : 'Preview'}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor ou Preview */}
      {showPreview ? (
        <div
          className="min-h-[100px] p-3 rounded-xl border border-primary/20 bg-background whitespace-pre-wrap prose prose-sm max-w-none"
          dangerouslySetInnerHTML={renderPreview()}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="resize-none rounded-xl border-primary/20 font-mono text-sm"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Overlay para fechar emoji picker ao clicar fora */}
      {showEmojiPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Ajuda */}
      <p className="text-xs text-muted-foreground">
        Use as tags HTML: <code className="bg-primary/10 px-1 rounded">&lt;b&gt;</code> negrito, <code className="bg-primary/10 px-1 rounded">&lt;i&gt;</code> itálico, <code className="bg-primary/10 px-1 rounded">&lt;u&gt;</code> sublinhado, <code className="bg-primary/10 px-1 rounded">&lt;s&gt;</code> riscado, <code className="bg-primary/10 px-1 rounded">&lt;a href="url"&gt;</code> link, <code className="bg-primary/10 px-1 rounded">&lt;code&gt;</code> código
      </p>
    </div>
  )
}


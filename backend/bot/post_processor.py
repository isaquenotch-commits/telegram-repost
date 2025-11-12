import re
from typing import Optional, Dict, Any
from telegram import Message
from telegram.constants import MessageEntityType
from backend.models.config import PostConfig


class PostProcessor:
    """Processa posts do Telegram removendo metadados e aplicando template"""

    @staticmethod
    def clean_message_text(message: Message) -> str:
        """Remove autor e nome do canal do texto da mensagem"""
        if not message.text and not message.caption:
            return ""
        
        text = message.text or message.caption or ""
        
        # Remove entities que podem conter informações do autor/canal
        if message.entities or message.caption_entities:
            entities = message.entities or message.caption_entities or []
            # Ordena entities por offset reverso para remover do final para o início
            entities_to_remove = []
            for entity in entities:
                if entity.type in [MessageEntityType.TEXT_LINK, MessageEntityType.URL, 
                                   MessageEntityType.MENTION, MessageEntityType.HASHTAG]:
                    continue
                entities_to_remove.append(entity)
            
            # Remove texto das entities problemáticas
            for entity in sorted(entities_to_remove, key=lambda x: x.offset + x.length, reverse=True):
                if entity.type in [MessageEntityType.MENTION]:
                    start = entity.offset
                    end = entity.offset + entity.length
                    if start < len(text) and end <= len(text):
                        text = text[:start] + text[end:]
        
        # Remove padrões comuns de assinatura de canal
        patterns = [
            r'via @\w+',
            r'from @\w+',
            r'canal: @\w+',
            r'@\w+\s*$',
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Remove espaços extras
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    @staticmethod
    def apply_template(original_text: str, config: PostConfig) -> str:
        """Aplica o template de postagem ao texto"""
        if config.template_text:
            if original_text:
                return f"{config.template_text}\n\n{original_text}"
            return config.template_text
        return original_text

    @staticmethod
    def get_button_markup(config: PostConfig):
        """Cria markup do botão inline se configurado"""
        if config.button_label and config.button_url:
            from telegram import InlineKeyboardButton, InlineKeyboardMarkup
            button = InlineKeyboardButton(
                text=config.button_label,
                url=config.button_url
            )
            return InlineKeyboardMarkup([[button]])
        return None

    @staticmethod
    def process_message(message: Message, config: PostConfig) -> Dict[str, Any]:
        """Processa mensagem completa para repost
        
        Retorna um dicionário com os dados da mensagem original para copiar.
        A cópia real será feita no bot usando copy_message ou download/upload.
        """
        # Limpa o texto
        cleaned_text = PostProcessor.clean_message_text(message)
        
        # Aplica template
        final_text = PostProcessor.apply_template(cleaned_text, config)
        
        # Prepara dados da mensagem
        message_data = {
            'message': message,  # Mantém referência à mensagem original
            'text': final_text if final_text else None,
            'caption': final_text if (message.video or message.photo or message.document or message.animation) else None,
            'reply_markup': PostProcessor.get_button_markup(config),
            'has_media': bool(message.video or message.photo or message.document or message.animation),
        }
        
        return message_data

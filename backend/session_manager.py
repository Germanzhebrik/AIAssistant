# -*- coding: utf-8 -*-
"""
Модуль интеграции СберБизнес ИИ-Ассистента с базой данных PostgreSQL.
Использует SQLAlchemy для сохранения сообщений и извлечения предыстории
диалогов для последующей передачи в Gemini SDK.
"""

import os
import datetime
from sqlalchemy import create_engine, Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()


class UserProfileModel(Base):
    __tablename__ = 'user_profiles'
    user_id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    company_name = Column(String(200), nullable=False)
    inn = Column(String(12), nullable=False)
    role = Column(String(20), nullable=False)  # 'director' или 'accountant'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChatSessionModel(Base):
    __tablename__ = 'chat_sessions'
    session_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey('user_profiles.user_id', ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    current_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    messages = relationship("ChatMessageModel", back_populates="session", cascade="all, delete-orphan")


class ChatMessageModel(Base):
    __tablename__ = 'chat_messages'
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(50), ForeignKey('chat_sessions.session_id', ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system', 'operator'
    content = Column(Text, nullable=False)
    is_operator_call = Column(Boolean, default=False)
    crm_ticket_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("ChatSessionModel", back_populates="messages")


# Инициализация подключения к БД
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sber_ai:secure_pass@localhost:5432/sber_assistant")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class ChatHistoryManager:
    """Класс управления бизнес-логикой сохранения и получения диалогов"""

    @staticmethod
    def create_session(session_id: str, user_id: str, title: str, current_url: str = None) -> ChatSessionModel:
        """Создает новую сессию общения клиента с ИИ"""
        db = SessionLocal()
        try:
            new_session = ChatSessionModel(
                session_id=session_id,
                user_id=user_id,
                title=title,
                current_url=current_url
            )
            db.add(new_session)
            db.commit()
            db.refresh(new_session)
            return new_session
        finally:
            db.close()

    @staticmethod
    def save_message(session_id: str, role: str, content: str, is_operator_call: bool = False,
                     crm_ticket_id: str = None) -> ChatMessageModel:
        """Сохраняет отдельное сообщение (пользователя, ассистента или оператора) в базу данных"""
        db = SessionLocal()
        try:
            message = ChatMessageModel(
                session_id=session_id,
                role=role,
                content=content,
                is_operator_call=is_operator_call,
                crm_ticket_id=crm_ticket_id
            )
            db.add(message)
            db.commit()
            db.refresh(message)
            return message
        finally:
            db.close()

    @staticmethod
    def get_formatted_history_for_gemini(session_id: str, limit: int = 15) -> list:
        """
        Извлекает историю сообщений сессии из PostgreSQL
        и преобразует ее в формат, понятный официальному google-genai SDK
        для поддержания контекста в последующих запросах.
        """
        db = SessionLocal()
        try:
            # Извлекаем последние limit сообщений в хронологическом порядке
            messages = db.query(ChatMessageModel) \
                .filter(ChatMessageModel.session_id == session_id) \
                .order_by(ChatMessageModel.created_at.asc()) \
                .limit(limit) \
                .all()

            # Форматируем под standard SDK формат сообщений:
            # [{"role": "user"|"model", "parts": [{"text": "..."}]}]
            gemini_history = []
            for m in messages:
                # В официальном ИИ SDK в качестве роли ассистента выступает 'model'
                sdk_role = "user" if m.role == "user" else "model"
                gemini_history.append({
                    "role": sdk_role,
                    "parts": [{"text": m.content}]
                })
            return gemini_history
        finally:
            db.close()

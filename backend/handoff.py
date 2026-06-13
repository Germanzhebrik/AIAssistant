# -*- coding: utf-8 -*-
"""
Модуль бесшовного перевода клиента СберБизнес на живого оператора технической поддержки.
Содержит логику интеллектуальной курации диалога: выделение сути проблемы
с помощью ИИ Gemini и регистрацию тикета в банковской CRM.
"""

import os
import json
import httpx
from google import genai
from google.genai import types

# Инициализируем официальный клиент Google GenAI с использованием нового SDK
# Рекомендуется использовать модель 'gemini-3.1-flash' для высокой скорости и точности
ai = genai.Client(api_key=os.getenv("GEMINI_API_KEY", "MOCK_KEY"))


async def generate_support_context_package(chat_history: list, current_url: str, user_profile: dict) -> dict:
    """
    Берет историю чата, делает с помощью Gemini краткий саммари
    (суть проблемы, что юзер пытался сделать, на каком URL находится)
    и формирует JSON-пакет для бесшовной отправки в CRM техподдержки.

    :param chat_history: Список сообщений вида [{'role': 'user'|'assistant', 'content': '...'}]
    :param current_url: Текущая страница в веб-интерфейсе СберБизнеса
    :param user_profile: Профиль клиента (ИНН, Роль, ФИО, Компания)
    :return: Словарь готового JSON-пакета для поддержки
    """

    # 1. Сводим историю диалога в читаемый текстовый лог для контекста ИИ
    log_parts = []
    for msg in chat_history:
        actor = "Клиент" if msg.get("role") == "user" else "ИИ-Ассистент"
        log_parts.append(f"{actor}: {msg.get('content')}")
    chat_transcript = "\n".join(log_parts)

    # 2. Формулируем системные инструкции и промпт для выжимки сути затруднения
    system_instruction = (
        "Ты — автоматизированный аналитический шлюз клиентской поддержки СберБизнес.\n"
        "Твоя задача — проанализировать поданный лог диалога клиента с виртуальным помощником "
        "и извлечь структурированный технический контекст для передачи живому оператору.\n"
        "Ты должен отвечать строго валидным JSON-объектом без постороннего текста и без обертки ```json."
    )

    prompt = f"""
    Проанализируй предложенную историю диалога и заполни карточку обращения.

    История переписки:
    {chat_transcript}

    Данные о пользователе и системе:
    - ФИО клиента: {user_profile.get('name', 'Не определено')}
    - Должность/Роль: {user_profile.get('role_label', 'Сотрудник')}
    - Компания: {user_profile.get('company_name', 'Зарегистрированный клиент')}
    - ИНН: {user_profile.get('inn', '0000000000')}
    - Адрес текущего экрана в веб-банке: {current_url}

    Сформируй JSON со следующими точными ключами:
    1. "issueSummary": Краткая суть затруднения (в одно предложение, человеческим языком, например: 'Не согласен со стандартной процентной ставкой кредитования')
    2. "userIntent": Истинная цель обращения (например: 'кредит', 'налоги', 'валютный_контроль', 'офердрафт', 'ошибка_входа')
    3. "botSuccess": Почему бот не смог помочь (например, 'требуется согласовать индивидуальный лимит', 'клиент выразил недовольство', 'технический сбой')
    4. "urgency": Приоритет обслуживания на основе эмоционального окраса чата (high / medium / low)
    """

    try:
        # Вызываем современный метод SDK
        response = ai.models.generate_content(
            model="gemini-3.1-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        # Парсим ответ
        ai_summary = json.loads(response.text.strip())
    except Exception as e:
        # Устойчивый фоллбек в случае отсутствия API-ключа или сетевой ошибки
        print(f"[CRM Handoff Error] Failed to generate AI summary: {e}")
        ai_summary = {
            "issueSummary": f"Клиент запросил ручную поддержку со страницы {current_url}",
            "userIntent": "manual_support_call",
            "botSuccess": "ручное переключение оператора",
            "urgency": "medium"
        }

    # 3. Собираем полный интеграционный пакет
    crm_payload = {
        "chatSessionId": f"session-{hash(current_url) & 0xffffffff}",
        "currentPageUrl": current_url,
        "userInfo": {
            "name": user_profile.get("name"),
            "role": user_profile.get("role"),
            "companyName": user_profile.get("company_name"),
            "inn": user_profile.get("inn", "7701234567")
        },
        "extractedContext": ai_summary,
        "fullHistory": chat_history,
        "timestamp": datetime.datetime.now().isoformat()
    }

    # 4. Отправка во внешнюю CRM Сбера (симуляция)
    # В продакшене данный блок координирует gRPC/REST запрос на шлюз распределения задач банк-центра:
    crm_endpoint = "https://api.sberbusiness.ru/support-gateway/v1/handoff"
    # crm_token = os.getenv("SBER_CRM_TOKEN")
    # try:
    #     async with httpx.AsyncClient(timeout=3.0) as client:
    #         await client.post(crm_endpoint, json=crm_payload, headers={"Authorization": f"Bearer {crm_token}"})
    # except Exception:
    #     pass

    return crm_payload

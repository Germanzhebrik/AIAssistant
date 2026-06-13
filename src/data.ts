import { Profile, GlossaryTerm } from "./types";

export const glossaryTerms: GlossaryTerm[] = [
  {
    word: "овердрафт",
    shortDescription: "Краткосрочный кредит, позволяющий оплачивать платежи при нуле на счете.",
    detailedDescription: "Овердрафт (Overdraft) — форма краткосрочного банковского кредитования, позволяющая совершать расходные операции со счета юридического лица сверх остатка денежных средств в пределах лимита, предодобренного банком. В СберБизнесе лимит овердрафта рассчитывается автоматически на основе ежемесячных оборотов и гасится в течение 30-90 дней за счет любого входящего платежа от контрагентов. Идеально защищает белорусский бизнес от кассовых разрывов."
  },
  {
    word: "лизинг",
    shortDescription: "Аренда оборудования или автотехники с правом последующего выкупа.",
    detailedDescription: "Лизинг (Financial Lease) — соглашение, по которому лизингодатель (банк) приобретает в собственность оборудование, транспорт или недвижимость у продавца и предоставляет его за плату лизингополучателю (клиенту) во временное владение и пользование. Ключевые выгоды в Республике Беларусь: ускоренная амортизация имущества, снижение налога на прибыль (лизинговые платежи относятся на затраты), зачет входящего НДС."
  },
  {
    word: "факторинг",
    shortDescription: "Финансирование банком под уступку дебиторской задолженности.",
    detailedDescription: "Факторинг (Factoring) — финансовая сделка торгового финансирования, при которой белорусский поставщик переуступает Сбер Банку право требования оплаты по контракту с отсрочкой платежа. Банк сразу выплачивает до 95% лимита дебиторской задолженности, позволяя поставщику не ждать оплаты неделями от партнеров/покупателей, а дебитор позднее оплачивает задолженность уже на счета банка."
  },
  {
    word: "валютный контроль",
    shortDescription: "Надзор за проведением валютных расчетов с зарубежными партнерами в РБ.",
    detailedDescription: "Валютный контроль (Currency Control) — государственный контроль за исполнением требований валютного законодательства при осуществлении внешнеторговой деятельности. В Республике Беларусь Сбер Банк выступает агентом валютного контроля. Валютные договоры с нерезидентами, у которых общая сумма обязательств превышает 2000 базовых величин для ИП и 4000 базовых величин для юридических лиц, подлежат обязательной регистрации клиентом на веб-портале Национального банка РБ."
  },
  {
    word: "нсбу",
    shortDescription: "Национальные стандарты бухгалтерского учета — правила отчетности в РБ.",
    detailedDescription: "НСБУ (Национальные Стандарты Бухгалтерского Учета) — свод правил и законодательных требований к ведению бухгалтерского учета и отчетности в Республике Беларусь. В СберБизнесе ИИ-помощник адаптирован под стандарты НСБУ для корректного ведения бухгалтерских документов, автоматического расчета УСН и снижения рисков приостановления операций налоговыми органами (ИМНС)."
  },
  {
    word: "кэшпулинг",
    shortDescription: "Консолидация денежных средств группы компаний на пуловых счетах.",
    detailedDescription: "Кэшпулинг (Cash Pooling) — инструмент централизованного управления ликвидностью группы связанных белорусских предприятий или филиалов компании. Позволяет автоматически перераспределять остатки средств со всех счетов пула в конце каждого рабочего дня, сокращая необходимость в сторонних кредитах одного филиала за счет свободных избыточных средств другого."
  }
];

export const bankProfiles: Profile[] = [
  {
    id: "profile-dir",
    role: "director",
    name: "Алексей Викторович Козлов",
    roleLabel: "Владелец бизнеса / ИП",
    companyName: "ООО 'ТехноПром'",
    segment: "Малый и Средний Бизнес (SME)",
    availableOffers: [
      {
        id: "offer-loan-1",
        title: "Кредит 'Оборотный'",
        description: "Финансирование оборотного капитала по субсидированной ставке 11.5% годовых в BYN.",
        badge: "Спецпредложение",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
        icon: "TrendingUp"
      },
      {
        id: "offer-leasing-1",
        title: "Экспресс-Лизинг",
        description: "Оформление автотранспорта и оборудования за 1 день. Аванс от 0%, скидки на технику белорусского производства.",
        badge: "Льготный лизинг",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
        icon: "Truck"
      },
      {
        id: "offer-overdraft-1",
        title: "Овердрафт 'Бизнес-Старт'",
        description: "Защита от кассовых разрывов. Лимит до 150 000 BYN без залогов под обороты компании.",
        badge: "Без залога",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
        icon: "Zap"
      }
    ]
  },
  {
    id: "profile-acc",
    role: "accountant",
    name: "Ольга Николаевна Смирнова",
    roleLabel: "Главный бухгалтер",
    companyName: "ИП Смирнова О.Н.",
    segment: "Микробизнес",
    availableOffers: [
      {
        id: "offer-payroll-1",
        title: "Зарплатный проект Сбера",
        description: "Бесплатное подключение. 0% комиссии на зачисление зарплат сотрудникам на карты БЕЛКАРТ/Visa Сбера.",
        badge: "Популярно",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-200",
        icon: "Users"
      },
      {
        id: "offer-accounting-1",
        title: "Моя Бухгалтерия Онлайн",
        description: "Автоматический расчет налога по УСН 6% в Беларуси бесплатно первые 3 месяца обслуживания.",
        badge: "Подарок",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
        icon: "BookOpen"
      },
      {
        id: "offer-tax-check",
        title: "Экспресс-аудит налогов",
        description: "Комплексная проверка налоговых рисков перед сдачей отчетности по НСБУ со скидкой 50% от партнеров Сбера.",
        badge: "Безопасность",
        badgeColor: "bg-red-100 text-red-800 border-red-200",
        icon: "ShieldAlert"
      }
    ]
  },
  {
    id: "profile-emp",
    role: "employee",
    name: "Дмитрий Игоревич Петров",
    roleLabel: "Сотрудник",
    companyName: "ООО 'ТехноПром'",
    segment: "Малый и Средний Бизнес (SME)",
    availableOffers: [
      {
        id: "offer-edu-1",
        title: "Курсы СберУниверситета",
        description: "Бесплатное обучение по бизнес-аналитике и повышению квалификации сотрудников холдинга.",
        badge: "Обучение",
        badgeColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: "BookOpen"
      },
      {
        id: "offer-travel-1",
        title: "СберБизнес Командировки",
        description: "Удобный сервис покупки билетов и бронирования гостиниц в Беларуси и СНГ со скидкой до 10% для сотрудников.",
        badge: "Новинка",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
        icon: "Truck"
      }
    ]
  }
];

export const techDocsHtml = `
## АРХИТЕКТУРНЫЙ ПЛАН И БАЗА ДАННЫХ

Интеграция ИИ-помощника в корпоративный интернет-банк уровня Enterprise (на примере ОАО «Сбер Банк» Беларусь) строится по микросервисной схеме с соблюдением стандартов безопасности Республики Беларусь и требований Нацбанка РБ.

\`\`\`
                                  ┌────────────────────────┐
                                  │ СберБизнес Web / App   │
                                  └───────────┬────────────┘
                                              │
                                              ▼ HTTPS / WSS
                                  ┌────────────────────────┐
                                  │   Gateway API (K8s)    │
                                  └───────────┬────────────┘
                                              │ JWT Auth
                                              ▼
                                  ┌────────────────────────┐
                                  │ Middleware / Auth BFF  │
                                  └───────────┬────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼ gRPC                                              ▼ gRPC
      ┌───────────────────────────┐                       ┌───────────────────────────┐
      │  AI Assistant Microservice│                       │     Support CRM Hub        │
      │   (Python / FastAPI)      │                       │     (Operator Queue)      │
      └──────┬─────────────┬──────┘                       └─────────────▲─────────────┘
             │             │                                            │
             │ SQL         │ REST                                       │ CRM API
             ▼             ▼                                            │
      ┌───────────┐  ┌─────────────┐                                    │
      │ Postgres  │  │ Gemini API  │────────────────────────────────────┘
      │  Chat DB  │  │   Proxy     │       call_operator callback
      └───────────┘  └─────────────┘
\`\`\`

---

### РАЗДЕЛ 1. ПЕРЕДАЧА КОНТЕКСТА ОПЕРАТОРУ (Служба поддержки)

Когда модель ИИ обнаруживает тупиковую ситуацию в диалоге или получает прямой запрос на оператора, она инициирует триггер \`call_operator\`.
Бэкенд формирует стандартизированную сессионную карточку и отправляет её в банковскую CRM-систему (в очередь распределения операторов поддержки Сбера).

#### Схема JSON-пакета контекста для CRM поддержки в Беларуси:
\`\`\`json
{
  "session_id": "9a1bf052-bbaf",
  "client_id": "cli_BY_1020409",
  "company_unp": "191234567",
  "company_name": "ООО 'ТехноПром'",
  "user_role": "director",
  "current_page_url": "https://www.sber-bank.by/corporate",
  "summary": {
    "issue_summary": "Клиент интересуется условиями овердрафта, но хочет ставку ниже базовых 11.5% или лимит больше 150 000 BYN.",
    "detected_intent": "get_credit_conditions_negotiation",
    "bot_resolved": false
  },
  "raw_chat_history": [
    {"role": "user", "text": "..."},
    {"role": "assistant", "text": "..."}
  ]
}
\`\`\`

#### Python-функция подготовки саммари и отправки в CRM поддержки:
\`\`\`python
import os
import httpx
from google import genai
from google.genai import types

# Инициализация официального клиента @google/genai
ai = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

async def handoff_to_human_operator(chat_history: list, current_url: str, user_profile: dict) -> dict:
    """
    Анализирует историю чата с помощью Gemini 3.5,
    формирует технический паспорт обращения и регистрирует его в CRM оператора в РБ.
    """
    # 1. Формируем историю чата для подачи в модель
    formatted_chat_lines = []
    for msg in chat_history:
        formatted_chat_lines.append(f"{msg['role'].upper()}: {msg['content']}")
    chat_log = "\\n".join(formatted_chat_lines)

    # 2. Инструкция для Gemini по суммаризации
    system_prompt = (
        "Ты — аналитический модуль интернет-банка СберБизнес (Беларусь). \\n"
        "Твоя задача — проанализировать лог переписки ассистента с клиентом, "
        "выделить суть затруднения клиента, определить его истинную цель (intent) "
        "и вернуть строго структурированный JSON."
    )

    prompt = (
        f"История диалога:\\n{chat_log}\\n\\n"
        f"Текущий URL страницы клиента: {current_url}\\n"
        f"Профиль клиента: Имя: {user_profile.get('name')}, Роль: {user_profile.get('role')}\\n\\n"
        "Сгенерируй JSON-документ со следующими полями:\\n"
        "- issue_summary: Сжатое описание проблемы на русском (макс 100 символов)\\n"
        "- user_intent: Истинная цель клиента (например, 'овердрафт', 'налоговая_отчетность')\\n"
        "- current_url: Текущий адрес страницы\\n"
        "- urgency: Уровень приоритета (high/medium/low) на основе тональности клиента."
    )

    try:
        response = ai.models.generate_content(
            model="gemini-3.1-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        # Получаем очищенный результат
        summary_data = response.text
    except Exception as e:
        # Резервный вариант при сбое сети API
        summary_data = f'{{ "issue_summary": "Запрос вызова оператора", "user_intent": "manual_support", "current_url": "{current_url}", "urgency": "high" }}'

    # 3. Формируем финальный пакет для интеграционного шлюза CRM поддержки
    payload = {
        "client_metadata": {
            "name": user_profile.get("name"),
            "company_name": user_profile.get("company_name"),
            "role": user_profile.get("role")
        },
        "support_summary": summary_data,
        "chat_history_log": chat_history,
        "channel": "WEB_ASSISTANT_AI"
    }

    # 4. Отправляем в API техподдержки ОАО «Сбер Банк»
    crm_endpoint = "https://api-support.sber-bank.by/v2/tickets/inject"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"Authorization": f"Bearer {os.getenv('CRM_SVC_TOKEN')}", "Content-Type": "application/json"}
            # В продакшене раскомментировать:
            # r = await client.post(crm_endpoint, json=payload, headers=headers)
            # return r.json()
            pass
    except Exception as e:
        print(f"CRM Sync failed, fallback to local memory queue. Error: {e}")

    return payload
\`\`\`

---

### РАЗДЕЛ 2. СОХРАНЕНИЕ ИСТОРИИ МЕЖДУ СЕССИЯМИ

Для сохранения диалогов малого и среднего бизнеса в белорусском Сбер Банке используется СУБД PostgreSQL.

#### Схема PostgreSQL (DDL) для Республики Беларусь:
\`\`\`sql
-- 1. Таблица профилей пользователей / представителей компаний (УНП в Беларуси)
CREATE TABLE user_profiles (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    unp VARCHAR(9) NOT NULL, -- УНП имеет ровно 9 знаков
    role VARCHAR(20) CHECK (role IN ('director', 'accountant')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица диалоговых сессий чата
CREATE TABLE chat_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    current_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Таблица сообщений диалога
CREATE TABLE chat_messages (
    message_id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system', 'operator')),
    content TEXT NOT NULL,
    is_operator_call BOOLEAN DEFAULT FALSE,
    crm_ticket_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);
CREATE INDEX idx_sessions_user ON chat_sessions(user_id);
\`\`\`

---

### РАЗДЕЛ 3. РЕШЕНИЕ БИЗНЕС-ЗАДАЧ В СБЕРБИЗНЕСЕ РБ

#### 1. Снижение порога входа (Financial Jargon Highlights):
Финансовая сфера изобилует терминами вроде *овердрафт*, *факторинг*, *лизинг*, *валютный контроль*. Наш фронтенд парсит ответы модели и подсвечивает термины.
При клике на такое слово на фронтенде срабатывает поповер с развернутым доступным определением под белорусские реалии без ухода клиента со страницы.

#### 2. Динамическая контекстная персонализация & Кросс-сейл:
Бэкенд БФФ (BFF) перед генерацией системного промпта извлекает токен и выгружает профиль клиента в РБ.
- На основе профиля директора промпт автоматически инжектирует офферы кредитования и кэшпулинга.
- Для бухгалтера промпт заряжается триггерами сдачи отчетностей НСБУ Республики Беларусь и зарплатными проектами.
Интерфейс подгружает персонализированные виджеты справа, предлагая прямо из чата подать заявку в один клик.
`;

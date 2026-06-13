import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const isCJS = typeof module !== "undefined" && typeof module.exports !== "undefined";
const myDirname = isCJS ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Robust retry and model fallback utility for general stability and avoiding 503 errors during traffic spikes
async function generateGeminiWithRetry(ai: GoogleGenAI, params: { model: string; contents: any; config?: any }, maxRetries = 2) {
  // Use gemini-3.1-flash as the primary choice as requested, and fallback to gemini-3.1-flash-lite
  const modelsToTry = ["gemini-3.1-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${modelName} (attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Error using model ${modelName} on attempt ${attempt + 1}: ${err.message || err}`);

        // Wait with exponential backoff on transient errors before retrying
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

// Read knowledge base
interface BankProduct {
  category: string;
  name: string;
  official_link: string;
  description: string;
  conditions: string;
  detailedDescription?: string;
}

interface FaqItem {
  keywords: string[];
  answer: string;
  link: string;
}

interface KnowledgeBase {
  bank_products: BankProduct[];
  faq: FaqItem[];
}

function getKnowledgeBase(): KnowledgeBase | null {
  try {
    const kbPath = path.join(process.cwd(), "backend", "knowledge_base.json");
    if (fs.existsSync(kbPath)) {
      return JSON.parse(fs.readFileSync(kbPath, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading knowledge base:", err);
  }
  return null;
}

// In-memory Session Store for Demo Persistence
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'operator';
  content: string;
  timestamp: string;
  callOperator?: boolean;
  operatorSummary?: any;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  role: 'director' | 'accountant';
  messages: Message[];
}

const SESSIONS_FILE = path.join(process.cwd(), "node_modules", ".cache", "sessions_store.json");

const defaultSessions: ChatSession[] = [
  {
    id: "session-dir-1",
    role: "director",
    title: "Кредитная линия и овердрафт",
    date: "01.06.2026",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Добрый день! Какая сейчас ставка по кредитам для малого бизнеса? У нас ООО 'ТехноПром', занимаемся поставками оборудования.",
        timestamp: "01.06.2026, 12:30:15"
      },
      {
        id: "m2",
        role: "assistant",
        content: "Здравствуйте! Для **ООО 'ТехноПром'** доступно несколько программ финансирования. В рамках программы оборотного кредитования базовая ставка составляет **от 11.5% годовых в BYN**. Также доступен экспресс-овердрафт для покрытия кассовых разрывов с лимитом до 150 000 BYN без залога. Хотите, рассчитаем индивидуальные условия по кредиту?",
        timestamp: "01.06.2026, 12:31:02"
      }
    ]
  },
  {
    id: "session-acc-1",
    role: "accountant",
    title: "Проверка валютного контроля",
    date: "03.06.2026",
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Подскажите, какие документы нужно предоставить для валютного контроля по импортному контракту на 45 000 USD?",
        timestamp: "03.06.2026, 15:40:00"
      },
      {
        id: "m4",
        role: "assistant",
        content: "Для импортного контракта на сумму 45 000 USD (что превышает эквивалент 4000 базовых величин), вам требуется **зарегистрировать валютный договор** на веб-портале Национального банка Республики Беларусь до совершения платежа. Мы в Сбер Банке поможем вам корректно заполнить все сведения для Нацбанка, регистрация займет до 1 рабочего дня.",
        timestamp: "03.06.2026, 15:41:10"
      }
    ]
  }
];

function loadSessions(): ChatSession[] {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading sessions from JSON file:", err);
  }
  return defaultSessions;
}

function saveSessions(sessions: ChatSession[]) {
  try {
    const dir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving sessions to JSON file:", err);
  }
}

let mockSessions: ChatSession[] = loadSessions();

// Glossary of corporate finance terms in Belarus
const glossary: Record<string, { term: string, short: string, full: string }> = {
  "овердрафт": {
    term: "Овердрафт",
    short: "Краткосрочный кредит, позволяющий оплачивать счета при нулевом балансе счета.",
    full: "Овердрафт — форма краткосрочного кредита, при которой банк осуществляет списание средств со счета клиента сверх остатка на нем в пределах установленного договором лимита. В СберБизнесе доступен умный экспресс-овердрафт без залога, гасящийся автоматически при любых входящих поступлениях на расчетный счет."
  },
  "лизинг": {
    term: "Лизинг",
    short: "Долгосрочная аренда имущества (транспорт, спецтехника, недвижимость) с последующим выкупом.",
    full: "Лизинг (финансовая аренда) — вид финансовых услуг, форма кредитования при приобретении основных фондов предприятиями. Банк покупает имущество у продавца и передает его в аренду клиенту со льготным налогообложением (НДС подлежит зачету, платежи уменьшают налог на прибыль)."
  },
  "факторинг": {
    term: "Факторинг",
    short: "Финансирование под уступку дебиторской задолженности (покупатель платит позже, банк выдает деньги сразу).",
    full: "Факторинг — комплекс финансовых услуг для производителей и поставщиков, реализующих продукцию на условиях отсрочки платежа. Заменяет классический оборотный кредит, исключает риски неплатежа со стороны дебиторов."
  },
  "валютный контроль": {
    term: "Валютный контроль",
    short: "Государственный надзор за законностью проведения валютных операций и расчетов по внешнеторговым сделкам в РБ.",
    full: "Валютный контроль — контроль органов и агентов валютного контроля за соблюдением валютного законодательства Республики Беларусь. Сбер Банк выступает агентом валютного контроля, помогая бизнесу правильно регистрировать валютные договоры на веб-портале Нацбанка РБ (свыше 2000 базовых величин для ИП и 4000 базовых величин для юрлиц) и оформлять валютные переводы."
  },
  "нсбу": {
    term: "НСБУ",
    short: "Национальные стандарты бухгалтерского учета — обязательные правила ведения учета в РБ.",
    full: "НСБУ (Национальные стандарты бухгалтерского учета) — совокупность стандартов и норм законодательства Республики Беларусь, регулирующих ведения бухгалтерского учета и составления отчетности. Обязательны для всех юридических лиц в Беларуси. Отличаются от международных стандартов (МСФО) методологией оценки активов."
  },
  "кэшпулинг": {
    term: "Кэшпулинг",
    short: "Управление ликвидностью группы компаний путем консолидации денежных средств холдинга на пуловых счетах.",
    full: "Кэшпулинг (Cash Pooling) — инструмент оптимизации финансовых потоков группы связанных компаний, позволяющий автоматически перераспределять ликвидность между счетами пула для минимизации процентных расходов по овердрафтам и максимизации доходов на остатки."
  }
};

// API: List Sessions
app.get("/api/sessions", (req, res) => {
  res.json(mockSessions);
});

// API: Save messages to session
app.post("/api/sessions/:id/messages", (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const session = mockSessions.find(s => s.id === id);
  if (session) {
    session.messages.push({
      id: "msg-" + Date.now(),
      role: message.role,
      content: message.content,
      timestamp: new Date().toLocaleString("ru-RU"),
      callOperator: message.callOperator || false,
      operatorSummary: message.operatorSummary || null
    });
    saveSessions(mockSessions);
    res.json({ success: true, session });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

// API: Create new session
app.post("/api/sessions/new", (req, res) => {
  const { role, title } = req.body;
  const newSession: ChatSession = {
    id: "session-" + Date.now(),
    role: role || "director",
    title: title || (role === "director" ? "Новая консультация владельца" : "Новый запрос бухгалтера"),
    date: new Date().toLocaleDateString("ru-RU"),
    messages: []
  };
  mockSessions.unshift(newSession);
  saveSessions(mockSessions);
  res.json(newSession);
});

// Helper for High-Fidelity Mock Response Generation
function generateMockResponse(role: string, prompt: string, isOperatorRequest: boolean, currentUrl: string, detectedTerms: string[]): { content: string; callOperator: boolean; operatorSummary: any; detectedTerms: string[] } {
  const kb = getKnowledgeBase();
  let reply = "";
  let matchedFaq = null;
  let matchedProduct = null;

  if (kb) {
    const pLower = prompt.toLowerCase();
    // Search FAQ first
    matchedFaq = kb.faq.find(item =>
      item.keywords.some(kw => pLower.includes(kw.toLowerCase()))
    );

    // Search Products (by category keywords, name or description)
    matchedProduct = kb.bank_products.find(prod => {
      const prodName = prod.name.toLowerCase();
      const prodDesc = prod.description.toLowerCase();
      const prodCat = prod.category.toLowerCase();

      if (pLower.includes(prodName)) return true;
      if (pLower.includes("кредит") || pLower.includes("овердрафт") || pLower.includes("деньги") || pLower.includes("финанс") || pLower.includes("оборотно")) {
        return prodCat === "loans";
      }
      if (pLower.includes("лизинг")) {
        return prodCat === "leasing";
      }
      if (pLower.includes("валют") || pLower.includes("импорт") || pLower.includes("экспорт") || pLower.includes("контрол")) {
        return prodCat === "foreign_exchange";
      }
      if (pLower.includes("бухгалтер") || pLower.includes("налог") || pLower.includes("отчет") || pLower.includes("декларац") || pLower.includes("нрд") || pLower.includes("нсбу")) {
        return prodCat === "taxes";
      }
      if (pLower.includes("зарплат") || pLower.includes("сотрудник") || pLower.includes("кадр")) {
        return prodCat === "payroll";
      }
      if (pLower.includes("карт") || pLower.includes("бизнес-карт") || pLower.includes("корпоративн")) {
        return prodCat === "cards";
      }
      if (pLower.includes("депозит") || pLower.includes("вклад") || pLower.includes("калькулятор")) {
        return prodCat === "deposits";
      }
      return false;
    });
  }

  // Build responsive text using KB matched elements or standard roles
  if (isOperatorRequest) {
    reply = "🤝 Перевожу диалог на живого специалиста технической поддержки СберБизнес. Наш оператор изучит контекст вашего чата и подключится в течение 2 минут. Пожалуйста, оставайтесь на линии.";
  } else if (matchedFaq) {
    reply = `${matchedFaq.answer}\n\n🔗 Рекомендуем ознакомиться подробнее: [Раздел СберБизнес](${matchedFaq.link})`;
  } else if (matchedProduct) {
    reply = `**Продукт: ${matchedProduct.name}**\n\n${matchedProduct.detailedDescription || matchedProduct.description}\n\n🏷️ Категория: ${matchedProduct.category === "loans" ? "Кредиты и овердрафты" : matchedProduct.category === "leasing" ? "Лизинг спецтехники/авто" : matchedProduct.category === "foreign_exchange" ? "Валютные операции" : matchedProduct.category === "taxes" ? "Налоги и бухгалтерия" : "Расчетно-кассовое обслуживание"}\n\n🔗 [Оформить заявку на sber-bank.by](${matchedProduct.official_link || "https://www.sber-bank.by/corporate"})`;
  } else {
    // Standard role-based responses for missing prompts
    if (role === "director") {
      reply = "Приветствую Вас! Как директор компании, вы имеете полный доступ ко всем функциям СберБизнес: подключению кредитных линий, одобрению овердрафтов, лизинговым сделкам и управлению свободными средствами холдинга. Чем я могу помочь вам настроить или рассчитать сегодня?";
    } else {
      reply = "Здравствуйте! Рад помочь главному бухгалтеру компании. Я знаю нюансы НСБУ Республики Беларусь, правила регистрации валютных договоров в Нацбанке РБ, ведение УСН и подготовку документов на зарплатный проект. С каким вопросом помочь в первую очередь?";
    }
  }

  // Highlight keywords
  reply = reply.replace(/\b(овердрафт|лизинг|факторинг|валютный контроль|нсбу|кэшпулинг)\b/gi, (match) => `**${match}**`);

  return {
    content: reply,
    callOperator: isOperatorRequest,
    operatorSummary: isOperatorRequest ? {
      issueSummary: "Клиент запросил ручную помощь специалиста поддержки.",
      userIntent: matchedProduct ? matchedProduct.name : "manual_support",
      currentPageUrl: currentUrl || "https://www.sber-bank.by/corporate",
      chatSessionId: "session-fallback-id"
    } : null,
    detectedTerms
  };
}

// API: Chat endpoint with Gemini execution & robust simulation engine fallback
app.post("/api/chat", async (req, res) => {
  const { role, prompt, history, currentUrl, companyContext } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // Non-greedy strict regex check for manual human operator demands
  const pLower = (prompt || "").toLowerCase();
  const isOperatorRequest =
    /\b(позови|свяжи|переведи|сопряги|соедини|переключи|зови|ассистент|не понимаю|напиши)\b.*\b(оператор|человек|специалист|поддержк|живой|человека)\b/gi.test(prompt) ||
    /\b(оператор в чат|живой оператор|связать с оператором|переключить на оператора|переведи на человека|позови человека|свяжи с человеком|зови специалиста|позови оператора|свяжите с оператором|переведите на оператора|переключите на оператора|позовите человека|живого оператора|свяжите с человеком|зовите специалиста|позовите оператора)\b/gi.test(prompt);

  // Define glossary keywords found in prompt for enhancement
  const detectedTerms = Object.keys(glossary).filter(term => pLower.includes(term));
  const kb = getKnowledgeBase();

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "MOCK_KEY") {
    // Elegant system mockup responses if no actual API key exists
    console.log("No Gemini API Key provided. Running high-fidelity local bank simulation engine.");

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const simulatedVal = generateMockResponse(role, prompt, isOperatorRequest, currentUrl, detectedTerms);
    return res.json(simulatedVal);
  }

  // Real Gemini Model Execution using @google/genai SDK
  try {
    const ai = getGeminiClient();

    // Context preparation
    const offersContextText = role === "director"
      ? "- Кредит на развитие: 11.5% годовых в BYN, до 100 000 BYN.\n- Лизинг спецтехники: аванс 0%, льготы на белорусские товары.\n- Депозит 'Бизнес-Стимул': до 10% годовых в BYN."
      : "- Зарплатный проект Сбера: 0% комиссии на зачисление на карты БЕЛКАРТ.\n- Сервис 'Моя Бухгалтерия Онлайн': бесплатная отчетность УСН 3 месяца.\n- Валютный контроль: льготный курс обмена на валютном портале РБ.";

    const systemInstruction = `Ты — высокотехнологичный Enterprise ИИ-Ассистент для веб-версии интернет-банка СберБизнес (ОАО «Сбер Банк» Беларусь).
Твоя цель — оказывать экспертную поддержку клиентам банка в Республике Беларусь, помогая им решать повседневные задачи в рамках их корпоративных полномочий, снижать порог входа в сложные финансовые продукты и ненавязчиво осуществлять кросс-сейл подходящих спецпредложений.

Профиль активного пользователя:
- Роль в компании: ${role === "director" ? "Владелец бизнеса / ИП (CEO ООО 'ТехноПром')" : "Главный Бухгалтер ИП Смирнова"}
- Юридическое лицо: ${companyContext || (role === "director" ? "ООО 'ТехноПром'" : "ИП Смирнова")}

ПРАВА И ОГРАНИЧЕНИЯ ДЛЯ РОЛЕЙ:
1. Владелец бизнеса / ИП (role: "director"): Полный доступ к финансовой информации. Может проверять любые балансы в BYN и валютах, выписки, одобрять овердрафты и кредиты, проводить расходы в любом размере.
2. Главный бухгалтер (role: "accountant"): Доступ к подготовке платежных поручений, учету НСБУ Республики Беларусь, налогам, УСН, валютному контролю. НЕ может активировать крупные лимиты кредитования или овердрафты без электронной подписи Владельца.

Доступные спецпредложения для кросс-сейла:
${offersContextText}

ОФИЦИАЛЬНАЯ БАЗА ЗНАНИЙ БАНКА (Используй эти условия, данные и ссылки при развернутых ответах на вопросы клиента):
${kb ? JSON.stringify(kb, null, 2) : "База знаний временно недоступна. Пользуйся общими знаниями о ОАО «Сбер Банк» Беларусь."}

Правила формулирования ответов:
1. Пиши на чистом, уважительном, деловом русском языке. Избегай канцелярита, объясняй сложные вещи простыми словами.
2. Обязательно выделяй жирным шрифтом финансовые термины из следующего глоссария (чтобы фронтенд мог подсветить их и сделать подсказки): овердрафт, лизинг, факторинг, валютный контроль, нсбу, кэшпулинг. Пиши их точно в таком регистре или склонениях (вместо рсбу теперь используется нсбу!).
3. Персонализация: Учитывай роль. Директору предлагай кредиты, вклады, лизинг, ликвидность в BYN. Бухгалтеру — отчеты, налоги, автоматизация счетов, НСБУ, платежные поручения, регистрацию договоров в Нацбанке РБ.
4. ССЫЛКИ НА СТРАНИЦЫ БАНКА: Если в базе знаний приведены официальные ссылки (official_link или link) для упомянутого продукта или вопроса, ты ОБЯЗАН внедрить их в ответ в markdown формате: [Название ссылки](URL_ссылки). Не выдумывай ссылки, которых нет в базе знаний. Всегда ориентируйся на домен sber-bank.by.
5. ТОЛЬКО ЕСЛИ пользователь прямо и настойчиво просит переключить на человека (или просит позвать оператора, или крайне раздражен текущим качеством авто-ответов и явно отказывается беседовать с роботом), ТЫ ОБЯЗАН завершить свой ответ специальной строкой в самом конце на отдельной строке:
[CALL_OPERATOR_TRIGGER]
Во всех остальных случаях, если пользователь задает обычные или справочные вопросы о СберБизнесе, поддержке, НСБУ и т.д., НИКОГДА не выводи эту метку! Отвечай самостоятельно с опорой на базу знаний.

История переписки для соблюдения контекста диалога:
${JSON.stringify(history || [])}
Текущая страница (URL) в СберБизнесе, где находится клиент: ${currentUrl || 'https://www.sber-bank.by/corporate'}`;

    // Execute content generation with robust fallback and retry mechanisms
    const response = await generateGeminiWithRetry(ai, {
      model: "gemini-3.1-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    let resultText = response.text || "";
    let callOperator = false;
    let operatorSummary = null;

    if (resultText.includes("[CALL_OPERATOR_TRIGGER]") || isOperatorRequest) {
      callOperator = true;
      resultText = resultText.replace("[CALL_OPERATOR_TRIGGER]", "").trim();

      // Implement Operator Summarization process using Gemini!
      try {
        const summaryPrompt = `Сделай краткое структурированное саммари диалога для системы CRM оператора поддержки в Республике Беларусь.
        История чата: ${JSON.stringify(history || [])}
        Последний запрос пользователя: "${prompt}"
        Текущий URL страницы СберБизнес: "${currentUrl || 'https://www.sber-bank.by/corporate'}"

        Верни JSON-объект со следующими полями:
        - issueSummary: Суть проблемы клиента (одно предложение)
        - userIntent: Что именно клиент пытался сделать (например, оформить кредит, сдать отчетность)
        - currentPageUrl: На каком URL находится
        - chatSessionId: Идентификатор сессии (сгенерируй случайный)`;

        const summaryResponse = await generateGeminiWithRetry(ai, {
          model: "gemini-3.1-flash",
          contents: summaryPrompt,
          config: {
            responseMimeType: "application/json",
            systemInstruction: "Ты — интеграционный модуль банка ОАО «Сбер Банк» Беларусь. Извлекаешь контекст чата для передачи в службу поддержки операторам."
          }
        });

        const summaryJsonText = summaryResponse.text || "{}";
        operatorSummary = JSON.parse(summaryJsonText.trim());
      } catch (sumErr) {
        console.error("Error generating operator summary via Gemini:", sumErr);
        operatorSummary = {
          issueSummary: `Клиент запросил переключение на оператора.`,
          userIntent: "Запрос ручной помощи специалиста технической поддержки.",
          currentPageUrl: currentUrl || "https://www.sber-bank.by/corporate",
          chatSessionId: "session-fallback-id"
        };
      }
    }

    res.json({
      content: resultText,
      callOperator,
      operatorSummary,
      detectedTerms
    });

  } catch (err: any) {
    console.error("Gemini runtime error, falling back to local simulation:", err);
    // Gracefully handle Gemini failures by falling back to high-fidelity dynamic simulated values.
    const mockFallback = generateMockResponse(role, prompt, isOperatorRequest, currentUrl, detectedTerms);

    // Parse Google GenAI raw JSON error message/object safely
    let cleanErrMessage = "Ошибка API (Service Unavailable)";
    if (err) {
      if (typeof err.message === 'string') {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error && parsed.error.message) {
            cleanErrMessage = parsed.error.message;
          } else {
            cleanErrMessage = err.message;
          }
        } catch (parseEx) {
          cleanErrMessage = err.message;
        }
      } else if (err.error && typeof err.error.message === 'string') {
        cleanErrMessage = err.error.message;
      } else if (typeof err.statusText === 'string') {
        cleanErrMessage = `${err.status || 503} ${err.statusText}`;
      } else if (err.message) {
        cleanErrMessage = String(err.message);
      } else {
        cleanErrMessage = String(err);
      }
    }

    // Supplement fallback response with a small friendly warning note to explain the situation
    mockFallback.content = `${mockFallback.content}\n\n*(Обратите внимание: Ассистент СберБизнес временно работает в режиме локальной базы знаний. Сведения ИИ: ${cleanErrMessage})*`;

    return res.json(mockFallback);
  }
});

// Serve Vite build in development, or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SberBusiness Assistant] Full stack server booted on port ${PORT}`);
  });
}

startServer();

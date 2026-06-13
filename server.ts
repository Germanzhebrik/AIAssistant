import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { mockCounterpartiesByRole } from "./src/data.ts";

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
  paymentDraft?: any;
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

// --- Reminders Management Section ---
interface Reminder {
  id: string;
  role: 'director' | 'accountant';
  text: string;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}

const REMINDERS_FILE = path.join(process.cwd(), "node_modules", ".cache", "reminders_store.json");

const defaultReminders: Reminder[] = [
  {
    id: "rem-1",
    role: "director",
    text: "Контроль валютного коридора и лимитов овердрафта",
    frequency: "Каждый понедельник в 09:00",
    isActive: true,
    createdAt: "13.06.2026, 12:00"
  },
  {
    id: "rem-2",
    role: "accountant",
    text: "Проверка сроков регистрации валютных договоров в Нацбанке РБ",
    frequency: "Каждое 15-е число месяца",
    isActive: true,
    createdAt: "13.06.2026, 12:05"
  },
  {
    id: "rem-3",
    role: "accountant",
    text: "Уплата налогов и отчетов УСН",
    frequency: "Каждый квартал до 20-го числа",
    isActive: true,
    createdAt: "13.06.2026, 12:10"
  }
];

function loadReminders(): Reminder[] {
  try {
    if (fs.existsSync(REMINDERS_FILE)) {
      const data = fs.readFileSync(REMINDERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading reminders from JSON file:", err);
  }
  return defaultReminders;
}

function saveReminders(reminders: Reminder[]) {
  try {
    const dir = path.dirname(REMINDERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving reminders to JSON file:", err);
  }
}

let mockReminders: Reminder[] = loadReminders();
// --- End Reminders Section ---

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
      operatorSummary: message.operatorSummary || null,
      paymentDraft: message.paymentDraft || null
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

// API: Get reminders for role
app.get("/api/reminders", (req, res) => {
  const { role } = req.query;
  if (role) {
    res.json(mockReminders.filter(r => r.role === role));
  } else {
    res.json(mockReminders);
  }
});

// API: Create reminder
app.post("/api/reminders", (req, res) => {
  const { role, text, frequency } = req.body;
  if (!text || !frequency) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const newReminder: Reminder = {
    id: "rem-" + Date.now(),
    role: role || "director",
    text,
    frequency,
    isActive: true,
    createdAt: new Date().toLocaleDateString("ru-RU") + " " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  };
  mockReminders.push(newReminder);
  saveReminders(mockReminders);
  res.json({ success: true, reminder: newReminder });
});

// API: Update reminder
app.put("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const { text, frequency, isActive } = req.body;
  const reminder = mockReminders.find(r => r.id === id);
  if (reminder) {
    if (text !== undefined) reminder.text = text;
    if (frequency !== undefined) reminder.frequency = frequency;
    if (isActive !== undefined) reminder.isActive = isActive;
    saveReminders(mockReminders);
    res.json({ success: true, reminder });
  } else {
    res.status(404).json({ error: "Reminder not found" });
  }
});

// API: Delete reminder
app.delete("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const index = mockReminders.findIndex(r => r.id === id);
  if (index !== -1) {
    const deleted = mockReminders.splice(index, 1);
    saveReminders(mockReminders);
    res.json({ success: true, deleted: deleted[0] });
  } else {
    res.status(404).json({ error: "Reminder not found" });
  }
});

// Helper to build deep links with prefilled GET parameters pointing to official SberBusiness payments
function getPaymentUrl(type: string, params: { recipientName: string, recipientUnp: string, recipientIban: string, recipientBank: string, amount: string, purpose: string }): string {
  const baseUrls: Record<string, string> = {
    "PAYDOCBY": "https://sbbol.sber-bank.by/document/PAYDOCBY/create",
    "INSTANT": "https://sbbol.sber-bank.by/document/INSTANT_PAYMENT_ORDER/create",
    "ERIP": "https://sbbol.sber-bank.by/erip-payments/PAYDOCBYERIP",
    "PAYDOCCUR": "https://sbbol.sber-bank.by/document/PAYDOCCUR/create",
    "CORPCARD": "https://sbbol.sber-bank.by/document/PAY_DOC_CORPO_CARD/create",
    "WAGES": "https://sbbol.sber-bank.by/document/PAYMENT_OF_WAGES/create",
    "INDIVIDUAL": "https://sbbol.sber-bank.by/document/PAYDOCSAL_WITHOUT_CONTRACT/create"
  };

  const baseUrl = baseUrls[type] || baseUrls["PAYDOCBY"];
  const url = new URL(baseUrl);
  url.searchParams.set("recipientName", params.recipientName || "");
  url.searchParams.set("recipientUnp", params.recipientUnp || "");
  url.searchParams.set("recipientIban", params.recipientIban || "");
  url.searchParams.set("recipientBank", params.recipientBank || "");
  url.searchParams.set("amount", params.amount || "");
  url.searchParams.set("currency", "BYN");
  url.searchParams.set("purpose", params.purpose || "");

  return url.toString();
}

// Helper for High-Fidelity Mock Response Generation
function generateMockResponse(role: string, prompt: string, isOperatorRequest: boolean, currentUrl: string, detectedTerms: string[]): { content: string; callOperator: boolean; operatorSummary: any; detectedTerms: string[]; paymentDraft?: any; reminderAction?: any } {
  const kb = getKnowledgeBase();
  let reply = "";
  let matchedFaq = null;
  let matchedProduct = null;
  let paymentDraft: any = null;

  const pLower = (prompt || "").toLowerCase();
  const activeRole = role === "director" ? "director" : "accountant";
  const activeCounterparties = mockCounterpartiesByRole[activeRole];

  // Determine user intent semantically without simple word triggers
  const isPaymentOrTransfer = /платеж|платёж|оплат|перевод|сделать перевод|оплати|заплати|закинь|переведи|выплати|перечисли|погаси|оформи/gi.test(pLower);
  const isHowToQuestion = /как|инструкция|правило|почему|зачем|справка|выписка|выписку/gi.test(pLower);
  const isListRequest = (/список/gi.test(pLower) || /реестр/gi.test(pLower) || /покажи.*контр/gi.test(pLower) || /выведи/gi.test(pLower) || /всех/gi.test(pLower)) && !isPaymentOrTransfer;

  const isCreateReminder = /напоминай|создай напоминание|добавь напоминание|напомни|запланируй напоминание/gi.test(pLower);
  const isDeleteReminder = /удали напоминание|выключи напоминание|удалить напоминание/gi.test(pLower);

  const wantsPaymentDraft = isPaymentOrTransfer && !isHowToQuestion && !isCreateReminder && !isDeleteReminder;
  let reminderAction: any = null;

  if (isCreateReminder) {
    let text = "Новое напоминание";
    let frequency = "Каждый первый понедельник";

    const freqMatch = prompt.match(/(каждый[^\s,]*\s+[^\s,]*\s+[^\s,]*|раз в[^\s,]*\s+[^\s,]*|ежемесячно[^\s,]*|еженедельно[^\s,]*|каждое[^\s,]*\s+[^\s,]*|каждый первый понедельник|каждый третий вторник)/i);
    if (freqMatch) {
      frequency = freqMatch[0];
    } else {
      const matchSchedule = pLower.match(/(каждый [а-я]+|раз в [а-я]+|каждое \d+-е|каждое \d+ число|каждый первый [а-я]+|каждый второй [а-я]+|каждый третий [а-я]+|каждый четвертый [а-я]+)/i);
      if (matchSchedule) {
         frequency = matchSchedule[0];
      }
    }

    let cleanedText = prompt;
    cleanedText = cleanedText.replace(/напоминай|напоминайте|создай напоминание|добавь напоминание|напомни|запланируй напоминание|пожалуйста/gi, "");
    cleanedText = cleanedText.replace(frequency, "");
    cleanedText = cleanedText.replace(/[.,!?]/g, "").trim();
    if (cleanedText.length > 3) {
      text = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
    }

    reminderAction = {
      action: "create",
      text,
      frequency
    };

    // Persist in mock Reminders list
    const newRem: Reminder = {
      id: "rem-" + Date.now(),
      role: role === "director" ? "director" : "accountant",
      text,
      frequency,
      isActive: true,
      createdAt: new Date().toLocaleDateString("ru-RU") + " " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    };
    mockReminders.push(newRem);
    saveReminders(mockReminders);

    reply = `🔔 **Напоминание успешно создано!**\n\nЯ зафиксировал новую задачу в СберБизнесе:\n• **Напоминание:** _${text}_\n• **Периодичность:** _${frequency}_\n\nВы всегда можете управлять вашими напоминаниями через чат или в панели слева.`;
  } else if (isDeleteReminder) {
    let textToFind = prompt.replace(/удали напоминание|выключи напоминание|удалить напоминание/gi, "").replace(/[.,!?]/g, "").trim();

    // Find matching reminder
    const idx = mockReminders.findIndex(r =>
      r.role === (role === "director" ? "director" : "accountant") &&
      (r.text.toLowerCase().includes(textToFind.toLowerCase()) || textToFind.toLowerCase().includes(r.text.toLowerCase()))
    );

    if (idx !== -1) {
      const deleted = mockReminders.splice(idx, 1);
      saveReminders(mockReminders);
      reminderAction = {
        action: "delete",
        id: deleted[0].id,
        text: deleted[0].text
      };
      reply = `🗑️ **Напоминание удалено!**\n\nЯ успешно удалил напоминание: _"${deleted[0].text}"_.`;
    } else {
      reply = `🔍 **Напоминание не найдено.**\n\nЯ не смог найти активное напоминание, похожее на _"${textToFind}"_. Пожалуйста, проверьте список в левой панели.`;
    }
  } else if (wantsPaymentDraft) {
    // Find matched counterparty
    let matchedC = activeCounterparties.find(c =>
      pLower.includes(c.name.toLowerCase().replace(/['"«»]/g, "")) ||
      pLower.includes(c.unp) ||
      (c.iban && pLower.includes(c.iban.toLowerCase())) ||
      (c.name.toLowerCase().includes("белаз") && pLower.includes("белаз")) ||
      (c.name.toLowerCase().includes("минскоптреклама") && pLower.includes("реклам")) ||
      (c.name.toLowerCase().includes("иванов") && pLower.includes("иванов")) ||
      (c.name.toLowerCase().includes("поставкаресурс") && pLower.includes("ресурс")) ||
      (c.name.toLowerCase().includes("бизнессервисрб") && pLower.includes("сервис")) ||
      (c.name.toLowerCase().includes("гаранттранс") && pLower.includes("гарант")) ||
      (c.name.toLowerCase().includes("торгспецбел") && pLower.includes("торг"))
    );

    // Fallback defaults
    const defaults = activeCounterparties[0];
    const recName = matchedC ? matchedC.name : defaults.name;
    const recUnp = matchedC ? matchedC.unp : defaults.unp;
    const recIban = matchedC ? matchedC.iban : defaults.iban;
    const recBank = matchedC ? matchedC.bankName : defaults.bankName;

    // Extract amount
    let amountStr = "500.00";
    const foundNumbers = pLower.match(/\b\d+(?:[\s.,]\d+)*\b/g);
    if (foundNumbers) {
      const possibleAmount = foundNumbers.find(num => {
        const cleanNum = num.replace(/\s/g, "");
        return cleanNum.length < 9 && cleanNum.length > 1; // Amount is usually shorter than IBAN or UNP
      });
      if (possibleAmount) {
        amountStr = possibleAmount.trim();
      }
    }

    // Extract purpose
    let extractedPurpose = "Оплата по договору";
    const purposeIndicators = [" за ", " по ", " на ", " назначение "];
    for (const indicator of purposeIndicators) {
      const idx = pLower.indexOf(indicator);
      if (idx !== -1) {
        const part = prompt.substring(idx + indicator.length).trim();
        if (part.length > 4) {
          extractedPurpose = part;
          break;
        }
      }
    }

    if (matchedC && extractedPurpose === "Оплата по договору") {
      extractedPurpose = `Оплата по обязательствам согласно договору ${matchedC.contract.split("№")[1] || "№1"}`;
    }

    const payType = "PAYDOCBY";
    const generatedLink = getPaymentUrl(payType, {
      recipientName: recName,
      recipientUnp: recUnp,
      recipientIban: recIban,
      recipientBank: recBank,
      amount: amountStr,
      purpose: extractedPurpose
    });

    paymentDraft = {
      recipientName: recName,
      recipientUnp: recUnp,
      recipientIban: recIban,
      recipientBank: recBank,
      amount: amountStr,
      currency: "BYN",
      purpose: extractedPurpose,
      link: generatedLink,
      paymentType: payType
    };

    reply = `Отличный запрос! Я распознал ваше намерение подготовить платеж и автоматически сформировал готовый черновик платежного поручения в СберБизнесе:\n\n` +
            `• **Получатель:** ${recName}\n` +
            `• **УНП:** ${recUnp}\n` +
            `• **IBAN счёт:** \`${recIban}\` (${recBank})\n` +
            `• **Сумма:** **${amountStr} BYN**\n` +
            `• **Назначение:** _${extractedPurpose}_\n\n` +
            `Нажмите кнопку **«Сформировать и отправить во внешний СберБизнес»** ниже для мгновенного перехода к созданию реального платежа на официальном портале Сбер Банка с заполненными реквизитами!`;
  } else if (isListRequest) {
    let listFormatted = `**Список верифицированных контрагентов для ${role === 'director' ? 'ООО "ТехноПром"' : 'ИП Смирнова О.Н.'}:**\n\n`;
    activeCounterparties.forEach((c, idx) => {
      listFormatted += `${idx + 1}. **${c.name}** (УНП ${c.unp})\n`;
      listFormatted += `   • **Счёт (IBAN):** \`${c.iban}\` (${c.bankName})\n`;
      listFormatted += `   • **Договор:** ${c.contract}\n`;
      listFormatted += `   • **Статус:** _${c.status}_\n`;
      listFormatted += `   • **Сведения:** ${c.balanceContext}\n\n`;
    });
    listFormatted += `💡 _Вы можете спросить меня подробнее о любом из этих контрагентов, поинтересоваться задолженностью или деталями договоров._`;
    reply = listFormatted;
  } else {
    // Check for specific counterparty mention
    const foundSpecific = activeCounterparties.find(c =>
      pLower.includes(c.name.toLowerCase().replace(/['"«»]/g, "")) ||
      pLower.includes(c.unp) ||
      (c.iban && pLower.includes(c.iban.toLowerCase())) ||
      (c.name.toLowerCase().includes("белаз") && pLower.includes("белаз")) ||
      (c.name.toLowerCase().includes("минскоптреклама") && pLower.includes("реклам")) ||
      (c.name.toLowerCase().includes("иванов") && pLower.includes("иванов")) ||
      (c.name.toLowerCase().includes("поставкаресурс") && pLower.includes("ресурс")) ||
      (c.name.toLowerCase().includes("бизнессервисрб") && pLower.includes("сервис")) ||
      (c.name.toLowerCase().includes("гаранттранс") && pLower.includes("гарант")) ||
      (c.name.toLowerCase().includes("торгспецбел") && pLower.includes("торг"))
    );

    if (foundSpecific) {
      reply = `**Карточка контрагента: ${foundSpecific.name}**\n\n` +
              `• **УНП:** ${foundSpecific.unp}\n` +
              `• **IBAN счёт:** \`${foundSpecific.iban}\` (${foundSpecific.bankName})\n` +
              `• **Основание / Договор:** ${foundSpecific.contract}\n` +
              `• **Текущий статус:** _${foundSpecific.status}_\n` +
              `• **Финансовые отношения:** ${foundSpecific.balanceContext}`;
    }
  }

  // If not answered by counterparties logic, search KB
  if (!reply) {
    if (kb) {
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
    detectedTerms,
    paymentDraft,
    reminderAction
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

СПИСОК ВЕРИФИЦИРОВАННЫХ КОНТРАГЕНТОВ АКТИВНОГО АККАУНТА (Хранятся на нашей стороне для тестирования. Используй эти точные реквизиты, УНП, IBAN счёта, контракты и финансовые обязательства для ответов на любые вопросы о партнерах компании):
${JSON.stringify(mockCounterpartiesByRole[role === "director" ? "director" : "accountant"], null, 2)}

Правила формулирования ответов:
1. Пиши на чистом, уважительном, деловом русском языке. Избегай канцелярита, объясняй сложные вещи простыми словами.
2. Обязательно выделяй жирным шрифтом финансовые термины из следующего глоссария (чтобы фронтенд мог подсветить их и сделать подсказки): овердрафт, лизинг, факторинг, валютный контроль, нсбу, кэшпулинг. Пиши их точно в таком регистре или склонениях (вместо рсбу теперь используется нсбу!).
3. Персонализация: Учитывай роль. Директору предлагай кредиты, вклады, лизинг, ликвидность в BYN. Бухгалтеру — отчеты, налоги, автоматизация счетов, НСБУ, платежные поручения, регистрацию договоров в Нацбанке РБ.
4. ССЫЛКИ НА СТРАНИЦЫ БАНКА: Если в базе знаний приведены официальные ссылки (official_link или link) для упомянутого продукта или вопроса, ты ОБЯЗАН внедрить их в ответ в markdown формате: [Название ссылки](URL_ссылки). Не выдумывай ссылки, которых нет в базе знаний. Всегда ориентируйся на домен sber-bank.by.
5. ТОЛЬКО ЕСЛИ пользователь прямо и настойчиво просит переключить на человека (или просит позвать оператора, или крайне раздражен текущим качеством авто-ответов и явно отказывается беседовать с роботом), выведи в JSON поле 'callOperator' в значении true.
6. РАЗГРАНИЧЕНИЕ ЗАПРОСОВ ПО КОНТРАГЕНТАМ:
   - Если пользователь просит вывести список или реестр контрагентов (например, "Выведи мне список контрагентов", "Покажи список партнеров", "реестр контрагентов", "список контрагентов"), ты должен вывести полный структурированный список верифицированных контрагентов активного аккаунта со всеми реквизитами.
   - Если пользователь спрашивает, КАК сделать платеж, платить или переводить деньги контрагенту/партнеру (например, "Как сделать платеж контрагенту", "как перевести деньги контрагенту", "оплата партнеру"), ты НЕ должен выводить список контрагентов! Вместо этого ответь общей или детальной инструкцией по созданию платежного поручения в СберБизнесе из базы знаний (с упоминанием кнопки «Создать документ» и выбором нужного типа операции типа Платежное поручение BYN внутри РБ, мгновенный платеж и т.д.).
   - Принимай это решение интеллектуально, оценивая значение и грамматическую конструкцию фразы пользователя. Никаких простых триггеров на слово "контрагент" быть не должно!
7. Оформление черновика платежа (paymentDraft):
   Если пользователь просит подготовить платеж, сделать перевод, оформить платежку или перечислить деньги конкретному контрагенту (с указанием контрагента, суммы или назначения платежа), заполни объект paymentDraft в JSON. Извлеки все данные из списка верифицированных контрагентов. Например, если пользователь говорит 'Оплати Белазу 1500 рублей', ты должен сопоставить 'Белаз' с ОАО 'БелАЗ' из списка, подставить его UNP, IBAN и банк, а в поле amount записать '1500'. Если в запросе указана за задолженность, услуги или запчасти, заполни purpose. Если пользователь просто интересуется 'как сделать платеж', paymentDraft должен быть строго null.
8. Управление напоминаниями (reminderAction):
   Если пользователь просит создать напоминание (например, "напоминай платить налоги каждый первый понедельник", "напомни проверить счета по пятницам"), ты должен заполнить поле 'reminderAction' как { "action": "create", "text": "Текст напоминания", "frequency": "каждый первый понедельник" }, выделив тему напоминания в 'text' и его периодичность в 'frequency'. Если пользователь просит удалить напоминание (например, "удали напоминание про проверку счетов", "выключи напоминание про налоги"), заполни 'reminderAction' как { "action": "delete", "text": "проверка счетов" }. Твой ответ (в поле 'content') должен подтвердить создание или удаление этого напоминания. Если запрос не связан с напоминаниями, то reminderAction должен быть null.

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
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            content: {
              type: "STRING",
              description: "Основной текстовый ответ ассистента со всей справочной информацией и подсветкой финансовых терминов. Применяй Markdown."
            },
            callOperator: {
              type: "BOOLEAN",
              description: "Установи в true, только если пользователь просит переключить его на живого оператора."
            },
            paymentDraft: {
              type: "OBJECT",
              description: "Заполняется только у пользователя есть ПРЯМОЙ запрос на осуществление платежа, перевод денег или создание платежного поручения контрагенту (с указанием суммы или конкретного партнера). Если пользователь задает справочный вопрос 'как сделать платеж', это поле должно быть null.",
              properties: {
                recipientName: { type: "STRING", description: "Наименование получателя" },
                recipientUnp: { type: "STRING", description: "УНП получателя" },
                recipientIban: { type: "STRING", description: "IBAN получателя" },
                recipientBank: { type: "STRING", description: "Банк получателя" },
                amount: { type: "STRING", description: "Сумма платежа числом" },
                currency: { type: "STRING", description: "Валюта платежа (BYN)" },
                purpose: { type: "STRING", description: "Назначение платежа" },
                paymentType: { type: "STRING", description: "Тип документа. Обычно PAYDOCBY" }
              },
              required: ["recipientName", "recipientUnp", "recipientIban", "recipientBank", "amount", "currency", "purpose", "paymentType"]
            },
            reminderAction: {
              type: "OBJECT",
              description: "Заполняется только если пользователь хочет создать или удалить напоминание. Если запрос не связан с напоминаниями, это поле должно быть null.",
              properties: {
                action: { type: "STRING", description: "Действие: 'create' или 'delete'" },
                text: { type: "STRING", description: "Текст напоминания (например, 'Платить налоги')" },
                frequency: { type: "STRING", description: "Периодичность напоминания (например, 'каждый первый понедельник')" },
                id: { type: "STRING", description: "ИД напоминания (если известен, иначе null)" }
              },
              required: ["action"]
            }
          },
          required: ["content", "callOperator"]
        }
      }
    });

    let resultText = response.text || "";
    let callOperator = false;
    let operatorSummary = null;
    let paymentDraft = null;
    let reminderAction = null;

    try {
      const parsedJson = JSON.parse(resultText.trim());
      resultText = parsedJson.content || "";
      callOperator = parsedJson.callOperator || false;

      if (parsedJson.paymentDraft) {
        const pd = parsedJson.paymentDraft;
        const pLowerVal = prompt.toLowerCase();

        // 1. Check for explicit transactional/payment action verbs
        // e.g. "оплати Белазу", "переведи Смирновой", but not informational "как перевести", "почему", "выписка"
        const hasPaymentVerbs = /(?:^|[^а-яё0-9_])(оплати|оплат|заплати|заплат|переведи|перевед|перечисл|закинь|выплати|выплат|погаси|погас|перевод|оплата|оформи|оформ|произведи|подготовь|сделай платеж|сделай перевод|платёж|платеж)(?![а-яё0-9_])/i.test(pLowerVal);
        const isHowOrInfoQuery = /(?:^|[^а-яё0-9_])(как|инструкц|справк|почему|правил|выписк|зачем|руководств)(?![а-яё0-9_])/i.test(pLowerVal);
        const isReminderPrompt = /(?:^|[^а-яё0-9_])(напомин|календар|напомни|добавь напом|запланируй напом)(?![а-яё0-9_])/i.test(pLowerVal);
        const hasDirectPaymentIntent = hasPaymentVerbs && !isHowOrInfoQuery && !isReminderPrompt;

        // 2. Reject any drafts filled with generic placeholders, "null" or "undefined" strings/values
        const hasNullOrUndefinedFields =
          !pd.recipientName || pd.recipientName.toString().trim() === "" || pd.recipientName.toString().toLowerCase() === "null" || pd.recipientName.toString().toLowerCase() === "undefined" ||
          !pd.amount || pd.amount.toString().trim() === "" || pd.amount.toString().toLowerCase() === "null" || pd.amount.toString().toLowerCase() === "undefined" || pd.amount.toString().trim() === "0";

        const isValidDraft = pd && !hasNullOrUndefinedFields && hasDirectPaymentIntent;

        if (isValidDraft) {
          const generatedLink = getPaymentUrl(pd.paymentType || "PAYDOCBY", {
            recipientName: pd.recipientName || "",
            recipientUnp: pd.recipientUnp || "",
            recipientIban: pd.recipientIban || "",
            recipientBank: pd.recipientBank || "",
            amount: pd.amount || "",
            purpose: pd.purpose || ""
          });
          paymentDraft = {
            ...pd,
            link: generatedLink
          };
        } else {
          paymentDraft = null;
        }
      }

      if (parsedJson.reminderAction) {
        reminderAction = parsedJson.reminderAction;
        const action = reminderAction.action;
        if (action === "create") {
          const pLowerValue = prompt.toLowerCase();
          const parsedText = reminderAction.text || prompt.replace(/напоминай|напоминайте|создай напоминание|добавь напоминание|напомни|запланируй напоминание/gi, "").trim();
          const cleanText = parsedText.charAt(0).toUpperCase() + parsedText.slice(1);

          let freq = reminderAction.frequency || "Каждый месяц";
          // If frequency is missing or very generic, try to extract it from the prompt
          const freqMatch = prompt.match(/(каждый[^\s,]*\s+[^\s,]*\s+[^\s,]*|раз в[^\s,]*\s+[^\s,]*|ежемесячно[^\s,]*|еженедельно[^\s,]*|каждое[^\s,]*\s+[^\s,]*|каждый первый понедельник|каждый третий вторник|каждый месяц|каждую неделю)/i);
          if (freqMatch) {
            freq = freqMatch[0];
          }

          const newRem: Reminder = {
            id: "rem-" + Date.now(),
            role: role === "director" ? "director" : "accountant",
            text: cleanText,
            frequency: freq,
            isActive: true,
            createdAt: new Date().toLocaleDateString("ru-RU") + " " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
          };
          mockReminders.push(newRem);
          saveReminders(mockReminders);
          reminderAction.id = newRem.id;
          reminderAction.text = cleanText;
          reminderAction.frequency = freq;
        } else if (action === "delete") {
          const textToFind = reminderAction.text || "";
          const tgtId = reminderAction.id;
          const idx = mockReminders.findIndex(r =>
            r.role === (role === "director" ? "director" : "accountant") &&
            (tgtId ? r.id === tgtId : (r.text.toLowerCase().includes(textToFind.toLowerCase()) || textToFind.toLowerCase().includes(r.text.toLowerCase())))
          );
          if (idx !== -1) {
            const deleted = mockReminders.splice(idx, 1);
            saveReminders(mockReminders);
            reminderAction.id = deleted[0].id;
            reminderAction.text = deleted[0].text;
          }
        }
      }

      // Fallback reinforcement check: if Gemini did NOT return structured reminderAction, but prompt is clearly a reminder intent
      if (!reminderAction) {
        const pLowerVal = prompt.toLowerCase();
        const isCreateReminder = /напоминай|создай напоминание|добавь напоминание|напомни|запланируй напоминание/gi.test(pLowerVal);
        const isDeleteReminder = /удали напоминание|выключи напоминание|удалить напоминание/gi.test(pLowerVal);

        if (isCreateReminder) {
          let freq = "Каждый месяц";
          const freqMatch = prompt.match(/(каждый[^\s,]*\s+[^\s,]*\s+[^\s,]*|раз в[^\s,]*\s+[^\s,]*|ежемесячно[^\s,]*|еженедельно[^\s,]*|каждое[^\s,]*\s+[^\s,]*|каждый первый понедельник|каждый третий вторник|каждый месяц|каждую неделю)/i);
          if (freqMatch) {
            freq = freqMatch[0];
          }

          let extractedText = prompt.replace(/напоминай|напоминайте|создай напоминание|добавь напоминание|напомни|запланируй напоминание/gi, "").replace(freq, "").replace(/[.,!?]/g, "").trim();
          if (extractedText.length < 3) {
            extractedText = "Выплата заработной платы / налоги";
          }
          const cleanText = extractedText.charAt(0).toUpperCase() + extractedText.slice(1);

          const newRem: Reminder = {
            id: "rem-" + Date.now(),
            role: role === "director" ? "director" : "accountant",
            text: cleanText,
            frequency: freq,
            isActive: true,
            createdAt: new Date().toLocaleDateString("ru-RU") + " " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
          };
          mockReminders.push(newRem);
          saveReminders(mockReminders);
          reminderAction = {
            action: "create",
            id: newRem.id,
            text: cleanText,
            frequency: freq
          };
        } else if (isDeleteReminder) {
          let textToFind = prompt.replace(/удали напоминание|выключи напоминание|удалить напоминание/gi, "").replace(/[.,!?]/g, "").trim();
          const idx = mockReminders.findIndex(r =>
            r.role === (role === "director" ? "director" : "accountant") &&
            (r.text.toLowerCase().includes(textToFind.toLowerCase()) || textToFind.toLowerCase().includes(r.text.toLowerCase()))
          );
          if (idx !== -1) {
            const deleted = mockReminders.splice(idx, 1);
            saveReminders(mockReminders);
            reminderAction = {
              action: "delete",
              id: deleted[0].id,
              text: deleted[0].text
            };
          }
        }
      }
    } catch (parseEx) {
      console.warn("[Gemini API] Error parsing structured JSON, treating raw text:", parseEx);
      if (resultText.includes("[CALL_OPERATOR_TRIGGER]") || isOperatorRequest) {
        callOperator = true;
        resultText = resultText.replace("[CALL_OPERATOR_TRIGGER]", "").trim();
      }
    }

    if (callOperator || isOperatorRequest) {
      callOperator = true;
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
      detectedTerms,
      paymentDraft,
      reminderAction
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Truck,
  Zap,
  Users,
  BookOpen,
  ShieldAlert,
  Send,
  RefreshCw,
  Play,
  ArrowRight,
  Bot,
  FileText,
  CheckCircle,
  MessageSquare,
  HelpCircle,
  Activity,
  ChevronRight,
  Sparkles,
  Code,
  Award,
  Download,
  UserCheck,
  Server,
  Database,
  ExternalLink,
  Laptop,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ArrowLeft,
  X,
  EyeOff,
  Phone,
  Bell,
  Mail,
  MoreHorizontal,
  Settings,
  CreditCard,
  Percent,
  ChevronDown,
  ArrowLeftRight,
  Trash2,
  Plus,
  Clock
} from "lucide-react";
import { bankProfiles, glossaryTerms, mockCounterpartiesByRole } from "./data";
import { Message, ChatSession, Profile, GlossaryTerm, Counterparty, Reminder } from "./types";
import { PaymentDraftCard } from "./components/PaymentDraftCard";

export default function App() {
  // Profiles & Roles State
  const [currentProfile, setCurrentProfile] = useState<Profile>(bankProfiles[0]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderFrequency, setNewReminderFrequency] = useState("Каждый первый понедельник");
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [remindersFilter, setRemindersFilter] = useState<'current' | 'all'>('current');

  // Custom Role restrictions popup state
  const [permissionDeniedText, setPermissionDeniedText] = useState<string | null>(null);

  // Counterparties modal state
  const [isCounterpartiesOpen, setIsCounterpartiesOpen] = useState(false);

  // Chat States
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("https://business.sberbank.ru/client/accounts");

  // Term Help Popover State
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  // Scrollbar synchronization state for Custom slider track
  const [historyScrollProgress, setHistoryScrollProgress] = useState(0);
  const [chatScrollProgress, setChatScrollProgress] = useState(0);
  const [widgetScrollProgress, setWidgetScrollProgress] = useState(0);

  // CRM Handoff state monitoring
  const [isOperatorActive, setIsOperatorActive] = useState(false);
  const [operatorMessages, setOperatorMessages] = useState<Message[]>([]);
  const [crmPayload, setCrmPayload] = useState<any | null>(null);

  // Concept View & Widget States
  const [viewMode, setViewMode] = useState<'website' | 'dashboard'>('website');
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  // Auto Scroll state
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load Sessions & Reminders on Mount
  useEffect(() => {
    fetchSessions();
    fetchReminders();
  }, []);

  // Update URL depending on role to simulate navigation
  useEffect(() => {
    if (currentProfile.role === "director") {
      setCurrentUrl("https://business.sberbank.ru/client/accounts/loans");
    } else {
      setCurrentUrl("https://business.sberbank.ru/client/accounting/taxes");
    }
    // Automatically select or create session matching current role if the current session belongs to another role
    if (sessions.length > 0) {
      const activeSession = sessions.find(s => s.id === currentSessionId);
      if (!activeSession || activeSession.role !== currentProfile.role) {
        const match = sessions.find(s => s.role === currentProfile.role);
        if (match) {
          setCurrentSessionId(match.id);
          setCrmPayload(null);
          setIsOperatorActive(false);
          setOperatorMessages([]);
        } else {
          handleCreateNewSession(currentProfile.role);
        }
      }
    }
  }, [currentProfile, sessions.length, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [sessions, isTyping, operatorMessages, isOperatorActive]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data: ChatSession[] = await res.json();
        setSessions(data);
        if (data.length > 0) {
          // Select first session
          setCurrentSessionId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch("/api/reminders");
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Error loading reminders:", err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: currentProfile.role,
          text: newReminderText.trim(),
          frequency: newReminderFrequency
        })
      });

      if (res.ok) {
        const newRem = await res.json();
        setReminders(prev => [newRem, ...prev]);
        setNewReminderText("");
        setIsAddingReminder(false);
      }
    } catch (err) {
      console.error("Error creating reminder:", err);
    }
  };

  const handleToggleReminder = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive })
      });

      if (res.ok) {
        const updated = await res.json();
        setReminders(prev => prev.map(r => r.id === id ? updated : r));
      }
    } catch (err) {
      console.error("Error toggling reminder:", err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setReminders(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  // Hooking up the role switcher smoothly
  const handleRoleChange = (role: 'director' | 'accountant') => {
    const profile = bankProfiles.find(p => p.role === role);
    if (profile) {
      setCurrentProfile(profile);
    }
  };

  const handleCreateNewSession = async (role: 'director' | 'accountant') => {
    try {
      const title = role === "director"
        ? `Лимиты и финансирование #${sessions.length + 1}`
        : `Налоговая отчетность и РСБУ #${sessions.length + 1}`;

      const res = await fetch("/api/sessions/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, title })
      });

      if (res.ok) {
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setCrmPayload(null);
        setIsOperatorActive(false);
        setOperatorMessages([]);
      }
    } catch (err) {
      console.error("Error creating new session:", err);
    }
  };

  // Automated financial terms highlighter & Markdown parser in response texts
  const renderMessageContent = (text: string, isUserMessage: boolean = false) => {
    if (!text) return null;

    // Combined regex to identify links ([text](url) or [[text]](url)), raw URLs, bold text (**text**), and corporate finance glossary terms
    const combinedRegex = /(\[?\[[^\]\n]+\]\]?\s*\([^)\n]+\)|https?:\/\/[^\s)\"\'<>]+|\*\*[^*]+\*\*|валютн[а-яё]*\s+контрол[а-яё]*|овердрафт[а-яё]{0,5}|лизинг[а-яё]{0,5}|факторинг[а-яё]{0,5}|кэшпулинг[а-яё]{0,5}|нсбу)/gi;

    const parts = text.split(combinedRegex);
    if (parts.length === 1) {
      return <span className="whitespace-pre-wrap leading-relaxed">{text}</span>;
    }

    return (
      <span className="whitespace-pre-wrap leading-relaxed">
        {parts.map((part, index) => {
          if (!part) return null;

          // 1. Is it a Markdown link? (e.g., [Заголовок](url) or [[Заголовок]](url))
          const trimmedPart = part.trim();
          const isLink = /^\[{1,2}([^\]]+)\]{1,2}\s*\(([^)]+)\)$/.test(trimmedPart);
          if (isLink) {
            const linkMatch = trimmedPart.match(/^\[{1,2}([^\]]+)\]{1,2}\s*\(([^)]+)\)$/);
            if (linkMatch) {
              const innerText = linkMatch[1].trim();
              const url = linkMatch[2].trim();
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    isUserMessage
                      ? "text-emerald-900 hover:text-emerald-950 inline-flex items-center gap-1 font-bold bg-emerald-50/95 hover:bg-white border border-emerald-200 px-1.5 py-0.5 rounded transition-all select-all mx-1 shadow-2xs"
                      : "text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded transition-all select-all mx-1 shadow-2xs"
                  }
                >
                  {innerText}
                  <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0" />
                </a>
              );
            }
          }

          // 1.5. Is it a raw HTTP/HTTPS link?
          const isRawUrl = /^https?:\/\/[^\s)\"\'<>]+$/i.test(trimmedPart);
          if (isRawUrl) {
            const cleanUrl = trimmedPart.replace(/[.,;!?)]+$/, "");
            const trailingPunctuation = trimmedPart.slice(cleanUrl.length);
            return (
              <React.Fragment key={index}>
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    isUserMessage
                      ? "text-emerald-900 hover:text-emerald-950 inline-flex items-center gap-1 font-bold bg-emerald-50/95 hover:bg-white border border-emerald-200 px-1.5 py-0.5 rounded transition-all select-all mx-1 shadow-2xs"
                      : "text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded transition-all select-all mx-1 shadow-2xs"
                  }
                >
                  {cleanUrl}
                  <ExternalLink className="w-3.5 h-3.5 inline-block shrink-0" />
                </a>
                {trailingPunctuation}
              </React.Fragment>
            );
          }

          // 2. Is it a bold styled text block? (e.g., **текст**)
          const isBold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
          if (isBold) {
            const boldText = part.slice(2, -2).trim();
            // Check if this bold content itself contains/is a glossary term
            const glossaryMatchInBold = glossaryTerms.find(g => {
              const normPart = boldText.toLowerCase();
              if (g.word === "валютный контроль") {
                return normPart.includes("валют") && normPart.includes("контрол");
              }
              return normPart.startsWith(g.word) || g.word.startsWith(normPart);
            });

            if (glossaryMatchInBold) {
              return (
                <span
                  key={index}
                  className={
                    isUserMessage
                      ? "relative inline-block cursor-pointer font-black border-b-2 border-dashed border-amber-300 text-amber-100 bg-emerald-800/80 hover:bg-emerald-700 rounded px-1.5 py-0.5 transition-colors group mx-1"
                      : "relative inline-block cursor-pointer font-black border-b-2 border-dashed border-emerald-500 text-emerald-800 bg-emerald-100/60 hover:bg-emerald-200/80 rounded px-1.5 py-0.5 transition-colors group mx-1"
                  }
                  onClick={() => setSelectedTerm(glossaryMatchInBold)}
                  title="Нажмите, чтобы прочитать банковское определение"
                >
                  {boldText}
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse ${isUserMessage ? "bg-amber-400" : "bg-emerald-500"}`}></span>
                </span>
              );
            }

            return <strong key={index} className={isUserMessage ? "font-extrabold text-white" : "font-extrabold text-slate-900"}>{boldText}</strong>;
          }

          // 3. Is it a standalone glossary term (not wrapped in bold)?
          const matchedTerm = glossaryTerms.find(g => {
            const normPart = part.toLowerCase();
            if (g.word === "валютный контроль") {
              return normPart.includes("валют") && normPart.includes("контрол");
            }
            return normPart.startsWith(g.word) || g.word.startsWith(normPart);
          });

          if (matchedTerm) {
            return (
              <span
                key={index}
                className={
                  isUserMessage
                    ? "relative inline-block cursor-pointer font-bold border-b-2 border-dashed border-amber-300 text-amber-100 bg-emerald-800 hover:bg-emerald-750 rounded px-1.5 py-0.2 transition-colors group mx-0.5"
                    : "relative inline-block cursor-pointer font-bold border-b-2 border-dashed border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 rounded px-1.5 py-0.2 transition-colors group mx-0.5"
                }
                onClick={() => setSelectedTerm(matchedTerm)}
                title="Нажмите, чтобы прочитать банковское определение"
              >
                {part}
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse ${isUserMessage ? "bg-amber-400" : "bg-emerald-50"}`}></span>
              </span>
            );
          }

          // 4. Fallback is normal text
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || inputValue;
    if (!promptToSend.trim()) return;

    if (!currentSessionId) {
      alert("Сначала создайте или выберите сессию диалога");
      return;
    }

    // Capture User input local state
    const userMsg: Message = {
      id: "msg-u-" + Date.now(),
      role: "user",
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
    };

    // Update in UI session messages instantly for fluid UX
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, userMsg] };
      }
      return s;
    }));

    if (!customPrompt) {
      setInputValue("");
    }

    setIsTyping(true);

    try {
      // Sync user message to Express store db
      await fetch(`/api/sessions/${currentSessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });

      // Prepare context history for Gemini helper
      const historyLogForApi = currentSession?.messages.map(m => ({
        role: m.role,
        content: m.content
      })) || [];

      // Send to Backend Chat endpoint which calls gemini-flash-latest
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: currentProfile.role,
          prompt: promptToSend,
          history: [...historyLogForApi, { role: "user", content: promptToSend }],
          currentUrl,
          companyContext: `${currentProfile.companyName} (${currentProfile.roleLabel})`
        })
      });

      if (response.ok) {
        const reply = await response.json();

        const assistantMsg: Message = {
          id: "msg-a-" + Date.now(),
          role: reply.callOperator ? "operator" : "assistant",
          content: reply.content,
          timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' }),
          callOperator: reply.callOperator,
          operatorSummary: reply.operatorSummary,
          paymentDraft: reply.paymentDraft || undefined
        };

        // Sync assistant reply to DB
        await fetch(`/api/sessions/${currentSessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: assistantMsg })
        });

        // Update main state
        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, assistantMsg] };
          }
          return s;
        }));

        // Dynamic sync if chatbot created/deleted a reminder
        if (reply.reminderAction) {
          fetchReminders();
        }

        // Handle Support Human handoff scenario! (CRM transmission simulation)
        if (reply.callOperator) {
          setIsOperatorActive(true);
          setCrmPayload({
            session_id: currentSessionId,
            company_name: currentProfile.companyName,
            client_id: currentProfile.role === 'director' ? 'CLI-1020409' : 'CLI-9941122',
            company_inn: currentProfile.role === 'director' ? '7721839212' : '5024310921',
            user_role: currentProfile.role,
            user_title: currentProfile.roleLabel,
            current_page_url: currentUrl,
            summary: {
              issue_summary: reply.operatorSummary?.issueSummary || "Клиент запросил ручную помощь специалиста банка",
              detected_intent: reply.operatorSummary?.userIntent || "operator_handoff",
              bot_resolved: false,
              urgency: "high"
            },
            raw_chat_history: [
              ...currentSession?.messages.map(m => ({ role: m.role, text: m.content })) || [],
              { role: "user", text: promptToSend }
            ]
          });

          // Simulate live support human typing in 3.5 seconds
          setTimeout(() => {
            const supportAgentMsg: Message = {
              id: "msg-op-live",
              role: "operator",
              content: `Здравствуйте, ${currentProfile.name.split(" ")[0]}! Я Александр, дежурный эксперт премиального сервиса СберБизнес. Я вижу всю историю вашей переписки с помощником и то точное место экрана, где вы находились. Нам будет намного проще решить ваш индивидуальный запрос. Для согласования особых кредитных условий/налогов, мне понадобится от вас буквально полминуты на согласование договора в кредитном комитете. Оставайтесь на связи.`,
              timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
            };
            setOperatorMessages([supportAgentMsg]);
          }, 3500);
        }
      } else {
        const errorReply = await response.json().catch(() => ({}));
        const userErrDetails = errorReply.details || errorReply.error || "Неизвестная ошибка сервера";

        const errorMsg: Message = {
          id: "msg-err-" + Date.now(),
          role: "assistant",
          content: `⚠️ **Сбой связи с сервером ИИ**\n\nНе удалось получить корректный ответ от ИИ-помощника СберБизнес.\n\n*Детали ошибки: ${userErrDetails}*`,
          timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
        };

        setSessions(prev => prev.map(s => {
          if (s.id === currentSessionId) {
            return { ...s, messages: [...s.messages, errorMsg] };
          }
          return s;
        }));
      }
    } catch (e: any) {
      console.error("Chat error:", e);
      const errorMsg: Message = {
        id: "msg-err-" + Date.now(),
        role: "assistant",
        content: `⚠️ **Сбой сетевого соединения**\n\nНе удалось связаться с сервером. Пожалуйста, проверьте консоль разработчика.\n\n*Детали: ${e.message}*`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, errorMsg] };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleTriggerManualHandoff = () => {
    setIsOperatorActive(true);
    setCrmPayload({
      session_id: currentSessionId || "session-custom-manual",
      company_name: currentProfile.companyName,
      client_id: currentProfile.role === 'director' ? 'CLI-1020409' : 'CLI-9941122',
      company_inn: currentProfile.role === 'director' ? '7721839212' : '5024310921',
      user_role: currentProfile.role,
      user_title: currentProfile.roleLabel,
      current_page_url: currentUrl,
      summary: {
        issue_summary: "Клиент запросил ручную помощь специалиста через кнопку Позвать оператора",
        detected_intent: "manual_handoff_requested",
        bot_resolved: false,
        urgency: "high"
      },
      raw_chat_history: currentSession?.messages.map(m => ({ role: m.role, text: m.content })) || []
    });

    setTimeout(() => {
      const supportAgentMsg: Message = {
        id: "msg-op-" + Date.now(),
        role: "operator",
        content: `Здравствуйте, ${currentProfile.name.split(" ")[0]}! Я Александр, дежурный эксперт премиального сервиса СберБизнес. Я вижу всю историю вашей переписки с помощником и то точное место экрана, где вы находились. Нам будет намного проще решить ваш индивидуальный запрос. Для согласования особых кредитных условий/налогов, мне понадобится от вас буквально полминуты на согласование договора в кредитном комитете. Оставайтесь на связи.`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })
      };
      setOperatorMessages([supportAgentMsg]);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="sber-applet">
      {/* Global Demonstration / Layout Switcher Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-white gap-2 z-50 shadow-xs shrink-0" id="global-demo-bar">
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
          <span className="font-semibold text-slate-300">Режим демонстрации Сбера:</span>
          <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wide">
            {viewMode === "website" ? "Демо-сайт + Смарт-Виджет" : "Полноэкранная версия ИИ-Ассистента"}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => {
              setViewMode("website");
              setIsWidgetOpen(true);
            }}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === "website"
                ? "bg-emerald-750 text-white shadow-sm"
                : "text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750"
            }`}
          >
            🌐 Демо-сайт (Свернуть в виджет)
          </button>
          <button
            onClick={() => {
              setViewMode("dashboard");
              setIsWidgetOpen(false);
            }}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === "dashboard"
                ? "bg-emerald-750 text-white shadow-sm"
                : "text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750"
            }`}
          >
            🖥️ Развернуть полную версию (Весь экран)
          </button>
        </div>
      </div>

      {viewMode === "website" ? (
        /* ================= EMULATED REALISTIC SBERBANK BUSINESS ONLINE BANK WORKSPACE ================= */
        <div className="flex-1 flex flex-col bg-[#ffffff] font-sans relative min-h-screen" id="landing-website">

          {/* Top Navbar */}
          <header className="w-full h-[60px] bg-white border-b border-[#D0D7DD] px-6 flex items-center justify-between sticky top-0 z-40 select-none" id="sber-header">
            {/* Sber Corporate Logo Zone */}
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-start justify-center">
                <img
                  src="/Logotype.svg"
                  className="h-[33px] w-[200px] object-contain select-none pointer-events-none"
                  alt="СБЕР Бизнес"
                />
                <div
                  style={{
                    display: 'flex',
                    width: '164px',
                    height: '16px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: '#107F8C',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: '8px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '32px',
                    marginLeft: '37px'
                  }}
                  className="select-none pointer-events-none"
                >
                  Корпоративная экосистема веб-банка
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#21A19A] to-[#107F8C] text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-[8px] leading-none flex items-center justify-center">
                ИИ-ассистент
              </div>
            </div>

            {/* Right-side Action Controls */}
            <div className="flex items-center space-x-5">
              {/* Functional View Mode Switch Toggle */}
              <button
                onClick={() => setViewMode("app")}
                className="px-3.5 py-1.5 bg-[#21A19A] hover:bg-[#107F8C] active:scale-95 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs font-sans shrink-0"
                title="Перейти в личный кабинет ИИ-ассистента"
              >
                <span>Личный кабинет</span>
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </button>

              <div className="flex items-center space-x-4">
                {/* Phone icon */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Позвонить в банк">
                  <img src="/ic_srv_phone_default_20_w.svg" className="w-[20px] h-[20px]" alt="Phone" />
                </button>

                {/* Bell icon with "4" notification badge */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Уведомления">
                  <img src="/ic_srv_bell_default_20_w.svg" className="w-[20px] h-[20px]" alt="Bell" />
                  <span className="absolute -top-1.5 -right-1.5 w-[16px] h-[16px] bg-[#DB1237] text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-white">
                    4
                  </span>
                </button>

                {/* Envelope icon with "4" messages badge */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Письма">
                  <img src="/ic_srv_envelope_default_20_w.svg" className="w-[20px] h-[20px]" alt="Mail" />
                  <span className="absolute -top-1.5 -right-1.5 w-[16px] h-[16px] bg-[#DB1237] text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-white">
                    4
                  </span>
                </button>

                {/* Customer client login widget with user role rotating actions */}
                <div
                  onClick={() => {
                    const nextRole = currentProfile.role === "director" ? "accountant" : "director";
                    handleRoleChange(nextRole);
                  }}
                  className="flex items-center space-x-2 pl-2 py-1 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                  title="Нажмите для циклической смены роли"
                >
                  <img
                    src="/Customer logo.svg"
                    className="w-[40px] h-[40px] rounded-full object-cover border border-[#D0D7DD]"
                    alt="Customer Logo"
                  />
                  <span className="hidden md:inline text-[13px] font-semibold text-[#1F1F22] select-none font-sans">
                    ЗАО «СЕРВИС ДЕСК»
                  </span>
                  <img
                    src="/ic_srv_arrowdown_default_16_w.svg"
                    className="w-[16px] h-[16px]"
                    alt="Arrow down"
                  />
                </div>

                {/* Question icon */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer" title="Помощь">
                  <img src="/ic_srv_question_default_20_w.svg" className="w-[20px] h-[20px]" alt="Help" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Workspace Frame */}
          <div className="flex-1 flex bg-white" id="portal-frame">

            {/* Emulated Sber narrow grey sidebar */}
            <aside className="w-20 bg-[#f4f5f7] border-r border-[#e1e3e6] flex flex-col justify-between items-center py-6 shrink-0" id="sber-sidebar">
              <div className="w-full flex flex-col items-center space-y-4">

                {/* 1. Деньги и события (Active item with green dash and active styling) */}
                <button className="w-full flex flex-col items-center group relative py-2 cursor-pointer" title="Деньги и события">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1ea133] rounded-r"></div>
                  <div className="w-10 h-10 bg-white rounded-xl shadow-2xs border border-[#1ea133]/20 flex items-center justify-center text-[#1ea133] mb-1.5">
                    <ArrowLeftRight className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="text-[10px] leading-tight font-extrabold text-slate-900 text-center px-1 font-sans">
                    Деньги и<br />события
                  </span>
                </button>

                {/* 2. Расчеты */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Расчеты">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <CreditCard className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Расчеты
                  </span>
                </button>

                {/* 3. Выписка */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Выписка">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <FileText className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Выписка
                  </span>
                </button>

                {/* 4. Зарплата */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Зарплата">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <Award className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Зарплата
                  </span>
                </button>

                {/* 5. Продукты и услуги */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Продукты и услуги">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <Truck className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Продукты и<br />услуги
                  </span>
                </button>

                {/* 6. Сервисы */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Сервисы">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <Activity className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Сервисы
                  </span>
                </button>

                {/* 7. Прочее */}
                <button className="w-full flex flex-col items-center group py-2 cursor-pointer" title="Прочее">
                  <div className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-405 group-hover:text-slate-705 mb-1.5 transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium text-slate-500 text-center px-1 group-hover:text-slate-800 transition-colors font-sans">
                    Прочее
                  </span>
                </button>

              </div>

              {/* Sidebar bottom Settings button */}
              <button className="w-10 h-10 hover:bg-slate-200/60 rounded-xl flex items-center justify-center text-slate-400 transition-colors cursor-pointer" title="Настройки">
                <Settings className="w-5 h-5 stroke-[1.7]" />
              </button>
            </aside>

            {/* Portal Center White Content Workspace */}
            <main className="flex-1 p-6 md:p-8 space-y-7 bg-white overflow-y-auto" id="portal-main">

              {/* Title Section matching the screenshot */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-[22px] font-black text-slate-900 tracking-tight uppercase font-sans">
                    DEMO ЮРИДИЧЕСКОЕ ЛИЦО
                  </h1>
                  <p className="text-[11.5px] text-slate-400 mt-1 font-semibold block">
                    Компания: <span className="text-slate-700">{currentProfile.companyName}</span> • УНП: {currentProfile.role === "director" ? "191234567" : "192345678"} • Текущая роль: {currentProfile.roleLabel}
                  </p>
                </div>

                {/* Sber Solid Teal Action Button "Создать документ" */}
                <div>
                  <button
                    onClick={() => {
                      if (currentProfile.role === "director") {
                        setPermissionDeniedText("Ваша роль 'Владелец бизнеса' предоставляет полные права. Документ успешно создан и подписан вашей электронной подписью!");
                      } else if (currentProfile.role === "accountant") {
                        setPermissionDeniedText("Документ подготовлен Главным бухгалтером по стандартам РСБУ. Платежное поручение отправлено Владельцу бизнеса (Алексею Викторовичу) для дальнейшей подписи и отправки.");
                      } else {
                        setPermissionDeniedText("🚫 Доступ запрещен! Ваша корпоративная роль 'Сотрудник' имеет права только на просмотр личного кабинета, заказ билетов/командировок и прохождение обучения СберУниверситета. Создание финансовых документов и транзакций заблокировано Администратором.");
                      }
                    }}
                    className="px-5 py-2 hover:bg-[#006666] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs bg-[#008080] font-sans"
                  >
                    Создать документ
                  </button>
                </div>
              </div>

              {/* Total Available Funds block exactly matching your image */}
              <div className="bg-[#ffffff] border border-slate-100 rounded-xl p-5 space-y-4 shadow-3xs">
                <div className="flex items-center space-x-1.55">
                  <span className="text-[12px] font-bold text-slate-800 uppercase tracking-wide font-sans">Всего доступно средств</span>
                  {/* Tooltip question help bubble */}
                  <span className="w-4 h-4 bg-slate-200/80 text-slate-500 font-extrabold text-[10.5px] rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors" title="Общая сумма доступных ликвидных средств">?</span>
                  <ChevronDown className="w-4 h-4 text-slate-450" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">

                  {/* Left Column Section: BYN accounts total from screenshot */}
                  <div className="border-r border-slate-100 pr-6 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">На счетах в BYN</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-light text-slate-950 font-sans">500.00</span>
                      <span className="text-slate-400 text-lg font-medium font-sans">BYN</span>
                    </div>
                  </div>

                  {/* Right Column Section: other currencies as shown in image */}
                  <div className="pl-0 md:pl-2 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-sans">На счетах в других валютах</span>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-bold text-slate-800 font-sans">0.00</span>
                        <span className="text-slate-400 text-xs font-bold font-sans">USD</span>
                      </div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-bold text-slate-800 font-sans">3 000.00</span>
                        <span className="text-slate-400 text-xs font-bold font-sans">RUB</span>
                      </div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-bold text-slate-800 font-sans">2 000.00</span>
                        <span className="text-slate-400 text-xs font-bold font-sans">EUR</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Master layout grid: Accounts box + action list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left block for accounts list */}
                <div className="lg:col-span-8 space-y-5">

                  {/* Sber Счета Panel from screenshot */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">

                    {/* Header bar inside Счета block */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100/10 pb-3">
                      <h2 className="text-[16px] font-bold text-slate-800 font-sans">Счета</h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        {/* Selector dropdown dropdown option */}
                        <div className="border border-slate-200 rounded-lg px-2.5 py-1 flex items-center space-x-1.5 bg-slate-50 font-bold text-[11px] text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
                          <span>Все валюты • Все счета</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        {/* Checkbox option */}
                        <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-semibold text-[#64748b]">
                          <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" defaultChecked={false} />
                          <span className="font-sans">Отображать скрытые</span>
                        </label>

                        {/* Refresh arrow button */}
                        <button className="flex items-center space-x-1 hover:text-slate-750 font-semibold text-[11px] transition-colors cursor-pointer text-slate-500">
                          <RefreshCw className="w-3 h-3 text-slate-400" />
                          <span className="font-sans">Обновить остатки</span>
                        </button>

                        <button className="hover:text-slate-700 transition-colors cursor-pointer text-slate-400">
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sberbank real accounts lists from screenshot */}
                    <div className="divide-y divide-slate-100">

                      {/* Account 1: BY51 */}
                      <div className="py-3.5 flex items-center justify-between group">
                        <div className="flex items-center space-x-3.5">
                          {/* Currency badge circles */}
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10.5px] font-black text-slate-400 font-mono tracking-wider shadow-2xs">
                            BYN
                          </div>
                          <div>
                            <p className="text-xs font-mono font-bold text-slate-800 select-all">BY51 BPSB 3012 2222 2222 2933 2222</p>
                            <p className="text-[11px] text-[#718096] mt-0.5 font-sans">
                              Текущий (расчетный) счет <span className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded text-[10px] ml-1 select-none font-sans">крутой</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right font-sans">
                          <p className="text-sm font-extrabold text-slate-900 font-mono">200.00 BYN</p>
                          <button className="p-1 text-slate-300 hover:text-slate-550 rounded transition-all cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Account 2: BY69 */}
                      <div className="py-3.5 flex items-center justify-between group">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10.5px] font-black text-slate-400 font-mono tracking-wider shadow-2xs">
                            BYN
                          </div>
                          <div>
                            <p className="text-xs font-mono font-bold text-slate-800 select-all">BY69 BPSB 3012 3333 3333 3933 3333</p>
                            <p className="text-[11px] text-[#718096] mt-0.5 font-sans">
                              Карточный счет <span className="text-[#a16207] font-bold bg-amber-50 border border-amber-100 px-1 py-0.2 rounded text-[10px] ml-1 select-none font-sans">Добрый счёт</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right font-sans">
                          <p className="text-sm font-extrabold text-slate-900 font-mono">300.00 BYN</p>
                          <button className="p-1 text-slate-300 hover:text-slate-550 rounded transition-all cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Account 3: BY41 */}
                      <div className="py-3.5 flex items-center justify-between group">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-[10.5px] font-black text-slate-400 font-mono tracking-wider shadow-2xs">
                            EUR
                          </div>
                          <div>
                            <p className="text-xs font-mono font-bold text-slate-800 select-all">BY41 BPSB 3012 0000 0000 0978 0000</p>
                            <p className="text-[11px] text-[#718096] mt-0.5 font-sans">Текущий (расчетный) счет</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-right font-sans">
                          <p className="text-sm font-extrabold text-slate-900 font-mono">2 000.00 EUR</p>
                          <button className="p-1 text-slate-300 hover:text-slate-550 rounded transition-all cursor-pointer">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Sberbank Integration Support Notice bar */}
                  <div className="bg-gradient-to-tr from-[#fbfdfc] to-[#ffffff] border border-emerald-100 rounded-xl p-5 text-slate-700 shadow-2xs relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 text-emerald-100 select-none pointer-events-none opacity-20">
                      <Sparkles className="w-16 h-16" />
                    </div>
                    <div className="relative z-10 space-y-1.5 font-sans">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping"></span>
                        <span className="text-[10px] font-black text-[#0c4a30] uppercase tracking-widest bg-emerald-100/50 border border-emerald-100 px-2 py-0.5 rounded font-sans">СберИИ Ассистент активен</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-xs font-sans">Контекст организации автоматически интегрирован</h4>
                      <p className="text-[11.5px] text-slate-500 leading-normal max-w-xl font-sans">
                        Интеллектуальный чат-бот подключен к этой странице и считывает ваши декреты, состояние счетов и роли. Нажмите на зеленую круглую иконку справа внизу или воспользуйтесь быстрой кнопкой ИИ для вашей роли:
                      </p>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {currentProfile.role === "director" ? (
                          <button
                            onClick={() => {
                              setIsWidgetOpen(true);
                              handleSendMessage(undefined, "Какие кредитные условия и овердрафты одобрены компании ООО 'ТехноПром' на сумму 5 000 000?");
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#095438] border border-emerald-200 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center space-x-1 font-sans shadow-3xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>💼 ООО 'ТехноПром': Рассчитать овердрафт компании</span>
                          </button>
                        ) : currentProfile.role === "accountant" ? (
                          <button
                            onClick={() => {
                              setIsWidgetOpen(true);
                              handleSendMessage(undefined, "Какие налоговые льготы предусмотрены для ИП Смирнова при переходе на автоматический учет в СберБизнес?");
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#095438] border border-emerald-200 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center space-x-1 font-sans shadow-3xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>📊 ИП Смирнова: Сверить налоги и РСБУ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsWidgetOpen(true);
                              handleSendMessage(undefined, "Какие курсы СберУниверситета и инструменты по бронированию отелей нам доступны в СберБизнес Командировках?");
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0c4a30] border border-emerald-200 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center space-x-1 font-sans shadow-3xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>👤 Подборка: Курсы для Развития и Командировки</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right block for action lists tiles exactly from your image */}
                <div className="lg:col-span-4 space-y-3.5">

                  {/* Tile 1: Документы на подписании */}
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center space-x-3.5 transition-colors cursor-pointer group shadow-3xs">
                    <div className="w-10 h-10 bg-[#fafafa] rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-100 transition-colors">
                      <FileText className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-700 font-sans">Документы на подписании</h4>
                    </div>
                  </div>

                  {/* Tile 2: Кредиты */}
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center space-x-3.5 transition-colors cursor-pointer group shadow-3xs">
                    <div className="w-10 h-10 bg-[#fafafa] rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-100 transition-colors">
                      <Percent className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-700 font-sans">Кредиты</h4>
                    </div>
                  </div>

                  {/* Tile 3: Корпоративные карты */}
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center space-x-3.5 transition-colors cursor-pointer group shadow-3xs">
                    <div className="w-10 h-10 bg-[#fafafa] rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-slate-100 transition-colors">
                      <CreditCard className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-700 font-sans font-mono">Корпоративные карты</h4>
                    </div>
                  </div>

                  {/* Tile 4: Контрагенты СберБизнес */}
                  <div
                    onClick={() => setIsCounterpartiesOpen(true)}
                    className="bg-white border border-[#10b981]/20 hover:border-[#10b981] rounded-xl p-4 flex items-center space-x-3.5 transition-colors cursor-pointer group shadow-3xs hover:bg-emerald-50/10"
                  >
                    <div className="w-10 h-10 bg-emerald-100/50 rounded-lg flex items-center justify-center text-emerald-800 group-hover:bg-emerald-100 transition-colors">
                      <Users className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-700 font-sans">Контрагенты СберБизнес</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Просмотр списка и реквизитов РБ</p>
                    </div>
                  </div>

                  {/* Quick sandbox instruction block */}
                  <div className="p-4 bg-slate-50 border border-slate-200/55 rounded-xl text-[11px] leading-relaxed text-slate-500">
                    <p className="font-bold text-slate-705 uppercase tracking-widest text-[8.5px] mb-1 flex items-center font-sans">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      Инструкция к ИИ-помощнику
                    </p>
                    <span className="font-sans">Этот интерфейс повторяет настоящий интернет-банк СберБизнес. Вы можете нажать на круглый значок чата в правом нижнем углу, чтобы активировать консультацию по вашему счету.</span>
                  </div>

                </div>

              </div>

              {/* Transactions/Payments block */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-3xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">История исходящих платежей</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold">
                        <th className="pb-2.5 font-medium">Контрагент / Операция</th>
                        <th className="pb-2.5 font-medium">Дата и время</th>
                        <th className="pb-2.5 font-medium">Назначение платежа</th>
                        <th className="pb-2.5 font-medium text-right font-sans">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="py-3 font-semibold text-slate-800">ООО "МеталлСнаб"</td>
                        <td className="py-3 opacity-90">Вчера, 14:20</td>
                        <td className="py-3 max-w-[280px] truncate">Оплата за сырье по договору №405-А. В т.ч. НДС 20%</td>
                        <td className="py-3 text-red-600 font-bold text-right">-14 500.00 BYN</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-[#0b5435]">ОАО "Сбер Банк" Минэкономики РБ</td>
                        <td className="py-3 opacity-90">08.06.2026, 11:05</td>
                        <td className="py-3 max-w-[280px] truncate">Субсидия на расширение оборотного капитала SME</td>
                        <td className="py-3 text-emerald-600 font-bold text-right">+25 000.00 BYN</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-slate-800">ООО "ТрансПоставка"</td>
                        <td className="py-3 opacity-90">05.06.2026, 17:50</td>
                        <td className="py-3 max-w-[280px] truncate">Авансовый лизинговый платеж за спецтехнику МАЗ</td>
                        <td className="py-3 text-red-600 font-semibold text-right">-4 800.00 BYN</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </main>

          </div>

          {/* Sber style footer */}
          <footer className="text-slate-450 text-[10px] text-center py-4 border-t border-slate-200 bg-white">
            <p className="opacity-90">© 1997—2026 ОАО «Сбер Банк» (Беларусь). Лицензия на осуществление банковской деятельности № 6 от 22 декабря 2021 года, выданная Национальным банком Республики Беларусь.</p>
          </footer>

          {/* ================= CHAT FLOATING WIDGET LAUNCHER & PANEL ================= */}
          {/* Floating Circle Button */}
          <div
            onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            title="Открыть ИИ-Ассистента Сбера"
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              width: '89px',
              height: '90px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              aspectRatio: '89/90',
              cursor: 'pointer',
              zIndex: 150,
            }}
            className="transition-all transform hover:scale-105 active:scale-95 group"
          >
            <img
              src={isWidgetOpen ? "/cat_open.png" : "/cat.png"}
              alt="Кот Ассистент"
              style={{
                width: '89px',
                height: '90px',
                objectFit: 'contain'
              }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2321A19A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='12' r='10'></circle><path d='M8 14s1.5 2 4 2 4-2 4-2'></path><line x1='9' y1='9' x2='9.01' y2='9'></line><line x1='15' y1='15' x2='15.01' y2='15'></line></svg>";
              }}
            />
          </div>
          {isWidgetOpen && (
            <div
              style={{
                position: 'fixed',
                bottom: '112px',
                right: '16px',
                width: '488px',
                height: '560px',
                borderRadius: '8px',
                background: '#FFF',
                boxShadow: '0 1px 3px 0 rgba(31, 31, 34, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                overflow: 'hidden'
              }}
              className="animate-fade-in"
              id="sber-mini-chat-popup"
            >
              {/* Header Container */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  boxSizing: 'border-box',
                  background: '#FFF'
                }}
              >
                {/* Title */}
                <div
                  style={{
                    display: 'flex',
                    width: '227px',
                    height: '32px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    aspectRatio: '227/32',
                    color: '#1F1F22',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                    fontSize: '21px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '32px'
                  }}
                >
                  ИИ-ассистент СберГид
                </div>

                {/* Right side controls: button and close icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={() => {
                      setViewMode("dashboard");
                      setIsWidgetOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      width: '184px',
                      height: '34px',
                      padding: '0 11px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '8px',
                      background: '#107F8C',
                      border: 'none',
                      color: '#FFF',
                      cursor: 'pointer',
                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      lineHeight: 'normal'
                    }}
                    className="hover:opacity-90 active:scale-98 transition-all"
                  >
                    Расширенный режим
                  </button>

                  <img
                    src="/ic_srv_close_default_20_w.svg"
                    alt="Close"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%231F1F22' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>";
                    }}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setIsWidgetOpen(false)}
                  />
                </div>
              </div>

              {/* Rectangle 3 - Divider line */}
              <div
                style={{
                  width: '100%',
                  height: '1px',
                  background: '#D0D7DD',
                  flexShrink: 0
                }}
              />

              {/* Main chat log container with Custom Scrollbar */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#FFF'
                }}
              >
                {/* Scrollable messages area */}
                <div
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const scrollHeight = target.scrollHeight;
                    const clientHeight = target.clientHeight;
                    const scrollTop = target.scrollTop;
                    const progress = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
                    setWidgetScrollProgress(progress);
                  }}
                  style={{
                    width: 'calc(100% - 14px)',
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '16px 12px 16px 16px',
                    boxSizing: 'border-box',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  className="widget-messages-container"
                >
                  {/* Read actual list or fallback to the requested design values */}
                  {(() => {
                    const displayMessages = (currentSession?.messages && currentSession.messages.length > 0)
                      ? currentSession.messages
                      : [
                          {
                            id: "default-msg-user",
                            role: "user",
                            content: "Напомни оплатить налог на прибыль 28 числа",
                            timestamp: "03.06.2026, 13:37:22",
                          },
                          {
                            id: "default-msg-bot",
                            role: "assistant",
                            content: "Напоминание установлено на 28 июня",
                            timestamp: "03.06.2026, 13:38:15",
                          },
                        ];

                    return displayMessages.map((msg, index) => {
                      const isUser = msg.role === "user";
                      if (isUser) {
                        return (
                          <div
                            key={msg.id || index}
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              width: '100%'
                            }}
                          >
                            {/* Rectangle 6557 - сообщения юзера */}
                            <div
                              style={{
                                width: '450px',
                                minHeight: '90px',
                                borderRadius: '10px',
                                background: '#21A19A',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              {/* Header Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                {/* Label: Вы */}
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '63px',
                                    height: '24px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    aspectRatio: '63/43',
                                    color: '#FFF',
                                    fontFamily: 'Roboto, -apple-system, sans-serif',
                                    fontSize: '20px',
                                    fontStyle: 'normal',
                                    fontWeight: 500,
                                    lineHeight: 'normal',
                                    letterSpacing: '-0.25px'
                                  }}
                                >
                                  Вы
                                </div>

                                {/* Timestamp */}
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '176px',
                                    height: '8px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#FFF',
                                    fontFeatureSettings: "'liga' off, 'clig' off",
                                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                    fontSize: '11px',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    lineHeight: '24px',
                                    textAlign: 'right'
                                  }}
                                >
                                  {msg.timestamp || "03.06.2026, 13:37:22"}
                                </div>
                              </div>

                              {/* Divider Line */}
                              <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.25)' }} />

                              {/* Message text */}
                              <div
                                style={{
                                  display: 'flex',
                                  width: '338px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  color: '#FFF',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                  fontSize: '15px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '24px'
                                }}
                              >
                                {renderMessageContent(msg.content, true)}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        // Assistant/Bot message
                        return (
                          <div
                            key={msg.id || index}
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-start',
                              width: '100%'
                            }}
                          >
                            {/* Rectangle 6557 - ответы чата */}
                            <div
                              style={{
                                width: '450px',
                                minHeight: '90px',
                                borderRadius: '10px',
                                background: '#E4E8EB',
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                boxSizing: 'border-box',
                                gap: '6px'
                              }}
                            >
                              {/* Header Row */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                {/* Label: СберГид */}
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '109px',
                                    height: '24px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    aspectRatio: '109/75',
                                    color: '#1F1F22',
                                    fontFamily: 'Roboto, -apple-system, sans-serif',
                                    fontSize: '20px',
                                    fontStyle: 'normal',
                                    fontWeight: 500,
                                    lineHeight: 'normal',
                                    letterSpacing: '-0.25px'
                                  }}
                                >
                                  СберГид
                                </div>

                                {/* Timestamp */}
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '176px',
                                    height: '8px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#1F1F22',
                                    fontFeatureSettings: "'liga' off, 'clig' off",
                                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                    fontSize: '11px',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    lineHeight: '24px',
                                    textAlign: 'right'
                                  }}
                                >
                                  {msg.timestamp || "03.06.2026, 13:38:15"}
                                </div>
                              </div>

                              {/* Underline - линия разделяющая шапку с сообщение у ответа бота */}
                              <div
                                style={{
                                  width: '100%',
                                  height: '1px',
                                  background: '#1F1F22'
                                }}
                              />

                              {/* Message Text */}
                              <div
                                style={{
                                  width: '100%',
                                  maxWidth: '410px',
                                  color: '#1F1F22',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                  fontSize: '15px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '24px'
                                }}
                              >
                                {renderMessageContent(msg.content, false)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}

                  <div ref={chatBottomRef} />
                </div>

                {/* Right part: Custom Scrollbar with track background + thumb */}
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '10px',
                    height: '100%',
                    flexShrink: 0
                  }}
                  id="widget-custom-scrollbar-container"
                >
                  <div style={{ position: 'relative', width: '10px', height: '100%', pointerEvents: 'none' }}>
                    {/* Background slider track */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="10"
                      height="100%"
                      viewBox="0 0 10 528"
                      preserveAspectRatio="none"
                      fill="none"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '10px',
                        height: '100%',
                        display: 'block'
                      }}
                    >
                      <path d="M0 0H10V525C10 526.657 8.65685 528 7 528H0V0Z" fill="#E4E8EB" />
                    </svg>

                    {/* Rectangle 3.1 - слайдер */}
                    <div
                      style={{
                        position: 'absolute',
                        top: `calc(${widgetScrollProgress} * (100% - 96px))`,
                        left: 0,
                        width: '10px',
                        height: '96px',
                        borderRadius: '50px',
                        background: '#B2B8BF',
                        pointerEvents: 'none',
                        transition: 'top 0.05s linear'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Content input bar at bottom */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: 'flex',
                  padding: '8px 12px',
                  alignItems: 'center',
                  gap: '10px',
                  alignSelf: 'stretch',
                  borderRadius: '8px',
                  border: '1px solid #D0D7DD',
                  background: '#FFF',
                  margin: '12px 16px 16px 16px',
                  boxSizing: 'border-box'
                }}
                id="sber-mini-chat-form"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Введите ваш запрос"
                  style={{
                    flex: '1 0 0',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: '#7D838A',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                    fontSize: '16px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '24px'
                  }}
                  className="placeholder:text-[#7D838A]"
                />

                <button
                  type="submit"
                  disabled={isTyping || !inputValue.trim()}
                  style={{
                    display: 'flex',
                    width: '44px',
                    height: '40px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    aspectRatio: '11/10',
                    border: 'none',
                    background: 'transparent',
                    cursor: (isTyping || !inputValue.trim()) ? 'default' : 'pointer',
                    opacity: (isTyping || !inputValue.trim()) ? 0.4 : 1,
                    padding: 0
                  }}
                  className="active:scale-95 transition-all"
                >
                  <img
                    src="/image5.png"
                    alt="Send"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2321A19A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='11' cy='11' r='8'></circle><line x1='21' y1='21' x2='16.65' y2='16.65'></line></svg>";
                    }}
                    style={{
                      width: '44px',
                      height: '40px',
                      aspectRatio: '11/10',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </button>
              </form>
            </div>
          )}

        </div>
      ) : (
        /* ================= ORIGINAL WORKSPACE DASHBOARD (FULL INTEGRATED PORTAL) ================= */
        <div className="flex-1 flex flex-col bg-slate-50" id="full-dashboard">
          {/* Upper Sber-Style Brand Header from Figma specification */}
          <header className="w-full h-[60px] bg-white border-b border-[#D0D7DD] px-6 flex items-center justify-between sticky top-0 z-40 select-none" id="sber-header">
            {/* Sber Corporate Logo Zone */}
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-start justify-center">
                <img
                  src="/Logotype.svg"
                  className="h-[33px] w-[200px] object-contain select-none pointer-events-none"
                  alt="СБЕР Бизнес"
                />
                <div
                  style={{
                    display: 'flex',
                    width: '164px',
                    height: '16px',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    color: '#107F8C',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSize: '8px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '32px',
                    marginLeft: '37px'
                  }}
                  className="select-none pointer-events-none"
                >
                  Корпоративная экосистема веб-банка
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#21A19A] to-[#107F8C] text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-[8px] leading-none flex items-center justify-center">
                ИИ-ассистент
              </div>
            </div>

            {/* Right-side Action Controls */}
            <div className="flex items-center space-x-5">
              <div className="flex items-center space-x-4">
                {/* Phone icon */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Позвонить в банк">
                  <img src="/ic_srv_phone_default_20_w.svg" className="w-[20px] h-[20px]" alt="Phone" />
                </button>

                {/* Bell icon with "4" notification badge */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Уведомления">
                  <img src="/ic_srv_bell_default_20_w.svg" className="w-[20px] h-[20px]" alt="Bell" />
                  <span className="absolute -top-1.5 -right-1.5 w-[16px] h-[16px] bg-[#DB1237] text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-white">
                    4
                  </span>
                </button>

                {/* Envelope icon with "4" messages badge */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer relative" title="Письма">
                  <img src="/ic_srv_envelope_default_20_w.svg" className="w-[20px] h-[20px]" alt="Mail" />
                  <span className="absolute -top-1.5 -right-1.5 w-[16px] h-[16px] bg-[#DB1237] text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-white">
                    4
                  </span>
                </button>

                {/* Customer client login widget with user role rotating actions */}
                <div
                  onClick={() => {
                    const nextRole = currentProfile.role === "director" ? "accountant" : "director";
                    handleRoleChange(nextRole);
                  }}
                  className="flex items-center space-x-2 pl-2 py-1 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                  title="Нажмите для циклической смены роли"
                >
                  <img
                    src="/Customer logo.svg"
                    className="w-[40px] h-[40px] rounded-full object-cover border border-[#D0D7DD]"
                    alt="Customer Logo"
                  />
                  <span className="hidden md:inline text-[13px] font-semibold text-[#1F1F22] select-none font-sans">
                    ЗАО «СЕРВИС ДЕСК»
                  </span>
                  <img
                    src="/ic_srv_arrowdown_default_16_w.svg"
                    className="w-[16px] h-[16px]"
                    alt="Arrow down"
                  />
                </div>

                {/* Question icon */}
                <button className="p-1 hover:bg-slate-50 rounded-lg transition-all cursor-pointer" title="Помощь">
                  <img src="/ic_srv_question_default_20_w.svg" className="w-[20px] h-[20px]" alt="Help" />
                </button>
              </div>
            </div>
          </header>

          {/* Back Navigation Bar under Header with Figma parameters */}
          <div className="w-full flex" id="back-bar-container">
            <div
              onClick={() => {
                setViewMode("website");
                setIsWidgetOpen(true);
              }}
              style={{
                display: 'flex',
                width: '100%',
                padding: '1px 32px',
                alignItems: 'center',
                background: 'linear-gradient(232deg, #21A19A 0%, #107F8C 100%)',
                cursor: 'pointer',
                color: '#FFF',
                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                gap: '8px',
                userSelect: 'none',
                height: '40px',
                minHeight: '40px'
              }}
              className="hover:opacity-90 active:opacity-95 transition-all select-none"
              id="back-button-bar"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="font-semibold text-xs leading-none">Назад</span>
            </div>
          </div>

          {/* SBERBUSINESS MAIN INTERACTIVE DASHBOARD SYSTEM */}
          <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-container">

              {/* LEFT COLUMN: Bank Navigation & Historical Session Manager */}
              <section className="lg:col-span-3 flex flex-col space-y-4" id="left-column">

                {/* Bank Dashboard Role Toggle Panel (Exact match to Figma dimensions & styles) */}
                <div
                  id="sber-role-panel"
                  style={{
                    width: '327px',
                    height: '295px',
                    borderRadius: '20px',
                    background: '#FFFFFF',
                    boxShadow: '0 0 6px 2px rgba(86, 91, 98, 0.08)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Top block: Avatar and Profile Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '93px',
                        height: '93px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {/* background Ellipse */}
                      <img
                        src="/Ellipse1720.svg"
                        alt="Background Ellipse"
                        style={{
                          position: 'absolute',
                          width: '93px',
                          height: '93px',
                          aspectRatio: '1/1',
                          pointerEvents: 'none',
                          zIndex: 0
                        }}
                      />
                      {/* Avatar Image (always image6.png, never changes with role) */}
                      <img
                        src="/image6.png"
                        alt="Avatar"
                        style={{
                          position: 'relative',
                          width: '76px',
                          height: '92px',
                          aspectRatio: '19/23',
                          objectFit: 'cover',
                          zIndex: 1
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          width: '168px',
                          height: '24px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          color: '#565B62',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '18px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: '32px'
                        }}
                      >
                        {currentProfile.role === "director" ? "РУКОВОДИТЕЛЬ" : "ГЛ. БУХГАЛТЕР"}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          width: '168px',
                          height: '32px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          color: '#1F1F22',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '21px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: '32px'
                        }}
                      >
                        {currentProfile.role === "director" ? "Директор" : "Бухгалтер"}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          width: '187px',
                          height: '32px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          color: 'rgba(86, 91, 98, 0.70)',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '14px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                          lineHeight: '32px'
                        }}
                      >
                        {currentProfile.role === "director" ? "ООО «ТехноПром»" : "ИП Смирнова О.Н."}
                      </div>
                    </div>
                  </div>

                  {/* infocomp: 296 x 160 */}
                  <div
                    id="infocomp"
                    style={{
                      width: '295px',
                      height: '160px',
                      borderRadius: '20px',
                      background: 'rgba(86, 91, 98, 0.07)',
                      boxShadow: '0 0 6px 2px rgba(0, 0, 0, 0.03)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                      {/* Left list block */}
                      <div
                        style={{
                          display: 'flex',
                          width: '100px',
                          height: '87px',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          color: 'rgba(86, 91, 98, 0.70)',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '15px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                        }}
                      >
                        <div>Компания:</div>
                        <div>УНП:</div>
                        <div>Пакет услуг:</div>
                      </div>

                      {/* Right list values block */}
                      <div
                        style={{
                          display: 'flex',
                          width: '160px',
                          height: '86px',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          color: 'rgba(31, 31, 34, 0.90)',
                          textAlign: 'right',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '14.5px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                        }}
                      >
                        <div className="truncate text-right">
                          {currentProfile.role === "director" ? "ООО «ТехноПром»" : "ИП Смирнова О.Н."}
                        </div>
                        <div style={{ fontFamily: 'monospace' }} className="text-right">
                          {currentProfile.role === "director" ? "191234567" : "192345678"}
                        </div>
                        <div style={{ color: '#0F7085', fontWeight: 650 }} className="text-right">
                          СберПремиум Бизнес
                        </div>
                      </div>
                    </div>

                    {/* Divider and web bank mode at bottom */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ height: '1px', background: 'rgba(86, 91, 98, 0.15)', margin: '2px 0' }} />
                      <div
                        style={{
                          display: 'flex',
                          width: '247px',
                          height: '24px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          color: 'rgba(86, 91, 98, 0.70)',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: 'SB Sans Interface, -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '10px',
                          fontStyle: 'normal',
                          fontWeight: 400,
                        }}
                      >
                        Режим: личный кабинет веб-банка
                      </div>
                    </div>
                  </div>
                </div>

                {/* Persistence Sessions History */}
                <div
                  id="appeal-history-card-6560"
                  style={{
                    width: '327px',
                    height: '250px',
                    borderRadius: '20px',
                    background: '#FFF',
                    boxShadow: '0 0 6px 2px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header: exact match of image10 icon and ИСТОРИЯ ОБРАЩЕНИЙ text */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', height: '64px', boxSizing: 'border-box', flexShrink: 0 }}>
                    <img
                      src="/image10.png"
                      alt="History Icon"
                      style={{
                        width: '38px',
                        height: '36px',
                        aspectRatio: '19/18',
                        display: 'block',
                        objectFit: 'cover'
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        width: '256px',
                        height: '35px',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#1F1F22',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '17px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '32px'
                      }}
                    >
                      <span>ИСТОРИЯ ОБРАЩЕНИЙ</span>
                      <button
                        onClick={() => handleCreateNewSession(currentProfile.role)}
                        style={{
                          display: 'flex',
                          width: '23px',
                          height: '27px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          color: '#095A75',
                          fontFamily: '"SB Sans Interface", sans-serif',
                          fontSize: '48px',
                          fontStyle: 'normal',
                          fontWeight: 300,
                          lineHeight: '32px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        className="hover:opacity-80 transition-all"
                        title="Начать новую ИИ сессию"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Sessions List Container with Custom slider track */}
                  <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '12px 14px 12px 16px', boxSizing: 'border-box', gap: '8px' }}>
                    <div
                      onScroll={(e) => {
                        const target = e.currentTarget;
                        const scrollHeight = target.scrollHeight;
                        const clientHeight = target.clientHeight;
                        const scrollTop = target.scrollTop;
                        const maxScroll = scrollHeight - clientHeight;
                        if (maxScroll > 0) {
                          setHistoryScrollProgress(scrollTop / maxScroll);
                        } else {
                          setHistoryScrollProgress(0);
                        }
                      }}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                      className="[&::-webkit-scrollbar]:hidden"
                    >
                      {sessions.map((session) => {
                        const isSelected = session.id === currentSessionId;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => {
                              setCurrentSessionId(session.id);
                              setCrmPayload(null);
                              setIsOperatorActive(false);
                              const prof = bankProfiles.find(p => p.role === session.role);
                              if (prof) {
                                setCurrentProfile(prof);
                              }
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '10px',
                              backgroundColor: isSelected ? 'rgba(186, 212, 225, 0.25)' : 'transparent',
                              transition: 'background-color 0.1s ease',
                            }}
                            className="hover:bg-slate-50"
                          >
                            {/* Grey circle inside each chat: Ellipse1723.svg */}
                            <div style={{ flexShrink: 0, marginTop: '3px' }}>
                              <img
                                src="/Ellipse1723.svg"
                                alt="Status Indicator"
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  aspectRatio: '1/1',
                                  display: 'block'
                                }}
                              />
                            </div>

                            {/* Inner session details */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                              {/* Title of session & Date */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '179px',
                                    height: '15px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#1F1F22',
                                    fontFeatureSettings: "'liga' off, 'clig' off",
                                    fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                    fontSize: '12px',
                                    fontStyle: 'normal',
                                    fontWeight: 600,
                                    lineHeight: '32px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {session.title}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '57px',
                                    height: '14px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#565B62',
                                    fontFeatureSettings: "'liga' off, 'clig' off",
                                    fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                    fontSize: '10px',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    lineHeight: '32px',
                                    textAlign: 'right'
                                  }}
                                >
                                  {session.date}
                                </div>
                              </div>

                              {/* Dynamic Count of messages in the log */}
                              <div
                                style={{
                                  display: 'flex',
                                  width: '200px',
                                  height: '27px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  color: '#565B62',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                  fontSize: '10px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '32px'
                                }}
                              >
                                {session.messages.length} сообщений в логе
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Scrollbar with track (slider.svg) and thumb (Rectangle 3.1 overlayed) */}
                    <div style={{ position: 'relative', width: '10px', height: '180px', flexShrink: 0, alignSelf: 'center' }}>
                      <img
                        src="/slider.svg"
                        alt="Scroll Track"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '10px',
                          height: '180px',
                          opacity: 0.8,
                          pointerEvents: 'none'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: `${Math.round(historyScrollProgress * 84)}px`,
                          left: 0,
                          width: '10px',
                          height: '96px',
                          borderRadius: '50px',
                          background: '#B2B8BF',
                          pointerEvents: 'none',
                          transition: 'top 0.05s linear'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Reminders Management Widget */}
                <div
                  id="sber-reminders-card"
                  style={{
                    width: '327px',
                    height: '268px',
                    borderRadius: '20px',
                    background: '#FFF',
                    boxShadow: '0 0 6px 2px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    padding: '16px 20px',
                    position: 'relative'
                  }}
                >
                  {/* Header: exact match of image17 icon and НАПОМИНАНИЯ text, plus add button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', height: '64px', boxSizing: 'border-box', flexShrink: 0 }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#095A75"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        width: '38px',
                        height: '36px',
                        display: 'block',
                        flexShrink: 0
                      }}
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    <div
                      style={{
                        display: 'flex',
                        width: '256px',
                        height: '35px',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#1F1F22',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '17px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '32px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        НАПОМИНАНИЯ ({reminders.filter(r => r.isActive).length})
                      </div>

                      <button
                        onClick={() => setIsAddingReminder(!isAddingReminder)}
                        style={{
                          display: 'flex',
                          width: '23px',
                          height: '27px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: '#095A75',
                          fontFamily: '"SB Sans Interface", sans-serif',
                          fontSize: '48px',
                          fontStyle: 'normal',
                          fontWeight: 300,
                          lineHeight: '32px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          outline: 'none',
                          userSelect: 'none'
                        }}
                        title="Добавить напоминание"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Filters Component (infocomp) */}
                  <div
                    style={{
                      width: '287px',
                      height: '30px',
                      background: 'rgba(86, 91, 98, 0.07)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      boxSizing: 'border-box',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: '65px',
                        height: '31px',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        color: '#565B62',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '15px'
                      }}
                    >
                      ФИЛЬТР:
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setRemindersFilter('current')}
                        style={{
                          display: 'flex',
                          padding: '2px 8px',
                          height: '17px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: remindersFilter === 'current' ? '#095A75' : '#313C46',
                          background: remindersFilter === 'current' ? 'rgba(9, 90, 117, 0.1)' : 'transparent',
                          borderRadius: '4px',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '8px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: '15px',
                          cursor: 'pointer',
                          border: 'none',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Текущая роль
                      </button>
                      <button
                        onClick={() => setRemindersFilter('all')}
                        style={{
                          display: 'flex',
                          padding: '2px 8px',
                          height: '17px',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: remindersFilter === 'all' ? '#095A75' : '#313C46',
                          background: remindersFilter === 'all' ? 'rgba(9, 90, 117, 0.1)' : 'transparent',
                          borderRadius: '4px',
                          fontFeatureSettings: "'liga' off, 'clig' off",
                          fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                          fontSize: '8px',
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: '15px',
                          cursor: 'pointer',
                          border: 'none',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Все роли
                      </button>
                    </div>
                  </div>

                  {/* Manual Creation Form */}
                  {isAddingReminder && (
                    <form
                      onSubmit={handleCreateReminder}
                      style={{
                        background: 'rgba(86, 91, 98, 0.04)',
                        border: '1px solid rgba(86, 91, 98, 0.15)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#565B62', marginBottom: '2px' }}>ЧТО НАПОМНИТЬ:</label>
                        <input
                          type="text"
                          required
                          value={newReminderText}
                          onChange={(e) => setNewReminderText(e.target.value)}
                          placeholder="Текст напоминания..."
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: '10px',
                            background: '#FFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#565B62', marginBottom: '2px' }}>ПЕРИОДИЧНОСТЬ:</label>
                        <select
                          value={newReminderFrequency}
                          onChange={(e) => setNewReminderFrequency(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 8px',
                            fontSize: '10px',
                            background: '#FFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="Каждый первый понедельник">Каждый первый понедельник</option>
                          <option value="Каждый понедельник">Каждый понедельник</option>
                          <option value="Каждую пятницу">Каждую пятницу</option>
                          <option value="Каждое 10-е число месяца">Каждое 10-е число месяца</option>
                          <option value="Каждое 20-е число месяца">Каждое 20-е число месяца</option>
                          <option value="Ежемесячно">Ежемесячно</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'end' }}>
                        <button
                          type="button"
                          onClick={() => setIsAddingReminder(false)}
                          style={{
                            fontSize: '9px',
                            color: '#565B62',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          style={{
                            fontSize: '9px',
                            background: '#095A75',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Добавить
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Reminders (with custom infocomp layout per item) */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      paddingRight: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                    className="scrollbar-thin"
                  >
                    {reminders.filter(rem => remindersFilter === 'all' || rem.role === currentProfile.role).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: '11px', background: 'rgba(86, 91, 98, 0.02)', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>
                        <Clock style={{ width: '20px', height: '20px', margin: '0 auto 4px auto', color: '#D1D5DB' }} />
                        <span>Напоминаний нет.<br />Напишите в ИИ-чат или создайте кнопкой <b>+</b></span>
                      </div>
                    ) : (
                      reminders
                        .filter(rem => remindersFilter === 'all' || rem.role === currentProfile.role)
                        .map((rem) => (
                          <div
                            key={rem.id}
                            style={{
                              width: '100%',
                              height: '70px',
                              background: 'rgba(86, 91, 98, 0.07)',
                              filter: 'drop-shadow(0px 0px 6px rgba(0, 0, 0, 0.25))',
                              borderRadius: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              boxSizing: 'border-box',
                              padding: '6px 10px',
                              position: 'relative',
                              gap: '2px',
                              flexShrink: 0,
                              opacity: rem.isActive ? 1 : 0.6
                            }}
                          >
                            {/* Top Row: Role, DateTime, Delete Icon */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '15px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  width: '65px',
                                  height: '15px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  color: rem.role === 'director' ? '#095A75' : '#565B62',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                  fontSize: '13px',
                                  fontStyle: 'normal',
                                  fontWeight: 600,
                                  lineHeight: '15px'
                                }}
                              >
                                {rem.role === 'director' ? 'Директор' : 'Бухгалтер'}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '100px',
                                    height: '15px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#565B62',
                                    fontFeatureSettings: "'liga' off, 'clig' off",
                                    fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                    fontSize: '10px',
                                    fontStyle: 'normal',
                                    fontWeight: 400,
                                    lineHeight: '15px',
                                    textAlign: 'right'
                                  }}
                                >
                                  {rem.createdAt || '13.06.2026, 12:00'}
                                </div>

                                <button
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: '0 2px',
                                    outline: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Удалить"
                                >
                                  <img
                                    src="/image18.png"
                                    alt="Delete Icon"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23565b62' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/></svg>";
                                    }}
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      objectFit: 'contain'
                                    }}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Middle Row: Text description */}
                            <div style={{ display: 'flex', alignItems: 'center', height: '26px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  width: '260px',
                                  height: '24px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  color: '#313C46',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                  fontSize: '11px',
                                  fontStyle: 'normal',
                                  fontWeight: 600,
                                  lineHeight: '12px',
                                  overflow: 'hidden',
                                  textAlign: 'left'
                                }}
                                title={rem.text}
                              >
                                <div style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  textDecoration: rem.isActive ? 'none' : 'line-through'
                                }}>
                                  {rem.text}
                                </div>
                              </div>
                            </div>

                            {/* Bottom Row: Toggle (Switch), Time value */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
                              <button
                                onClick={() => handleToggleReminder(rem.id, rem.isActive)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <img
                                  src={rem.isActive ? "/_ic_toggle_active.svg" : "/_ic_toggle_inactive.svg"}
                                  alt="Toggle"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = rem.isActive
                                      ? "data:image/svg+xml;utf8,<svg width='30' height='16' viewBox='0 0 34 20' fill='none' xmlns='http://www.w3.org/2000/svg'><rect width='34' height='20' rx='10' fill='%23095A75'/><circle cx='24' cy='10' r='8' fill='white'/></svg>"
                                      : "data:image/svg+xml;utf8,<svg width='30' height='16' viewBox='0 0 34 20' fill='none' xmlns='http://www.w3.org/2000/svg'><rect width='34' height='20' rx='10' fill='%23B2B8BF'/><circle cx='10' cy='10' r='8' fill='white'/></svg>";
                                  }}
                                  style={{
                                    width: '30px',
                                    height: '16px',
                                    cursor: 'pointer'
                                  }}
                                />
                              </button>

                              <div
                                style={{
                                  display: 'flex',
                                  width: '180px',
                                  height: '15px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  color: '#565B62',
                                  fontFeatureSettings: "'liga' off, 'clig' off",
                                  fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                                  fontSize: '10px',
                                  fontStyle: 'normal',
                                  fontWeight: 400,
                                  lineHeight: '15px',
                                  textAlign: 'right',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {rem.frequency}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              {/* MIDDLE COLUMN: Main Web-Bank Screen & Chat Area */}
              <section className="lg:col-span-6 flex flex-col space-y-6" id="middle-column">

                {/* Simulated Live Accounts Statistics */}
                <div className="w-full overflow-hidden select-none flex justify-center" id="accounts-card-wrapper">
                  {(() => {
                    const isDir = currentProfile.role === "director";
                    const displayCompanyName = isDir ? "ООО «ТЕХНОПРОМ»" : "ИП СМИРНОВА О.Н.";
                    const displayMetaInfo = isDir ? "ИНН 7800921000 · КПП 7701" : "УНП 192345678";

                    const col1Title = isDir ? "Общий остаток на счетах" : "Консультационный лимит УСН";
                    const col1Value = isDir ? "14 664.50 Б" : "Расчет готов";
                    const col1Sub = isDir ? "Ликвидность стабильна" : "НСБУ сведен";

                    const col2Title = isDir ? "Одобренный овердрафт" : "НДС к вычету / уплате";
                    const col2Value = isDir ? "5 000 000 Б" : "12 000 Б";
                    const col2Sub = isDir ? "Овердрафт подключен" : "Сумма снижена";

                    const col3Title = isDir ? "В обработке банком" : "Оплата взносов";
                    const col3Value = isDir ? "1 000 050 Б" : "Выполнено";
                    const col3Sub = isDir ? "Ожидает акцепта" : "Оплачено за квартал";

                    return (
                      <div
                        id="sber-accounts-card"
                        style={{
                          width: '772px',
                          height: '200px',
                          borderRadius: '25px',
                          border: '1.5px solid #107F8C',
                          background: 'linear-gradient(232deg, rgba(33, 161, 154, 0.90) 0%, rgba(16, 127, 140, 0.90) 100%)',
                          boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '16px 16px 16px 137px',
                          fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          color: '#FFF',
                          userSelect: 'none'
                        }}
                      >
                        {/* Left Mascot Image */}
                        <div
                          id="mascot-image-16"
                          style={{
                            position: 'absolute',
                            left: '0px',
                            top: '-1px',
                            width: '123px',
                            height: '202px',
                            aspectRatio: '123/202',
                            borderRadius: '27px',
                            backgroundImage: "url('/image16.png')",
                            backgroundPosition: "center",
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            backgroundColor: "transparent",
                            flexShrink: 0
                          }}
                        />

                        {/* Top Line */}
                        <div
                          style={{
                            display: 'flex',
                            width: '619px',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          id="card-top-header"
                        >
                          <div
                            style={{
                              display: 'flex',
                              width: '320px',
                              height: '32px',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              color: 'rgba(255, 255, 255, 0.90)',
                              textAlign: 'left',
                              fontFeatureSettings: "'liga' off, 'clig' off",
                              fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              fontSize: '20px',
                              fontStyle: 'normal',
                              fontWeight: 600,
                              lineHeight: '32px'
                            }}
                            id="card-company-name"
                          >
                            {displayCompanyName}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              width: '260px',
                              height: '32px',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              color: '#FFF',
                              textAlign: 'right',
                              fontFeatureSettings: "'liga' off, 'clig' off",
                              fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              fontSize: '13px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '32px'
                            }}
                            id="card-inn-kpp"
                          >
                            {displayMetaInfo}
                          </div>
                        </div>

                        {/* Stats Columns Row */}
                        <div
                          style={{
                            display: 'flex',
                            width: '619px',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            marginTop: '8px'
                          }}
                          id="card-stats-row"
                        >
                          {/* Column 1 */}
                          <div
                            style={{
                              display: 'flex',
                              width: '205px',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center'
                            }}
                            id="card-col-1"
                          >
                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12px',
                                fontStyle: 'normal',
                                fontWeight: 400,
                                lineHeight: 'normal'
                              }}
                            >
                              {col1Title}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '175px',
                                height: '43px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '24px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                              className="mt-1"
                            >
                              {col1Value}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12.5px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                            >
                              {col1Sub}
                            </div>
                          </div>

                          {/* Divider 1 */}
                          <div className="w-[1px] bg-white/20 my-1 self-stretch" id="card-div-1" />

                          {/* Column 2 */}
                          <div
                            style={{
                              display: 'flex',
                              width: '205px',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center'
                            }}
                            id="card-col-2"
                          >
                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12px',
                                fontStyle: 'normal',
                                fontWeight: 400,
                                lineHeight: 'normal'
                              }}
                            >
                              {col2Title}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '175px',
                                height: '43px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '24px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                              className="mt-1"
                            >
                              {col2Value}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12.5px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                            >
                              {col2Sub}
                            </div>
                          </div>

                          {/* Divider 2 */}
                          <div className="w-[1px] bg-white/20 my-1 self-stretch" id="card-div-2" />

                          {/* Column 3 */}
                          <div
                            style={{
                              display: 'flex',
                              width: '205px',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center'
                            }}
                            id="card-col-3"
                          >
                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12px',
                                fontStyle: 'normal',
                                fontWeight: 400,
                                lineHeight: 'normal'
                              }}
                            >
                              {col3Title}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '175px',
                                height: '43px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#FFF',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '24px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                              className="mt-1"
                            >
                              {col3Value}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                width: '205px',
                                height: '32px',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: (isDir && col3Sub === "Ожидает акцепта") ? '#FFB13B' : '#FFF',
                                textShadow: (isDir && col3Sub === "Ожидает акцепта") ? '0 3px 5px rgba(0, 0, 0, 0.25)' : 'none',
                                fontFeatureSettings: "'liga' off, 'clig' off",
                                fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                fontSize: '12.5px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: 'normal'
                              }}
                            >
                              {col3Sub}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* SberBusiness Live AI Assistant Chat Box */}
                <div className="w-full flex justify-center" id="chat-box-wrapper">
                  <div
                    id="chat-box-6557"
                    style={{
                      width: '772px',
                      height: '592px',
                      borderRadius: '8px',
                      background: '#FFF',
                      boxShadow: '0 1px 3px 0 rgba(31, 31, 34, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                  {/* Box Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', flexShrink: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        height: '32px',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        color: '#1F1F22',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                        fontSize: '21px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '32px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ИИ-ассистент СберГид
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button
                        onClick={handleTriggerManualHandoff}
                        style={{
                          display: 'flex',
                          width: '175px',
                          height: '33px',
                          padding: '0 12px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          borderRadius: '8px',
                          background: '#FFD9A0',
                          boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#1F1F22',
                          fontFamily: '"SB Sans Interface", sans-serif',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        className="hover:opacity-90 active:scale-98 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Позвать оператора</span>
                      </button>

                      {/* ic_srv_close_default_20_w.svg - крестик для закрытия */}
                      <button
                        onClick={() => {
                          setViewMode("website");
                          setIsWidgetOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px'
                        }}
                        className="hover:opacity-75 transition-opacity"
                        title="Вернуться на сайт"
                      >
                        <img
                          src="/ic_srv_close_default_20_w.svg"
                          alt="Close"
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'block'
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rectangle 3 - разделяет шапку от самого чата */}
                  <div
                    style={{
                      width: '100%',
                      height: '1px',
                      background: '#D0D7DD',
                      flexShrink: 0
                    }}
                  />

                  {/* Main section: 528px workspace containing logs zone and input zone on left, with scroll track on right */}
                  <div style={{ display: 'flex', width: '100%', height: '528px', flexShrink: 0, overflow: 'hidden' }}>

                    {/* Left part: Messages View + Input bar */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                      {/* Messages block */}
                      <div
                        onScroll={(e) => {
                          const target = e.currentTarget;
                          const scrollHeight = target.scrollHeight;
                          const clientHeight = target.clientHeight;
                          const scrollTop = target.scrollTop;
                          const maxScroll = scrollHeight - clientHeight;
                          if (maxScroll > 0) {
                            setChatScrollProgress(scrollTop / maxScroll);
                          } else {
                            setChatScrollProgress(0);
                          }
                        }}
                        style={{
                          flex: 1,
                          overflowY: 'auto',
                          padding: '16px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none'
                        }}
                        className="[&::-webkit-scrollbar]:hidden"
                      >
                        {(!currentSession || currentSession.messages.length === 0) && (
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-center space-y-3 my-2">
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="max-w-md mx-auto">
                              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                                Умный сценарий СберИИ
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                Нажмите на готовый пример вопроса ниже, соответствующий вашей текущей роли:
                              </p>
                            </div>

                            {currentProfile.role === "director" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Какие условия овердрафта и кредитования доступны нашей компании ООО 'ТехноПром'?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → Условия овердрафта
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Чем выгоден лизинг оборудования для ООО 'ТехноПром' по сравнению с кредитом?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → Плюсы лизинга
                                </button>
                              </div>
                            ) : currentProfile.role === "accountant" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Как сдать ближайший отчет по налогам и какие требования РСБУ мы должны учесть?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → Отчетность РСБУ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Какие регламенты по валютному контролю при сумме контракта 45 000 USD?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → Валютный контроль
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Какие обучающие программы и курсы СберУниверситета открыты по моему профилю?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → СберУниверситет курсы
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(undefined, "Как запустить бронирование отеля и авиабилетов в системе СберБизнес Командировки?")}
                                  className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                                >
                                  → Бронь командировки
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Iterate Chat Logs */}
                        {currentSession?.messages.map((msg) => {
                          const isUser = msg.role === "user";
                          const isOperatorText = msg.role === "operator";

                          if (isUser) {
                            return (
                              <div
                                key={msg.id}
                                className="flex justify-end w-full"
                              >
                                {/* User message bubble: Rectangle 6557 */}
                                <div
                                  style={{
                                    width: '450px',
                                    borderRadius: '10px',
                                    background: '#21A19A',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxSizing: 'border-box'
                                  }}
                                  className="shadow-sm"
                                >
                                  {/* Top header row */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    {/* Sender Title */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        width: '63px',
                                        height: '24px',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        color: '#FFF',
                                        fontFamily: '"Roboto", "SB Sans Interface", sans-serif',
                                        fontSize: '20px',
                                        fontWeight: 500,
                                        lineHeight: '24px',
                                        letterSpacing: '-0.25px'
                                      }}
                                    >
                                      Вы
                                    </div>

                                    {/* Date */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        width: '176px',
                                        height: '14px',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        color: '#FFF',
                                        fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                        fontSize: '11px',
                                        fontWeight: 400,
                                        lineHeight: '24px',
                                        textAlign: 'right'
                                      }}
                                    >
                                      {msg.timestamp}
                                    </div>
                                  </div>

                                  {/* Message content text */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      color: '#FFF',
                                      fontFeatureSettings: "'liga' off, 'clig' off",
                                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                      fontSize: '15px',
                                      fontWeight: 400,
                                      lineHeight: '24px',
                                      flexDirection: 'column',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {renderMessageContent(msg.content, isUser)}
                                  </div>

                                  {msg.paymentDraft && (
                                    <PaymentDraftCard draft={msg.paymentDraft} />
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            {/* Bot/Operator message bubble: Rectangle 6557 - ответы чата */}
                            const titleText = isOperatorText ? "Александр" : "СберГид";
                            return (
                              <div
                                key={msg.id}
                                className="flex justify-start w-full"
                              >
                                <div
                                  style={{
                                    width: '450px',
                                    borderRadius: '10px',
                                    background: '#E4E8EB',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxSizing: 'border-box'
                                  }}
                                  className="shadow-sm"
                                >
                                  {/* Top header row */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    {/* Sender Title */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        width: '109px',
                                        height: '24px',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        color: '#1F1F22',
                                        fontFamily: '"Roboto", "SB Sans Interface", sans-serif',
                                        fontSize: '20px',
                                        fontWeight: 500,
                                        lineHeight: '24px',
                                        letterSpacing: '-0.25px'
                                      }}
                                    >
                                      {titleText}
                                    </div>

                                    {/* Date */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        width: '176px',
                                        height: '14px',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        color: '#1F1F22',
                                        fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                        fontSize: '11px',
                                        fontWeight: 400,
                                        lineHeight: '24px',
                                        textAlign: 'right'
                                      }}
                                    >
                                      {msg.timestamp}
                                    </div>
                                  </div>

                                  {/* Underline separating sender name and message content */}
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '1px',
                                      background: '#1F1F22',
                                      margin: '6px 0 10px 0'
                                    }}
                                  />

                                  {/* Message content text */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      color: '#1F1F22',
                                      fontFeatureSettings: "'liga' off, 'clig' off",
                                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                      fontSize: '15px',
                                      fontWeight: 400,
                                      lineHeight: '24px',
                                      flexDirection: 'column',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {renderMessageContent(msg.content, isUser)}
                                  </div>

                                  {msg.paymentDraft && (
                                    <PaymentDraftCard draft={msg.paymentDraft} />
                                  )}

                                  {msg.callOperator && (
                                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 flex items-start space-x-2">
                                      <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="font-bold">Инициирована бесшовная передача диалога!</p>
                                        <p className="mt-0.5 opacity-90">
                                          Сформирован gRPC-пакет с метаданными. Посмотрите на шину в правой колонке для парсинга JSON-пакета передачи.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })}

                        {/* Live Operator message bubbles */}
                        {isOperatorActive && operatorMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="flex justify-start w-full"
                          >
                            <div
                              style={{
                                width: '450px',
                                borderRadius: '10px',
                                background: '#FFD9A0',
                                padding: '12px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                boxSizing: 'border-box'
                              }}
                              className="shadow-sm"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '109px',
                                    height: '24px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#1F1F22',
                                    fontFamily: '"Roboto", "SB Sans Interface", sans-serif',
                                    fontSize: '20px',
                                    fontWeight: 500,
                                    lineHeight: '24px',
                                    letterSpacing: '-0.25px'
                                  }}
                                >
                                  Александр
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    width: '176px',
                                    height: '14px',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    color: '#1F1F22',
                                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                    fontSize: '11px',
                                    fontWeight: 400,
                                    lineHeight: '24px',
                                    textAlign: 'right'
                                  }}
                                >
                                  {msg.timestamp}
                                </div>
                              </div>

                              <div
                                style={{
                                  width: '100%',
                                  height: '1px',
                                  background: '#1F1F22',
                                  margin: '6px 0 10px 0'
                                }}
                              />

                              <p
                                style={{
                                  color: '#1F1F22',
                                  fontFamily: '"SB Sans Interface", sans-serif',
                                  fontSize: '15px',
                                  fontWeight: 400,
                                  lineHeight: '24px'
                                }}
                              >
                                {msg.content}
                              </p>
                              <div className="mt-2.5 pt-2 border-t border-amber-900/10 flex items-center text-[10px] text-amber-900 font-semibold">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-ping"></span>
                                Линия переведена на оператора техподдержки. ИИ заблокирован для ветки.
                              </div>
                            </div>
                          </div>
                        ))}

                        {isTyping && (
                          <div className="flex justify-start items-center space-x-2 text-xs text-slate-400 animate-pulse">
                            <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                              <Bot className="w-3.5 h-3.5 animate-spin" />
                            </div>
                            <span>СберБанк ИИ анализирует налоги и счета вашей компании...</span>
                          </div>
                        )}

                        <div ref={chatBottomRef} />
                      </div>

                      {/* Input zone: Content */}
                      <form
                        onSubmit={handleSendMessage}
                        style={{
                          display: 'flex',
                          padding: '8px 12px',
                          alignItems: 'center',
                          gap: '10px',
                          alignSelf: 'stretch',
                          borderRadius: '8px',
                          border: '1px solid #D0D7DD',
                          background: '#FFF',
                          margin: '12px 14px 12px 14px',
                          boxSizing: 'border-box',
                          flexShrink: 0
                        }}
                      >
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Введите ваш запрос"
                          style={{
                            flex: '1 0 0',
                            border: 'none',
                            outline: 'none',
                            color: '#1F1F22',
                            fontFamily: '"SB Sans Interface", sans-serif',
                            fontSize: '16px',
                            fontWeight: 400,
                            lineHeight: '24px',
                            background: 'transparent'
                          }}
                          className="placeholder:text-[#7D838A]"
                        />

                        {/* image5 - кнопка отправить */}
                        <button
                          type="submit"
                          disabled={isTyping}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '44px',
                            height: '40px',
                            opacity: isTyping ? 0.5 : 1,
                            flexShrink: 0
                          }}
                          className="hover:scale-102 active:scale-98 transition-all"
                        >
                          <img
                            src="/image5.png"
                            alt="Send Query"
                            style={{
                              width: '44px',
                              height: '40px',
                              aspectRatio: '11/10',
                              display: 'block',
                              objectFit: 'contain'
                            }}
                          />
                        </button>
                      </form>

                    </div>

                    {/* Right part: Custom Scrollbar with track background + thumb */}
                    <div style={{ position: 'relative', width: '10px', height: '100%', flexShrink: 0 }}>
                      <div style={{ position: 'relative', width: '10px', height: '100%', pointerEvents: 'none' }}>
                        {/* Background slider track */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="528"
                          viewBox="0 0 10 528"
                          fill="none"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '10px',
                            height: '100%',
                            display: 'block'
                          }}
                        >
                          <path d="M0 0H10V525C10 526.657 8.65685 528 7 528H0V0Z" fill="#E4E8EB"/>
                        </svg>

                        {/* Rectangle 3.1 - слайдер */}
                        <div
                          style={{
                            position: 'absolute',
                            top: `${Math.round(chatScrollProgress * (528 - 96))}px`,
                            left: 0,
                            width: '10px',
                            height: '96px',
                            borderRadius: '50px',
                            background: '#B2B8BF',
                            pointerEvents: 'none',
                            transition: 'top 0.05s linear'
                          }}
                        />
                      </div>
                    </div>

                  </div>

                </div>
                </div>
              </section>

              {/* RIGHT COLUMN: Cross-sales Products Widget & Interactive Term Inspector */}
              <section className="lg:col-span-3 flex flex-col space-y-4" id="right-column">

                {/* Term Help Box */}
                <div
                  id="glossary-card-6559"
                  style={{
                    width: '327px',
                    height: '268px',
                    borderRadius: '20px',
                    background: '#FFF',
                    boxShadow: '0 0 6px 2px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header: Exact match to Screenshot 2 layout */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', height: '64px', boxSizing: 'border-box', flexShrink: 0 }}>
                    {/* Rectangle.png (book page layout) with vector overlays */}
                    <div style={{ position: 'relative', width: '28px', height: '37px', aspectRatio: '28/37', flexShrink: 0 }}>
                      <img
                        src="/Rectangle.png"
                        alt="Rectangle Book"
                        style={{
                          width: '28px',
                          height: '37px',
                          display: 'block',
                          objectFit: 'cover'
                        }}
                      />
                      <img
                        src="/Vector-1.svg"
                        alt="Vector Circle"
                        style={{
                          position: 'absolute',
                          width: '14px',
                          height: '13px',
                          left: '7px',
                          top: '9px',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      />
                      <img
                        src="/Vector.svg"
                        alt="Vector Pages Line"
                        style={{
                          position: 'absolute',
                          width: '8px',
                          height: '5px',
                          left: '10px',
                          top: '13px',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                      />
                    </div>

                    {/* Header text layout */}
                    <div
                      style={{
                        display: 'flex',
                        width: '256px',
                        height: '35px',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        color: '#1F1F22',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '17px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '32px'
                      }}
                    >
                      СЛОВАРЬ ТЕРМИНОВ
                    </div>
                  </div>

                  {/* Line 5 divider that separates header from content */}
                  <div
                    style={{
                      width: '327px',
                      height: '1px',
                      background: 'rgba(133, 137, 142, 0.90)',
                      flexShrink: 0
                    }}
                  />

                  {/* Explanation block with precise color styling */}
                  <div style={{ padding: '24px 20px', flex: 1, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                    <div
                      style={{
                        display: 'flex',
                        width: '304px',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '14.5px',
                        lineHeight: '20px'
                      }}
                    >
                      <p style={{ margin: 0, lineHeight: '20px' }}>
                        <span
                          style={{
                            color: '#035C7A',
                            fontWeight: 600,
                            fontFeatureSettings: "'liga' off, 'clig' off",
                            fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                            fontSize: '14.5px',
                            lineHeight: '20px'
                          }}
                        >
                          {(selectedTerm ? selectedTerm.word : "овердрафт").toUpperCase()}
                        </span>
                        <span
                          style={{
                            color: '#565B62',
                            fontWeight: 400,
                            fontFeatureSettings: "'liga' off, 'clig' off",
                            fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                            fontSize: '14.5px',
                            lineHeight: '20px'
                          }}
                        >
                          {" – "}{
                            selectedTerm
                              ? (selectedTerm.word.toLowerCase() === "овердрафт"
                                  ? "автоматический кредит на счёт при временной нехватке средств."
                                  : selectedTerm.shortDescription)
                              : "автоматический кредит на счёт при временной нехватке средств."
                          }
                        </span>
                      </p>
                    </div>

                  </div>
                </div>

                {/* Smart Cross-Sales widget */}
                <div
                  id="sber-special-offers-card"
                  style={{
                    width: '327px',
                    height: '520px',
                    borderRadius: '20px',
                    background: '#FFF',
                    boxShadow: '0px 0px 6px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    padding: '16px 0px 20px 0px',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  {/* Header: image14 icon and СПЕЦПРЕДЛОЖЕНИЯ text */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 20px', height: '41px', boxSizing: 'border-box', flexShrink: 0 }}>
                    <img
                      src="/image14.png"
                      alt="Gift Offer Icon"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='39' height='41' viewBox='0 0 24 24' fill='none' stroke='%23095A75' stroke-width='2'><rect x='3' y='8' width='18' height='12' rx='2'/><path d='M12 2v6'/><path d='M12 8H3'/><path d='M12 8h9'/></svg>";
                      }}
                      style={{
                        width: '39.131px',
                        height: '41px',
                        aspectRatio: '39.13/41.00',
                        display: 'block',
                        objectFit: 'cover'
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        width: '256px',
                        height: '35px',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        color: '#1F1F22',
                        fontFeatureSettings: "'liga' off, 'clig' off",
                        fontFamily: '"SB Sans Interface", -apple-system, BlinkMacSystemFont, sans-serif',
                        fontSize: '17px',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        lineHeight: '32px'
                      }}
                    >
                      СПЕЦПРЕДЛОЖЕНИЯ
                    </div>
                  </div>

                  {/* Line 6 - divider */}
                  <div
                    style={{
                      width: '327px',
                      height: '1px',
                      background: 'rgba(133, 137, 142, 0.90)',
                      margin: '12px 0 16px 0',
                      flexShrink: 0
                    }}
                  />

                  {/* Offers List */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      padding: '0 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxSizing: 'border-box'
                    }}
                    className="scrollbar-thin"
                    id="offers-list"
                  >
                    {currentProfile.availableOffers.map((offer, index) => {
                      return (
                        <div
                          key={offer.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            background: '#FFFFFF',
                            border: '1px solid rgba(86, 91, 98, 0.12)',
                            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
                            borderRadius: '20px',
                            padding: '12px 14px',
                            boxSizing: 'border-box',
                            flexShrink: 0,
                            gap: '4px'
                          }}
                        >
                          {/* Top Row: Icon, Title, and Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                              {index === 0 ? (
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    flexShrink: 0,
                                    aspectRatio: '1/1',
                                    backgroundImage: "url('/Gemini_Generated_Image_j1zfpkj1zfpkj1zf-3.png')",
                                    backgroundPosition: '50% 50%',
                                    backgroundSize: 'cover',
                                    backgroundRepeat: 'no-repeat',
                                    borderRadius: '4px',
                                    backgroundColor: 'lightgray'
                                  }}
                                />
                              ) : index === 1 ? (
                                <div
                                  style={{
                                    width: '24px',
                                    height: '22px',
                                    flexShrink: 0,
                                    aspectRatio: '12/11',
                                    backgroundImage: "url('/4690d4b49454db146456887c69a3a5b2-2.png')",
                                    backgroundPosition: '-8px -0.025px',
                                    backgroundSize: '175% 100.227%',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'lightgray'
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '27px',
                                    height: '27px',
                                    flexShrink: 0,
                                    aspectRatio: '1/1',
                                    backgroundImage: "url('/image15.png')",
                                    backgroundPosition: '50% 50%',
                                    backgroundSize: 'cover',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: 'lightgray'
                                  }}
                                />
                              )}
                              <div
                                style={{
                                  color: 'rgba(27, 39, 51, 0.90)',
                                  fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                  fontSize: '13.5px',
                                  fontStyle: 'normal',
                                  fontWeight: 600,
                                  lineHeight: '1.2',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={offer.title}
                              >
                                {offer.title}
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                color: '#095A75',
                                fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                                fontSize: '10px',
                                fontStyle: 'normal',
                                fontWeight: 600,
                                lineHeight: '1',
                                textAlign: 'right',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              {offer.badge}
                            </div>
                          </div>

                          {/* Description */}
                          <div
                            style={{
                              display: 'flex',
                              width: '100%',
                              minHeight: '48px',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              color: '#7D838A',
                              fontFeatureSettings: "'liga' off, 'clig' off",
                              fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                              fontSize: '11.5px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '16px'
                            }}
                          >
                            {offer.description}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => handleSendMessage(undefined, `Расскажи подробнее, как подключить продукт: ${offer.title}. Интересуют тарифы.`)}
                            style={{
                              color: '#095A75',
                              fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                              fontSize: '10px',
                              fontStyle: 'normal',
                              fontWeight: 400,
                              lineHeight: '24px',
                              cursor: 'pointer',
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              textAlign: 'left',
                              width: 'fit-content'
                            }}
                          >
                            Подключить / Подробнее →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Support CRM Queue Bus */}
                {crmPayload && (
                  <div className="bg-[#1e1e24] text-slate-200 rounded-xl shadow-lg border border-slate-700 p-4 min-h-[220px] animate-fade-in" id="crm-bus-monitor">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center">
                      <Server className="w-4 h-4 mr-1.5 text-amber-400" />
                      Мониторинг Шин gRPC CRM Сбера
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-3 leading-normal">
                      Пакет контекста ИНН и сессии, автоматически направленный в шину поддержки:
                    </p>

                    <div className="bg-slate-900 border border-slate-800 rounded p-2.5 max-h-[180px] overflow-y-auto font-mono text-[9px] leading-relaxed text-slate-300">
                      <pre>{JSON.stringify(crmPayload, null, 2)}</pre>
                    </div>

                    <div className="mt-2 text-[9px] text-emerald-400 flex items-center font-semibold">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Пакет отправлен в CRM. ID: TKT-94285
                    </div>
                  </div>
                )}
              </section>

          </main>

          {/* Sber bank contacts and support footer */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              background: '#FFFFFF',
              marginTop: 'auto',
              flexShrink: 0
            }}
            id="sberbank-contacts-footer"
          >
            {/* Divider */}
            <div
              style={{
                display: 'flex',
                width: '1440px',
                height: '1px',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(86, 91, 98, 0.15)',
              }}
            />

            {/* Content Panel */}
            <div
              style={{
                width: '1440px',
                height: '185px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              {/* Inner centered container of 1040px width */}
              <div
                style={{
                  display: 'flex',
                  width: '1040px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px 0',
                  boxSizing: 'border-box'
                }}
              >
                {/* 1. Left block: Brand and Website link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{
                    color: '#1F1F22',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '16px'
                  }}>
                    © ОАО «Сбер Банк», 2025
                  </div>
                  <a
                    href="https://sber-bank.by"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      alignSelf: 'stretch',
                      color: '#1358BF',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                      fontSize: '12px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '16px',
                      textDecoration: 'none'
                    }}
                  >
                    sber-bank.by
                  </a>
                </div>

                {/* 2. Center block: Support numbers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    color: '#1F1F22',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 600,
                    lineHeight: '16px',
                    textAlign: 'center'
                  }}>
                    Центр клиентской поддержки:
                  </div>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span style={{
                      color: '#1F1F22',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                      fontSize: '12px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '16px'
                    }}>
                      +375 17 359-99-11
                    </span>
                    <span style={{
                      color: '#1F1F22',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                      fontSize: '12px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '16px'
                    }}>
                      +375 33 348-99-11
                    </span>
                    <span style={{
                      color: '#1F1F22',
                      fontFeatureSettings: "'liga' off, 'clig' off",
                      fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                      fontSize: '12px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '16px'
                    }}>
                      +375 29 359-99-11
                    </span>
                  </div>
                </div>

                {/* 3. Right block: Personal data policy link */}
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    color: '#1358BF',
                    fontFeatureSettings: "'liga' off, 'clig' off",
                    fontFamily: '"SB Sans Interface", -apple-system, sans-serif',
                    fontSize: '12px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '16px',
                    textDecoration: 'none'
                  }}
                >
                  Политика обработки персональных данных
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Permission Restriction Warning Modal */}
      {permissionDeniedText && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-9999 animate-fade-in p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setPermissionDeniedText(null)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">Ограничение доступа</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {permissionDeniedText}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPermissionDeniedText(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counterparties Modal */}
      {isCounterpartiesOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-9999 animate-fade-in p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setIsCounterpartiesOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 text-emerald-700 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">Реестр контрагентов компании</h3>
                <p className="text-[11px] text-slate-500 font-sans mt-0.5 font-medium">Активный профиль: <span className="text-slate-800 font-bold">{currentProfile.companyName}</span></p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800 mb-4 leading-relaxed font-sans">
              <strong>💡 Демо-режим тестирования:</strong> В СберБизнес реестр подгружается напрямую из банковской ERP-системы. Для текущего тестирования список контрагентов хранится локально в нашей базе Сбера. Наш ИИ-ассистент имеет полный доступ к реквизитам этих партнеров и деталям договоров!
            </div>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {(mockCounterpartiesByRole[currentProfile.role === "director" ? "director" : "accountant"] || []).map((c: Counterparty) => (
                <div key={c.id} className="border border-slate-100 rounded-xl p-4 hover:border-emerald-200 bg-[#fbfdfc] hover:bg-[#f6fcf9] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm font-sans">{c.name}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono select-all">УНП {c.unp}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-mono select-all">Счет: {c.iban} ({c.bankName})</p>
                    <p className="text-slate-600 font-medium font-sans">Контракт: {c.contract}</p>
                    <p className="text-[11px] text-[#475569] font-sans">{c.balanceContext}</p>
                    <div className="pt-0.5 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                      <span className="text-[10.5px] font-bold text-emerald-800 font-sans">{c.status}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCounterpartiesOpen(false);
                      setIsWidgetOpen(true);
                      const queryText = `Расскажи подробнее про нашего контрагента ${c.name}. Какие у него реквизиты, УНП и состояние по нашему договору?`;
                      handleSendMessage(undefined, queryText);
                    }}
                    className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs font-sans"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Спросить ИИ</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsCounterpartiesOpen(false)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-sans"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

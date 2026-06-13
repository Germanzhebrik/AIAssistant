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
  ArrowLeftRight
} from "lucide-react";
import { bankProfiles, glossaryTerms, mockCounterpartiesByRole } from "./data";
import { Message, ChatSession, Profile, GlossaryTerm, Counterparty } from "./types";
import { PaymentDraftCard } from "./components/PaymentDraftCard";

export default function App() {
  // Profiles & Roles State
  const [currentProfile, setCurrentProfile] = useState<Profile>(bankProfiles[0]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");

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

  // CRM Handoff state monitoring
  const [isOperatorActive, setIsOperatorActive] = useState(false);
  const [operatorMessages, setOperatorMessages] = useState<Message[]>([]);
  const [crmPayload, setCrmPayload] = useState<any | null>(null);

  // Concept View & Widget States
  const [viewMode, setViewMode] = useState<'website' | 'dashboard'>('website');
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  // Auto Scroll state
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load Sessions on Mount
  useEffect(() => {
    fetchSessions();
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
          <header className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs" id="sber-header">
            {/* Sber Circle Logo Mock */}
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xs overflow-hidden" style={{ background: "linear-gradient(135deg, #00b06c 0%, #1ea133 100%)" }}>
                {/* Sber tick symbol in SVG */}
                <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="flex items-baseline space-x-0.5">
                <span className="font-extrabold text-[#006644] text-[18px] tracking-tight font-sans">СБЕР</span>
                <span className="font-light text-[#008259] text-[18px] font-sans">Бизнес</span>
              </div>
            </div>

            {/* Quick Demo Switcher Widget in Header to maintain interactive demo capability */}
            <div className="flex items-center space-x-5">
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Контекст:</span>
                <button
                  onClick={() => handleRoleChange("director")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer ${
                    currentProfile.role === "director"
                      ? "bg-[#0b5435] text-white shadow-xs"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  💼 ООО "ТехноПром" (Владелец)
                </button>
                <button
                  onClick={() => handleRoleChange("accountant")}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition-all cursor-pointer ${
                    currentProfile.role === "accountant"
                      ? "bg-[#0b5435] text-white shadow-xs"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  📊 ИП Смирнова (Бухгалтер)
                </button>
              </div>

              {/* Action Buttons from right side of the Sber screenshot */}
              <div className="flex items-center space-x-3 text-slate-500">
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Позвонить в банк">
                  <Phone className="w-5 h-5 stroke-[1.5]" />
                </button>
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors relative" title="Уведомления">
                  <Bell className="w-5 h-5 stroke-[1.5]" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                </button>
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Письма">
                  <Mail className="w-5 h-5 stroke-[1.5]" />
                </button>

                {/* Profile Widget from the screenshot */}
                <div
                  onClick={() => {
                    const nextRole = currentProfile.role === "director" ? "accountant" : "director";
                    handleRoleChange(nextRole);
                  }}
                  className="flex items-center space-x-2 border-l border-slate-100 pl-4 py-1 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                  title="Нажмите для циклической смены роли"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center overflow-hidden relative shadow-2xs border border-emerald-500/20">
                    <img
                      src={
                        currentProfile.role === "director"
                          ? "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60" // Director photo
                          : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60" // Accountant female photo
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-slate-700 select-none">
                    {currentProfile.role === "director" ? "ВЛАДЕЛЕЦ БИЗНЕСА" : "ГЛАВНЫЙ БУХГАЛТЕР"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors pl-1" title="Помощь">
                  <HelpCircle className="w-5 h-5 stroke-[1.5]" />
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
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-emerald-600 to-[#128a56] hover:from-emerald-700 hover:to-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all transform hover:scale-105 active:scale-95 group z-50 border border-emerald-400/20"
            onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            title="Открыть ИИ-Ассистента Сбера"
          >
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping pointer-events-none"></div>
            {isWidgetOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Bot className="w-6.5 h-6.5 animate-pulse" />
            )}
          </div>

          {/* Floating Compact Chat Window */}
          {isWidgetOpen && (
            <div className="fixed bottom-22 right-6 w-[410px] h-[630px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-fade-in text-slate-800">

              {/* Widget Header with Sber Green design */}
              <div className="bg-gradient-to-r from-[#0b5435] to-[#128a56] text-white p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
                    С
                  </div>
                  <div>
                    <h3 className="font-bold text-xs tracking-wide">СберИИ Консультант</h3>
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                      <span className="text-[9.5px] text-emerald-200 font-medium">В режиме интеграции • Онлайн</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      setViewMode("dashboard");
                      setIsWidgetOpen(false);
                    }}
                    className="p-1.5 bg-emerald-800/60 hover:bg-emerald-800 rounded-lg text-emerald-100 flex items-center space-x-1 text-[10px] font-bold transition-all border border-emerald-700/40"
                    title="Развернуть на весь экран (Полная панель)"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Полная версия</span>
                  </button>

                  <button
                    onClick={() => setIsWidgetOpen(false)}
                    className="p-1 hover:bg-emerald-800/60 text-emerald-200 hover:text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Compact Active Role Selector Tabs inside Widget */}
              <div className="bg-slate-50 p-1.5 flex border-b border-slate-200 gap-1">
                <button
                  onClick={() => handleRoleChange("director")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    currentProfile.role === "director"
                      ? "bg-white text-[#0b5435] shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                  }`}
                  title="Владелец бизнеса / Генеральный директор"
                >
                  💼 Владелец
                </button>
                <button
                  onClick={() => handleRoleChange("accountant")}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                    currentProfile.role === "accountant"
                      ? "bg-white text-[#0b5435] shadow-xs border border-slate-200"
                      : "text-slate-500 hover:bg-slate-700 hover:bg-white/40"
                  }`}
                  title="Главный бухгалтер"
                >
                  📊 Бухгалтер
                </button>
              </div>

              {/* Screen URL bar mockup */}
              <div className="bg-slate-100/80 px-3 py-1 border-b border-slate-200/60 text-[9px] text-slate-400 flex items-center justify-between font-mono">
                <span>Адрес страницы на сайте:</span>
                <span className="text-emerald-700 font-bold truncate max-w-[200px]">
                  {currentUrl}
                </span>
              </div>

              {/* Highly prominent prompt-banner to maximize the widget to the full screen web-app */}
              <div
                onClick={() => {
                  setViewMode("dashboard");
                  setIsWidgetOpen(false);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-200 text-[10.5px] text-emerald-900 font-bold px-3 py-2 flex items-center justify-between cursor-pointer transition-colors"
                title="Развернуть на весь экран (Полная панель)"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse flex-shrink-0" />
                  <span className="truncate">Развернуть ИИ-Ассистента во весь экран</span>
                </div>
                <div className="flex items-center space-x-1 text-emerald-800 text-[10px] uppercase font-black tracking-wider flex-shrink-0">
                  <span>Развернуть</span>
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>

              {/* Widget Message Area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 relative bg-slate-50" style={{ maxHeight: "420px" }}>

                {(!currentSession || currentSession.messages.length === 0) && (
                  <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-2.5 my-1 shadow-xs">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                        Начало сессии чата
                      </h4>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        Задайте вопрос СберИИ о ваших кредитных лимитах, налогах или отчетности РСБУ. Нажмите на подсказки ниже:
                      </p>
                    </div>

                    {currentProfile.role === "director" ? (
                      <div className="space-y-1.5 max-w-xs mx-auto text-[10.5px]">
                        <button
                          onClick={() => handleSendMessage(undefined, "Какие условия овердрафта и кредитования доступны нашей компании ООО 'ТехноПром'?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Рассчитать овердрафт компании
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Чем выгоден лизинг оборудования для ООО 'ТехноПром' по сравнению с кредитом?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Лизинг оборудования ООО
                        </button>
                      </div>
                    ) : currentProfile.role === "accountant" ? (
                      <div className="space-y-1.5 max-w-xs mx-auto text-[10.5px]">
                        <button
                          onClick={() => handleSendMessage(undefined, "Как сдать ближайший отчет по налогам и какие требования РСБУ мы должны учесть?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Налоги и отчет РСБУ по УСН
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Какие регламенты по валютному контролю при сумме контракта 45 000 USD?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Правила валютного контроля
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-w-xs mx-auto text-[10.5px]">
                        <button
                          onClick={() => handleSendMessage(undefined, "Какие обучающие программы и курсы СберУниверситета открыты по моему профилю?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Посмотреть программы СберУниверситета
                        </button>
                        <button
                          onClick={() => handleSendMessage(undefined, "Как запустить бронирование отеля и авиабилетов в системе СберБизнес Командировки?")}
                          className="w-full text-left p-2 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-lg transition-colors text-slate-700 block font-medium"
                        >
                          → Оформить командировку/отель
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation line logs */}
                {currentSession?.messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const isOperatorText = msg.role === "operator";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2`}
                    >
                      {!isUser && (
                        <div className={`p-1 rounded-lg flex-shrink-0 ${
                          isOperatorText ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isOperatorText ? <Users className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </div>
                      )}

                      <div className={`max-w-[85%] rounded-xl p-3 text-[11px] shadow-xs relative ${
                        isUser
                          ? "bg-emerald-700 text-white rounded-br-none"
                          : isOperatorText
                            ? "bg-amber-50/95 border border-amber-200 text-slate-800 rounded-bl-none"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                      }`}>
                        <div className="flex items-center justify-between mb-1 border-b pb-1 border-slate-100">
                          <span className={`font-bold ${isUser ? "text-emerald-100" : isOperatorText ? "text-amber-800" : "text-emerald-850"}`}>
                            {isUser
                              ? "Вы"
                              : isOperatorText
                                ? "Лайв оператор: Александр"
                                : "ИИ-Ассистент"}
                          </span>
                          <span className="text-[8.5px] opacity-60 font-mono">{msg.timestamp}</span>
                        </div>

                        <p className="mt-1 leading-relaxed">
                          {renderMessageContent(msg.content, isUser)}
                        </p>

                        {msg.paymentDraft && (
                          <PaymentDraftCard draft={msg.paymentDraft} />
                        )}

                        {/* Special interactive indicator for automatic handoff */}
                        {msg.callOperator && (
                          <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-[9.5px] text-amber-900 flex items-start space-x-1">
                            <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <div>
                              <p className="font-bold leading-none">Инициирован gRPC handoff!</p>
                              <p className="mt-0.5 opacity-90 leading-tight">
                                Передали профиль компании ИНН и лог чата дежурному диспетчеру.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Operator live connection typing */}
                {isOperatorActive && operatorMessages.map((msg) => (
                  <div key={msg.id} className="flex justify-start items-start gap-2 animate-fade-in">
                    <div className="p-1 rounded-lg flex-shrink-0 bg-gradient-to-tr from-amber-500 to-orange-600 text-white">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="max-w-[85%] rounded-xl p-3 text-[11px] shadow-xs bg-orange-50 border border-amber-200 text-slate-800 rounded-bl-none">
                      <div className="flex items-center justify-between mb-1 border-b pb-1 border-amber-200">
                        <span className="font-bold text-amber-950 text-[10.5px]">Александр (Живой Оператор)</span>
                        <span className="text-[8.5px] text-amber-700 font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed text-slate-800">
                        {msg.content}
                      </p>
                      <div className="mt-2 pt-1 border-t border-amber-200 text-[9px] text-amber-800 font-semibold flex items-center">
                        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-ping"></span>
                        Канал переключен бесшовно на оператора.
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start items-center space-x-1.5 text-[10.5px] text-slate-400">
                    <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                      <Bot className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <span>СберИИ формулирует ответ на основе РСБУ и счетов...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />

                {/* Self-contained glossary helper dialog inside the widget bottom */}
                {selectedTerm && (
                  <div className="absolute inset-x-3 bottom-2 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 shadow-xl z-50 animate-fade-in text-slate-700">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-1 mb-1.5">
                      <span className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-widest flex items-center">
                        📚 Определение: {selectedTerm.word}
                      </span>
                      <button
                        onClick={() => setSelectedTerm(null)}
                        className="p-0.5 hover:bg-emerald-100 rounded text-slate-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h5 className="font-bold text-[11px] text-slate-800">{selectedTerm.shortDescription}</h5>
                    <p className="text-[10px] text-slate-600 mt-1 leading-normal">
                      {selectedTerm.detailedDescription}
                    </p>
                  </div>
                )}

              </div>

              {/* Widget Footer Input Bar */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-slate-100 flex items-center space-x-1 rounded-b-2xl bg-white" id="chat-widget-form">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    isOperatorActive
                      ? "Спросите оператора Александра..."
                      : `Ваш вопрос как ${currentProfile.role === "director" ? "Владелец" : currentProfile.role === "accountant" ? "Бухгалтер" : "Сотрудник"}...`
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:bg-white transition-all text-slate-800"
                />

                <button
                  type="button"
                  onClick={handleTriggerManualHandoff}
                  className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition-colors border border-transparent"
                  title="Вызвать оператора вручную"
                >
                  <Users className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={isTyping || !inputValue.trim()}
                  className="p-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          )}

        </div>
      ) : (
        /* ================= ORIGINAL WORKSPACE DASHBOARD (FULL INTEGRATED PORTAL) ================= */
        <div className="flex-1 flex flex-col bg-slate-50" id="full-dashboard">
          {/* Upper Sber-Style Brand Header with Back to Site Launcher */}
          <header className="bg-[#0b5435] text-white py-3 px-5 shadow-sm flex items-center justify-between border-b border-emerald-700/80 sticky top-0 z-40" id="sber-header">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center font-bold text-white shadow-inner shadow-black/25">
                С
              </div>
              <div>
                <div className="font-semibold text-[16px] tracking-wide flex items-center">
                  СберБизнес
                  <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 text-[10px] uppercase font-bold tracking-widest rounded text-emerald-200">
                    ИИ-Ассистент
                  </span>
                </div>
                <p className="text-[11px] text-emerald-300">Корпоративная экосистема веб-банка • Enterprise</p>
              </div>
            </div>

            {/* Back to Site Button */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setViewMode("website");
                  setIsWidgetOpen(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-850 hover:bg-emerald-800 text-white border border-emerald-700/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Вернуться к промо-странице и открыть виджет"
              >
                <ChevronLeft className="w-4 h-4 text-emerald-300" />
                <span>Вернуться на сайт</span>
              </button>

              {/* User profile toggle in header */}
              <div className="hidden sm:flex items-center bg-emerald-900/50 px-3 py-1 rounded-lg border border-emerald-700/50">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300 mr-2" />
                <div className="text-right">
                  <p className="text-[11px] text-emerald-300 leading-none">Бизнес-роль:</p>
                  <span className="text-xs font-semibold text-white">{currentProfile.roleLabel}</span>
                </div>
              </div>
            </div>
          </header>

          {/* SBERBUSINESS MAIN INTERACTIVE DASHBOARD SYSTEM */}
          <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-container">

              {/* LEFT COLUMN: Bank Navigation & Historical Session Manager */}
              <section className="lg:col-span-3 flex flex-col space-y-4" id="left-column">
                {/* Bank Dashboard Role Toggle Panel */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Выберите бизнес-роль
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleRoleChange("director")}
                      className={`p-2.5 rounded-lg border transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentProfile.role === "director"
                          ? "border-emerald-600 bg-emerald-50/55 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50/80 hover:border-slate-300"
                      }`}
                      title="Владелец бизнеса / Генеральный директор (ООО 'ТехноПром')"
                    >
                      <span className={`text-[9px] uppercase font-black tracking-wider leading-none ${
                        currentProfile.role === "director" ? "text-emerald-700" : "text-slate-400"
                      }`}>
                        Владелец
                      </span>
                      <span className="text-[10px] font-extrabold mt-1.5 leading-none">ООО 'Техно...'</span>
                    </button>

                    <button
                      onClick={() => handleRoleChange("accountant")}
                      className={`p-2.5 rounded-lg border transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentProfile.role === "accountant"
                          ? "border-emerald-600 bg-emerald-50/55 shadow-xs"
                          : "border-slate-200 hover:bg-slate-50/80 hover:border-slate-300"
                      }`}
                      title="Главный бухгалтер компании (ИП Смирнова)"
                    >
                      <span className={`text-[9px] uppercase font-black tracking-wider leading-none ${
                        currentProfile.role === "accountant" ? "text-emerald-700" : "text-slate-400"
                      }`}>
                        Бухгалтер
                      </span>
                      <span className="text-[10px] font-extrabold mt-1.5 leading-none">ИП Смир...</span>
                    </button>
                  </div>

                  {/* Company Meta Info Widget with Interactive Elements */}
                  <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Компания:</span>
                      <span className="font-medium text-slate-700 text-right truncate max-w-[140px]">
                        {currentProfile.companyName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">УНП:</span>
                      <span className="font-mono text-slate-700">
                        {currentProfile.role === "director" ? "191234567" : "192345678"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Пакет услуг:</span>
                      <span className="font-semibold text-emerald-700">СберПремиум Бизнес</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex items-center text-[10px] text-slate-400">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-ping"></span>
                      Режим: Личный кабинет веб-банка
                    </div>
                  </div>
                </div>

                {/* Persistence Sessions History */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[300px]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        История обращений
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCreateNewSession(currentProfile.role)}
                      className="p-1 px-1.5 bg-emerald-55 hover:bg-emerald-100 border border-emerald-200/60 text-[10px] font-bold text-emerald-800 rounded flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Начать новую ИИ сессию"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>+ Новый</span>
                    </button>
                  </div>

                  {/* Sessions List */}
                  <div className="p-2 space-y-1 overflow-y-auto flex-1 max-h-[400px]">
                    {sessions.map((session) => {
                      const isSelected = session.id === currentSessionId;
                      return (
                        <button
                          key={session.id}
                          onClick={() => {
                            setCurrentSessionId(session.id);
                            setCrmPayload(null);
                            setIsOperatorActive(false);
                            const prof = bankProfiles.find(p => p.role === session.role);
                            if (prof) {
                              setCurrentProfile(prof);
                            }
                          }}
                          className={`w-full text-left p-3 rounded-lg transition-all border flex items-start space-x-2.5 cursor-pointer ${
                            isSelected
                              ? "bg-slate-100 border-slate-400 shadow-sm"
                              : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                          }`}
                        >
                          <div className={`mt-1 p-1 rounded ${
                            session.role === "director" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 capitalize">
                                {session.role === "director" ? "Директор" : "Бухгалтер"}
                              </span>
                              <span className="text-[9px] text-slate-400">{session.date}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                              {session.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {session.messages.length > 0
                                ? `${session.messages.length} сообщений`
                                : "Новый чистый диалог..."}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400">
                    База данных: <span className="font-semibold text-slate-600">PostgreSQL JSON Store</span> • Имитация сессий с авто-сохранением.
                  </div>
                </div>
              </section>

              {/* MIDDLE COLUMN: Main Web-Bank Screen & Chat Area */}
              <section className="lg:col-span-6 flex flex-col space-y-6" id="middle-column">

                {/* Simulated Live Accounts Statistics */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl shadow-md p-5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                      {currentProfile.companyName}
                    </span>
                    <span className="text-[11px] text-emerald-200 font-mono">
                      УНП {currentProfile.role === "director" ? "191234567" : "192345678"}
                    </span>
                  </div>

                  {currentProfile.role === "director" ? (
                    <div className="grid grid-cols-3 gap-4" id="director-fin">
                      <div>
                        <p className="text-[10px] text-emerald-200 leading-none">Общий остаток на счетах</p>
                        <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight">14 240 000.50 BYN</p>
                        <p className="text-[10px] text-emerald-300 mt-1 flex items-center">
                          <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1"></span>
                          Ликвидность стабильна
                        </p>
                      </div>
                      <div className="border-l border-white/10 pl-4">
                        <p className="text-[10px] text-emerald-200 leading-none">Одобренный овердрафт</p>
                        <p className="text-xl md:text-2xl font-bold mt-1 tracking-tight text-emerald-300">150 000 BYN</p>
                        <p className="text-[10px] text-emerald-200 mt-1">Овердрафт подсоединен</p>
                      </div>
                      <div className="border-l border-white/10 pl-4">
                        <p className="text-[10px] text-emerald-200 leading-none">В обработке банком</p>
                        <p className="text-lg md:text-xl font-bold mt-1 tracking-tight">35 000.00 BYN</p>
                        <p className="text-[10px] text-amber-300 mt-1 font-semibold">Ожидает акцепта</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4" id="accountant-fin">
                      <div>
                        <p className="text-[10px] text-emerald-200 leading-none">Консультационный лимит УСН</p>
                        <p className="text-xl font-bold mt-1 tracking-tight">Расчет готов</p>
                        <p className="text-[10px] text-emerald-300 mt-1">НСБУ сведен</p>
                      </div>
                      <div className="border-l border-white/10 pl-4">
                        <p className="text-[10px] text-emerald-200 leading-none">НДС к вычету / уплате</p>
                        <p className="text-xl font-bold mt-1 tracking-tight text-emerald-300">12 000 BYN</p>
                        <p className="text-[10px] text-lime-300 mt-1">Сумма снижена</p>
                      </div>
                      <div className="border-l border-white/10 pl-4">
                        <p className="text-[10px] text-emerald-200 leading-none">Оплата взносов</p>
                        <p className="text-xl font-bold mt-1 tracking-tight">Выполнено</p>
                        <p className="text-[10px] text-emerald-200 mt-1">Оплачено за квартал</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* SberBusiness Live AI Assistant Chat Box */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-[480px]">

                  {/* Box Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                        <Bot className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm flex items-center">
                          СберБизнес ИИ-Консультант
                          <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Контекст: {currentProfile.companyName} • {currentProfile.roleLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={handleTriggerManualHandoff}
                        className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                        title="Переключить на оператора вручную"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Позвать оператора</span>
                      </button>

                      <button
                        onClick={() => {
                          setViewMode("website");
                          setIsWidgetOpen(true);
                        }}
                        className="p-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Вернуться к компактному виджету на сайте"
                      >
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Свернуть в виджет</span>
                      </button>
                    </div>
                  </div>

                  {/* Chat Session Url breadcrumb */}
                  <div className="bg-slate-50 px-4 py-1.5 border-b border-slate-100 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Адрес текущего экрана в СберБизнесе:</span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50 truncate max-w-[280px]">
                      {currentUrl}
                    </span>
                  </div>

                  {/* Chat Box Conversation Messages View */}
                  <div className="flex-1 p-4 overflow-y-auto max-h-[420px] min-h-[350px] space-y-4 bg-white">
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
                              onClick={() => handleSendMessage(undefined, "Какие условия овердрафта и кредитования доступны нашей компании ООО 'ТехноПром'?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → Условия овердрафта
                            </button>
                            <button
                              onClick={() => handleSendMessage(undefined, "Чем выгоден лизинг оборудования для ООО 'ТехноПром' по сравнению с кредитом?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → Плюсы лизинга
                            </button>
                          </div>
                        ) : currentProfile.role === "accountant" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
                            <button
                              onClick={() => handleSendMessage(undefined, "Как сдать ближайший отчет по налогам и какие требования РСБУ мы должны учесть?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → Отчетность РСБУ
                            </button>
                            <button
                              onClick={() => handleSendMessage(undefined, "Какие регламенты по валютному контролю при сумме контракта 45 000 USD?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → Валютный контроль
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-xs">
                            <button
                              onClick={() => handleSendMessage(undefined, "Какие обучающие программы и курсы СберУниверситета открыты по моему профилю?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → СберУниверситет курсы
                            </button>
                            <button
                              onClick={() => handleSendMessage(undefined, "Как запустить бронирование отеля и авиабилетов в системе СберБизнес Командировки?")}
                              className="p-2 border border-slate-200 hover:border-emerald-500 hover:bg-white rounded-lg text-left transition-colors text-slate-600 font-medium cursor-pointer"
                            >
                              → Бронь командировки
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Logs list */}
                    {currentSession?.messages.map((msg) => {
                      const isUser = msg.role === "user";
                      const isOperatorText = msg.role === "operator";

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? "justify-end" : "justify-start"} items-start gap-2.5`}
                        >
                          {!isUser && (
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                              isOperatorText ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {isOperatorText ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                          )}

                          <div className={`max-w-[85%] rounded-xl p-3.5 text-xs shadow-sm ${
                            isUser
                              ? "bg-emerald-700 text-white rounded-br-none"
                              : isOperatorText
                                ? "bg-amber-50/90 border border-amber-200 text-slate-800 rounded-bl-none"
                                : "bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-none"
                          }`}>
                            <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-slate-200/50">
                              <span className={`font-bold ${isUser ? "text-emerald-100" : isOperatorText ? "text-amber-800" : "text-emerald-800"}`}>
                                {isUser
                                  ? "Вы"
                                  : isOperatorText
                                    ? "Лайв оператор: Александр"
                                    : "ИИ-Ассистент СберБизнес"}
                              </span>
                              <span className="text-[9px] opacity-60 font-mono">{msg.timestamp}</span>
                            </div>

                            <p className={`mt-1 leading-relaxed ${isUser ? "text-emerald-50" : "text-slate-850"}`}>
                              {renderMessageContent(msg.content, isUser)}
                            </p>

                            {msg.paymentDraft && (
                              <PaymentDraftCard draft={msg.paymentDraft} />
                            )}

                            {/* Automation metadata */}
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
                    })}

                    {/* Operator connection bubble logs */}
                    {isOperatorActive && operatorMessages.map((msg) => (
                      <div key={msg.id} className="flex justify-start items-start gap-2.5 animate-fade-in">
                        <div className="p-1.5 rounded-lg flex-shrink-0 bg-gradient-to-tr from-amber-500 to-orange-600 text-white">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="max-w-[85%] rounded-xl p-3.5 text-xs shadow-sm bg-orange-50 border border-amber-300 text-slate-800 rounded-bl-none">
                          <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-amber-200">
                            <span className="font-bold text-amber-900">Оператор СберБизнес Премиум (Живой человек)</span>
                            <span className="text-[9px] text-amber-700 font-mono">{msg.timestamp}</span>
                          </div>
                          <p className="leading-relaxed font-medium text-slate-800">
                            {msg.content}
                          </p>
                          <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center text-[10px] text-amber-900 font-semibold">
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

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center space-x-2 bg-slate-50 rounded-b-xl" id="chat-input-form">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={
                        isOperatorActive
                          ? "Чат с оператором поддержкой. Задайте вопрос..."
                          : `Задайте вопрос как ${currentProfile.role === "director" ? "Владелец" : currentProfile.role === "accountant" ? "Бухгалтер" : "Сотрудник"}...`
                      }
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none text-slate-800"
                    />
                    <button
                      type="submit"
                      disabled={isTyping}
                      className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer"
                      id="send-button"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>
              </section>

              {/* RIGHT COLUMN: Cross-sales Products Widget & Interactive Term Inspector */}
              <section className="lg:col-span-3 flex flex-col space-y-4" id="right-column">

                {/* Term Help Box */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <HelpCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
                      Помощник терминов
                    </h3>
                    {selectedTerm && (
                      <button
                        onClick={() => setSelectedTerm(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-650 font-semibold border px-1.5 py-0.5 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>

                  {selectedTerm ? (
                    <div className="space-y-2.5 animate-fade-in" id="term-definition-box">
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-100 border border-emerald-250 text-emerald-850 text-[10px] font-bold rounded">
                        {selectedTerm.word.toUpperCase()}
                      </span>
                      <h4 className="font-bold text-slate-800 text-xs">{selectedTerm.shortDescription}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {selectedTerm.detailedDescription}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 space-y-2">
                      <HelpCircle className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
                      <p className="text-xs leading-normal">
                        Нажмите на подсвеченный <span className="border-b-2 border-dashed border-emerald-500 text-emerald-700 font-semibold px-0.5 bg-emerald-50/50 rounded">Термин</span> в диалоге для мгновенного раскрытия сути!
                      </p>
                    </div>
                  )}
                </div>

                {/* Smart Cross-Sales widget */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Спецпредложения
                  </h3>

                  <div className="space-y-3" id="offers-list">
                    {currentProfile.availableOffers.map((offer) => {
                      return (
                        <div
                          key={offer.id}
                          className="border border-slate-100 rounded-lg p-3 hover:shadow-sm hover:border-slate-200 transition-all text-xs flex items-start space-x-2.5 bg-slate-50/50"
                        >
                          <div className="mt-0.5 p-1.5 bg-white text-emerald-700 border border-slate-150 rounded shadow-xs flex-shrink-0">
                            {offer.icon === "TrendingUp" && <TrendingUp className="w-4 h-4" />}
                            {offer.icon === "Truck" && <Truck className="w-4 h-4" />}
                            {offer.icon === "Zap" && <Zap className="w-4 h-4" />}
                            {offer.icon === "Users" && <Users className="w-4 h-4" />}
                            {offer.icon === "BookOpen" && <BookOpen className="w-4 h-4" />}
                            {offer.icon === "ShieldAlert" && <ShieldAlert className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-[8.5px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${offer.badgeColor}`}>
                                {offer.badge}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-700 text-xs mt-1.5">{offer.title}</h4>
                            <p className="text-[10.5px] text-slate-500 mt-1 leading-normal">{offer.description}</p>

                            <button
                              onClick={() => handleSendMessage(undefined, `Расскажи подробнее, как подключить продукт: ${offer.title}. Интересуют тарифы.`)}
                              className="mt-2 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 cursor-pointer"
                            >
                              <span>Подключить / Подробнее</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 bg-emerald-50 border border-emerald-100/50 rounded-lg p-3 text-[10px] text-slate-600">
                    <span className="font-bold text-emerald-800 block mb-0.5">Кросс-сейл Контекст:</span>
                    Директор видит лимиты, кредиты и лизинг. Бухгалтер — зарплатные решения, онлайн-бухгалтерию по РСБУ УСН.
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

          {/* Footer credits */}
          <footer className="bg-slate-900 text-slate-400 text-xs text-center py-4 border-t border-slate-800 mt-auto" id="sber-footer">
            <p className="opacity-85">
              © 2026 СберБизнес Консультант • Построено на базе моделей Google Gemini 3.5 Flash с поддержкой PostgreSQL & Python Integration Группы Разработки.
            </p>
          </footer>
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

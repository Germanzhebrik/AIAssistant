import React from "react";
import { ExternalLink, FileText, Building2, CreditCard, CheckCircle2 } from "lucide-react";
import { PaymentDraft } from "../types";

interface PaymentDraftCardProps {
  draft: PaymentDraft;
}

export const PaymentDraftCard: React.FC<PaymentDraftCardProps> = ({ draft }) => {
  if (!draft) return null;

  // Pretty document type label
  const getDocumentLabel = (type: string) => {
    switch (type) {
      case "INSTANT":
        return "Мгновенное платежное поручение (INSTANT)";
      case "ERIP":
        return "Платеж ЕРИП (PAYDOCBYERIP)";
      case "PAYDOCCUR":
        return "Валютное поручение (PAYDOCCUR)";
      case "CORPCARD":
        return "Перевод на корпоративную карту";
      case "WAGES":
        return "Реестр на выплату зарплаты";
      case "INDIVIDUAL":
        return "Перечисление физлицу без договора";
      default:
        return "Платежное поручение в BYN (PAYDOCBY)";
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs max-w-full">
      {/* Draft Header */}
      <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
        <div className="flex items-center space-x-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-slate-800 leading-tight">Черновик ИИ СберБизнес</h4>
            <p className="text-[9px] text-slate-500 leading-none">{getDocumentLabel(draft.paymentType)}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[8.5px] font-bold text-emerald-800">
          <CheckCircle2 className="h-2.5 w-2.5" />
          Готов к отправке
        </span>
      </div>

      {/* Bill Body Details */}
      <div className="p-3.5 space-y-3.5 text-[10.5px]">
        {/* Recipient Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Получатель</span>
            <div className="flex items-start space-x-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800 leading-snug">{draft.recipientName}</p>
                <p className="text-[9px] text-slate-500 font-mono">УНП {draft.recipientUnp}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Счёт и банк получателя</span>
            <div className="flex items-start space-x-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono font-bold text-slate-700 break-all select-all leading-tight">{draft.recipientIban}</p>
                <p className="text-[9px] text-slate-500 leading-none mt-0.5">{draft.recipientBank}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Box Display */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[8.5px] font-semibold text-slate-400 uppercase block leading-none mb-1">Сумма документа</span>
            <div className="text-sm font-black text-emerald-800 font-mono tracking-tight">
              {draft.amount} <span className="text-[10px] font-bold">{draft.currency}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[8.5px] font-semibold text-slate-400 uppercase block leading-none mb-1">Валюта</span>
            <span className="inline-block bg-slate-200/75 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[9px] font-mono">
              {draft.currency} (Бел. рубль)
            </span>
          </div>
        </div>

        {/* Purpose of Payment */}
        <div className="space-y-1">
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Назначение платежа</span>
          <p className="text-slate-700 bg-slate-50/50 rounded border border-slate-100 p-2 italic leading-relaxed text-[10px]">
            {draft.purpose}
          </p>
        </div>

        {/* CTA Button Link */}
        <div className="pt-1.5">
          <a
            href={draft.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10.5px] py-2.5 px-3 rounded-lg shadow-sm transition-all text-center select-none active:scale-[0.99] cursor-pointer"
          >
            <span>Сформировать и отправить во внешний СберБизнес</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
          <p className="text-[8.5px] text-slate-400 text-center mt-2 leading-tight">
            Реквизиты будут автоматически интегрированы в форму официального портала Клиент-Банка (sbbol.sber-bank.by)
          </p>
        </div>
      </div>
    </div>
  );
};

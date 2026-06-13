export interface PaymentDraft {
  recipientName: string;
  recipientUnp: string;
  recipientIban: string;
  recipientBank: string;
  amount: string;
  currency: string;
  purpose: string;
  link: string;
  paymentType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'operator';
  content: string;
  timestamp: string;
  callOperator?: boolean;
  operatorSummary?: {
    issueSummary: string;
    userIntent: string;
    currentPageUrl: string;
    chatSessionId: string;
  };
  paymentDraft?: PaymentDraft;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: string;
}

export interface Profile {
  id: string;
  role: 'director' | 'accountant';
  name: string;
  roleLabel: string;
  companyName: string;
  segment: string;
  availableOffers: Offer[];
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  role: 'director' | 'accountant';
  messages: Message[];
}

export interface GlossaryTerm {
  word: string;
  shortDescription: string;
  detailedDescription: string;
}

export interface Counterparty {
  id: string;
  name: string;
  unp: string;
  iban: string;
  bankName: string;
  contract: string;
  status: string;
  balanceContext: string;
}

export interface Reminder {
  id: string;
  role: 'director' | 'accountant';
  text: string;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}


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

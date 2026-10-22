import React, { useState, useEffect, useRef } from 'react';
import { api, downloadWithAuth } from '../services/api';
import { useToast } from '../context/ToastContext';
import { DocumentItem } from '../types';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleButton } from '../components/ui/AppleButton';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleSelect } from '../components/ui/AppleSelect';
import { AppleBadge } from '../components/ui/AppleBadge';
import { AppleSegmentedControl } from '../components/ui/AppleSegmentedControl';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Bot,
  Sparkles,
  Search,
  FileText,
  Send,
  User,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Check,
  Download,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggested_actions?: string[];
}

export const AIAssistantPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'summarizer' | 'semantic_search'>('chat');

  // Authenticated download for semantic search results
  const [downloadingSearchDocId, setDownloadingSearchDocId] = useState<string | null>(null);
  const handleSearchResultDownload = async (documentId: string, filename: string) => {
    if (downloadingSearchDocId) return;
    setDownloadingSearchDocId(documentId);
    try {
      await downloadWithAuth(`/documents/${documentId}/download`, `${filename}.pdf`);
      showToast('success', 'Download Started', filename);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.message);
    } finally {
      setDownloadingSearchDocId(null);
    }
  };

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your IUDWAS Intelligent Assistant. You can ask me questions about university course exemption policies, research grant review workflows, or query any document in your vault.',
      timestamp: new Date().toISOString(),
      suggested_actions: [
        'How do I submit a Course Exemption request?',
        'What are the Research Grant review stages?',
        'How does AI OCR text extraction work?',
      ],
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedDocContext, setSelectedDocContext] = useState('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Summarizer State
  const [summarizeText, setSummarizeText] = useState('');
  const [summarizeDocId, setSummarizeDocId] = useState('');
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [summarizing, setSummarizing] = useState(false);

  // Semantic Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.documents.list({ limit: 50 }).then((res) => setDocuments(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || chatInput;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.ai.chat({
        message: text.trim(),
        document_context_id: selectedDocContext || undefined,
      });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.reply,
        timestamp: res.data.timestamp,
        suggested_actions: res.data.suggested_actions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast('error', 'AI Assistant Error', err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!summarizeText && !summarizeDocId) {
      showToast('warning', 'Input Required', 'Please enter text or select a document to summarize');
      return;
    }

    setSummarizing(true);
    try {
      const res = await api.ai.summarize({
        text: summarizeText || undefined,
        document_id: summarizeDocId || undefined,
      });
      setSummaryResult(res.data);
      showToast('success', 'Summary Generated', 'Document summary created successfully.');
    } catch (err: any) {
      showToast('error', 'Summarizer Error', err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await api.ai.search(searchQuery.trim());
      setSearchResults(res.data || []);
    } catch (err: any) {
      showToast('error', 'Search Error', err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-apple-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-apple-purple" />
            AI Intelligence & OCR Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            RAG-powered conversational assistant, NLP auto-summarizer, and semantic search.
          </p>
        </div>

        <AppleSegmentedControl
          options={[
            { value: 'chat', label: 'AI Assistant' },
            { value: 'summarizer', label: 'Auto Summarizer' },
            { value: 'semantic_search', label: 'Semantic Search' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as any)}
        />
      </div>

      {/* Tab 1: AI Chatbot */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
          {/* Main Chat Area */}
          <AppleCard className="lg:col-span-8 flex flex-col justify-between p-0 overflow-hidden h-full">
            {/* Context Selector Header */}
            <div className="p-3.5 border-b border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-apple-purple/10 text-apple-purple">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    IUDWAS University Assistant
                  </h4>
                  <p className="text-[10px] text-neutral-400">Grounding active on university documents</p>
                </div>
              </div>

              <div className="max-w-xs">
                <select
                  value={selectedDocContext}
                  onChange={(e) => setSelectedDocContext(e.target.value)}
                  className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-apple-blue"
                >
                  <option value="">Ground on All Documents</option>
                  {documents.map((d) => (
                    <option key={d.document_id} value={d.document_id}>
                      Doc Context: {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-apple-blue text-white'
                        : 'bg-gradient-to-tr from-apple-blue to-apple-purple text-white shadow-sm'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-apple-blue text-white rounded-tr-none'
                        : 'glass-panel dark:bg-[#2C2C2E] text-neutral-800 dark:text-neutral-200 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    <p>{msg.content}</p>

                    {/* Suggested follow-up prompts */}
                    {msg.suggested_actions && (
                      <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/10 flex flex-wrap gap-1.5">
                        {msg.suggested_actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleSendMessage(act)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-apple-blue/10 hover:bg-apple-blue/20 text-apple-blue transition-colors apple-press"
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-apple-purple text-white flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="glass-panel p-3 rounded-2xl text-xs text-neutral-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-apple-purple animate-ping" />
                    <span>Analyzing university documents and policies...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about documents, policies, or workflows..."
                  className="flex-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
                />
                <AppleButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!chatInput.trim() || chatLoading}
                  icon={<Send className="w-5 h-5" />}
                >
                  Send
                </AppleButton>
              </form>
            </div>
          </AppleCard>

          {/* Right 4 Columns: Guidelines & Capabilities */}
          <div className="lg:col-span-4 space-y-4">
            <AppleCard className="space-y-3 p-5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-apple-blue" />
                Assistant Capabilities
              </h3>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-apple-green flex-shrink-0 mt-0.5" />
                  <span><strong>Grounded in University DB:</strong> Answers questions using uploaded transcripts, research grants, and syllabus files.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-apple-green flex-shrink-0 mt-0.5" />
                  <span><strong>SLA & Policy Guidance:</strong> Provides turnaround SLAs and prerequisite rules.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-apple-green flex-shrink-0 mt-0.5" />
                  <span><strong>Role-Aware Responses:</strong> Customizes actions for Students, Faculty, and Administrators.</span>
                </li>
              </ul>
            </AppleCard>

            <AppleCard className="p-5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Suggested Prompts
              </h4>
              <div className="space-y-1.5">
                {[
                  'What is the syllabus overlap for CS402?',
                  'Who reviews Student Medical Leave requests?',
                  'Summarize my highest GPA courses',
                  'What are the security standards implemented?',
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-xs text-neutral-700 dark:text-neutral-300 transition-colors apple-press flex items-center justify-between"
                  >
                    <span className="truncate">{prompt}</span>
                    <ArrowRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </AppleCard>
          </div>
        </div>
      )}

      {/* Tab 2: Document Auto Summarizer */}
      {activeTab === 'summarizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AppleCard className="space-y-4 p-6">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-apple-orange" />
              Generate Executive Summary
            </h3>
            <p className="text-xs text-neutral-500">
              Select an uploaded document or paste custom text to generate structured key points and reading time metrics.
            </p>

            <AppleSelect
              label="Select Document from Vault"
              value={summarizeDocId}
              onChange={(e) => setSummarizeDocId(e.target.value)}
            >
              <option value="">Or choose existing document...</option>
              {documents.map((d) => (
                <option key={d.document_id} value={d.document_id}>
                  {d.title} (v{d.version})
                </option>
              ))}
            </AppleSelect>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Or Paste Document Content
              </label>
              <textarea
                rows={6}
                value={summarizeText}
                onChange={(e) => setSummarizeText(e.target.value)}
                placeholder="Paste university text, research abstracts, or transcript syllabus here..."
                className="w-full rounded-2xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 p-3.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
              />
            </div>

            <AppleButton
              variant="primary"
              size="md"
              className="w-full"
              loading={summarizing}
              onClick={handleSummarize}
            >
              Run AI Summarization
            </AppleButton>
          </AppleCard>

          {/* Summary Output */}
          <AppleCard className="p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Executive Briefing
                </h3>
                {summaryResult && (
                  <AppleBadge variant="green" size="sm">
                    {summaryResult.reading_time_seconds}s Reading Time
                  </AppleBadge>
                )}
              </div>

              {summaryResult ? (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed">
                    {summaryResult.summary}
                  </div>

                  {summaryResult.key_points && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        Key Institutional Takeaways
                      </h4>
                      <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                        {summaryResult.key_points.map((pt: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue mt-1.5 flex-shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-neutral-400">
                  Select a document on the left and click Run AI Summarization to view results.
                </div>
              )}
            </div>
          </AppleCard>
        </div>
      )}

      {/* Tab 3: Semantic Smart Search */}
      {activeTab === 'semantic_search' && (
        <div className="space-y-4">
          <AppleCard className="p-6">
            <form onSubmit={handleSemanticSearch} className="flex items-center gap-3">
              <AppleInput
                placeholder="Search across all document text, transcripts, and proposals..."
                icon={<Search className="w-5 h-5" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <AppleButton type="submit" variant="primary" loading={searching}>
                Search
              </AppleButton>
            </form>
          </AppleCard>

          {searching ? (
            <LoadingSpinner message="Querying vector embeddings & OCR database..." />
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((item) => (
                <AppleCard key={item.document_id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">{item.category_name || 'Academic Record'} · {item.department_name}</p>
                    </div>
                    <AppleBadge variant="teal" size="sm">
                      {(item.relevance_score * 100).toFixed(0)}% Match
                    </AppleBadge>
                  </div>

                  <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {item.snippet}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <AppleButton
                      variant="glass"
                      size="sm"
                      icon={<Download className="w-4 h-4" />}
                      loading={downloadingSearchDocId === item.document_id}
                      onClick={() => handleSearchResultDownload(item.document_id, item.title || 'document')}
                    >
                      Download Document
                    </AppleButton>
                  </div>
                </AppleCard>
              ))}
            </div>
          ) : searchQuery ? (
            <AppleCard>
              <EmptyState title="No matching content" description="Try broadening your search keywords." />
            </AppleCard>
          ) : null}
        </div>
      )}
    </div>
  );
};

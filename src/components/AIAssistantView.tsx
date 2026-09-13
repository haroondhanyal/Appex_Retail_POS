import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  AlertTriangle,
  TrendingUp,
  Package,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { AIInsight, User } from "../types";
import { api } from "../services/api";

interface AIAssistantViewProps {
  currentUser: User;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export function AIAssistantView({ currentUser }: AIAssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-0",
      sender: "ai",
      text: `Hello ${currentUser.name}! I am your AI Retail Copilot. I analyze your live point-of-sale transactions, inventory levels, and perishable goods expiry dates. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const data = await api.getAIInsights();
      setInsights(data);
    } catch (e) {
      console.warn("Failed to fetch insights", e);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: Message = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    try {
      const result = await api.queryAI(query, currentUser.role, currentUser.name);
      const aiMsg: Message = {
        id: "msg-" + (Date.now() + 1),
        sender: "ai",
        text: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: result.modelUsed
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: "msg-" + (Date.now() + 1),
        sender: "ai",
        text: "I encountered an error connecting to the business intelligence service. Please check your network connection.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const promptSuggestions = [
    "What were today's net sales and profit?",
    "Which products are low in stock and need reordering?",
    "Which perishable items will expire soon?",
    "Who are our top-performing cashiers today?",
    "Suggest pricing strategies for expiring items"
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              AI Retail Intelligence & Copilot
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Local & Private
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Private on-server analytics for sales, profit, inventory risk, staff performance, and markdown recommendations.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? "animate-spin" : ""}`} />
          <span>Refresh AI Insights</span>
        </button>
      </div>

      {/* Automated AI Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        {insights.map(ins => {
          const isHigh = ins.severity === "high";
          const isMedium = ins.severity === "medium";
          return (
            <div
              key={ins.id}
              className={`p-4 rounded-2xl border shadow-2xs bg-white ${
                isHigh
                  ? "border-red-200 bg-red-50/20"
                  : isMedium
                  ? "border-amber-200 bg-amber-50/20"
                  : "border-blue-200 bg-blue-50/20"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {ins.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isHigh
                      ? "bg-red-100 text-red-700"
                      : isMedium
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {ins.severity} priority
                </span>
              </div>
              <h4 className="font-bold text-xs text-neutral-900 mb-1">{ins.title}</h4>
              <p className="text-xs text-neutral-600 leading-relaxed">{ins.description}</p>
              {ins.actionable && (
                <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center gap-1 text-[11px] font-bold text-neutral-900">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{ins.actionable}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-2xs flex flex-col overflow-hidden min-h-[380px]">
        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-2xl ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 font-bold ${
                  msg.sender === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-2xs"
                }`}
              >
                {msg.sender === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-neutral-900 text-white rounded-tr-none"
                    : "bg-neutral-100 text-neutral-900 rounded-tl-none border border-neutral-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 font-mono ${
                    msg.sender === "user" ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {msg.timestamp}
                  {msg.modelUsed && ` • ${msg.modelUsed}`}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-lg">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-neutral-100 rounded-2xl rounded-tl-none border border-neutral-200 text-xs text-neutral-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] font-medium ml-1">Analyzing database records...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
            Try asking:
          </span>
          {promptSuggestions.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-700 text-xs whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-white border-t border-neutral-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about sales, low inventory, expiry risks, or margins..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isTyping || !inputText.trim()}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  AlertTriangle,
  TrendingUp,
  Package,
  RefreshCw
} from "lucide-react";
import { AIAction, AIBriefing, AIForecast, AIInsight, RiskIndicator, User } from "../types";
import { api } from "../services/api";

interface AIAssistantViewProps {
  currentUser: User;
  onNavigate: (view: string) => void;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export function AIAssistantView({ currentUser, onNavigate }: AIAssistantViewProps) {
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
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [forecasts, setForecasts] = useState<AIForecast[]>([]);
  const [actions, setActions] = useState<AIAction[]>([]);
  const [risks, setRisks] = useState<RiskIndicator[]>([]);
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
      const [data, nextBriefing, nextForecasts, nextActions, nextRisks] = await Promise.all([api.getAIInsights(), api.getAIBriefing(), api.getAIForecasts(), api.getAIActions(), api.getAIRisks()]);
      setInsights(data); setBriefing(nextBriefing); setForecasts(nextForecasts); setActions(nextActions); setRisks(nextRisks);
    } catch (e) {
      console.warn("Failed to fetch insights", e);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const executeAction = async (action: AIAction) => {
    if (!window.confirm(`Approve AI action?\n\n${action.title}\n${action.impact}`)) return;
    try { await api.executeAIAction(action.id, currentUser); fetchInsights(); } catch (error: any) { alert(error.message); }
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

  const recommendedCards = [
    { type: "stock_risk" as const, title: "Immediate Stock Replenishment", screen: "Inventory", purpose: "Low/out-of-stock items requiring immediate purchase", fallback: "No urgent replenishment items right now.", destination: "inventory", tone: "red", icon: AlertTriangle },
    { type: "expiry_risk" as const, title: "Perishable Inventory Expiry Warning", screen: "Inventory → Expiry", purpose: "Items approaching expiry that need clearance or disposal planning", fallback: "No perishable expiry risks are currently detected.", destination: "inventory", tone: "orange", icon: AlertTriangle },
    { type: "dead_stock" as const, title: "Slow-Moving / Unsold Inventory", screen: "Inventory → Stock Insights", purpose: "Items with low or no sales that need a pricing or display review", fallback: "No slow-moving inventory is currently flagged.", destination: "inventory", tone: "yellow", icon: Package },
    { type: "opportunity" as const, title: "Beverage & Snack Cross-Selling Potential", screen: "Sales → AI Recommendations", purpose: "Product combinations that can increase basket value", fallback: "Review beverage and snack pairings to build the next promotion.", destination: "sales", tone: "green", icon: TrendingUp }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-neutral-50 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
              AI Retail Intelligence Copilot
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Local & Private
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Smart insights and proactive recommendations for your retail business.
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

      {/* Four recommended AI actions */}
      {briefing && <section className="rounded-2xl bg-neutral-900 p-4 text-white shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-base">Good Morning 👋 Daily AI Business Briefing</h2><p className="text-xs text-neutral-300 mt-1">A live summary of sales, inventory risks, and recommended actions.</p></div><span className="text-xs font-bold text-emerald-300">Local & Private</span></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">{[["Yesterday Sales", `$${briefing.yesterdaySales.toFixed(2)}`],["Replenishment", briefing.lowStockCount],["Expiry Risks", briefing.expiryRiskCount],["Slow Moving", briefing.slowMovingCount],["Cross-Sell Ideas", briefing.crossSellCount]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-white/10 p-3"><span className="text-[10px] uppercase text-neutral-300 font-bold">{label}</span><strong className="block text-lg mt-1">{value}</strong></div>)}</div></section>}
      {actions.filter(action => action.status === "pending").length > 0 && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><h2 className="font-black text-sm text-neutral-900">AI Actions — confirmation required</h2><div className="grid md:grid-cols-2 gap-3 mt-3">{actions.filter(action => action.status === "pending").map(action => <div key={action.id} className="rounded-xl bg-white border border-blue-100 p-3"><h3 className="font-bold text-sm">{action.title}</h3><p className="text-xs text-neutral-600 mt-1">{action.reason}</p><p className="text-xs font-bold text-blue-800 mt-2">{action.impact}</p><div className="flex gap-2 mt-3"><button onClick={() => executeAction(action)} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white">Approve & Execute</button><button onClick={() => api.dismissAIAction(action.id, currentUser).then(fetchInsights)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Dismiss</button></div></div>)}</div></section>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        {recommendedCards.map(card => {
          const ins = insights.find(item => item.type === card.type);
          const Icon = card.icon;
          const toneClasses = card.tone === "red" ? "border-red-200 bg-red-50/50 text-red-700" : card.tone === "orange" ? "border-orange-200 bg-orange-50/50 text-orange-700" : card.tone === "yellow" ? "border-yellow-200 bg-yellow-50/50 text-yellow-800" : "border-emerald-200 bg-emerald-50/50 text-emerald-700";
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => onNavigate(card.destination)}
              title={`Open ${card.screen}`}
              className={`p-4 rounded-2xl border shadow-2xs text-left hover:shadow-sm hover:-translate-y-0.5 transition ${toneClasses}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/70 px-2 py-1 rounded-full">{ins?.severity || "live"}</span>
              </div>
              <h4 className="font-black text-sm text-neutral-900 mb-1">{card.title}</h4>
              <p className="text-[11px] text-neutral-600 leading-relaxed">{ins?.description || card.fallback}</p>
              <p className="mt-3 text-[10px] font-bold text-neutral-700">{card.purpose}</p>
              <span className="mt-3 block text-[10px] font-black">Open {card.screen} →</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><section className="rounded-2xl border border-neutral-200 bg-white p-4"><h2 className="font-black text-sm">Demand Forecast — next 14 days</h2><div className="mt-3 space-y-2 max-h-64 overflow-y-auto">{forecasts.slice(0, 6).map(forecast => <div key={forecast.productId} className="flex justify-between gap-3 rounded-xl bg-neutral-50 p-2.5 text-xs"><div><strong>{forecast.productName}</strong><p className="text-neutral-500 mt-1">Stock {forecast.currentStock} · demand {forecast.predicted14DayDemand} · {forecast.expectedStockoutDays === null ? "no stockout forecast" : `stockout in ${forecast.expectedStockoutDays} days`}</p></div><span className="font-black text-red-700">Reorder {forecast.recommendedReorder}</span></div>)}</div></section><section className="rounded-2xl border border-neutral-200 bg-white p-4"><h2 className="font-black text-sm">AI Risk & Anomaly Center</h2><div className="mt-3 space-y-2">{risks.length ? risks.map(risk => <div key={risk.id} className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs"><strong>{risk.title}</strong><p className="text-neutral-600 mt-1">{risk.user} · {risk.reason}</p><span className="text-[10px] text-neutral-500">Indicator only — human review required.</span></div>) : <p className="text-xs text-neutral-500">No unusual risk indicators detected.</p>}</div></section></div>

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

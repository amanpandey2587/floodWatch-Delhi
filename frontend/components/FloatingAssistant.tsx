"use client";

// components/FloatingAssistant.tsx
// Draggable floating AI assistant — site-wide navigation, multilingual, voice-enabled

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Navigation,
  MapPin,
  FileText,
  AlertTriangle,
  Home,
  ChevronRight,
  GripVertical,
  Waves,
} from "lucide-react";
import { useAssistant, AssistantIntent } from "@/contexts/AssistantContext";

// ─── Language config ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "en", bcp47: "en-IN", label: "EN" },
  { code: "hi", bcp47: "hi-IN", label: "हि" },
  { code: "ta", bcp47: "ta-IN", label: "த" },
  { code: "bn", bcp47: "bn-IN", label: "বা" },
  { code: "te", bcp47: "te-IN", label: "తె" },
  { code: "pa", bcp47: "pa-IN", label: "ਪੰ" },
];

const GREETINGS: Record<string, string> = {
  en: "Hi! I can help you navigate FloodWatch Delhi.\n\nTry saying:\n• *\"Route from Karol Bagh to Connaught Place\"*\n• *\"Report flooding in Rohini\"*\n• *\"Show flood risk in Dwarka\"*\n• *\"Track complaint FW-DEL-2024-1234\"*",
  hi: "नमस्ते! 🙏 मैं आपकी FloodWatch Delhi में मदद करूँगा।\n\nकहें:\n• *\"करोल बाग से कनॉट प्लेस का रास्ता\"*\n• *\"रोहिणी में बाढ़ की शिकायत\"*\n• *\"द्वारका का फ्लड रिस्क दिखाओ\"*",
  ta: "வணக்கம்! 🙏 FloodWatch Delhi-ல் உங்களுக்கு உதவுகிறேன்.\n\nசொல்லுங்கள்:\n• *\"காரோல் பாக் இருந்து கன்னாட் பிளேஸ் வழி\"*\n• *\"ரோஹினியில் வெள்ள புகார்\"*",
  bn: "নমস্কার! 🙏 আমি FloodWatch Delhi-তে আপনাকে সাহায্য করব।\n\nবলুন:\n• *\"করোল বাগ থেকে কনট প্লেসের রাস্তা\"*\n• *\"রোহিণীতে বন্যার অভিযোগ\"*",
};

// Quick action chips shown in the widget
const QUICK_ACTIONS = [
  { icon: Navigation, label: "Safe Route", labelHi: "सुरक्षित रास्ता", prompt: "I need a safe route" },
  { icon: FileText, label: "File Complaint", labelHi: "शिकायत दर्ज", prompt: "I want to report flooding" },
  { icon: MapPin, label: "Flood Map", labelHi: "बाढ़ मैप", prompt: "Show me the flood risk map" },
  { icon: AlertTriangle, label: "Ward Risk", labelHi: "वार्ड रिस्क", prompt: "Check flood risk for my ward" },
];

// Action card shown after AI detects intent
interface ActionCardProps {
  intent: AssistantIntent;
  onConfirm: () => void;
  onDismiss: () => void;
  lang: string;
}

function ActionCard({ intent, onConfirm, onDismiss, lang }: ActionCardProps) {
  const isHindi = lang === "hi";

  const cardConfig: Record<string, { icon: React.ReactNode; title: string; titleHi: string; color: string; hex: string }> = {
    route: { icon: <Navigation size={16} />, title: "Open Route Planner", titleHi: "रूट प्लानर खोलें", color: "bg-blue-600", hex: "#2563eb" },
    complaint: { icon: <FileText size={16} />, title: "File Complaint", titleHi: "शिकायत दर्ज करें", color: "bg-orange-600", hex: "#ea580c" },
    map: { icon: <MapPin size={16} />, title: "Open Map", titleHi: "मैप खोलें", color: "bg-emerald-600", hex: "#059669" },
    ward_risk: { icon: <AlertTriangle size={16} />, title: "View Ward Risk", titleHi: "वार्ड रिस्क देखें", color: "bg-amber-600", hex: "#d97706" },
    track_complaint: { icon: <FileText size={16} />, title: "Track Complaint", titleHi: "शिकायत ट्रैक करें", color: "bg-purple-600", hex: "#9333ea" },
    navigate: { icon: <Home size={16} />, title: "Go to Page", titleHi: "पेज पर जाएं", color: "bg-slate-600", hex: "#475569" },
  };

  const config = cardConfig[intent.action] || cardConfig.navigate;
  if (!config) return null;

  const details: string[] = [];
  if (intent.route?.origin) details.push(`From: ${intent.route.origin}`);
  if (intent.route?.destination) details.push(`To: ${intent.route.destination}`);
  if (intent.complaint?.location) details.push(`Location: ${intent.complaint.location}`);
  if (intent.complaint?.ward) details.push(`Ward: ${intent.complaint.ward}`);
  if (intent.map?.location) details.push(`Fly to: ${intent.map.location}`);
  if (intent.ward) details.push(`Ward: ${intent.ward}`);
  if (intent.complaintId) details.push(`ID: ${intent.complaintId}`);

  return (
    <div className="mx-3 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: config.hex }}>
        <span className="text-white">{config.icon}</span>
        <span className="text-white text-xs font-semibold">
          {isHindi ? config.titleHi : config.title}
        </span>
      </div>
      {details.length > 0 && (
        <div className="px-3 py-2 space-y-0.5">
          {details.map((d, i) => (
            <p key={i} className="text-xs text-slate-600 dark:text-slate-400">{d}</p>
          ))}
        </div>
      )}
      <div className="px-3 py-2 flex gap-2 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onConfirm}
          className="flex-1 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: config.hex, color: "#ffffff" }}
        >
          {isHindi ? "जाएं" : "Let's go"} <ChevronRight size={12} />
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
          style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border-secondary)" }}
        >
          {isHindi ? "नहीं" : "Cancel"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function FloatingAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { setIntent } = useAssistant();

  // — widget state —
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeLang, setActiveLang] = useState("en");

  // — chat state —
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; intent?: AssistantIntent }[]
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<AssistantIntent | null>(null);

  // — voice state —
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false); // off by default for ambient use

  // — drag state —
  const [pos, setPos] = useState({ x: 24, y: 24 }); // bottom-right offset
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const justStoppedRef = useRef(false);

  const activeBcp47 = LANGUAGES.find((l) => l.code === activeLang)?.bcp47 || "en-IN";

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  // Greet on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: GREETINGS[activeLang] || GREETINGS.en,
      }]);
    }
  }, [isOpen]); // eslint-disable-line

  // Re-greet on lang change if only greeting exists
  useEffect(() => {
    if (isOpen && messages.length === 1 && messages[0].role === "assistant") {
      setMessages([{
        role: "assistant",
        content: GREETINGS[activeLang] || GREETINGS.en,
      }]);
    }
  }, [activeLang]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  // ─── Drag logic ─────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isOpen) return; // don't drag when chat is open
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { mx: clientX, my: clientY, px: pos.x, py: pos.y };
  }, [isOpen, pos]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStart.current.mx;
      const dy = clientY - dragStart.current.my;
      setPos({
        x: Math.max(8, dragStart.current.px - dx),
        y: Math.max(8, dragStart.current.py - dy),
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  // ─── TTS ────────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*/g, "").slice(0, 180);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = activeBcp47;
    utter.rate = 1.0;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [ttsEnabled, activeBcp47]);

  // ─── Voice recognition ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    window.speechSynthesis?.cancel();
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = activeBcp47;

    recognition.onstart = () => { setIsListening(true); setInterimText(""); };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInterimText(interim);
      if (final) { setInput((p) => (p + " " + final).trim()); setInterimText(""); }
    };

    recognition.onerror = () => { setIsListening(false); setInterimText(""); };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      justStoppedRef.current = true;
    };

    recognition.start();
  }, [activeBcp47]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  };

  // Auto-send after voice
  useEffect(() => {
    if (justStoppedRef.current) {
      justStoppedRef.current = false;
      const t = setTimeout(() => {
        setInput((current) => {
          if (current.trim()) sendMessage(current.trim());
          return "";
        });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [isListening]); // eslint-disable-line

  // ─── Send message & detect intent ───────────────────────────────────────────
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride !== undefined ? textOverride : input).trim();
    if (!text || isLoading) return;

    // Detect language from Unicode script ranges
    const detectedCode =
      /[\u0900-\u097F]/.test(text) ? "hi" :
      /[\u0B80-\u0BFF]/.test(text) ? "ta" :
      /[\u0980-\u09FF]/.test(text) ? "bn" :
      /[\u0C00-\u0C7F]/.test(text) ? "te" :
      /[\u0A00-\u0A7F]/.test(text) ? "pa" : null;
    if (detectedCode) setActiveLang(detectedCode);

    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setInterimText("");
    setIsLoading(true);
    setPendingIntent(null);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, currentPage: pathname }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${data.error}` }]);
        return;
      }

      const assistantMsg = {
        role: "assistant" as const,
        content: data.reply,
        intent: data.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      speak(data.reply);

      // Show action card if intent has an action
      if (data.intent && data.intent.action !== "idle" && data.intent.confidence > 0.5) {
        setPendingIntent(data.intent);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, pathname, speak]);

  // ─── Execute intent — navigate + prefill ────────────────────────────────────
  const executeIntent = useCallback((intent: AssistantIntent) => {
    setIntent(intent); // store in global context for destination page to read
    setPendingIntent(null);

    switch (intent.action) {
      case "route": {
        // Pass via URL params — RouteCalculator reads these on mount
        const params = new URLSearchParams();
        if (intent.route?.origin) params.set("from", intent.route.origin);
        if (intent.route?.destination) params.set("to", intent.route.destination);
        router.push(`/failsafe?${params.toString()}`);
        break;
      }
      case "complaint": {
        const params = new URLSearchParams();
        if (intent.complaint?.location) params.set("location", intent.complaint.location);
        if (intent.complaint?.ward) params.set("ward", intent.complaint.ward);
        if (intent.complaint?.wardNumber) params.set("wardNumber", String(intent.complaint.wardNumber));
        if (intent.complaint?.priority) params.set("priority", intent.complaint.priority);
        if (intent.complaint?.description) params.set("desc", intent.complaint.description);
        router.push(`/complaints/file?${params.toString()}`);
        break;
      }
      case "map": {
        const params = new URLSearchParams();
        if (intent.map?.location) params.set("flyTo", intent.map.location);
        router.push(`/map?${params.toString()}`);
        break;
      }
      case "ward_risk": {
        const params = new URLSearchParams();
        if (intent.ward) params.set("ward", intent.ward);
        router.push(`/map?${params.toString()}#ward`);
        break;
      }
      case "track_complaint": {
        if (intent.complaintId) {
          router.push(`/complaints/track/${intent.complaintId}`);
        } else {
          router.push("/complaints/track");
        }
        break;
      }
      case "navigate": {
        if (intent.targetPath) router.push(intent.targetPath);
        break;
      }
    }

    setIsOpen(false);
  }, [router, setIntent]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  // Hide on auth pages
  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) return null;

  return (
    <div
      className="fixed z-50"
      style={{ bottom: pos.y, right: pos.x }}
    >
      {/* ── CHAT WINDOW ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
          style={{ maxHeight: "580px", minHeight: "400px" }}>

          {/* Header */}
          <div className="bg-blue-950 px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Waves size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold leading-none">FloodWatch Assistant</p>
              <p className="text-blue-300 text-xs mt-0.5 truncate">
                {pathname === "/" ? "Home" : pathname?.replace("/", "").replace("-", " ")}
              </p>
            </div>

            {/* Lang pills */}
            <div className="flex gap-0.5">
              {LANGUAGES.map((l) => (
                <button key={l.code}
                  onClick={() => setActiveLang(l.code)}
                  className={`text-xs px-1.5 py-0.5 rounded transition-all ${
                    activeLang === l.code
                      ? "bg-orange-500 text-white font-bold"
                      : "text-blue-300 hover:bg-white/10"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* TTS + close */}
            <button
              onClick={() => { setTtsEnabled((v) => !v); window.speechSynthesis?.cancel(); }}
              className={`p-1 rounded transition-colors ${ttsEnabled ? "text-white" : "text-blue-600"}`}
              title={ttsEnabled ? "Mute" : "Enable voice"}
            >
              {ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="text-blue-300 hover:text-white p-1 transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-900 text-white rounded-br-sm"
                    : "bg-blue-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-slate-700 rounded-bl-sm"
                }`}>
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line.split(/\*\*(.*?)\*\*/g).map((part, k) =>
                        k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                      )}
                      {j < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Interim voice */}
            {interimText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-sm bg-blue-800/60 text-blue-200 text-xs italic border border-blue-700/40">
                  <span className="flex items-center gap-1 text-xs text-blue-400 mb-0.5">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block" />
                    listening…
                  </span>
                  {interimText}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-2xl rounded-bl-sm italic">
                  ⏳ Thinking…
                </div>
              </div>
            )}

            {isSpeaking && (
              <div className="flex justify-start">
                <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-400 text-xs px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                  <Volume2 size={11} className="animate-pulse" /> Speaking…
                </div>
              </div>
            )}

            {/* Action card — inside scroll area so it's always reachable */}
            {pendingIntent && (
              <div className="sticky bottom-0 pt-1">
                <ActionCard
                  intent={pendingIntent}
                  lang={activeLang}
                  onConfirm={() => executeIntent(pendingIntent)}
                  onDismiss={() => setPendingIntent(null)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (shown only when no messages beyond greeting) */}
          {messages.length <= 1 && !isLoading && (
            <div className="px-3 pb-2 grid grid-cols-2 gap-1.5 flex-shrink-0">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={() => sendMessage(qa.prompt)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors text-left"
                >
                  <qa.icon size={13} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span className="truncate">{activeLang === "hi" ? qa.labelHi : qa.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
            {isListening && (
              <div className="mb-2 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2.5 py-1.5 rounded-lg">
                <span className="flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4].map((b) => (
                    <span key={b} className="w-1 bg-red-500 rounded-full animate-bounce"
                      style={{ height: `${5 + b * 2.5}px`, animationDelay: `${b * 0.08}s` }} />
                  ))}
                </span>
                <span className="text-xs text-red-600 font-medium flex-1">
                  {activeLang === "hi" ? "सुन रहा हूँ…" : activeLang === "ta" ? "கேட்கிறேன்…" : "Listening…"}
                </span>
                <button onClick={stopListening} className="text-xs text-red-500 underline">Stop</button>
              </div>
            )}
            <div className="flex gap-1.5 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeLang === "hi" ? "कुछ भी पूछें या बोलें…" :
                  activeLang === "ta" ? "எதுவும் கேளுங்கள்…" :
                  "Ask anything or speak…"
                }
                rows={1}
                disabled={isLoading || isListening}
                className="flex-1 resize-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 min-h-[36px] max-h-[100px] disabled:opacity-60"
              />
              {voiceSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`p-2 rounded-xl transition-all flex-shrink-0 relative ${
                    isListening
                      ? "bg-red-500 text-white shadow-lg shadow-red-300/50"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-600"
                  } disabled:opacity-40`}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  {isListening && (
                    <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-60" />
                  )}
                </button>
              )}
              <button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim() || isListening}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB BUTTON ─────────────────────────────────────────────────────── */}
      <div
        ref={widgetRef}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        className={`relative select-none ${isDragging ? "cursor-grabbing" : isOpen ? "cursor-default" : "cursor-grab"}`}
      >
        <button
          onClick={() => !isDragging && setIsOpen((v) => !v)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
            isOpen
              ? "bg-slate-700 hover:bg-slate-600"
              : "bg-blue-950 hover:bg-blue-800 hover:scale-105"
          } border-2 ${isOpen ? "border-slate-600" : "border-orange-500"}`}
          title="FloodWatch Assistant"
        >
          {isOpen ? (
            <X size={22} className="text-white" />
          ) : (
            <Waves size={22} className="text-white" />
          )}
        </button>

        {/* Pulse ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full border-2 border-orange-400 animate-ping opacity-40 pointer-events-none" />
        )}

        {/* Drag handle hint */}
        {!isOpen && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center opacity-60">
            <GripVertical size={8} className="text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
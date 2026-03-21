"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useComplaintAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { XCircle, Send, Wand2 } from "lucide-react";
import { useComplaintPrefill } from "@/hooks/useAssistantPrefill";

const LANG_LABELS: Record<string, Record<string, string>> = {
  hi: {
    title: "शीर्षक / Title", description: "विवरण / Description",
    category: "श्रेणी / Category", ward_number: "वार्ड नंबर / Ward Number",
    priority: "प्राथमिकता / Priority", location: "स्थान / Location",
    photos: "फ़ोटो / Photos", submit: "शिकायत दर्ज करें", cancel: "रद्द करें",
    placeholder_title: "जैसे: XYZ मार्केट के पास जलभराव",
    placeholder_desc: "जलभराव की पूरी जानकारी दें...",
    use_location: "वर्तमान स्थान उपयोग करें", location_captured: "स्थान प्राप्त हो गया ✓",
    filing: "दर्ज हो रहा है...", chatHeader: "🌊 सहायक — अपनी भाषा में बताएं",
    chatSub: "हिंदी, तमिल, बंगाली, अंग्रेज़ी — कोई भी भाषा",
    inputPlaceholder: "अपनी शिकायत यहाँ लिखें...",
  },
  ta: {
    title: "தலைப்பு / Title", description: "விளக்கம் / Description",
    category: "வகை / Category", ward_number: "வார்டு எண் / Ward Number",
    priority: "முன்னுரிமை / Priority", location: "இடம் / Location",
    photos: "புகைப்படங்கள் / Photos", submit: "புகாரை பதிவு செய்", cancel: "ரத்து செய்",
    placeholder_title: "எ.கா: XYZ சந்தை அருகில் வெள்ளம்",
    placeholder_desc: "வெள்ள நிலை பற்றிய விவரங்கள்...",
    use_location: "தற்போதைய இடத்தை பயன்படுத்து", location_captured: "இடம் கிடைத்தது ✓",
    filing: "பதிவு செய்கிறது...", chatHeader: "🌊 உதவியாளர் — உங்கள் மொழியில் சொல்லுங்கள்",
    chatSub: "தமிழ், இந்தி, ஆங்கிலம் — எந்த மொழியும்",
    inputPlaceholder: "உங்கள் புகாரை இங்கே தட்டச்சு செய்யுங்கள்...",
  },
  bn: {
    title: "শিরোনাম / Title", description: "বিবরণ / Description",
    category: "বিভাগ / Category", ward_number: "ওয়ার্ড নম্বর / Ward Number",
    priority: "অগ্রাধিকার / Priority", location: "অবস্থান / Location",
    photos: "ছবি / Photos", submit: "অভিযোগ দাখিল করুন", cancel: "বাতিল করুন",
    placeholder_title: "যেমন: XYZ বাজারের কাছে জলাবদ্ধতা",
    placeholder_desc: "জলাবদ্ধতার বিস্তারিত তথ্য দিন...",
    use_location: "বর্তমান অবস্থান ব্যবহার করুন", location_captured: "অবস্থান পাওয়া গেছে ✓",
    filing: "দাখিল হচ্ছে...", chatHeader: "🌊 সহায়ক — আপনার ভাষায় বলুন",
    chatSub: "বাংলা, হিন্দি, ইংরেজি — যেকোনো ভাষা",
    inputPlaceholder: "এখানে আপনার অভিযোগ লিখুন...",
  },
  en: {
    title: "Title", description: "Description", category: "Category",
    ward_number: "Ward Number", priority: "Priority", location: "Location",
    photos: "Photos", submit: "File Complaint", cancel: "Cancel",
    placeholder_title: "e.g., Severe waterlogging near XYZ market",
    placeholder_desc: "Provide detailed information about the waterlogging...",
    use_location: "Use Current Location", location_captured: "Location Captured ✓",
    filing: "Filing Complaint...", chatHeader: "🌊 Complaint Assistant",
    chatSub: "Describe in Hindi, Tamil, Bengali, or English",
    inputPlaceholder: "Type your complaint here...",
  },
};

function detectLanguage(text: string): string {
  if (!text || text.length < 3) return "en";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  return "en";
}

interface ChatMessage { role: "user" | "assistant"; content: string; }
interface ExtractedFields {
  title?: string | null; description?: string | null; category?: string | null;
  ward_number?: number | null; priority?: string | null; fields_filled?: string[];
}
interface FileComplaintProps { onSuccess?: () => void; }

export default function FileComplaint({ onSuccess }: FileComplaintProps) {
  const router = useRouter();
  const complaintAPI = useComplaintAPI();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "", description: "", category: "",
    ward_number: 44, priority: "medium",
    location: null as { latitude: number; longitude: number } | null,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState("en");
  const [filledByChat, setFilledByChat] = useState<Set<string>>(new Set());
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_FILES = 5;
  const MAX_FILE_SIZE_MB = 5;
  const L = LANG_LABELS[detectedLang] || LANG_LABELS.en;

  // ── Assistant prefill from FloatingAssistant ────────────────────────────────
  const prefill = useComplaintPrefill();

  useEffect(() => {
    const applied: string[] = [];
    setFormData((prev) => {
      const u = { ...prev };
      if (prefill.description && !prev.description) { u.description = prefill.description; applied.push("description"); }
      if (prefill.location && !prev.title) { u.title = `Waterlogging reported in ${prefill.location}`; applied.push("title"); }
      if (prefill.wardNumber && prev.ward_number === 44) { u.ward_number = prefill.wardNumber; applied.push("ward number"); }
      if (prefill.priority && prev.priority === "medium") { u.priority = prefill.priority; applied.push("priority"); }
      return u;
    });
    if (applied.length > 0) {
      setFilledByChat((prev) => new Set([...prev, ...applied.map((a) => a.replace(" ", "_"))]));
      setPrefillBanner(`✨ Assistant pre-filled: ${applied.join(", ")}`);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    const locationHint = prefill.location ? ` I've noted the location as **${prefill.location}**.` : "";
    setMessages([{
      role: "assistant",
      content: `नमस्ते! 🙏 Hello!\n\nDescribe the flooding in **your language** — Hindi, Tamil, Bengali, or English. I'll fill the form automatically.${locationHint}\n\nExample: *"मेरा नाम राहुल है, करोल बाग में घुटने तक पानी है"*`,
    }]);
  }, []); // eslint-disable-line

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Original handlers ───────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    Array.from(e.target.files).forEach((file) => {
      if (selectedFiles.length + newFiles.length >= MAX_FILES) { setError(`Maximum ${MAX_FILES} images allowed.`); return; }
      if (!file.type.startsWith("image/")) { setError("Only image files are allowed."); return; }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setError(`Image size must be less than ${MAX_FILE_SIZE_MB}MB.`); return; }
      newFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setSelectedFiles((p) => [...p, ...newFiles]);
          setImagePreviews((p) => [...p, ...newPreviews]);
          setError(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (i: number) => {
    setSelectedFiles((p) => p.filter((_, idx) => idx !== i));
    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null); setSuccess(false);
    try {
      const attachments: string[] = [];
      for (const file of selectedFiles) {
        const base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = (err) => rej(err);
          r.readAsDataURL(file);
        });
        attachments.push(base64);
      }
      const result = await complaintAPI.fileComplaint({ ...formData, attachments });
      setComplaintId(result.complaint_id); setSuccess(true);
      if (onSuccess) { onSuccess(); } else { setTimeout(() => router.push(`/complaints/track/${result.complaint_id}`), 2000); }
    } catch (err: any) {
      if (err.response?.status === 422) {
        const ve = err.response?.data?.detail;
        setError(Array.isArray(ve) ? `Validation error: ${ve.map((e: any) => `${e.loc.join(".")}: ${e.msg}`).join(", ")}` : "Invalid data submitted.");
      } else { setError(err.response?.data?.detail || "Failed to file complaint. Please try again."); }
    } finally { setLoading(false); }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation is not supported by your browser."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setFormData({ ...formData, location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
      (err) => { console.error(err); setError("Failed to get current location."); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Chat ────────────────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const lang = detectLanguage(text);
    if (lang !== "en") setDetectedLang(lang);
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setChatInput(""); setChatLoading(true);
    if (chatTextareaRef.current) chatTextareaRef.current.style.height = "auto";
    try {
      const res = await fetch("/api/complaint-assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          currentFormState: { title: formData.title, description: formData.description, category: formData.category, ward_number: formData.ward_number, priority: formData.priority },
        }),
      });
      const data = await res.json();
      if (data.error) { setMessages((p) => [...p, { role: "assistant", content: `⚠️ ${data.error}` }]); return; }
      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
      if (data.extracted) {
        const newly: string[] = [];
        setFormData((prev) => {
          const u = { ...prev };
          if (data.extracted.title && !prev.title) { u.title = data.extracted.title; newly.push("title"); }
          if (data.extracted.description && !prev.description) { u.description = data.extracted.description; newly.push("description"); }
          if (data.extracted.category && !prev.category) { u.category = data.extracted.category; newly.push("category"); }
          if (data.extracted.ward_number && prev.ward_number === 44) { u.ward_number = data.extracted.ward_number; newly.push("ward_number"); }
          if (data.extracted.priority && prev.priority === "medium") { u.priority = data.extracted.priority.toLowerCase(); newly.push("priority"); }
          return u;
        });
        if (newly.length) setFilledByChat((p) => new Set([...p, ...newly]));
      }
    } catch { setMessages((p) => [...p, { role: "assistant", content: "❌ Connection error. Please try again." }]); }
    finally { setChatLoading(false); }
  }, [chatInput, chatLoading, messages, formData]);

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } };
  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setChatInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; };
  const fieldHighlight = (key: string) => filledByChat.has(key) ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-800" : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";
  const inputBase = "w-full px-4 py-2.5 rounded-lg border text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="bg-blue-950 border-b-2 border-orange-500 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🌊</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">FloodWatch Delhi</h1>
            <p className="text-blue-300 text-xs mt-0.5">{detectedLang !== "en" ? "Multilingual Complaint Assistant Active 🇮🇳" : "File a New Complaint"}</p>
          </div>
          {detectedLang !== "en" && (
            <span className="ml-auto text-xs bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full">
              {{ hi: "हिंदी", ta: "தமிழ்", bn: "বাংলা", te: "తెలుగు" }[detectedLang]} detected
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-5 h-[calc(100vh-72px)]">
        {/* Chat panel */}
        <div className="flex flex-col w-full lg:w-[380px] lg:flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="bg-blue-950 px-4 py-3.5">
            <h2 className="text-white text-sm font-semibold">{L.chatHeader}</h2>
            <p className="text-blue-300 text-xs mt-0.5">{L.chatSub}</p>
            <div className="mt-2.5 bg-white/10 rounded-lg px-3 py-2 text-xs text-blue-100 leading-relaxed">
              <span className="font-medium">Try:</span> "मेरा नाम राहुल है, करोल बाग में घुटने तक पानी है"
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-900 text-white rounded-br-sm" : "bg-blue-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-100 dark:border-slate-700 rounded-bl-sm"}`}>
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>{line.split(/\*\*(.*?)\*\*/g).map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}{j < msg.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {chatLoading && <div className="flex justify-start"><div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-400 text-xs px-4 py-2.5 rounded-2xl rounded-bl-sm italic">⏳ Extracting details…</div></div>}
            {filledByChat.size > 0 && !chatLoading && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {[...filledByChat].map((f) => <span key={f} className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">✓ {f.replace("_", " ")}</span>)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex gap-2 items-end">
            <textarea ref={chatTextareaRef} value={chatInput} onChange={autoResize} onKeyDown={handleChatKey}
              placeholder={L.inputPlaceholder} rows={1} disabled={chatLoading}
              className="flex-1 resize-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 min-h-[42px] max-h-[120px] disabled:opacity-50" />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors">
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow border border-slate-200 dark:border-slate-800 p-6 md:p-8">
            {prefillBanner && (
              <div className="mb-5 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-lg text-sm">
                <Wand2 size={15} className="mt-0.5 flex-shrink-0" />
                <span>{prefillBanner}</span>
                <button onClick={() => setPrefillBanner(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 flex-shrink-0">✕</button>
              </div>
            )}
            {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}
            {success && <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-5 text-sm">Complaint filed! ID: <span className="font-mono font-semibold">{complaintId}</span>. Redirecting…</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="title" className={labelClass}>{L.title}{filledByChat.has("title") && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ auto-filled</span>}</label>
                <input type="text" id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className={`${inputBase} ${fieldHighlight("title")}`} placeholder={L.placeholder_title} />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>{L.description}{filledByChat.has("description") && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ auto-filled</span>}</label>
                <textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4} className={`${inputBase} ${fieldHighlight("description")} resize-none`} placeholder={L.placeholder_desc} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="category" className={labelClass}>{L.category}{filledByChat.has("category") && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ auto-filled</span>}</label>
                  <select id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required className={`${inputBase} ${fieldHighlight("category")} cursor-pointer`}>
                    <option value="">Select Category</option>
                    <option value="Waterlogging">Waterlogging</option>
                    <option value="Drainage Issue">Drainage Issue</option>
                    <option value="Road Damage">Road Damage</option>
                    <option value="Garbage Accumulation">Garbage Accumulation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ward_number" className={labelClass}>{L.ward_number}{filledByChat.has("ward_number") && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ auto-filled</span>}</label>
                  <input type="number" id="ward_number" value={formData.ward_number} onChange={(e) => setFormData({ ...formData, ward_number: parseInt(e.target.value) })} required min="1" max="272" className={`${inputBase} ${fieldHighlight("ward_number")}`} />
                </div>
              </div>
              <div>
                <label htmlFor="priority" className={labelClass}>{L.priority}{filledByChat.has("priority") && <span className="ml-2 text-xs text-emerald-600 font-normal">✓ auto-filled</span>}</label>
                <select id="priority" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className={`${inputBase} ${fieldHighlight("priority")} cursor-pointer`}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{L.location} (Optional)</label>
                <button type="button" onClick={getCurrentLocation} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium">
                  {formData.location ? L.location_captured : L.use_location}
                </button>
                {formData.location && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">{formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</p>}
              </div>
              <div>
                <label htmlFor="attachments" className={labelClass}>{L.photos} (Optional, max {MAX_FILES})</label>
                <input type="file" id="attachments" accept="image/*" multiple onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300" />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden shadow">
                        <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><XCircle size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? L.filing : L.submit}
                </button>
                <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {L.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
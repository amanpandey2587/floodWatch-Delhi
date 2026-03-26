"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useComplaintAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { XCircle, Send, Mic, MicOff, Wand2, ImagePlus, AlertCircle, Bot, CheckCircle2, MapPin, Loader2, Navigation, ChevronDown } from "lucide-react";
import { useComplaintPrefill } from "@/hooks/useAssistantPrefill";

// ─── Language labels ──────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, Record<string, string>> = {
  hi: {
    title: "शीर्षक / Title", description: "विवरण / Description",
    category: "श्रेणी / Category", ward_number: "वार्ड नंबर / Ward Number",
    priority: "प्राथमिकता / Priority", location: "स्थान / Location",
    photos: "फ़ोटो / Photos", submit: "शिकायत दर्ज करें", cancel: "रद्द करें",
    placeholder_title: "जैसे: XYZ मार्केट के पास जलभराव",
    placeholder_desc: "जलभराव की पूरी जानकारी दें...",
    use_location: "वर्तमान स्थान उपयोग करें", location_captured: "स्थान प्राप्त हो गया",
    filing: "दर्ज हो रहा है...",
    chatHeader: "सहायक — बोलें या लिखें",
    chatSub: "माइक दबाएं या टाइप करें — कोई भी भाषा",
    inputPlaceholder: "अपनी शिकायत बोलें या यहाँ लिखें...",
    photo_required: "फ़ोटो अनिवार्य है — कृपया बाढ़ की फ़ोटो अपलोड करें",
    listening: "सुन रहा हूँ...",
  },
  ta: {
    title: "தலைப்பு / Title", description: "விளக்கம் / Description",
    category: "வகை / Category", ward_number: "வார்டு எண் / Ward Number",
    priority: "முன்னுரிமை / Priority", location: "இடம் / Location",
    photos: "புகைப்படங்கள் / Photos", submit: "புகாரை பதிவு செய்", cancel: "ரத்து செய்",
    placeholder_title: "எ.கா: XYZ சந்தை அருகில் வெள்ளம்",
    placeholder_desc: "வெள்ள நிலை பற்றிய விவரங்கள்...",
    use_location: "தற்போதைய இடத்தை பயன்படுத்து", location_captured: "இடம் கிடைத்தது",
    filing: "பதிவு செய்கிறது...",
    chatHeader: "உதவியாளர் — பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்",
    chatSub: "மைக்கை அழுத்துங்கள் அல்லது தட்டச்சு செய்யுங்கள்",
    inputPlaceholder: "உங்கள் புகாரை பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்...",
    photo_required: "புகைப்படம் கட்டாயம் — வெள்ள புகைப்படத்தை பதிவேற்றவும்",
    listening: "கேட்கிறேன்...",
  },
  bn: {
    title: "শিরোনাম / Title", description: "বিবরণ / Description",
    category: "বিভাগ / Category", ward_number: "ওয়ার্ড নম্বর / Ward Number",
    priority: "অগ্রাধিকার / Priority", location: "অবস্থান / Location",
    photos: "ছবি / Photos", submit: "অভিযোগ দাখিল করুন", cancel: "বাতিল করুন",
    placeholder_title: "যেমন: XYZ বাজারের কাছে জলাবদ্ধতা",
    placeholder_desc: "জলাবদ্ধতার বিস্তারিত তথ্য দিন...",
    use_location: "বর্তমান অবস্থান ব্যবহার করুন", location_captured: "অবস্থান পাওয়া গেছে",
    filing: "দাখিল হচ্ছে...",
    chatHeader: "সহায়ক — বলুন বা টাইপ করুন",
    chatSub: "মাইক চাপুন অথবা টাইপ করুন",
    inputPlaceholder: "আপনার অভিযোগ বলুন বা এখানে লিখুন...",
    photo_required: "ছবি আবশ্যক — বন্যার ছবি আপলোড করুন",
    listening: "শুনছি...",
  },
  en: {
    title: "Title", description: "Description", category: "Category",
    ward_number: "Ward Number", priority: "Priority", location: "Location",
    photos: "Photos (required)", submit: "File Complaint", cancel: "Cancel",
    placeholder_title: "e.g., Severe waterlogging near XYZ market",
    placeholder_desc: "Provide detailed information about the waterlogging...",
    use_location: "Use Current Location", location_captured: "Location Captured",
    filing: "Filing Complaint...",
    chatHeader: "Complaint Assistant",
    chatSub: "Press mic to speak, or type — any language",
    inputPlaceholder: "Speak or type your complaint here...",
    photo_required: "Photo is mandatory — please upload a flood photo",
    listening: "Listening...",
  },
};

// All fields the form needs — used to track completeness
const REQUIRED_FIELDS = ["title", "description", "category", "ward_number", "photo"] as const;
type RequiredField = typeof REQUIRED_FIELDS[number];

function detectLanguage(text: string): string {
  if (!text || text.length < 3) return "en";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  return "en";
}

interface ChatMessage { role: "user" | "assistant"; content: string; isVoice?: boolean; }
interface ExtractedFields {
  title?: string | null; description?: string | null; category?: string | null;
  ward_number?: number | null; priority?: string | null; fields_filled?: string[];
}
interface FileComplaintProps { onSuccess?: () => void; }

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function FileComplaint({ onSuccess }: FileComplaintProps) {
  const router = useRouter();
  const complaintAPI = useComplaintAPI();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", category: "",
    ward_number: 0, priority: "medium",
    location: null as { latitude: number; longitude: number } | null,
  });

  // ── Chat + language state ───────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState("en");
  const [filledByChat, setFilledByChat] = useState<Set<string>>(new Set());
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);

  // ── Voice state ─────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Strict mode fixes
  const justStoppedRef = useRef(false);
  const latestChatInputRef = useRef("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const MAX_FILES = 5;
  const MAX_FILE_SIZE_MB = 5;
  const L = LANG_LABELS[detectedLang] || LANG_LABELS.en;
  const activeBcp47 = detectedLang === "hi" ? "hi-IN" : detectedLang === "ta" ? "ta-IN" : detectedLang === "bn" ? "bn-IN" : "en-IN";

  // ── Check voice support ────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  // ── Keep ref updated with latest input ─────────────────────────────────────
  useEffect(() => {
    latestChatInputRef.current = chatInput;
  }, [chatInput]);

  // ── Compute missing fields for smart prompting ─────────────────────────────
  const getMissingFields = useCallback((): RequiredField[] => {
    const missing: RequiredField[] = [];
    if (!formData.title) missing.push("title");
    if (!formData.description) missing.push("description");
    if (!formData.category) missing.push("category");
    if (!filledByChat.has("ward_number") && !filledByChat.has("ward_geo")) missing.push("ward_number");
    if (selectedFiles.length === 0) missing.push("photo");
    return missing;
  }, [formData, selectedFiles, filledByChat]);

  // ── Assistant prefill (from FloatingAssistant URL params) ──────────────────
  const prefill = useComplaintPrefill();

  useEffect(() => {
    const applied: string[] = [];
    setFormData((prev) => {
      const u = { ...prev };
      if (prefill.description && !prev.description) { u.description = prefill.description; applied.push("description"); }
      if (prefill.location && !prev.title) { u.title = `Waterlogging reported in ${prefill.location}`; applied.push("title"); }
      if (prefill.wardNumber && (!prev.ward_number || prev.ward_number <= 0)) { u.ward_number = prefill.wardNumber; applied.push("ward number"); }
      if (prefill.priority && prev.priority === "medium") { u.priority = prefill.priority; applied.push("priority"); }
      return u;
    });
    if (applied.length > 0) {
      setFilledByChat((p) => new Set([...p, ...applied.map((a) => a.replace(" ", "_"))]));
      setPrefillBanner(`Assistant pre-filled: ${applied.join(", ")}`);
    }
  }, []); // eslint-disable-line

  // ── Boot message — context-aware ───────────────────────────────────────────
  useEffect(() => {
    const locationHint = prefill.location ? ` I've noted **${prefill.location}** as the location.` : "";
    setMessages([{
      role: "assistant",
      content: `Hello! Describe the flooding situation and I will help fill the form automatically.${locationHint}\n\nPress the microphone to speak in Hindi, Tamil, Bengali, or English, or simply type your issue.\n\nRequired details:\n• Location & description\n• Ward number\n• Category\n• Priority\n• Photo evidence\n\nPlease provide as much detail as possible.`,
    }]);
  }, []); // eslint-disable-line

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, interimText]);

  // ── Voice recognition ──────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
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
      if (final) { setChatInput((p) => (p + " " + final).trim()); setInterimText(""); }
    };

    recognition.onerror = () => { setIsListening(false); setInterimText(""); };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
      justStoppedRef.current = true;
    };

    recognition.start();
  }, [activeBcp47]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  // ── Send chat message ──────────────────────────────────────────────────────
  const sendChatWithText = useCallback(async (text: string, isVoice = false) => {
    if (!text || chatLoading) return;
    const lang = detectLanguage(text);
    if (lang !== "en") setDetectedLang(lang);

    const userMsg: ChatMessage = { role: "user", content: text, isVoice };
    setMessages((p) => [...p, userMsg]);
    setChatInput("");
    setInterimText("");
    setChatLoading(true);
    if (chatTextareaRef.current) chatTextareaRef.current.style.height = "auto";

    const currentMissing = getMissingFields();

    try {
      const res = await fetch("/api/complaint-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          currentFormState: {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            ward_number: formData.ward_number,
            priority: formData.priority,
            photo_uploaded: selectedFiles.length > 0,
            missing_fields: currentMissing,
          },
        }),
      });

      const data = await res.json();
      if (data.error) { setMessages((p) => [...p, { role: "assistant", content: `Error: ${data.error}` }]); return; }

      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);

      if (data.extracted) {
        const newly: string[] = [];
        setFormData((prev) => {
          const u = { ...prev };
          if (data.extracted.title && !prev.title) { u.title = data.extracted.title; newly.push("title"); }
          if (data.extracted.description && !prev.description) { u.description = data.extracted.description; newly.push("description"); }
          if (data.extracted.category && !prev.category) { u.category = data.extracted.category; newly.push("category"); }
          if (data.extracted.ward_number && data.extracted.ward_number !== prev.ward_number) { u.ward_number = data.extracted.ward_number; newly.push("ward_number"); }
          if (data.extracted.priority && prev.priority === "medium") { u.priority = data.extracted.priority.toLowerCase(); newly.push("priority"); }
          return u;
        });
        if (newly.length) setFilledByChat((p) => new Set([...p, ...newly]));
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally { setChatLoading(false); }
  }, [chatLoading, messages, formData, selectedFiles, getMissingFields]);

  // Auto-send after voice stops
  useEffect(() => {
    if (justStoppedRef.current) {
      justStoppedRef.current = false;
      const t = setTimeout(() => {
        const currentText = latestChatInputRef.current;
        if (currentText.trim()) {
          sendChatWithText(currentText.trim(), true);
        }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [isListening, sendChatWithText]);

  const sendChat = useCallback(() => {
    sendChatWithText(chatInput.trim(), false);
  }, [chatInput, sendChatWithText]);

  // ── File handlers ───────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    Array.from(e.target.files).forEach((file) => {
      if (selectedFiles.length + newFiles.length >= MAX_FILES) { setError(`Maximum ${MAX_FILES} images allowed.`); return; }
      if (!file.type.startsWith("image/")) { setError("Only image files are allowed."); return; }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`); return; }
      newFiles.push(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newFiles.length) {
          setSelectedFiles((p) => [...p, ...newFiles]);
          setImagePreviews((p) => [...p, ...newPreviews]);
          setError(null);
          setPhotoError(false);
          setFilledByChat((p) => new Set([...p, "photo"]));
          
          const rem = getMissingFields().filter(f => f !== "photo");
          setMessages((p) => [...p, {
            role: "assistant",
            content: `Photo uploaded (${newFiles.length} image(s) added as evidence).\n\n${rem.length === 0 ? "All fields complete. You can now submit." : `Still needed: **${rem.join(", ")}**`}`,
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (i: number) => {
    setSelectedFiles((p) => p.filter((_, idx) => idx !== i));
    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setPhotoError(true);
      setError(L.photo_required);
      setMessages((p) => [...p, {
        role: "assistant",
        content: detectedLang === "hi"
          ? "फ़ोटो अनिवार्य है। कृपया बाढ़ की कोई फ़ोटो अपलोड करें।"
          : "A photo is required to submit. Please upload at least one photo showing the flooding.",
      }]);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setLoading(true); setError(null); setSuccess(false);
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
      setComplaintId(result.complaint_id);
      setSuccess(true);
      setMessages((p) => [...p, {
        role: "assistant",
        content: `Complaint filed successfully. Your ID is **${result.complaint_id}**. Redirecting...`,
      }]);
      if (onSuccess) { onSuccess(); } else { setTimeout(() => router.push(`/complaints/track/${result.complaint_id}`), 2500); }
    } catch (err: any) {
      if (err.response?.status === 422) {
        const ve = err.response?.data?.detail;
        setError(Array.isArray(ve) ? `Validation error: ${ve.map((e: any) => `${e.loc.join(".")}: ${e.msg}`).join(", ")}` : "Invalid data submitted.");
      } else { setError(err.response?.data?.detail || "Failed to file complaint. Please try again."); }
    } finally { setLoading(false); }
  };

  const [locationLoading, setLocationLoading] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData((prev) => ({ ...prev, location: { latitude: lat, longitude: lng } }));

        try {
          const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
          );
          const data = await res.json();
          if (data.results?.length > 0) {
            const result = data.results[0];

            const locality =
              result.address_components?.find((c: any) =>
                c.types.includes("sublocality_level_1") || c.types.includes("locality")
              )?.long_name || "";

            const wardMatch = result.formatted_address?.match(/Ward\s*(\d+)/i) ||
              result.formatted_address?.match(/W-(\d+)/i);
            const wardNum = wardMatch ? parseInt(wardMatch[1]) : null;

            setFormData((prev) => ({
              ...prev,
              location: { latitude: lat, longitude: lng },
              ...(wardNum && (!prev.ward_number || prev.ward_number <= 0)
                ? { ward_number: wardNum }
                : {}),
              ...(!prev.title && locality
                ? { title: `Waterlogging reported in ${locality}` }
                : {}),
            }));

            if (wardNum) {
              setFilledByChat((p) => new Set([...p, "ward_number", "location"]));
              setMessages((p) => [...p, {
                role: "assistant",
                content: `Location detected: **${locality || "your area"}**.\nWard **${wardNum}** identified. What other details can you share?`,
              }]);
            } else {
              setFilledByChat((p) => new Set([...p, "location"]));
              setMessages((p) => [...p, {
                role: "assistant",
                content: `Location captured: **${locality || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}**.\nI couldn't auto-detect your ward number. Could you provide it? (1–272)`,
              }]);
            }
          }
        } catch {
          setFilledByChat((p) => new Set([...p, "location"]));
        } finally {
          setLocationLoading(false);
        }
      },
      () => { setError("Failed to get location."); setLocationLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const fieldHighlight = (key: string) =>
    filledByChat.has(key)
      ? "border-cyan-400 dark:border-cyan-600 ring-1 ring-cyan-100 dark:ring-cyan-900/30"
      : "border-slate-200 dark:border-slate-700";

  const labelClass = "block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5";
  
  // Note: opacity removed from background colors here so native <option> menus render solidly
  const inputBase = "w-full px-4 py-2.5 rounded-xl border text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400";

  const missingFields = getMissingFields();
  const completedCount = REQUIRED_FIELDS.length - missingFields.length;
  const progressPct = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white relative overflow-hidden">
      
      {/* ── Ambient Background Blobs (Matches Home) ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/10"></div>
        <div className="absolute top-32 -left-20 h-80 w-80 rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-600/10"></div>
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-500/10"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Navigation className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                File a Complaint
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                {detectedLang !== "en" ? "Multilingual Voice Assistant Active" : "Report infrastructure and waterlogging issues"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {completedCount} of {REQUIRED_FIELDS.length} fields completed
              </span>
              <div className="h-1.5 w-32 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 dark:bg-cyan-400 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPct}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 min-h-0">

          {/* ── CHAT + VOICE PANEL ─────────────────────────────────────────────── */}
          <div className="flex flex-col w-full lg:w-[380px] lg:flex-shrink-0 bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden h-full">

            {/* Chat header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{L.chatHeader}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{L.chatSub}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-br-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-sm"
                  }`}>
                    {msg.isVoice && (
                      <span className="flex items-center gap-1.5 text-xs opacity-70 mb-1.5 font-medium">
                        <Mic size={12} /> Voice Input
                      </span>
                    )}
                    {msg.content.split("\n").map((line, j) => (
                      <span key={j}>
                        {line.split(/\*\*(.*?)\*\*/g).map((p, k) =>
                          k % 2 === 1 ? <strong key={k} className="font-semibold">{p}</strong> : p
                        )}
                        {j < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Interim voice bubble */}
              {interimText && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-br-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="flex items-center gap-2 text-xs font-medium mb-1">
                      <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse inline-block" />
                      Transcribing...
                    </span>
                    {interimText}
                  </div>
                </div>
              )}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
                    <Loader2 size={14} className="animate-spin" /> Processing details...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              {missingFields.length > 0 ? (
                <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Pending: {missingFields.join(", ").replace(/_/g, " ")}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={12} />
                  Ready to submit
                </span>
              )}
            </div>

            {/* Listening indicator */}
            {isListening && (
              <div className="mx-4 mb-2 flex items-center gap-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 px-4 py-3 rounded-xl flex-shrink-0">
                <span className="flex gap-0.5 items-end h-4">
                  {[1, 2, 3, 4].map((b) => (
                    <span key={b} className="w-1 bg-cyan-500 rounded-full animate-bounce"
                      style={{ height: `${6 + b * 2}px`, animationDelay: `${b * 0.08}s` }} />
                  ))}
                </span>
                <span className="text-xs text-cyan-700 dark:text-cyan-400 font-medium flex-1">{L.listening}</span>
                <button onClick={stopListening} className="text-xs text-cyan-600 hover:text-cyan-800 dark:hover:text-cyan-200 font-semibold">Stop</button>
              </div>
            )}

            {/* Input area */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-end bg-white dark:bg-slate-900">
              <textarea
                ref={chatTextareaRef}
                value={chatInput}
                onChange={autoResize}
                onKeyDown={handleChatKey}
                placeholder={isListening ? L.listening : L.inputPlaceholder}
                rows={1}
                disabled={chatLoading || isListening}
                className="flex-1 resize-none bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[44px] max-h-[120px] disabled:opacity-50"
              />

              {voiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={chatLoading}
                  className={`p-3 rounded-xl transition-all flex-shrink-0 relative ${
                    isListening
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  } disabled:opacity-40`}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}

              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim() || isListening}
                className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white dark:text-slate-900 p-3 rounded-xl transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* ── FORM PANEL ─────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 md:p-8">

              {prefillBanner && (
                <div className="mb-6 flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-xl text-sm">
                  <Wand2 size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{prefillBanner}</span>
                  <button onClick={() => setPrefillBanner(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
                    <XCircle size={16} />
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-6 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="font-medium">Complaint filed! ID: {complaintId}. Redirecting...</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="title" className={labelClass}>
                    {L.title} <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <input type="text" id="title" value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required className={`${inputBase} ${fieldHighlight("title")}`}
                    placeholder={L.placeholder_title} />
                </div>

                <div>
                  <label htmlFor="description" className={labelClass}>
                    {L.description} <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <textarea id="description" value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required rows={3} className={`${inputBase} ${fieldHighlight("description")} resize-y`}
                    placeholder={L.placeholder_desc} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Dropdown (Custom styled) */}
                  <div>
                    <label htmlFor="category" className={labelClass}>
                      {L.category} <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <select id="category" value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required className={`${inputBase} appearance-none pr-10 ${fieldHighlight("category")} cursor-pointer`}>
                        <option value="">Select Category</option>
                        <option value="Waterlogging">Waterlogging</option>
                        <option value="Drainage Issue">Drainage Issue</option>
                        <option value="Road Damage">Road Damage</option>
                        <option value="Garbage Accumulation">Garbage Accumulation</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ward_number" className={labelClass}>
                      {L.ward_number} <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <input type="number" id="ward_number"
                      value={formData.ward_number > 0 ? formData.ward_number : ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, ward_number: val });
                        if (val >= 1 && val <= 272) setFilledByChat((p) => new Set([...p, "ward_number"]));
                      }}
                      required min="1" max="272" placeholder="e.g. 44"
                      className={`${inputBase} ${fieldHighlight("ward_number")}`} />
                  </div>
                </div>

                {/* Priority Dropdown (Custom styled) */}
                <div>
                  <label htmlFor="priority" className={labelClass}>
                    {L.priority} <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <select id="priority" value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className={`${inputBase} appearance-none pr-10 ${fieldHighlight("priority")} cursor-pointer`}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{L.location}</label>
                  <button type="button" onClick={getCurrentLocation} disabled={locationLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
                    {locationLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <MapPin size={16} />
                    )}
                    {formData.location ? L.location_captured : locationLoading ? "Detecting..." : L.use_location}
                  </button>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    
                  </p>
                </div>

                <div>
                  <label className={labelClass}>
                    {L.photos} <span className="text-red-400 ml-0.5">*</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      selectedFiles.length > 0
                        ? "border-cyan-400/50 bg-cyan-50/50 dark:bg-cyan-900/10"
                        : photoError
                        ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                        : "border-slate-300 dark:border-slate-700 hover:border-cyan-400/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <ImagePlus size={28} className={`mx-auto mb-3 ${selectedFiles.length > 0 ? "text-cyan-500" : photoError ? "text-red-400" : "text-slate-400"}`} />
                    <p className={`text-sm font-semibold ${selectedFiles.length > 0 ? "text-cyan-700 dark:text-cyan-400" : photoError ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} photo(s) selected`
                        : photoError
                        ? "Required: Click to upload evidence"
                        : "Click to upload visual evidence"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5">Max {MAX_FILES} files, up to {MAX_FILE_SIZE_MB}MB each</p>
                    <input ref={fileInputRef} type="file" id="attachments" accept="image/*" multiple
                      onChange={handleFileChange} className="hidden" />
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-slate-900/70 text-white rounded-full p-1 hover:bg-red-500 transition-colors backdrop-blur-sm">
                            <XCircle size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => router.back()}
                    className="w-full sm:w-1/3 px-6 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    {L.cancel}
                  </button>
                  <button type="submit" disabled={loading}
                    className={`w-full sm:w-2/3 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      missingFields.length === 0
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md hover:scale-[1.01]"
                        : "bg-cyan-600 hover:bg-cyan-700 text-white"
                    }`}>
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? L.filing : L.submit}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
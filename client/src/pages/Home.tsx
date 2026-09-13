import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  ChevronLeft,
  Clock3,
  Coffee,
  Compass,
  Copy,
  Globe2,
  Landmark,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Mic2,
  Send,
  Sparkles,
  Sun,
  ThumbsUp,
  Upload,
  UserRound,
  X,
} from "lucide-react";

 type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestedPrompts = [
  { icon: Compass, label: "أماكن سياحية", prompt: "اقترح لي أماكن سياحية جميلة في اليمن" },
  { icon: Coffee, label: "أكلات يمنية", prompt: "ايش أشهر الأكلات اليمنية وكيف تنعمل؟" },
  { icon: BookOpen, label: "عادات وتقاليد", prompt: "احكي لي عن عادات وتقاليد الضيافة في اليمن" },
  { icon: Landmark, label: "تاريخ اليمن", prompt: "علّمني عن تاريخ اليمن بطريقة بسيطة" },
];

const starterMessage: ChatMessage = {
  role: "assistant",
  content:
    "يا هلا وسهلا! أنا **يمن AI**، خويّك اللي يعرف اليمن من سقطرى للمهرة.\n\nاسألني عن الأماكن، الأكلات، اللهجات، التاريخ أو العادات والتقاليد، وبجاوبك بلهجة يمنية وبكل محبة.",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [likedIndex, setLikedIndex] = useState<number | null>(null);
  const [dialectText, setDialectText] = useState("");
  const [dialectResult, setDialectResult] = useState("");
  const [market, setMarket] = useState({ quantity: "10", unitPrice: "25", exchangeRate: "530", customsRate: "5", marginRate: "20" });
  const [marketResult, setMarketResult] = useState<{ totalCost: number; suggestedTotal: number; suggestedUnitPrice: number; disclaimer: string } | null>(null);
  const [agriResult, setAgriResult] = useState("");
  const [agriPreview, setAgriPreview] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (content) => {
      setMessages((current) => [...current, { role: "assistant", content }]);
    },
    onError: () => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "معليش يا صاحبي، صار لي تشويش بسيط. جرّب ترسل سؤالك مرة ثانية بعد شوية.",
        },
      ]);
    },
  });

  const dialectMutation = trpc.dialect.coach.useMutation({ onSuccess: setDialectResult });
  const marketMutation = trpc.market.quote.useMutation({ onSuccess: setMarketResult });
  const agricultureMutation = trpc.agriculture.analyze.useMutation({ onSuccess: setAgriResult });
  const voiceMutation = trpc.voice.transcribe.useMutation({ onSuccess: ({ text }) => setInput((current) => `${current}${current ? " " : ""}${text}`) });

  const displayMessages = useMemo(() => [starterMessage, ...messages], [messages]);

  const sendMessage = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || chatMutation.isPending) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    chatMutation.mutate({ messages: nextMessages });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendMessage(input);
  };

  const analyzeDialect = (event: React.FormEvent) => {
    event.preventDefault();
    if (dialectText.trim()) dialectMutation.mutate({ text: dialectText });
  };

  const calculateMarket = (event: React.FormEvent) => {
    event.preventDefault();
    marketMutation.mutate({
      quantity: Number(market.quantity), unitPrice: Number(market.unitPrice), exchangeRate: Number(market.exchangeRate),
      customsRate: Number(market.customsRate), marginRate: Number(market.marginRate),
    });
  };

  const handleCropImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 3_000_000) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setAgriPreview(dataUrl);
      agricultureMutation.mutate({ imageData: dataUrl, crop: "", region: "" });
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setInput((current) => `${current}${current ? " " : ""}ما قدرت أفتح المايك؛ تأكد من السماح للمتصفح بالتسجيل.`);
      return;
    }
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) audioChunksRef.current.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = () => voiceMutation.mutate({ audioData: String(reader.result) });
      reader.readAsDataURL(blob);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard?.writeText(content.replace(/[*_]/g, ""));
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1600);
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f7f4ee] text-[#18353a]">
      <header className="site-header">
        <div className="header-inner">
          <a href="#top" className="brand" aria-label="Yemen AI الصفحة الرئيسية">
            <span className="brand-mark"><span>ي</span></span>
            <span className="brand-copy"><strong>Yemen<span> AI</span></strong><small>ذكاءٌ من قلب اليمن</small></span>
          </a>
          <nav className={`main-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="التنقل الرئيسي">
            <a className="active" href="#chat" onClick={() => setMobileNavOpen(false)}>المساعد</a>
            <a href="#discover" onClick={() => setMobileNavOpen(false)}>اكتشف اليمن</a>
            <a href="#about" onClick={() => setMobileNavOpen(false)}>عن يمن AI</a>
          </nav>
          <div className="header-actions">
            <a className="header-whatsapp" href="https://wa.me/967780136423" target="_blank" rel="noreferrer" aria-label="التواصل عبر واتساب">
              <MessageCircle size={16} /> <span>واتساب</span>
            </a>
            <button className="icon-button" aria-label="تبديل الوضع الليلي"><Moon size={18} /></button>
            <button className="login-button"><UserRound size={16} /> دخول</button>
            <button className="mobile-menu" aria-label="فتح القائمة" onClick={() => setMobileNavOpen((open) => !open)}>
              {mobileNavOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-grid" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> المساعد اليمني الأول للمعرفة</div>
            <h1>اسأل، وتعلّم،<br /><em>وخلك قريب من اليمن.</em></h1>
            <p className="hero-lead">يمن AI يعرف حكايات اليمن، من تاريخ صنعاء العتيق<br className="desktop-only" /> إلى نكهات حضرموت ولهجاتها. اسأله وبيجاوبك كنه واحد منكم.</p>
            <div className="hero-stats">
              <div><strong>٢٢</strong><span>محافظة يعرفها</span></div>
              <div><strong>∞</strong><span>حكاية يمنية</span></div>
              <div><strong>٢٤/٧</strong><span>معك في أي وقت</span></div>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="sun-disc"><Sun size={36} /></div>
            <div className="mountain mountain-back" />
            <div className="mountain mountain-front" />
            <div className="tower tower-one"><span /><span /><span /></div>
            <div className="tower tower-two"><span /><span /></div>
            <div className="art-label"><MapPin size={14} /> من صنعاء القديمة</div>
          </div>
        </section>

        <section id="chat" className="chat-section">
          <div className="section-heading">
            <div>
              <div className="section-kicker"><Sparkles size={16} /> خويّك اليمني</div>
              <h2>وش خاطرك تعرف اليوم؟</h2>
              <p>اكتب سؤالك باللهجة اللي تريحك، ويمن AI بيرد عليك من قلب التراث اليمني.</p>
            </div>
            <div className="online-pill"><span /> متصل الآن</div>
          </div>

          <div className="chat-shell">
            <aside className="chat-aside">
              <div className="aside-topline"><span className="mini-logo">ي</span><div><strong>يمن AI</strong><small>رفيقك في كل حكاية</small></div></div>
              <div className="aside-rule" />
              <p className="aside-label">ابدأ من هنا</p>
              <div className="prompt-list">
                {suggestedPrompts.map(({ icon: Icon, label, prompt }) => (
                  <button key={label} className="prompt-item" onClick={() => sendMessage(prompt)} disabled={chatMutation.isPending}>
                    <span className="prompt-icon"><Icon size={17} /></span><span>{label}</span><ChevronLeft size={15} className="prompt-arrow" />
                  </button>
                ))}
              </div>
              <div className="aside-tip"><Globe2 size={17} /><p><strong>معلومة سريعة</strong><br />اليمن فيها أكثر من ٢٠٠ لهجة محلية.</p></div>
            </aside>

            <div className="chat-main">
              <div className="chat-toolbar"><div className="assistant-presence"><span className="avatar">ي</span><div><strong>يمن AI</strong><span><i /> جاهز يسمعك</span></div></div><button className="toolbar-more" aria-label="خيارات المحادثة">•••</button></div>
              <div className="messages-area">
                <div className="date-divider"><span>اليوم</span></div>
                {displayMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`message-row ${message.role === "user" ? "user-row" : "assistant-row"}`}>
                    {message.role === "assistant" && <span className="message-avatar">ي</span>}
                    <div className="message-content-wrap">
                      <div className={`message-bubble ${message.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
                        {message.role === "assistant" ? <Streamdown>{message.content}</Streamdown> : message.content}
                      </div>
                      <div className="message-meta">
                        <span>{message.role === "assistant" ? "يمن AI" : "أنت"} · الآن</span>
                        {message.role === "assistant" && <span className="message-tools"><button aria-label="نسخ الرد" onClick={() => copyMessage(message.content, index)}>{copiedIndex === index ? "تم النسخ" : <Copy size={13} />}</button><button aria-label="إعجاب بالرد" className={likedIndex === index ? "liked" : ""} onClick={() => setLikedIndex(index)}><ThumbsUp size={13} /></button></span>}
                      </div>
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && <div className="message-row assistant-row"><span className="message-avatar">ي</span><div className="typing-bubble"><span /><span /><span /></div></div>}
              </div>
              <div className="chat-composer-wrap">
                <div className="composer-suggestions">
                  {suggestedPrompts.slice(0, 3).map(({ label, prompt }) => <button key={label} onClick={() => sendMessage(prompt)} disabled={chatMutation.isPending}>{label}</button>)}
                </div>
                <form className="composer" onSubmit={handleSubmit}>
                  <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="اكتب سؤالك هنا..." rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSubmit(event); } }} />
                  <button className={`voice-button ${isRecording ? "is-recording" : ""}`} type="button" onClick={toggleRecording} disabled={voiceMutation.isPending} aria-label={isRecording ? "إيقاف التسجيل" : "تسجيل سؤال صوتي"}><Mic2 size={16} /></button>
                  <button className="send-button" type="submit" disabled={!input.trim() || chatMutation.isPending} aria-label="إرسال السؤال"><Send size={18} /></button>
                </form>
                <div className="composer-note"><ShieldCheckIcon /> يمن AI ممكن يغلط أحيانًا، بس دايمًا يتعلم منكم.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="specialists" className="specialists-section">
          <div className="section-heading specialists-heading">
            <div><div className="section-kicker"><Sparkles size={16} /> أدوات تعرف اليمن من الداخل</div><h2>ثلاثة محركات، لثلاثة احتياجات</h2><p>ميزات أولية متخصصة، قابلة للتوسع ببيانات يمنية موثوقة مع الوقت.</p></div>
            <span className="beta-pill">نسخة تجريبية</span>
          </div>
          <div className="specialist-grid">
            <article className="specialist-card dialect-card">
              <div className="specialist-icon"><Mic2 size={20} /></div><span className="specialist-label">Yemeni NLP</span><h3>يفهم كلامك،<br /><em>مو بس يترجمه</em></h3><p>حلّل عبارة عامية، اعرف معناها، وخذ ردًا مناسبًا لسياق العميل اليمني.</p>
              <form onSubmit={analyzeDialect} className="specialist-form"><textarea value={dialectText} onChange={(event) => setDialectText(event.target.value)} placeholder="مثال: عادك وصلت ولا باتجي؟" rows={2} /><button type="submit" disabled={dialectMutation.isPending || !dialectText.trim()}>{dialectMutation.isPending ? "جاري الفهم..." : "حلّل العبارة"}<ArrowLeft size={15} /></button></form>
              {dialectResult && <div className="result-box"><Streamdown>{dialectResult}</Streamdown></div>}
            </article>

            <article className="specialist-card market-card">
              <div className="specialist-icon"><BarChart3 size={20} /></div><span className="specialist-label">Yemeni Market Intelligence</span><h3>احسبها على<br /><em>سوقك المحلي</em></h3><p>حسبة شفافة للتكلفة والجمارك وهامش الربح. أدخل أرقامك بدل التخمين.</p>
              <form onSubmit={calculateMarket} className="market-form">
                <label>الكمية<input type="number" min="1" value={market.quantity} onChange={(event) => setMarket({ ...market, quantity: event.target.value })} /></label><label>سعر الوحدة<input type="number" min="0" value={market.unitPrice} onChange={(event) => setMarket({ ...market, unitPrice: event.target.value })} /></label><label>سعر الصرف<input type="number" min="1" value={market.exchangeRate} onChange={(event) => setMarket({ ...market, exchangeRate: event.target.value })} /></label><label>الجمارك %<input type="number" min="0" value={market.customsRate} onChange={(event) => setMarket({ ...market, customsRate: event.target.value })} /></label><label>الربح %<input type="number" min="0" value={market.marginRate} onChange={(event) => setMarket({ ...market, marginRate: event.target.value })} /></label>
                <button type="submit" disabled={marketMutation.isPending}>احسب التسعيرة <Calculator size={15} /></button>
              </form>
              {marketResult && <div className="market-result"><div><span>التكلفة الإجمالية</span><strong>{Math.round(marketResult.totalCost).toLocaleString("ar-YE")} <small>ريال</small></strong></div><div><span>سعر البيع المقترح</span><strong className="accent-number">{Math.round(marketResult.suggestedUnitPrice).toLocaleString("ar-YE")} <small>للوحدة</small></strong></div><p>{marketResult.disclaimer}</p></div>}
            </article>

            <article className="specialist-card agri-card">
              <div className="specialist-icon"><Leaf size={20} /></div><span className="specialist-label">Yemeni AgriTech AI</span><h3>صوّر الورقة،<br /><em>وخلك أقرب للتشخيص</em></h3><p>قراءة أولية للصورة مع أسئلة متابعة وخطوات آمنة تناسب بيئة اليمن.</p>
              <label className={`upload-zone ${agriPreview ? "has-image" : ""}`}><input type="file" accept="image/*" onChange={handleCropImage} /><span>{agriPreview ? <img src={agriPreview} alt="صورة المحصول المرفوعة" /> : <><Upload size={20} /><strong>ارفع صورة المحصول</strong><small>JPG أو PNG · حتى ٣MB</small></>}</span></label>
              {agricultureMutation.isPending && <div className="analysis-status"><span /> جاري قراءة الصورة...</div>}
              {agriResult && <div className="result-box"><Streamdown>{agriResult}</Streamdown></div>}
              <small className="safety-note">تنبيه: الصورة لا تغني عن رأي مهندس زراعي محلي، خصوصًا قبل استخدام المبيدات.</small>
            </article>
          </div>
          <div className="data-note"><span className="data-note-icon"><BarChart3 size={15} /></span><p><strong>مهمتنا القادمة: بيانات من اليمن.</strong> نحتاج شراكات مع مزارعين وتجار ومتحدثين من مختلف المحافظات لبناء نموذج يفهم الواقع، وليس النصوص فقط.</p><a href="#about">ساهم بالبيانات <ArrowLeft size={14} /></a></div>
        </section>

        <section id="discover" className="discover-section">
          <div className="section-heading discover-heading"><div><div className="section-kicker"><Compass size={16} /> اكتشف أكثر</div><h2>اليمن أكبر من سؤال</h2><p>مداخل صغيرة لحكايات كبيرة، اختار موضوع وخلّنا نبدأ السالفة.</p></div><a href="#chat" className="text-link">استكشف مع يمن AI <ArrowLeft size={16} /></a></div>
          <div className="discovery-grid">
            <a href="#chat" className="discovery-card card-sanaa"><span className="card-number">٠١</span><div><span className="card-tag">العمارة</span><h3>بيوت صنعاء<br />اللي تحكي</h3><p>أبراج من طين وذاكرة من ألف سنة.</p></div><ArrowLeft className="card-arrow" /></a>
            <a href="#chat" className="discovery-card card-coffee"><span className="card-number">٠٢</span><div><span className="card-tag">مذاقات</span><h3>من بنّ<br />المخا</h3><p>قصة أول قهوة وصلت للعالم.</p></div><ArrowLeft className="card-arrow" /></a>
            <a href="#chat" className="discovery-card card-socotra"><span className="card-number">٠٣</span><div><span className="card-tag">طبيعة</span><h3>جزيرة<br />سقطرى</h3><p>مكان كأنه من كوكب ثاني.</p></div><ArrowLeft className="card-arrow" /></a>
          </div>
        </section>

        <section id="about" className="about-strip"><div className="about-mark"><MessageCircle size={22} /></div><div><strong>مصنوع بحب لأهل اليمن</strong><p>يمن AI مشروع يقرّب المعرفة اليمنية لكل واحد، داخل اليمن وخارجه.</p></div><div className="about-location"><MapPin size={17} /> من اليمن، للعالم</div></section>
      </main>
      <footer><span>© ٢٠٢٦ Yemen AI</span><span>معرفة يمنية، بروح يمنية.</span><span className="footer-links"><a href="https://wa.me/967780136423" target="_blank" rel="noreferrer">تواصل معنا عبر واتساب · 780136423</a></span></footer>
    </div>
  );
}

function ShieldCheckIcon() {
  return <span className="shield-check" aria-hidden="true">✓</span>;
}

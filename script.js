// Jincheng Lou — homepage redesign (branch glm53flash)
// theme · EN/中文 · embedded availability calendar · wechat copy
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  /* ——— theme ——— */
  const metaTheme = $('meta[name="theme-color"]');
  const THEME_BG = { light: "#fbf6ef", dark: "#17120d" };
  const storedTheme = localStorage.getItem("theme");
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    if (metaTheme) metaTheme.setAttribute("content", THEME_BG[theme]);
  };
  applyTheme(storedTheme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("#theme-toggle").addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ——— i18n ——— */
  const I18N = {
    en: {
      "nav.avail": "Availability", "nav.work": "Projects", "nav.research": "Publications", "nav.about": "About", "nav.contact": "Contact",
      "hero.eyebrow": "ChipBagel · Peking University",
      "hero.title": `Jincheng Lou<span class="zh" lang="zh-Hans">楼锦程</span>`,
      "hero.intro": `Founder &amp; CEO of <strong>ChipBagel</strong>, building at the intersection of AI agents and chip design. Ph.D. candidate in Integrated Circuit Science and Engineering at Peking University, advised by Prof. Yibo Lin.`,
      "int.1": "Agentic EDA", "int.2": "LLMs for Chip Design", "int.3": "Multimodal Circuit Intelligence", "int.4": "Hardware-Efficient AI",
      "hero.cta1": "Selected projects", "hero.cta2": "This week's availability", "hero.cv": "Download CV ↗",
      "hero.orbit": "AI Agents · EDA · Chip Design", "hero.caption": "ChipBagel / Peking University",
      "hero.foot1": "AI Agents × Chip Design × Open Source", "hero.foot2": "Scroll — this week's openings&nbsp;↓",
      "avail.eyebrow": "Availability", "avail.title": "This week's schedule",
      "avail.note": `All times in China Standard Time (UTC+8).<br>Only occupied periods are published — details stay private.`,
      "avail.fail": "Availability is temporarily unavailable — please email me directly.",
      "avail.stale": "May be outdated — confirm by email",
      "avail.busy": "Occupied", "avail.free": "Open",
      "avail.book": "Propose a time",
      "avail.bookNote": "Green blocks are open. Email me a candidate slot and I will confirm — details of busy periods stay private.",
      "avail.loc": "Weekdays usually at Peking University, Haidian Campus; weekends uncertain.",
      "avail.cta": "Email to propose a time",
      "work.eyebrow": "Selected Work", "work.title": "Selected Projects",
      "work.note": `Open-source systems for autonomous research,<br>agentic chip design, and AI-native learning tools.`,
      "p.lego.tag": "Agentic EDA",
      "p.lego.lede": "An LLM skill-based platform for front-end chip design generation.",
      "p.lego.meta": "42 executable, composable circuit skills extracted from 11 open-source EDA projects.",
      "p.lego.more": "Explore the platform", "p.lego.chip": "Composable intelligence",
      "p.lego.n1": "Specification", "p.lego.n2": "Executable skills", "p.lego.n3": "RTL design",
      "p.aris.tag": "Autonomous Research",
      "p.aris.lede": "Autonomous ML research with cross-model review.",
      "p.aris.meta": "A lightweight, Markdown-only system covering idea discovery, experiments, and paper writing.",
      "p.unfold.tag": "AI-Native Learning",
      "p.unfold.lede": "AI-powered video annotation and learning.",
      "p.unfold.meta": "Transcripts, chapters, summaries, keywords, quotes, and contextual knowledge cards.",
      "res.eyebrow": "Research", "res.title": "Publications",
      "res.note": `Agentic EDA, multimodal circuit intelligence,<br>physical design, and hardware-efficient AI.`,
      "pub.gogotb": "Agentic RTL verification with specification-grounded coverage closure.",
      "pub.diagramnet": "An end-to-end recognition framework and dataset for non-standard system-level diagrams.",
      "pub.lego2": "A unified agentic platform for digital chip design and optimization.",
      "pub.lego": "An LLM skill-based front-end design generation platform.",
      "pub.vineplace": "Compact analog and mixed-signal placement via core-centered vine representation.",
      "pub.powercube": "A formula-in-the-loop framework for cross-stage power map prediction.",
      "pub.gta": "GPU-accelerated track assignment with lightweight lookup table for conflict detection.",
      "pub.quartet": "A 22nm compute-in-memory AI accelerator with heterogeneous tensor engines and off-chip-less dataflow.",
      "badge.bpn": "Best Paper Nomination",
      "about.eyebrow": "Background", "about.title": `About &amp;<br>Experience`,
      "about.honorsTitle": "Honors &amp; awards",
      "about.honors": "National runner-up of the Fuwei Cup; Enterprise Special Award and National Second Prize in the EDA Elite Challenge; National First Prize in the National College Intelligent Car Competition; First Prize in the Peking University Challenge Cup — among more than 30 national, provincial, and municipal awards.",
      "about.lead": `Jincheng Lou is the Founder &amp; CEO of ChipBagel, a serial entrepreneur in AI agents with experience spanning EDA and chip design.`,
      "about.bio1": "He is a Ph.D. candidate at Peking University's School of Integrated Circuits, advised by Prof. Yibo Lin. He serves on the School's Innovation and Entrepreneurship Committee and as Deputy Secretary of its Youth League Committee. He is also a Northeastern University alumni mentor and previously served as Vice President of the Peking University Innovation Society.",
      "about.bio2": "He has authored or co-authored papers with Best Paper Nominations at ICCAD and ISEDA. His industry experience includes NPU algorithm design and optimization at a unicorn AI-chip company, and participation in multiple 22nm to 28nm tapeouts. Before ChipBagel, he founded the angel-funded agent-hardware company Takway.AI, which received international media coverage at CES; his earlier robotics work was deployed in the main library at Shanghai Jiao Tong University.",
      "xp.now": "Now",
      "xp1.org": "ChipBagel · Founder & CEO", "xp1.note": "Building at the intersection of AI agents, EDA, and chip design.",
      "xp2.org": "Peking University · Ph.D. Candidate", "xp2.note": "Integrated Circuit Science and Engineering · Advisor: Prof. Yibo Lin · Focus: Agentic EDA.",
      "xp3.org": "Takway.AI · Co-founder & CEO", "xp3.note": "LLM-powered interactive hardware. Led hardware, product, fundraising, and recruiting; secured angel investment.",
      "xp4.org": "Peking University · M.Eng.", "xp4.note": "Integrated Circuit Engineering · Advisors: Prof. Yufei Ma and Prof. Le Ye · Hardware-friendly AI algorithms and co-design.",
      "xp5.org": "Shanghai Sazhi Intelligent Technology · Robotics Intern", "xp5.note": "Built Gazebo simulation and ROS 1 interfaces for deployed service robots; independently designed a controller board.",
      "xp6.org": "Northeastern University · B.Eng.", "xp6.note": "Automation (A+) · GPA 3.685/5.0, ranked 1/131 · Recommended for postgraduate admission (top 5%).",
      "contact.eyebrow": "Contact", "contact.title": `Let's build<br>what's next.`,
      "contact.note": "Public availability is shown in China Standard Time — only occupied periods are published. On weekdays I am usually at Peking University's Haidian Campus.",
      "contact.elsewhere": "Elsewhere",
      "contact.xhs": `Xiaohongshu<em>@楼锦程</em>`,
      "contact.wechat": `WeChat<em>Nikolas_loujc</em>`, "contact.copy": "Copy", "contact.cv": "PDF · English",
      "foot.email": "Email ↗", "foot.top": "Back to top ↑",
      title: "Jincheng Lou · 楼锦程 — ChipBagel Founder & CEO",
      calDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      calToday: "Today",
      calUpdated: (iso) => `Anonymized update: ${new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
      calWeekLabel: (a, b) => {
        const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const sameMonth = a.getUTCMonth() === b.getUTCMonth();
        return sameMonth
          ? `${m[a.getUTCMonth()]} ${a.getUTCDate()} – ${b.getUTCDate()}, ${b.getUTCFullYear()}`
          : `${m[a.getUTCMonth()]} ${a.getUTCDate()} – ${m[b.getUTCMonth()]} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
      },
      calSource: { live: "Live", snapshot: "Snapshot" },
      toastWechat: "WeChat ID copied: Nikolas_loujc",
      toastTheme: null, toastLang: null,
    },
    zh: {
      "nav.avail": "空闲时间", "nav.work": "项目", "nav.research": "论文", "nav.about": "关于", "nav.contact": "联系",
      "hero.eyebrow": "ChipBagel · 北京大学",
      "hero.title": `楼锦程<span class="en-sub">JINCHENG LOU</span>`,
      "hero.intro": `<strong>ChipBagel 创始人兼 CEO</strong>，聚焦 AI Agent 与芯片设计的交叉方向。北京大学集成电路学院博士生，师从林亦波教授。`,
      "int.1": "Agentic EDA", "int.2": "芯片设计大模型", "int.3": "多模态电路理解", "int.4": "AI 芯片与软硬件协同",
      "hero.cta1": "精选项目", "hero.cta2": "本周空闲时间", "hero.cv": "下载简历 ↗",
      "hero.orbit": "AI AGENT · EDA · 芯片设计", "hero.caption": "ChipBagel / 北京大学",
      "hero.foot1": "AI AGENT × 芯片设计 × 开源", "hero.foot2": "下滑查看本周空闲&nbsp;↓",
      "avail.eyebrow": "空闲时间", "avail.title": "本周日程",
      "avail.note": `时间统一按中国标准时间（UTC+8）显示。<br>仅公开占用时段，日程细节保持私密。`,
      "avail.fail": "日程暂时无法加载，请直接邮件联系我。",
      "avail.stale": "数据可能已过期，请邮件确认",
      "avail.busy": "占用", "avail.free": "空闲可约",
      "avail.book": "预约时间",
      "avail.bookNote": "绿色时段为空闲可约。发邮件提出候选时间，我会尽快确认；占用时段的细节保持私密。",
      "avail.loc": "工作日通常在北京大学海淀校区，周末时间不确定。",
      "avail.cta": "邮件预约时间",
      "work.eyebrow": "精选工作", "work.title": "精选项目",
      "work.note": `覆盖自主科研、智能体芯片设计<br>与 AI 原生学习工具的开源系统。`,
      "p.lego.tag": "AGENTIC EDA",
      "p.lego.lede": "面向数字芯片前端设计的开源技能化平台。",
      "p.lego.meta": "将 11 个开源 EDA 项目的方法提炼为 42 个可执行、可组合的电路技能。",
      "p.lego.more": "探索这个平台", "p.lego.chip": "可组合智能",
      "p.lego.n1": "规格说明", "p.lego.n2": "可执行技能", "p.lego.n3": "RTL 设计",
      "p.aris.tag": "自主科研",
      "p.aris.lede": "跨模型评审的自主机器学习科研系统。",
      "p.aris.meta": "轻量级、纯 Markdown 的系统，覆盖想法发现、实验执行与论文写作。",
      "p.unfold.tag": "AI 原生学习",
      "p.unfold.lede": "AI 驱动的视频智能注释与学习系统。",
      "p.unfold.meta": "自动生成字幕、章节、摘要、关键词、金句与上下文知识卡片。",
      "res.eyebrow": "科研", "res.title": "论文",
      "res.note": `Agentic EDA、多模态电路理解、<br>物理设计与硬件高效 AI。`,
      "pub.gogotb": "基于规范锚定的智能体式 RTL 验证与覆盖率收敛。",
      "pub.diagramnet": "面向非标准系统级图表的端到端识别框架与数据集。",
      "pub.lego2": "面向数字芯片设计与优化的统一智能体平台。",
      "pub.lego": "基于 LLM 技能的芯片前端设计生成平台。",
      "pub.vineplace": "以核为中心的藤式表示，实现紧凑的模拟混合信号布局。",
      "pub.powercube": "公式在环的跨阶段功耗图预测框架。",
      "pub.gta": "GPU 加速的布线轨道分配，轻量查表实现冲突检测。",
      "pub.quartet": "22nm 数字存内计算 AI 加速器，异构张量引擎与无片外数据流。",
      "badge.bpn": "最佳论文提名",
      "about.eyebrow": "背景", "about.title": `关于与<br>经历`,
      "about.honorsTitle": "荣誉与奖项",
      "about.honors": "“复微杯”全国第二名；EDA 精英挑战赛企业特别奖、全国二等奖；全国大学生智能汽车竞赛全国一等奖；北京大学挑战杯一等奖——等三十余项国家、省、市级奖项。",
      "about.lead": `楼锦程，ChipBagel 创始人兼 CEO，Agent 领域连续创业者，拥有 EDA 与芯片设计经验。`,
      "about.bio1": "北京大学集成电路学院博士生，师从林亦波教授；现任学院双创委员、团委副书记，同时担任东北大学校友导师，曾任北京大学创新学社副会长。",
      "about.bio2": "已发表多篇领域顶级会议论文，获 ICCAD 与 ISEDA 最佳论文提名奖。曾在独角兽 AI 芯片公司负责 NPU 算法设计与优化，多次参与 22nm 至 28nm 工艺流片。曾创办天使轮 Agent 硬件公司 Takway.AI，在 CES 获多国头部媒体报道；此前参与研发的机器人已落地上海交通大学闵行校区图书馆主馆。",
      "xp.now": "至今",
      "xp1.org": "ChipBagel · 创始人兼 CEO", "xp1.note": "聚焦 AI Agent、EDA 与芯片设计的交叉方向。",
      "xp2.org": "北京大学 · 博士研究生", "xp2.note": "集成电路科学与工程 · 师从林亦波教授 · 研究方向：Agentic EDA。",
      "xp3.org": "Takway.AI · 联合创始人兼 CEO", "xp3.note": "LLM+硬件交互产品。负责硬件、产品、融资与招募，获得天使轮投资。",
      "xp4.org": "北京大学 · 硕士", "xp4.note": "集成电路工程 · 师从马玉飞、叶乐教授 · 硬件友好 AI 算法与软硬件协同。",
      "xp5.org": "上海思知智能科技 · 机器人实习生", "xp5.note": "搭建 Gazebo 仿真与 ROS 1 接口，独立设计控制器板。",
      "xp6.org": "东北大学 · 本科", "xp6.note": "自动化（A+）· GPA 3.685/5.0，专业排名 1/131 · 推荐免试研究生（前 5%）。",
      "contact.eyebrow": "联系", "contact.title": `一起做点<br>新东西。`,
      "contact.note": "公开时间按中国标准时间显示，仅展示占用时段。工作日通常在北京大学海淀校区。",
      "contact.elsewhere": "其他平台",
      "contact.xhs": `小红书<em>@楼锦程</em>`,
      "contact.wechat": `微信<em>Nikolas_loujc</em>`, "contact.copy": "复制", "contact.cv": "PDF · 英文",
      "foot.email": "邮箱 ↗", "foot.top": "回到顶部 ↑",
      title: "楼锦程 · Jincheng Lou — ChipBagel 创始人兼 CEO",
      calDays: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      calToday: "今天",
      calUpdated: (iso) => `匿名化更新：${new Date(iso).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" })}`,
      calWeekLabel: (a, b) => {
        const fp = (d) => `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
        const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
        return sameMonth
          ? `${a.getUTCFullYear()} 年 ${a.getUTCMonth() + 1} 月 ${a.getUTCDate()} – ${b.getUTCDate()} 日`
          : `${fp(a)} – ${fp(b)}`;
      },
      calSource: { live: "实时", snapshot: "快照" },
      toastWechat: "微信号已复制：Nikolas_loujc",
    },
  };

  let lang = localStorage.getItem("lang") ?? (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
  const langBtn = $("#lang-toggle");
  const applyLang = (next) => {
    lang = next;
    localStorage.setItem("lang", lang);
    root.setAttribute("lang", lang);
    document.title = I18N[lang].title;
    langBtn.textContent = lang === "en" ? "中文" : "EN";
    for (const el of $$("[data-i18n]")) {
      const value = I18N[lang][el.dataset.i18n];
      if (typeof value === "string") el.textContent = value;
    }
    for (const el of $$("[data-i18n-html]")) {
      const value = I18N[lang][el.dataset.i18nHtml];
      if (typeof value === "string") el.innerHTML = value;
    }
    renderCalendar();
  };
  langBtn.addEventListener("click", () => applyLang(lang === "en" ? "zh" : "en"));

  /* ——— toast ——— */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  };

  /* ——— wechat copy ——— */
  const WECHAT_ID = "Nikolas_loujc";
  const copyWechat = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(WECHAT_ID);
      } else {
        const field = document.createElement("textarea");
        field.value = WECHAT_ID;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      showToast(I18N[lang].toastWechat);
    } catch {
      showToast(WECHAT_ID);
    }
  };
  $("#wechat-btn").addEventListener("click", copyWechat);
  $("#wechat-btn-2").addEventListener("click", copyWechat);

  /* ——— availability calendar ——— */
  const LIVE_URL = "https://loujc.github.io/availability/busy.json";
  const SNAPSHOT_URL = "availability-snapshot.json";
  const MINUTES_UTF_OFFSET = 480; // 08:00 CST display window start
  const cal = { data: null, source: null, failed: false, weekIndex: 0, weekCount: 0 };

  const shanghaiParts = (date) => {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
    const parts = {};
    for (const { type, value } of fmt.formatToParts(date)) parts[type] = value;
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute),
    };
  };
  const keyFromUTC = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dateFromKey = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const addDaysKey = (key, days) => {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return keyFromUTC(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  };
  const mondayOfKey = (key) => {
    const date = dateFromKey(key);
    const weekday = date.getUTCDay() || 7;
    return addDaysKey(key, 1 - weekday);
  };

  const validPayload = (payload) =>
    payload && payload.schema_version === 1 && payload.status === "ready"
    && typeof payload.generated_at === "string" && !Number.isNaN(Date.parse(payload.generated_at))
    && typeof payload.window_start === "string" && typeof payload.window_end === "string"
    && Array.isArray(payload.busy)
    && payload.display_hours && typeof payload.display_hours.start === "string";

  const loadAvailability = async () => {
    const attempt = async (url, source) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return false;
        const payload = await response.json();
        if (!validPayload(payload)) return false;
        cal.data = payload;
        cal.source = source;
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    };
    if (await attempt(LIVE_URL, "live")) return;
    if (await attempt(SNAPSHOT_URL, "snapshot")) return;
    cal.failed = true;
  };

  const clockMinutes = (clock) => {
    const [h, m] = clock.split(":").map(Number);
    return h * 60 + m;
  };

  const renderCalendar = () => {
    const grid = $("#cal-grid");
    const fail = $("#cal-fail");
    const toolbar = $("#cal-toolbar");
    const foot = document.querySelector(".cal-foot");
    if (!cal.data && !cal.failed) return; // still loading
    if (cal.failed || !cal.data) {
      fail.hidden = false;
      toolbar.hidden = true;
      grid.style.display = "none";
      if (foot) foot.style.display = "none";
      return;
    }
    fail.hidden = true;
    toolbar.hidden = false;
    grid.style.display = "";
    if (foot) foot.style.display = "";

    const { busy, display_hours, generated_at, window_start, window_end, stale_after_hours } = cal.data;
    const dayStart = clockMinutes(display_hours.start);
    const dayEnd = clockMinutes(display_hours.end === "24:00" ? "24:00" : display_hours.end);
    const span = dayEnd - dayStart;

    const t = I18N[lang];
    const stale = Date.now() - Date.parse(generated_at) > (stale_after_hours ?? 6) * 3600e3;
    $("#cal-stale").hidden = !stale;
    const badge = $("#cal-source");
    badge.hidden = false;
    badge.textContent = t.calSource[cal.source];

    const totalWeeks = Math.round((dateFromKey(window_end) - dateFromKey(window_start)) / 6048e5);
    cal.weekCount = totalWeeks;
    const nowSH = shanghaiParts(new Date());
    const currentMonday = mondayOfKey(nowSH.key);
    const currentIndex = Math.round((dateFromKey(currentMonday) - dateFromKey(window_start)) / 6048e5);
    if (!renderCalendar.initialized) {
      cal.weekIndex = Math.min(Math.max(currentIndex, 0), totalWeeks - 1);
      renderCalendar.initialized = true;
    }
    cal.weekIndex = Math.min(Math.max(cal.weekIndex, 0), totalWeeks - 1);

    const weekStart = addDaysKey(window_start, cal.weekIndex * 7);
    const weekEnd = addDaysKey(weekStart, 6);
    $("#cal-week-label").textContent = t.calWeekLabel(dateFromKey(weekStart), dateFromKey(weekEnd));
    $("#cal-prev").disabled = cal.weekIndex <= 0;
    $("#cal-next").disabled = cal.weekIndex >= totalWeeks - 1;

    const busyByDay = new Map();
    for (const interval of busy) {
      const start = shanghaiParts(new Date(interval.start));
      const end = shanghaiParts(new Date(interval.end));
      let endMinutes = end.minutes;
      if (end.key !== start.key) {
        // intervals end at most at the next midnight; fold back into the start day
        if (end.key === addDaysKey(start.key, 1) && end.minutes === 0) endMinutes = 1440;
        else continue;
      }
      if (start.key < weekStart || start.key > weekEnd) continue;
      const list = busyByDay.get(start.key) ?? [];
      list.push({ start: start.minutes, end: endMinutes });
      busyByDay.set(start.key, list);
    }

    // free = display window minus busy; elapsed time today counts as expired
    const slotMinutes = cal.data.slot_minutes ?? 30;
    const fmtMinutes = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const freeByDay = new Map();
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(weekStart, i);
      const busyList = (busyByDay.get(key) ?? []).slice().sort((a, b) => a.start - b.start);
      const raw = [];
      let cursor = dayStart;
      for (const b of busyList) {
        if (cursor < b.start) raw.push({ start: cursor, end: Math.min(b.start, dayEnd) });
        cursor = Math.max(cursor, b.end);
      }
      if (cursor < dayEnd) raw.push({ start: cursor, end: dayEnd });

      const marked = [];
      for (const f of raw) {
        if (key < nowSH.key) {
          marked.push({ ...f, expired: true });
        } else if (key === nowSH.key && f.start < nowSH.minutes) {
          if (f.end <= nowSH.minutes) {
            marked.push({ ...f, expired: true });
          } else {
            marked.push({ start: f.start, end: nowSH.minutes, expired: true });
            marked.push({ start: nowSH.minutes, end: f.end, expired: false });
          }
        } else {
          marked.push({ ...f, expired: false });
        }
      }
      freeByDay.set(key, marked.filter((f) => f.expired || f.end - f.start >= slotMinutes));
    }

    grid.replaceChildren();

    // time axis
    const axis = document.createElement("div");
    axis.className = "cal-axis";
    axis.setAttribute("aria-hidden", "true");
    const axisHead = document.createElement("div");
    axisHead.className = "cal-day-head";
    const axisTrack = document.createElement("div");
    axisTrack.className = "cal-axis-track";
    for (let h = Math.ceil(dayStart / 60); h * 60 <= dayEnd; h += 2) {
      const label = document.createElement("span");
      label.textContent = `${String(h).padStart(2, "0")}:00`;
      label.style.top = `${((h * 60 - dayStart) / span) * 100}%`;
      axisTrack.append(label);
    }
    axis.append(axisHead, axisTrack);
    grid.append(axis);

    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(weekStart, i);
      const date = dateFromKey(key);
      const day = document.createElement("div");
      day.className = "cal-day";
      if (key === nowSH.key) day.classList.add("today");
      if (key < nowSH.key) day.classList.add("past");

      const head = document.createElement("div");
      head.className = "cal-day-head";
      const dow = document.createElement("span");
      dow.className = "cal-dow";
      dow.textContent = t.calDays[i];
      const num = document.createElement("span");
      num.className = "cal-date";
      num.textContent = String(date.getUTCDate());
      num.title = t.calToday && key === nowSH.key ? t.calToday : "";
      head.append(dow, num);

      const track = document.createElement("div");
      track.className = "cal-track";
      const place = (start, end) => {
        const el = document.createElement("i");
        el.className = "cal-block";
        el.style.top = `${((Math.max(start, dayStart) - dayStart) / span) * 100}%`;
        el.style.height = `${Math.max(((end - start) / span) * 100, 1)}%`;
        return el;
      };
      for (const b of busyByDay.get(key) ?? []) track.append(place(b.start, b.end));
      for (const f of freeByDay.get(key) ?? []) {
        const el = place(f.start, f.end);
        el.classList.add("free");
        if (f.expired) el.classList.add("expired");
        else if (f.end - f.start >= 60) {
          const label = document.createElement("b");
          label.className = "cal-slot";
          label.textContent = `${fmtMinutes(f.start)}–${fmtMinutes(f.end)}`;
          el.append(label);
        }
        track.append(el);
      }

      day.append(head, track);
      grid.append(day);
    }

    $("#cal-updated").textContent = t.calUpdated(generated_at);
  };
  $("#cal-prev").addEventListener("click", () => { cal.weekIndex -= 1; renderCalendar(); });
  $("#cal-next").addEventListener("click", () => { cal.weekIndex += 1; renderCalendar(); });
  loadAvailability().then(renderCalendar);

  /* ——— header / reveal / motion ——— */
  const head = $(".site-head");
  const onScroll = () => head.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const revealables = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
  }

  applyLang(lang);

  if (matchMedia("(pointer: fine)").matches && !reduceMotion.matches) {
    let queued = false;
    addEventListener(
      "pointermove",
      (event) => {
        const x = event.clientX / innerWidth - 0.5;
        const y = event.clientY / innerHeight - 0.5;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          root.style.setProperty("--mx", `${x * 55}px`);
          root.style.setProperty("--my", `${y * 38}px`);
          queued = false;
        });
      },
      { passive: true }
    );

    const portrait = $(".portrait");
    portrait?.addEventListener("pointermove", (event) => {
      const rect = portrait.getBoundingClientRect();
      portrait.style.setProperty("--sx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      portrait.style.setProperty("--sy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  }

  document.addEventListener("visibilitychange", () => {
    $$(".ambient i").forEach((el) => {
      el.style.animationPlayState = document.hidden ? "paused" : "running";
    });
  });

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();

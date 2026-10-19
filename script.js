// Jincheng Lou — homepage (branch glm53flash)
// theme · EN/中文 · availability with click-to-pick · publication tools · dot-matrix footprint map
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const EMAIL = "jinchenglou@stu.pku.edu.cn";
  const WECHAT_ID = "Nikolas_loujc";
  root.classList.add("reveal-ready"); // scroll reveal is ours now; cancels the CSS fallback

  /* ——— theme ——— */
  const metaTheme = $('meta[name="theme-color"]');
  const THEME_BG = { light: "#fbf6ef", dark: "#17120d" };
  const themeListeners = [];
  const storedTheme = localStorage.getItem("theme");
  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    if (metaTheme) metaTheme.setAttribute("content", THEME_BG[theme]);
    themeListeners.forEach((fn) => fn());
  };
  applyTheme(storedTheme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  $("#theme-toggle").addEventListener("click", () => {
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
  });

  /* ——— i18n ——— */
  const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WD_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const I18N = {
    en: {
      "nav.avail": "Availability", "nav.work": "Projects", "nav.research": "Publications", "nav.about": "About", "nav.places": "Travels", "nav.contact": "Contact",
      "nav.menu": "Menu", "sheet.wechat": "Copy WeChat ID",
      "hero.eyebrow": "ChipBagel · Peking University",
      "hero.title": `Jincheng Lou<span class="zh" lang="zh-Hans">楼锦程</span>`,
      "hero.intro": `<strong>Founder &amp; CEO of ChipBagel</strong> — Silicon Intelligence Infra.<br>Ph.D. candidate in Integrated Circuit Science and Engineering at Peking University, advised by Prof. Yibo Lin.`,
      "int.1": "Agentic EDA Infra", "int.2": "Large Circuit Model", "int.3": "Multimodal Circuit Intelligence", "int.4": "Synthetic Data",
      "hero.cta1": "This week's availability", "hero.cta2": "Selected projects", "hero.cv": "Download CV ↗",
      "hero.orbit": "AI Agents · EDA · Chip Design", "hero.caption": "ChipBagel / Peking University",
      "hero.foot1": "AI Agents × Chip Design × Open Source", "hero.foot2": "Scroll — this week's openings&nbsp;↓",
      heroLive: (rel, time) => `Next opening — ${rel} at ${time} (China time)`,
      relDay: (d, diff) => (diff === 0 ? "today" : diff === 1 ? "tomorrow" : `${WD_EN[d.getUTCDay()]}, ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}`),
      "avail.eyebrow": "Availability", "avail.title": "This week's schedule",
      "avail.note": `All times in China Standard Time (UTC+8).<br>Only occupied periods are published — details stay private.`,
      "avail.fail": "Availability is temporarily unavailable — please email me directly.",
      "avail.stale": "May be outdated — confirm by email",
      "avail.busy": "Occupied", "avail.free": "Open", "avail.pick": "Your pick",
      "avail.book": "Propose a time",
      "avail.bookNote": "Click a green block to pick a start time, or choose below. I'll confirm by email — busy details stay private.",
      "avail.loc": "Weekdays usually at Peking University, Haidian Campus; weekends uncertain.",
      "mf.picked": "Selected slot", "mf.none": "No open slot this week",
      "mf.duration": "Duration", "mf.min30": "30 min", "mf.min60": "60 min",
      "mf.date": "Date", "mf.time": "Start",
      "mf.namePh": "Your name", "mf.emailPh": "Reply email", "mf.topicPh": "What to discuss? (optional)",
      "mf.errName": "Please add your name.", "mf.errEmail": "Please add a valid reply email.",
      "mf.submit": "Open email draft", "mf.copy": "Copy",
      "mf.note": "This drafts a request, not a booking — I'll confirm by reply. No mail app opening? “Copy” puts the whole request on your clipboard to send any way you like.",
      "mf.empty": "No open slots this week — try another week.",
      "mf.need": "Please fill in your name and reply email.",
      "mf.copied": "Request copied — paste it into an email or WeChat.",
      "mf.copyFail": "Couldn't copy automatically — please email me directly.",
      "mf.short": "That opening is only 30 minutes — switched to 30 min.",
      mfDate: (d) => `${WD_EN[d.getUTCDay()]}, ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}`,
      mfTime: (range) => `${range} · China time (UTC+8)`,
      mfLocal: (l) => `Your time: ${l.day}, ${l.from}–${l.to} · ${l.tz}`,
      mfSubject: (name) => `Meeting request from ${name}`,
      mfBody: (f) => [
        "Hi Jincheng,", "",
        "I'd like to request a meeting.", "",
        `  Proposed time: ${f.date}, ${f.range} (China Standard Time, UTC+8)`,
        ...(f.local ? [`  My local time: ${f.local.day}, ${f.local.from}–${f.local.to} (${f.local.tz})`] : []),
        `  Duration: ${f.duration} minutes`,
        `  Name: ${f.name}`,
        `  Reply email: ${f.email}`,
        `  Topic: ${f.topic || "—"}`, "",
        "This is a request, not a confirmed booking — please confirm by reply.", "",
      ].join("\n"),
      mfHeader: (to, subject) => `To: ${to}\nSubject: ${subject}`,
      toastPicked: (d, time) => `Picked ${WD_EN[d.getUTCDay()]} ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}, ${time} — details below ↓`,
      "work.eyebrow": "Selected Work", "work.title": "Selected Projects",
      "work.note": `Open-source systems for agentic chip design, research writing,<br>autonomous research, and AI-native learning.`,
      "p.lego.tag": "Agentic EDA",
      "p.lego.lede": "An LLM skill-based platform for front-end chip design generation.",
      "p.lego.meta": "42 executable, composable circuit skills extracted from 11 open-source EDA projects.",
      "p.lego.more": "Explore the platform", "p.lego.chip": "Composable intelligence",
      "p.lego.n1": "Specification", "p.lego.n2": "Executable skills", "p.lego.n3": "RTL design",
      "p.lego.badge": "ISEDA ’26 Best Paper Nomination",
      "p.aris.tag": "Autonomous Research",
      "p.aris.lede": "Autonomous ML research with cross-model review.",
      "p.aris.meta": "A lightweight, Markdown-only system covering idea discovery, experiments, and paper writing.",
      "p.unfold.tag": "AI-Native Learning",
      "p.unfold.lede": "AI-powered video annotation and learning.",
      "p.unfold.meta": "Transcripts, chapters, summaries, keywords, quotes, and contextual knowledge cards.",
      "p.epw.tag": "Research Writing",
      "p.epw.lede": "An evidence-grounded writing skill for EDA papers.",
      "p.epw.meta": "Turns methods, results, and notes into a challenge → insight → method → evidence argument — for Codex and other SKILL.md assistants.",
      "p.role.author": "Author", "p.role.contrib": "Contributor",
      "res.eyebrow": "Research", "res.title": "Publications",
      "res.note": `Agentic EDA, multimodal circuit intelligence, physical design,<br>and hardware-efficient AI — 8 papers, Best Paper Nominations at ICCAD &amp; ISEDA.`,
      "res.f.all": "All", "res.f.agentic": "Agentic EDA", "res.f.physical": "Physical Design", "res.f.multimodal": "Multimodal", "res.f.hardware": "AI Hardware",
      "pub.abs": "Abstract", "pub.code": "Code",
      "pub.gogotb": "Agentic RTL verification with specification-grounded coverage closure.",
      "pub.diagramnet": "An end-to-end recognition framework and dataset for non-standard system-level diagrams.",
      "pub.lego2": "A unified agentic platform for digital chip design and optimization.",
      "pub.lego": "An LLM skill-based front-end design generation platform.",
      "pub.vineplace": "Compact analog and mixed-signal placement via core-centered vine representation.",
      "pub.powercube": "A formula-in-the-loop framework for cross-stage power map prediction.",
      "pub.gta": "GPU-accelerated track assignment with lightweight lookup table for conflict detection.",
      "pub.quartet": "A 22nm compute-in-memory AI accelerator with heterogeneous tensor engines and off-chip-less dataflow.",
      "badge.bpn": "Best Paper Nomination",
      toastBib: "BibTeX copied",
      "about.eyebrow": "Background", "about.title": "About me",
      "about.lead": `Jincheng Lou is the Founder &amp; CEO of ChipBagel, a serial entrepreneur in AI agents with a background spanning EDA, chip design, chip-level applications (robotics and autonomous driving), and model training.`,
      "about.bio1": "He is a Ph.D. candidate at Peking University's School of Integrated Circuits, advised by Prof. Yibo Lin. He serves on the School's Innovation and Entrepreneurship Committee and formerly served as Deputy Secretary of its Youth League Committee. He is also a Northeastern University alumni mentor and previously served as Vice President of the Peking University Innovation Society.",
      "about.bio2": "He has authored or co-authored papers with Best Paper Nominations at ICCAD and ISEDA. His industry experience includes NPU algorithm design and optimization at a unicorn AI-chip company, and participation in multiple 22nm to 28nm tapeouts. Before ChipBagel, he founded the angel-funded agent-hardware company Takway.AI, which received international media coverage at CES; his earlier robotics work was deployed in the main library at Shanghai Jiao Tong University.",
      "fact.papers": "Papers", "fact.bpn": "Best Paper Nominations", "fact.tapeout": "Multiple tapeouts", "fact.tapeoutSub": "Unicorn AI-chip company", "fact.ventures": "Ventures founded",
      "xp.work": "Ventures & Work", "xp.edu": "Education",
      "xp.now": "Now",
      "xp1.org": "ChipBagel · Founder & CEO", "xp1.note": "Building at the intersection of AI agents, EDA, and chip design.",
      "xp2.org": "Peking University · Ph.D. Candidate", "xp2.note": "Integrated Circuit Science and Engineering · Advisor: Prof. Yibo Lin · Focus: Agentic EDA.",
      "xp3.org": "Takway.AI · Co-founder & CEO", "xp3.note": "LLM-powered interactive hardware. Led hardware, product, fundraising, and recruiting; secured angel investment.",
      "xp4.org": "Peking University · M.Eng.", "xp4.note": "Integrated Circuit Engineering · Advisors: Prof. Yufei Ma and Prof. Le Ye · Hardware-friendly AI algorithms and co-design.",
      "xp5.org": "Shanghai SAGE Intelligent Technology · Robotics Intern", "xp5.note": "Built Gazebo simulation and ROS 1 interfaces for deployed service robots; independently designed a controller board.",
      "xp6.org": "Northeastern University · B.Eng.", "xp6.note": "Automation (A+) · GPA 3.685/5.0, ranked 1/131 · Recommended for postgraduate admission (top 5%).",
      "contact.eyebrow": "Contact", "contact.title": `Let's build<br>what's next.`,
      "contact.note": "Public availability is shown in China Standard Time — only occupied periods are published. On weekdays I am usually at Peking University's Haidian Campus.",
      "contact.elsewhere": "Elsewhere",
      "contact.xhs": `Xiaohongshu<em>@楼锦程</em>`,
      "contact.wechat": `WeChat<em>Nikolas_loujc</em>`, "contact.copy": "Copy", "contact.cv": "PDF · English",
      "foot.email": "Email ↗", "foot.top": "Back to top ↑",
      "map.eyebrow": "Footprints", "map.title": "Where I've been",
      "map.note": `10 countries &amp; regions, 50+ cities across China.<br>Hometown Shanghai · Based in Beijing.`,
      "map.viewWorld": "World", "map.viewChina": "China", "map.viewEurope": "Europe",
      "map.legendHome": "Hometown · Shanghai", "map.legendNow": "Based in Beijing", "map.legendVisited": "Visited",
      "map.all": "All places", "map.europe": "Europe", "map.china": "China",
      mapCluster: (name, n) => `${name} · ${n} cities`,
      "map.home": "hometown", "map.now": "based here",
      "map.aria": "Dot map of places visited: 10 countries and regions, and more than 50 cities in China",
      "map.fallback": "The map could not be drawn in this browser.",
      title: "Jincheng Lou · 楼锦程 — ChipBagel Founder & CEO",
      calDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      calToday: "Today",
      calUpdated: (iso) => `Anonymized update: ${new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
      calWeekLabel: (a, b) => {
        const sameMonth = a.getUTCMonth() === b.getUTCMonth();
        return sameMonth
          ? `${MON_EN[a.getUTCMonth()]} ${a.getUTCDate()} – ${b.getUTCDate()}, ${b.getUTCFullYear()}`
          : `${MON_EN[a.getUTCMonth()]} ${a.getUTCDate()} – ${MON_EN[b.getUTCMonth()]} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
      },
      calWeekTag: (n) => (n === 0 ? "This week" : n === 1 ? "Next week" : n === -1 ? "Last week" : n > 1 ? `In ${n} weeks` : ""),
      calLen: (m) => (m < 60 ? `${m} min` : `${+(m / 60).toFixed(1)} h`),
      calSlotAria: (day, range) => `${day}, ${range} open — choose a start time`,
      calLocal: (time) => `${time} local`,
      calListEmpty: "No openings on this day.",
      calTooShort: "Shorter than the selected duration.",
      calSource: { live: "Live", snapshot: "Snapshot" },
      toastWechat: "WeChat ID copied: Nikolas_loujc",
      toastMail: "Email address copied",
    },
    zh: {
      "nav.avail": "空闲时间", "nav.work": "项目", "nav.research": "论文", "nav.about": "关于", "nav.places": "足迹", "nav.contact": "联系",
      "nav.menu": "菜单", "sheet.wechat": "复制微信号",
      "hero.eyebrow": "ChipBagel · 北京大学",
      "hero.title": `楼锦程<span class="en-sub">JINCHENG LOU</span>`,
      "hero.intro": `<strong>ChipBagel 创始人兼 CEO</strong>，Silicon Intelligence Infra。<br>北京大学集成电路学院博士生，师从林亦波教授。`,
      "int.1": "EDA 智能体基础设施", "int.2": "大电路模型", "int.3": "多模态电路理解", "int.4": "合成数据",
      "hero.cta1": "本周空闲时间", "hero.cta2": "精选项目", "hero.cv": "下载简历 ↗",
      "hero.orbit": "AI AGENT · EDA · 芯片设计", "hero.caption": "ChipBagel / 北京大学",
      "hero.foot1": "AI AGENT × 芯片设计 × 开源", "hero.foot2": "下滑查看本周空闲&nbsp;↓",
      heroLive: (rel, time) => `最近可约：${rel} ${time} 起（北京时间）`,
      relDay: (d, diff) => (diff === 0 ? "今天" : diff === 1 ? "明天" : `${WD_ZH[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`),
      "avail.eyebrow": "空闲时间", "avail.title": "本周日程",
      "avail.note": `时间统一按中国标准时间（UTC+8）显示。<br>仅公开占用时段，日程细节保持私密。`,
      "avail.fail": "日程暂时无法加载，请直接邮件联系我。",
      "avail.stale": "数据可能已过期，请邮件确认",
      "avail.busy": "占用", "avail.free": "空闲可约", "avail.pick": "已选",
      "avail.book": "预约时间",
      "avail.bookNote": "点击日历中的绿色时段即可选定开始时间，也可以在下方选择。我会邮件确认；占用时段的细节保持私密。",
      "avail.loc": "工作日通常在北京大学海淀校区，周末时间不确定。",
      "mf.picked": "已选时段", "mf.none": "本周暂无可约时段",
      "mf.duration": "时长", "mf.min30": "30 分钟", "mf.min60": "60 分钟",
      "mf.date": "日期", "mf.time": "开始时间",
      "mf.namePh": "您的姓名", "mf.emailPh": "回复邮箱", "mf.topicPh": "想聊什么？（可选）",
      "mf.errName": "请填写姓名。", "mf.errEmail": "请填写有效的回复邮箱。",
      "mf.submit": "生成预约邮件", "mf.copy": "复制",
      "mf.note": "这只是预约请求，不会直接占用日程，以我的回复确认为准。邮件没弹出？点「复制」，把整段预约内容粘贴到任意邮箱或微信发给我。",
      "mf.empty": "本周暂无可约时段，试试切换一周。",
      "mf.need": "请填写姓名和回复邮箱。",
      "mf.copied": "预约内容已复制，可粘贴到邮件或微信发送。",
      "mf.copyFail": "自动复制失败，请直接发邮件联系我。",
      "mf.short": "该时段只有 30 分钟，已切换为 30 分钟。",
      mfDate: (d) => `${WD_ZH[d.getUTCDay()]} · ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`,
      mfTime: (range) => `${range} · 北京时间`,
      mfLocal: (l) => `你的当地时间：${l.day} ${l.from}–${l.to} · ${l.tz}`,
      mfSubject: (name) => `预约请求：${name}`,
      mfBody: (f) => [
        "你好 Jincheng：", "",
        "我想预约一次交流。", "",
        `  候选时间：${f.date} ${f.range}（北京时间 UTC+8）`,
        ...(f.local ? [`  我的当地时间：${f.local.day} ${f.local.from}–${f.local.to}（${f.local.tz}）`] : []),
        `  时长：${f.duration} 分钟`,
        `  姓名：${f.name}`,
        `  回复邮箱：${f.email}`,
        `  话题：${f.topic || "—"}`, "",
        "此为预约请求，最终以回复确认为准。", "",
      ].join("\n"),
      mfHeader: (to, subject) => `收件人：${to}\n主题：${subject}`,
      toastPicked: (d, time) => `已选 ${WD_ZH[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()} ${time}，下方填写信息 ↓`,
      "work.eyebrow": "精选工作", "work.title": "精选项目",
      "work.note": `覆盖智能体芯片设计、科研写作、<br>自主科研与 AI 原生学习的开源项目。`,
      "p.lego.tag": "AGENTIC EDA",
      "p.lego.lede": "面向数字芯片前端设计的开源技能化平台。",
      "p.lego.meta": "将 11 个开源 EDA 项目的方法提炼为 42 个可执行、可组合的电路技能。",
      "p.lego.more": "探索这个平台", "p.lego.chip": "可组合智能",
      "p.lego.n1": "规格说明", "p.lego.n2": "可执行技能", "p.lego.n3": "RTL 设计",
      "p.lego.badge": "ISEDA ’26 最佳论文提名",
      "p.aris.tag": "自主科研",
      "p.aris.lede": "跨模型评审的自主机器学习科研系统。",
      "p.aris.meta": "轻量级、纯 Markdown 的系统，覆盖想法发现、实验执行与论文写作。",
      "p.unfold.tag": "AI 原生学习",
      "p.unfold.lede": "AI 驱动的视频智能注释与学习系统。",
      "p.unfold.meta": "自动生成字幕、章节、摘要、关键词、金句与上下文知识卡片。",
      "p.epw.tag": "科研写作",
      "p.epw.lede": "面向 EDA 论文、以证据为锚的写作 skill。",
      "p.epw.meta": "把方法、结果与笔记组织成 challenge → insight → method → evidence 的论证；适用于 Codex 等支持 SKILL.md 的助手。",
      "p.role.author": "作者", "p.role.contrib": "贡献者",
      "res.eyebrow": "科研", "res.title": "论文",
      "res.note": `Agentic EDA、多模态电路理解、物理设计与硬件高效 AI ——<br>8 篇论文，获 ICCAD 与 ISEDA 最佳论文提名。`,
      "res.f.all": "全部", "res.f.agentic": "Agentic EDA", "res.f.physical": "物理设计", "res.f.multimodal": "多模态", "res.f.hardware": "AI 芯片",
      "pub.abs": "摘要", "pub.code": "代码",
      "pub.gogotb": "基于规范锚定的智能体式 RTL 验证与覆盖率收敛。",
      "pub.diagramnet": "面向非标准系统级图表的端到端识别框架与数据集。",
      "pub.lego2": "面向数字芯片设计与优化的统一智能体平台。",
      "pub.lego": "基于 LLM 技能的芯片前端设计生成平台。",
      "pub.vineplace": "以核为中心的藤式表示，实现紧凑的模拟混合信号布局。",
      "pub.powercube": "公式在环的跨阶段功耗图预测框架。",
      "pub.gta": "GPU 加速的布线轨道分配，轻量查表实现冲突检测。",
      "pub.quartet": "22nm 数字存内计算 AI 加速器，异构张量引擎与无片外数据流。",
      "badge.bpn": "最佳论文提名",
      toastBib: "BibTeX 已复制",
      "about.eyebrow": "背景", "about.title": "关于我",
      "about.lead": `楼锦程，ChipBagel 创始人兼 CEO，Agent 领域连续创业者，拥有 EDA、芯片设计、芯片上层应用（机器人/无人驾驶）与模型训练的融合背景。`,
      "about.bio1": "北京大学集成电路学院博士生，师从林亦波教授；现任学院双创委员，曾任团委副书记，同时担任东北大学校友导师，此前曾任北京大学创新学社副会长。",
      "about.bio2": "已发表多篇领域顶级会议论文，获 ICCAD 与 ISEDA 最佳论文提名奖。曾在独角兽 AI 芯片公司负责 NPU 算法设计与优化，多次参与 22nm 至 28nm 工艺流片。曾创办天使轮 Agent 硬件公司 Takway.AI，在 CES 获多国头部媒体报道；此前参与研发的机器人已落地上海交通大学闵行校区图书馆主馆。",
      "fact.papers": "篇论文", "fact.bpn": "次最佳论文提名", "fact.tapeout": "多次参与流片", "fact.tapeoutSub": "独角兽 AI 芯片公司", "fact.ventures": "次创业",
      "xp.work": "创业与工作", "xp.edu": "教育经历",
      "xp.now": "至今",
      "xp1.org": "ChipBagel · 创始人兼 CEO", "xp1.note": "聚焦 AI Agent、EDA 与芯片设计的交叉方向。",
      "xp2.org": "北京大学 · 博士研究生", "xp2.note": "集成电路科学与工程 · 师从林亦波教授 · 研究方向：Agentic EDA。",
      "xp3.org": "Takway.AI · 联合创始人兼 CEO", "xp3.note": "LLM+硬件交互产品。负责硬件、产品、融资与招募，获得天使轮投资。",
      "xp4.org": "北京大学 · 硕士", "xp4.note": "集成电路工程 · 师从马玉飞、叶乐教授 · 硬件友好 AI 算法与软硬件协同。",
      "xp5.org": "上海飒智智能科技 · 机器人实习生", "xp5.note": "搭建 Gazebo 仿真与 ROS 1 接口，独立设计控制器板。",
      "xp6.org": "东北大学 · 本科", "xp6.note": "自动化（A+）· GPA 3.685/5.0，专业排名 1/131 · 推荐免试研究生（前 5%）。",
      "contact.eyebrow": "联系", "contact.title": `一起做点<br>新东西。`,
      "contact.note": "公开时间按中国标准时间显示，仅展示占用时段。工作日通常在北京大学海淀校区。",
      "contact.elsewhere": "其他平台",
      "contact.xhs": `小红书<em>@楼锦程</em>`,
      "contact.wechat": `微信<em>Nikolas_loujc</em>`, "contact.copy": "复制", "contact.cv": "PDF · 英文",
      "foot.email": "邮箱 ↗", "foot.top": "回到顶部 ↑",
      "map.eyebrow": "足迹", "map.title": "去过的地方",
      "map.note": `到访 10 个国家与地区、全国 50 余城。<br>家乡上海 · 现居北京。`,
      "map.viewWorld": "全球", "map.viewChina": "中国", "map.viewEurope": "欧洲",
      "map.legendHome": "家乡 · 上海", "map.legendNow": "现居 · 北京", "map.legendVisited": "到访城市",
      "map.all": "全部城市", "map.europe": "欧洲", "map.china": "中国",
      mapCluster: (name, n) => `${name} · ${n} 城`,
      "map.home": "家乡", "map.now": "现居",
      "map.aria": "足迹点阵地图：到访 10 个国家与地区、全国 50 余座城市",
      "map.fallback": "当前浏览器无法绘制地图。",
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
      calWeekTag: (n) => (n === 0 ? "本周" : n === 1 ? "下周" : n === -1 ? "上周" : n > 1 ? `${n} 周后` : ""),
      calLen: (m) => (m < 60 ? `${m} 分钟` : `${+(m / 60).toFixed(1)} 小时`),
      calSlotAria: (day, range) => `${day} ${range} 空闲，点击选择开始时间`,
      calLocal: (time) => `本地 ${time}`,
      calListEmpty: "这天没有可约时段。",
      calTooShort: "不足所选时长。",
      calSource: { live: "实时", snapshot: "快照" },
      toastWechat: "微信号已复制：Nikolas_loujc",
      toastMail: "邮箱地址已复制",
    },
  };

  let lang = localStorage.getItem("lang") ?? (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
  const t = () => I18N[lang];
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
    for (const el of $$("[data-i18n-ph]")) {
      const value = I18N[lang][el.dataset.i18nPh];
      if (typeof value === "string") el.setAttribute("placeholder", value);
    }
    for (const el of $$("[data-i18n-aria]")) {
      const value = I18N[lang][el.dataset.i18nAria];
      if (typeof value === "string") el.setAttribute("aria-label", value);
    }
    renderCalendar();
    dotMap?.refresh();
  };
  langBtn.addEventListener("click", () => applyLang(lang === "en" ? "zh" : "en"));

  /* ——— toast & clipboard ——— */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };
  // clipboard API first, execCommand as the fallback for in-app browsers (e.g. WeChat)
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      return ok;
    } catch {
      return false;
    }
  };
  $$("[data-copy-wechat]").forEach((btn) => btn.addEventListener("click", async () => {
    showToast((await copyText(WECHAT_ID)) ? t().toastWechat : WECHAT_ID);
  }));
  $$("[data-copy-mail]").forEach((btn) => btn.addEventListener("click", async () => {
    showToast((await copyText(EMAIL)) ? t().toastMail : EMAIL);
  }));

  /* ——— header: scroll state, scroll-spy, mobile sheet ——— */
  const head = $(".site-head");
  const sheet = $("#sheet");
  const menuBtn = $("#menu-toggle");
  const setSheet = (open) => {
    head.classList.toggle("is-open", open);
    sheet.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    root.classList.toggle("sheet-open", open);
  };
  menuBtn.addEventListener("click", () => setSheet(sheet.hidden));
  sheet.addEventListener("click", (event) => {
    if (event.target.closest("a")) setSheet(false);
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sheet.hidden) {
      setSheet(false);
      menuBtn.focus();
    }
  });
  matchMedia("(min-width: 921px)").addEventListener("change", (event) => {
    if (event.matches) setSheet(false);
  });

  const spyLinks = $$(".head-nav a");
  const spyTargets = spyLinks.map((a) => $(a.getAttribute("href")));
  const spy = () => {
    const probe = scrollY + innerHeight * 0.3;
    let current = -1;
    spyTargets.forEach((section, i) => {
      if (section && section.getBoundingClientRect().top + scrollY <= probe) current = i;
    });
    if (current >= 0 && innerHeight + scrollY >= root.scrollHeight - 2) current = spyTargets.length - 1;
    spyLinks.forEach((a, i) => (i === current ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current")));
  };
  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      head.classList.toggle("scrolled", scrollY > 8);
      spy();
      scrollQueued = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ——— availability calendar ——— */
  const LIVE_URL = "https://loujc.github.io/availability/busy.json";
  const SNAPSHOT_URL = "availability-snapshot.json";
  const STEP = 30;            // booking granularity, minutes
  const NOTICE_MINUTES = 120; // a request needs at least two hours of lead time
  const cal = {
    data: null, source: null, failed: false,
    weekIndex: 0, weekCount: 0, weekStart: null,
    dayStart: 480, span: 960,
    busyByKey: new Map(), days: [], bookable: [],
    memory: new Map(), listDay: null, next: null, now: null,
  };
  const pick = { key: null, start: null };
  const mfState = { duration: 30 };

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
  const weekIndexOf = (key) => Math.round((dateFromKey(mondayOfKey(key)) - dateFromKey(cal.data.window_start)) / 6048e5);

  // visitor time zone: only surfaced when it differs from China time
  const VISITOR_TZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
  })();
  const shanghaiToDate = (key, minutes) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, minutes - 480));
  };
  const isChinaTime = (date) => date.getTimezoneOffset() === -480;
  const fmtLocal = (date, opts) => new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", opts).format(date);
  const CLOCK = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
  const localClock = (key, minutes) => {
    const date = shanghaiToDate(key, minutes);
    return isChinaTime(date) ? null : fmtLocal(date, CLOCK);
  };
  const localRange = (key, start, duration) => {
    const a = shanghaiToDate(key, start);
    if (isChinaTime(a)) return null;
    return {
      day: fmtLocal(a, { weekday: "short", month: "short", day: "numeric" }),
      from: fmtLocal(a, CLOCK),
      to: fmtLocal(shanghaiToDate(key, start + duration), CLOCK),
      tz: VISITOR_TZ.replace(/_/g, " "),
    };
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
  const fmtMinutes = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const alignUp = (m) => Math.ceil(m / STEP) * STEP;
  const pctTop = (m) => `${((m - cal.dayStart) / cal.span) * 100}%`;
  const pctLen = (a, b) => `${((b - a) / cal.span) * 100}%`;
  const isStale = () => !!cal.data
    && Date.now() - Date.parse(cal.data.generated_at) > (cal.data.stale_after_hours ?? 6) * 3600e3;

  const indexBusy = () => {
    cal.busyByKey = new Map();
    for (const interval of cal.data.busy) {
      const start = shanghaiParts(new Date(interval.start));
      const end = shanghaiParts(new Date(interval.end));
      let endMinutes = end.minutes;
      if (end.key !== start.key) {
        // intervals end at most at the next midnight; fold back into the start day
        if (end.key === addDaysKey(start.key, 1) && end.minutes === 0) endMinutes = 1440;
        else continue;
      }
      const list = cal.busyByKey.get(start.key) ?? [];
      list.push({ start: start.minutes, end: endMinutes });
      cal.busyByKey.set(start.key, list);
    }
    for (const list of cal.busyByKey.values()) list.sort((a, b) => a.start - b.start);
  };

  // free = display window minus busy; anything before now + notice counts as expired
  const freeRanges = (key, now) => {
    const dayEnd = cal.dayStart + cal.span;
    const cutoff = alignUp(now.minutes + NOTICE_MINUTES);
    const raw = [];
    let cursor = cal.dayStart;
    for (const b of cal.busyByKey.get(key) ?? []) {
      if (cursor < b.start) raw.push({ start: cursor, end: Math.min(b.start, dayEnd) });
      cursor = Math.max(cursor, b.end);
    }
    if (cursor < dayEnd) raw.push({ start: cursor, end: dayEnd });
    const out = [];
    for (const f of raw) {
      if (f.end <= f.start) continue;
      if (key < now.key) out.push({ ...f, expired: true });
      else if (key === now.key && f.start < cutoff) {
        if (f.end <= cutoff) out.push({ ...f, expired: true });
        else {
          out.push({ start: f.start, end: cutoff, expired: true });
          out.push({ start: cutoff, end: f.end, expired: false });
        }
      } else out.push({ ...f, expired: false });
    }
    return out.filter((f) => f.expired || f.end - alignUp(f.start) >= STEP);
  };
  const startsIn = (ranges, duration) => {
    const out = [];
    for (const f of ranges) for (let m = alignUp(f.start); m + duration <= f.end; m += STEP) out.push(m);
    return out;
  };
  const nextOpening = () => {
    const now = shanghaiParts(new Date());
    const { window_start, window_end } = cal.data;
    let key = now.key < window_start ? window_start : now.key;
    for (let i = 0; i < 70 && key < window_end; i++, key = addDaysKey(key, 1)) {
      const open = freeRanges(key, now).find((f) => !f.expired);
      if (open) return { key, start: alignUp(open.start) };
    }
    return null;
  };

  // keep the visitor's pick valid for the shown week; otherwise fall back to the earliest opening
  const ensurePick = () => {
    const startsOf = (key) => {
      const day = cal.bookable.find((d) => d.key === key);
      return day ? startsIn(day.slots, mfState.duration) : [];
    };
    const same = startsOf(pick.key);
    if (same.includes(pick.start)) return;
    if (same.length) {
      pick.start = same.reduce((best, m) => (Math.abs(m - pick.start) < Math.abs(best - pick.start) ? m : best));
      return;
    }
    for (const day of cal.bookable) {
      const starts = startsIn(day.slots, mfState.duration);
      if (starts.length) {
        pick.key = day.key;
        pick.start = starts[0];
        return;
      }
    }
    pick.key = pick.start = null;
  };

  const calGuide = document.createElement("i");
  calGuide.className = "cal-guide";
  calGuide.hidden = true;
  const guideTime = document.createElement("b");
  guideTime.className = "cal-guide-time";
  calGuide.append(guideTime);
  const ghost = document.createElement("i");
  ghost.className = "cal-ghost";

  const renderCalendar = () => {
    const grid = $("#cal-grid");
    const list = $("#cal-list");
    const scroll = $(".cal-scroll");
    const fail = $("#cal-fail");
    const toolbar = $("#cal-toolbar");
    const foot = $(".cal-foot");
    if (!cal.data && !cal.failed) return; // still loading
    if (cal.failed || !cal.data) {
      fail.hidden = false;
      toolbar.hidden = scroll.hidden = list.hidden = foot.hidden = true;
      cal.bookable = [];
      mfPopulate();
      updatePickUI();
      updateHeroLive();
      return;
    }
    fail.hidden = true;
    toolbar.hidden = scroll.hidden = list.hidden = foot.hidden = false;

    const T = t();
    const { display_hours, generated_at, window_start, window_end } = cal.data;
    cal.dayStart = clockMinutes(display_hours.start);
    cal.span = clockMinutes(display_hours.end) - cal.dayStart;
    $("#cal-stale").hidden = !isStale();
    const badge = $("#cal-source");
    badge.hidden = false;
    badge.className = `cal-badge is-${cal.source}`;
    badge.textContent = T.calSource[cal.source];

    const now = shanghaiParts(new Date());
    cal.now = now;
    const totalWeeks = Math.round((dateFromKey(window_end) - dateFromKey(window_start)) / 6048e5);
    cal.weekCount = totalWeeks;
    const currentIndex = weekIndexOf(now.key);
    if (!renderCalendar.initialized) {
      cal.weekIndex = Math.min(Math.max(currentIndex, 0), totalWeeks - 1);
      renderCalendar.initialized = true;
    }
    cal.weekIndex = Math.min(Math.max(cal.weekIndex, 0), totalWeeks - 1);
    const weekStart = addDaysKey(window_start, cal.weekIndex * 7);
    if (weekStart !== cal.weekStart) {
      const saved = cal.memory.get(weekStart);
      if (saved) Object.assign(pick, saved);
      cal.weekStart = weekStart;
    }
    const weekEnd = addDaysKey(weekStart, 6);
    $("#cal-week-label").textContent = T.calWeekLabel(dateFromKey(weekStart), dateFromKey(weekEnd));
    $("#cal-week-tag").textContent = T.calWeekTag(cal.weekIndex - currentIndex);
    $("#cal-prev").disabled = cal.weekIndex <= 0;
    $("#cal-next").disabled = cal.weekIndex >= totalWeeks - 1;

    cal.days = [];
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(weekStart, i);
      cal.days.push({ key, i, busy: cal.busyByKey.get(key) ?? [], free: freeRanges(key, now) });
    }
    cal.bookable = cal.days
      .map((d) => ({ key: d.key, slots: d.free.filter((f) => !f.expired) }))
      .filter((d) => d.slots.length);
    ensurePick();

    grid.replaceChildren();

    // time axis
    const axis = document.createElement("div");
    axis.className = "cal-axis";
    axis.setAttribute("aria-hidden", "true");
    const axisHead = document.createElement("div");
    axisHead.className = "cal-day-head";
    const axisTrack = document.createElement("div");
    axisTrack.className = "cal-axis-track";
    axis.append(axisHead, axisTrack);
    grid.append(axis);

    const dayEnd = cal.dayStart + cal.span;
    for (const d of cal.days) {
      const date = dateFromKey(d.key);
      const day = document.createElement("div");
      day.className = "cal-day";
      day.dataset.day = d.key;
      if (d.key === now.key) day.classList.add("today");
      if (d.key < now.key) day.classList.add("past");

      const head = document.createElement("div");
      head.className = "cal-day-head";
      const dow = document.createElement("span");
      dow.className = "cal-dow";
      dow.textContent = T.calDays[d.i];
      const num = document.createElement("span");
      num.className = "cal-date";
      num.textContent = String(date.getUTCDate());
      if (d.key === now.key) num.title = T.calToday;
      head.append(dow, num);

      const track = document.createElement("div");
      track.className = "cal-track";
      track.style.setProperty("--rows", String(cal.span / 60));
      for (const b of d.busy) {
        const start = Math.max(b.start, cal.dayStart);
        const end = Math.min(b.end, dayEnd);
        if (end <= start) continue;
        const el = document.createElement("i");
        el.className = "cal-block busy";
        el.style.top = pctTop(start);
        el.style.height = pctLen(start, end);
        track.append(el);
      }
      for (const f of d.free) {
        if (f.expired) continue;
        const start = alignUp(f.start);
        const el = document.createElement("button");
        el.type = "button";
        el.className = "cal-block free";
        el.dataset.day = d.key;
        el.dataset.start = String(start);
        el.dataset.end = String(f.end);
        el.style.top = pctTop(start);
        el.style.height = pctLen(start, f.end);
        el.setAttribute("aria-label", T.calSlotAria(T.mfDate(date), `${fmtMinutes(start)}–${fmtMinutes(f.end)}`));
        if (f.end - start >= 60) {
          const label = document.createElement("b");
          label.className = "cal-slot";
          label.innerHTML = `<span>${fmtMinutes(start)}</span><i>–</i><span>${fmtMinutes(f.end)}</span>`;
          el.append(label);
        }
        track.append(el);
      }
      if (d.key === now.key && now.minutes >= cal.dayStart && now.minutes <= dayEnd) {
        const line = document.createElement("i");
        line.className = "cal-now";
        line.style.top = pctTop(now.minutes);
        track.append(line);
      }
      day.append(head, track);
      grid.append(day);
    }

    // axis ticks: every hour when the stretched track has room, every two hours when tight
    const stepH = axisTrack.clientHeight >= 460 ? 1 : 2;
    for (let h = Math.ceil(cal.dayStart / 60); h * 60 <= dayEnd; h += stepH) {
      const label = document.createElement("span");
      label.textContent = `${String(h).padStart(2, "0")}:00`;
      label.dataset.minutes = String(h * 60);
      label.style.top = pctTop(h * 60);
      if (h * 60 === dayEnd) label.style.transform = "translateY(-100%)";
      axisTrack.append(label);
    }
    grid.append(calGuide);

    $("#cal-updated").textContent = T.calUpdated(generated_at);
    renderList();
    mfPopulate();
    updatePickUI();
    updateHeroLive();
  };

  const goWeek = (delta) => {
    if (cal.weekStart) cal.memory.set(cal.weekStart, { ...pick });
    cal.weekIndex += delta;
    renderCalendar();
  };
  $("#cal-prev").addEventListener("click", () => goWeek(-1));
  $("#cal-next").addEventListener("click", () => goWeek(1));
  loadAvailability().then(() => {
    if (cal.data) indexBusy();
    renderCalendar();
  });
  // keep "now", expiry and the hero line honest while the page stays open
  setInterval(() => { if (cal.data && !document.hidden) renderCalendar(); }, 5 * 60e3);
  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (cal.data) renderCalendar(); }, 200);
  });

  // pick on the grid: the slot starts at the half hour under the pointer, clamped into the open block
  const gridEl = $("#cal-grid");
  const minuteAt = (track, clientY) => {
    const rect = track.getBoundingClientRect();
    return cal.dayStart + ((clientY - rect.top) / rect.height) * cal.span;
  };
  const fitStart = (start, end, minute, duration) => {
    const first = alignUp(start);
    const last = end - duration;
    if (last < first) return null;
    const snapped = Math.floor(minute / STEP) * STEP;
    return Math.min(Math.max(snapped, first), first + Math.floor((last - first) / STEP) * STEP);
  };
  gridEl.addEventListener("click", (event) => {
    const block = event.target.closest(".cal-block.free");
    if (!block) return;
    const start = Number(block.dataset.start);
    const end = Number(block.dataset.end);
    const minute = event.detail === 0 ? start : minuteAt(block.parentElement, event.clientY);
    let at = fitStart(start, end, minute, mfState.duration);
    if (at == null) {
      if (mfState.duration <= STEP || fitStart(start, end, minute, STEP) == null) return;
      setDuration(STEP);
      showToast(t()["mf.short"]);
      at = fitStart(start, end, minute, STEP);
    }
    pick.key = block.dataset.day;
    pick.start = at;
    cal.listDay = pick.key;
    ghost.remove();
    renderList();
    updatePickUI();
  });

  // hover guide: dashed line mapping the pointer to the time axis, plus a preview of the slot a click would pick
  const scrollBox = $(".cal-scroll");
  let hotLabel = null;
  const clearHot = () => {
    if (hotLabel) {
      hotLabel.classList.remove("is-hot");
      hotLabel = null;
    }
  };
  const hideGuide = () => {
    calGuide.hidden = true;
    ghost.remove();
    clearHot();
  };
  scrollBox.addEventListener("mousemove", (event) => {
    const track = gridEl.querySelector(".cal-track");
    if (!track || !cal.data) return hideGuide();
    const trackRect = track.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    const y = event.clientY - trackRect.top;
    if (y < -10 || y > trackRect.height + 10 || event.clientX < gridRect.left || event.clientX > gridRect.right) {
      return hideGuide();
    }
    const raw = cal.dayStart + (Math.min(Math.max(y, 0), trackRect.height) / trackRect.height) * cal.span;
    const block = event.target.closest?.(".cal-block.free");
    const blockStart = Number(block?.dataset.start);
    const blockEnd = Number(block?.dataset.end);
    const duration = block && fitStart(blockStart, blockEnd, raw, mfState.duration) != null ? mfState.duration : STEP;
    const at = block ? fitStart(blockStart, blockEnd, raw, duration) : null;
    const snapped = at ?? Math.min(Math.max(Math.round(raw / 30) * 30, cal.dayStart), cal.dayStart + cal.span);
    calGuide.hidden = false;
    calGuide.style.top = `${trackRect.top - gridRect.top + ((snapped - cal.dayStart) / cal.span) * trackRect.height}px`;
    guideTime.textContent = fmtMinutes(snapped);
    const local = cal.weekStart && localClock(cal.weekStart, snapped);
    if (local) {
      const small = document.createElement("small");
      small.textContent = t().calLocal(local);
      guideTime.append(small);
    }
    let best = null;
    let bestDist = Infinity;
    for (const label of gridEl.querySelectorAll(".cal-axis-track span")) {
      const dist = Math.abs(Number(label.dataset.minutes) - snapped);
      if (dist < bestDist) {
        bestDist = dist;
        best = label;
      }
    }
    if (hotLabel !== best) {
      clearHot();
      best?.classList.add("is-hot");
      hotLabel = best;
    }

    if (at == null) return ghost.remove();
    const isPicked = block.dataset.day === pick.key && at === pick.start && duration === mfState.duration;
    if (isPicked) return ghost.remove();
    ghost.style.top = pctTop(at);
    ghost.style.height = pctLen(at, at + duration);
    if (ghost.parentElement !== block.parentElement) block.parentElement.append(ghost);
  });
  scrollBox.addEventListener("mouseleave", hideGuide);

  // phones: day tabs + start-time chips instead of a 7-column grid
  const listEl = $("#cal-list");
  const renderList = () => {
    if (!cal.days.length) {
      listEl.replaceChildren();
      return;
    }
    const T = t();
    if (!cal.days.some((d) => d.key === cal.listDay)) cal.listDay = pick.key ?? cal.bookable[0]?.key ?? cal.days[0].key;
    const tabs = document.createElement("div");
    tabs.className = "cl-days";
    for (const d of cal.days) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.dataset.day = d.key;
      tab.setAttribute("aria-pressed", String(d.key === cal.listDay));
      tab.classList.toggle("open", d.free.some((f) => !f.expired));
      tab.classList.toggle("today", d.key === cal.now?.key);
      tab.innerHTML = `<span>${T.calDays[d.i]}</span><b>${dateFromKey(d.key).getUTCDate()}</b><i></i>`;
      tabs.append(tab);
    }
    const panel = document.createElement("div");
    panel.className = "cl-slots";
    const day = cal.days.find((d) => d.key === cal.listDay);
    const open = day.free.filter((f) => !f.expired);
    if (!open.length) {
      const note = document.createElement("p");
      note.className = "cl-note";
      note.textContent = T.calListEmpty;
      panel.append(note);
    }
    for (const f of open) {
      const start = alignUp(f.start);
      const group = document.createElement("div");
      const rangeHead = document.createElement("p");
      rangeHead.className = "cl-range-head";
      rangeHead.innerHTML = `<b>${fmtMinutes(start)} – ${fmtMinutes(f.end)}</b><span>${T.calLen(f.end - start)}</span>`;
      group.append(rangeHead);
      const starts = startsIn([f], mfState.duration);
      if (!starts.length) {
        const note = document.createElement("p");
        note.className = "cl-note";
        note.textContent = T.calTooShort;
        group.append(note);
      } else {
        const chips = document.createElement("div");
        chips.className = "cl-chips";
        for (const m of starts) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.dataset.day = day.key;
          chip.dataset.start = String(m);
          chip.textContent = fmtMinutes(m);
          chip.setAttribute("aria-pressed", String(day.key === pick.key && m === pick.start));
          chips.append(chip);
        }
        group.append(chips);
      }
      panel.append(group);
    }
    listEl.replaceChildren(tabs, panel);
  };
  listEl.addEventListener("click", (event) => {
    const tab = event.target.closest(".cl-days button");
    if (tab) {
      cal.listDay = tab.dataset.day;
      renderList();
      return;
    }
    const chip = event.target.closest(".cl-chips button");
    if (!chip) return;
    pick.key = chip.dataset.day;
    pick.start = Number(chip.dataset.start);
    updatePickUI();
    const T = t();
    showToast(T.toastPicked(dateFromKey(pick.key), fmtMinutes(pick.start)));
  });

  /* ——— quick request form ——— */
  const mfDateSel = $("#mf-date");
  const mfTimeSel = $("#mf-time");
  const mfSubmit = $("#mf-submit");
  const mfCopy = $("#mf-copy");

  function mfPopulate() {
    const T = t();
    const bookable = cal.bookable ?? [];
    $("#mf-empty").hidden = !(cal.data && !bookable.length);
    mfDateSel.replaceChildren(...bookable.map((d) => new Option(T.mfDate(dateFromKey(d.key)), d.key)));
    const disabled = !bookable.length;
    mfDateSel.disabled = mfTimeSel.disabled = mfSubmit.disabled = mfCopy.disabled = disabled;
    syncSelects();
  }
  function syncSelects() {
    if (pick.key && [...mfDateSel.options].some((o) => o.value === pick.key)) mfDateSel.value = pick.key;
    const day = (cal.bookable ?? []).find((d) => d.key === mfDateSel.value);
    const starts = day ? startsIn(day.slots, mfState.duration) : [];
    mfTimeSel.replaceChildren(...starts.map((m) => new Option(`${fmtMinutes(m)} – ${fmtMinutes(m + mfState.duration)}`, String(m))));
    if (pick.start != null) mfTimeSel.value = String(pick.start);
  }
  function updatePickUI() {
    const T = t();
    $$("#cal-grid .cal-pick").forEach((el) => el.remove());
    // the pick covers the top of its block, where the range label sits
    for (const block of $$("#cal-grid .cal-block.free")) {
      const start = Number(block.dataset.start);
      block.classList.toggle("has-pick", block.dataset.day === pick.key && pick.start >= start && pick.start < start + 60);
    }
    if (pick.key) {
      const track = $(`#cal-grid .cal-day[data-day="${pick.key}"] .cal-track`);
      if (track) {
        const el = document.createElement("i");
        el.className = "cal-pick";
        el.style.top = pctTop(pick.start);
        el.style.height = pctLen(pick.start, pick.start + mfState.duration);
        el.textContent = `${fmtMinutes(pick.start)}–${fmtMinutes(pick.start + mfState.duration)}`;
        track.append(el);
      }
    }
    for (const chip of $$("#cal-list .cl-chips button")) {
      chip.setAttribute("aria-pressed", String(chip.dataset.day === pick.key && Number(chip.dataset.start) === pick.start));
    }
    syncSelects();
    const dayEl = $("#pick-day");
    const timeEl = $("#pick-time");
    const localEl = $("#pick-local");
    if (!pick.key) {
      dayEl.textContent = cal.data ? T["mf.none"] : "—";
      timeEl.textContent = "";
      localEl.hidden = true;
      return;
    }
    dayEl.textContent = T.mfDate(dateFromKey(pick.key));
    timeEl.textContent = T.mfTime(`${fmtMinutes(pick.start)} – ${fmtMinutes(pick.start + mfState.duration)}`);
    const local = localRange(pick.key, pick.start, mfState.duration);
    localEl.hidden = !local;
    if (local) localEl.textContent = T.mfLocal(local);
  }
  const setDuration = (min) => {
    mfState.duration = min;
    $$("#mf-duration button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.min) === min)));
    ensurePick();
    renderList();
    updatePickUI();
  };
  $$("#mf-duration button").forEach((btn) => btn.addEventListener("click", () => setDuration(Number(btn.dataset.min))));
  mfDateSel.addEventListener("change", () => {
    const day = cal.bookable.find((d) => d.key === mfDateSel.value);
    const starts = day ? startsIn(day.slots, mfState.duration) : [];
    if (!starts.length) return;
    pick.key = day.key;
    pick.start = starts[0];
    cal.listDay = day.key;
    renderList();
    updatePickUI();
  });
  mfTimeSel.addEventListener("change", () => {
    pick.start = Number(mfTimeSel.value);
    updatePickUI();
  });

  const fields = { name: $("#mf-name"), email: $("#mf-email") };
  const setInvalid = (input, bad) => {
    input.setAttribute("aria-invalid", String(bad));
    $(`#${input.id}-err`).hidden = !bad;
  };
  for (const input of Object.values(fields)) {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") setInvalid(input, false);
    });
  }
  const validate = () => {
    const okName = fields.name.value.trim().length > 0;
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim());
    setInvalid(fields.name, !okName);
    setInvalid(fields.email, !okEmail);
    if (!okName) fields.name.focus();
    else if (!okEmail) fields.email.focus();
    if (!okName || !okEmail) showToast(t()["mf.need"]);
    return okName && okEmail;
  };
  const draft = () => {
    const T = t();
    const name = fields.name.value.trim();
    return {
      subject: T.mfSubject(name),
      body: T.mfBody({
        date: T.mfDate(dateFromKey(pick.key)),
        range: `${fmtMinutes(pick.start)}–${fmtMinutes(pick.start + mfState.duration)}`,
        duration: mfState.duration,
        name,
        email: fields.email.value.trim(),
        topic: $("#mf-topic").value.trim(),
        local: localRange(pick.key, pick.start, mfState.duration),
      }),
    };
  };
  $("#meet-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pick.key || !validate()) return;
    const { subject, body } = draft();
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  mfCopy.addEventListener("click", async () => {
    if (!pick.key || !validate()) return;
    const T = t();
    const { subject, body } = draft();
    const ok = await copyText(`${T.mfHeader(EMAIL, subject)}\n\n${body}`);
    showToast(ok ? T["mf.copied"] : T["mf.copyFail"]);
  });

  /* ——— hero: live "next opening" line ——— */
  const updateHeroLive = () => {
    const live = $("#hero-live");
    cal.next = cal.data && !isStale() ? nextOpening() : null;
    live.hidden = !cal.next;
    $("#hero-static").hidden = !!cal.next;
    if (!cal.next) return;
    const diff = Math.round((dateFromKey(cal.next.key) - dateFromKey(shanghaiParts(new Date()).key)) / 864e5);
    const T = t();
    $("#hero-live-text").textContent = T.heroLive(T.relDay(dateFromKey(cal.next.key), diff), fmtMinutes(cal.next.start));
  };
  $("#hero-live").addEventListener("click", () => {
    const next = cal.next;
    if (!next) return;
    const index = weekIndexOf(next.key);
    if (cal.weekStart) cal.memory.set(cal.weekStart, { ...pick });
    cal.memory.set(addDaysKey(cal.data.window_start, index * 7), { key: next.key, start: next.start });
    cal.weekIndex = index;
    pick.key = next.key;
    pick.start = next.start;
    cal.listDay = next.key;
    renderCalendar();
  });

  /* ——— publications: topic filter, abstracts, BibTeX ——— */
  const BIB = {
    gogotb: `@misc{xin2026gogotb,
  title         = {{GoGoTB}: Agentic {RTL} Verification with Specification-Grounded Coverage Closure},
  author        = {Xin, Xin and Lou, Jincheng and Li, Junhui and Yan, Jinglin and Xiao, Panda and Wu, Di and Li, Haixiao and Lu, Weicong and Fan, Weijian and Qu, Xinyu and Zhao, Yuxiang and Yu, Min and Di, Zhixiong and Lin, Yibo},
  year          = {2026},
  eprint        = {2607.26181},
  archivePrefix = {arXiv}
}`,
    diagramnet: `@misc{lou2026diagramnet,
  title         = {{DiagramNet}: An End-to-End Recognition Framework and Dataset for Non-Standard System-Level Diagrams},
  author        = {Lou, Jincheng and Xu, Ruohan and Li, Jiapeng and Pi, Junyin and Tao, Runzhe and Fan, Weijian and Tan, Xiao and Luo, Guojie and Lin, Yibo},
  year          = {2026},
  eprint        = {2605.01338},
  archivePrefix = {arXiv}
}`,
    lego2: `@inproceedings{lou2026lego2,
  title     = {{LEGO} 2.0: A Unified Agentic Platform for Digital Chip Design and Optimization},
  author    = {Lou, Jincheng and Xu, Ruohan and Ma, Jiecheng and Wu, Boyang and Ji, Yuhao and Zhao, Chunyuan and Qu, Xinyu and Zhao, Yuxiang and Tao, Runzhe and Yu, Bei and Di, Zhixiong and Lin, Yibo},
  booktitle = {IEEE/ACM International Conference on Computer-Aided Design (ICCAD)},
  year      = {2026}
}`,
    lego: `@inproceedings{lou2026lego,
  title     = {LEGO: An LLM Skill-Based Front-End Design Generation Platform},
  author    = {Lou, Jincheng and Xu, Ruohan and Ma, Jiecheng and Tao, Runzhe and Qu, Xinyu and Lin, Yibo},
  booktitle = {International Symposium of Electronics Design Automation (ISEDA)},
  year      = {2026}
}`,
    vineplace: `@inproceedings{fan2026vineplace,
  title     = {{VinePlace}: Compact Analog and Mixed-Signal Placement via Core-Centered Vine Representation},
  author    = {Fan, Weijian and Zhao, Zhiyuan and Wang, Jinpeng and Zhang, Haoyi and Lou, Jincheng and Wang, Runsheng and Tang, Xiyuan and Lin, Yibo},
  booktitle = {IEEE/ACM International Conference on Computer-Aided Design (ICCAD)},
  year      = {2026}
}`,
    powercube: `@inproceedings{zhao2026powercube,
  title     = {PowerCube: A Formula-in-the-Loop Framework for Cross-Stage Power Map Prediction},
  author    = {Zhao, Yuxiang and Mai, Jing and Li, Zishu and Zhang, Haoyi and Lou, Jincheng and He, Qing and Wang, Runsheng and Lin, Yibo},
  booktitle = {International Symposium of Electronics Design Automation (ISEDA)},
  year      = {2026}
}`,
    gta: `@inproceedings{zhao2025gta,
  title     = {{GTA}: {GPU}-Accelerated Track Assignment with Lightweight Lookup Table for Conflict Detection},
  author    = {Zhao, Chunyuan and Wang, Jiarui and Jiang, Xun and Lou, Jincheng and Lin, Yibo},
  booktitle = {IEEE/ACM International Conference on Computer-Aided Design (ICCAD)},
  year      = {2025},
  doi       = {10.1109/ICCAD66269.2025.11240694}
}`,
    quartet: `@inproceedings{qiu2024quartet,
  title     = {Quartet: A 22nm 0.09mJ/Inference Digital Compute-in-Memory Versatile AI Accelerator with Heterogeneous Tensor Engines and Off-Chip-Less Dataflow},
  author    = {Qiu, Yikan and Ma, Yufei and Wu, Meng and Jia, Yifan and Qu, Xinyu and Zhou, Zecheng and Lou, Jincheng and Jia, Tianyu and Ye, Le and Huang, Ru},
  booktitle = {IEEE Custom Integrated Circuits Conference (CICC)},
  year      = {2024},
  doi       = {10.1109/CICC60959.2024.10529063}
}`,
  };
  const pubFilters = $$(".pub-filters button");
  const filterPubs = (topic) => {
    pubFilters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.topic === topic)));
    for (const group of $$(".pgroup")) {
      let first = true;
      for (const pub of group.querySelectorAll(".pub")) {
        const show = topic === "all" || pub.dataset.topic === topic;
        pub.hidden = !show;
        pub.classList.toggle("is-first", show && first);
        if (show) first = false;
      }
      group.hidden = first;
    }
  };
  pubFilters.forEach((btn) => btn.addEventListener("click", () => filterPubs(btn.dataset.topic)));
  $$(".pact[data-abs]").forEach((btn) => btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    $(`#${btn.getAttribute("aria-controls")}`).hidden = !open;
  }));
  $$(".pact[data-bib]").forEach((btn) => btn.addEventListener("click", async () => {
    const text = BIB[btn.dataset.bib];
    showToast((await copyText(text)) ? t().toastBib : text.split("\n")[0]);
  }));

  /* ——— projects: role + GitHub stars (baked fallback, refreshed when in view) ——— */
  const fmtStars = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));
  const paintStars = (el, n) => { el.textContent = n >= 20 ? `★ ${fmtStars(n)}` : ""; };
  const starEls = $$(".stars[data-repo]");
  for (const el of starEls) {
    let n = Number(el.dataset.fallback) || 0;
    try {
      const cached = JSON.parse(localStorage.getItem(`gh-stars:${el.dataset.repo}`) ?? "null");
      if (cached) n = cached.n;
    } catch {}
    paintStars(el, n);
  }
  const refreshStars = () => {
    for (const el of starEls) {
      const cacheKey = `gh-stars:${el.dataset.repo}`;
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
        if (cached && Date.now() - cached.t < 12 * 3600e3) continue;
      } catch {}
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 6000);
      fetch(`https://api.github.com/repos/${el.dataset.repo}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((repo) => {
          if (typeof repo?.stargazers_count !== "number") return;
          paintStars(el, repo.stargazers_count);
          localStorage.setItem(cacheKey, JSON.stringify({ n: repo.stargazers_count, t: Date.now() }));
        })
        .catch(() => {});
    }
  };

  /* ——— footprints: dot-matrix map (no tiles, no borders, no third-party requests) ——— */
  // region: list grouping · area: the view that shows the place best
  const PLACES = [
    { zh: "汉诺威", en: "Hannover", lat: 52.376, lon: 9.732, region: "abroad", area: "europe" },
    { zh: "法兰克福", en: "Frankfurt", lat: 50.111, lon: 8.682, region: "abroad", area: "europe" },
    { zh: "巴黎", en: "Paris", lat: 48.857, lon: 2.352, region: "abroad", area: "europe" },
    { zh: "阿姆斯特丹", en: "Amsterdam", lat: 52.368, lon: 4.904, region: "abroad", area: "europe" },
    { zh: "卢森堡", en: "Luxembourg", lat: 49.612, lon: 6.132, region: "abroad", area: "europe" },
    { zh: "布鲁塞尔", en: "Brussels", lat: 50.850, lon: 4.352, region: "abroad", area: "europe" },
    { zh: "新加坡", en: "Singapore", lat: 1.352, lon: 103.820, region: "abroad", area: "world" },
    { zh: "首尔", en: "Seoul", lat: 37.567, lon: 126.978, region: "abroad", area: "world" },
    { zh: "香港", en: "Hong Kong", lat: 22.319, lon: 114.169, region: "abroad" },
    { zh: "澳门", en: "Macau", lat: 22.199, lon: 113.544, region: "abroad" },
    { zh: "上海", en: "Shanghai", lat: 31.230, lon: 121.474, kind: "home", region: "east" },
    { zh: "北京", en: "Beijing", lat: 39.904, lon: 116.407, kind: "now", region: "north" },
    { zh: "天津", en: "Tianjin", lat: 39.343, lon: 117.362, region: "north" },
    { zh: "保定", en: "Baoding", lat: 38.874, lon: 115.465, region: "north" },
    { zh: "廊坊", en: "Langfang", lat: 39.538, lon: 116.704, region: "north" },
    { zh: "雄安", en: "Xiong'an", lat: 38.990, lon: 115.860, region: "north" },
    { zh: "秦皇岛", en: "Qinhuangdao", lat: 39.935, lon: 119.598, region: "north" },
    { zh: "太原", en: "Taiyuan", lat: 37.871, lon: 112.549, region: "north" },
    { zh: "沈阳", en: "Shenyang", lat: 41.806, lon: 123.432, region: "northeast" },
    { zh: "大连", en: "Dalian", lat: 38.914, lon: 121.615, region: "northeast" },
    { zh: "丹东", en: "Dandong", lat: 40.001, lon: 124.354, region: "northeast" },
    { zh: "吉林", en: "Jilin", lat: 43.838, lon: 126.550, region: "northeast" },
    { zh: "白山", en: "Baishan", lat: 41.946, lon: 126.415, region: "northeast" },
    { zh: "延边", en: "Yanbian", lat: 42.905, lon: 129.509, region: "northeast" },
    { zh: "哈尔滨", en: "Harbin", lat: 45.804, lon: 126.534, region: "northeast" },
    { zh: "佳木斯", en: "Jiamusi", lat: 46.800, lon: 130.318, region: "northeast" },
    { zh: "鹤岗", en: "Hegang", lat: 47.350, lon: 130.298, region: "northeast" },
    { zh: "南京", en: "Nanjing", lat: 32.060, lon: 118.797, region: "east" },
    { zh: "无锡", en: "Wuxi", lat: 31.491, lon: 120.312, region: "east" },
    { zh: "苏州", en: "Suzhou", lat: 31.299, lon: 120.585, region: "east" },
    { zh: "泰州", en: "Taizhou", lat: 32.455, lon: 119.923, region: "east" },
    { zh: "扬州", en: "Yangzhou", lat: 32.395, lon: 119.413, region: "east" },
    { zh: "镇江", en: "Zhenjiang", lat: 32.188, lon: 119.426, region: "east" },
    { zh: "连云港", en: "Lianyungang", lat: 34.597, lon: 119.222, region: "east" },
    { zh: "杭州", en: "Hangzhou", lat: 30.274, lon: 120.155, region: "east" },
    { zh: "宁波", en: "Ningbo", lat: 29.868, lon: 121.544, region: "east" },
    { zh: "舟山", en: "Zhoushan", lat: 29.985, lon: 122.107, region: "east" },
    { zh: "嘉兴", en: "Jiaxing", lat: 30.752, lon: 120.750, region: "east" },
    { zh: "金华", en: "Jinhua", lat: 29.100, lon: 119.650, region: "east" },
    { zh: "黄山", en: "Huangshan", lat: 29.715, lon: 118.338, region: "east" },
    { zh: "景德镇", en: "Jingdezhen", lat: 29.269, lon: 117.178, region: "east" },
    { zh: "青岛", en: "Qingdao", lat: 36.067, lon: 120.383, region: "east" },
    { zh: "济南", en: "Jinan", lat: 36.651, lon: 117.120, region: "east" },
    { zh: "泰安", en: "Tai'an", lat: 36.190, lon: 117.088, region: "east" },
    { zh: "日照", en: "Rizhao", lat: 35.416, lon: 119.527, region: "east" },
    { zh: "福州", en: "Fuzhou", lat: 26.074, lon: 119.297, region: "east" },
    { zh: "莆田", en: "Putian", lat: 25.454, lon: 119.008, region: "east" },
    { zh: "泉州", en: "Quanzhou", lat: 24.874, lon: 118.676, region: "east" },
    { zh: "厦门", en: "Xiamen", lat: 24.480, lon: 118.089, region: "east" },
    { zh: "武汉", en: "Wuhan", lat: 30.593, lon: 114.305, region: "central" },
    { zh: "长沙", en: "Changsha", lat: 28.228, lon: 112.939, region: "central" },
    { zh: "广州", en: "Guangzhou", lat: 23.129, lon: 113.264, region: "south" },
    { zh: "深圳", en: "Shenzhen", lat: 22.543, lon: 114.058, region: "south" },
    { zh: "佛山", en: "Foshan", lat: 23.022, lon: 113.122, region: "south" },
    { zh: "汕头", en: "Shantou", lat: 23.354, lon: 116.682, region: "south" },
    { zh: "海口", en: "Haikou", lat: 20.044, lon: 110.200, region: "south" },
    { zh: "三亚", en: "Sanya", lat: 18.253, lon: 109.512, region: "south" },
    { zh: "陵水", en: "Lingshui", lat: 18.503, lon: 110.031, region: "south" },
    { zh: "成都", en: "Chengdu", lat: 30.573, lon: 104.067, region: "southwest" },
    { zh: "重庆", en: "Chongqing", lat: 29.563, lon: 106.552, region: "southwest" },
    { zh: "大理", en: "Dali", lat: 25.607, lon: 100.268, region: "southwest" },
    { zh: "西安", en: "Xi'an", lat: 34.342, lon: 108.940, region: "northwest" },
    { zh: "兰州", en: "Lanzhou", lat: 36.061, lon: 103.834, region: "northwest" },
    { zh: "西宁", en: "Xining", lat: 36.617, lon: 101.778, region: "northwest" },
    { zh: "张掖", en: "Zhangye", lat: 38.926, lon: 100.450, region: "northwest" },
    { zh: "酒泉", en: "Jiuquan", lat: 39.732, lon: 98.494, region: "northwest" },
    { zh: "嘉峪关", en: "Jiayuguan", lat: 39.772, lon: 98.277, region: "northwest" },
    { zh: "敦煌", en: "Dunhuang", lat: 40.142, lon: 94.662, region: "northwest" },
    { zh: "冷湖", en: "Lenghu", lat: 38.750, lon: 93.373, region: "northwest" },
  ];
  const REGIONS = [
    ["north", "华北", "North"], ["northeast", "东北", "Northeast"], ["east", "华东", "East"],
    ["central", "华中", "Central"], ["south", "华南", "South"], ["southwest", "西南", "Southwest"],
    ["northwest", "西北", "Northwest"], ["abroad", "港澳及海外", "HK, Macau & abroad"],
  ];
  const dotMap = (() => {
    const box = $("#dotmap");
    const canvas = $("#dotmap-canvas");
    const ctx = canvas?.getContext?.("2d");
    const fallback = () => {
      if (box) box.innerHTML = `<p class="map-fallback">${I18N[lang]["map.fallback"]}</p>`;
      return null;
    };
    if (!box || !ctx) return fallback();
    const tip = $("#map-tip");
    const pulse = $("#map-pulse");
    const labelBox = $("#map-labels");
    const listEl = $("#map-list");
    const listBtn = $("#map-list-toggle");
    const viewBtns = { world: $("#map-view-world"), china: $("#map-view-china"), europe: $("#map-view-europe") };
    const RAD = Math.PI / 180;
    const TAU = Math.PI * 2;
    const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD;
    const VIEWS = {
      world: { x0: -12, x1: 148, y0: mercY(-5), y1: mercY(61) },
      china: { x0: 73, x1: 135.5, y0: mercY(16.8), y1: mercY(54.4) },
      europe: { x0: -3, x1: 16, y0: mercY(46.2), y1: mercY(55) },
    };
    const places = PLACES.map((p) => ({ ...p, kind: p.kind ?? "visited", area: p.area ?? "china", x: p.lon, y: mercY(p.lat) }));
    const idx = (en) => places.findIndex((p) => p.en === en);
    const NOW = places.findIndex((p) => p.kind === "now");
    const drawOrder = places.map((_, i) => i).sort((a, b) => "visited home now".indexOf(places[a].kind) - "visited home now".indexOf(places[b].kind));
    // labels change with the zoom level: clusters on the world view, names once there is room
    const LABELS = {
      world: [
        { geo: [6.5, 56.5], cluster: ["map.europe", places.filter((p) => p.area === "europe").length], anchors: ["center", "up"] },
        { geo: [109, 48.5], cluster: ["map.china", places.filter((p) => p.region !== "abroad").length], anchors: ["center", "up"] },
        { place: idx("Singapore"), anchors: ["right", "left"] },
        { place: idx("Seoul"), anchors: ["right", "upright"] },
      ],
      china: [
        { place: NOW, suffix: "map.now", anchors: ["upleft", "left", "up"] },
        { place: idx("Shanghai"), suffix: "map.home", anchors: ["right", "upright", "downright", "up"] },
      ],
      europe: [["Paris", "down"], ["Brussels", "left"], ["Amsterdam", "up"], ["Luxembourg", "down"], ["Frankfurt", "right"], ["Hannover", "right"]]
        .map(([en, anchor]) => ({ place: idx(en), anchors: [anchor, "right", "left", "up", "down"] })),
    };
    const lattices = [];
    let current = "world";
    let view = { ...VIEWS.world };
    let W = 0, H = 0, dpr = 1;
    let proj = null, colors = null;
    let sweep = 1, animating = false, hover = -1, raf = 0;
    let labels = [];

    // land lattice → typed arrays; rank = the coarsest sub-lattice (step × 1 … 8) a dot also belongs to
    const decode = (m) => {
      const bin = atob(m.bits);
      const isSet = (k) => (bin.charCodeAt(k >> 3) >> (k & 7)) & 1;
      const bounds = { x0: m.x0, x1: m.x0 + (m.cols - 1) * m.step, y0: m.yTop - (m.rows - 1) * m.step, y1: m.yTop };
      const near = places.filter((p) => p.x > bounds.x0 - 25 && p.x < bounds.x1 + 25 && p.y > bounds.y0 - 25 && p.y < bounds.y1 + 25);
      let count = 0;
      for (let k = 0; k < m.cols * m.rows; k++) count += isSet(k);
      const L = {
        step: m.step, bounds, count,
        xs: new Float32Array(count), ys: new Float32Array(count),
        rank: new Uint8Array(count), heat: new Float32Array(count), fade: new Float32Array(count),
      };
      for (let j = 0, n = 0; j < m.rows; j++) {
        for (let i = 0; i < m.cols; i++) {
          if (!isSet(j * m.cols + i)) continue;
          const x = m.x0 + i * m.step;
          const y = m.yTop - j * m.step;
          L.xs[n] = x;
          L.ys[n] = y;
          let r = 0;
          while (r < 3 && i % (2 << r) === 0 && j % (2 << r) === 0) r++;
          L.rank[n] = r;
          // halftone heat grows with every nearby city; land far from any visit recedes
          let miss = 1;
          let nearest = Infinity;
          for (const p of near) {
            const dx = x - p.x, dy = y - p.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < nearest) nearest = d2;
            if (d2 < 16) miss *= 1 - 0.75 * Math.exp(-d2 / 2.4);
          }
          L.heat[n] = 1 - miss;
          L.fade[n++] = 0.45 + 0.55 * Math.exp(-nearest / 520);
        }
      }
      return L;
    };
    let details = [];
    const build = () => {
      lattices.push(decode(window.LAND_MASK));
      details = (window.LAND_DETAIL ?? []).map((m) => ({ m, L: null }));
    };
    const inside = (b, x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    const hexRgb = (value) => {
      const hex = value.trim().replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const readColors = () => {
      const cs = getComputedStyle(root);
      colors = {
        ink: hexRgb(cs.getPropertyValue("--ink")),
        accent: hexRgb(cs.getPropertyValue("--accent")),
        strong: hexRgb(cs.getPropertyValue("--accent-strong")),
        paper: hexRgb(cs.getPropertyValue("--paper")),
        sage: hexRgb(cs.getPropertyValue("--sage")),
        base: root.dataset.theme === "dark" ? 0.2 : 0.17,
      };
    };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const layout = () => {
      W = box.clientWidth;
      H = box.clientHeight;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    const project = () => {
      const k = Math.min(W / (view.x1 - view.x0), H / (view.y1 - view.y0));
      const ox = (W - (view.x1 - view.x0) * k) / 2;
      const oy = (H - (view.y1 - view.y0) * k) / 2;
      return {
        k,
        sx: (x) => ox + (x - view.x0) * k,
        sy: (y) => oy + (view.y1 - y) * k,
        ux0: view.x0 - ox / k, ux1: view.x0 + (W - ox) / k,
        uy0: view.y1 - (H - oy) / k, uy1: view.y1 + oy / k,
      };
    };
    const inView = (p) => p.x >= proj.ux0 && p.x <= proj.ux1 && p.y >= proj.uy0 && p.y <= proj.uy1;
    const nameOf = (p) => (lang === "zh" ? p.zh : p.en);
    const markerR = (p, big) => (p.kind === "visited" ? (big ? 4.6 : 3.1) : big ? 6.2 : 4.8);

    /* labels: measured once per view/language, placed greedily so they never cover a marker or each other */
    const RECTS = {
      center: (x, y, w, h) => [x - w / 2, y - h / 2],
      right: (x, y, w, h) => [x + 10, y - h / 2],
      left: (x, y, w, h) => [x - 10 - w, y - h / 2],
      up: (x, y, w, h) => [x - w / 2, y - 11 - h],
      down: (x, y, w, h) => [x - w / 2, y + 11],
      upleft: (x, y, w, h) => [x - 7 - w, y - 9 - h],
      upright: (x, y, w, h) => [x + 7, y - 9 - h],
      downright: (x, y, w, h) => [x + 7, y + 9],
    };
    const buildLabels = () => {
      labels = LABELS[current].map((spec) => {
        const el = document.createElement("span");
        el.className = "map-label";
        if (spec.cluster) {
          el.classList.add("is-cluster");
          el.textContent = t().mapCluster(t()[spec.cluster[0]], spec.cluster[1]);
        } else {
          const p = places[spec.place];
          el.classList.add(`is-${p.kind}`);
          el.textContent = nameOf(p);
          if (spec.suffix) {
            const small = document.createElement("small");
            small.textContent = t()[spec.suffix];
            el.append(small);
          }
        }
        return { spec, el };
      });
      labelBox.replaceChildren(...labels.map((l) => l.el));
      for (const l of labels) {
        l.w = l.el.offsetWidth;
        l.h = l.el.offsetHeight;
        // fallback size without the "hometown / based here" suffix, for tight maps
        l.el.classList.add("is-compact");
        l.cw = l.el.offsetWidth;
        l.el.classList.remove("is-compact");
      }
    };
    const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    const placeLabels = (tipRect) => {
      const blockers = [];
      for (const p of places) {
        if (!inView(p)) continue;
        const rr = markerR(p, false) + 3;
        blockers.push([proj.sx(p.x) - rr, proj.sy(p.y) - rr, rr * 2, rr * 2]);
      }
      if (tipRect) blockers.push(tipRect);
      for (const l of labels) {
        const p = l.spec.place != null ? places[l.spec.place] : null;
        if (p && l.spec.place === hover) {
          l.el.classList.add("is-off");
          continue;
        }
        const px = proj.sx(p ? p.x : l.spec.geo[0]);
        const py = proj.sy(p ? p.y : mercY(l.spec.geo[1]));
        let spot = null;
        let compact = false;
        for (const w of l.cw < l.w ? [l.w, l.cw] : [l.w]) {
          for (const anchor of l.spec.anchors) {
            const [x, y] = RECTS[anchor](px, py, w, l.h);
            const rect = [x, y, w, l.h];
            if (x < 8 || y < 8 || x + w > W - 8 || y + l.h > H - 8) continue;
            if (blockers.some((b) => overlaps(rect, b))) continue;
            spot = rect;
            break;
          }
          if (spot) break;
          compact = true;
        }
        l.el.classList.toggle("is-compact", !!spot && compact);
        l.el.classList.toggle("is-off", !spot);
        if (!spot) continue;
        l.el.style.transform = `translate(${Math.round(spot[0])}px, ${Math.round(spot[1])}px)`;
        blockers.push(spot);
      }
    };

    const draw = () => {
      if (!W || !H || !colors) return;
      proj = project();
      const { k, sx, sy, ux0, ux1, uy0, uy1 } = proj;
      const TARGET = W < 600 ? 5.2 : 6.5; // px between neighbouring dots; phones get a finer grain
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const edge = ux0 + (ux1 - ux0 + 8) * sweep - 4; // first reveal sweeps west → east
      // once the base lattice gets sparse, a finer regional layer (Europe) takes over; cross-fades while zooming
      let detailAlpha = Math.min(Math.max((k * lattices[0].step - TARGET * 1.25) / (TARGET * 0.5), 0), 1);
      if (!animating) detailAlpha = detailAlpha >= 0.5 ? 1 : 0;
      for (const d of details) if (detailAlpha > 0 && !d.L) lattices.push((d.L = decode(d.m)));
      const detailBounds = details.filter((d) => d.L).map((d) => d.L.bounds);
      const warmInk = mix(colors.accent, colors.paper, 0.15);
      const groups = new Map();
      const spacings = [];
      lattices.forEach((L, li) => {
        const isDetail = li > 0;
        if (isDetail && (!detailAlpha || L.bounds.x1 < ux0 || L.bounds.x0 > ux1 || L.bounds.y1 < uy0 || L.bounds.y0 > uy1)) return;
        // pick the sub-lattice whose spacing is closest to TARGET; cross-fade levels while zooming
        const qf = Math.min(Math.max(Math.log2(TARGET / (k * L.step)), 0), 3);
        const q = Math.round(qf);
        spacings[li] = k * L.step * 2 ** (animating ? qf : q);
        const { xs, ys, rank, heat, fade, count } = L;
        for (let n = 0; n < count; n++) {
          const x = xs[n], y = ys[n];
          if (x < ux0 - 1 || x > ux1 + 1 || y < uy0 - 1 || y > uy1 + 1) continue;
          let a = animating ? Math.min(Math.max(rank[n] - qf + 1, 0), 1) : rank[n] >= q ? 1 : 0;
          if (isDetail) a *= detailAlpha;
          else if (detailAlpha && detailBounds.some((b) => inside(b, x, y))) a *= 1 - detailAlpha;
          if (sweep < 1) a *= Math.min(Math.max((edge - x) / 5, 0), 1);
          const level = Math.round(a * fade[n] * 8);
          if (!level) continue;
          const key = li * 256 + Math.min(5, Math.floor(heat[n] * 6)) * 16 + level;
          let pts = groups.get(key);
          if (!pts) groups.set(key, (pts = []));
          pts.push(sx(x), sy(y));
        }
      });
      for (const [key, pts] of groups) {
        const warm = ((key >> 4) & 15) / 5;
        const r = Math.min(Math.max(spacings[key >> 8] * (0.2 + 0.18 * warm), 0.7), 3.4);
        // the halo stays softer than the markers so a city always reads as a city
        ctx.fillStyle = rgba(mix(colors.ink, warmInk, warm ** 0.8), (colors.base + (0.6 - colors.base) * warm) * ((key & 15) / 8));
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 2) {
          ctx.moveTo(pts[i] + r, pts[i + 1]);
          ctx.arc(pts[i], pts[i + 1], r, 0, TAU);
        }
        ctx.fill();
      }
      // hover: a quiet flight arc from where I live
      const base = places[NOW];
      const hovered = hover >= 0 ? places[hover] : null;
      if (hovered && hover !== NOW && inView(hovered) && inView(base)) {
        const x0 = sx(base.x), y0 = sy(base.y), x1 = sx(hovered.x), y1 = sy(hovered.y);
        const lift = Math.min(Math.hypot(x1 - x0, y1 - y0) * 0.22, 90);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - lift, x1, y1);
        ctx.lineWidth = 4;
        ctx.strokeStyle = rgba(colors.paper, 0.85);
        ctx.stroke();
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(colors.strong, 0.95);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const i of drawOrder) {
        const p = places[i];
        if (!inView(p) || (sweep < 1 && p.x > edge)) continue;
        const px = sx(p.x), py = sy(p.y);
        ctx.beginPath();
        ctx.arc(px, py, markerR(p, i === hover), 0, TAU);
        if (p.kind === "visited") {
          ctx.fillStyle = rgba(colors.strong, 1);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = rgba(colors.paper, 1);
        } else {
          ctx.fillStyle = rgba(p.kind === "home" ? colors.paper : colors.sage, 1);
          ctx.lineWidth = 2;
          ctx.strokeStyle = rgba(p.kind === "home" ? colors.ink : colors.paper, 1);
        }
        ctx.fill();
        ctx.stroke();
      }
      pulse.hidden = sweep < 1 || !inView(base);
      if (!pulse.hidden) {
        pulse.style.left = `${sx(base.x)}px`;
        pulse.style.top = `${sy(base.y)}px`;
      }
      let tipRect = null;
      if (hovered && inView(hovered)) {
        tip.textContent = lang === "zh" ? (hovered.region === "abroad" ? `${hovered.zh} · ${hovered.en}` : hovered.zh) : `${hovered.en} · ${hovered.zh}`;
        if (hovered.kind !== "visited") {
          const small = document.createElement("small");
          small.textContent = t()[hovered.kind === "home" ? "map.home" : "map.now"];
          tip.append(small);
        }
        tip.hidden = false;
        const px = sx(hovered.x), py = sy(hovered.y);
        tip.style.left = `${px}px`;
        tip.style.top = `${py}px`;
        tipRect = [px - tip.offsetWidth / 2 - 4, py - 14 - tip.offsetHeight - 4, tip.offsetWidth + 8, tip.offsetHeight + 8];
      } else tip.hidden = true;
      const showLabels = !animating && sweep >= 1;
      labelBox.classList.toggle("is-hidden", !showLabels);
      if (showLabels) placeLabels(tipRect);
      for (const btn of listEl.querySelectorAll("button")) btn.classList.toggle("is-hot", Number(btn.dataset.place) === hover);
    };

    const nearest = (event) => {
      if (!proj || sweep < 1) return -1;
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      let best = -1;
      let bestDist = event.pointerType === "touch" ? 22 : 12;
      places.forEach((p, i) => {
        if (!inView(p)) return;
        const dist = Math.hypot(proj.sx(p.x) - mx, proj.sy(p.y) - my);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    };
    const setHover = (index) => {
      canvas.style.cursor = index >= 0 ? "pointer" : "";
      if (index === hover) return;
      hover = index;
      draw();
    };
    canvas.addEventListener("pointermove", (event) => setHover(nearest(event)));
    canvas.addEventListener("pointerdown", (event) => setHover(nearest(event)));
    canvas.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") setHover(-1);
    });

    // zoom between views: centre moves linearly, extent scales geometrically (feels like a camera)
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
    const setView = (name, done) => {
      current = name;
      for (const [other, btn] of Object.entries(viewBtns)) btn?.setAttribute("aria-pressed", String(other === name));
      const to = VIEWS[name];
      cancelAnimationFrame(raf);
      hover = -1;
      if (!colors) {
        view = { ...to };
        return;
      }
      buildLabels();
      if (reduceMotion.matches) {
        view = { ...to };
        animating = false;
        draw();
        done?.();
        return;
      }
      const from = { ...view };
      const c0 = [(from.x0 + from.x1) / 2, (from.y0 + from.y1) / 2];
      const c1 = [(to.x0 + to.x1) / 2, (to.y0 + to.y1) / 2];
      const w0 = from.x1 - from.x0, w1 = to.x1 - to.x0;
      const h0 = from.y1 - from.y0, h1 = to.y1 - to.y0;
      const t0 = performance.now();
      animating = true;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1100);
        const e = ease(p);
        const cx = c0[0] + (c1[0] - c0[0]) * e;
        const cy = c0[1] + (c1[1] - c0[1]) * e;
        const w = w0 * (w1 / w0) ** e;
        const h = h0 * (h1 / h0) ** e;
        view = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
        if (p >= 1) {
          view = { ...to };
          animating = false;
        }
        draw();
        if (p < 1) raf = requestAnimationFrame(step);
        else done?.();
      };
      raf = requestAnimationFrame(step);
    };
    for (const [name, btn] of Object.entries(viewBtns)) btn?.addEventListener("click", () => setView(name));

    // every place as text, grouped by region; hovering a name lights it up, clicking flies to it
    const renderList = () => {
      listEl.replaceChildren(...REGIONS.map(([key, zh, en]) => {
        const group = document.createElement("div");
        group.className = "ml-group";
        const members = places.map((p, i) => [p, i]).filter(([p]) => p.region === key);
        const head = document.createElement("p");
        head.textContent = lang === "zh" ? zh : en;
        const n = document.createElement("i");
        n.textContent = String(members.length);
        head.append(n);
        const names = document.createElement("div");
        for (const [p, i] of members) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.place = String(i);
          btn.textContent = nameOf(p);
          names.append(btn);
        }
        group.append(head, names);
        return group;
      }));
    };
    listBtn.querySelector("b").textContent = String(places.length);
    listBtn.addEventListener("click", () => {
      const open = listBtn.getAttribute("aria-expanded") !== "true";
      listBtn.setAttribute("aria-expanded", String(open));
      listEl.hidden = !open;
    });
    const fromList = (event) => Number(event.target.closest("button[data-place]")?.dataset.place ?? -1);
    listEl.addEventListener("pointerover", (event) => {
      const i = fromList(event);
      if (i >= 0 && proj && inView(places[i])) setHover(i);
    });
    listEl.addEventListener("pointerleave", () => setHover(-1));
    let wanted = -1; // the latest clicked name wins, even if an earlier fly-to is still in the air
    listEl.addEventListener("click", (event) => {
      const i = fromList(event);
      if (i < 0) return;
      wanted = i;
      const p = places[i];
      if (proj && inView(p) && (current !== "world" || p.area === "world")) return setHover(i);
      setView(p.area, () => setHover(wanted));
      box.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest" });
    });

    const start = () => {
      if (!window.LAND_MASK) return fallback();
      build();
      readColors();
      layout();
      buildLabels();
      if (reduceMotion.matches) {
        draw();
        return;
      }
      sweep = 0;
      const t0 = performance.now();
      const step = (now) => {
        sweep = Math.min(1, (now - t0) / 1500);
        draw();
        if (sweep < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        start();
      }, { rootMargin: "160px" });
      io.observe(box);
    } else start();
    new ResizeObserver(() => {
      if (!colors) return;
      layout();
      draw();
    }).observe(box);
    themeListeners.push(() => {
      if (!colors) return;
      readColors();
      draw();
    });
    renderList();
    return {
      setView,
      refresh: () => {
        renderList();
        if (!colors) return;
        buildLabels();
        draw();
      },
    };
  })();

  /* ——— reveal / motion ——— */
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
    const work = $("#work");
    const starIO = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      starIO.disconnect();
      refreshStars();
    }, { rootMargin: "300px" });
    if (work) starIO.observe(work);
  } else {
    revealables.forEach((el) => el.classList.add("is-in"));
    refreshStars();
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

/* ——— generated data (see HANDOFF.md §地图) ——— */
// Land mask for the footprint map: Natural Earth 1:50m land (public domain) sampled on a
// Mercator-space lattice. Generated offline; no borders are drawn, only land dots.
window.LAND_MASK = { x0: -15, yTop: 88, step: 0.5, cols: 341, rows: 202, bits: "/////////wAA+AAA8H8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4P///////w8AgD8AAP8HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPz///////8BAPgHAOD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAID///////////////////////////////////////////////////////9/AAAAAAAA//8f8P//ePj/////////////////////////////////////BwAAAAAAwP//A///P77//////////////////////////////////////wAAAAAAAP7//+D//4f//////////////////////////////////////wcAAAAAAMD//w/+///j//////////////////////////////////////8AAAAAAAD8///g/////P////////////////////////////////////8fAAAAAACA//8f/v//////////////////////////////////////////AwAAAAAA3v//4P//////////////////////////////////////////fwAAAAAA4P//D/z//////////////////////////////////////////w8AAAAAAPj//+D///////////////////////////////////////////8BAAAAAOD//w/8//////////////////////////////////////////8/AAAAAAD+///B////////////////////////////////////////////BwAAAADg//8f8P///////////////////////////////////////////wAAAwAA/v//A/7//////////////////////////////////////////x8AAAAA4P//f8D///////////////////////////////////////////8DAAAAAPz//wf4//////////////////////////////////////////9/AAAAAID///8A////////////////////////////////////////////DwAAAADw//8f4P///////////////////////////////////////////wEAAAAA/v//A/z//////////////////////////////////////////z8AAAAAwP//f4D///////////////////////////////////////////8HAABAAPD//z/w////////////////////////////////////////////AAAAGAD///9P/AP/////////////////////////////////////////DwAAAADA////AQ7A/////////////////////////////////////////wEAAAAA/P//PwAA/v///////////////////////////////////////x8AAAAAAP///wfA7/////////////////////////////////////////wHAAAAAPD///8A/P//////////////////////////////////////QAr8AQAAAgD4z/8P0P//////////////////////////////////////DwDAAwAAAACAf/h/AP7//////////////////////////////////////wAAAAAAgA8A4Af/B+D+/////////////////////////////////////w8AAAAAAPIAAHjg/wCM//////////////////////////////////////8AAAAAAGAPAAAA+B8C8P////////////////////////////////////8fAAAAAADgDwAAAP8jIP7/////////////////////////////////////AQAAAAAA/wMAAOZ/Bs//////////////////////////////////////HwAAAAAAwH8AAPD4j+D5/////////////////////////////////////wEAAAAAAPAHAAAN/wH8/////////////////////////////////////x8AAAAAAAD/AADgwz/A//////////////////////////////////////8BAAAAAADgDwAAfvgD+P////////////////////////////////////8/AAAAAAAA+AEAgMcPAP//////////////////////////////////////AwAAAAAAgP8AAPD8AOD/////////////////////////////////////PwAAAAAAAKAfAAC+HQD4/////////////////////////////////////wEAAAAAAOD5BwDANwgA/////////////////////////////////////z8AAAAAAAB+/wAAeAcA/P////////////////////////////////////9hAAAAAADADz8AAE4Env//////////////////////////////////////AQAAAAAA+uEPAMDn4P//////////////////////////////////////PwACAAAA4B/4AQD4v////////////////////////////////////////5fDAAAAAPgDfwCg///////////////////////////////////////////7EAAAAID/4A+A////////////////////////////////////////////vwMAAADgn/8B+P///////////////////////////////////////////3cAAAAA/PP/gf////////////////////////////////////////////8OAAAAgD/8P/j////////////////////////////////////////////fAQAAAPiH/wf/////////////////////////////////////////////PwAAAAAf/H/w/////////////////////////////////////////////wcAAADAgP4H/v///////////////////////////////////////////+8AAAAAAID/8f////////////////////////////////////////////84AAAAAAD8v/////////////////////////////////////////////8fBwAAAACAP/j/////////////////////////////////////////////8wAAAAAAeAD/////////////////////////////////////////////fx4AAAAAAAHg/////////////////////////////////////////////88HAAAAAAAQ///////////////////////////////////////////////5AAAAAAAA/v////////////////////////////////////////////8/HwAAAAAAwP//////////////////////////////////////////////4wQAAAAAwPn/////////////////////////////////////////////fxwAAAAAAPz//////////////////////////////////////////////48BAAAAAID///////////////////////////////////////////////8gAAAAAADg//////////////////////////////////////////////8PBgAAAAAA4P//////////////////////////////////////////////wQAAAAAAAPj/////////////////////////////////////////////HzgAAAAAAAD///////////8/////wf///////////////////////////wMPAAAAAADA/////////3/+4f//D/j//////////////////////////z8gAQAAAAAA8P////////+PHvz//wD///////////////////////////8HBAAEAAAAAP7///////9/4IP//w/g//////////////////////////9/AAAAAAAAAMD////5////D/z///+A////////////////////////////BxAAAgAAAAD4//9//v///wG///8P8P//////////////////////////fwAGMAAAAAAA////B////x/gwP//gP///////////////////////////wfAAQEAAAAA4P///cD///8BAPD/P/D//////////////////////////38AeAgAAAAAAP7/H374//8/AAD4/wf8//////////////////////////8PgH8AAAAA/sD//8Af/v//BwAA/v8B////////////////////////////APAPAAAA8P//Hw74g///fwAAgP8/4P//////////////////////////D4D/AwAAAP7//wMA/sD//wcAAMD/B/j/////////////////////////cwDwDwAAAID//38AjB/g//8AAAD4/wH+////////////////////////PwAA/wAAAADw//8PgOEH+P8/AAEA/j/A/////////////////////////wMAYAgAAAAA/v//ARD4B/7/B/gDwP8PyP///////////////////////z8AAAwAAAAAwP//DwAA/sD//8H/Afz/A/D///////////////////////8HAAACAAAAAPj/fwDAAH/4////////fwD8////////////////////////AADgAAAAAAD//wcAHIA//8H4/////z/4/////////////////////8f/DwAAHgAAAADw/38AgAPw7G/4//////8H///////////////////////8/wAAwAMAAAAA/v8PAnAAGPgB//////9/wP////////////////////+H/wcAAPgAAAAAwP//QAAOAAd/4P//////B/j///////////////////9/OPgAAAAfAAAAAPz/HwHAAMCAD/r//////wD+////////////////////BQMfAADgAQAAAAD//wcAAAAM8Af//////x/A////////////////////PwDgBwAAPAAAAADA/38AAADgAf3w//////8D+P///////////////////w8A/gEAwAMAAAAA+P8HAADgB4AX/P////9/AP////////////////////8HgD8AAH4AAAAAAP//AAAA+ADwAP//////P+D/////////////////////PsAPAIgPAAAAAOD/BwAIBxwAHuD//////w/8/////////////////////w/wAwD9AQAAAACAfwD//wMCAAP4/f///////////////////////////z8AfwDgHwAAAAAAMAD+/z8AAAAAOR7///////////////////////////8D4A8A/gMAAAAAAATw//8HAAAAAADg//////////////////////////8/APgB4H8AAAAAAMAB////AQAADABA/P//////////////////////////A4A/8P8PAAAAAAD4////PwAAAA8Ah///////////////////////////PwDwA/+/AAAAAACA/////wMAAAAAYPD//////////////////////////w8ADvC/BQAAAAAA8P///z8AAAAAAAD+//////////////////////////8DAIDvBwAAAAAAAP////8HAAAAAADg////////////////////////////AAAYbwAAAAAAAPj/////AwAAAAAA/P//////////////////////////HwCB9wAAAAAAAID//////wEAEAAAwP///////////////////////////wMA8AcAAAAAAAD4//////8HwA8AAPj///////////////////////////8AABwAAAAAAAAA////////AfwDAAD///////////////////////////8/AIADAAAAAAAA8P//////f4D/AwDw////////////////////////////BwBwAAAAAAAAAP7//////z/w/w8e/v///////////////////////////wAABgAAAAAAAOD///////8//v///////////////////////////////x8AAAAAAAAAAAD4////////7/////////////////////////////////8BAAAAAAAAAAAA//////////////////+f////////////////////////AAAAAAAAAAAA8P//////////////////4f//////////////////////HwAAAAAAAAAABP//////////////////P/j//////////////////////wEAAAAAAAAAQPD/////////////7////wf//////////////////////z8AAAAAAAAAAAj////////////////////B//////////////////////8HAAAAAAAAAAD8///////////////5//8/8P////////////////////8/AAAAAAAAAACA//////////////8f/v//D/j/////////////////////BwAAAAAAAAAA+P//////////////x////wN+////////////////////fwAAAAAAAAAAgP////////////////D///8A4P///////////////////wcACAAAAAAAAPj//////////////x/+///fAPv///////////////////8AAAAAAAAAAAD///////////////+H////GyD+//////////////////8fAAAAAAAAAADg////////////////4P///wMO8An/////////////////IQAAAAAAAAAA/v//////////////P/z//3/gAQDg////////////////HwYAAAAAAAAAwP///////////////w////9PPwAA+P///////////////+EAAAAAAAAAAPj////////////////B/////z8AAP7//////////////x8cAAAAAAAAAAD///////////////8/8P////8fAID////////////////AAwAAAAAAAADg////////////////B/7/////AwDA//////////////8PMAAAAAAAAAAA/P///////////////8P//////wAA+P////9///////8fAAYAAAAAAAAAgP///////////////3/4/////x8AAP//////4///////AAAAAAAAAAAAAPD///////////////8f//////8BAMD3////Afz////3AwAAAAAAAAAAAAD+////////////////w/////8fAABw/v//PwD///8/GAAAAAAAAAAAAADA////////////////f/D/////AwAAwP///wPg////AwEAAAAAAAAAAAAA+P///////////////w/8////HwAAAPj//38A+P//P2AAAAAAAAAAAAAAAP////////////////8B/////wMAAAD///8BAPz//wMPAAAAAAAAAAAAAOD///////////////8/4P///38AAADg//8fAID//3/wAQAAAAAAAAAAAAD8////////////////D/j///8DAAAA/P//AwDg//8PHAAABAAAAAAAAACA/////////////////wf///9/AAAAgP//PwAA/P//AwEAwAMAAAAAAAAA8P/////////////////A////AwAAAPD//wEAgP///wAAAHgAAAAAAAAAAP7///////////////8/8P//PwAAAAD8/x8AAPD//z8AAAAfAAAAAAAAAMD/////////////////B/z//wAAAACA//8BAAC+//8PAADgAQAAAAAAAAD4/////////////////4D//wMAAAAA8P8fAADA8///AwAAPgAAAAAAAAAA/////////////////1/w/38AAAAAAPz/AQAAAPz//wAAwAMAAAAAAAAA4P////////////////8P/v8HAAAAAID/DwAAAID//x8AAHgAAAAAAAAAAPz/////////////////w/8fAAAAAADg/wEAAADw//8HAAAOAAAAAAAAAID///////////////////n/AAAAAAAA/D8AAAAA/v//AACABQAAAAAAAADw/////////////////3/+AwAAAAAAgP8HAAAAgP//HwAA8AcAAAAAAAAA/v/////////////////fHwAAAAAAAOD/AAAAAPD//wMAAFsAAAAAAAAAwP//////////////////fwAAAAAAAAD8HwAAQADe/38AAMAYAAAAAAAAAPj//////////////////wAAMAAAAACA/wMAAAjAw/8PAAA4DQAAAAAAAAD//////////////////x8AGAAAAAAA4D8AAIAAOPD/AQBAAAMAAAAAAADg//////////////////8D4AMAAAAAAPgHAAAAAAb+PwAAgHMAAAAAAAAA/P//////////////////0H8AAAAAAAD/AQAAAMCA/wEAgPAHAAAAAAAAAP////////////////////8PAAAAAADgHwAAAAAM4B8AABC4AAAAAAAAAMD/////////////////////AQAAAAAA+AEAAAAAAfAAAACBDwAAAAAAAADw////////////////////HwAAAAAAAD8BAAAAMAAOAAAQMAwAAAAAAAAA/P///////////////////wMAAAAAAOBxAAAAAB7AAACAAcABAAAAAAAAgP///////////////////z8AAAAAAAA4DgAAAMADAAAAEAA9AAAAAAAAAOD///////////////////8HAAAAAAAAwAMAAAB4AAAAAAD4DwAAAAAAAAD4//////////////////9/AAAAAAAAAHgAAAAAHAAAAACA+gEAAAAAAAAA/v//////////////////BwAAAAAAAAAfAAAQAAcAAAAAED8AAAAAAAAAgP///////////////////wAAAAAAAADgAQAAAOABAADAAeIBAAAAAAAAAMD//x/w/////////////x8AAAAAAAAACAAAAAD4AAAAfAA4AAAAAAAAAADw/38A/P////////////8BAAAAAAAAAAAAAMAAPwAAwD8AAAAAAAAAAAAA/IEDgP////////////8fAAAAAAAAAAAAAAD44AcAAPwHAAAAAAAAAAAAAAYAAOD7////////////AwAAAAAAAAAAAAAAPvwBAOB/AAAAAAAAAAAAAAAAAAAA/v//////////PwAAAAAAAAAAAAAAgA8/AAD8AwAAAAAAAAAAAAAAAAAAkP///////////wMAAAAAAAAAAAAAAODjBwDAfwAAAAAAAAAAAAAAAAAAAPD//////////z8AAAAAAAAAAAAAAAD4+QAA/w8AAAAAAAAAAAAAAAAAAAD+//////////8DAAAAAAAAAAAAAAAgPh4A8P8DAEAAAAAAAAAAAAAAAADA//////////8fAAAAAAAAAAAAAAAAgL8HIP5/AAAEAAAAAAAAAAAAAAAA/P//////////AQAAAAAAAAAAAAAAAOTPAPz/HwDCAQAAAAAAAAAAAAAAgP//////////HwAAAAAAAAAAAAAAAID8B8D//8N/OAAAAAAAAAAAAAAAAPD//////////wEAAAAAAAAAAAAAAAAA/wH4/x/+BwYAAAAAAAAAAAAAAAD+/////////x8AAAAAAAAAAAAAAAAAwD8A/v9DAEAYAAAAAAAAAAAAAADA//////////8BAAAAAAAAAAAAAAAAAPgHwP9/CAIMOgAAAAAAAAAAAAAA/P////////8fAAAAAAAAAAAAAAAAAED+Afj/h3sAwB8BAAAAAAAAAAAAAP//////////AQAAAAAAAAAAAAAAAACIfwD+f/AbMPAjAgAAAAAAAAAAAOD/////////HwAAAAAAAAAAAAAAAAAA8G/A/w8+WEB8+AEAAQAAAAAAAAD4/////////wEAAAAAAAAAAAAAAAAAgP6f8P/hDwAADv8DAAAAAAAAAAAA/v///////x8AAAAAAAAAAAAAAAAAAID/G/4f3AHy4/P/AQAAAAAAAAAAgP////////8DAAAAAAAAAAAAAAAAAADgPwDmgz/AYvj//wEAAAAAAAAAAOD///////8/AAAAAAAAAAAAAAAAAAAA+AMAEOAeAAD5//8AgAEAAAAAAAD4////////BwAAAAAAAAAAAAAAAAAAAP4AAADcAwAA/P9/ADgAAAAAAAAA////////fwAAAAAAAAAAAAAAAAAAAAAfAACAcQAAAPz/D4ABAAAAAAAAwP///////w8AAAAAAAAAAAAAAAAAAADAAQAAMAwAAAT+/+M/AAAAAAAAAPj///////8CAAAAAAAAAAAAAAAAAAAAwAMAAAAAAICA///zAQEAAAAAAAD///////8/AAAAAAAAAAAAAAAAAAAAAPghAAAAAAAY8P9/AAAAAAAAAADA////////DwAAAAAAAAAAAAAAAAAAAID//wAAAAAAAPz/BwAAAAAAAAAA+P///////wAAAAAAAAAAAAAAAAAAAACA/wcAAAAAAcD//wAAAAAAAAAAAP7//////z8AAAAAAAAAAAAAAAAAAAAAAPwPAAAEEAD8P34AAAAAAAAAAMD///////8DAAAAAAAAAAAAAAAAAAAAAADY9/vHAwCA8AMPAAAAAAAAAAD4////////AAAAAAAAAAAAAAAAAAAAAAAAABwOPAAAAHzABwAAAAAAAAAA////////HwAAAAAAAAAAAAAAAAAAAAAAAAAw4AAAAAAA+AUAAAAAAAAA4P///////wMAAAAAAAAAAAAAAAAAAAAAAAAADAwAAAAAAH4BAAAAAAAAAPj///////8BAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAcAAAAAAAAAAD///////8/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAADg////////BwAAAAAAAAAAAAAAAAAAAAAAAAAAAMAPAGAAABAAAAAAAAAA/P///////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYDwAcAAAAAAAAAAAAwP///////x8AYAAAAAAAAAAAAAAAAAAAAAAAAAAA/h+AAwAAAA==" };
// Europe detail layer for the footprint map (0.125° lattice): Natural Earth 1:50m land (public domain) on a
// Mercator-space lattice. Generated offline; no borders are drawn, only land dots.
window.LAND_DETAIL = [{ x0: -14, yTop: 77.25, step: 0.125, cols: 353, rows: 292, bits: "AAAAAAAAAAAAAAAAAAAAAAAAAP///////////////wcAAAD4//////////8BAAAAAAAAAAAAAAAABAAAAAAA/v//////////////DwAAAPD//////////wMAAAAAAAAAAAAAAAAIAAAAAAD8//////////////8fAAAA4P//////////BwAAAAAAAAAAAAAAABgAAAAAAPD//////////////z8AAADA//////////8PAAAAAAAAAAAAAAAACAAAAAAA4P///////////////wEAAAD//////////h8AAAAAAAAAAAAAAAA0AAAAAACA////////////////FwAAgP///////3/8PwAAAAAAAAAAAAAAAAwAAAAAAAD///////////////9/AAAA4///////Hvh/AAAAAAAAAAAAAAAAMAAAAAAAAP/f//////////////8AAABA/////38A8P8AAAAAAAAAAAAAAADgAAAAAAAA/9f//////////////wOAAID4////AQDg/wEAAAAAAAAAAAAAAMABAAAAAAD69///////////////HwAHANz///8BAAD/AwAAAAAAAAAAAAAA4AMAAAAAAPz3//////////////9/AB8AmP//fwEAAPwHAAAAAAAAAAAAAACABwAAAAAAyP////////////////8AHwAg//8fAAAA+A8AAAAAAAAAAAAAAAAMAAAAAAAA7////////////////wEeAAf3/w8AAAAAGAAAAAAAAAAAAAAAAAgAAAAAAIDf////////////////DxgCAO7/AwAAAAAgAAAAAAAAAAAAAAAAEAAAAAAAAN////////////////8fAAQADP8DAAAAAEAAAAAAAAAAAAAAAAAgAAAAAAAA3v///////////////38AAAAANgAAAAAAHwAAAAAAAAAAAAAAAAAAAAAAAADc/////////////////wAAAAAGAAAAAAD/AQAAAAAAAAAAAAAAAAAAAAAAALz/////////////////AwAAAAYAAAAAIP4DAAAAAAAAAAAAAAAAAAAAAAAAOPj///////////////8DAAAAAAAAAADI/wcAAAAAAAAAAAAAAAAAAAAAAACw/P///////////////wcAAAAAAAAAAPj/DwAAAAAAAAAAAAAAAAAAAAAAAKD/////////////////AwAAAAAAAAYA4P8fAAAAAAAAAAAAAAAAAAAAAAAAgP////////////////8HAAAAAAAA/gDA/z8AAAAAAAAAAAAAAAAAAAAAAAAA///////7/////////w8AAAAAAOD/H4D/fwAAAAAAAAAAAAAAAAAAAAAAAAD+//////f/////////AwAAAAAA/P//j///AAAAAAAAAAAAAAAAAAAAAAAAAPz+////7/////////8ZAAAAAAD+//////8BAAAAAAAAAAAAAAIAAAAAAAAA/P7///+f/////////z8AAAAAAPz//////wMAAAAAAAAAAAAAaAAAAAAAAAB4/P///z//////////PwAAAAAA////////BwAAAAAAAAAAAAAwAAAAAAAAAHD4////f/z///////9/AAAAAID///////8PAAAAAAAAAAAAAAwAAAAAAAAAAPD///9/4P///////38AAAAAAP///////x8AAAAAAAAAAAAAGAAAAAAAAAAA8P////+A////////fwEAAAAE/v//////PwAAAAAAAAAAAAB4AAAAAAAAAADI////74D///////9/AAAAABz8//////9/AAAAAAAAAAAAAMADAAAAAAAAAHD+//8fAP7//////z8AAAAAf/j///////8AAAAAAAAAAAAAYAAAAAAAAAAA8P///w8A/P//////HwAAAAD88f///////wEAAAAAAAAAAACAAgAAAAAAAADg////HwD4//////8fAAAAAODh////////AwAAAAAAAAAAAAAAAAAAAAAAAMD///8fAPD//////x8AAAAAwID///////8HAAAAAAAAAAAAAAAAAAAAAAAAAP///x8A4P//////DwAAAAAAgP///////w8AAAAAAAAAAACADwAAAAAAAAAA/v//HwDA//////8DAAAAAADv/v//////HwAAAAAAAAAA4PofAAAAAAAAAAD4//8fAID//////w8AAAAAAP/8//////8/AAAAAAAAABDA/z8AAAAAAAAAAOD//x8AAP//////PwAAAADg//H//////38AAAAAAAAAMID/fwAAAAAAAAAAgP//HwAA/v////8fAAAAAID/4f///////wAAAAAAAAB4AP9/AAAAAAAAAAAA/v8/AAD4/////z8AAAAAAP+B9///////AQAAAAAAAPgA/v8AAAAAAAAAAADw/z8AAOD//////wAAAAAA/wHM//////8DAAAAAAAA9AD/fwAAAAAAAAAAAAD/HwAAwP//////AQAAAAD8AMD//////wcAAAAAAAD8AP9/AAAAAAAAAAAAAP8fAACA//////8BAAAAADAAgP//////DwAAAAAAAPAB/n8AAAAAAAAAAAAA/g8AAAD//////wMAAAAAYAAA//////8fAAAAAAAA4AP8fwAAAAAAAAAAAADgAwAAAPz/////BwAAAABAAAD+/////z8AAAAAAADAB/B/AAAAAAAAAAAAAAAAAAAA8P////8PAIABAMAAAP7/////fwAAAAAAAAAD+P8AAAAAAAAAAAAAAAAAAADg/////x8AwAEAAAAA/P//////AAAAAAAAAAP4/wMAAAAAAAAAAAAAAAAAAMD/////HwDwAQAAAAD4//////8BAAAAAAAAAvD/AwAAAAAAAAAAAAAAAAAAgP////8/AOABAAAAAPD//////wMAAAAAAAAA8P/D+wcAAAAAAAAAAAAAAEAA/v////8A4AEAAGAA4P//////BwAAAAAAgAfj/+f/HwAAAAAAAAAAAAAAYAD8/////wHgAwAA8AHA//////8PAAAAAAAABo////8/AAAAAAAAAAAAAADwAPj/////A8AHAAD8B4D//////x8AAAAAAAAAn////38AAAAAAAAAAAAAAPAD4P////8HwA8AAPwfAP//////PwAAAAAAAAA//////wAAAAAAAAAAAAAA8AfA/////w+APwAA+H8A/v////9/AAAAAAAAEHz+////AAAAAAAAAAAAAADgDwD/////DwA/AAD4/wD8//////8AAAAAAABg4Pn///8BAAAAAAAAAAAAAOAfA/7///8fAX4AAPD/A/j//////wEAAAAAAMCA7////wEAAAAAAAAAAAAA4D8C+P///z8CeAAA4P8H8P//////AwAAAAAAgAHc////AwAAAAAAAAAAAAD8PwDw////fwZwAADg/x/w//////8HAAAAAAAAANj///8HAAAAAAAAAAAAAP9/AOD/////BGAAAMD/P/D//////w8AAAAAAAAAgv///w8AAAAAAAAAAAAA/38AgP////8JwAAAgP//8f//////HwAAAAAAAAKE////DwAAAAAAAAAAAACf/wAA/////xuAAAAA//////////8/AAAAAAAAAAD///8fAAAAAAAAAAAAAD7/AQD8////OwAAAAD//////////38AAAAAAAAAAP7//x8AAAAAAAAAAAAAPv4DAPD///83AAAAAP///////////wAAAAAAAAAA////HwAAAAAAAAAAAAB4/wcA4P///28AAAAA/v//////////AQAAAAAAAAD+//8/AAAAAAAAAAAAACD/DwCA////bwAAAAD8//////////8DAAAAAAAAIHv//z8AAAAAAAAAAAAAEP8fAAD+///fAAAAAPz//////////wcAAAAAAAAAfv//fwAAAAAAAAAAAADw/v8DAPj//98BAAAA+P//////////DwAAAAAAAAB4/v8/AAAAAAAAAAAAAOD//w8A+P//vwMAAADw//////////8fAAAAAAAAAPD8/z8AAAAAAAAAAAAAwP//HwD4//9/AwAAAOD//////////z8AAAAAAAAA8Pz//wEAAAAAAAAAAACA//8/APD//38GAAAAwP//////////fwAAAAAAAAAA+P//AwAAAAAAAAAAAAD//z8A2P///wgAAACA////////////AAAAAAAAAADw//8DAAAAAAAAAAAAAP7/JwDg////AAAAAAD///////////8BAAAAAAAAAOD//wEAAAAAAAAAAAAA/P8PANj//wAAAAAAAPz//////////wMAAAAAAAAA+P//AQAAAAAAAAAAAADw/x8A+P//AQAAAAAA+P//////////BwAAAAAAAADQ5v/zAAAAAAAAAAAAAOD/PwD8/n8AAAAAAADw//////////8PAAAAAAAAALjD//8HAAAAAAAAAAAAwP8/A/P5fwAAAAAAAOD//////////x8AAAAAAAAAPMf//x8AAAAAAAAAAACA/x8G5vP/AAAAAAAAwP//////////PwAAAAAAAAA8jP//fwAAAAAAAAAAAID/fwDux/8AAAAAAACA//////////9/AAAAAAAAAGA8////AQAAAAAAAAAAAP9/gP+P/wEAAAAAAAD///////////8AAAAAAAAAwPj8//8HAAAAAAAAAAAA/n8A/j//BwAAAAAAAPz//////////wEAAAAAAAAA8PH//w8AAAAAAAAAAAD4f3z8T/4PAAAAAAAA+P//////////AwAAAAAAAABw4///PwAAAAAAAAAAAOD//vAf/B8AAAAAAAD4//////////8HAAAAAAAAAGDA//9/AAAAAAAAAAAAAP/94z/4HwAAAAAAAOj//////////w8AAAAAAAAEwMD///8AAAAAAAAAAAAA/vvH/8AAAAAAAAAA0P//////////HwAAAAAAAB4AwP///wMAAAAAAAAAAAD894//AQAIAAAAAACQ//////////8/AAAAAACAfz6A////BwAAAAAAAAAAAPDPH/4BAHAAAAAAACD//////////38AAAAAAOC/fwD///8PAAAAAAAAAAAA8A8/4AAA4AEAAAAAIP7//////////wAAAAAAwP//Af///x8AAAAAAAAAAADgH7jAAQDAAwAAAAAg/P//////////AQAAAADA//8D////PwAAAAAAAAAAAMD/g4E7AAAAAAAAAGD4//////////8DAAAAAID//w/+P/7/AAAAAAAAAAAAIP8WGR8AAAAAAAAA/P///////////wcAAAAAAP//P/wf//8BAAAAAAAAAADA/kPzDQAAAAAAMAD4////////////DwAAAAAA//9/sBn+/wMAAAAAAAAAAAD8D+QPAAAAAAD/AfD///////////8fAAAAAID//38AAP7/DwAAAAAAAAAAAPo/gA8AAQAAgP8H4P///////////z8AAAAAAP7//wMA/P8/AAAAAAAAAAAA4H8ABAAHAADA/xfg////////////fwAAAAAAwP//DwD4//8BAAAAAAAAAACA/wAAAB4AAPD/D+D/////////////AAAAAADA//8fAPD//w8AAAAAAAAAAAD/AQYAPAAA8P8/4P////////////8BAAAAAOD//x8A4P//HwAAAAAAAAAAgP8fDOB/AADw/3/g/////////////wMAAAAA4P//P8CA//9/AAAAAAAAAACA//8H4P8BAPD/////////////////BwAAAPi7//9/wAH///8BAAAAAAAAAAD8/w/gXwAA+P////////////////8PAAAA+P///z+AAfz//wcAAAAAAAAAAPj/H+B/AAD+/////////////////x8AAADA////P4AD0P//HwAAAAAAAAAA8P8f+P8PgP//////////////////PwAAAID///8/AACA//8fAAAAAAAAAADg/x/4/3/g//////////////////9/AAAA4P///x8AAAD//z8AAAAAAAAAAID///v///H///////////////////8AAAAA////PwAAAP///wAAAAAAAAAAAP7//////////////////////////wEAAADg////AAAA/v//AQAAAAAAAADA///////h////////////////////AwAAAPD///8BAAD8//8HAAAAAAAAAMD//////4////////////////////8HAAAA8P///wMAAPD//w8AAAAAAADAj///////f////////////////////w8AAADg////BwAA8P//DwAAAAAAAMQf////////////////////////////HwAAAPD///8fAADg//8/AAAAAAAAwH////////////////////////////8/AAAAwP///z8AAMD///8AAAAAADCQ/////////////////////////////38AAACA////fwA4wP///wEAAAAAxn///////////////////////////////wAAAAD8////APD8////BwAAAADA////////////////////////////////AQAAAOD///8B4P////8PAAAAAOD///////////////////////////////8DAAAAAPz//wOA/////z8AAAAAwv///////////////////////////////wcAAAAA/v//BwD+////PwAAAADG////////////////////////////////DwAAAAD+//8fAP7///8/AAAAAMT///////////////////////////////8fAAAAAPz//z8A/v///z/+AAAA+P///////////////////////////////z8AAAAA+P//PwDm//////wDAADw////////////////////////////////fwAAAAD4//9/AID//////x8AAOD/////////////////////////////////AAAAAPj+/38AAP//////PwAA4P////////////////////////////////8BAAAA+P///wAA/v//////AADA/////////////////////////////////wMAAADg////AQD8//////8BAID/////////////////////////////////BwAAAOD///8DAPj//////wMAAP////////////////////////////////8PAAAA4P///wMA8P//////AwAA/v///////////////////////////////x8AAADA////AwDw//////8HAAD+////////////////////////////////PwAAAPD///8PAPD//////w8AAPz///////////////////////////////9/AAAA8P///wkA+P//////HwAA/P////////////////////////////////8AAAAA/v8fAAD4//////8fAAD8/////////////////////////////////wEAAAD//x8AAP7//////z8AAPz/////////////////////////////////AwAAAP//DwAA/v//////HwAA+P////////////////////////////////8HAAAA//8PAAD8//////8/AAD4/////////////////////////////////w8AAAD8/wMAAPj//////z8AAPD/////////////////////////////////HwAAAMD/BwAA8P3/////DwAA+P////////////////////////////////8/AAAAwP4DAACA4P////8/AABA/////////////////////////////////38AAAAA/gEAAABA/v3//38AAHj//////////////////////////////////wAAAAAEAAAAAAD4/P//HwAA8P//////////////////////////////////AQAAAAAAAAAAAOD8//9/AABg//////////////////////////////////8DAAAAAAAAAAAAAPj///8/APj//////////////////////////////////wcAAAAAAAAAAABw+P///38A+P//////////////////////////////////DwAAAAAAAAAAAPj//////wD8//////////////////////////////////8fAAAAAAAAAAAA+P////9/AP7//////////////////////////////////z8AAAAAAAAAAAD4/////3/A////////////////////////////////////fwAAAAAAAAAAAPj/////f+D/////////////////////////////////////AAAAAAAAAAAA8P////8f4P////////////////////////////////////8BAAAAAAAAAADg//+/HA7A/////////////////////////////////////wMAAAAAAAAAAOD//88DAID/////////////////////////////////////BwAAAAAAAAAA4P+ADwMAAP////////////////////////////////////8PAAAAAAAAAADg/wEAAAAA/v///////////////////////////////////x8AAAAAAAAAAOD/AwAAAAD8////////////////////////////////////PwAAAAAAAAAA4P8DAAAAAPj///////////////////////////////////9/AAAAAAAAAADgBwcAAAAA8P////////////////////////////////////8AAAAAAAAAAPADBAAAAADg/////////////////////////////////////wEAAAAAAAAA8AEAAAAAAOD/////////////////////////////////////AwAAAAAAAAAgAwAAAAAA4P////////////////////////////////////8HAAAAAAAAAAAAAAAAAADw/////////////////////////////////////w8AAAAAAAAAAAAAAAAAAPz/////////////////////////////////////HwAAAAAAAAAAAAAAAAAA/v////////////////////////////////////8/AAAAAAAAAAAAAAAAAAD//////////////////////////////////////38AAAAAAAAAAAAAAAA+AP7//////////////////////////////////////wAAAAAAAAAAAAAAAH4A/v//////////////////////////////////////AQAAAAAAAAAAAAAA+AD4//////////////////////////////////////8DAAAAAAAAAAAAAADwB/D//////////////////////////////////////wcAAAAAAAAAAAAAAMD/+f//////////////////////////////////////DwAAAAAAAAAAAAAAiP////////////////////////////////////////8fAAAAAAAAAAAAAAAQ/v///////////////////////////////////////z8AAAAAAAAAAAAAAAD8////////////////////////////////////////fwAAAAAAAAAAAAAAAPj/////////////////////////////////////////AAAAAAAAAAAAAAAA8P////////////////////////////////////////8BAAAAAAAAAAAAwADg/////////////////////////////////////////wMAAAAAAAAAAADAB8D/////////////////////////////////////////BwAAAAAAAAAAAP4fEP////////////////////////////////////////8PAAAAAAAAAACA/3///////////////////////////////////////////x8AAAAAAAAAAID/////////////////////////////////////////////PwAAAAAAAAAAAP////////////////////////////////////////////9/AAAAAAAAAAAA/P////////////////////////////////////////////8AAAAAAAAAAADw/////////////////////////////////////////////wEAAAAAAAAAAMD/////////////////////////////////////////////AwAAAAAAAAAAwP////////////////////////////////////////////8HAAAAAAAAAADA/////////////////////////////////////////////w8AAAAAAAAAAAD+////////////////////////////////////////////HwAAAAAAAAAAAPj///////////////////////////////////////////8/AAAAAAAAAAAAAP7//////////////////////////////////////////38AAAAAAAAAAAAA4P///////////////////////////////////////////wAAAAAAAAAAAAAA////////////////////////////////////////////AQAAAAAAAAAAAAD4//////////////////////////////////////////8DAAAAAAAAAAAAAMD//////////////////////////////////////////wcAAAAAAAAAAAAAgP//////////////////////////////////////////DwAAAAAAAAAAAAAA+P////////////////////////////////////////8fAAAAAAAAAAAAAADw/////////////////////////////////////////z8AAAAAAAAAAAAAAMD/////////////////////////////////////////fwAAAAAAAAAAAAAAgP//////////////////////////////////////////AAAAAAAAAAAAAAAA//////////////////////////////////////////8BAAAAAAAAAAAAAAD+/////////////////////////////////////////wMAAAAAAAAAAAAAAPz/////////////////////////////////////////BwAAAAAAAAAAAAAA8P////////////////////////////////////////8PAAAAAAAAAAAAAADA/////////////////////////////////////////x8AAAAAAAAAAAAAAID/////////////////////////////////////////PwAAAAAAAAAAAAAAAPz///////////////////////////////////////9/AAAAAAAAAAAAAAAA4P////////////////////////////////////////8AAAAAAAAAAAAAAACA/////////////////////////////////////////wEAAAAAAAAAAAAAAAD/////////////////////////////////////////AwAAAAAAAAAAAAAAAP7///////////////////////////////////////8HAAAAAAAAAAAAAAAA/////////////////////////////////////////w8AAAAAAAAAAAAAAAD0////////////////////////////////////////HwAAAAAAAAAAAAAAAOD///////////////////////////////////////8/AAAAAAAAAAAAAAAA4P//////////////////8P///////////////////w8AAAAAAAAAAAAAAACA///////////////////g////////////////////HwAAAAAAAAAAAAAAAAD+////////////////f+D///////////////////8/AAAAAAAAAAAAAAAAAP////////////////8P4P///////////////////38AAAAAAAAAAAAAAAAA/v///////////////x+A/////////////////////wEAAAAAAAAAAAAAAAD8////////////////PwA/////////////////////AQAAAAAAAAAAAAAAAPj///////////////9/AH7+//////////////////8DAAAAAAAAAAAAAAAA8P////////////////8BePf//////////////////wcAAAAAAAAAAAAAAADg/////////////////wdw+v//////////////////DwAAAAAAAAAAAAAAAOD/////////////////D8DE/////////////////38fAAAAAAAAAAAAAAAAwP////////////////8PAMj//////////////////x4AAAAAAAAAAAAAAAAA/////////////////w8AMP//////////////////AQAAAAAAAAAAAAAAAAD+////////////////HwAA/P////////////////8BAAAAAAAAAAAAAAAAAP7///////////////8/AAD8/////////////////wcAAAAAAAAAAAAAAAAA/P///////////////38AAPD/////////////////BwAAAAAAAAAAAAAAAAD4////////////5////wAAwP////////////////8HAAAAAAAAAAAAAAAAAPD///////////8H/v//AwAA/////////////////w8AAAAAAAAAAAAAAAAA4P///////////wf4//8HAAD+////////////////HwAAAAAAAAAAAAAAAADA////////////B8D//x8AAP7///////////////8/AAAAAAAAAAAAAAAAAMD///////////8HAP7/fwAA8P///////////////38AAAAAAAAAAAAAAAAAgP///////////wcA8P//AwDo/////////////////wAAAAAAAAAAAAAAAAAA////////////BwDg//8PAAD/////////////////AQAAAAAAAMABAAAAAAD+//////////8BAMD//z8AAPz///////////////8DAAAAAAAA4AdAAAAAAPz/////////fwAAAP///wEA4P///////////////wMAAAAAAADw//8PAAAA/P////////9/AAAA/v//BwDA////////////////BwAAAAAAAOD///+BDwD4/////z/+/38AAAD8//8fAADw//////////////8PAAAAAAAA4P//////H/7/////P2D+fwAAAPD//z8AALD//////////////wMAAAAAAAD8//////////////8/APB/AAAA4P///wAA4P7/////////////AwAAAAAAAP7//////////////x8AwH8AAADA////AQDA+P////////////8DAAAAAAAA/P//////////////HwAAPgAAAID///8DAADP/////////////wcAAAAAAAD8//////////////8/AAAAAAAAAP///w8AAGD/////////////DwAAAAAAAPD//////////////z8AAAAAAAAD/P//HwAAeP////////////8fAAAAAAAA4P//////////////fwAAAAAAAAbj//8/AAAA+P///////////z8AAAAAAAAA////////////////AAAAAAAADIf///8AAACI////////////fwAAAAAAAAD///////////////8BAAAAAAAPAP///wEAAAD+//////////8/AAAAAAAAAPj//////////////wcAAAAAgD8A/P//BwAAAPj//////////38AAAAAAAAA8P//////////////DwAAAAAAfwDw//8fAAAAwP//////////fwAAAAAAAADg//////////////8/AAAAAAD/AID//38AAAAA////////////AQAAAAAAAMD//////////////38AAAAAAP4BAP7//wEAAAD4//////////8HAAAAAAAAgP//////////////fwAAAAAA/AMA+P//BwAAAOD//////////w8AAAAAAACA////////////////AAAAAADwBwDg//8fAAAAgP//////////PwAAAAAAAAD///////////////8DAAAAAOAHAID///8AAAAA/v//////////AAAAAAAAAPz//////////////wMAAAAAwA8AAP7///8DAAD8//////////8BAAAAAAAA/P//////////////BwAAAACAHwAA+P///wcAAOD//////////wMAAAAAAAD4//////////////8DAAAAAAA+AADg////DwAAgP//////////BwAAAAAAAOD//////////////wEAAAAAADwAAID///8HAAAA//////////8fAAAAAAAAwP//////////////AQAAAAAAeAAAAP7//w8AAAD//////////38AAAAAAACA//////////////8AAAAAAADAAAAA+P//PwAAAP7//////////wEAAAAAAAD//////////////wAAAAAAAAAAAADA////AQAA/P//////////DwAAAAAAAP7/////////////AAAAAAAAAAAAAAD///8PAAD4////////////AAAAAAAA+P///////////x8AAAAAAAAADgAAAID//38AAPD/////////////AQAAAADw////////////BwAAAAAAAAg+AAAAAP7//wMA4P////////////8DAAAAAOD///////////8DAAAAAAAAAH4AAAAA/P//HwDA//////////8C+wcAAAAAwP///////////wMAAAAAAAAg/wEAAADw//9/AID/////f4f/fwDgDwAAAACA////////////BwAAAAAAAMD/AwAAAMD///8DgP////9/AvD/AIAfAAAAAAD///////////8fAAAAAAAAgP8PAAAAAP7//x8A/////w8MwP8AgD8AAAAAAP///////////w8AAAAAAAAA/x8AAAAA4v//fwD+////HxgAfwDgfwAAAAAA/v//////////DwAAAAAAAAD8PwAAAACA////Afj//99/ABgwYMD/AAAAAAD8//////////8PAAAAAAAAAPh/AAAAAAD///wH8P//P/8BILiH3v8BAAAAAPz//////////x8AAAAAAAAA4H8AAAAAAP7/4B/w//9//A4A8P///wMAAAAA+P//////////HwAAAAAAAADA/wAAAAAA/P8BPMD///+gEQDy////BwAAAADw//////////8fAAAAAAAAAID/AQAAAADg/wH4AP7//0AGAOb///8PAAAAAOD//////////x8AAAB4AAAAAP8DAAAAAAD/A/AA+P//gxkggP///x8AAAAAwP//////////PwAAYOAAAAAA/gcAAAAAAPgDwAHg//8HBMCB////PwAAAADA//////////8/AADwAAEAAAD4DwAAAAAA8AcAAcD//x8AgIH///9/AAAAAID//////////z8AAPAHAAAAAPgfAAAAAADADwAA8P//fwAAAP////8AAAAAAP//////////fwAA8A8AAAAA8D8AAAAAAIA/AADA/v//AAAA/v///wEAAAAA//////////9/AADwDwAAAADgfwAAAAAAAP4BAAD5//8DAAD8////AwAAAAD///////////8AAAAfAAAAAOD/AAAAAAAA/AcAAPb//w8AABD+//8HAAAAAP7//////////wEAABwAAAAAwP8BAAAAAAD4HwAAwP//PwAAYP7//w8AAAAA/v//////////BwAAAAAAAAAA/wEAAAAAAOA/AAAA//9vAAD4/P//HwAAAAD8//////////8PAAAAAAAAAAA+AwAAAAAAwH8AAAD8/98UAPDz//8/AAAAAPj//////////x8ADgAAAAAAAH4AAAAAAACA/wAAAPD/fwAAgOf//38AAAAA8P//////////fwAOAAAAAAAAcAAAAAAAAAD+AQAAAP//BwgAxP///wAAAADg////////////AQgAAAAAAAAAAAAAAAAAAHwAAADA/38PMAAA////AQAAAOD///////////8HAAAAAAAAAAAAAAAAAAAAeAAAAMD//3EAAAD///8DAAAAAP7//////////w9AAAAAAAAAAAAAAAAAAAB8AAAAgP3/zwcAAP///wcAAAAA/P//////////BwAAAAAAAAAAAAAAAAAAAPwAAAAA+f8/HwDM/P//DwAAAADY//////////8HAAAAAAAAAAAAAAAAAAAA+AEAAADg//8/ADjz//8fAAAAAMD//////////wMAAAAAAAAAAAAAAAAAAADwAwAAAMT+/3cAYP///z8AAAAAAP//////////BwAAAAAAAAAAAAAAAAAAAPQDAAAADnDwvwHA/v//fwAAAAAA/v////////8HAAAAAAAAAAAAAAAAAAPA7wMAAAA8+IP/AoD4////AAAAAAD8/////////wcAAAAAAAAAAAAAAABgHuD/AwAAAGD4P/8dAID///8BAAAAAPz/////////DwAAAAAAAAAAAAAAAOD//58DAAAAAPj//6MAAPz//wMAAAAA8P////////8fAAAAAAAAAAAAAAAAwP//HwAAAACA+f9HBwMA8P//BwAAAADg/////////x8AAAAAAAAAAAAAAACA//8/AAAAAADm/x8MDADm//8P" }];

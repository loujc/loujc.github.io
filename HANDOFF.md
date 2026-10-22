# HANDOFF — loujc.github.io 个人主页 · 交接文档

> 写给接下来接手这个项目的 AI agent / 开发者：读完这一页即可直接开工，不必重新摸索。
> 最近一次更新：2026-10-22（访客足迹 + 点赞上线，足迹地图默认显示访客视图，见 §4.2；此前：v2 改版、News 模块与 `add-news` skill）。

## 0. 一句话现状

`/Users/jclou/loujc.github.io` 是楼锦程的个人主页仓库。线上站点 <https://loujc.github.io> = 静态单页（分支 `glm53flash`）+ GitHub Actions 可用日历流水线（分支 `main`）。v2 改版经 PR [#2](https://github.com/loujc/loujc.github.io/pull/2)（`homepage-v2` → `glm53flash`）由用户确认后合并，2026-10-20 部署上线。之后 News 模块已上线；「访客足迹 + 点赞」：后端 `stats-api/` 已部署在 <https://loujc-stats.netlify.app>（2026-10-22，数据已清零）。前端已于 2026-10-22 经用户确认发布上线（`visitors` 分支并入 `glm53flash`）。

## 1. 仓库与分支

本地检出：`/Users/jclou/loujc.github.io`，当前在 `glm53flash` 分支。

| 分支 | 内容 | 备注 |
|---|---|---|
| `main` | GitHub Actions 流水线（`.github/workflows/`）+ Hugo 内容源（`data/`、`config/`） | 默认分支；**push 会触发部署** |
| `glm53flash` | 部署用的静态单页站点（index.html / style.css / script.js / portrait.jpg / uploads/cv.pdf / availability-snapshot.json）+ 不部署的 `tools/`（`gen-land-mask.mjs`、`add-news.mjs`）、`stats-api/`（访客统计后端，Netlify，单独部署）、`.claude/skills/add-news`（`.agents/skills/` 下有同名链接供 Codex 用）、本文档 | **日常工作分支**；单独 push 不一定触发部署 |
| `astra` | 旧 homepage-design-demo 设计稿（orphan 分支，仅 5 个文件） | 只读存档，不要动 |

注意：`main` 上的 `data/authors/me.yaml` / `data/zh/authors/me.yaml` 是经历/简介的"源头"，改经历时 Hugo 内容与 glm53flash 页面两边要同步（例：2021–2023 北京大学信息技术高等研究院 / 微纳核芯 算法实习研究员）。

## 2. 如何部署（有坑，必读）

- 部署由 `main` 分支的 `build.yml` 完成：checkout `glm53flash` → 按白名单拷贝 `index.html style.css script.js portrait.jpg README.md uploads availability-snapshot.json .nojekyll` 到 `public/` → 下载本次运行生成的匿名日程 artifact 放入 `public/availability/` → deploy-pages。
- **只 push `glm53flash` 不一定能触发部署**（自动化主要监听 `main` 的 push）。可靠做法：

  ```bash
  cd /Users/jclou/loujc.github.io
  git push origin glm53flash
  git worktree add ~/main-wt main
  cd ~/main-wt && git commit --allow-empty -m "chore: trigger deploy" && git push origin main
  cd ~ && git worktree remove ~/main-wt
  ```

- **白名单是写死的文件列表**：新增前端资源要么内联进 `script.js` / `style.css`，要么同步改 `main` 的 `build.yml`。地图陆地数据就是因此内联在 `script.js` 末尾（见 §4.1）。
- 部署延迟 30 秒～11 分钟（外部自动化排队）。`gh workflow run` 会 403（无 admin 权限），不要尝试。
- 访客统计后端不走这条流水线：在 `stats-api/` 目录执行 `npx netlify-cli deploy --prod`（见 §4.2）。
- 验证上线：`curl -s https://loujc.github.io | grep "<本次改动的标记字符串>"`；日程数据 `curl -s https://loujc.github.io/availability/busy.json`（`generated_at` 应为最新）。

## 3. 可用日历（隐私保护流水线，别破坏）

- 真实 iCloud 日历 → `main:scripts/generate-busy-calendar.mjs` 用 repo secrets 走 CalDAV，只输出"忙/闲"布尔，不泄露事件内容 → `availability/busy.json`（带 `access-control-allow-origin: *`）。
- 前端 `script.js` 的 `loadAvailability()`：fetch 线上 busy.json（5s 超时）→ 失败回退本地 `availability-snapshot.json` → 再失败显示"暂时无法获取"（fail-closed）。快照手动更新：`curl -o availability-snapshot.json https://loujc.github.io/availability/busy.json`。
- 时区固定 Asia/Shanghai；30 分钟粒度；展示 08:00–24:00；数据超过 6 小时标记 stale。今天"现在 + 提前量"之前的空闲视为过期（`NOTICE_MINUTES = 120`，不画绿块），今天有一条焦糖色"现在"线。
- 每次部署都会重新生成 busy.json，所以线上日程总是新鲜的。
- 预约交互（v2）：点绿色块按指针所在半小时选开始时间（悬停有虚线预览框），选中为墨色块并同步侧栏「已选时段」与日期/时间下拉；30/60 分钟切换会挪到最近可用开始时间；切周会记住每周的选择。非 UTC+8 访客在悬停提示、已选卡片、邮件正文里看到本地时间。提交前行内校验姓名/邮箱；「复制」按钮复制完整请求（微信内置浏览器 mailto 常失效）。手机（≤620px）改为日期标签 + 开始时间 chip（`#cal-list`）。
- Hero 底栏「最近可约：…」由 `nextOpening()` 算出；数据失败或 stale 时自动退回原静态文案；点击跳到该时段并选中。

## 4. 站点技术要点

- 纯静态单页，无构建步骤。本地预览：`python3 -m http.server 4174 --bind 127.0.0.1`（在 glm53flash 检出目录跑，<http://127.0.0.1:4174>）。
- 双语：`data-i18n`（textContent）/ `data-i18n-html`（innerHTML；含 `<br>`、`<em>` 的字段必须用它，否则标签会原样显示）/ `data-i18n-ph`（placeholder）/ `data-i18n-aria`（aria-label）。词典在 `script.js` 的 `I18N`。**改文案要同时改 HTML 默认英文 + 词典 en/zh 三处。**
- 主题：`<html data-theme>` + localStorage + head 内 pre-paint 脚本防闪烁；需要跟随主题重绘的模块（地图）注册到 `themeListeners`。
- 资源版本：`style.css?v=N`、`script.js?v=N`（当前 css `v=8`，js `v=6`，以 index.html 实际为准）。**改了 css/js 必须递增对应 N**，否则用户浏览器吃缓存。
- 字体用 `media="print" onload` 非阻塞加载：Google Fonts / 外链卡住时首屏照常用系统字体渲染（现网旧版在这种网络下白屏约 15s）。站点不再依赖 unpkg / Leaflet。
- 滚动揭示：只有 `<html class="js">` 时 `[data-reveal]` 才隐藏；`script.js` 一开头加 `reveal-ready`，若脚本没跑起来，CSS 回退动画 2.5s 后照样显示内容，不会整页空白。
- 全局 `[hidden] { display: none !important }`——组件里用 `hidden` 属性切换显隐即可。
- `body { overflow-x: clip }`（不是 hidden）——论文年份列的 sticky 依赖它，别改回。`.hero` 也有 `overflow-x: clip`：手机上 PCB 背景比屏幕宽，不能让它把整页撑宽。
- 网格里放可横向滚动的内容时用 `minmax(0, 1fr)`，别用 `1fr`（最小宽度=内容宽度，旧版手机日历把卡片撑到 734px 就是它）。
- 导航：桌面 scroll-spy 高亮当前板块（`aria-current`）；≤1100px 收进菜单按钮 + 抽屉（`#sheet`）——英文 7 个链接 + 4 个按钮约需 1080px，再加导航项前先量宽度。
- 动态（`#news`）：**加新闻用 `add-news` skill（Claude Code 里 `/add-news`；底层是 `node tools/add-news.mjs --date … --kind … --en … --zh …`）**。结构：静态 `<ol class="news-list">`，每条 `<li class="news-item" data-kind="paper|award|service|venture|open">` = `<time datetime>` + 类别 + `<p data-i18n-html="news.nX">`。**加新闻**：在列表最前面插一条（用新的 key，如 `news.n13`），并在 `I18N.en/zh` 各加一条；只保留最近约 7 条可见，更早的加 `data-older hidden` 折进「更早动态」（数字由 JS 自动计数）。14 天内的条目自动高亮；论文名链接到 `#pub-*` 锚点。日期只精确到月的写 `datetime="2026-05"`。
- 论文：静态 HTML（利于 SEO），每篇 `data-topic` 用于筛选；摘要在 `.pabs[hidden]` 里，BibTeX 在 `script.js` 的 `BIB`（来源 `main:content/en/publications/*/cite.bib`，两篇 arXiv 生成 `@misc`）。没有公开链接的论文只给摘要 + BibTeX，**不要再链回 `/publications/*` 旧 Hugo 页面（已 404）**。
- 项目卡片：`.stars[data-repo]` 先显示 `data-fallback` 的数字，进入视口才请求 GitHub API（缓存 12h，<20 不显示）。
- 头像区结构：`.scene`（定位容器）> `.chip-halo`（PCB 背景 SVG，内联）+ `.orbit`（右侧竖排徽标）+ `.portrait-tilt`（`.portrait` 白边圆角照片；曾有的 `.portrait-pins` 引脚装饰已按用户要求移除）+ `.caption`（左下署名）。手机场景高度 400px，保证署名不压照片底边。

### 4.1 足迹地图（Canvas 点阵，v2）

- 无瓦片、无第三方请求、**不画任何国界**（只画陆地点，规避"问题地图"风险）。陆地数据 = Natural Earth 1:50m（公有领域），以墨卡托格点位图（base64）内联在 `script.js` 末尾：`window.LAND_MASK`（欧洲—东亚，0.5°）+ `window.LAND_DETAIL`（欧洲精细层，0.125°，切到欧洲视图才解码）+ `window.LAND_GLOBE`（全世界，1°，切到访客视图才解码）。重新生成：`node tools/gen-land-mask.mjs world|europe|globe`（需先 `npm i --no-save world-atlas@2 topojson-client@3`），用输出替换对应那一行。生成器会先把跨 180° 经线的多边形（楚科奇）展开再判点。旧版没做这一步，LAND_MASK 在北纬 65–66° 有一行陆海颠倒：海面上多出一排点，西伯利亚反而缺了一排。展开以后，湖洞（里海）也要平移到外环所在的那个 360° 副本，否则里海会被填成陆地。这两个问题都已经修好，三份数据也都重新生成过了。
- **加城市**：在 `script.js` 的 `PLACES` 加一行 `{ zh, en, lat, lon, region }` 即可（`region` ∈ north/northeast/east/central/south/southwest/northwest/abroad；海外城市再加 `area: "europe" | "world"` 指定点击时飞往的视图；`kind: "home" | "now"` 只给上海/北京）。地图上的「中国 · N 城」、列表分组和「全部城市 N」都由数据自动计数，HTML 里的数字只是无 JS 时的默认值。
- 视图 `VIEWS`：world / china / europe，外加 visitors（只有拿到访客数据才显示按钮，见 §4.2）。**拿到访客数据后默认切到 visitors**（用户 2026-10-22 要求）：地图还没进入视口就直接以访客视图出现，已在看时用镜头动画飞过去；访客自己点过任何视图（按钮、城市列表、页脚链接）就不再自动切换（`chosen` 标记）；接口失败时停在 world。切换是相机式缩放（中心线性、范围几何插值），精细层在缩放过程中淡入；进出访客视图时，我的足迹层和全世界访客层用 `globeMix` 交叉淡化。
- 半调热力：离城市越近点越大越暖（`heat`），离所有足迹很远的陆地淡出（`fade`）；城市标记用 `--accent-strong`，比光晕深，保证"城市一眼可辨"。
- 标签 `LABELS` 按视图定义（全球=聚类说明 + 首尔/新加坡；中国=北京·现居/上海·家乡；欧洲=6 城），每个标签有候选锚点列表，贪心放置：不压任何城市点、不压其他标签、不压悬停提示；放不下先去后缀，再隐藏。**加标签时只需加锚点候选，别手调像素。**
- 悬停：提示名 + 从北京出发的虚线航线；「全部城市」列表悬停点亮、点击飞到对应视图。地图在进入视口时才初始化（IntersectionObserver），视口高度为 0（面板隐藏）时不会绘制，属正常。

### 4.2 访客足迹 + 点赞（Netlify Functions + Blobs）

- **结构：** 前端是 `script.js` 里的 stats 模块，后端是 `stats-api/`。
  - 接口：`POST /hit`、`POST /like`、`GET /stats`。
  - 线上：Netlify 团队 `jincheng-lou` 的站点 `loujc-stats`，地址 <https://loujc-stats.netlify.app>（账号 loujc1030@gmail.com，用 GitHub 登录）。
  - 存储：Netlify Blobs。每次来访或点赞写一条只创建、不修改的事件记录，每小时由 `compact.mjs` 合并进汇总。之所以这样设计，是因为线上实测 Blobs 的条件写入在并发时会丢更新（结构和原因见 `stats-api/lib/stats.mjs`）。
  - 部署、测试、数据管理：见 `stats-api/README.md`。`npm test` 跑本地测试；`node admin.mjs` 查看数据，加 `--wipe` 清零。
  - 前端通过常量 `STATS_API` 找到后端地址。
- **默认不显示：** `STATS_API` 为空，或者接口失败、超过 5 秒没响应，所有统计组件都保持 `hidden`，页面看起来和没有这个功能一样。
- **演示模式：** 只要是 file:// 打开，就不调用接口，固定显示 `DEMO_PLACES` 里的样例数据，浮层上标着「演示数据」；演示时点的赞存在 localStorage 的 `demo-likes`。
- **本地 http 预览会计入真实数据：** http://127.0.0.1:4174 用的是线上接口（后端的 `ORIGINS` 放行了 4174 端口），用普通浏览器打开会被算成真实访客。截图测试用无头浏览器，不会计数。测试时如果用了普通浏览器 UA，测完用 `node admin.mjs --wipe` 清零。
- **组件：**
  - **地图「访客」视图：** 全世界点阵。访客城市是鼠尾草绿圆点，面积随来访数增大；最多的 3 个城市带标签；最近一位访客的城市有脉冲；左下浮层显示总来访数（滚动数字）、国家和地区数、城市数和最近访客。
  - **点赞：** 在 slogan 带下方。点一下有心形和火花动画，每人每天最多 10 下；连点会在 600ms 后合并成一次请求；点满后按钮会抖一下。
  - **页脚：** 显示「N 次来访 · M 个国家和地区」，点击飞到访客视图。
- **城市中文名：** 访客城市的中文名查 `CITY_ZH`（`PLACES` 里的城市加上一批常见城市）；表里没有的城市，中文界面下显示英文名。
- **隐私设计：**
  - 不存 IP 和 UA，也不设 cookie。访客身份是「盐 + 日期 + IP + UA」的 SHA-256，每天换一次，一天后由每小时的定时任务删除。
  - 位置只到城市级（Netlify 的 `context.geo`）。开 VPN 的访客记成 VPN 出口所在的城市；用户本机的浏览器走代理时，出口在洛杉矶。
  - 盐 `SALT` 只保存在 Netlify 的环境变量里（production 环境，加密），不进仓库；没配置时接口直接报错，不会存下未加盐的哈希。
- **爬虫过滤：** UA 匹配 `BOTS` 的请求不计来访，也不能点赞。无头浏览器的 UA 带 `HeadlessChrome`，所以自动化测试时数字不会动；要测计数，就把 UA 换成普通浏览器的。
- **请求格式：** 前端用 `text/plain` 发 POST，属于"简单请求"，没有 CORS 预检。
- **Netlify 的坑：** 这个团队默认给所有站点开「团队登录保护」，不改的话所有请求都返回 401 登录页。`loujc-stats` 已改成生产环境公开、预览部署受保护（`sso_login_context = non_production`）。新建站点时要记得同样处理。
- **为什么用 Netlify（2026-10-21 定的）：**
  - 后端要能在中国大陆打开，又不能依赖自己的域名。
  - 当天从腾讯云上海实测：`*.netlify.app` 首页约 0.3 秒，接口约 0.8 秒（走新加坡节点）。`*.workers.dev`、`*.vercel.app`、`*.pages.dev`、`*.fly.dev` 都打不开。
- **否掉的两条路：**
  - **ChipBagel 的腾讯云服务器（`ssh ChipBagel`，上海）：** 需要 ICP 备案。`chipbagel.com` 在 GoDaddy 注册，注册时间 2026-09-25，还没备案。要备案，得先把域名转到国内注册商，而新注册的域名 60 天内不能转出。用户决定等备案下来再说。
  - **绑 `chipbagel.com` 子域名：** 用户目前登录不了 GoDaddy，加不了 DNS 记录。

## 5. 头像 PCB 背景的坐标系（改 SVG 前必读）

`.chip-halo` 现在**真正居中于照片**：CSS 用 `left:50%; top:50%; translate:-50% -50%`（commit `bff4aea` 修复。之前用 `inset:0; margin:auto`，当 560px 背景比 447px 宽的场景列大时，CSS 对水平过度约束会把 `margin-left` 归零，导致背景比照片中心右偏 56.5px）。

居中后的 SVG 坐标系（viewBox 560×560，照片中心 = 280,280）里，这三个 HTML 元素叠在 SVG 上方，是**禁区**（约为亮色模式实测值，单位 SVG 坐标）：

| 元素 | 占用区域 (x, y, w, h) | 说明 |
|---|---|---|
| `.orbit` 竖排徽标 | ≈ (493, 74, 16, 156) | 右侧竖排 "AI AGENT · EDA · 芯片设计"，锚定场景右缘 |
| `.caption` 署名 | ≈ (130, 489, 104, 39) | 左下 "Jincheng Lou · 楼锦程 / ChipBagel / 北京大学" |
| 照片本体 | (143–417, 94–466)（含 2.5° 旋转的包围盒） | 走线可以从边缘"钻出来"（起点藏进照片下方约 3–6px），但不能有完整元素落在里面 |

其余排布约定：基准点（fiducial，r6+圆点）在四边中点；左上 QFP 芯片 + 过孔组；顶边晶振；右侧上下两根短走线 + 下方电阻/电容各占一行；右下小芯片由动画虚线 `.signal` 供电；左下测试点。**任何线不能交叉、不能穿过上述禁区**——用户对重叠/杂乱非常敏感，改完必须在浏览器里亮/暗两色各截一次图核对。

## 6. 设计规范与用户偏好（用户明确说过的话，别回退）

- 品牌色 = ChipBagel BP：奶油底 `#FBF6EF`、墨 `#171717`、焦糖强调 `#B96E2C`/`#D98218`、沙 `#F0CEA2`（见 style.css tokens；暗色在 `:root[data-theme="dark"]`）。
- 板块顺序：Hero(01) → 本周空闲(02) → 关于我(03) → 动态 News(04) → 论文(05) → 精选项目(06) → 足迹地图(07) → slogan 带（下方是点赞）→ 联系(08)。
- 日历：不要任何"打开完整日程"二级链接；空闲格直接可见、纵轴标时间、随日历拉伸（`.cal-scroll` 是 flex:1 那条链）；悬停有虚线实时对应左轴时间；下方简易预约表单（mailto）。
- 文案已纠正：公司是 **SAGE / 飒智**（不是 Sazhi/思知）；slogan「心若诚，自成传奇。」；"曾任团委副书记"是过去式；"关于我"单行标题、honors 细节整体删除。
- Hero：主按钮是"本周空闲时间"（强调），次按钮"精选项目"；简介两行（ChipBagel 创始人兼 CEO / 北大博士生师从林亦波）；头像区：白边圆角照片 + PCB 背景——拱形框、照片两侧引脚线都是试过后被用户否掉/移除的形态，别加回来。
- 用户的工作方式：改版类需求先在独立 demo（`demo/`，不进部署白名单、不提交）里做并说明思路，确认后再走 PR。
- 精选项目：LEGO 大卡 + 三张小卡（EDA Paper Writing / ARIS / UnFold），小卡在 ≤920px 变 2 列（首张通栏）、≤620px 单列。
- v2 中**用户已确认（2026-10-20）**的 4 个决定，别回退：① ARIS 链接上游 `wanshuiyin/Auto-claude-code-research-in-sleep` 并标「贡献者」（原链接是 1 star 的 fork；用户在上游 contributor 列表里）；② 侧栏不再有与表单重复的大「邮件预约时间」按钮；③ 预约提前量 2 小时；④ 足迹用点阵地图（不再用 Leaflet）。

## 7. 已知坑（都踩过）

- 浏览器缓存：本地调试给 URL 加 `?t=...`；改 css/js 记得递增 `?v=N`。
- 整页截图（fullPage）会因 vh 布局 + reveal 动画出错：先 `document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-in'))` 再逐屏截。
- IAB 浏览器里 Playwright 的 `locator.click()` 容易超时：改用 `evaluate(() => document.getElementById('x').click())`。
- 截图偶发 "activity capture failed for guest"：等 2–3 秒重试。
- zsh 里 `$A:index.html` 会 bad substitution：用 `${A}` 或字面 SHA。
- abs-pos 元素比容器大时 `inset:0; margin:auto` 水平方向**不居中**（LTR 把 margin-left 归零）——这次背景偏移 56.5px 就是它，已改 `translate:-50% -50%`，新增大尺寸悬浮层时同样注意。
- 微信号 `Nikolas_loujc` 复制按钮有 clipboard + execCommand 双兜底，别删（邮箱、BibTeX、预约「复制」共用同一个 `copyText`）。
- Claude 桌面应用的预览服务器在会话闲置后会被应用停掉，用户回来就"打不开"。最稳的本地查看方式是直接用浏览器打开 `index.html`（file:// 下首屏、实时日程、地图都正常；只有本地快照回退在 file:// 下读不到）。
- 截图 / 自测时注意：地图、星标等靠 IntersectionObserver 懒启动，整页截图前要先滚到对应板块等 2 秒。

## 8. 验证清单（改动后跑一遍）

1. 本地 4174 预览：亮/暗 × 中/英各截一次 hero 和改动区域；手机宽度（~390px）确认 `document.documentElement.scrollWidth === innerWidth`（无横向溢出）。
2. 日历：空闲块、"现在"线、悬停预览框与虚线、点选后侧栏同步、空表单提交出现行内错误、「复制」得到完整请求、mailto 能弹出；手机上日期标签 + chip 可选。
3. 论文：筛选、摘要展开、BibTeX 复制；所有外链非 404。
4. 地图：全球/中国/欧洲三视图，标签不压点不重叠，「全部城市」点击能飞到对应视图；控制台无报错。
5. 访客统计（file:// 演示模式）：
   - 点赞：连点时数字跟着滚动，点满 10 下按钮会抖。
   - 访客视图：标签、浮层、脉冲、悬停提示都正常；手机上浮层排在地图下方。
   - 页脚链接能飞到访客视图。
   - 切中英文时数字格式和城市名跟着变。
   - 上线后：`curl $STATS_API/stats` 能返回 JSON，线上页面能看到点赞按钮。
6. push + main 空提交触发部署后，curl 线上确认新内容 & busy.json 的 `generated_at`。

## 9. 用户是谁

楼锦程 / Jincheng Lou，ChipBagel 创始人兼 CEO，北京大学集成电路学院博士生（导师林亦波教授）。沟通用中文；审美要求"简约、高级"，对视觉细节（重叠、间距、留白、文案口吻）非常敏感；改动要部署到线上并截图验证。

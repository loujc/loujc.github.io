---
name: add-news
description: 给 loujc.github.io 主页的「动态 / News」模块加一条新闻：把用户给的大意润色成中英双语、核实日期与事实、用 tools/add-news.mjs 写入 index.html 和 script.js、本地校验，用户要求时再部署。Use when the user wants to add a news item (动态) to the homepage.
---

# 添加主页动态（News）

动态模块在 `index.html` 的 `#news`（第 04 板块），文案在 `script.js` 的 `I18N.en` / `I18N.zh`（key 为 `news.nX`）。写入一律交给 `tools/add-news.mjs`，不要手改列表结构。

## 1. 收集信息

每条动态需要：**日期、类别、中英文各一句**。用户常常只给大意或只给一种语言——缺什么就问什么，不要编造。

- 日期：`YYYY.MM.DD`；只知道月份就写 `YYYY.MM`（不要补一个猜的日子）。
- 类别（`--kind`）：
  - `paper`：录用、预印本、Special Session 等论文相关
  - `award`：获奖、最佳论文提名
  - `service`：审稿、程序委员会等学术服务
  - `venture`：ChipBagel、创业、路演、融资
  - `open`：开源项目发布
- 涉及会议、期刊、arXiv、公司注册等可公开核实的事实，去官网或原始页面核对时间地点（录用通知日、会期、城市），在回复里附上来源。查不到的写明"未核实"，让用户确认。

## 2. 润色（中英双语）

- 一句话，客观克制：不用「重磅」「荣幸」「喜讯」之类的营销词。
- 中文：全角标点，中英文之间留空格；会议名保留英文（ICCAD 2026）；需要时在括号里补「月份 · 城市」。
- 英文：sentence case，过去式，句号结尾，例如 "accepted to ICCAD 2026 (San Jose, November)"。
- 论文名链接到页面里已有的论文锚点：`<a href="#pub-lego2">LEGO 2.0</a>`（锚点在 `index.html` 的 `id="pub-…"`）。外链要加 `target="_blank" rel="noopener"`；缩写可以写成 `<abbr title="全称">缩写</abbr>`。
- 文案里不能有反引号和换行。
- 口吻对齐现有条目，比如：
  - 受邀担任 IEEE TCAD 审稿人。 / Invited to serve as a reviewer for IEEE TCAD.
  - LEGO 2.0 与 VinePlace 被 ICCAD 2026 接收（11 月 · 圣何塞）。 / LEGO 2.0 and VinePlace accepted to ICCAD 2026 (San Jose, November).
  - ChipBagel（芯果万相（北京）科技有限公司）正式注册成立。 / ChipBagel was incorporated in Beijing as 芯果万相（北京）科技有限公司.

先把中英文发给用户过目，确认后再写入。

## 3. 写入

在仓库根目录先 `--dry-run` 看位置，再正式写入：

```bash
node tools/add-news.mjs --date 2026.10.20 --kind service \
  --en 'Invited to serve as a reviewer for IEEE TCAD.' \
  --zh '受邀担任 IEEE TCAD 审稿人。' --dry-run
```

脚本会做这些事：

- 按日期插入：新的在前，只到月份的日期排在该月靠后。
- 分配新的 `news.nX`，同时写入 `I18N.en` 和 `I18N.zh`。
- 只保留最新 7 条可见，其余折进「更早动态」，数量由页面自动统计。
- 把 `index.html` 里的 `script.js?v=N` 加一，避免读者浏览器缓存旧版。

其他修改直接改文件：

- **改措辞：** 改 `script.js` 里对应 `news.nX` 的中英两处，以及 `index.html` 里同一个 key 的英文默认文案。
- **删除一条：** 删掉对应的 `<li>` 和那两条 key，并把 `script.js?v=N` 加一。

## 4. 校验

- `node --check script.js`
- 直接用浏览器打开 `index.html`（file:// 就行），看「04 · 动态」：
  - 新条目的位置对不对；
  - 中英切换后文案是否都对；
  - 链接能不能点；
  - 控制台有没有报错。
- 14 天内的条目会自动高亮，这是正常的。

## 5. 上线（仅当用户明确要求）

按 `HANDOFF.md` §2 操作：

1. 提交到 `glm53flash` 并 push。
2. 在 `main` 上提交一次来触发部署：同步 HANDOFF，或者空提交。
3. 用 `curl -s "https://loujc.github.io/?t=$(date +%s)" | grep '<新条目里独有的文字>'` 确认已上线。部署通常需要 1–11 分钟。

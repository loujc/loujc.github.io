# HANDOFF — loujc.github.io 个人主页 · 交接文档

> 写给接下来接手这个项目的 AI agent / 开发者：读完这一页即可直接开工，不必重新摸索。
> 最近一次更新：2026-09-13（背景 SVG 重排居中 + 移除引脚线 + 板框下移）。

## 0. 一句话现状

`/Users/jclou/loujc.github.io` 是楼锦程的个人主页仓库。线上站点 <https://loujc.github.io> = 静态单页（分支 `glm53flash`）+ GitHub Actions 可用日历流水线（分支 `main`）。用户已确认的需求全部实现并上线，处于"等待用户下一步反馈"状态。

## 1. 仓库与分支

本地检出：`/Users/jclou/loujc.github.io`，当前在 `glm53flash` 分支。

| 分支 | 内容 | 备注 |
|---|---|---|
| `main` | GitHub Actions 流水线（`.github/workflows/`）+ Hugo 内容源（`data/`、`config/`） | 默认分支；**push 会触发部署** |
| `glm53flash` | 部署用的静态单页站点（index.html / style.css / script.js / portrait.jpg / uploads/cv.pdf / availability-snapshot.json） | **日常工作分支**；单独 push 不一定触发部署 |
| `astra` | 旧 homepage-design-demo 设计稿（orphan 分支，仅 5 个文件） | 只读存档，不要动 |

注意：`main` 上的 `data/authors/me.yaml` / `data/zh/authors/me.yaml` 是经历/简介的"源头"，改经历时 Hugo 内容与 glm53flash 页面两边要同步。

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

- 部署延迟 30 秒～11 分钟（外部自动化排队）。`gh workflow run` 会 403（无 admin 权限），不要尝试。
- 验证上线：`curl -s https://loujc.github.io | grep "<本次改动的标记字符串>"`；日程数据 `curl -s https://loujc.github.io/availability/busy.json`（`generated_at` 应为最新）。

## 3. 可用日历（隐私保护流水线，别破坏）

- 真实 iCloud 日历 → `main:scripts/generate-busy-calendar.mjs` 用 repo secrets 走 CalDAV，只输出"忙/闲"布尔，不泄露事件内容 → `availability/busy.json`（带 `access-control-allow-origin: *`）。
- 前端 `script.js` 的 `loadAvailability()`：fetch 线上 busy.json（5s 超时）→ 失败回退本地 `availability-snapshot.json` → 再失败显示"暂时无法获取"（fail-closed）。快照手动更新：`curl -o availability-snapshot.json https://loujc.github.io/availability/busy.json`。
- 时区固定 Asia/Shanghai；30 分钟粒度；展示 08:00–24:00；数据超过 6 小时标记 stale；今天的已过时段在格子里变暗（expired）。
- 每次部署都会重新生成 busy.json，所以线上日程总是新鲜的。

## 4. 站点技术要点

- 纯静态单页，无构建步骤。本地预览：`python3 -m http.server 4174 --bind 127.0.0.1`（在 glm53flash 检出目录跑，<http://127.0.0.1:4174>）。
- 双语：`data-i18n`（textContent）/ `data-i18n-html`（innerHTML；含 `<br>`、`<em>` 的字段必须用它，否则标签会原样显示）/ `data-i18n-ph`（placeholder）。词典在 `script.js` 的 `I18N`。**改文案要同时改 HTML 默认英文 + 词典 en/zh 三处。**
- 主题：`<html data-theme>` + localStorage + head 内 pre-paint 脚本防闪烁；Leaflet 地图瓦片随主题 `setUrl`（Esri World Light/Dark Gray Canvas；CARTO 现在要 API key，别换回去）。
- 资源版本：`style.css?v=N`、`script.js?v=N`（当前 css `v=4`，js `v=3`，以 index.html 实际为准）。**改了 css/js 必须递增对应 N**，否则用户浏览器吃缓存。
- `body { overflow-x: clip }`（不是 hidden）——论文年份列的 sticky 依赖它，别改回。
- 头像区结构：`.scene`（定位容器）> `.chip-halo`（PCB 背景 SVG，内联）+ `.orbit`（右侧竖排徽标）+ `.portrait-tilt`（`.portrait` 白边圆角照片；曾有的 `.portrait-pins` 引脚装饰已按用户要求移除）+ `.caption`（左下署名）。

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
- 板块顺序：Hero(01) → 本周空闲(02) → 关于我(03) → 论文(04) → 精选项目(05) → 足迹地图(06) → slogan 带 → 联系(07)。
- 日历：不要任何"打开完整日程"二级链接；空闲格直接可见、纵轴标时间、随日历拉伸（`.cal-scroll` 是 flex:1 那条链）；悬停有虚线实时对应左轴时间；下方简易预约表单（mailto）。
- 文案已纠正：公司是 **SAGE / 飒智**（不是 Sazhi/思知）；slogan「心若诚，自成传奇。」；"曾任团委副书记"是过去式；"关于我"单行标题、honors 细节整体删除。
- Hero：主按钮是"本周空闲时间"（强调），次按钮"精选项目"；简介两行（ChipBagel 创始人兼 CEO / 北大博士生师从林亦波）；头像区：白边圆角照片 + PCB 背景——拱形框、照片两侧引脚线都是试过后被用户否掉/移除的形态，别加回来。

## 7. 已知坑（都踩过）

- 浏览器缓存：本地调试给 URL 加 `?t=...`；改 css/js 记得递增 `?v=N`。
- 整页截图（fullPage）会因 vh 布局 + reveal 动画出错：先 `document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-in'))` 再逐屏截。
- IAB 浏览器里 Playwright 的 `locator.click()` 容易超时：改用 `evaluate(() => document.getElementById('x').click())`。
- 截图偶发 "activity capture failed for guest"：等 2–3 秒重试。
- zsh 里 `$A:index.html` 会 bad substitution：用 `${A}` 或字面 SHA。
- abs-pos 元素比容器大时 `inset:0; margin:auto` 水平方向**不居中**（LTR 把 margin-left 归零）——这次背景偏移 56.5px 就是它，已改 `translate:-50% -50%`，新增大尺寸悬浮层时同样注意。
- 微信号 `Nikolas_loujc` 复制按钮有 clipboard + execCommand 双兜底，别删。

## 8. 验证清单（改动后跑一遍）

1. 本地 4174 预览：亮/暗 × 中/英各截一次 hero 和改动区域；手机宽度（~390px）看 hero 与日历横向滚动。
2. 日历：空闲块、过期变暗、悬停虚线跟随、预约表单 mailto 能弹出。
3. push + main 空提交触发部署后，curl 线上确认新内容 & busy.json 的 `generated_at`。

## 9. 用户是谁

楼锦程 / Jincheng Lou，ChipBagel 创始人兼 CEO，北京大学集成电路学院博士生（导师林亦波教授）。沟通用中文；审美要求"简约、高级"，对视觉细节（重叠、间距、留白、文案口吻）非常敏感；改动要部署到线上并截图验证。

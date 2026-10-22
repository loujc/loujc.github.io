# 主页访客统计（Netlify Functions + Blobs）

给主页的「访客足迹」和「点赞」提供数据。线上地址是 <https://loujc-stats.netlify.app>，对应 Netlify 团队 `jincheng-lou` 下的站点 `loujc-stats`。

前端通过 `script.js` 里的常量 `STATS_API` 调用它。该常量为空时，线上不显示任何统计组件。用 file:// 直接打开 `index.html` 时，页面不会调用接口，只显示带「演示数据」标记的样例。

## 为什么放在 Netlify

- **不需要自己的域名，也不需要备案：** 直接用 Netlify 送的 `*.netlify.app` 地址。
- **国内能打开：** 2026-10 从腾讯云上海实测，接口约 0.8 秒，走的是新加坡节点。作为对比，`*.workers.dev`、`*.vercel.app`、`*.pages.dev`、`*.fly.dev` 在大陆都打不开。
- **够用、免费：** 自带城市级定位（`context.geo`）和存储（Netlify Blobs）。用 GitHub 账号就能登录，免费，不用绑卡。

## 接口

| 接口 | 作用 |
|---|---|
| `POST /hit` | 每次打开主页调用一次。同一访客当天只算一次来访，并按 Netlify 的定位累加城市级足迹；返回汇总 |
| `POST /like` `{"n":1..10}` | 点赞，每人每天最多 10 下 |
| `GET /stats` | 只读汇总：来访数、点赞数、国家和地区数、城市数、城市列表、最近一位访客 |

## 隐私设计

- **不存 IP、UA，也不设 cookie。**
  - 访客身份是 `SHA-256(盐 + 日期 + IP + UA)` 的前 12 字节，每天换一次。
  - 访客记录在一天后由每小时的定时任务删除。
  - 如果没有配置盐（环境变量 `SALT`），接口会直接报错，不会存下未加盐的哈希。
- **位置只到城市：** 用的是 Netlify 自带的定位，经纬度保留两位小数。访客开着 VPN 时，记下的是 VPN 出口所在的城市。
- **爬虫和无头浏览器不计数：** 判断依据是 UA。所以用自动化截图测试时，数字不会变。

## 数据怎么存

实测发现，Netlify Blobs 的条件写入（ETag 乐观锁）在线上并发时会丢更新。所以除了每个访客自己的点赞额度，接口从不改写多人共享的数据。具体结构见 `lib/stats.mjs`：

- `ev/<时间>-<随机串>.<内容>`：每次计入的来访、每次通过的点赞，各写一条新记录，写完不再修改。内容编码在键名里，所以一次列表请求就能读到全部记录。
- `state`：截至某个时间点的汇总，只有每小时的合并任务（`compact.mjs`）会写它。
- `seen/<日期>/<访客哈希>`：标记这位访客今天已经计过来访。
- `quota/<日期>/<访客哈希>`：这位访客今天点了几下赞。

接口返回的数字等于 `state` 加上还没合并的新记录。合并任务只处理 10 分钟以前的记录，因为列表结果可能稍晚于写入。

已知局限：每人每天 10 下的上限靠 `quota` 的条件写入保证。同一个人同一瞬间发出很多请求时，可能会多算几下；线上实测，20 个并发请求记成了 12 下。正常浏览器里不会出现这种情况：前端会把连点合并成一次请求，点满后本地也会挡住。点赞总数本身不会丢。

## 部署（已完成，重新部署时参考）

1. **登录（需要本人操作）：** 执行 `npx netlify-cli login`，在浏览器里用 GitHub 账号登录 Netlify，然后点 **Authorize**。
2. **建站、配置、部署：**

   ```bash
   cd stats-api
   npm install
   npx netlify-cli sites:create --name loujc-stats --account-slug jincheng-lou
   npx netlify-cli env:set SALT "$(openssl rand -hex 24)" --secret --context production
   npx netlify-cli deploy --prod
   ```

3. **设成公开访问：** 这个团队默认给所有站点开启「团队登录保护」，不改的话，所有请求都会返回 401 登录页。已经把 `loujc-stats` 改成生产环境公开、预览部署仍然受保护：

   ```bash
   npx netlify-cli api updateSite --data '{"site_id":"<站点 ID>","body":{"sso_login_context":"non_production"}}'
   ```

4. **验证：** `curl https://loujc-stats.netlify.app/stats` 能返回 JSON，就说明部署成功了。

改了代码以后，在本目录执行 `npx netlify-cli deploy --prod` 即可。

## 费用

Netlify 免费版每月有固定的免费额度（以官网为准），个人主页的访问量远远用不完。额度用完的话，接口会暂停到下个月，这期间统计组件自动隐藏，主页本身不受影响。

## 本地测试

```bash
cd stats-api
npm install
npm test
```

测试用的是 Netlify 官方的本地 Blobs 服务器，覆盖这些情况：
- 同一访客当天去重
- 爬虫过滤
- 点赞上限
- 并发访问和并发点赞
- 存储的键名和内容里都没有 IP、UA
- 合并的正确性和幂等性

本地服务器在几处细节上和线上不同：读数据时不带 ETag，ETag 按毫秒级修改时间生成，条件检查和写入也不是原子操作。测试开头对这几处做了修正。

## 数据管理

需要先登录，并且本目录已经关联站点（`.netlify/state.json`）：

```bash
node admin.mjs              # 各类记录的数量，以及当前汇总
node admin.mjs --compact    # 立即合并，效果和每小时的定时任务一样
node admin.mjs --wipe       # 删除全部数据，从 0 重新计数（慎用）
```

## 以后

`chipbagel.com` 备案下来以后，如果想把统计搬回自己的服务器，只要新后端保持同样的三个接口和返回格式，前端只需要改 `STATS_API`。

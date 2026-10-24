# 像素湾 PIXEL BAY · 内容数据层 + 图鉴前端审计

审计日期：2026-10-24。审计员：content-auditor。
范围：`src/object-catalog.js`（1944 行 / 62.3 KB，资产数据）、`src/showcase-models.js`（5587 行 / 212.2 KB，图鉴模型生成）、`src/showcase-studio.js`（393 行，缩略图/检视台）、`src/catalog-page.js`（654 行）、`catalog.html`（220 行）、`src/catalog.css`（1989 行）、`index.html`（259 行）、`src/style.css`（1316 行），以及两页关系与 Vite 多页配置。

约束说明：本轮**只读**，未修改 `src/`、HTML、CSS 或 git 状态；未启动 dev server / preview，未运行 `npm run build`。唯一写入的文件是本文件。所有“实测”均为 Node v22.22.2 静态导入测量（临时脚本放在 `%TEMP%`，未入仓），性能数字中凡属浏览器端推断的均标注“估算”。仓库在我开始审计前已有未提交改动（`src/city.js`、`src/object-catalog.js`、`src/showcase-models.js` 等），与本报告无关。

与已有调研/报告的关系：规划几何问题见 [`docs/planning/城市规划调研与改进方案.md`](../planning/城市规划调研与改进方案.md)；城市渲染、draw call、生命周期等见 `docs/review/notes-runtime.md`。本报告只讨论**内容数据契约、图鉴前端、两页共享与部署**；涉及 city.js 的渲染细节一律引用其结论，不重复展开。

---

## 0. 结论摘要（先看这五条）

| # | 结论 | 关键事实 |
| --- | --- | --- |
| 1 | 数据层缺少**可校验的单一契约** | 106 项资产、10 个分组、7 个 family、12 个 district；字段按 group 隐式可选，`model` 无 schema、无校验、无测试；同一 `style` 字符串被 `showcase-models.js` 与 `city.js` 两套渲染器分别解释（31 个建筑样式 × 2） |
| 2 | `features` 字段基本是**死数据** | 51 项资产共 224 个 feature token，渲染端只读了 1 个 token（`roofGarden`，`showcase-models.js:2069`），223/224 无效果；城市端完全不读 |
| 3 | 图鉴首屏把 **106 张缩略图放在主线程运行时生成** | 单 renderer 顺序生成（设计正确），但 106 次 render + `toDataURL` PNG、每 2 张才让出一帧；全量模型 12,550 个 Mesh、平均 118 Mesh/项、最大 1,135 Mesh（`s-burj`）；无缓存、无跳过，重复访问全部重来 |
| 4 | **预渲染是现成可行解** | 仓库已有离线软件光栅器 `docs/skyscrapers/render.mjs`；实测渲染全部 106 项 192×144（2× 采样）仅 **1.37 s**、产出 106 张 PNG 共 **491,779 B**（2.5–8.4 KB/张）；而当前图鉴首屏还要额外加载 618 KB（gzip 162 KB）的 three.js 共享 chunk |
| 5 | 图鉴页的 **UX/可访问性/可分享性** 明显落后于主站 | 主站支持 `?seed/?hour/?projection` 与 `replaceState`（`main.js:74-114,508-548`），图鉴没有任何 `?asset=`/history；加载遮罩期间背景可聚焦、进度更新 106 次刷屏；50 处字号 <10 px、`--faint` 对比度 3.1–3.4:1 用于 6–8 px 文字 |

**严重度结论：本轮未发现 P0 级阻断问题。** 图鉴页当前的失败模式基本都有兜底（逐资产 try/catch + Canvas 备用图 + 提示条），问题集中在**维护成本、移动端性能、可分享性与可访问性**，属于 P1/P2。P0 只存在于运行时/城市渲染侧（已由 `notes-runtime.md` 覆盖）。

### 量化基线（供复核）

| 指标 | 值 | 来源/方法 |
| --- | --- | --- |
| 资产数 / 分组 / family / district | **106** / 10 / 7 / **12** | Node 导入 `ASSETS`、`GROUPS`、`BUILDING_FAMILIES`、`DISTRICTS` |
| 分组构成 | buildings 31、skyscrapers 13、construction 7、districts 12、parks 7、attractions 5、vehicles 8、street 10、nature 7、maritime 6 | 同上 |
| id 冲突 / 非 kebab / en 非大写 | 0 / 0 / 0；但 `s-` 前缀同时被 skyscrapers 与 street 使用 | 同上 |
| model 构建（全部 106 项，Node，共享 kit） | 105 ms；**12,550 Mesh + 802 描边 LineSegments / 379,902 顶点**；平均 118.4 Mesh/项；最大 `s-burj` 1,135 Mesh / 29,732 顶点 | 临时脚本遍历 `createShowcaseModel` |
| 单个 ShowcaseKit 缓存（全量跑完） | **622 个材质**、29 个几何体、6 个描边几何、670 个可释放资源 | 同上 |
| 每项手写模型规模 | `buildBuilding` 1,283 行覆盖 31 样式；13 座摩天楼的建模代码约 2,000 行（含共享塔零件，`showcase-models.js:3103-5151`，其中逐塔入口函数合计约 1,430 行）；46 个 build/add 函数合计 5,156 行（占文件 92%）；43 条 else-if 资产分支；1,299 个 kit 调用点（750 `box`、239 `material`、158 处内联色值） | 源码统计 |
| 颜色规模 | 数据 337 个色值（distinct hex）、渲染端 243 个（375 个字面量），两者仅重合 56 个；合计 524 个 distinct | 源码正则统计 |
| 图鉴首屏首包（dist，raw / gzip） | 共享 chunk `object-catalog-*.js` 618,304 / 162,455 B（含 three.js 与资产数据）；`catalog-*.js` 118,345 / 37,629 B；CSS 27,250 / 6,400 B | `dist/assets` 实文件 gzip 测量 |
| 预渲染成本（实测） | 全部 106 项 192×144 @2× = **1.37 s**、**491,779 B** 总计（平均 4.6 KB，最大 8,398 B）；`s-burj` 单项 97 ms / 3,263 B | `node docs/skyscrapers/render.mjs --group all --w 192 --h 144 --scale 2`（输出到 `%TEMP%`） |
| 小字号 | `catalog.css` 有 **50 处 font-size < 10 px**（6/6.5/7/7.5/8/8.5/9/9.5 px）；`style.css` 24 处 | 正则统计 |
| 对比度 | `--faint #5c687a` 对 `#080d18` = **3.44:1**，对卡片底色 `#101828` = **3.14:1**（低于 WCAG AA 4.5:1）；`--muted #97a1ae` 7.42:1 合格 | WCAG 相对亮度公式 |
| accent 回退 | **33/106** 项最终显示分组 accent（6 个 nature 未定义 accent；27 个色值亮度 <0.36 被 `isReadableAccent` 拒绝） | Node 复算 |

---

## 1. P1 问题

### [P1] 数据契约分散且无校验：`model` 隐式必填、`style` 双渲染器解释、id 靠命名约定

**问题**：
1. `object-catalog.js` 用 9 个工厂函数生成资产，但每个 `model` 都是自由对象：建筑工厂只补 `kind: "building"`，其余 `width/depth/floors/walls/roof/accent/style` 全部由每条数据自己写（`object-catalog.js:3-14`）；skyscraper 工厂补了 `glass/mullion/rise/floors/tall` 等默认值，却**没有** `walls/width/depth`（`object-catalog.js:728-751`），而渲染端 `pick(rng, model.walls)`（`showcase-models.js:885,3111`）遇到缺失会直接抛错。
2. 没有 schema、没有运行时校验、没有任何测试脚本（`package.json:7-11` 只有 dev/build/preview；全仓无 `*.test.js`/`*.spec.js`）。
3. 同一个 `model.style` 被两套完全独立的渲染器解释：
   - 图鉴：`showcase-models.js:884,939-2067` 的 31 分支 `switch (style)`，另有 `TOWER_BUILDERS[style]`（`showcase-models.js:5151-5165`，13 个塔样式）；
   - 城市：`city.js:2317`（`record.style ?? def.model.style`）、`city.js:2641`、`city.js:2645-2731`，以及 `decorateCityBuilding` 的样式分支（`city.js:2311-2600` 区间）。
   新增/重命名一个 style，需要同时改两处；`city.js` 与 `showcase-models.js` 之间没有任何共享的样式枚举。
4. id 只靠前缀约定：`s-` 同时用于 skyscrapers（`s-trade`…）与 street（`s-lamp`…）；`ASSET_BY_ID` 用 `new Map(ASSETS.map(...))` 构建（`object-catalog.js:1887`），一旦未来出现跨组同 id，会**静默覆盖**而不是报错。`CITY_DISTRICT_LAYOUT` 用无前缀 slug（`object-catalog.js:1921-1927`），而 `DISTRICTS_BY_ID` 的键是 `d-*`（`object-catalog.js:1906`），城市端需要手工拼 `d-` 前缀（`city.js:4298`），这已是“约定优先于契约”的典型信号。
5. 写错字段时会静默降级而不是报错：`TOWER_BUILDERS[style] ?? buildCloudspire`（`showcase-models.js:5170`）、建筑 switch 的 `default` 通用盒子（`showcase-models.js:2060-2066`）、district 的 `DISTRICT_SLOTS[district] ?? DISTRICT_SLOTS.commercial`（`showcase-models.js:2238`）、accent 回退（`catalog-page.js:40-44`）。对内容站来说，静默降级意味着“错误资产可以正常上线”。

**证据**：
- `src/object-catalog.js:3-14`（building 工厂）、`:728-751`（skyscraper 工厂，缺 walls/width/depth 默认）、`:1064-1074`（construction）、`:1142-1152`（district）、`:1349-1359`（park）、`:1455-1465`（attraction）、`:1535-1545`（vehicle）、`:1622-1632`（street）、`:1727-1737`（nature）、`:1805-1815`（maritime）。
- `src/showcase-models.js:878-888`（无条件读取 `model.width[0]`、`model.walls` 等）、`:939-2067`（31 样式 switch）、`:2060-2066`（default 兜底）、`:5151-5170`（塔样式注册表 + 静默 fallback）、`:3111`（`pick(rng, model.walls)`）。
- `src/city.js:2317,2641,2645-2731`（第二套按 style 的渲染）、`:4298`（`DISTRICTS_BY_ID.get(\`d-${block.district}\`)`）。
- `src/object-catalog.js:1887`（`ASSET_BY_ID` 静默建 Map）、`:1899-1906`（按组重复 Map）、`:1921-1944`（`CITY_DISTRICT_LAYOUT`/`transformDistrictLayout`，应用代码零引用）。
- `package.json:7-11`（无 test/lint 脚本）。

**影响**：
- 内容资产是“代码 + 数据”混写，新增一项资产或一个样式要跨 2–3 个文件手工对齐，任何字段遗漏的报错只在浏览器特定资产渲染时才出现。
- id 冲突、style 拼写错误、district 前缀错误都会静默得到“另一个模型/默认盒子”，测试环境很难发现。
- 这是当前 7,500 行资产/模型代码继续增长时最大的长期成本。

**具体改法**（按投入从低到高）：
1. 新增只读校验脚本 `docs/review/audit-catalog.mjs`（可仿照已有 `docs/planning/audit.mjs` 的形式，`node` 直接跑、不依赖浏览器）：
   - 校验 id 唯一、前缀→group 映射唯一、`en` 大写、`facts.length === 3`、必填字段（按 kind 白名单）；
   - 校验 `districts` 引用能解析到 district 资产、`CITY_DISTRICT_LAYOUT` 单元格能解析；
   - 校验 `model.style` 存在于 `showcase-models` 的注册表（把注册表导出成可导入的常量）；
   - 打印每个 style/kind 的资产数与 Mesh 预算，接入 CI 或 `prebuild`（不启动 server 即可执行）。
   工作量：0.5 人日（脚本 150–250 行）。
2. 在 `object-catalog.js` 内用 `familyDefaults`/`styleDefaults` 合并默认值（例如 building 的 `floors/width/depth/walls/roof` 给统一缺省），减少每条数据的重复字段；同时把工厂改为在开发模式断言必填字段。工作量：0.5 人日。
3. 把“样式 → 构建函数”注册表收敛为一份可导入的 `STYLE_REGISTRY`，`showcase-models` 与 `city.js` 共同引用（或至少由校验脚本对比两边的 key 集合）。工作量：1 人日。
4. 中期：把 `city.js` 的城市版渲染与图鉴版渲染合并成“同一几何工厂 + 两个 LOD”的方案，避免两套手写模型；这是跨模块改造，需与运行时审计结论一起排期。工作量：5–8 人日。

---

### [P1] `model.features` 是死数据：51 项资产、224 个 token，渲染端只用 1 个

**问题**：资产数据为 51 项资产（31 buildings + 13 skyscrapers + 7 parks）写了 `features` 数组，共 224 个 token、135 个不同值；这些 token 的设计意图明显是“可组合的构件描述”（`porch`、`balconies`、`sawtooth`、`coolingTower`…）。但全仓检索后，渲染代码只读取了其中 1 个：`showcase-models.js:2069` 的 `asset.model.features?.includes("roofGarden")`，而 `roofGarden` 仅出现在 `b-highrise` 一项资产上。`city.js` 完全不读 `features`；图鉴卡片/详情页展示的是 `facts` 与 `tags`，也不展示 features。

**证据**：
- `src/object-catalog.js:116,136,156,…`（共 52 处 `features: [` 数组，含 skyscraper 工厂默认 `features: []`，行号 748）。
- `src/showcase-models.js:2069`（唯一消费点：`if (asset.model.features?.includes("roofGarden") && style !== "skygarden")`）。
- `src/city.js`（`features` 零匹配；城市端模型由 `decorateCityBuilding` 等手写）。
- Node 统计：`features` 覆盖 buildings 130 token、skyscrapers 61 token、parks 33 token；仅 `b-highrise` 命中 `roofGarden`。

**影响**：
- 数据文件里约 220 个 token、500+ 行“看起来像配置”的内容实际上不生效；改这些 token 不会改变任何画面，容易误导后续维护者。
- 也说明“数据驱动建模”的雏形（features 列表）没有被兑现，真正决定外观的是 switch 分支——内容与表现是两条互不相干的线。

**具体改法**：
1. 短期（推荐）：删除 `features` 字段，把仍需要影响外观的 `roofGarden` 改为一个明确的 `model.roofGarden: true` 或归入 style；同时把 `features` 中确有策展价值的关键词（如“双塔”“空中连廊”）迁移到 `tags`（详情页已有 tags 展示）。工作量：0.5 人日（数据清理 + 一处渲染判断）。
2. 中期（可选）：真正实现组合式特征——建立 `FEATURE_BUILDERS = { awning: addAwning, balconies: … }`，`buildBuilding` 先按 style 生成主体、再按 features 叠加构件；这样才值得保留这份数据。工作量：3–5 人日，且需要与美术/测试过 51 项资产的外观回归。
3. 无论选哪条，都应在校验脚本里规定“字段被引用”的检查（避免再出现死字段）。工作量：含在上一项校验脚本内。

---

### [P1] 图鉴首屏运行时生成 106 张 WebGL 缩略图：12,550 Mesh、无缓存、无跳过

**问题**：
- 缩略图确实只用了**一个**共享 `WebGLRenderer` + 一个 scene + 一个 kit，逐资产 `renderAsset`（`showcase-studio.js:143-205`），不是“每卡一个 context”（这点设计是对的，`catalog.html:81` 的“共享 WebGL 渲染器”文案属实）。
- 但 `generateThumbnails` 在**主线程串行**跑完 106 项：每项都要 `createShowcaseModel` → `renderer.render` → `renderer.domElement.toDataURL("image/png")`（`showcase-studio.js:178-205`，`199` 行是同步 PNG 编码），并且**每 2 项才 `await nextFrame()`**（`catalog-page.js:474-490`，`486` 行）。按 Node 静态构建测量，全量 106 项合计 12,550 Mesh、379,902 顶点、平均 118 Mesh/项、最大 1,135 Mesh（`s-burj`）；单个共享 kit 会累积 622 个材质。浏览器端还要叠加 106 次 GPU 渲染 + 106 次 PNG 编码。
- 生成期间整页被全屏 loader 遮挡，没有跳过/提前进入，也没有任何缓存：刷新即全部重来；`localStorage`/IndexedDB/Service Worker/预置图片均没有。首屏图片全部 `image.loading = "eager"`（`catalog-page.js:239`），106 张 data URL 会在生成过程中陆续解码。
- 依据同类页面的经验值估算（未在浏览器实测，建议用 Performance 面板确认）：桌面端约 2–4 s，中端移动端约 8–20 s，且主线程以“2 张一组”的节奏被占用。

**证据**：
- `src/catalog-page.js:454-491`（生成循环）、`:486`（每 2 项让出 1 帧）、`:478`（`studio.renderAsset`）、`:489`（生成完才 `studio.dispose()`）、`:442-447`（完成前 loader 一直遮挡）、`:239`（eager 图片）。
- `src/showcase-studio.js:143-218`（单 renderer）、`:146-151`（`preserveDrawingBuffer: true`）、`:178-205`（`renderAsset`）、`:198-199`（同步 render + `toDataURL`）。
- 模型复杂度与材质缓存：见本文件第 0 节量化基线（Node 实测 12,550 Mesh / 622 材质；可用 `docs/review/notes-runtime.md` 的探针方法交叉验证）。
- 首包：`dist/assets/object-catalog-*.js` 618,304 B（gzip 162,455 B）包含 three.js 与资产数据，`catalog-*.js` 118,345 B（gzip 37,629 B）——图鉴页为了生成缩略图必须先下载完整 three.js。

**影响**：
- 移动端/低端设备首屏等待长、耗电高；网络慢时 three.js 下载 + 106 次生成叠加；用户可能在 loader 阶段直接离开。
- 每次访问都重复同样的确定性工作（seed 固定为 `catalog:${id}:v1`，`catalog-page.js:26`），完全没有利用“结果可缓存”这一事实。
- 对 SEO/分享也不利：无 JS 抓取时页面正文为空（`catalog.html:110` 的 `#catalogSections` 由 JS 填充）。

**具体改法**（推荐组合 A+C）：
- **A. 构建期预渲染（首选，仓库已有现成工具）**：`docs/skyscrapers/render.mjs` 是离线软件光栅器（`docs/skyscrapers/render.mjs:1-14`，注释明确说明“渲染与图鉴缩略图相同的 scene graph”），支持 `--group/--ids/--out/--w/--h/--scale`（`render.mjs:7-11,23-53`）。实测 `node docs/skyscrapers/render.mjs --group all --out %TEMP% --w 192 --h 144 --scale 2`：**1.37 s 产出 106 张 PNG、总计 491,779 B（2.5–8.4 KB/张）**。把它扩成 `scripts/prerender-catalog.mjs`：
  - 增加 platform + 投影阴影 + 描边 LineSegments + alpha 通道（当前 rasterizer 只遍历 `isMesh`，跳过描边；背景是不透明渐变，约 1–2 人日）；
  - 输出 `public/catalog/<id>.png`（或 WebP/AVIF），卡片改用 `<img src>` + `loading="lazy"` + `decoding="async"`；
  - 图鉴页只在打开检视台时 **动态 import** `showcase-models + three`（首次打开再加载、显示“实时模型加载中”），首包 JS 可从约 200 KB gzip 降到约 20–40 KB，并删掉 618 KB three 共享 chunk 的图鉴首屏依赖。
  工作量：1–2 人日（rasterizer 增强 + 页面接入）+ 0.5 人日（动态 import 检视台）＝**约 2 人日**。
- **B. 若必须保留运行时生成**：用 IndexedDB/ObjectURL 按 `catalog:<id>:v1` + 构建函数哈希缓存 PNG；把生成改为 `requestIdleCallback`/分片（每片 4–8 张，片间让出 2 帧）；首屏先渲染前 12–20 张并允许滚动；每张生成后立即用 `createImageBitmap`/`img.decode()` 预热。工作量：1–1.5 人日。
- **C. 低成本兜底（与 A/B 兼容）**：loader 增加“跳过生成，先看列表”按钮；卡片先显示占位图，生成后再替换；支持 `prefers-reduced-motion`/低端设备直接使用预置图。工作量：0.5 人日。

---

### [P1] 检视台持续每帧渲染，最重模型 1,135 Mesh/帧

**问题**：`createInspectorStage` 在弹窗打开期间用 `requestAnimationFrame` 循环，每帧 `controls.update()` + `renderer.render()`（`showcase-studio.js:329-337`）；即使用户不操作、即使 `prefers-reduced-motion` 已关闭自动环绕（`showcase-studio.js:268,280-282`），循环照旧。最重的 `s-burj` 模型 1,135 Mesh + 61 条描边，约 1,196 次 draw call/帧；`s-empire` 760、`s-petronas` 587、`s-chrysler` 569。渲染内部分辨率只有 280–520 px 宽（`showcase-studio.js:294-303`），但 draw call 不随分辨率下降。移动端长时间停留 = 持续发热/掉电。

**证据**：`src/showcase-studio.js:329-337`（`startLoop`）、`:344-369`（`show` 启动循环）、`:371-374`（`hide` 才停止）、`:294-303`（内部尺寸上限 520）、`:268`（autoRotate 初始化）；模型规模见第 0 节（`s-burj` 1,135 Mesh，数据来自 Node 探针）。
另见 `docs/review/notes-runtime.md`：城市页 6,301 Mesh/帧的 draw call 问题同源，但图鉴检视台的差异在于它**只在弹窗期间渲染**，因此可用“按需渲染”彻底消除。

**影响**：移动端检视弹窗停留时耗电/发热明显；低端设备掉帧导致拖动旋转不跟手；用户即使只看静态画面也在持续消耗 GPU。

**具体改法**：
1. 改为**按需渲染**：`controls.addEventListener("change", requestRender)`，仅在交互/自动环绕开启时跑短循环；`autoRotate` 关闭后完全停帧；用 `ResizeObserver`/打开动画结束触发一次渲染。
2. `visibilitychange`/弹窗隐藏时暂停；`renderer.render` 前后加脏标记。
3. 若保留自动环绕（默认开启），用 `renderer.setAnimationLoop(null)` 在 `document.hidden` 或用户 5 s 无操作后降级为 30 fps 或停止。
4. 可选：按模型 Mesh 数设上限（如 >600 Mesh 的塔楼在检视台使用 `buildBuilding(..., {mini:true})` 或简化版），或对塔楼做一次 LOD。
工作量：0.5–1 人日。

---

### [P1] 图鉴没有深链接与历史管理，与主站的可分享能力不对称

**问题**：主站支持 URL 状态：`?seed=`、`?hour=`、`?projection=`，并用 `history.replaceState` 同步（`main.js:74-114,508-548`），所以“同一串种子生成同一座城”的分享链路完整。图鉴页则**完全没有**读取 `window.location`/`history` 的代码：打开详情、切换分组都不会改变 URL，关闭后不能前进/后退，不能把“某个资产”的链接发给别人。分组 `<section>` 已有 `id="group-<id>"`（`catalog-page.js:280-283`），但没有锚点入口，属于“留了钩子没用”。

**证据**：
- `src/catalog-page.js`：全文件无 `location`/`history`/`URLSearchParams` 匹配（全局检索结果为空）；`bootstrap` 只做 DOM 构建与缩略图生成（`:641-652`）；`openInspector`/`closeInspector` 不写 URL（`:548-606`）。
- `src/main.js:74-114`（读 URL 参数）、`:508-548`（`URL` + `history.replaceState`）＝可复用的既有模式。
- `catalog.html:25,120`（返回城市链接为纯 `/`，会把 `?seed=` 丢掉）；`catalog-page.js:280-283`（section id 未被任何链接使用）。
- 分组筛选目前只切换 `hidden` 与 `aria-pressed`（`catalog-page.js:174-197`），无 URL 表达。

**影响**：图鉴作为“档案/图鉴”类内容页，核心价值之一就是可检索、可分享；现在用户只能口头描述“第三组那个塔”。也无法从城市页点某一栋楼跳到它的图鉴条目（见 P2 互链项）。

**具体改法**：
1. 支持 `/catalog.html?asset=b-cottage`（或 `#asset=b-cottage`）：`bootstrap` 末尾解析参数，命中则滚到卡片并 `openInspector`；打开时 `history.pushState`，关闭时 `history.back()`/`replaceState`，监听 `popstate` 恢复。
2. 分组筛选同步 `?group=buildings`（或 `#group-buildings`），用 `<a>` 或 `history.replaceState`；section 已有 id 可直接复用。
3. 返回城市时保留当前 city 的 seed（从 `referrer`/`localStorage`/sessionStorage 带回，或链接到 `/?seed=...`）。
4. 补一条“复制链接”按钮（图鉴已在每条卡片有 index，可用 `?asset=`）。
工作量：0.5–1 人日。

---

### [P1] 加载/弹窗的焦点与可访问性：遮罩不 inert、进度 live region 刷屏、无跳转链接、106 个 Tab 停靠点

**问题**：
1. **加载阶段无焦点管理**：`#loader` 是盖满全屏的 `role="status" aria-live="polite"` 容器（`catalog.html:129-166`），但主内容 `#catalogSections` 在 loader 之前就构建完毕、卡片是可聚焦的 `<button>`（`catalog-page.js:306-311`，卡片在 `:223` 创建）。loader 显示期间按 Tab 会把焦点移到被遮住的卡片上；没有 `aria-busy`、没有 `inert`、没有把焦点限制在 loader 内。
2. **live region 刷屏**：`loaderProgress`（`role="progressbar"`）嵌在 `aria-live="polite"` 的 loader 里，`updateLoader` 每生成 1 张就改一次 `aria-valuenow` + `loaderCurrent` 文本（`catalog-page.js:314-331`），106 次更新会被读屏软件持续播报；loader 的 `loaderGroups` 还每张切换 `is-active/is-done` class（非文本变化不播报，但可读文本变化仍在）。
3. **错误/提示不可感知**：`archiveNotice` 是普通 `div`（`catalog.html:109`），`showNotice` 只设 `textContent`（`catalog-page.js:426-429`），没有 `role="alert"/status` 或 `aria-live`；WebGL 不可用、部分缩略图失败等关键信息读屏用户收不到。
4. **键盘导航成本高**：106 张卡片各是一个 Tab 停靠点（`createCard` 用 `<button>`，`:223`），没有 roving tabindex/方向键网格导航/分组内跳转；没有 skip link。筛选结果变化（`filterResult`，`:187`）与筛选后隐藏分组都不播报。
5. **弹窗本身做得不错**：`role="dialog" aria-modal`、`aria-labelledby/describedby`、Esc 关闭、焦点陷阱、关闭后焦点归还（`catalog-page.js:586-605,608-628`）都已实现，属于正面项；但背景内容未 `inert`/`aria-hidden`（仅靠 `aria-modal` 语义），Safari/VoiceOver 等实现可能仍可访问背景。

**证据**：`catalog.html:129-166`（loader）、`:109`（notice）、`:168-183`（dialog 属性）；`catalog-page.js:306-311`（内容先建）、`:223`（卡片 button）、`:314-331`（106 次进度更新）、`:426-429`（notice）、`:586-628`（焦点处理）、`:187`（筛选结果）。
对比主站：`index.html:74-94` 的 info 面板打开时也未做焦点管理（同类问题，说明这是项目级模式）。

**影响**：使用键盘/读屏/放大镜的用户几乎无法完成“加载 → 筛选 → 打开详情”的主流程；加载 10 秒期间 Tab 会进入不可见区域；错误提示不可感知。

**具体改法**：
1. 加载期间给 `#catalogMain` 加 `aria-busy="true"` 并 `inert`（或 `aria-hidden`），loader 用 `aria-live="polite"` 但只暴露低频状态（“正在生成缩略图 32/106”每 ~15 张更新一次，或把进度文案放到 `aria-live="off"` 的视觉层、另设一个节流后的 `role="status"`）。
2. `archiveNotice` 改为 `role="status"` + `aria-live="polite"`；fatal 场景用 `role="alert"`。
3. loader 完成后把焦点送到 `#catalogMain`（或第一个分组标题，加 `tabindex="-1"`）。
4. 增加 skip link（跳到筛选/内容）；卡片网格加 `role="grid"`/`aria-rowcount` 或至少 roving tabindex + 方向键；分组标题可聚焦。
5. `filterResult` 加 `role="status" aria-live="polite"`（或合并到通知区）。
工作量：1–1.5 人日。

---

### [P1] 小字号与低对比度：50 处 <10 px、`--faint` 3.1–3.4:1

**问题**：设计上大量使用 6–9.5 px 的“像素风小字”，其中不少是**正文/信息性文本**而非装饰：
- `--faint: #5c687a` 对深色底对比度 3.14–3.44:1，低于 WCAG AA 对普通文本的 4.5:1；而它被用于卡片副标题（`.card-en` 7 px，`catalog.css:935-940`）、事实标签（`.card-fact i` 6 px，`:970-974`）、页脚（6.5 px，`:1114-1119`）、检视台提示（`:1506`、`:1652`）、筛选标签/结果（`:517-524`、`:602-608`）等。
- `catalog.css` 共 50 处 `font-size < 10px`；移动端断点还把 `.card-en` 压到 6 px（`:1963-1965`）。在 320–430 px 宽的手机上，6–7 px 的英文/数字实际上不可读。
- 深色底上的 accent 文本大多是合格的（`#ffd166` 13.5:1、`#72cec0` 10.5:1），问题集中在 `--faint` 与极小字号；`.filter-chip.is-active b` 的 `rgba(23,26,29,.65)` 叠在 accent 底色上也偏低（`:592`）。

**证据**：`src/catalog.css:8`（`--faint`）、`:935-940`、`:963-974`、`:1006-1012`、`:1114-1119`、`:1506-1512`、`:1652-1657`、`:1963-1965`、`:592`；字号统计见第 0 节（50 处 <10 px）。对比度计算用 WCAG 相对亮度公式，背景取 `#080d18` 与卡片 `#101828`。

**影响**：低视力用户、阳光下看手机的用户、以及一般用户在移动端都会读不清标签；对一个以“档案/图鉴”为核心内容的产品，这直接损害信息获取。

**具体改法**：
1. 把 `--faint` 提到约 `#7f8b9c`（对 `#080d18` ≈ 5.2:1）或仅在非文本装饰上继续使用 `--faint`；文本类改用 `--muted`。
2. 信息性文本设下限：移动端 ≥11 px、桌面 ≥10 px；`.card-en` 一类英文副标题可保留小字号但提升对比度并允许 `letter-spacing`。
3. 像素美术风格可以保留装饰性微缩文字，但需标记为非信息性（或提供可读替代）。
工作量：0.5 人日（token + 20 处左右规则改写 + 视觉回归）。

---

### [P1] 两页设计系统重复且已漂移：4 个同名组件、两套 :root、重复 keyframes

**问题**：`catalog.css`（1,989 行）与 `style.css`（1,316 行）各自定义了一套几乎相同的设计系统，但没有任何共享文件：
- 两套 `:root` 重复定义 `--ink/--panel/--cream/--muted/--faint/--gold/--coral/--teal/--line/--font/--cut`（`catalog.css:1-19`，`style.css:1-15`），且值已经漂移：`--coral` `#ef816c` vs `#ed826b`；`--cut` 9 px vs 8 px；`--panel-strong` alpha .96 vs .93；`--line` alpha .15 vs .17。
- 4 个同名组件重复实现：`.panel`（`catalog.css:112` / `style.css:90`）、`.live-dot`（`catalog.css:272` / `style.css:200`）、`.info-corners`（`catalog.css:142` / `style.css:870`）、`.no-script`（`catalog.css:1661` / `style.css:1068`）。
- 重复 keyframes：`@keyframes blink` 两边各写一遍（`catalog.css:1676`、`style.css:1078`）；扫描线特效 `scan` 与主站 `boot-slide` 思路相同但实现两套。
- 两页都各自内联了 loader/boot 的 DOM 与样式：`catalog.html:129-166` vs `index.html:235-244`。

**证据**：上述行号；另有 `catalog.css:492-500`（sticky filter rail + `backdrop-filter: blur(14px)`）与 `style.css` 的 `.panel` 使用同一视觉语言但各自维护。

**影响**：任何视觉调整（配色、圆角切角、focus 色）都要改两处，且已经出现值不一致；新增第三个页面时重复会继续放大。两页观感“像同一个设计系统”是优点，但实现上没有单一来源。

**具体改法**：
1. 抽 `src/tokens.css`（:root 变量唯一来源）与 `src/ui-base.css`（reset、`.panel`、`.live-dot`、`.info-corners`、`.no-script`、focus-visible、reduced-motion 基础规则），两页 `@import` 或由 Vite 入口引入；每个页面只保留页面专属样式。
2. 统一 `--coral/--cut/--panel-strong/--line` 的取值（以主站或图鉴之一为准）。
3. loader/boot 组件化（同一结构与 CSS，文案参数化）。
工作量：1 人日（含两页视觉回归）。

---

### [P1] 体积与重复：7,500 行资产/模型代码、塔楼建模约 2,000 行、颜色散落

**问题**：
- `object-catalog.js` 1,944 行 + `showcase-models.js` 5,587 行，是仓库中与 `city.js` 并列的最大两块内容代码；其中 **5,156 行（92%）是手写的 build/add 函数**（46 个函数）。31 个建筑样式平均 41 行/样式（`buildBuilding` 1,283 行）；13 座摩天楼的建模代码约 2,000 行（`showcase-models.js:3103-5151`，逐塔入口函数合计约 1,430 行：`buildChrysler` 202 行、`buildBurjKhalifa` 175、`buildTaipei101` 166、`buildEmpireState` 132、`buildOneWtc` 100…）。
- 逐资产分支：全文件 43 条 `else if` 资产分支 + 31 个 building case + 13 个 tower builder；`buildMaritime`（476 行）只服务 6 艘船，`buildAttraction`（256 行）只服务 5 个设施。对一个“图鉴展示”页面，这些手写塔楼是**一次性内容**（13 项），却全部进入图鉴首屏 bundle（`catalog-*.js` 118,345 B）——即使首屏缩略图改用预渲染，检视台也只需要在打开时加载。
- 颜色与设计 token 没有单一来源：渲染端硬编码 375 个色值（243 distinct），数据层 337 distinct，二者仅重合 56 个；大量重复色（`#6e9452` 16 次、`#ffd166` 12 次、`#ef816c` 10 次）散落在各处。
- 重复的还有：数据索引 Map（`ASSET_BY_ID` + 8 个分组 `*_BY_ID`，见 P2）、`FAMILY_TINTS` 在前端 JS 里又写一遍（`catalog-page.js:4-12`）、district 的 4 份词汇表（见 P2）。
- `ShowcaseKit` 本身设计质量**好**（见“正面发现”），但它把“每个资产手写一套模型”这件事的结尾包装得很好，容易掩盖内容层的重复成本。

**证据**：见第 0 节量化基线；`src/showcase-models.js:878-2075`（buildBuilding）、`:2976-3452`（maritime）、`:5332-5587`（attraction/入口）、`:5151-5165`（塔注册表）；`src/catalog-page.js:4-12`；`src/object-catalog.js:1887-1906`。
（城市渲染侧的体积/拆 Mesh 问题见 `notes-runtime.md`，此处只谈内容代码的重复与打包边界。）

**影响**：内容迭代（改一栋楼、加一个资产）需要理解 5,500 行手写几何；图鉴首屏为 13 个一次性塔楼付费；颜色调整需要跨数据/渲染/前端三处搜索。规模继续增长时会出现“不敢改”的状态。

**具体改法**：
1. **拆模块 + 懒加载**（0.5–1 人日）：把 `showcase-models.js` 按组拆成 `showcase/buildings.js`、`showcase/towers.js`、`showcase/districts.js` 等；`createShowcaseModel` 保持统一入口，用动态 `import()` 按 kind 加载；图鉴首屏只加载数据 + 卡片，检视台首次打开再加载模型代码。
2. **参数化现有结构**（3–5 人日）：`towerPlaza/towerLobby/towerCurtain/towerMasonry/towerRailing/towerParapet/towerNeedle` 已经是可复用的“塔楼零件”（`showcase-models.js:3147-3451`），13 座塔楼可改为“零件组合 + 少量专属顶部”，把 ~1,800 行压到约 600–900 行；建筑样式同理，可抽 `facade/windows/roof/sign` 组合函数（`addWindowGrid/addStorefront/addAwning/addSign/addPeakedRoof` 已具备）。
3. **颜色 token 化**（1 人日）：把高频色值提为 `PALETTE` 常量（数据与渲染共用），校验脚本禁止渲染端新增未登记色值。
4. 删除已确认无消费的 `features`（见 P1）与死导出（见 P2），可减少约 200–300 行数据和重复索引。

---

### [P1] 部署与 SEO：Vite 多页已配好，但根绝对路径、无 OG/结构化数据、正文 JS 生成

**问题**：
- Vite 多页输入配置正确（`vite.config.js:4-12`，city + catalog 两个入口），dev 下直接访问 `/catalog.html` 可行；但没有设置 `base`，构建产物与页面链接全部是**根绝对路径**：`dist/catalog.html:18-20` 的 `/assets/...`、`catalog.html:25,120` 的 `href="/"`、`index.html:207` 的 `/catalog.html`。若部署到子路径（GitHub Pages project page、内网子目录），图鉴页会白屏/样式丢失。
- SEO/分享元数据缺失：两页都只有 `description` 和 `title`（`catalog.html:8-12`、`index.html:8-12`），**没有** `og:`/`twitter:`/`canonical`/JSON-LD；没有 `robots.txt`/`sitemap.xml`（仓库无 `public/` 目录）。图鉴正文由 JS 生成（`catalog.html:110` 的 `#catalogSections` 为空 div），无 JS 抓取只能看到 noscript 提示（`catalog.html:214-216`）——106 个资产条目对搜索引擎/社交预览不可见。
- 两页互链存在（`index.html:205-218` 图鉴按钮、`catalog.html:25,120` 返回城市），但都是根路径；从城市页进入图鉴不携带 seed，从图鉴返回城市也不携带筛选/资产上下文（见 P1 深链接项）。

**证据**：`vite.config.js:4-12`；`dist/catalog.html:18-20`、`catalog.html:25,120`、`index.html:207`（根绝对路径）；`catalog.html:8-12`、`index.html:8-12`（head 元数据）；全文检索两页无 `og:|twitter:|canonical|application/ld`；仓库无 `public/`、`robots.txt`、`sitemap.xml`。

**影响**：部署到非根路径即坏链；分享图鉴/城市时没有卡片预览；搜索引擎收录不到 106 个条目，图鉴作为“档案”的长期价值受限。

**具体改法**：
1. 部署路径：若目标静态托管支持根路径则文档化“必须部署在域名根”；否则在 `vite.config.js` 设 `base: "./"`（相对路径），并把页内绝对链接改为相对（`./catalog.html`、`./`）。工作量：0.2 人日。
2. 元数据：两页补 `og:title/og:description/og:type/og:url/og:image`、`twitter:card`、`link rel="canonical"`；OG 图可用预渲染出的主视觉（与 P1 预渲染管线共用）。工作量：0.3 人日。
3. 可索引性：预渲染卡片列表为静态 HTML（SSG/构建期注入），或至少把 106 个条目名/分类/描述写入 `<noscript>` 之外的静态 `<ul>`（视觉隐藏也可）；加 `sitemap.xml`（含 catalog 与各分组锚点）。工作量：1–2 人日（与预渲染管线合并）。
4. 互链增强：城市 → 图鉴携带 `?from=city&seed=`；图鉴返回城市时带回 seed。工作量：0.2 人日。

---

## 2. P2 问题

### [P2] 硬编码计数与数据现状不符：文案写 99，实际 106；district 写 10，实际 12

**问题**：`catalog.html` 的静态 HTML 里散布着旧数据：总资产 99（`:35,44,50,74,77,101,103,118,147,154,201`）、分类 10（正确）、建筑 31（正确）、街区 10（实际 12，`:65`）。JS 启动后 `updateStaticCounts` 会用 `ASSETS.length`/`groupCounts` 覆盖大部分节点（`catalog-page.js:103-121`），所以运行时短暂闪一下错值；但 no-JS、首屏 SEO、社交抓取、以及维护者阅读源码时都是错的。这也说明“派生的数字被写死在模板里”这一模式本身就是维护隐患。

**证据**：`catalog.html:35,44,50,65,74,77,101,103,118,147,154,201`；`catalog-page.js:103-121`；Node 实测：ASSETS=106、DISTRICTS=12、buildings=31。

**影响**：文案与数据不一致；每次增删资产都要手工改 HTML 多处；SEO/no-JS 场景展示错误数字。

**具体改法**：把 HTML 中的数字替换为占位符（如 `—`/`000`）并由 JS 填充；或用构建期小插件把数据注入模板；`catalog.html:44` 的整句也可改为由 JS 填充。工作量：0.2 人日。

### [P2] district 词汇存在 4 份实现，`CITY_DISTRICT_LAYOUT` 是死代码且键不匹配

**问题**：
1. `object-catalog.js:1921-1944` 的 `CITY_DISTRICT_LAYOUT` 与 `transformDistrictLayout` 在整个 `src/` 中**零引用**（已用符号全仓检索确认）；且布局里写的是 `oldtown/...` 无前缀 slug，而 `DISTRICTS_BY_ID` 的键是 `d-oldtown`（`object-catalog.js:1906`），直接 `DISTRICTS_BY_ID.get(layoutRow[0])` 会得到 `undefined`。
2. district 词汇实际散落 4 处：`object-catalog.js` 的 12 个 district 资产与 9 种 building `districts` 引用；`city-plan.js:37-193` 的 14 个 zone（`district: "downtown"` 等）；`showcase-models.js:2077-2159` 的 `DISTRICT_SLOTS/PARKS/ROAD`（10 个键，`amusement/construction` 无配置，走默认分支）；`city.js` 里的 `d-` 前缀拼接（`city.js:4298`）与 district 专属分支。没有任何一处是单一事实源。
3. `showcase-models.js:2238` 对未知 district 静默回退到 `commercial` 的摆放槽位；新增一个 district 资产很容易“能打开但摆错”。

**证据**：`object-catalog.js:1921-1944,1906,1154-1348`；`city-plan.js:37-193`；`showcase-models.js:2077-2159,2238,2259`；`city.js:4298`。

**影响**：新增/重命名 district 需要同时改 4 处；死代码让读者以为布局是数据驱动的（实际不是）。

**具体改法**：删除 `CITY_DISTRICT_LAYOUT`/`transformDistrictLayout`；把 district 的槽位配置（`DISTRICT_SLOTS/PARKS/ROAD`）迁入 district 资产的 `model`（它已有 `samples/props/parkType/ground`）；统一 id 采用 `d-*` 或全部去前缀，且在 `DISTRICTS_BY_ID` 旁提供 `getDistrict(slug)` 处理归一化。工作量：0.5–1 人日。

### [P2] 死导出与重复索引：8 个 Map/函数无引用，图鉴页还自行重建索引

**问题**：`object-catalog.js:1887-1919` 导出了多层重复索引：`ASSET_BY_ID`、8 个分组 `*_BY_ID`、`BUILDINGS_BY_FAMILY`、`getGroup`、`getGroupAssets`。全仓检索（`src/` + `docs/` 脚本）显示：`SKYSCRAPERS_BY_ID`、`CONSTRUCTION_BY_ID`、`VEHICLES_BY_ID`、`STREET_PROPS_BY_ID`、`BUILDINGS_BY_FAMILY`、`getGroup`、`getGroupAssets`、`CITY_DISTRICT_LAYOUT`、`transformDistrictLayout` **均无外部引用**；`ATTRACTIONS`、`STREET_PROPS` 两个导出数组也没有任何模块导入（仅参与 `ASSETS` 拼接）。同时 `catalog-page.js:14-21` 又自行构建了 `groupById/familyById/assetIndex/groupAssets/groupCounts`，其中 `groupAssets` 与已导出但未使用的 `getGroupAssets` 重复。`showcase-models.js:2` 也只用了 3 个导出。

**证据**：`object-catalog.js:1887-1919`；`catalog-page.js:14-21`；`showcase-models.js:2`；`city.js:2-11`；符号检索结果见附录。

**影响**：导出面越大越容易被误用；重复索引增加理解成本；`getGroupAssets` 这类“看起来是官方入口”的函数实际没人用，说明 API 没有收敛。

**具体改法**：只保留 `ASSET_BY_ID`、按组数组（`BUILDINGS` 等）与 `GROUPS/BUILDING_FAMILIES`；删除未用 Map/函数；图鉴页改用 `getGroupAssets`/`ASSET_BY_ID`（或把索引构建移到 `object-catalog.js` 作为统一 selector）。工作量：0.3 人日。

### [P2] accent 数据不完整 / 可读性判断不可靠：33/106 项回退到分组色

**问题**：`accentFor`（`catalog-page.js:40-44`）优先用 `asset.model.accent`，否则回退 `group.accent`；判定函数 `isReadableAccent`（`:28-38`）只在“hex 且相对亮度 ≥0.36”时接受。Node 复算：6 个 nature 资产完全没有 `accent`；另有 27 个 accent 亮度 <0.36 被拒；合计 **33/106** 项显示的是分组色，而不是资产自己的强调色。`isReadableAccent` 对非 hex 字符串直接返回 `true`（`:31`），未来若用 `rgb()`/变量会绕过检查；0.36 也不是 WCAG 的对比度阈值（应按背景计算对比比）。
同时 7 个 family 的颜色没有放在数据里，而是前端 JS 的 `FAMILY_TINTS`（`catalog-page.js:4-12`），与 `BUILDING_FAMILIES` 形成两份事实。

**证据**：`catalog-page.js:4-12,28-44`；`object-catalog.js:1727-1804`（nature 模型无 accent）；Node 统计见第 0 节。

**影响**：约三成资产的视觉强调色“不是自己的”，卡片的个性减弱；数据与前端颜色职责不清。

**具体改法**：给 6 个 nature 资产补 `accent`（或明确约定 nature 统一用叶色）；把可读性判断改为按实际背景计算 WCAG 对比比（而不是 0.36 亮度阈值）并允许自动调亮；把 family 色写入 `BUILDING_FAMILIES`（如 `accent`），前端只读取。工作量：0.3 人日（数据 + 前端各一半）。

### [P2] facts/tags 无结构、未参与检索：54 个事实标签 27 个只用一次，258 个 tag 无法筛选

**问题**：
- `facts` 统一 3 条（106/106，质量不错），但标签是自由文本：54 个 label 中 27 个只用过一次（“臂长、铲斗、座舱、桨、泊位…”），value 全是字符串且混单位（`"1–2F"`、`"9×8 m"`、`"4–10 人"`），无法排序/比较/筛选（例如“按高度排序”“只看高层”）。
- `tags` 共 324 次使用、258 个不同标签（约 80% 只用一次），但图鉴只显示第一个 tag（`catalog-page.js:263`），没有任何搜索/标签筛选/相关推荐；卡片与详情页的 tags 只是装饰。
- 这两份数据加起来约 600 个字符串，是内容站最有检索价值的资产，却完全没有变成可查询能力。

**证据**：`object-catalog.js:1`（fact 工厂）、`:107` 等（facts 示例）；`catalog-page.js:254-263`（卡片只取第一个 tag）、`:517-527`（详情页渲染 facts/tags）；Node 统计见第 0 节。

**影响**：图鉴退化为“静态长列表”；用户无法按类型、高度、材料、功能检索；内容维护者也无法据此发现重复/缺失。

**具体改法**：把 facts 改为 `{ key, label, value, unit? }` 或至少为 label 建枚举表；tags 增加“主标签/次标签”或统一同义词；前端加搜索栏 + 标签/家族/分组筛选（数据已足够支撑），并对“height/floors/capacity”等结构化值提供排序。工作量：1–2 人日（数据规范 0.5 + 前端筛选 1）。

### [P2] 双语文案与 `lang` 属性不一致：英文片段未标注语言，提示/aria 仅中文

**问题**：页面视觉上是双语（中文标题 + 英文副标题），但：
- 英文片段没有 `lang="en"`（如 `.inspector-en` 的 `GABLE COTTAGE`、卡片 `.card-en`、hero kicker），中文读屏会用中文语音拼读英文；
- 所有提示语/aria-label 只有中文（`catalog.html:25,95,96,149,178`；`catalog-page.js:230` 的卡片 aria-label 混排中英但无 lang 标注）；而英文标签（OBJECTS/CATEGORIES…）没有对应中文解释；
- `description`、`family.description` 只有中文，`en` 字段只有名称；两页的英文使用程度不一致（主站 UI 以中文为主，图鉴大量英文装饰）。

**证据**：`catalog.html:41,44,50,60,95-96,149,178,203`；`catalog-page.js:230`；`object-catalog.js:16-97`（groups 有 en）、`:89-97`（families 有 en）。

**影响**：读屏体验差；双语定位不严谨；内容维护者不知道哪些字段应有英文。

**具体改法**：为纯英文片段加 `lang="en"`；为中文提示补英文副文案或统一为“中文主 + 英文小字”的固定模板；在数据校验里要求 `en` 与 `name` 同时存在、描述可选 `descriptionEn`。工作量：0.3–0.5 人日。

### [P2] 错误/空状态兜底不完整：无超时、无重试、total=0 会产生 NaN%

**问题**：
- 缩略图生成逐资产 try/catch + Canvas 备用图做得不错（`catalog-page.js:454-491,333-410`），但**外层没有兜底**：若 `buildSections`/`updateStaticCounts` 等初始化代码抛错（数据问题、DOM 缺失），loader 永远不会消失，也没有任何错误 UI。`bootstrap()`（`:641-652`）没有 try/catch。
- 没有超时/重试：WebGL 上下文丢失（`webglcontextlost`）未监听，生成过程中失效会持续产出空白图；`createThumbnailStudio` 失败会走全量 fallback（好），但只覆盖“创建即失败”这一种。
- `total === 0`（数据异常）时 `updateLoader` 的 `done / total` 会产生 `NaN%`（`:315`），`finishArchive` 无空状态文案。
- `archiveNotice` 无 `role/aria-live`（见 P1），且失败后没有“重试/刷新”入口。
- 图片加载失败（`img` 的 `error` 事件）没有处理：卡片会一直停在渐变色背景，`is-loaded` 不触发（`:412-424`）。

**证据**：`catalog-page.js:641-652`（bootstrap 无 try）、`:314-331`（NaN 风险）、`:426-448`（notice/finishArchive）、`:412-424`（load 无 error）；主站有完整错误遮罩可对照（`index.html:246-253`，`main.js:150-151`）。

**影响**：异常情况下用户只看到永久 loader，无法自助恢复；数据侧异常没有可见信号。

**具体改法**：`bootstrap` 外层 try/catch → 显示 `errorOverlay` 风格提示 + 重试按钮；`total` 为 0 时显示空状态；`studio` 增加 `webglcontextlost` 监听并降级到 Canvas fallback；`img.onerror` → 绘制 fallback；notice 加 `role="status"`。工作量：0.5 人日。

### [P2] 移动端详情面板：滚动后关闭按钮会滚出视口，滚动锁定依赖 `overflow:hidden`

**问题**：≤820 px 断点下 `.inspector-panel` 改为单列、`max-height: calc(100dvh - 24px)` 且 `overflow-y: auto`（`catalog.css:1757-1789`），而 `.inspector-close` 是 `position: absolute; top/right`（`:1384-1392`、`:1780-1785`）——它会随内容滚出视口，用户滚到信息区中段时无法找到关闭按钮（只能点遮罩或按 Esc，移动端没有 Esc）。此外 `body.inspector-open { overflow: hidden }`（`:50-52`）在 iOS Safari 上不能可靠锁定背景滚动。
`stageHint` 只写“拖动旋转 · 滚轮缩放 · 自动环绕”（`catalog.html:190`），移动端没有“双指缩放”的提示。

**证据**：`catalog.css:1757-1789,1384-1392,50-52`；`catalog.html:190`；`catalog-page.js:535-537`（reduced motion 文案）。

**影响**：移动端详情页的退出成本高；背景滚动可能穿透。

**具体改法**：close 按钮改为 `position: sticky`/`fixed` 于面板视口（或给 panel 留出 sticky header）；iOS 用 `position: fixed` + `top` 保存滚动位置的方式锁定背景；提示文案按 `pointer: coarse` 切换为“拖动旋转 · 双指缩放”。工作量：0.3 人日。

### [P2] 卡片入场动画与事件绑定：106 张同时动画、逐卡监听

**问题**：生成完成后一次性给 106 张卡片加 `animation: card-in`（`catalog.css:1058-1061`），错峰只有 `--i: index % 12`（`catalog-page.js:228`）共 12 档、每档 16 ms；实际是 106 个元素在同 176 ms 窗口内做 `steps()` 位移动画，移动端容易掉帧。另外每张卡单独 `addEventListener("click")`（`:269`）、每张图单独 `addEventListener("load")`（`:415`），106×2 个监听器；筛选 chip 也是逐个 `:159,169`。事件委托可显著减负。
图片全部 `loading="eager"`（`:239`），没有 `content-visibility`/`contain` 声明（`catalog.css` 无相关规则），长列表滚动时所有卡片都在渲染树中。

**证据**：`catalog-page.js:228,239,269,415,159,169`；`catalog.css:1058-1061`（无 `content-visibility` 相关规则）。

**影响**：首屏完成瞬间的动画 jank；长列表滚动/内存成本略高；监听器数量随资产线性增长。

**具体改法**：只对首屏可见卡片启用入场动画（IntersectionObserver）或把 stagger 上限降到 6–8 档、总时长 ≤250 ms；用容器级事件委托处理卡片点击与图片 load；给 `.group-section` 加 `content-visibility: auto; contain-intrinsic-size`。工作量：0.3 人日。

### [P2] ShowcaseKit 的少量 API 隐患（整体设计是加分项）

**问题**：`ShowcaseKit` 的设计是本仓库亮点：材质按 `color|options` 缓存、单位几何复用、描边几何缓存、`track()` 统一释放（`showcase-models.js:69-133,135-154,196-207,283-291`）。但：
1. `createShowcaseModel(asset, { kit })` 在未传 `kit` 时会内部 `new ShowcaseKit()`（`:5526-5528`），而 `disposeShowcaseModel` 只处理 `InstancedMesh`、几何/材质由 kit 负责（`:5580-5587`）——这个内部 kit 无法被外部释放，未来若有人直接调用而忘记释放会泄漏。当前所有调用方都传了 kit，属隐患而非现网 bug。
2. 材质缓存 key 用 `JSON.stringify(options)`（`:141`），依赖 options 键顺序稳定；当前调用点都是字面量、顺序固定，可接受，但建议规范化 key。
3. 渲染端仍有 158 处 `kit.material("#…")` 内联色，未走统一 palette（见体积项）。
4. `disposeShowcaseModel` 不清 `group.children` 的几何，但那是 kit 的职责；建议在 JSDoc/注释中明确所有权约定。

**证据**：`showcase-models.js:69-133,135-154,140-154,283-291,5526-5528,5580-5587`。

**影响**：目前无功能问题；属于 API 契约文档与未来泄漏风险。

**具体改法**：把 `createShowcaseModel` 的 kit 参数改为必填（或返回 `{ group, kit }` 并让调用方负责）；在文件头写清“kit 拥有材质/几何所有权”；材质 key 改为 `color + sortedKey(options)`。工作量：0.2 人日。

### [P2] 图鉴与主站的“同一资产”观感/数据不一致，缺少资产→城市定位

**问题**：同一项资产在城市场景与图鉴中由两套模型生成：图鉴用 `showcase-models.js` 的高细节版本（`buildBuilding` 按 style），城市用 `city.js` 的简化版（`addCatalogBuilding` + `decorateCityBuilding`，`city.js:2602-2770`）。两者共享 `model.style/walls/roof/accent/floors/width/depth` 等参数，但几何、细节、随机取色都不同；图鉴没有“在城中查看”的入口，城市 info 面板也没有“打开图鉴条目”的链接（`index.html:74-94` 的面板 vs `catalog.html` 的 inspector 是两套 UI）。
另外 `main.js` 的城市页从 `BUILDINGS` 等数据取资产（`city.js:2-11`），但图鉴与城市之间的资产 id 没有互链。

**证据**：`city.js:2602-2770,2311-2600`（城市版样式渲染）；`showcase-models.js:878-2075`（图鉴版）；`catalog-page.js`（无 city 链接）；`index.html:205-218`（仅一个图鉴入口按钮）。

**影响**：图鉴的“档案”定位与城市场景不是所见即所得；用户看到城市里的楼，无法查到它的图鉴条目；两套实现长期会继续漂移（见 P1 数据契约项）。

**具体改法**：城市 info 面板加“在图鉴中查看”链接（`/catalog.html?asset=<id>`），图鉴 inspector 加“回到城市中的位置”（如城市页支持 `?focus=<id>` 或至少回链 `/?asset=`）；中期把城市 LOD 与图鉴模型收敛到同一几何工厂（见 P1 重复项）。工作量：0.5 人日（互链）+ 跨模块改造另计。

---

## 3. 正面发现（建议保留/放大）

1. **缩略图使用单一共享 WebGLRenderer**（`showcase-studio.js:143-218`），不是每卡一个 context；loader 文案“共享 WebGL 渲染器”（`catalog.html:81`）属实。这对 100+ 资产场景是正确的架构选择，也意味着上下文数量上限不是风险。
2. **ShowcaseKit 的设计质量高**：材质/几何缓存 + 单位几何 + 描边缓存 + 统一 `track()/dispose()`（`showcase-models.js:69-291`），在“逐资产手写模型”的前提下把资源管理做得干净。
3. **确定性复现**：缩略图与检视台用固定 seed（`catalog-page.js:26` `catalog:${id}:v1`；`showcase-models.js:5532` 的 `hashSeed`），同一资产每次生成一致；这直接为“预渲染/缓存”提供了可行性。
4. **逐资产错误隔离**：生成循环对每项 try/catch，失败时用 Canvas 画备用像素图并汇总提示（`catalog-page.js:454-491,333-410,431-448`），WebGL 完全不可用也有降级路径。
5. **弹窗焦点处理完整**：`role="dialog" aria-modal`、Esc、焦点陷阱、关闭后焦点归还（`catalog-page.js:586-628,603-605`）。
6. **两页都已处理 `prefers-reduced-motion`**：CSS 全局降级（`catalog.css:1976-1989`、`style.css:1308`）+ JS 关闭自动环绕/平滑滚动（`catalog-page.js:23-24,193,535-537,602`；`showcase-studio.js:268,280-282`）。
7. **数据质量的基础不错**：106 项无重复 id、id 全 kebab、`en` 全大写、每项 facts 恰好 3 条、描述长度 15–60 字、所有 district 交叉引用当前都能解析；`GROUPS`/`BUILDING_FAMILIES` 结构清晰，分组与排序统一。
8. **工程侧已有可复用资产**：Vite 多页配置正确且两页共享 chunk（`vite.config.js:4-12`，dist 里 `object-catalog-*.js` 被两页 `modulepreload`）；`docs/skyscrapers/render.mjs` 已有离线光栅化管线，是预渲染的直接基础。
9. **互链已建立**：城市控制坞有图鉴按钮（`index.html:205-218`），图鉴页头/页脚有返回城市（`catalog.html:25,120`），方向正确。

---

## 4. 建议实施顺序（按性价比）

| 顺序 | 事项 | 对应条目 | 预计工作量 |
| --- | --- | --- | --- |
| 1 | 数据校验脚本（id/schema/style/district 引用/features 空转检查），接入 prebuild | P1 数据契约、P2 死导出 | 0.5–1 人日 |
| 2 | 清理死数据/死代码/过期计数（features、CITY_DISTRICT_LAYOUT、死 Map、HTML 硬编码数字） | P1 features、P2 三项 | 0.5–1 人日 |
| 3 | 预渲染缩略图 + 图鉴页懒加载 three（扩展现有 render.mjs） | P1 缩略图性能、P2 体积 | 2 人日 |
| 4 | 检视台按需渲染 + 移动端关闭按钮/滚动锁定 | P1 检视台、P2 移动端 | 0.5–1 人日 |
| 5 | 深链接 `?asset=`/`?group=` + 与城市互链 | P1 深链接、P2 互链 | 0.5–1 人日 |
| 6 | 可访问性包：焦点/inert/live region/skip link/roving tabindex + 字号对比度 | P1 可访问性、P1 字号对比 | 1.5–2 人日 |
| 7 | 设计系统抽取（tokens.css/ui-base.css） | P1 两页重复 | 1 人日 |
| 8 | 打散 showcase-models 模块 + 塔楼参数化 + 颜色 token 化 | P1 体积、P2 ShowcaseKit | 4–6 人日（可分批） |
| 9 | SEO/部署：base、OG、canonical、静态列表/sitemap | P1 部署与 SEO | 1–2 人日 |

---

## 5. 附录：测量方法与可复核数据

**方法**：
- 文件行数用编辑器 `read` 工具计数（与任务书给出的 1944/5587 一致）；源码统计用 `Select-String` 正则计数。
- 资产数据与模型构建：Node v22.22.2 直接 `import` `src/object-catalog.js` / `src/showcase-models.js`（两者不依赖 DOM），对 106 项调用 `createShowcaseModel` 并 `traverse` 统计 Mesh/LineSegments/顶点；共享一个 `ShowcaseKit` 以模拟缩略图工作室。脚本仅存在于 `%TEMP%`，未写入仓库。
- 预渲染成本：`node docs/skyscrapers/render.mjs --group all --out %TEMP%\catalog-prerender-all --w 192 --h 144 --scale 2`，输出到 `%TEMP%`，未改动 `docs/skyscrapers/` 下任何文件。
- 构建体积：读取现有 `dist/assets/*` 并用 .NET `GZipStream`（Optimal）估算传输体积；`dist` 为仓库已有产物，本次审计未运行 build。
- 对比度：WCAG 2.x 相对亮度公式；背景取 `#080d18` 与卡片渐变中较亮的 `#101828`，属近似值。
- 浏览器端耗时（桌面 2–4 s / 移动 8–20 s）为**估算**，未启动 dev server；建议在真机用 Performance 面板确认后再对外表述。

**关键数据复核点**：
- `ASSETS.length === 106`、`DISTRICTS.length === 12`、`GROUPS.length === 10`、`BUILDING_FAMILIES.length === 7`。
- 全量模型：12,550 Mesh / 802 LineSegments / 379,902 顶点；`s-burj` 1,135 Mesh；kit 缓存 622 材质。
- `features`：51 项资产 / 224 token / 135 distinct；唯一读取点 `showcase-models.js:2069`（`roofGarden`）。
- `facts`：54 label / 27 个只出现一次；`tags`：258 distinct / 324 次使用。
- 预渲染：106 张 192×144 PNG 共 491,779 B；总耗时 1.37 s（含写文件）。
- `catalog.css` <10 px 字号 50 处；`--faint` 对比度 3.14–3.44:1。
- 图鉴首屏 JS：618,304 B + 118,345 B（gzip 162,455 + 37,629 B）；CSS 27,250 B（gzip 6,400 B）。

**边界**：本报告未覆盖 `city.js` 的每帧 draw call/阴影/重建等运行时问题（见 `notes-runtime.md`），也未覆盖 `city-plan.js` 的规划几何问题（见 planning 文档）。图鉴视觉细节（缩略图构图/光照）以现有代码为准，未做逐张人工比对。

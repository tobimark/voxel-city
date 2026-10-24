# 像素湾 PIXEL BAY · 项目提升建议（综合审计报告）

> 审计日期：2026-10-24 ｜ 范围：城市模拟（`index.html` + `src/`）、物体图鉴（`catalog.html`）、构建与仓库 ｜ 方式：只读审计 + Node 无头实测（见第 11 节）
> 说明：本轮**未修改任何源码或配置**；新增文件仅为 `docs/review/` 下的本报告、三份专项报告与两个测量脚本。

---

## 0. 一句话结论

项目的**完成度与审美水准明显高于一般 Three.js 练手项目**（视觉统一、交互完整、种子可复现、构建干净、`dispose()` 完整），真正的提升空间集中在三处：

1. **工程风险**：工作区有 4,791 行核心改动未提交、`src/city-plan.js` 尚未进版本库、仓库没有 remote——一次误操作就可能丢掉今天的工作；
2. **渲染架构**：静态城市仍是“一个盒子一个 Mesh”，单帧约 **1.1 万次 draw call**（主 pass 6,506 + 阴影 4,679），这是移动端与后续内容扩张的硬天花板；
3. **长期可维护性**：`city.js` 单文件 5,442 行 / 87 个嵌套函数 / 最大单函数 757 行，无测试、无 lint、无 CI；图鉴数据层缺少可校验契约。

**最高性价比的顺序**：先用半天到一天把工作区收进 Git 并建 remote（消除数据风险），再用半天做阴影策略、一天做静态合批（性能数量级改善），然后把仓库里**已经存在的纯 Node 验证脚本接进 CI**，最后处理架构拆分、图鉴预渲染与发布。

> 已有 [`docs/planning/城市规划调研与改进方案.md`](../planning/城市规划调研与改进方案.md) 系统覆盖了“街区居中偏移、路网不连通、整岛沥青”等**规划几何**问题，本报告不重复，只在其基础上补充**工程、运行时、内容与交付**视角。特别注意：规划改造会新增街区和建筑，**建议先完成本报告 P0-2 的合批**，否则性能问题会被放大后再返工。

---

## 1. 项目现状（实测基线）

| 维度 | 现状 |
| --- | --- |
| 页面 | 2 个 Vite 多页入口：城市 `/index.html`、图鉴 `/catalog.html`，共享 `src/object-catalog.js` 资产数据 |
| 技术栈 | 仅 `three@0.186.1` + `vite@8.3.5`；纯程序化生成，无外部图片/字体/CDN 依赖，离线可跑 |
| 代码规模 | 10 个源文件，JS 约 **15,870 行**；`city.js` 5,442 行、`showcase-models.js` 5,587 行、`object-catalog.js` 1,944 行 |
| 城市内容 | 112 栋建筑、57 个街区、11 个功能分区、51 辆车、2,569 个可选对象；固定种子可复现 |
| 场景规模（种子 `A1B2C3D4`） | **6,301 个 Mesh + 5 个 InstancedMesh + 200 个 LineSegments**；仅 **12 个几何体**、约 **310 个材质**（339 个几何×材质组合）、10.5 万三角形 |
| 每帧提交（静态估算） | 主 pass **6,506 次** + 阴影 pass **4,679 次** ≈ **1.1 万次 draw call/帧**；视锥剔除会减少一部分，但默认等轴视角几乎整城可见 |
| 每帧 JS | `city.update` 52–88µs；`sampleEnvironment` 0.9–1.2µs；场景图遍历 1.19ms——**瓶颈在 GPU 提交，不在脚本** |
| 构建 | 成功，17 modules / 266ms；`dist` 7 文件 896KB（gzip 250.7KB）；两页首屏 gzip 约 205/202KB；唯一警告是 618KB 共享 chunk（three 占 94%） |
| 仓库 | **仅 1 个提交** `654c5b0`；3 个已跟踪文件未提交（+4,791/−1,265）；未跟踪 127 文件 / 11.2MB（审计开始时）；**无 remote**；`.git` 96.6MB 含 909 个不可达对象 |
| 质量门禁 | 无 test / lint / format / typecheck / CI；但仓库已有可复用的纯 Node 验证脚本（`ring-study/verify.mjs` 全绿、`docs/planning/audit.mjs`） |
| 生命周期 | `dispose()` 覆盖几何/材质/纹理，6 轮重建无单调内存增长——**没有泄漏级问题**，重建的问题主要是卡顿 |

---

## 2. 提升空间总览（按优先级）

| 优先级 | 主题 | 核心证据 | 预期收益 | 工作量 |
| --- | --- | --- | --- | --- |
| **P0** | 工作区收进 Git + remote | 1 个提交、+4,791 未提交、`city-plan.js` 未跟踪、无 remote | 消除“今天的工作可能丢失”的风险 | 0.5–1 天 |
| **P0** | 静态几何合批（draw call） | 6,301 Mesh / 12 几何 / 310 材质；主+阴影 ≈1.1 万次/帧（`city.js:516-524`、`main.js:276-290`） | draw call 降一个数量级，帧时间/移动端可用性大幅改善 | 1–2 天 + 回归 |
| **P1** | 阴影管线 | `addBuildingInfo` 无条件 `castShadow=true`（`city.js:1525-1531`）；74% 网格投影、shadow map 每帧重绘（`main.js:175-176`） | 阴影 pass 从 4,679 降到几百；约 0.5 天 | 0.5–1 天 |
| **P1** | 重建体验与失败回滚 | `spawnCity` 同步 37–107ms + dispose 11–15ms，且**先写 seed 再建城**（`main.js:608-624`） | 换种子不再卡死/坏 seed 粘住 URL | 0.5 天 |
| **P1** | 画质分级 + 上下文丢失恢复 | 固定 2× 超采样 + MSAA + 2048 阴影；无 `webglcontextlost` 处理（`main.js:375-383`） | 移动端可跑、异常 GPU 可恢复 | 1–2 天 |
| **P1** | 架构拆分 + 派生 RNG | 单闭包 87 函数、最大函数 757 行；单条 RNG 流“改一处全城变” | 后续所有改动的速度与安全网 | 3–5 个迭代 |
| **P1** | 交付与门禁 | 无 README/LICENSE/部署；`base` 未设，子路径部署白屏；无 CI/lint | 能发布、能自动回归 | 1–2 天 |
| **P1** | 图鉴缩略图预渲染 | 首屏运行时生成 106 张缩略图（12,550 Mesh、无缓存）；仓库现成 `render.mjs` 预渲染全部仅 1.37s/0.48MB | 图鉴首屏从“秒级生成”变为静态图片，并可懒加载 three | 2 天 |
| **P1** | 数据契约与死数据 | `model` 无 schema/校验；`features` 224 个 token 只有 1 个被读取（`showcase-models.js:2069`）；HTML 写 99/10 实际 106/12 | 内容迭代更安全，减少误导 | 1–2 天 |
| **P1** | 图鉴可访问性/可分享性 | 无 `?asset=` 深链接；加载遮罩不 inert、106 次 live region 更新；50 处 <10px 字号、`--faint` 对比度 3.1–3.4:1 | 可分享单个资产、达到基本 a11y | 2–3 天 |
| **P2** | 每帧小优化 | `sampleEnvironment` 每帧 9 个 Color；曲线每帧 ~114 个 Vector3；hover raycast 0.24–0.31ms/次；UI 每 110ms 全量写 DOM | 降低 GC 抖动与交互卡顿 | 各 1–4 小时 |
| **P2** | 仓库/文档治理 | `dist-harbor-study/`、`dist-ring-study/` 未被忽略（1.96MB）；82 个位图 8.9MB 无归档策略；两 study 目录是第三、四份源码副本且已漂移 | 仓库变小、单一真相 | 1–3 天 |
| **P2** | 视觉一致性/性能细节 | 水面 shader 未接 fog/tonemapping、2600² 双面 overdraw；相机双 rig 复杂度高；`resize` 未节流 | horizon 更自然、相机 bug 更少 | 各半天 |

---

## 3. P0：先做，别拖

### 3.1 把工作区收进 Git（数据风险最高）

**问题**：仓库只有一个初始提交，而当前有 3 个核心文件的大改（`src/city.js` +2,442/−1,141 等，合计 +4,791/−1,265）、核心模块 `src/city-plan.js` 完全未跟踪、`docs/` 与两份研究原型也未入库；`git remote -v` 为空。`.gitignore` 只有 4 行，`dist-harbor-study/`、`dist-ring-study/` 这两个构建产物**未被忽略**，一次 `git add -A` 会把约 13MB 垃圾（构建产物 + 研究位图）写进历史。`.git` 里还躺着 909 个不可达对象（原始约 178MB，最大的两个 blob 分别是 35MB 和 31MB），建议建 remote 后 `git gc --prune=now`。

**建议做法**：
1. 先补 `.gitignore`（`dist-*/`、`ring-study/zoom/`、`docs/**/after*/` 等生成物）与 `.gitattributes`（统一 LF）；确认 `ring-study`/`harbor-study` 的源码副本是保留、归档还是移出仓库（倾向只保留 `README` + 脚本 + 必要源文件）。
2. 分批提交：① 卫生配置 → ② `src/city-plan.js` + `src/city.js`（**必须同一提交**，`city.js:12` 依赖前者）→ ③ `object-catalog.js` → ④ `showcase-models.js` → ⑤ 文档 → ⑥ 研究原型源码。每批后跑一次 `npm run build`。
3. 建远程仓库并 push 作为备份，然后 `git gc --prune=now`。具体命令与建议的 `.gitignore`/`.gitattributes` 模板见 [notes-engineering.md](notes-engineering.md) 附录 A/B。

**收益**：从“可能丢一天工作”变为可回滚、可协作、可 CI。**工作量**：0.5–1 天。

### 3.2 静态几何合批：把 1.1 万次 draw call 降一个数量级

**问题**：除窗口、路面标线、铁路枕木外，整座城市都是“一个 `addBox` 调用 = 一个独立 Mesh”（`city.js:516-524`，全源码 491 个调用点）。实测 6,301 个 Mesh，主 pass 6,506 次、阴影 pass 4,679 次，约 **1.1 万次提交/帧**，约 310 个材质反复切换。然而几何只有 12 个、材质上限 339 个组合、三角形只有 10.5 万——**条件极好**，属于“本来不该这么贵”。最贵的内容恰好在视线中心：单栋台北 101 有 591 个 Mesh，`addCurtainWall` 每层/每根竖梃一个盒子（`city.js:2852-2922`）。

**建议做法**（两步可独立落地）：
1. **静态烘焙 pass**：在 `createCity` 返回前加 `bakeStatic()`，把不在动态集合（车/船/鸟/火车/喷泉/风车）里的 Mesh 按 `geometry+material+castShadow` 合批：共享几何直接输出 `InstancedMesh`（per-instance matrix 支持非等比缩放），描边 `LineSegments` 合并为 1–3 个。交互部分**按建筑合并**（112 栋 × 少数材质），保留 `userData.building` 与 `selectables` 语义，`pickAt` 无需改。
2. **收敛材质**：133 处 `standard("#xxxxxx")` 字面量改为受控调色板或顶点色（`vertexColors`），目标材质 ≤60；主 pass 有望降到 **<150 次**（含描边/实例化）。
3. 保留按片区/空间分块以维持视锥剔除；透明/加色发光面（`glowMaterial`/`wakeMaterial`）单独排序。

**收益**：draw call 约 1.1 万 → 数百，帧时间与重建上传时间同步下降；移动端从“几乎不可用”变为可用。**工作量**：M（1–2 天 + 截图回归）。**验收**：浏览器 `renderer.info.render.calls < 800`（目标 <500）。

---

## 4. P1：本周处理

### 4.1 阴影管线：尊重局部设置、停止每帧全量重绘
`addBuildingInfo` 对建筑根下所有 Mesh 无条件 `castShadow = true; receiveShadow = true`（`city.js:1525-1531`），覆盖了生成器里已有的 `{ cast:false }` 优化；全场景 74% 网格投影，而 2048² 阴影图的 texel 比 0.02–0.035 的装饰线还粗。改法：按尺寸/厚度筛投射体（<0.12 的薄片不投影）、车/船/鸟不投影、`renderer.shadowMap.autoUpdate = false` 且仅当太阳移动超阈值或重建时 `needsUpdate`（5–10Hz 足够）、PCFSoft 降 PCF、阴影相机从 ±35 收紧到 ±26。预期阴影提交 4,679 → 几百。见 [notes-runtime.md](notes-runtime.md) P1-2。

### 4.2 重建体验：先建后换、成功后再写 seed
`spawnCity` 在按钮/R 键里同步执行 `dispose` → 写 seed → `createCity`（`main.js:608-624`），无 try/catch、无 loading、无防抖；构建失败时旧城已销毁、坏 seed 已写进 URL/localStorage。改法：新 group 先建好再替换旧城、`persistSeed` 移到成功之后、构建前显示 boot/遮罩并禁用按钮 300ms、连点防抖。工作量 0.5 天。

### 4.3 画质分级 + 自适应分辨率 + WebGL 上下文恢复
当前是“dpr 上限 2 + 总像素上限 240 万 + `setPixelRatio(1)` + `antialias:true`”的固定策略，等于超采样与 MSAA 双重抗锯齿；阴影固定 2048；没有画质档位、没有帧时间监测。建议引入 low/medium/high 档（低档：dpr 1、关 MSAA、shadow 1024），按设备初选 + 帧时间中位数自动降档；同时补 `webglcontextlost/restored` 监听与恢复流程，给 WebGL 失败用户一个静态图 + 图鉴链接的降级页。工作量 1–2 天。

### 4.4 架构拆分与确定性随机流（长期最大成本）
`city.js` 全部实现塞在 `createCity` 一个闭包里（87 个嵌套函数、最大单函数 757 行），规划、几何、建筑、街道家具、动画、dispose 混在一起；`main.js` 996 行也全在一个作用域。建议**渐进式**抽取：`kit.js`（几何/材质/描边）、`buildings/`（tower/house/skyscraper，接受 rng/material 上下文）、`props.js`、`traffic.js`、`environment-binding.js`；`createCity` 只做编排，返回接口保持不变。同时把单条 `mulberry32(seed)` 流改为按子系统派生（`rngFor(seed,'plan'|'buildings'|'props'|'traffic')`），这样“只改树不影响建筑”，旧分享链接的城市也不会因一次随机调用增删而整体变形。工作量 L（3–5 个迭代），但这是所有后续改动的加速器。

### 4.5 交付与质量门禁：先能发布，再谈迭代
`base` 未设置、dist 资源为 `/assets/...`，另有 3 处 `<a href="/">` 绝对链接（`index.html:207`、`catalog.html:25,120`）——部署到 GitHub Pages 项目页等子路径**必然白屏**（已实测）。同时缺 README/LICENSE/部署配置/CI。建议：`base: "./"` + 三处相对链接；README（快速开始/两页 URL/seed 参数/目录/部署）；LICENSE；GitHub Actions 跑 `npm ci → npm run build → node ring-study/verify.mjs`；把 `docs/planning/audit.mjs` 与本次的 `metrics.mjs` 改造成无头回归；`manualChunks` 把 three 拆成 vendor（实测 572KB + 45KB，同页 gzip 不变但缓存命中率大幅改善），并设 gzip ≤240KB/页的体积预算。工作量 1–2 天。

### 4.6 图鉴缩略图：从运行时生成改为预渲染
图鉴首屏会在主线程顺序生成 **106 张** WebGL 缩略图（`catalog-page.js:454-491`，每 2 张才让一帧；`showcase-studio.js:199` 同步 `toDataURL` PNG），全量模型 12,550 个 Mesh、共享 kit 622 个材质、无缓存——桌面估算 2–4s、移动端 8–20s，且首屏必须加载 618KB（gzip 162KB）的 three 共享 chunk。而仓库已有的离线渲染器 `docs/skyscrapers/render.mjs` 实测预渲染全部 106 张 192×144 仅 **1.37s / 492KB**。建议：构建期生成 WebP 缩略图，图鉴页静态展示 + `loading="lazy"`；three 只在打开检视台时动态 import；检视台从“打开后每帧重渲染”改为“按需渲染/空闲后停帧”（当前最重模型约 1,195 draw call/帧持续跑）。预期：图鉴首屏 JS 减少约 160KB gzip，且交互不再被生成过程抢占。工作量约 2 天。

### 4.7 内容数据契约与死数据
图鉴有 106 项资产、10 个分组、7 个 family、12 个 district，但 `model` 是隐式必填、无 schema/校验；同一个 `model.style` 字符串被 `showcase-models.js` 与 `city.js` **两套渲染器**分别解释（31 个样式 × 2），`ASSET_BY_ID` 对重复 id 静默覆盖。`features` 字段 51 项资产共 224 个 token，渲染端只读了 1 个（`roofGarden`，`showcase-models.js:2069`），城市端完全不读；HTML 文案写“99 件/10 类”，实际 106/12。建议：写一个 `scripts/validate-catalog.mjs`（id 唯一/kebab、必需字段、style 与渲染器分支一一对应、district 引用有效、features 必须被消费），挂到 `prebuild` 与 CI；清理死数据/死导出/过期计数。工作量 1–2 天。

### 4.8 图鉴可访问性与可分享性
主站有 `?seed/?hour/?projection` 与分享链接，图鉴没有任何深链接（无法分享“某个资产”）；加载遮罩期间背景可聚焦、进度更新 106 次 `aria-live` 刷屏、卡片有 106 个 Tab 停靠点；`catalog.css` 有 50 处 <10px 字号，`--faint` 对比度 3.14–3.44:1（低于 WCAG AA 4.5:1）。建议：`?asset=id&group=id` 深链接 + `history.replaceState`；加载页 `inert`/焦点陷阱；live region 合并为进度百分比节流；小字号＋低对比度组合修正；`skip link`、`roving tabindex`；城市建筑档案里加“查看图鉴条目”，图鉴里加“在城市中定位”。工作量 2–3 天。

### 4.9 两页设计系统已漂移
两页各自维护 `:root` design tokens、按钮/面板等 4 个同名组件与重复 keyframes，已经出现色值/token 漂移。建议抽 `src/ui-tokens.css` + `src/ui-base.css` 供两页共用，页面级 CSS 只留布局与专属组件。工作量 1 天，可随其他改动顺带做。

---

## 5. P2：本月/择机（清单）

| 事项 | 证据/现状 | 建议 |
| --- | --- | --- |
| 每帧环境对象分配 | `sampleEnvironment` 每次 9 个 `THREE.Color` + 结果对象（`environment.js:241-247`） | 复用模块级 scratch 对象，0.5 天 |
| 曲线采样分配 | 每帧约 114 个 `Vector3`（`getPointAt/getTangentAt` 未传 target，`city.js:5304-5325`） | 预分配 target 或预采样路径表，0.5 天 |
| hover 拾取 | 每次 `pointermove` 对 2,569 个 Mesh 全量 raycast（0.24–0.31ms/次，`main.js:718-722`） | 包围球粗筛 + rAF 合并 + 状态变化才改 class，0.5 天 |
| 静态矩阵 | 7,235 个对象每帧 `updateMatrixWorld` 约 1.19ms | 随合批自动消失；暂可对静态子树 `matrixAutoUpdate=false` |
| UI DOM | 每 110ms 全量写 textContent + `style.left` 触发布局（`main.js:910-922`） | 脏检查 + `transform`，2 小时 |
| resize | 每次 resize 重建 drawing buffer（`main.js:449-453`） | `ResizeObserver` + rAF 合并/防抖，1 小时 |
| 水面 shader | 2600² 双面全屏平面、未接 fog/tonemapping（`city.js:228-285`） | 接 fog/tonemapping、半径收到 fog far + 边距、`FrontSide`，半天 |
| 相机双 rig | 两套相机 + 三套换算 + tween + 限制交织（`main.js:220-447`） | 抽 `CameraRig`（target/distance/yaw/pitch/viewHeight），1–2 天 |
| 研究目录治理 | `ring-study` 4.75MB / `harbor-study` 0.58MB，各含源码副本；`native-buildings.js` 与 `city.js` 已漂移；`harbor-study/verify.mjs` 已红 | 只保留源码/README/脚本，生成图移出或 LFS；研究副本抽共享模块，1–3 天 |
| 仓库/构建配置 | `package-lock` 名 `voxel-city@1.0.0` 与 `package.json` `pixel-bay@0.1.0` 不一致；Vite 8 下 `rollupOptions` 已弃用（应用 `rolldownOptions`）；无 engines/browserslist；行尾混用（同一文件 LF/CRLF 混排） | 元数据对齐、`engines`、`.gitattributes`/`.editorconfig`，半天 |
| SEO/分享 | 只有基础 meta，无 OG/Twitter/canonical/robots/sitemap/404；正文由 JS 生成 | 预渲染静态列表或补 meta/OG 图，1–2 天 |
| 错误监控 | 无任何上报；`showError` 对每帧重复错误会反复写 DOM | 加“只报一次”去重 + 轻量错误上报，半天 |

---

## 6. 快速见效清单（按时间盒）

**2 小时内**
- 修正 `.gitignore`（`dist-*/` 等）并完成首批提交、建 remote push；
- `sampleEnvironment` 复用对象、hover 拾取 rAF 合并、resize 防抖；
- `ring-study/vite.config.mjs` 修正（port/outDir 与 README 不符），把 `verify.mjs` 变成 CI 第一步。

**半天**
- 阴影策略（尊重 `cast:false`、`shadowMap.autoUpdate=false`、收紧阴影相机）；
- 重建改为“先建后换 + 成功后再写 seed + loading + 防抖”；
- README + LICENSE + `base`/三处绝对链接修复（让子路径部署不白屏）。

**1–2 天**
- `bakeStatic()` 合批 + 描边合并 + 材质收敛（先用 `renderer.info` 记基线再改）；
- 图鉴缩略图预渲染原型（直接扩展 `docs/skyscrapers/render.mjs`）；
- 数据校验脚本 + CI（build + verify + 无头 metrics 阈值断言）。

---

## 7. 30 天路线图

| 阶段 | 目标 | 关键交付 | 验收 |
| --- | --- | --- | --- |
| **第 1 周：稳态** | 数据安全 + 可回归 | 分批提交 + remote + gc；README/LICENSE；`.gitignore`/行尾；CI（build + verify + metrics）；base 部署修复 | 克隆新目录可一条命令跑起来；CI 全绿；子路径部署可用 |
| **第 2–3 周：性能与体验** | 帧率与交互 | 静态合批 + 阴影策略 + 画质分级 + 自适应分辨率 + 重建体验 + webglcontextlost | `renderer.info.render.calls < 800`；中端手机 30fps+；换种子无可感知卡顿 |
| **第 4 周：结构与产品** | 可维护 + 可分享 | `city.js` 模块化第一批（kit/buildings 抽出）、派生 RNG、图鉴预渲染 + 深链接 + a11y 包、设计系统抽取、SEO/OG | 单文件 <2,500 行；同 seed 输出稳定；图鉴首屏无运行时生成；Lighthouse a11y ≥90 |

---

## 8. 产品层面的加分方向（不是修 bug）

现有“可复现种子 + 昼夜 + 双投影 + 点击建筑档案 + 独立图鉴”已经构成不错的产品骨架。若还想往上走，按性价比推荐：

| 方向 | 说明 | 成本 | 价值 |
| --- | --- | --- | --- |
| **明信片导出/分享卡** | 一键把当前视角渲染成 PNG（高分辨率离屏渲染），叠加 seed/时间/城市名 | 0.5–1 天 | 强传播性，最适合展示型项目 |
| **时间轴拖动 + 天气变体** | 底部 day-track 已存在，可做成可拖时间滑块；`environment.js` 已有完整关键帧，可扩展雨/雾/雪变体 | 1–2 天 | 复用现有数据，观感提升明显 |
| **图鉴 ↔ 城市互链** | 建筑档案显示“查看图鉴条目”，图鉴显示“在城市中定位/生成同款” | 0.5–1 天 | 两页从“两个 demo”变成一套体验 |
| **城市参数化 variant** | seed 之外再加密度/风格/海岸线参数，可分享组合 | 1–2 天 | 扩展核心玩法，复用 `city-plan.js` |
| **PWA/离线** | 无外部依赖，Service Worker 缓存两页资源 | 0.5–1 天 | 弱网/离线可用，安装到桌面 |
| **环境音/交互音** | 默认静音、可选开启；像素风 chiptune + UI 点击 | 1–2 天 | 氛围完成度 |
| **建筑列表/键盘无障碍** | 侧栏可搜索、Tab 遍历建筑并聚焦 | 1–2 天 | 让 canvas 内容可被键盘/读屏用户访问 |
| **首次引导** | 移动端手势提示/首次进入 3 步提示（现在只有 toast） | 0.5 天 | 降低流失 |

---

## 9. 建议的验收指标（写进 CI/性能预算）

- 渲染：`renderer.info.render.calls` < **800**（目标 <500）、triangles < 150k、programs < 30；阴影投射体 < 800。
- 首屏：每页 gzip ≤ **240KB**；three 拆 vendor 后缓存可复用。
- 构建：`npm ci && npm run build` < 1s；无 >500KB chunk 警告（或显式预算放行）。
- 无头回归：固定种子下 mesh 数/材质数/draw call 估算/建筑数落在阈值内；`createCity` 同 seed 两次输出计数一致。
- 交互：换种子无 >100ms 主线程长任务（或伴随 loading）；中端手机 ≥30fps；低端设备有画质档。
- 仓库：CI 全绿；`git status` 干净；README 可在新机器复现。

---

## 10. 做得好的地方（改造时请保留）

- **几何共享与实例化范式**：全城只用 12 个几何体；窗口/路面标线/斑马线/枕木已用 `InstancedMesh`——说明作者知道该怎么做，只需推广到建筑主体。
- **材质缓存**：`standard()/basic()` 按 `color+options` 复用，避免同色重复建材质。
- **生命周期干净**：`dispose()` 覆盖几何/材质/纹理，重建前确实调用；Node 6 轮重建无单调增长。
- **可复现性设计**：seed 从 URL/localStorage 读取、分享链接带 seed/hour/projection；`audit-results.json` 记录源码 SHA-256。
- **运行时兜底**：`noscript`、boot 遮罩、全局错误遮罩、渲染器创建失败 try/catch、`prefers-reduced-motion`、aria-pressed/label。
- **工程卫生**：`src/` 无 TODO/FIXME/console.log/debugger；仅 two 个直接依赖；构建确定（两次构建 hash 一致）、无 CDN/外部字体、完全离线可跑。
- **视觉完成度高**：像素风 UI、昼夜、雾、建筑档案、图鉴版式都已形成统一语言——这是项目最值得保留的资产。

---

## 11. 附件、测量方法与局限

**详细专项报告**
- [notes-runtime.md](notes-runtime.md)：渲染/每帧/生命周期/架构，20 条（1×P0 / 5×P1 / 14×P2）。
- [notes-content.md](notes-content.md)：内容数据契约/图鉴前端/可访问性，21 条（10×P1 / 11×P2）。
- [notes-engineering.md](notes-engineering.md)：构建/仓库/门禁/交付/文档治理，14 条（1×P0 / 5×P1 / 8×P2），含分批提交命令与配置模板。

**可复跑脚本**
- [`metrics.mjs`](metrics.mjs)：`node docs/review/metrics.mjs`，输出多种子下的 mesh/绘制调用/材质/构建耗时/确定性。
- [`runtime-probe.mjs`](runtime-probe.mjs)：`node --expose-gc docs/review/runtime-probe.mjs`，输出网格构成、raycast 开销、dispose 完整性、重建内存。

**方法与局限**：网格/材质/场景对象数、构建/更新耗时来自 Node v22 + canvas stub 静态实例化（`city.js` 唯一 DOM 依赖是 `makeGlowTexture`，因此可无 WebGL 构建整座城），与另两位审计成员独立测量交叉一致；draw call 是**场景登记数估算**，未计视锥剔除，真实值建议在浏览器用 `renderer.info.render.calls` 复核（Chrome Performance 面板 10 秒 + 固定种子 `?seed=A1B2C3D4`）。浏览器端帧时间、GPU 内存未实测；图鉴首屏耗时为估算，应在真机确认。仓库/构建数字为 2026-10-24 当天实测。

---

*本报告由项目审计（runtime / content / engineering 三个方向）汇总而成；所有结论均可按文中 `文件:行号` 复核。*

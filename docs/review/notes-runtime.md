# 像素湾 PIXEL BAY · 渲染与运行时架构审计

审计日期：2026-10-24。审计员：runtime-auditor。范围：`src/city.js`（5442 行）、`src/main.js`（996 行）、`src/environment.js`（268 行）、`src/city-plan.js`（586 行）及其对外接口。

约束说明：本轮**只读**，未修改 `src/`、`package.json`、git 状态；未启动 dev server、未运行 `npm run build`。唯一的运行时数据来自 Node 静态实例化探针（临时脚本放在 `%TEMP%\voxel-audit\`，未入仓），并与 `docs/review/metrics.mjs`、`docs/review/runtime-probe.mjs` 中的独立测量脚本交叉校对（关键数字一致：6,301 Mesh / 6,506 draw call / 4,679 阴影投射体 / 1,674 窗实例）。

与已有规划调研的关系：街区居中偏移、路网不连通、整岛沥青等**规划几何**问题已在 [`docs/planning/城市规划调研与改进方案.md`](../planning/城市规划调研与改进方案.md) 中详述，本报告不重复，只讨论这些问题之外的**渲染、每帧开销、生命周期、架构与健壮性**。一句话衔接：规划层修好之后，若渲染层仍是“一个盒子一个 Mesh”，街区数量或细节一旦增加，性能会按网格数线性恶化——所以本报告第 1 条是规划改造的前置条件。

---

## 0. 结论摘要

| 结论 | 事实 | 影响 |
| --- | --- | --- |
| 最大瓶颈是 draw call，不是 JS | 单帧静态约 **6,506 次主 pass draw call + 4,679 次阴影 pass**，合计约 **1.1 万次提交/帧** | 桌面端已偏高，移动端/高分屏会明显掉帧；内容每加一笔都线性变贵 |
| 几何共享做得很好，合批几乎为零 | 6,301 个 Mesh 只用了 **12 个几何体**（其中 9 个用于 Mesh），却有 **≈310 个材质、339 个（几何×材质）组合** | 有现成的合批条件，改动集中、收益大（可降到数百次） |
| 阴影 pass 几乎白付 | **74% 的 Mesh 投射阴影**（4,679 个），且 shadow map 每帧全量重绘 | 阴影 pass 的成本与主 pass 同量级，但视觉上大部分细节在 2048 阴影图里根本分辨不出 |
| 重建是同步大活 | Node 实测 `createCity` 预热后 **37–60ms**（首次 107ms）+ `dispose` 11–15ms；无 loading、无防抖、材质几何不复用 | 每次“新建/换种子”卡 2–5 帧，移动端更久；失败还会把坏 seed 写进 URL/localStorage |
| 架构是单文件巨型闭包 | `city.js` 一个 `createCity` 闭包里 **87 个嵌套函数**，最大单函数 **757 行**（`addSkyscraperBlock`）；无测试、无 lint/typecheck | 可维护性和可测试性是长期最大成本，新内容/新玩法难加 |
| 每帧 JS 本身不贵 | `city.update` 52–88µs、`updateEnvironment` ≈0.3–1.3µs、`sampleEnvironment` ≈0.9–1.2µs；但场景图遍历 1.19ms、hover 射线 0.24–0.31ms/次 | 优化优先级应放在 GPU 提交与合批，而不是微优化 JS；射线和 DOM 是次要但好修的点 |
| 生命周期基本干净 | `dispose()` 覆盖几何/材质/纹理；Node 重复重建 6 轮无单调增长（±1.3MB 波动） | 无泄漏级问题；重建问题主要是**卡顿**而非泄漏 |
| 健壮性有明确缺口 | 无 `webglcontextlost` 恢复、无质量分级/自适应分辨率、无 WebGL 失败降级 | 移动端/异常 GPU 场景下体验脆弱 |

---

## 1. 度量基准（供复核）

固定种子 `A1B2C3D4`，`three@0.186.1`，Node v22 静态实例化（stub `document.createElement('canvas')` 的 2D 上下文，`city.js:210-226` 是唯一 DOM 依赖）。所有“draw call”是**场景登记数估算**，不是 GPU 实测；视锥剔除会减少一部分，但默认等轴视角几乎整城可见，实际提交量与估算同量级。

| 指标 | 值 | 来源 |
| --- | --- | --- |
| 场景对象 / Group | 7,235 / 729 | 探针 |
| Mesh（非实例化）/ InstancedMesh | 6,301 / 5 | 探针 |
| 窗口实例数 | 1,674（2 次 draw call） | 探针；`city.js:4832-4857` |
| LineSegments（描边） | 200 | 探针 |
| 主 pass draw call 估算 | 6,506 | 6,301 Mesh + 200 Line + 5 Instanced |
| 投射阴影 Mesh / 接收阴影 Mesh | 4,679（74.2%）/ 5,373 | 探针 |
| 阴影 pass draw call 估算 | 4,679 | 探针 |
| 渲染三角形（估算）/ 阴影三角形 | 104,940 / 66,818 | 探针 |
| 唯一几何体 | 12（9 Mesh + 3 Edges） | 探针；`city.js:352-376` |
| 唯一材质 / 其中 Standard | ≈310 / ≈300 | 探针；`city.js:378-402` |
| （几何×材质）组合数 | 339 | 探针；合批上限参考 |
| 材质只被 1 个 Mesh 使用 / ≤4 个 | 75 / 164 | 探针；一次性颜色的长尾 |
| 建筑 / 街区 / 汽车 / 船 | 112 / 57 / 51 / 6 | 探针 |
| 单栋建筑 Mesh 数（均值/最大） | 25.7 / **591**（台北 101） | 探针 |
| 建筑网格合计 / 街区装饰网格 | 2,875 / 1,776 | 探针 |
| `createCity` 耗时（Node） | 首次 107ms，预热 37–60ms | 探针 |
| `dispose` / bounds 计算 | 11.5–14.6ms / 2.29ms | 探针 |
| 规划 `createCityPlan` | 0.29ms | 探针（与渲染无关，规划层很便宜） |
| `city.update` 每帧 | 52–88µs | 探针 |
| `updateEnvironment` 每帧 | 0.3–1.3µs | 探针 |
| `sampleEnvironment` | 0.9–1.2µs，每次新分配 9 个 `THREE.Color` + 结果对象，≈185B/次 | 探针 |
| `update` 堆分配 | ≈625B/帧（≈114 个 Vector3/frame） | 探针（6.25MB/10k 帧） |
| `scene.updateMatrixWorld` 每帧 | **1.19ms**（7,235 对象，全部 `matrixAutoUpdate=true`） | 探针 |
| hover 射线（2,569 个 selectables） | 0.238–0.31ms/次 | 探针 |
| 112 个建筑包围球预筛 | 0.01ms/次 | 探针 |
| 重复重建 6 轮（含 dispose） | 保留堆在 ±1.3MB 内波动，无单调增长 | 探针（`--expose-gc`） |

---

## 2. 发现问题

### [P0] 静态城市几何逐件成 Mesh，单帧约 1.1 万次 draw call

**问题**：整座城市（除窗口、路面标线、铁路枕木外）都是“一个 addBox/一次 Mesh 构造 = 一个独立 Mesh”，没有任何静态合批或实例化。默认视角下主 pass 约 6,506 次 draw call、阴影 pass 约 4,679 次，合计约 **1.1 万次提交/帧**；同时约 310 个材质在每 pass 里反复切换。

**证据**：
- `src/city.js:516-524` `addBox` 每次 `new THREE.Mesh(boxGeometry, material)`，全源码约 490 处调用点（含函数定义本身）；运行时 Box Mesh 5,392 个（85.5% 的 Mesh）。
- 已有实例化只有 5 处：铁路枕木 `city.js:1288-1298`、车道虚线 `city.js:1369-1379`、斑马线 `city.js:1422-1432`、暗/亮窗 `city.js:4832-4857`；其余全部独立 Mesh（探针：InstancedMesh 仅 5 个）。
- 合批条件其实很好：唯一几何 12 个、唯一材质 ≈310 个、组合 339 个（探针）。也就是说即便最朴素的“按几何×材质实例化”，也能把主 pass 从 6,506 降到约 339 + 200 条描边（描边还可合并成 1–3 个 LineSegments）。
- 一次性颜色长尾：`city.js` 中有 **133 处 `standard("#xxxxxx")` 字面量**调用，导致 75 个材质只服务 1 个 Mesh、164 个材质服务 ≤4 个 Mesh（探针），既抬高 draw call，也让“按材质合批”的桶数变多。

**为什么重要**：WebGL 每次 draw call 都有 CPU 提交与状态切换成本。约 1.1 万次/帧意味着仅提交就占掉可观的一核 CPU，且会随内容增长线性恶化；移动端 GPU/驱动下这是最常见的 30fps 分水岭。JS 侧每帧只有 ~1.4ms（见 P2 条目），说明**瓶颈确定在提交与 GPU，而不是脚本**。

**具体改法**（分两步，可独立落地）：
1. **静态烘焙 pass（不需要改 491 个调用点）**：在 `createCity` 末尾（`city.js:5273` 之后、`return` 之前）加 `bakeStatic()`：遍历 `group` 中不在动态集合（cars/boats/birds/trains/fountains/rotors 等，见 `city.js:340-346`）里的 Mesh，把世界矩阵烘焙进顶点，按 `geometry + material + castShadow + receiveShadow` 分桶；Box/Pyramid/Gable 等共享几何直接输出 `InstancedMesh`，边线用 `LineSegments` 合并。对交互有影响的部分按“**每栋建筑合并一次**”保留（112 栋 × 每栋几个材质 ≈ 300 次以内），`userData.building` 与 `selectables` 语义不变，拾取逻辑不用改。
2. **收敛材质**：把 133 处一次性颜色改为受控调色板或顶点色（`material.vertexColors = true`），目标材质数 ≤60；再按材质合并，主 pass 有望降到 **<150 次**。
   注意点：合批后按空间分块（例如按 14 个片区各一组）以保留视锥剔除；透明/加色发光面（`glowMaterial`、`wakeMaterial`）保持独立排序；`selectionOutline` 用的是逻辑 Box3（`main.js:658-693`），不受影响。

**工作量**：M（第一步 1–2 天 + 视觉回归；第二步 1–2 天）。收益：draw call 降一个数量级（~11k → 数百），帧时间与重建耗时同步下降。

---

### [P1] 阴影管线：74% 的网格都投射阴影，且 shadow map 每帧全量重绘

**问题**：`addBuildingInfo` 对建筑根下**所有** Mesh 无条件 `castShadow = true; receiveShadow = true`，覆盖掉生成器里已经写好的 `{ cast:false }` 局部优化；同时 `sun.castShadow` 常开、`shadowMap.autoUpdate` 保持默认 `true`，每帧为 4,679 个投射体重绘 2048² 阴影图。

**证据**：
- `src/city.js:1521-1532`：`root.traverse` 里 `child.castShadow = true; child.receiveShadow = true`——这是全局覆盖点。
- 探针：建筑内 Mesh 2,875 个，其中 **2,693 个投射阴影**（93.7%，即局部 `cast:false` 基本失效）；全场景投射体 4,679（74.2%）。典型“本该不投影”的例子：`addCurtainWall` 的 0.03 厚竖梃/每层楼板线 `city.js:2871-2920`、`addTower` 每 4 层的 0.035 厚装饰线 `city.js:1653-1666`、路灯小配件 `city.js:721-734`。
- `src/main.js:276-290`：`sun.castShadow = true`、`mapSize 2048`、阴影相机 ±35、`PCFSoftShadowMap`（`main.js:176`）。
- 70×70 单位 / 2048² ≈ 0.034 单位/texel，比 0.02–0.035 厚的装饰线还粗，这些小件投影既无视觉收益，又在阴影 pass 里各算一次 draw call。
- 太阳/环境每帧由 `applyEnvironment` 更新（`main.js:475-477`），但一天 ≈ 436 秒，太阳角每秒才转 ~0.8°；场景中持续运动的只有汽车/船/鸟/喷泉/风车，其中只有汽车/船体积值得投影。

**为什么重要**：阴影 pass 与主 pass 同量级（4,679 次），等于每帧付两遍城市成本；而 2048 阴影图+PCFSoft 的取样成本又叠在高 DPI 像素上。移动端这是第二大的 GPU 开销，仅次于主 pass draw call。

**具体改法**：
1. 去掉 `addBuildingInfo` 里的无条件覆盖，改成“默认按尺寸/厚度策略”：`max(scale.x,y,z) < 0.12` 或最长边/最短边比 > 20 的薄片不投影；或让生成器显式传入 `cast` 并在 `addBuildingInfo` 里尊重已有值。
2. 汽车/船/鸟/喷泉不投影（体量小），用贴地 blob shadow 或直接省略；建筑阴影才是构图关键。
3. `renderer.shadowMap.autoUpdate = false`，在 `applyEnvironment` 中仅当太阳位置变化超过阈值（如 0.5 世界单位）或重建城市时置 `needsUpdate = true`（约 5–10Hz 足够）；PCFSoft 可降为 PCF。
4. shadow 相机收紧到城市实际范围（±26 而非 ±35），texel 密度提高 35%，可同时把 `mapSize` 降到 1024–1536 而不掉质量。
   预期：阴影 pass 从 4,679 次降到几十~几百次，帧时间显著下降。

**工作量**：S–M（0.5–1 天 + 截图对比）。

---

### [P1] 超高层逐层拆成独立 Mesh：单栋 591 个，`addCurtainWall` 每层/每竖梃一个盒子

**问题**：塔楼的幕墙竖梃、每层楼板线、每层亮窗都是独立 Mesh；一栋 500m 级塔楼可产生 600 个 Mesh，单个街区最多 645 个可绘制对象（含描边线）。

**证据**：
- 探针：台北 101 单体 **591 个 Mesh**（全部投射阴影）；潮汐大楼 248、像素之巅 197；单街区 C-09 645 个可绘制对象。
- `src/city.js:2852-2922` `addCurtainWall`：columns×2 根竖梃（`city.js:2871-2879`）+ rows×2（`2880-2888`）+ 每 `bandEvery` 层一条楼板线（`2902-2907`）+ 每层随机亮窗（`2908-2921`），全部 `addBox`。宽 4 单位的塔身 `finStep 0.19` → 单侧 ~21 根，四面 ~84 个 Mesh/塔。
- `src/city.js:3196-3952` `addSkyscraperBlock` 单函数 757 行，内部对 2 座塔、冠顶、广场、机械层重复上面的构造。

**为什么重要**：这是“最贵的一类内容”——用户视线中心（CBD/地标）恰好是全场景 draw call 密度最高的地方；且随“再加一座塔/再细化幕墙”线性增长。对拾取也有影响：`selectables` 里 2,569 个 Mesh 大部分来自这些塔楼细件。

**具体改法**：把 `addCurtainWall` 内部的三类重复构件改为局部 `InstancedMesh`（竖梃一套、楼板线一套、亮窗一套），单塔从 ~140 个 Mesh 降到 ~5–10 个；`addTower` 的每层檐口/阳台同理（`city.js:1653-1711`）。更彻底的做法是等 P0 的 `bakeStatic()` 落地后自动解决。拾取仍用建筑根 `userData.building`。

**工作量**：S（半天，局部改动、易回归）。

---

### [P1] 重建在主线程同步完成：无 loading、无防抖、材质/几何不复用，且先写 seed 再建城

**问题**：`spawnCity` 在按钮/键盘事件里同步执行 `city.dispose()` + `createCity()`，整段阻塞主线程；重建期间没有 loading 提示（boot 只在首帧用一次）；材质/共享几何每次重建都重新创建；seed 在 `createCity` **之前**已写入 localStorage/URL。

**证据**：
- `src/main.js:608-624`：`city.dispose()` → `persistSeed` → `createCity({seed})` → `scene.add` → `applyEnvironment`，全同步；没有 `try/catch`。
- `src/main.js:616`（`persistSeed`）在 `main.js:617`（`createCity`）之前——若构建抛错，坏 seed 已进 URL 与 localStorage，刷新会持续失败。
- `src/city.js:5273-5285`：同步建完整城 + `group.updateMatrixWorld(true)` + 112 次 `Box3.setFromObject`。
- 探针：`createCity` 预热 37–60ms、首次 107ms；`dispose` 11.5–14.6ms；bounds 2.29ms；Node 堆分配约 22–35MB/座。浏览器还要加上首帧的 GPU 上传与状态重建，实际卡顿按 1.5–3 倍估。
- 重建按钮/`R` 键无防抖（`main.js:829`、`main.js:890-891`），连点会排队多次同步构建。
- `boot` 只服务首次加载（`main.js:982-992`、`601-606`），重建时无任何进度反馈。

**为什么重要**：换种子是核心玩法（“同一串种子生成同一座城”），每次卡 100–300ms 是可感知的交互断裂；移动端/低端机更明显。虽然 dispose 完整，但“旧城销毁 → 新城建好”之间还有一帧空场风险。

**具体改法**：
1. **先建后换**：`const next = createCity(...)`（新 group 先不入场景）→ 成功后再 `scene.remove(old.group); old.dispose(); scene.add(next.group)`；失败则保留旧城并弹 toast。同时把 `persistSeed` 移到成功之后。
2. **异步化**：点击后先显示 boot overlay，`await new Promise(r => requestAnimationFrame(r))` 让浏览器先画 loading，再构建；或把 `bakeStatic`/构建分片到 `requestIdleCallback`。
3. **资产复用**：把几何/材质缓存提升到模块级（`city.js:335-337` 的 `materials`/`geometries`/`materialCache` 改为跨重建缓存），只有 seed 相关颜色重新取；可省掉大部分对象分配与 GPU 缓冲重建。
4. 构建期间禁用重建按钮并加 300ms 防抖。

**工作量**：S–M（0.5–1 天）。

---

### [P1] 移动端/高 DPI 缺少质量分级与自适应分辨率：2× 超采样 + MSAA + 2048 阴影叠加

**问题**：渲染分辨率策略是“`devicePixelRatio` 上限 2、总像素上限 240 万，再手动 `setPixelRatio(1)` 交给 CSS 缩放”，同时开启 `antialias: true`——等于**超采样 + MSAA 双重抗锯齿**；阴影固定 2048；没有任何画质档位或基于帧时间的自适应。

**证据**：
- `src/main.js:375-383`：`dpr = min(devicePixelRatio, 2)`，`maxPixels = 2400000`，`setPixelRatio(1)` + `setSize(renderWidth, renderHeight, false)`；canvas CSS 尺寸为 100%（`style.css:53-58`）。
- `src/main.js:160-165`：`antialias: true`；`main.js:171` 与 `main.js:382` 重复调用 `setPixelRatio(1)`。
- `src/main.js:175-176`、`276-290`：`shadowMap` 常开、PCFSoft、2048²。
- 典型手机 390×844 @dpr3 → 实际渲染 780×1688 ≈ 132 万像素、开 MSAA；叠加 P0/P1 的 1.1 万 draw call 与 4,679 阴影提交，低端机很难维持 30fps。反过来 4K 桌面（3840×2160）被压到 ≈2066×1162 后用 CSS 放大，画面偏软。
- 无 `renderer.info` 读取、无帧时间监测、无 URL/设置里的画质开关（`main.js` 全文无相关逻辑）。

**为什么重要**：这是“同一份代码在用户真实设备上能不能跑”的关键；项目定位是展示型 3D 城市，移动端占比通常过半。固定策略无法同时满足高分屏清晰度与移动端帧率。

**具体改法**：
1. 引入 `quality` 档位（low/medium/high）：low → dpr 1、`antialias:false`、shadow 1024、关闭水面 ripple 第二层；high → 当前策略。按 `matchMedia('(pointer: coarse)')`、屏幕像素数、`navigator.hardwareConcurrency` 初选，写入 URL/localStorage 供分享复现。
2. 基于滚动窗口帧时间（如 60 帧中位数 > 20ms）自动降一档，并提供手动覆盖；主要调 `maxPixels` 而不是缩放 CSS。
3. 若保留超采样就别开 MSAA，二选一；像素风项目通常 dpr 1.5 + 无 MSAA 即可。
4. 用 `renderer.info.render.calls/triangles` 在开发模式显示 HUD，并把它作为回归指标（见 P2「缺少渲染可观测性」）。

**工作量**：M（1–2 天，含多设备手测）。

---

### [P1] 架构：5442 行单文件、87 个嵌套函数、无模块边界、无测试/无静态检查

**问题**：`city.js` 的所有实现都塞在 `createCity` 一个闭包里：材料/几何工具、10 余种建筑生成器、街道家具、车辆船只、交通/喷泉/鸟的动画、昼夜绑定、`dispose` 全混在一起；`main.js` 的 996 行也全在 `if (renderer) {}` 内、无导出。项目没有测试、lint、typecheck 脚本。

**证据**：
- `src/city.js:329` `createCity` 开始 → `src/city.js:5442` 结束；`src/city.js` 中 `^  function` 形式的**嵌套函数 87 个**。
- 单函数体量：`addSkyscraperBlock` **757 行**（`city.js:3196-3952`）、`addTower` 330 行（`1579-1908`）、`decorateCityBuilding` 291 行（`2311-2601`）、`addCars` 193 行（`4859-5051`）、`addRoads` 184 行（`1325-1508`）。
- 模块只导出 2 个符号：`randomCitySeed`（`city.js:325`）、`createCity`（`city.js:329`）；return 对象是唯一接口（`city.js:5426-5441`）。
- `src/main.js:170` 起全部逻辑在 `if (renderer)` 内，文件无 `export`；DOM 查询、UI、拾取、相机、循环、持久化全在一个作用域。
- `package.json:7-11` 只有 `dev`/`build`/`preview`，无 `test`/`lint`/`typecheck`；仓库内无任何 `*.test.*`/`*.spec.*`。
- 可测试性支撑点其实存在：`createCity` 在 Node 里只需 stub 一个 canvas（本次探针即证明，零 WebGL 可构建整城），但没有任何自动化用例把它用起来。

**为什么重要**：这是长期成本最高的一条。当前“改一处颜色/新增一种建筑”都要在 700 行级函数里找位置；任何重构（规划改造、合批、画质分级）都会撞上这个结构；没有测试意味着上述所有性能改动都只能靠肉眼看截图，回归风险高。

**具体改法**（渐进式，不必一次性拆完）：
1. 抽出纯函数/纯数据模块：`kit.js`（几何/材质/调色板/描边）、`buildings/`（tower/house/skyscraper/catalog 生成器，每个接受 `rng` 与 `materials` 依赖）、`props.js`（家具/树/公园）、`traffic.js`（cars/boats/trains/birds 的构建与 `update`）、`environment-binding.js`（材质灯光绑定与 `dispose` 注册表）。
2. `createCity` 只做编排：plan → 分组构建 → `bakeStatic` → 统计 → 返回接口。返回接口保持兼容，避免同时改 `main.js`。
3. 引入 `jsconfig`/JSDoc + `tsc --checkJs`（或逐步 TS）与 ESLint；对纯函数加最小测试（`mulberry32` 确定性、plan 输出、材质缓存）。
4. 加一个**无头回归测试**：Node 里 `createCity({seed:'A1B2C3D4'})` 断言 `mesh count / draw call 预算 / 材质数 / 高楼数` 等（现成的 `docs/review/metrics.mjs` 已是雏形，可直接改造成 CI 用例）。
5. `main.js` 按职责拆 `bootstrap.js`（renderer/scene/lights）、`camera-rig.js`、`picking.js`、`ui.js`、`loop.js`。

**工作量**：L（分 3–5 个迭代，每个迭代 1–3 天；收益是后续所有改动的速度与安全性）。

---

### [P2] 每帧 `sampleEnvironment` 分配 9 个 `THREE.Color` + 结果对象

**问题**：`environment.js` 的 `sampleEnvironment` 每次调用都 `new THREE.Color()` 做 9 次 lerp，并新建结果对象；`main.js` 的 `tick` 每帧调用一次。

**证据**：`src/environment.js:229-256`，尤其 `241-247` 的 `result[key] = new THREE.Color().lerpColors(...)`；`src/main.js:945-946` 每帧调用。探针：0.9–1.2µs/次、≈185B/次分配（11.11MB/60k 次），60fps 下 ≈11KB/s 的 GC 压力。

**为什么重要**：绝对量不大（每帧约 0.2–0.3% 帧预算），但属于“零成本可消除”的抖动源；GC 尖峰在移动端更明显。

**具体改法**：模块级 `scratch` 结果对象 + 9 个复用 Color，`sampleEnvironment(hours, target = scratch)` 就地 `lerpColors` 并返回 `target`；注意 `applyEnvironment` 里只读复制，不会长期持有引用（`main.js:455-484`），安全。

**工作量**：S（<1 小时）。

---

### [P2] 每帧曲线采样分配约 114 个 `Vector3`（`getPointAt`/`getTangentAt` 未传 target）

**问题**：汽车/船每帧调用 `curve.getPointAt(t)` 与 `getTangentAt(t)`，两者都会新建 `Vector3`；且每个汽车都有自己的一条 `CatmullRomCurve3`。

**证据**：`src/city.js:5304-5312`（汽车）、`5314-5325`（船）；曲线创建于 `city.js:5013-5021`（每街区一条，51 辆车）。探针：`update` 每帧 52–88µs、堆分配 ≈625B/帧（6.25MB/10k 帧）。three 的 `Curve.getPointAt(u, optionalTarget)` / `getTangentAt(u, optionalTarget)` 支持复用 target。

**为什么重要**：同样是“低风险、稳定收益”的分配抖动；顺带可把 51 条曲线合并为按街区缓存的少数曲线（一辆车一条路径时可在创建时预采样位置表，运行时只做插值）。

**具体改法**：每个 car/boat 预分配 `this.point = new Vector3(); this.tangent = new Vector3()`，调用 `curve.getPointAt(t, car.point)`；或把逐点采样改成创建时烘焙的 `Float32Array` 路径表 + 线性插值。**工作量**：S（半天）。

---

### [P2] hover 拾取：每次 `pointermove` 对 2,569 个 Mesh 全量射线检测，且未节流

**问题**：鼠标每次移动（非拖拽状态）都会对 `city.selectables`（2,569 个 Mesh）做一次完整 `Raycaster.intersectObjects`，只是为了切换 cursor 样式。

**证据**：`src/main.js:706-716`（`pickAt`）、`718-722`（`updateHover`）、`735-742`（`pointermove` 每次触发）。探针：0.238–0.31ms/次。高刷鼠标（125–1000Hz）下相当于每秒几十到几百毫秒 CPU。对比：112 个建筑的包围球预筛仅 0.01ms（探针）。

**为什么重要**：交互卡顿/风扇声的常见来源，且完全可以用两阶段拾取消除；同时 `classList.toggle` 每次事件都调用一次。

**具体改法**：① 用建筑 `record.bounds` 生成 112 个包围球做粗筛（0.01ms + 少量 narrow phase）；② 只在 `hit` 状态变化时切换 class；③ 把 hover 合并到 rAF（每帧最多一次）或 100ms 节流；④ 合并建筑后（P1-3/P0）selectables 可以直接指向“每栋合并网格”，数量降到 112–300。

**工作量**：S（半天）。

---

### [P2] 每帧全量 `updateMatrixWorld`：7,235 个对象约 1.19ms，全部 `matrixAutoUpdate=true`

**问题**：渲染器每帧遍历场景计算世界矩阵；源码中没有任何 `matrixAutoUpdate = false`，7,235 个对象全部每帧重新 compose（含 6,301 个静态 Mesh）。

**证据**：探针 `scene.updateMatrixWorld()` 1.19ms/帧；冻结静态对象后 1.13ms——说明**单纯冻结收益很小**（遍历本身占大头），根因是对象数量。合批（P0）后对象数降到数百，该项自然消失。`src/city.js` 全文无 `matrixAutoUpdate`（grep 无结果）。

**为什么重要**：1.19ms ≈ 1080p@60fps 帧预算的 7%，属于“不修也能跑、修了更稳”的项；它也是“合批”的佐证数据之一。

**具体改法**：随 P0 合批完成后对象数骤降即可；若暂不合批，可把静态子树 `matrixAutoUpdate=false`（对根 Group 做一次 `updateMatrixWorld(true)`），但预期收益只有 ~0.06ms，不建议单独做。

**工作量**：随 P0 顺带完成。

---

### [P2] UI 每 110ms 全量写 DOM，无脏检查；`dayMarker` 用 `style.left` 触发布局

**问题**：`updateInterface` 每 110ms 无条件写 6 个 `textContent`、1 个 `style.left`、1 次 `classList.toggle`；即使值没变也会触发样式/文本更新。

**证据**：`src/main.js:910-922`（写入点）、`974-977`（节流到 110ms）。`dayMarker.style.left = ${...}%`（`main.js:915`）走布局属性而不是 `transform`。

**为什么重要**：频率不高、量级小，但 3D 主循环里任何非必要的 DOM 写入都可能造成一帧掉队；且 `style.left` 需要重排，改用 `transform: translateX()` 几乎免费。

**具体改法**：缓存上次值，相等则跳过；用 `data-*`/CSS 变量表达昼夜；`dayMarker` 改 `transform`。**工作量**：S（1–2 小时）。

---

### [P2] `resize` 未节流：每次事件都 `setSize` 重建 drawing buffer

**问题**：`window.resize` 每次都调用 `sizeRenderer()`，其中 `renderer.setSize()` 会重新分配 WebGL drawing buffer；窗口拖动/移动端地址栏收放会连续触发。

**证据**：`src/main.js:449-453`；`sizeRenderer` 内 `main.js:355-384`。此外 4K 屏被 `maxPixels=2.4M` 压到约 2066×1162 再 CSS 放大，属于“保帧率牺牲清晰度”的硬编码取舍。

**为什么重要**：拖动窗口时掉帧/闪烁；移动端滚动时地址栏收放会反复重建缓冲。

**具体改法**：`ResizeObserver` + `requestAnimationFrame` 合并，或 100–150ms 防抖；把 `maxPixels` 纳入 P1 的画质档位，而不是固定值。**工作量**：S（1 小时）。

---

### [P2] 无 `webglcontextlost` / `webglcontextrestored` 处理

**问题**：全仓库没有任何上下文丢失监听。GPU 重置、移动端切后台回来、驱动崩溃时 canvas 会变黑且无法恢复，只能手动刷新。

**证据**：`src/main.js:159-168` 只处理了**创建 renderer 失败**（try/catch + `showError`，`main.js:146-153`、`index.html:246-253` 的 error overlay）；grep `contextlost`/`visibilitychange` 全仓库无结果。

**为什么重要**：WebGL 上下文丢失在移动端/双显卡笔记本上是真实高频事件；对展示型站点来说，“黑屏需刷新”是最差的失败模式。

**具体改法**：`canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(...); })`，`webglcontextrestored` 时重新 `createCity` 并重置选择/相机；期间显示 overlay 文案。**工作量**：S（半天）。

---

### [P2] 无 WebGL 能力检测/降级与错误恢复策略

**问题**：只有 try/catch 包住 `new WebGLRenderer`；失败后只显示通用错误文案，`showError` 对每帧重复错误会反复写 DOM；没有 WebGL1/2 能力检查、没有“静态海报/图鉴链接”降级。

**证据**：`src/main.js:146-168`；`index.html:246-253` 错误层只有固定提示；`window.addEventListener("error")`（`main.js:155-156`）对一次性异常合适，但对每帧异常会刷屏（`showError` 每次都写 `textContent`/`hidden`）。

**为什么重要**：低端设备/远程桌面/禁用硬件加速的用户是真实存在的；一个“可用的降级画面 + 图鉴链接”比“系统故障”更友好。**具体改法**：创建前 `canvas.getContext('webgl2') || getContext('webgl')` 探测；失败时展示静态截图/图鉴入口；`showError` 加“只报一次”去重。**工作量**：S（半天）。

---

### [P2] 确定性依赖单条 RNG 流：改一处随机调用，全城重排

**问题**：`createCity` 只有一条 `mulberry32(seed)` 流（`city.js:330`），先给 `createCityPlan`（`331`），之后按构建顺序被所有生成器共享；任何新增/删除一次 `rng()` 都会让后面所有建筑、名称、树、车的位置整体改变。`makeName` 的重试循环（`city.js:1509-1519`）本身还会按名字冲突动态消耗随机数。

**证据**：`src/city.js:330-331`；随机调用的典型分布：树 `625-680`、窗口 `1554-1567`、`addWindows:1534-1577`、车辆 `5008-5048`、名称 `1509-1519`。规划文档阶段三第 6 条已建议“派生随机流”，这里补充**工程后果**：无法单独重建/对比某一子系统，无法做“只改树不影响建筑”的 A/B，也让截图回归无法定位变化来源。

**为什么重要**：种子复现是这个项目的核心卖点（URL 分享 seed），但当前“同 seed 同城”只在完全相同的构建顺序下成立；一旦功能迭代，旧分享链接的城市会变形。**具体改法**：`rngFor(seed, 'plan'|'buildings'|'props'|'traffic')` 派生独立流（如 `mulberry32(seed ^ hash(subsystem))`），子系统内再按 block/建筑 ID 派生；`createCity` 增加可选 `variant` 参数。**工作量**：M（1–2 天，需清理全局随机调用点）。

---

### [P2] 错误处理与持久化顺序：构建失败后坏 seed 会“粘住”

**问题**：`spawnCity` 先 `persistSeed`（写 URL + localStorage）再 `createCity`，且没有 try/catch；构建抛错时旧城已销毁、新城未加入，画面变空，UI 统计仍是旧值，而刷新会带着同一个坏 seed 继续失败。

**证据**：`src/main.js:608-624`（顺序：`clearSelection` → `dispose` → `setSeedLabel` → `persistSeed` → `createCity`）；`main.js:146-153` 的全局错误只会弹 overlay。**为什么重要**：种子输入是用户可写入口（`main.js:852-862`），异常输入/未来数据缺字段都可能触发；一个坏 seed 粘在 URL 里对分享链接尤其糟糕。**具体改法**：按上文「重建在主线程同步完成」的“先建后换”重排顺序；`createCity` 外层 try/catch，失败回滚到旧城/初始 seed；`persistSeed` 移到成功后。**工作量**：S（与重建条目合并）。

---

### [P2] 相机/投影双 rig 复杂度高：两套相机 + 三套换算 + tween + 限制

**问题**：同时维护 `orthoCamera`/`perspectiveCamera`，`camera` 变量在两者间切换（`main.js:227`、`416`、`432`），`cameraViewHeight`、`zoom`、`minDistance/maxDistance`、`minZoom/maxZoom`、`setOrthoFrustum`、`syncPerspectiveLimits`、`sizeRenderer` 的透视/正交分支、`resetView` 的 tween/非 tween 分支、`clampCameraTarget` 交织在一起；切换投影时的视野保持逻辑（`main.js:386-447`）约 60 行，改一处要同时对两套相机成立。

**证据**：`src/main.js:220-268`（相机/控制初始化）、`335-353`（限制/视锥/距离）、`355-384`（resize 两分支）、`386-447`（投影切换）、`777-800`（复位 tween）。相机状态（位置/朝向/投影）也未完整持久化（只存 `projection`，`main.js:518-531`）。

**为什么重要**：这是 `main.js` 里最容易出 bug 的区域（缩放语义、aspect、zoom 与 distance 混用），也让“加个预设视角/分享视角”这类功能成本变高。**具体改法**：抽 `CameraRig`（单一状态：target/distance/yaw/pitch/viewHeight/projection；内部换算 ortho/persp；tween/限制/ resize 都是它的方法），把 `main.js` 里 5 处相机分支收敛到 1 个模块；换算函数可单测。**工作量**：M（1–2 天）。

---

### [P2] 水面 ShaderMaterial 未接入 fog/tonemapping；2600² 双面全屏 overdraw

**问题**：水面用自定义 `ShaderMaterial`（`city.js:228-285`，`side: THREE.DoubleSide` 见 `city.js:283`）只 include 了 `colorspace_fragment`，没有 fog 与 tonemapping；水面几何是 2600×2600 的平面（`city.js:1209-1214`），在等轴视角下覆盖大片屏幕，每像素跑两层 hash ripple。

**证据**：`src/city.js:267-281`（fragment 无 fog include，`gl_FragColor` 前只有 colorspace）、`city.js:271-274`（两次 ripple 取 max）、`city.js:1207-1214`（平面尺寸）。场景雾由 `main.js:181`、`applyEnvironment:457-463` 设置；其他材质随雾衰减，水面不随雾 → 远景海面与雾色不一致。

**为什么重要**：视觉一致性（远景衔接）与 GPU 填充率（像素级 shader）；虽然 pixel-art 抖动可掩盖部分问题，但 horizon 处会更明显。**具体改法**：加入 `fog_fragment`/`tonemapping_fragment` include 与对应 uniforms；水面半径收敛到 fog far + 边距（如 220）；`side: FrontSide` 足够（相机不会到水下）。**工作量**：S（半天）。

---

### [P2] 首屏 JS 体积与模块边界（与工程审计交叉）

**问题**：`main.js:1`、`city.js:1` 都是 `import * as THREE`（命名空间导入妨碍 tree-shaking）；`city.js:2-11` 从 `object-catalog.js` 拉入全部数据；两页入口（`vite.config.js:1-12`）共享 chunk。现有 `dist/` 产物显示共享 chunk ≈593KB（含 three）+ 主入口 ≈110KB，但 `dist/` 可能不是最新构建，**体积结论以工程审计的重新构建为准**。

**证据**：`src/main.js:1`、`src/city.js:1-12`；`src/city.js:2-11`（8 个具名导入，均在用）；`package.json:13-17`（仅 three 依赖）。**为什么重要**：影响首屏可交互时间（尤其移动网络）。**具体改法**：按需具名导入、three 单独手动分包（`manualChunks`）、考虑把 catalog 数据按需动态 import；与工程审计合并建议，不在本报告展开。**工作量**：S–M。

---

### [P2] 缺少渲染可观测性：`renderer.info` 未接，无 draw call/三角形预算与回归

**问题**：没有任何开发期性能面板；`renderer.info`（draw calls/triangles/programs/geometries）从未读取；也没有把“网格数/材质数/阴影投射体数”变成可断言的预算。

**证据**：`main.js` 全文无 `renderer.info`；无 GPU timer query；`docs/review/metrics.mjs` 目前是手工脚本，未进 CI。**为什么重要**：本报告里所有结论在下次改动后都可能失效而无人察觉；有了预算与 HUD，P0/P1 的收益才能被量化守住。**具体改法**：开发模式叠加 HUD（calls/triangles/ms）；CI 里跑 Node 无头指标脚本并与阈值比较（如 calls < 1500、casters < 800、materials < 100）；浏览器侧用 `EXT_disjoint_timer_query`（可选）。**工作量**：S–M。

---

## 3. 做得好的地方（应保留）

- **几何共享**：整座城只用了 12 个几何体（`city.js:352-376`，坐标/索引数据极小），这是后续合批的最大本钱。
- **已有实例化范式**：路面虚线/斑马线/铁路枕木/窗户都用 `InstancedMesh`（`city.js:1288-1298`、`1369-1379`、`1422-1432`、`4832-4857`）——说明作者知道该怎么做，只是没有推广到建筑主体。
- **材质缓存**：`materialCache` 按 `color + options` 复用（`city.js:378-402`），避免同一颜色重复建材质。
- **`dispose()` 覆盖完整**（`city.js:5392-5424`）：几何/材质/纹理都释放，且 `main.js:610-613` 重建前确实调用；Node 6 轮重建无单调内存增长。
- **单条 rAF、无重复注册**：`main.js:932-933` 仅一条循环；重建不会叠加动画循环。
- **状态持久化与分享**：URL/localStorage 读写有 try/catch 兜底（`main.js:74-103`、`501-531`），seed/projection 可分享。
- **无障碍/降级基础**：`prefers-reduced-motion`（`main.js:58`、`777-800`）、错误 overlay、boot 进度、`aria-pressed/label` 齐备（`main.js:533-545`、`802-821`）。
- **DOM 更新已有节流**（110ms，`main.js:974-977`），只差脏检查。

---

## 4. 建议实施顺序（按 ROI）

| 顺序 | 事项 | 工作量 | 预期收益 |
| --- | --- | --- | --- |
| 1 | 阴影策略：尊重 `cast:false`、按尺寸筛投射体、`shadow.autoUpdate=false`、收紧阴影相机 | S–M，0.5 天 | 阴影提交 4,679 → 几百；PCF 取样减少 |
| 2 | 静态烘焙合批：`bakeStatic()` + 按建筑合并 + 描边合并 | M，1–2 天 | 主 pass 6,506 → 数百；场景图遍历 1.19ms → ~0.1ms |
| 3 | 重建体验：先建后换 + loading + 防抖 + seed 后写 | S，0.5 天 | 换种子不再卡死主线程、失败可回滚 |
| 4 | 画质分级 + 自适应分辨率 | M，1–2 天 | 移动端可用性 |
| 5 | 低风险每帧优化：`sampleEnvironment` 复用、曲线采样复用、hover 预筛、DOM 脏检查、resize 节流 | S，1 天合计 | 减少 GC 抖动与交互卡顿 |
| 6 | `webglcontextlost` + WebGL 降级 + 渲染可观测性 | S，1 天 | 健壮性与后续可回归 |
| 7 | 架构拆分 + 无头回归测试 | L，分迭代 | 长期开发速度与安全网 |
| 8 | RNG 派生流、相机 rig、水面 shader 一致性 | M | 复现性、可维护性、视觉一致性 |

说明：第 1、2 步不改变城市外观（允许截图对照微调），最适合先做；第 7 步与规划改造可以并行，但**建议在规划改造前先完成第 2 步**——否则街区/建筑数量一涨，性能问题会被放大后再返工。

---

## 5. 验证方式与局限

- 本次数字来自 Node 静态实例化：可精确反映**网格/材质/场景对象数量与 JS 构建/更新耗时**，但不能替代浏览器 GPU 实测；draw call 是登记数估算（未计视锥剔除），真实值需在浏览器用 `renderer.info.render.calls` 复核。
- 建议 lead 在构建完成后，用 `http://127.0.0.1:<port>/?seed=A1B2C3D4` 配合 Chrome Performance 面板记录 10 秒，取 `renderer.info` 的 calls/triangles/programs 与帧时间中位数，作为本报告的验收基线；再按第 4 节顺序逐项复测。
- 生命周期结论（无 JS 堆泄漏）来自 Node `--expose-gc` 的 6 轮重建；GPU 侧资源（纹理/缓冲/阴影贴图）无法在 Node 中测量，建议在浏览器 DevTools 的 Memory/WebGL 面板复核。
- 本轮未修改任何源码、未启动 dev server、未运行构建；临时探针只在 `%TEMP%\voxel-audit\`，不随仓库提交。

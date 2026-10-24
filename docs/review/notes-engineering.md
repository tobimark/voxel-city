# 工程实践、仓库卫生、构建与文档审计

> 项目：像素湾 PIXEL BAY（Three.js 像素风城市模拟 + 物体图鉴，Vite 多页）
> 审计范围：package.json / vite.config.js / 构建产物 / git 状态 / 质量门禁 / docs 与研究目录 / 交付与发布
> 审计时间：2026-10-24 13:02–13:20（Asia/Shanghai）
> 环境：Windows 10.0.26200 · Node v22.22.2 · npm 11.6.2 · vite 8.3.5 · three 0.186.1 · lockfileVersion 3
> 约束：未修改任何源码、package.json、配置、git 状态（未 add/commit/checkout/clean）；除本文件外唯一写入是 `npm run build` 产生的 `dist/`（已被忽略）与 `%TEMP%` 下的临时验证构建
> 优先级定义：**P0** = 数据丢失/不可交付风险，立即处理；**P1** = 影响持续开发与发布，本周处理；**P2** = 优化项，本月处理

---

## 0. 结论速览（先看这 5 条）

| # | 严重度 | 结论 | 关键数字 |
|---|---|---|---|
| 1 | **P0** | 仓库不可复现、无备份：1 个提交 + 4,791 行未提交 + 约 127 个未跟踪文件/11.2MB + 无 remote | 已提交 15 文件/521,606 B；`.git` 96.61MB，909 个不可达对象 |
| 2 | **P1** | 构建能用但无门禁：618.30kB 共享 chunk 触发警告、three 占 94%、无 CI/lint/test/typecheck | 两页首屏 gzip 205.2/202.5kB；构建 266ms、17 modules |
| 3 | **P1** | 交付入口缺失：无 README/LICENSE/部署配置；`base` 未设置，子路径部署必白屏 | dist 资源为 `/assets/...`，3 处 `<a href="/...">` 绝对路径 |
| 4 | **P1** | 研究目录是"三份源码副本"：5,481 行 `native-buildings.js` 与 `src/city.js` 仅差 11+/50−，且已发生漂移 | 重复源码约 600KB；`harbor-study/verify.mjs` 已红（seed=1） |
| 5 | **P1** | 工作区卫生：`dist-harbor-study`/`dist-ring-study` 未被忽略（1.96MB 构建产物）、约 9MB 研究位图无归档策略 | `git add -A` 会一次性写入约 13MB 垃圾 |

> 一句话建议：**先把工作区收进 git（分批提交 + remote + gc），再把已存在的纯 Node 验证脚本接进 CI，最后补 README/部署与体积预算。** 三项合计约 1 天，能消除 80% 的工程风险。

---

## 1. 构建与产物（实测）

### 1.1 构建命令与完整输出

```text
> npm.cmd run build
> pixel-bay@0.1.0 build
> vite build

vite v8.3.5 building client environment for production...
transforming...
✓ 17 modules transformed.
rendering chunks...
computing gzip size...
dist/catalog.html                         9.94 kB │ gzip:   3.10 kB
dist/index.html                          12.59 kB │ gzip:   3.78 kB
dist/assets/city-Dpr-1hnB.css            16.36 kB │ gzip:   4.36 kB
dist/assets/catalog-BPlzShfF.css         27.25 kB │ gzip:   6.40 kB
dist/assets/city-yGj7Z4lw.js            114.70 kB │ gzip:  41.74 kB
dist/assets/catalog-CCg5OSjN.js         118.34 kB │ gzip:  37.62 kB
dist/assets/object-catalog-GM7PPB3g.js  618.30 kB │ gzip: 162.44 kB

✓ built in 266ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: ...
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```

结论：**构建成功（exit 0）**，唯一警告是 >500kB chunk；无其它 warning/deprecation 输出；内容哈希稳定（两次独立构建产物文件名/大小一致：`city-yGj7Z4lw.js`、`catalog-CCg5OSjN.js`、`object-catalog-GM7PPB3g.js`）。

### 1.2 dist 清单与压缩体积（node zlib 实测，非估算）

| 文件 | raw B | gzip B | brotli B |
|---|---:|---:|---:|
| `dist/index.html` | 12,591 | 3,774 | 2,951 |
| `dist/catalog.html` | 9,944 | 3,089 | 2,407 |
| `dist/assets/city-Dpr-1hnB.css` | 16,369 | 4,337 | 3,802 |
| `dist/assets/catalog-BPlzShfF.css` | 27,250 | 6,353 | 5,595 |
| `dist/assets/city-yGj7Z4lw.js` | 114,706 | 41,223 | 34,508 |
| `dist/assets/catalog-CCg5OSjN.js` | 118,345 | 37,086 | 31,932 |
| `dist/assets/object-catalog-GM7PPB3g.js` | 618,304 | 160,809 | 131,520 |
| **dist 合计（7 文件）** | **917,509（896.0 kB）** | **256,671（250.7 kB）** | **212,715（207.7 kB）** |

按页面首屏（HTML+CSS+入口 JS+共享 chunk）计算：

| 页面 | raw | gzip | 说明 |
|---|---:|---:|---|
| 城市页 `/index.html` | 761,970 B（744.1 kB） | **210,143 B（205.2 kB）** | index.html + city css + city js + object-catalog 共享 chunk |
| 图鉴页 `/catalog.html` | 773,843 B（755.7 kB） | **207,337 B（202.5 kB）** | catalog.html + catalog css + catalog js + 同一共享 chunk |

### 1.3 分块结构、共享情况、three tree-shaking

用 `--sourcemap` 生产构建 + 自写 VLQ 解码按 source 归因（生成字符数，非字节，CJK 会低估字节）：

| 共享 chunk（`object-catalog-GM7PPB3g.js`，618,304 B）来源 | 生成字符 | 占比 |
|---|---:|---:|
| `three/build/three.core.js` | 201,163 | 33.1% |
| `three/build/three.module.js`（WebGLRenderer 等） | 199,498 | 32.9% |
| `three/examples/jsm/controls/OrbitControls.js` | 19,808 | 3.3% |
| `src/object-catalog.js`（应用数据） | 34,204 | 5.6% |
| 无法归因的 GLSL 着色器字符串（属于 three 的 ShaderLib） | 150,344 | 24.7% |
| **three 合计** | **≈570,813** | **≈94.0%** |

- **两页共享 chunk 正确复用**：`dist/index.html:18` 与 `dist/catalog.html` 都 `modulepreload` 同一个 `object-catalog-GM7PPB3g.js`；入口 chunk 内 **没有 three**（city 入口 114,706 B 全部映射到 `city.js/main.js/city-plan.js/environment.js`，catalog 入口 118,345 B 全部映射到 `showcase-models.js/catalog-page.js/showcase-studio.js`），不存在 three 重复打包。
- **共享 chunk 里混入应用数据**：`src/object-catalog.js` 只有 34KB（5.6%），却被并进 618kB 大 chunk，导致**改图鉴数据也会让整个 three chunk 缓存失效**。
- **tree-shaking 已生效但收益有限**：`import * as THREE` 的 45 个使用点、无 `THREE[...]` 动态访问；three 两个 build 文件共 454 个导出，产物中只出现 206 个定义（**248 个被 DCE**：`AnimationMixer`/`Audio`/`SkinnedMesh`/`ExtrudeGeometry`/`LOD` 等确实不在产物里）。但 `WebGLRenderer` 会拖入核心渲染管线 + 全部 GLSL 着色器库，所以 three 仍占 94%。**继续优化 tree-shaking 的边际收益很小，体积优化应转向 vendor 拆分与加载策略。**
- **资源内联策略**：项目完全程序化生成、无位图/字体资产（`dist` 只有 7 个文件、无 `public/`）；favicon 是内联 SVG data URI（`index.html:15`），CSS 独立成文件；没有需要调 `assetsInlineLimit` 的资源。这一点很干净，无需改动。
- **实测拆分验证**（临时 config 写到 `%TEMP%`，未改动项目配置）：`build.rolldownOptions.output.codeSplitting.groups = [{ name: "three", test: /node_modules[\\/]three/ }]` 后：

```text
three-B5Te0aTU.js      572.49 kB │ gzip: 142.98 kB
object-catalog-*.js     45.59 kB │ gzip:  19.08 kB
city-*.js              114.73 kB │ gzip:  41.53 kB
catalog-*.js           118.37 kB │ gzip:  37.64 kB
```

总 gzip 不变（~205kB/页），但 three 与业务数据分离：**图鉴数据改版不再让 573kB 的 three 缓存失效**。注意拆完后 three chunk 仍 572kB > 500kB，警告不会消失，需要同时设 `chunkSizeWarningLimit: 600` 或用体积预算脚本卡阈值。

### 1.4 部署路径假设（已实测）

- 默认 `base: "/"`：`dist/index.html:18` → `href="/assets/object-catalog-GM7PPB3g.js"`；`:209` → `href="/catalog.html"`；`dist/catalog.html:28,123` → `href="/"`。
- 实测把 `base` 改为 `"./"` 重新构建：资源 URL 变为 `./assets/...`（正确），但 **`<a href="/">` 与 `<a href="/catalog.html">` 不会被 Vite 改写，仍是绝对路径**（3 处需手改：`index.html:207`、`catalog.html:25`、`catalog.html:120`）。
- 结论：部署到 GitHub Pages 项目页（`https://<user>.github.io/voxel-city/`）或任何子路径，当前配置**必然白屏**。

---

## 2. Git / 仓库卫生（实测）

| 指标 | 数值 |
|---|---|
| 提交数 | **1**（`654c5b0 feat: expand pixel bay city and add object catalog`，2026-10-23 17:43:56 +0800，作者 tobi） |
| 已跟踪文件 | 15 个 / 521,606 B（0.5MB） |
| 已跟踪文件未提交修改 | 3 个：`src/city.js`（+2,442/−1,141）、`src/object-catalog.js`（+279/−73）、`src/showcase-models.js`（+2,070/−51），合计 **+4,791/−1,265** |
| 未跟踪文件 | **127 个 / 11,749,900 B（11.21MB）**（13:04 基线；13:15 复测已涨到 167 个——审计期间其他成员仍在写文件，本身说明工作区无隔离） |
| 未跟踪位图 | 74 个 / 8.93MB（PNG/JPG，13:05 过滤快照） |
| remote | **无**（`git remote -v` 空输出） |
| `.git` 目录 | **96.61MB（101,301,099 B）**，其中 `objects/` 96.58MB |
| 不可达对象 | **909 个**：633 blob（原始 **178.76MB**，最大 35.07MB、31.23MB 两个 blob）+ 276 tree/commit；`git reflog` 只有 initial commit |
| 分支 | `main`（无 upstream、无其它分支） |

未跟踪内容构成（13:04 实测）：

| 路径 | 文件数 | 体积 | 说明 |
|---|---:|---:|---|
| `docs/` | 63 | 4,071,051 B（3.88MB） | planning/skyscrapers/miniature-study，位图为主 |
| `ring-study/` | 25 | 4,983,500 B（4.75MB） | 含 `reference-source.png` 861KB、`zoom/ref_*.png` 约 2.7MB |
| `harbor-study/` | 12 | 603,836 B（0.58MB） | 含 2 张完全相同的 preview jpg |
| `dist-harbor-study/` | 12 | 987,166 B（0.94MB） | **构建产物**，未被忽略 |
| `dist-ring-study/` | 12 | 1,065,632 B（1.02MB） | **构建产物**，未被忽略 |
| `src/city-plan.js` | 1 | 17,455 B | **被现行 `src/city.js:12` import 的核心模块** |

`.gitignore` 全文只有 4 行（`.gitignore:1-4`：`node_modules`、`dist`、`.DS_Store`、`*.local`）。`git check-ignore -v` 实测：`dist` 被忽略，**`dist-harbor-study`、`dist-ring-study`、`docs`、`ring-study`、`harbor-study`、`src/city-plan.js` 全部 NOT-IGNORED**。`dist-harbor-study/assets/catalog-BPlzShfF.css` 与 `dist/assets/catalog-BPlzShfF.css` 哈希完全一致，证明前者就是构建产物。

行尾/编码：`core.autocrlf=true`，无 `.gitattributes`。实测 `src/object-catalog.js` LF=1,944 / CRLF=1,938（同一文件混用）、`src/city.js` 全 CRLF（5,442 行）、`src/showcase-models.js` 全 LF（5,586 行）；`git diff` 已出现 `LF will be replaced by CRLF` 警告。

> 佐证：项目自己的 `docs/planning/城市规划调研与改进方案.md:24` 也写着"仓库只有一个可见提交 `654c5b0`……当前规划模块尚未纳入版本控制"，`:26` 记录"调研期间 city.js/object-catalog.js/showcase-models.js 仍被外部修改"。

---

## 3. 详细发现

### [P0] 仓库不可复现、无备份：1 个提交 + 4,791 行未提交 + 11.2MB 未跟踪 + 无 remote

**问题**
工作区才是唯一"真相"，HEAD 是旧版本；`src/city-plan.js` 未跟踪但被现行 `src/city.js` import，任何"只提交改动文件"的操作都会产生断链提交；`.git` 内 96.61MB 中有 909 个不可达对象（178.76MB 原始 blob），而项目没有 remote——`.git` 是唯一副本。

**证据**
- `git log --oneline` → 仅 `654c5b0 feat: expand pixel bay city and add object catalog`
- `git status --short` → `M src/city.js` / `M src/object-catalog.js` / `M src/showcase-models.js` + 6 个未跟踪条目
- `git diff --numstat` → `2442 1141 src/city.js`、`279 73 src/object-catalog.js`、`2070 51 src/showcase-models.js`
- `git ls-files --others --exclude-standard` → 127 文件 / 11,749,900 B
- `git remote -v` → 空；`git reflog` → 只有 initial commit
- `git count-objects -vH` → `size: 96.58 MiB`；`git fsck --unreachable --no-reflogs` → 909 行，`git cat-file --batch-check` 汇总 633 blob / 178,764,431 B
- `src/city.js:12` → `import { createCityPlan } from "./city-plan.js";`，而 `src/city-plan.js` 不在 HEAD（`git ls-tree HEAD src/` 只有 9 个文件）

**影响**
`git checkout .`、`git clean -fdx`、误操作 IDE 回滚都会一次性丢失约 4,800 行城市生成器改动和全部研究产物；无法从仓库还原当前线上效果；机器故障即全部丢失。任何 CI/协作都无从谈起。

**具体改法**
1. 先提交"卫生补丁"（`.gitignore`/`.gitattributes`），再按依赖顺序分批提交，**`src/city-plan.js` 必须与 `src/city.js` 同一提交**（完整命令见附录 A）。
2. 建 GitHub 私有仓库并 `git push -u origin main`（立即获得异地备份）。
3. push 成功后执行 `git gc --prune=now` 清理 909 个不可达对象（预计 `.git` 从 96.6MB 降到几 MB）。
4. 之后每个功能一个短分支 + PR（哪怕只有自己），保留可回滚历史。

**工作量**：0.5–1 小时（含逐个提交后跑一次 `npm run build` 验证）。

---

### [P1] `.gitignore` 覆盖不全：构建产物 1.96MB 与研究位图 9MB 会被 `git add -A` 永久写入历史

**问题**
`.gitignore` 只忽略 `dist`（精确名），不忽略 `dist-harbor-study/`、`dist-ring-study/`；两个 study 的构建产物共 1.96MB 处于未跟踪状态。研究位图 74 个 / 8.93MB 也没有 LFS/归档策略。缺失 `.gitattributes` 导致行尾混用。

**证据**
- `.gitignore:1-4`：`node_modules` / `dist` / `.DS_Store` / `*.local`
- `git check-ignore -v dist-harbor-study/index.html` → 无输出（NOT-IGNORED）；`dist-ring-study` 同
- `dist-harbor-study` 12 文件 987,166 B、`dist-ring-study` 12 文件 1,065,632 B
- 哈希对比：`dist-harbor-study/assets/catalog-BPlzShfF.css` == `dist/assets/catalog-BPlzShfF.css`（同一构建产物）
- 位图统计：74 个 / 8.93MB；`ring-study/reference-source.png` 861,915 B、`ring-study/zoom/ref_*.png` 4 张约 2.7MB
- `core.autocrlf=true` + 无 `.gitattributes`；`git diff` 出现 CRLF 警告

**影响**
一次 `git add -A` 就会把 1.96MB 构建产物 + 约 9MB 研究截图写进 git 历史，之后即使删除也无法从历史中回收，仓库会长期臃肿；行尾混用会让每次跨平台提交出现整文件 diff、review 噪音和合并冲突。

**具体改法**
- `.gitignore` 增加 `dist-*/`、`.vite/`、`coverage/`、`*.log`、`docs/**/node_modules/`（附录 B）。
- 新增 `.gitattributes`：`* text=auto eol=lf` + `*.png/*.jpg binary`，然后 `git add --renormalize .` 单独提交一次。
- 研究位图二选一：走 Git LFS（`*.png filter=lfs`），或移出仓库/放 release assets（推荐后者，见 P2 归档条）。

**工作量**：0.25 小时（LFS 决策另计 0.5 小时）。

---

### [P1] 交付入口缺失：无 README/LICENSE/部署配置；`base` 未设置，子路径部署必白屏

**问题**
根目录没有 README（新人不知道 `npm install`/`npm run dev`/两个页面入口/seed 参数）、没有 LICENSE、没有任何部署配置；`vite.config.js` 未设置 `base`，产物和页面内跳转都是根绝对路径。

**证据**
- 根目录文件仅：`.gitignore`、`catalog.html`、`index.html`、`package-lock.json`、`package.json`、`vite.config.js` + 源码/研究目录；`Test-Path README.md/LICENSE/CONTRIBUTING.md/.github/netlify.toml/vercel.json/robots.txt/sitemap.xml` 全部 MISSING
- `vite.config.js:4-13` 只有 `build.rollupOptions.input`，无 `base`、无 `build.target`
- `dist/index.html:18` → `href="/assets/object-catalog-GM7PPB3g.js"`；`:209` → `href="/catalog.html"`；`dist/catalog.html:28,123` → `href="/"`
- 实测 `base: "./"` 后：资源变为 `./assets/...`，但 `index.html:207`、`catalog.html:25`、`catalog.html:120` 三处 `<a>` 仍为 `/` 或 `/catalog.html`
- `package.json` 缺 `license`/`repository`/`homepage`/`engines`/`packageManager`（`node -e` 检查全部 MISSING）

**影响**
无法交付给他人打开（没有运行说明）；部署到 GitHub Pages 项目页/任意子目录时 JS/CSS 404 → 白屏；返回城市链接跳到域名根；无许可证意味着别人不能合法复用代码。

**具体改法**
- `vite.config.js` 设 `base: "./"`（或部署子路径 `"/voxel-city/"`），并把 3 处绝对 `<a href>` 改相对（`./catalog.html`、`./`、`./index.html`）。
- 补 README（骨架见附录 D）：项目简介、两页 URL、Node 版本、`npm install/dev/build/preview`、seed/投影 URL 参数、目录结构、研究原型说明、部署方式。
- 补 MIT LICENSE（`package.json` 加 `"license": "MIT"`，并在 README 声明 three.js MIT 依赖）。
- 部署二选一：GitHub Pages（`base` 用仓库名 + Actions 工作流）或 Netlify/Vercel（`base: "./"` 即可，零配置）。

**工作量**：README+LICENSE 0.5h；base/链接修复 0.5h；Pages 工作流 0.5h。

---

### [P1] 质量门禁为零：无 lint/format/typecheck/test/CI，现成的验证脚本未接入且 harbor 版已红

**问题**
`package.json` 只有 3 个脚本；无 eslint/prettier/editorconfig/tsconfig/jsconfig/.github。讽刺的是项目里已有纯 Node 的验证脚本（不需要浏览器/WebGL），但从未自动化运行：`ring-study/verify.mjs` 实测 2.6s 全绿，`harbor-study/verify.mjs` 实测 exit 1，`docs/planning/audit.mjs` 也是纯 Node。

**证据**
- `package.json:7-11` → 只有 `dev`/`build`/`preview`
- `Test-Path` 检查：`eslint.config.js`、`.prettierrc`、`.editorconfig`、`tsconfig.json`、`jsconfig.json`、`.github`、`.nvmrc` 全部 MISSING
- `node ring-study/verify.mjs` → exit 0，输出 `{"map":"ring-waterways","planningSeeds":64,"renderedSeeds":5,"failures":[],"defaultStats":{"population":6225,"jobs":4295,"buildings":106,...},"originalUiIdsPreserved":49}`，耗时 2.6s
- `node harbor-study/verify.mjs` → exit 1，`AssertionError` 在 `harbor-study/verify.mjs:22`（`assert.ok(footprint.height<=lot.height+1e-6)`）；用探针定位：seed=1 与 seed=0xA1B2C3D4 各 1 个越界建筑（`N03-0`，height 超 lot.height 0.055），seed=0/42/0xffffffff 通过
- `docs/planning/audit.mjs:8` 读取 `../../src/city-plan.js`（未跟踪），干净 clone 上无法运行；`:134,:157` 会写 `audit-results.json` 与 SVG
- 源码卫生尚可：`src/*.js` 中 TODO/FIXME/HACK/XXX/`console.log`/`debugger` 均为 0（`console.warn` 4 处）

**影响**
4,791 行未提交改动只能靠人眼验证；城市生成器/图鉴数据回归无自动拦截（harbor 的断言失败已经发生了却没人知道）；重构没有安全网。

**具体改法（按成本从低到高）**
1. **CI 第一版（0 新依赖，0.5–1h）**：`npm ci` → `npm run build` → `node ring-study/verify.mjs`（先修好 harbor 或标记为 known-failing 再接入）。
2. **格式化/静态检查（1–2h）**：prettier + eslint flat config（`@eslint/js` + `globals` + `eslint:recommended`）+ `.editorconfig`，先只检查 `src/` 与 `docs/**/*.mjs`，一次 `prettier --write` 提交。
3. **测试（0.5–1d）**：vitest 覆盖纯逻辑——object-catalog 数据完整性（id 唯一、引用存在）、city-plan 不变量（`docs/planning/audit.mjs` 已有一半逻辑）、把两个 verify 脚本改造成 test。
4. **类型（0.5–1d，增量）**：`jsconfig.json` + `checkJs`，先对 `src/object-catalog.js`、`src/city-plan.js` 开启；不建议此时整体迁 TS。
5. **harbor 断言失败**单独修复（种子相关的高度越界，属于研究原型 bug）。

**工作量**：阶段 1 半天内；完整门禁 2–3 天。

---

### [P1] 三份源码副本 + 两个 study 子项目：重复约 600KB、配置复制错误、漂移已发生

**问题**
`harbor-study/` 与 `ring-study/` 是"独立地图提案"，但通过复制主源码实现：两个目录各自带一份 5,481 行的 `native-buildings.js`（与 `src/city.js` 仅差 11+/50−，两个 study 之间字节完全相同）、各自 fork 的 `plan.js`、近副本的 `main.js`/`index.html`，并直接 import `../src/*`。两份 `vite.config.mjs` 字节完全相同，导致 ring 的配置是错的。

**证据**
- 哈希/`git diff --no-index --numstat`：
  - `harbor-study/native-buildings.js`（202,300 B / 5,481 行）vs `src/city.js`（199,383 B / 5,442 行）：**11 insertions / 50 deletions**（≈99% 相同）
  - `harbor-study/native-buildings.js` vs `ring-study/native-buildings.js`：**IDENTICAL**（字节一致）
  - `harbor-study/plan.js` vs `src/city-plan.js`：567+/191−；`ring-study/plan.js` vs `harbor-study/plan.js`：947+/178−
  - `harbor-study/main.js` vs `ring-study/main.js`：6 行差异；vs `src/main.js`：29+/6−
  - `harbor-study/water.js`、`style.css` 与 ring 版 IDENTICAL，且都引用 `../src/style.css` / `../src/showcase-models.js` / `../src/object-catalog.js` / `../src/city-plan.js`
- `harbor-study/vite.config.mjs:6` → `port: 5180`；`:7` → `outDir: 'dist-harbor-study'`；ring 版字节相同，但 `ring-study/README.md:14,18` 写端口 **5190**、`:29,33` 写产物 **dist-ring-study** → 用 ring config 构建会**清空并覆盖 harbor 产物**（`emptyOutDir: true`）
- `ring-study/verify.mjs` 通过（2.6s），`harbor-study/verify.mjs` 失败（见上条）→ 漂移已经发生
- 两个 study 目录合计 25+12 文件 / 5.59MB（其中位图约 4.9MB）

**影响**
改一处城市生成逻辑要同步三份 5,400 行文件，必然继续漂移；构建命令只写在 README 里、没有 npm script，极易用错 config（ring 的 config 会毁掉 harbor 构建）；新人无法判断哪份是"主线"。

**具体改法**
- **短期（1–2h）**：修正 `ring-study/vite.config.mjs`（port 5190、outDir `dist-ring-study`）；根 `package.json` 增加 `"dev:harbor"`/`"dev:ring"`/`"build:studies"`/`"verify:studies"` 脚本；两个 study README 顶部标注"研究原型，非主线，不保证与 src 同步"；CI 跑 ring verify + build。
- **中期（1–3d）**：把 `native-buildings.js` 与 `src/city.js` 的公共部分抽成共享模块（例如 `src/buildings-native.js`，study 只保留 `plan.js` 地图差异），消除 3 份 5,400 行副本；两个 study 只保留自己的 `plan.js`/`index.html`/`main.js` 差异文件。
- **长期（0.5d）**：若研究不再活跃，整体移到 `studies/` 分支或独立归档仓库，主仓库只留链接。

**工作量**：短期 1–2h；中期 1–3d；长期 0.5d。

---

### [P1] 构建体积与缓存：618.30kB 共享 chunk 触发警告，three 占 94%，vendor/app 未拆分，无性能预算

**问题**
`object-catalog-GM7PPB3g.js` 618.30kB（gzip 162.44kB）触发 Vite 的 500kB 警告；其中 three ≈94%，应用数据只有 34KB，却和 three 绑在同一个内容哈希 chunk 里——图鉴数据每改一次，用户就要重新下载整个 618kB。项目没有性能预算，后续模型/数据增长无人拦截。

**证据**
- 构建输出：`(!) Some chunks are larger than 500 kB after minification`；`object-catalog-GM7PPB3g.js 618.30 kB │ gzip: 162.44 kB`
- 首屏实测：城市页 205.2kB gzip、图鉴页 202.5kB gzip（见 1.2 表）
- sourcemap 归因：three 约 94.0%（含 150,344 字符 GLSL 字符串），`src/object-catalog.js` 仅 5.6%（见 1.3 表）
- tree-shaking：454 个导出仅 206 个进入产物（248 个被删，含 `AnimationMixer`/`Audio`/`SkinnedMesh`/`ExtrudeGeometry`）
- 实测拆分后：`three-*.js 572.49kB / gzip 142.98kB` + `object-catalog-*.js 45.59kB / gzip 19.08kB`，入口不变
- 无 `size-limit`/`bundlewatch`/budget 配置，无 `chunkSizeWarningLimit` 调整

**影响**
每次图鉴数据改版都让 three 缓存失效（移动网络下多下载约 160kB gzip）；618kB 的单 chunk 会持续触发警告、淹没 CI 日志；没有阈值约束，后续加模型会不知不觉把首屏推到 300kB+ gzip。

**具体改法**
1. 按实测配置拆 vendor（`build.rolldownOptions.output.codeSplitting.groups`，见附录 C）。
2. 设 `build.chunkSizeWarningLimit: 600`（three chunk 天然 572kB，500 的默认阈值对 three 项目无意义），或在 CI 用体积预算脚本（推荐同时做，预算写死在仓库里）。
3. 预算建议（基于现状留 10–15% 余量）：**单页初始 JS+CSS gzip ≤ 230kB、单页总 gzip ≤ 240kB、dist 总 gzip ≤ 270kB**；超限 CI 失败并打印明细。
4. 图鉴页的 3D 展台可评估"先出列表、点击/空闲再加载 three 场景"（需产品取舍，收益是图鉴页首屏可降到 ~20kB gzip + 列表 CSS，但交互变慢）。
5. CI 里把每次构建的 gzip 数字写进 job summary，便于跟踪趋势。

**工作量**：拆分 0.5h；预算脚本 1–2h；懒加载评估 0.5d。

---

### [P2] Vite 8 配置陈旧：`rollupOptions` 已弃用，未声明 `base`/`target`

**问题**
Vite 8 已切到 Rolldown，`build.rollupOptions` 被标记为 deprecated，项目仍在使用；同时没有显式 `base` 和 `build.target`，部署路径与浏览器目标都依赖默认值。

**证据**
- `vite.config.js:5-11` → `build.rollupOptions.input`
- `node_modules/vite/dist/node/index.d.ts:948,952` → `@deprecated Use \`rolldownOptions\` instead.`
- 构建警告本身也指向 `build.rolldownOptions.output.codeSplitting`
- `vite.config.js` 无 `base`、无 `build.target`；Vite CLI 帮助显示默认 `--target baseline-widely-available`

**影响**
未来升级 Vite 会直接报错/行为变化；子路径部署与低端浏览器支持不可控。

**具体改法**
- 改用 `build.rolldownOptions`（输入仍为 `input: { city, catalog }`）。
- 显式 `base: "./"`；显式 `build.target: "baseline-widely-available"`（或按支持矩阵写死）；README 写支持矩阵（three 0.186 构建产物 `isWebGL2: true`，需 WebGL2 设备）。

**工作量**：0.25h。

---

### [P2] package/lock 元数据漂移、版本策略缺失

**问题**
`package-lock.json` 的根元数据还是旧项目名/版本（`voxel-city@1.0.0`, license ISC），与 `package.json`（`pixel-bay@0.1.0`）不一致，说明改名后没重新生成 lock；项目没有 `engines`/`packageManager`/`.nvmrc`，Node 版本要求只存在于依赖的 engines 里。

**证据**
- `package.json:2-5` → `name: "pixel-bay"`, `version: "0.1.0"`, `private: true`
- `node -e "require('./package-lock.json').packages['']"` → `{name:"voxel-city", version:"1.0.0", license:"ISC", dependencies:{three:"^0.186.1"}, devDependencies:{vite:"^8.3.5"}}`
- `package.json` 缺 `engines`/`packageManager`/`license`/`repository`/`homepage`（全部 MISSING）
- `node_modules/vite/package.json` → `engines: {"node":"^20.19.0 || >=22.12.0"}`；本机 Node v22.22.2 满足
- `npm.cmd ci --dry-run` → exit 0（依赖一致，仅元数据漂移）；`npm.cmd ls --depth=0` → `three@0.186.1`、`vite@8.3.5` 干净

**影响**
下次 `npm install` 会产生与依赖无关的 lock diff；别人用 Node 20.18 会装不上 vite 8 且报错不直观；无 `packageManager` 时 npm/pnpm 混用会生成不同 lock。

**具体改法**
- `package.json` 增加：`"engines": {"node": "^20.19.0 || >=22.12.0"}`、`"packageManager": "npm@11.6.2"`、`"license": "MIT"`、`"repository"`、`"homepage"`。
- `npm install --package-lock-only` 重新生成 lock，单独提交 `chore(deps): refresh lockfile metadata`。
- README 写明 Node 版本；CI 用 `npm ci`（已验证可通过）。

**工作量**：0.25h。

---

### [P2] 行尾/编码/编辑器规范缺失

**问题**
`core.autocrlf=true` 但没有 `.gitattributes`，仓库内行尾不统一：同一文件 `src/object-catalog.js` 既有 1,938 个 CRLF 又有 6 个 LF；`src/city.js` 全 CRLF，`src/showcase-models.js` 全 LF。没有 `.editorconfig`，缩进/字符集靠编辑器默认。

**证据**
- `git config --get core.autocrlf` → `true`；`Test-Path .gitattributes` → MISSING
- 字节级统计：`object-catalog.js LF=1,944 CRLF=1,938`；`city.js LF=5,442 CRLF=5,442`；`showcase-models.js LF=5,586 CRLF=0`
- `git diff` stderr：`warning: in the working copy of 'src/object-catalog.js', LF will be replaced by CRLF the next time Git touches it`

**影响**
跨平台协作时整文件 diff、`git blame` 失效、合并冲突放大；本次审计的 `git diff --stat` 里 4,791 行改动有一部分可能是行尾变化造成的噪音。

**具体改法**
- 新增 `.gitattributes`：`* text=auto eol=lf`、`*.png binary`、`*.jpg binary`。
- 新增 `.editorconfig`：`charset=utf-8`、`end_of_line=lf`、`indent_style=space`、`indent_size=2`、`insert_final_newline=true`、`trim_trailing_whitespace=true`。
- 执行一次 `git add --renormalize .` 并单独提交（放在功能提交之前，避免混入）。

**工作量**：0.5h（含 renormalize 提交）。

---

### [P2] docs/ 与研究产物治理：3.9MB+ 无索引、生成物与源文件混放、脚本依赖未跟踪源码

**问题**
`docs/` 有 63+ 个文件、约 4MB，没有顶层 README 索引；`audit-results.json`（118,831 B）和 audit PNG/SVG 是生成物却与脚本混放；`docs/skyscrapers` 的 42 张 before/after PNG（约 1.8MB）可由 `render.mjs`/`compose.py` 重新生成；`docs/miniature-study` 10 张 jpg（约 2.45MB）没有 README；`docs/planning/audit.mjs` 依赖未跟踪的 `src/city-plan.js`，干净 clone 上跑不起来；docs 也没有进入 Vite 构建或任何发布流程。

**证据**
- `docs/` 13:04 实测 63 文件 / 4,071,051 B；子目录：planning 5、skyscrapers 49、miniature-study 12
- `docs/planning/audit-results.json` 118,831 B（生成物）；`docs/planning/current-layout-audit.png` 188,340 B + `.svg` 43,019 B（生成物）
- `docs/skyscrapers/render.mjs` 注释写明"Offline software renderer…rasterises the same scene graph"，可再生成 before/after 图；`docs/skyscrapers/compose.py` 生成 contact sheet
- `docs/planning/audit.mjs:8` → `await fs.readFile(new URL('../../src/city-plan.js', import.meta.url), 'utf8')`（未跟踪文件）；`:134,:157` 写 JSON/SVG
- `docs/` 无 README.md（`Test-Path docs/README.md` → MISSING）；`docs/miniature-study/` 无任何 .md
- `vite.config.js` 的 input 只有 `index.html`/`catalog.html`，docs 不参与构建

**影响**
新人不知道 docs 从哪读、哪些是生成物；干净 clone 无法复跑 audit；仓库被可再生成的位图撑大；研究结论与生成脚本没有 CI 校验，容易过期。

**具体改法**
- 新增 `docs/README.md`：每个子目录一句话（是什么/状态/如何再生成/依赖哪些源码）。
- 生成物处理：`audit-results.json` 与 audit PNG/SVG 改为 CI artifact（或提交 baseline JSON，CI 重跑后 `git diff --exit-code` 校验）；skyscrapers 的 before/after 图不入库（由 `render.mjs` 按需生成），只保留 2 张 contact sheet 或走 LFS。
- 脚本统一到 `tools/`（或保留 docs 内但加 npm script：`"audit": "node docs/planning/audit.mjs"`、`"render:skyscrapers": "node docs/skyscrapers/render.mjs"`）。
- 把 `src/city-plan.js` 提交后，`audit.mjs` 才能进 CI。

**工作量**：索引 0.5h；归档/LFS 2–4h；CI 化 0.5–1h。

---

### [P2] 位图与第三方参考素材：约 9MB 未跟踪位图、ring 参考照片来源不明、重复文件

**问题**
工作区有 74 个未跟踪位图 / 8.93MB；`ring-study/reference-source.png`（861,915 B）与 `ring-study/zoom/ref_*.png`（4 张约 2.7MB）是"真实圆形运河社区航拍"参考图，仓库内没有来源/授权说明；`harbor-study/preview.jpg` 与 `preview-before.jpg` 字节完全相同（各 157,855 B）；`ring-study/qa-crops/`、`dist-*` 等生成物混在工作区。

**证据**
- 未跟踪位图统计：74 个 / 8.93MB（13:05 快照）
- `ring-study/README.md` 开头描述"参考图是一张真实的圆形运河社区航拍"；仓库内无 LICENSE/来源/授权文件
- `Get-FileHash harbor-study/preview.jpg` == `Get-FileHash harbor-study/preview-before.jpg`（IDENTICAL）
- `ring-study/qa-crops/`（16 个 png）等为审计期间/研究过程生成物

**影响**
版权/授权风险（第三方航拍图入库）；仓库不可逆膨胀；重复文件浪费空间；生成物与源文件混放，`git status` 噪音大。

**具体改法**
- 参考图不入库：改为 README 外链或 `docs/references/` + 来源与授权说明；如确需入库，走 Git LFS 并记录授权。
- 预览图只留 1 份（`preview.jpg` 与 `preview-before.jpg` 去重）。
- 生成物（qa-crops、dist-*、审计中间图）全部 gitignore；研究图需要长期保存的放 `docs/archive/` 或 release assets。

**工作量**：1–2h。

---

### [P2] 错误监控与兼容性声明缺失

**问题**
`main.js` 已有全局错误兜底（`window.onerror`/`unhandledrejection` → 本地遮罩），但只写 `console.error` + 覆盖层，**没有任何上报**；项目也没有声明浏览器支持矩阵/`build.target`，而 three 0.186 依赖 WebGL2。

**证据**
- `src/main.js:146-156`：`showError()` + `window.addEventListener("error", …)` + `window.addEventListener("unhandledrejection", …)`；`showError` 只做 `console.error(error)` + `errorMessage.textContent` + 显示遮罩
- `src/main.js:159-168`：`new THREE.WebGLRenderer(...)` 包在 try/catch 中（失败会显示错误遮罩，这点做得好）
- 无 Sentry/analytics/`navigator.sendBeacon`（`grep` 无匹配）
- `node_modules/three/build/three.module.js:2445` → `isWebGL2: true`（渲染器基于 WebGL2）
- `vite.config.js` 未设 `build.target`；`package.json` 无 `browserslist`

**影响**
线上白屏/崩溃无人知晓；不支持 WebGL2 的设备只会看到原始报错文案，没有"请更新浏览器/开启硬件加速"的指引；没有支持矩阵导致"我这能跑"式返工。

**具体改法**
- 接 Sentry Browser（免费额度）或极简 `navigator.sendBeacon` 到自建端点（注意隐私/去标识）。
- 错误遮罩文案补充 WebGL2 指引；`WebGLRenderer` 创建失败时给出明确的"设备不支持 WebGL2"提示。
- README 写支持矩阵（WebGL2 桌面/移动浏览器版本），`vite.config.js` 显式 `build.target`。

**工作量**：0.5–2h。

---

### [P2] SEO/分享卡片：只有基础 meta，缺 OG/Twitter/canonical/robots/sitemap/404

**问题**
两个页面有 charset/viewport/theme-color/color-scheme/description/title/内联 SVG favicon（做得不错），但没有任何社交分享卡片、canonical、robots.txt、sitemap.xml、404.html。

**证据**
- `index.html:3-17`、`catalog.html:3-17`：`<meta charset>`、viewport、theme-color、color-scheme、description、title、data URI favicon；`<html lang="zh-CN">`
- `Test-Path robots.txt/sitemap.xml/public/404.html` → 全部 MISSING；源码/HTML 中无 `og:`/`twitter:`/`canonical`（grep 无匹配）
- 两页均有 `<noscript>` 提示（`index.html:255`、`catalog.html:214`，良好）

**影响**
分享到社交平台/IM 无标题图卡；搜索引擎收录弱；子路径部署 404 无兜底。

**具体改法**
- 两页 `<head>` 增加 `og:title/og:description/og:image/og:url/og:type`、`twitter:card`、`canonical`（域名确定后）。
- `og:image` 可用 `docs/skyscrapers/render.mjs` 生成一张 1200×630 城市截图，或手绘像素风 banner。
- 加 `public/robots.txt`、`public/sitemap.xml`、`public/404.html`（部署平台支持时）；Vite 会把 `public/` 原样复制进 dist。

**工作量**：1h。

---

### [P2] 源码模块粒度与评审成本

**问题**
核心文件过大：`src/city.js` 5,442 行 / 199,383 B、`src/showcase-models.js` 5,587 行 / 217,303 B、`src/object-catalog.js` 1,944 行 / 63,752 B、`src/catalog.css` 1,989 行 / 35,815 B。单次未提交 diff 达 +4,791/−1,265，在 GitHub 上无法逐行 review；无 lint 自动发现未使用变量/死代码。

**证据**
- `src` 行数实测：`city.js 5,442`、`showcase-models.js 5,587`、`object-catalog.js 1,944`、`main.js 996`、`catalog-page.js 654`、`city-plan.js 586`、`catalog.css 1,989`
- `git diff --numstat` → `2442 1141 src/city.js` 等
- `package.json` 无 lint 脚本；无 eslint 配置

**影响**
单文件数千行导致 review 失效、合并冲突概率高、重构风险大；没有静态检查，未使用变量/隐式全局只能靠运行时发现。

**具体改法**
- 先引入 eslint（P1 门禁条）消除明显问题，成本低收益高。
- 中期按领域拆 `city.js`（terrain/roads/lots/buildings/props）与 `showcase-models.js`（按图鉴分组拆文件），保持纯函数边界；用 vitest 快照/verify 脚本保证行为不变。
- 拆分本身不必急，但应在下一次大改前完成，否则越拖越贵。

**工作量**：eslint 1–2h；模块拆分 2–5d（需测试保护）。

---

## 4. 建议落地路线图

| 时间 | 动作 | 产出 | 对应条目 |
|---|---|---|---|
| **今天（0.5–1 天）** | ① `.gitignore`+`.gitattributes` 卫生提交 ② 分批提交工作区（附录 A） ③ 建 remote + push + `git gc --prune=now` ④ README+LICENSE ⑤ 修 `ring-study/vite.config.mjs` ⑥ CI 第一版（build + ring verify） | 可复现、有备份、能自动构建 | P0、P1×3 |
| **本周（1–2 天）** | ① `base: "./"` + 3 处相对链接 ② GitHub Pages/Netlify 部署 ③ prettier+eslint+editorconfig ④ three vendor 拆分 + 体积预算脚本 ⑤ docs/README 索引 | 可对外发布、有质量门禁、体积可控 | P1、P2 |
| **本月（3–5 天）** | ① vitest + JSDoc/checkJs ② docs 归档/LFS/生成物 CI 化 ③ 研究副本收敛（抽共享模块） ④ OG/sitemap/404 ⑤ 错误上报 + 兼容性矩阵 | 长期可维护 | P2 |

**最小发布清单（Checklist）**
- [ ] `README.md`（安装/开发/构建/预览/两页 URL/seed 参数/目录说明）
- [ ] `LICENSE`（MIT）+ `package.json` `license` 字段
- [ ] `.gitignore` 修正 + `.gitattributes`
- [ ] 部署配置（GitHub Pages workflow 或 Netlify/Vercel）
- [ ] `base` 与 3 处绝对链接修复（否则子路径白屏）
- [ ] CI：`npm ci` → `npm run build` → `node ring-study/verify.mjs`
- [ ] 体积预算（单页 gzip ≤ 240kB）
- [ ] `robots.txt` / `sitemap.xml` / 404（可选但建议）
- [ ] OG/Twitter meta + 分享图（可选）

---

## 5. 做得好的地方（请保留）

- **构建快且确定**：17 modules、266ms、exit 0，两次构建内容哈希一致；`gzip size` 默认打印，便于观察体积。
- **代码分割正确**：两个入口各自只打包自己的应用代码，three 只在共享 chunk 出现一次（无重复打包），两页都正确 `modulepreload` 共享 chunk；CSS 按页拆分。
- **无外部网络依赖**：无 CDN 字体/脚本，favicon 内联 SVG data URI，完全离线可跑（`grep https?://` 仅命中 data URI 里的命名空间）；无 `public/` 位图，产物只有 7 个文件。
- **运行体验有兜底**：`<noscript>` 提示（`index.html:255`、`catalog.html:214`）、boot 遮罩、全局错误遮罩（`main.js:146-156`）、WebGLRenderer 创建失败 try/catch（`main.js:159-168`）。
- **可复现性设计**：seed 从 URL/`localStorage` 读取（`main.js:60-110`），页面状态可分享；`docs/planning/audit-results.json` 记录源码 SHA-256（`snapshot.sha256`），审计脚本纯 Node 可复跑。
- **已有纯 Node 验证资产**：`ring-study/verify.mjs` 2.6s 全绿（64 规划种子 + 5 渲染种子 + 49 个 UI id 保留检查），`docs/planning/audit.mjs` 无浏览器依赖——**接入 CI 的成本极低，这是最值得马上利用的现成资产**。
- **依赖与锁文件干净**：`npm ci --dry-run` 通过、`npm ls --depth=0` 无冗余；仅 three+vite 两个直接依赖，升级面小。
- **源码卫生**：`src/` 无 TODO/FIXME/console.log/debugger。

---

## 6. 附录

### 附录 A：分批提交命令（PowerShell，在仓库根执行）

> 原则：先卫生、后源码、再文档/研究；每个提交后跑一次 `npm.cmd run build` 确认可构建。`src/city-plan.js` 必须与 `src/city.js` 同一提交（`city.js:12` 依赖它）。

```powershell
# 0) 先确认没有别人正在写工作区（团队协作时暂停）
git status --short

# 1) 卫生：.gitignore / .gitattributes / .editorconfig（先写文件，见附录 B）
git add .gitignore .gitattributes .editorconfig
git commit -m "chore: ignore study build outputs, add line-ending and editor config"

# 2) 城市生成器：city-plan.js 是新增核心模块，必须和 city.js 一起提交
git add src/city-plan.js src/city.js
git commit -m "feat(city): extract procedural plan module and rebuild block layout"

# 3) 图鉴数据（独立，可单独回滚）
git add src/object-catalog.js
git commit -m "feat(catalog): expand object catalog data"

# 4) 图鉴模型（独立，可单独回滚）
git add src/showcase-models.js
git commit -m "feat(catalog): rebuild showcase models"

# 5) 文档（先确认位图策略：入库 LFS 还是移出；若暂不移出，此提交会含约 4MB 位图）
git add docs/
git commit -m "docs: add planning, skyscraper and miniature studies"

# 6) 研究原型（只提交源码/README，不提交 dist-*/ 与生成图；预览图按需保留 1 份）
git add harbor-study/ ring-study/
git commit -m "feat(studies): add harbor and ring city prototypes"

# 7) 备份与清理
git remote add origin <你的 GitHub 仓库地址>
git push -u origin main
git gc --prune=now   # 清理 909 个不可达对象，.git 预计从 96.6MB 降到几 MB
```

> 如果担心"每个中间提交都可构建"（第 2 步后 object-catalog/showcase-models 仍是旧版），可把第 2–4 步合并成一个 `feat: rebuild city generator and object catalog` 提交——仍远好于继续堆在工作区。

### 附录 B：建议的 `.gitignore` / `.gitattributes` / `.editorconfig`

`.gitignore`（替换现有 4 行，保留原有内容并追加）：

```gitignore
node_modules
node_modules/
dist
dist-*/
dist-harbor-study/
dist-ring-study/
.DS_Store
*.local
.vite/
coverage/
*.log
docs/**/node_modules/
# 研究生成物（按需保留源文件）
ring-study/qa-crops/
```

`.gitattributes`（新增）：

```gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.gif binary
*.ico binary
```

`.editorconfig`（新增）：

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

### 附录 C：CI 与体积预算（最小可用）

`.github/workflows/ci.yml`：

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      # 现成的纯 Node 验证（先接绿的 ring；harbor 修好后加入）
      - run: node ring-study/verify.mjs
      # 体积预算（脚本见下）
      - run: node tools/check-bundle-size.mjs
```

`tools/check-bundle-size.mjs`（约 30 行，零依赖，思路）：

```js
// 遍历 dist，计算 gzip 体积，超预算则 exit 1
// 预算：单页初始 JS+CSS gzip ≤ 230kB；单页总 gzip ≤ 240kB；dist 总 gzip ≤ 270kB
// 当前基线（2026-10-24）：城市页 205.2kB、图鉴页 202.5kB、dist 合计 250.7kB
```

Vite 侧 vendor 拆分（实测可用，放在 `vite.config.js` 的 `build.rolldownOptions` 下）：

```js
export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 600, // three vendor chunk 约 572kB，默认 500kB 无意义
    rolldownOptions: {
      input: { city: "./index.html", catalog: "./catalog.html" },
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules[\\/]three/ }],
        },
      },
    },
  },
});
```

### 附录 D：README 骨架

```markdown
# 像素湾 PIXEL BAY

Three.js 像素风城市模拟 + 城市物体图鉴（Vite 多页构建）。

## 快速开始
Node ^20.19 || >=22.12（见 package.json engines）
npm install
npm run dev        # http://127.0.0.1:5173/
npm run build      # 产物 dist/
npm run preview    # 预览构建产物

## 页面
- /            城市模拟（种子：?seed=1A2B3C4D，投影：?projection=ortho|persp，时间：?hour=15.2）
- /catalog.html 物体图鉴

## 目录
src/            应用源码（city.js 城市生成、object-catalog.js 图鉴数据、showcase-models.js 模型）
docs/           调研/设计文档（见 docs/README.md）
harbor-study/   研究原型：港口城市规划提案 02（非主线，见其 README）
ring-study/     研究原型：环形水城（非主线，见其 README）

## 构建与验证
npm run build
node ring-study/verify.mjs
node docs/planning/audit.mjs   # 依赖 src/city-plan.js

## 部署
静态托管即可；本项目使用 base: "./" + 相对链接，可部署到任意子路径。
GitHub Pages 见 .github/workflows/deploy.yml。

## License
MIT；Three.js 为 MIT。
```

### 附录 E：证据复跑命令

```powershell
# 构建
npm.cmd run build

# 逐文件 raw/gzip/brotli（node zlib level 9）
node -e "const fs=require('fs'),zlib=require('zlib'),path=require('path');function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):o.push(p)}return o}for(const f of walk('dist')){const b=fs.readFileSync(f);console.log(f,b.length,zlib.gzipSync(b,{level:9}).length,zlib.brotliCompressSync(b).length)}"

# git 状态
git log --oneline; git status --short; git diff --numstat; git remote -v
git ls-files --others --exclude-standard | Measure-Object
git count-objects -vH
git fsck --unreachable --no-reflogs

# .gitignore 覆盖探测
git check-ignore -v dist-harbor-study dist-ring-study docs ring-study harbor-study src/city-plan.js

# 现有验证脚本
node ring-study/verify.mjs   # 预期 exit 0，约 2.6s
node harbor-study/verify.mjs # 当前 exit 1（verify.mjs:22，seed=1/0xA1B2C3D4）

# 体积归因（可选）：生产构建 + sourcemap，按 source 归因生成字符
node node_modules\vite\bin\vite.js build --outDir "$env:TEMP\pixelbay-audit-map" --sourcemap --emptyOutDir
```

### 附录 F：审计限制

- 未运行 `npm run dev`/`preview`，所有部署结论基于构建产物静态分析 + 实测 `base: "./"` 重构建。
- 审计期间其他审计成员持续向 `docs/`、`ring-study/`、`dist-*` 写文件，未跟踪文件数与体积在 13:04–13:15 之间从 127 涨到 167，本报告采用 13:04 基线并标注时间；结论不受影响。
- `harbor-study/verify.mjs` 失败的根因（研究副本与主源码/自身版本脱节的具体位置）未深入定位，仅定位到失败种子与越界对象 `N03-0`（height 超 lot.height 0.055）。
- 体积归因基于 sourcemap 生成字符数（CJK 字符 1 char ≈ 3 bytes），比例可信，绝对值以 1.2 表的字节数为准。
- 未评估运行时性能（FPS/内存/WebGL 调用数），属其他审计成员范围。

# 像素湾 · 城市规划提案 02

独立入口，保留原版网页视觉和现有模型风格。原版源码未由本提案改写。

- 页面直接引用 `../src/style.css`。
- `main.js` 从原版入口复制，保留相机、昼夜环境、种子面板、建筑档案和模拟控制。新增城市／分区／路网切换。
- 建筑与载具使用项目已有的 `object-catalog.js` 和 `showcase-models.js`。
- `water.js` 的海水着色器从原版原样复制。
- `plan.js` 独立生成路网、街区和地块。建筑的完整模型包围盒（包括广场与装饰）必须适配地块。
- 新版的种子和投影偏好使用独立 localStorage 键，避免覆盖原版偏好。

在仓库根目录启动：

```powershell
node node_modules/vite/bin/vite.js --config harbor-study/vite.config.mjs
```

访问 `http://127.0.0.1:5180/harbor-study/`。同一个服务器的 `/` 和 `/catalog.html` 仍读取原版页面。

独立验证与构建：

```powershell
node harbor-study/verify.mjs
node node_modules/vite/bin/vite.js build --config harbor-study/vite.config.mjs
```

产物输出到 `dist-harbor-study/`，原来的 `vite.config.js`、`package.json` 和构建目录不需改变。构建包含新版入口和原版入口，以保持“原版”和“图鉴”链接可用。

当前设计：24 个街区，9 类功能片区，连续滨水大道，1 条与主路接通的老城斜街，中央花园和学园运动场。路网在交叉点拆分成共享节点，车流沿同一张图运动。建筑种子只影响建筑与细节，保持主路骨架稳定。

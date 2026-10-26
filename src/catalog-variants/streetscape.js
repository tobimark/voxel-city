// Style variants: street furniture, plants and maritime objects.
// Keyed by base asset id; `object-catalog.js` turns each entry into the "· 2" edition.
export const STREET_VARIANTS = {
  "s-lamp": {
    description: "深夜的支路上，墨绿的高杆把光挑得更高，照亮更长的一段路缘。",
    tags: ["墨绿高杆", "琥珀灯罩", "支路"],
    facts: [
      { label: "配色", value: "墨绿 / 琥珀" },
      { label: "高度", value: "5.8 m" },
      { label: "光色", value: "3000 K" },
    ],
    model: { color: "#2f4a42", accent: "#ffbf6b", height: 1.25 },
  },
  "s-bench": {
    description: "浅色柚木条配灰铸铁腿，靠背微微后仰，坐着能看见整条林荫道。",
    tags: ["浅色柚木", "铸铁", "林荫道"],
    facts: [
      { label: "配色", value: "浅木 / 铁灰" },
      { label: "坐板", value: "柚木条" },
      { label: "长度", value: "1.8 m" },
    ],
    model: { color: "#cdb894", accent: "#7c8792" },
  },
  "s-busstop": {
    description: "深绿框架的候车亭，橡木长椅被晒得温热，灯在傍晚先亮起来。",
    tags: ["深绿站亭", "橡木长椅", "候车"],
    facts: [
      { label: "配色", value: "墨绿 / 暖白" },
      { label: "座位", value: "2" },
      { label: "座板", value: "橡木" },
    ],
    model: { color: "#3f5b4c", accent: "#ffd9a0", frame: "#3a4a4e", seat: "#b98a5c" },
  },
  "s-kiosk": {
    description: "深绿色的小亭子，灯箱在雨里晕开一团暖白，窗口只开一半。",
    tags: ["森林绿", "灯箱", "报刊亭"],
    facts: [
      { label: "配色", value: "深绿 / 奶白" },
      { label: "窗口", value: "2" },
      { label: "灯箱", value: "暖白" },
    ],
    model: { color: "#2f5548", accent: "#f5ecd7" },
  },
  "s-postbox": {
    description: "海军蓝的铸铁邮筒，奶油色腰线很细，站在梧桐树下像一枚旧纽扣。",
    tags: ["海军蓝", "铸铁", "街角"],
    facts: [
      { label: "配色", value: "海军蓝 / 奶油" },
      { label: "投递", value: "2 个" },
      { label: "高度", value: "1.2 m" },
    ],
    model: { color: "#334f74", accent: "#e6d6b0" },
  },
  "s-bin": {
    description: "砖红色桶身，桶口套一圈燕麦色金属环，海风把漆面吹得发亮。",
    tags: ["砖红", "金属环", "街角"],
    facts: [
      { label: "配色", value: "砖红 / 燕麦" },
      { label: "容量", value: "60 L" },
      { label: "分类", value: "2 类" },
    ],
    model: { color: "#b8613f", accent: "#e8dcc3" },
  },
  "s-planter": {
    description: "粗陶色的花箱边缘已经磨白，里面的草长得很野，没人修剪。",
    tags: ["粗陶色", "耐风草", "花箱"],
    facts: [
      { label: "配色", value: "粗陶 / 米白" },
      { label: "长度", value: "1.2 m" },
      { label: "植物", value: "草花" },
    ],
    model: { color: "#9c5a41", accent: "#cfe0d8" },
  },
  "s-statue": {
    description: "鎏金的铜像立在深灰花岗岩基座上，午后亮得几乎晃眼。",
    tags: ["鎏金铜像", "花岗岩", "广场"],
    facts: [
      { label: "配色", value: "鎏金 / 深灰" },
      { label: "高度", value: "3.6 m" },
      { label: "基座", value: "花岗岩" },
    ],
    model: { color: "#c9a24a", accent: "#7b7d80" },
  },
  "s-billboard": {
    description: "绛红色的广告牌换了一批旧海报，黄铜灯泡把边缘照亮一圈。",
    tags: ["绛红包边", "旧海报", "黄铜灯泡"],
    facts: [
      { label: "配色", value: "绛红 / 黄铜" },
      { label: "面板", value: "4" },
      { label: "照明", value: "钨丝灯" },
    ],
    model: {
      color: "#4a2f3a",
      accent: "#e8c26a",
      panels: ["#f3e6cf", "#d9a2a6", "#a9c6b8", "#e6c98f"],
      light: "#fff2c9",
    },
  },
  "s-bikerack": {
    description: "陶土红的烤漆车架，米白轮胎靠在边上，空位总是不够用。",
    tags: ["陶土红", "米白轮胎", "停放"],
    facts: [
      { label: "涂装", value: "陶土红 / 米白" },
      { label: "车位", value: "4" },
      { label: "材质", value: "烤漆钢" },
    ],
    model: { color: "#47504d", accent: "#c96a4a", wheel: "#e8e0cc" },
  },
};

export const NATURE_VARIANTS = {
  "n-broadleaf": {
    description: "入秋后整棵树冠转成蜂蜜色，落叶在树根周围积成一小圈。",
    tags: ["金叶乔木", "秋日", "宽冠"],
    facts: [
      { label: "季相", value: "秋金" },
      { label: "冠幅", value: "7–10 m" },
      { label: "叶色", value: "蜜金" },
    ],
    model: { leaf: "#c9a24a", leaf2: "#e0bd63", trunk: "#5f4836", scale: 1.05 },
  },
  "n-conifer": {
    description: "银蓝色的针叶，像被海雾反复洗过，在常绿的林子里显得冷。",
    tags: ["银蓝针叶", "塔形", "海雾"],
    facts: [
      { label: "叶色", value: "银蓝灰" },
      { label: "冠幅", value: "3–6 m" },
      { label: "季相", value: "常绿" },
    ],
    model: { leaf: "#7d9aa8", leaf2: "#9db6bd", trunk: "#5a4a3d", scale: 1.18 },
  },
  "n-palm": {
    description: "比岸边的同类更高一截，灰白的树干上留着一圈圈旧叶痕。",
    tags: ["灰白树干", "深绿叶", "滨水"],
    facts: [
      { label: "叶色", value: "深翠绿" },
      { label: "冠幅", value: "5–8 m" },
      { label: "高度", value: "9–13 m" },
    ],
    model: { leaf: "#3f7a5c", leaf2: "#5b9470", trunk: "#b8a98f", scale: 1.28 },
  },
  "n-cherry": {
    description: "花几乎全白，只有落在石板上的几片还带着淡粉。",
    tags: ["白花樱", "早春", "落瓣"],
    facts: [
      { label: "花色", value: "雪白" },
      { label: "季相", value: "早春" },
      { label: "冠幅", value: "4–7 m" },
    ],
    model: { leaf: "#f6f1e6", leaf2: "#efe4d2", trunk: "#5b4a42", scale: 0.95 },
  },
  "n-shrub": {
    description: "酒红色的低篱，叶子在逆光里透出一点紫，冬天也不掉。",
    tags: ["酒红叶片", "低篱", "逆光"],
    facts: [
      { label: "叶色", value: "酒红 / 紫" },
      { label: "高度", value: "0.6–1.1 m" },
      { label: "冠幅", value: "1.2–2.2 m" },
    ],
    model: { leaf: "#7d3f4a", leaf2: "#9c5560", trunk: "#5a4438", scale: 0.72 },
  },
  "n-flowerbed": {
    description: "一小片蓝紫与灰白的花，傍晚看过去像结了薄霜。",
    tags: ["蓝紫花丛", "冷色", "薄霜"],
    facts: [
      { label: "颜色", value: "蓝紫 / 灰白" },
      { label: "花期", value: "春–秋" },
      { label: "面积", value: "1×1 m" },
    ],
    model: { flowers: ["#dbe7f0", "#a8b9d4", "#c9b8d8", "#f1ece0", "#9fc3d9"] },
  },
  "n-gull": {
    description: "换成灰背的羽毛，喙和腿是珊瑚色，落在栏杆上更不起眼。",
    tags: ["灰背海鸥", "珊瑚喙", "码头"],
    facts: [
      { label: "羽色", value: "灰背 / 白腹" },
      { label: "喙色", value: "珊瑚红" },
      { label: "翼展", value: "0.9 m" },
    ],
    model: { color: "#b9bcb8", accent: "#d97757" },
  },
};

export const MARITIME_VARIANTS = {
  "m-sailboat": {
    description: "靛蓝船身配赭红小帆，停在防波堤外侧，缆绳拉得很紧。",
    tags: ["靛蓝船身", "赭红帆", "外海"],
    facts: [
      { label: "涂装", value: "靛蓝 / 赭红" },
      { label: "长度", value: "8 m" },
      { label: "船帆", value: "1 面" },
    ],
    model: { color: "#3d5a7a", accent: "#b65b45", length: 1.05, width: 0.42, speed: 0.017 },
  },
  "m-fishing": {
    description: "赭黄色的旧渔船，船舷刷着一道蓝灰，甲板上堆着刚收的网。",
    tags: ["赭黄船身", "蓝灰船舷", "渔港"],
    facts: [
      { label: "涂装", value: "赭黄 / 蓝灰" },
      { label: "长度", value: "10 m" },
      { label: "甲板", value: "开放" },
    ],
    model: { color: "#c98a3f", accent: "#466a7a", length: 1.1, width: 0.46, speed: 0.012 },
  },
  "m-ferry": {
    description: "墨绿色的环岛渡轮，上层漆成白色，黄昏回港时汽笛很短。",
    tags: ["墨绿渡轮", "白色上层", "环岛"],
    facts: [
      { label: "涂装", value: "墨绿 / 沙金" },
      { label: "长度", value: "20 m" },
      { label: "载客", value: "70 人" },
    ],
    model: { color: "#2f5d52", accent: "#d8b878", length: 1.5, width: 0.58, speed: 0.009 },
  },
  "m-dinghy": {
    description: "刷成灰白的玻璃钢小艇，木桨横在座板上，船底积了一点水。",
    tags: ["灰白小艇", "玻璃钢", "近岸"],
    facts: [
      { label: "涂装", value: "灰白 / 青蓝" },
      { label: "长度", value: "3.5 m" },
      { label: "船桨", value: "2 支" },
    ],
    model: { color: "#dfe4de", accent: "#4f7d8c", length: 0.66, width: 0.32, speed: 0.02 },
  },
  "m-buoy": {
    description: "绿色浮标在浅水区一沉一浮，灯是冷的白绿色，夜里很安静。",
    tags: ["绿色浮标", "冷光", "航道"],
    facts: [
      { label: "配色", value: "墨绿 / 冷白" },
      { label: "高度", value: "1.8 m" },
      { label: "灯光", value: "绿色" },
    ],
    model: { color: "#3f7f5f", accent: "#e3f2b0" },
  },
  "m-pier": {
    description: "风干成灰绿色的木栈桥，加长了一截，尽头的灯把水面照出一条窄路。",
    tags: ["灰褐木色", "盐渍", "栈桥"],
    facts: [
      { label: "木色", value: "灰绿" },
      { label: "长度", value: "13 m" },
      { label: "宽度", value: "3.2 m" },
    ],
    model: { color: "#5f6b6a", accent: "#c9a15c", length: 2.4, width: 0.56 },
  },
};

import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

export interface MenuItem {
  id: number;
  name: string;
  displayName?: string;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

export type EmployeeStatus =
  | "smile"
  | "slacking"
  | "parenting"
  | "patient"
  | "invisible";

export interface DialogueLine {
  speaker: string;
  text: string;
}

export type GamePhase = "dialogue" | "ordering" | "resting";

export interface CustomerOrder {
  id: string;
  name: string;
  description: string;
  targetIds: number[];
  expectedStatus: EmployeeStatus;
  isBreak?: boolean;
  dialogue: DialogueLine[];
  notes: string;
  customerImage?: string;
}

// Configuration
const PRESSURE_MAX = 100;
const PRESSURE_GAIN_NORMAL = 0.2; //2
const PRESSURE_GAIN_FAST = 0.8; //8
const PRESSURE_GAIN_RELAX = -3;
const PRESSURE_GAIN_DIALOGUE = 0.5;
const PRESSURE_PENALTY_WRONG = 20;
const PRESSURE_REWARD_CORRECT = 15;
const TICK_MS = 200;
const REST_DURATION_MS = 2500; // 每个顾客后的休息时间（2.5秒）

// Data
const funMenuJson = {
  汉堡: {
    巨无霸: "巨无爸",
    汉堡包: "憨堡包",
    吉士汉堡: "吉事汉堡",
    双层吉士汉堡: "双层吉事汉堡",
    麦香鸡: "卖香鸡",
    麦香鱼: "卖香鱼",
    板烧鸡腿堡: "半烧鸡腿堡",
    麦辣鸡腿堡: "卖辣鸡腿堡",
    安格斯厚牛堡: "安嘎斯厚牛包",
  },
  点心与小食: {
    薯条: "数条",
    麦乐鸡: "卖乐鸡",
    麦辣鸡翅: "卖辣鸡翅",
    麦脆汁鸡: "卖脆汁鸡",
    大鸡排: "大鸡派",
    玉米杯: "王米杯",
    苹果片: "苹裹片",
    扭扭薯条: "扭扭数条",
  },
  甜品: {
    圆筒冰淇淋: "猿筒冰淇淋",
    朱古力新地: "猪古力新地",
    草莓新地: "草没新地",
    奥利奥麦旋风: "嗷力嗷麦旋风",
    菠萝派: "波罗派",
    香芋派: "香遇派",
  },
  饮料: {
    可口可乐: "阔口阔乐",
    雪碧: "雷碧",
    鲜煮咖啡: "先煮咖啡",
    橙汁: "忠橙汁",
    零度可乐: "零度阔乐",
    热朱古力: "热猪古力",
  },
} as const;

type FunMenuDefinition = typeof funMenuJson;

const menuGroupConfigs: Array<{ id: string; title: keyof FunMenuDefinition }> =
  [
    { id: "burgers", title: "汉堡" },
    { id: "snacks", title: "点心与小食" },
    { id: "desserts", title: "甜品" },
    { id: "drinks", title: "饮料" },
  ];

const menuItemIdByName: Record<string, number> = {};

export const menuGroups: MenuGroup[] = menuGroupConfigs.map(
  (config, groupIndex) => {
    const itemEntries = Object.entries(funMenuJson[config.title]);
    let offset = 1;

    const items = itemEntries.map(([name, displayName]) => {
      const id = (groupIndex + 1) * 100 + offset;
      menuItemIdByName[name] = id;
      offset += 1;
      return { id, name, displayName } satisfies MenuItem;
    });

    return {
      id: config.id,
      title: config.title,
      items,
    } satisfies MenuGroup;
  },
);

function ensureMenuItemId(name: string): number {
  const id = menuItemIdByName[name];
  if (!id) {
    throw new Error(`Menu item not found: ${name}`);
  }
  return id;
}

//顾客列表设置
export const customerOrders: CustomerOrder[] = [
  {
    id: "c0",
    name: "无顾客",
    description: "短暂空档，老员工传授摸鱼技巧。",
    targetIds: [],
    expectedStatus: "slacking",
    isBreak: true,
    dialogue: [
      {
        speaker: "老仙贝",
        text: "喂，新来的。别一直绷着个脸，看得我都替你累。",
      },
      { speaker: "Suda", text: "啊？可是店长说要保持微笑……" },
      {
        speaker: "老仙贝",
        text: "店长现在在后厨点货呢，看不见。来，教你个绝活。看见那个“先煮咖啡”的机子没？",
      },
      { speaker: "Suda", text: "看到了，它好像一直在响。" },
      {
        speaker: "老仙贝",
        text: "对，它每次加水加热的时候嗡嗡声特大。只要它一响，你就拿块抹布，蹲下去假装擦柜台下面的柜门。实际上呢……这儿是个监控死角。",
      },
      { speaker: "Suda", text: "监控死角？" },
      {
        speaker: "Suda",
        text: "（犹豫了一下，看了看正在嗡嗡响的咖啡机）那……我试一下？",
      },
      {
        speaker: "老仙贝",
        text: "这就对了。只要手里拿着抹布，你就是无敌的。哪怕老板出来，也以为你在勤快干活呢。",
      },
      {
        speaker: "系统提示",
        text: "在没有顾客时将状态切换到摸鱼启动，可以降低压力值，但不要被顾客发现……",
      },
      { speaker: "老仙贝", text: "感觉怎么样？是不是觉得没那么苦了？" },
      { speaker: "Suda", text: "……好像是有点用。" },
      { speaker: "老仙贝", text: "行了，来活了。打起精神来。" },
    ],
    notes: "空档期：切换摸鱼启动可降压。",
    customerImage: "/pic/characters/xb.png", //前辈
  },
  {
    id: "c1",
    name: "巨无爸先生",
    description: "经典组合，干脆利落。",
    targetIds: [ensureMenuItemId("巨无霸"), ensureMenuItemId("可口可乐")],
    expectedStatus: "smile",
    dialogue: [
      { speaker: "巨无爸先生", text: "一个巨无爸加一杯阔口阔乐。" },
      { speaker: "Suda", text: "好的，一个巨无爸、一杯阔口阔乐。" },
      { speaker: "巨无爸先生", text: "就这样。" },
    ],
    notes: "巨无爸 + 阔口阔乐，保持微笑服务。",
    customerImage: "/pic/characters/m11.png", //巨无霸先生
  },
  {
    id: "c2",
    name: "大妈",
    description: "挑菜单名，看得很仔细。",
    targetIds: [ensureMenuItemId("吉士汉堡")],
    expectedStatus: "patient",
    dialogue: [
      {
        speaker: "吉素芬",
        text: "小伙子，我看一下啊……我要一个这个，吉事汉堡。",
      },
      { speaker: "Suda", text: "好的..." },
      {
        speaker: "吉素芬",
        text: "等下等下。上面还有个双层吉事汉堡，这个是多一层是吧？",
      },
      { speaker: "Suda", text: "是的，双层的话肉会多一层。" },
      {
        speaker: "吉素芬",
        text: "哦，那我吃不了那么多。年纪大了，普通的就行。",
      },
    ],
    notes: "吉事汉堡一份，耐心慢慢确认。",
    customerImage: "/pic/characters/of2.png", //大妈
  },
  {
    id: "c4",
    name: "顾客3",
    description: "聊菜单名字，也要点正餐。",
    targetIds: [ensureMenuItemId("板烧鸡腿堡"), ensureMenuItemId("雪碧")],
    expectedStatus: "smile",
    dialogue: [
      { speaker: "程序猿", text: "来一个半烧鸡腿堡。再要一杯雷碧。" },
      { speaker: "Suda", text: "好的，一个半烧鸡腿堡，一杯雷碧。" },
      { speaker: "程序猿", text: "嗯..." },
      { speaker: "程序猿", text: "你们这菜单的名字，挺有意思的。" },
      { speaker: "Suda", text: "是吗？" },
      {
        speaker: "程序猿",
        text: "现在看这屏幕上的“巨无爸”，还有这“雷碧”，我刚才差点顺嘴就念成别的，确认了好几遍才敢开口。",
      },
      { speaker: "Suda", text: "其实读错也没关系，大家都知道是什么。" },
      {
        speaker: "程序猿",
        text: "那不行，既然你们这么写了，我就得按规矩念。这儿点餐还得先在脑子里转个弯，这感觉挺像那么回事的。",
      },
      { speaker: "Suda", text: "那我去给您准备了。" },
      {
        speaker: "程序猿",
        text: "行，去吧。只要味道是对的，名字什么的也无所谓。",
      },
    ],
    notes: "半烧鸡腿堡 + 雷碧，保持轻松微笑。",
    customerImage: "/pic/characters/npc25.png", //程序员
  },
  {
    id: "c5",
    name: "Couple",
    description: "多人点单，品类很多。",
    targetIds: [
      ensureMenuItemId("安格斯厚牛堡"),
      ensureMenuItemId("零度可乐"),
      ensureMenuItemId("草莓新地"),
      ensureMenuItemId("扭扭薯条"),
      ensureMenuItemId("麦辣鸡翅"),
    ],
    expectedStatus: "invisible",
    dialogue: [
      {
        speaker: "安嘉斯",
        text: "我们要两个安嘎斯厚牛包。饮料要两杯零度阔乐。",
      },
      {
        speaker: "麦乐蒂",
        text: "哎，我要吃冰淇淋。那个草没新地？这上面写着“草没”，是说草莓卖没了吗？",
      },
      { speaker: "Suda", text: "那个就是草莓新地，只是名字叫“草没”。" },
      {
        speaker: "麦乐蒂",
        text: "吓我一跳，以为没货了。那我要一个草没新地。再来一份扭扭数条，大家一起吃。",
      },
      {
        speaker: "安嘉斯",
        text: "行。那再加一对卖辣鸡翅吧，我也想吃点炸的。",
      },
      {
        speaker: "Suda",
        text: "稍微确认一下：一个安嘎斯厚牛包配雷碧，一个草没新地，一份大扭扭数条，一对卖辣鸡翅。对吗？",
      },
      {
        speaker: "安嘉斯",
        text: "对，没错。（小声嘀咕）念出来感觉像在对暗号……",
      },
    ],
    notes:
      "安嘎斯厚牛包 + 零度阔乐 + 草没新地 + 扭扭数条 + 麦辣鸡翅，尽量保持愉快语气。",
    customerImage: "/pic/characters/cp11.png",
  },
  {
    id: "c6",
    name: "顾客4",
    description: "匆忙回头客，量大。",
    targetIds: [ensureMenuItemId("汉堡包"), ensureMenuItemId("可口可乐")],
    expectedStatus: "smile",
    dialogue: [
      {
        speaker: "匆匆过客",
        text: "快点快点，午休时间要结束了。一个憨堡包，一杯阔口阔乐。",
      },
      {
        speaker: "Suda",
        text: "好的，一个憨堡包，一杯阔口阔乐去冰。马上就好。",
      },
      { speaker: "匆匆过客", text: "也不知道还能不能在上工前吃完..." },
    ],
    notes: "憨堡包 + 阔口阔乐，保持耐心。",
    customerImage: "/pic/characters/f21.png",
  },
  {
    id: "c7",
    name: "妈妈带娃",
    description: "孩子闹腾，需要安抚。",
    targetIds: [
      ensureMenuItemId("麦乐鸡"),
      ensureMenuItemId("薯条"),
      ensureMenuItemId("鲜煮咖啡"),
      ensureMenuItemId("玉米杯"),
      ensureMenuItemId("苹果片"),
    ],
    expectedStatus: "parenting",
    dialogue: [
      { speaker: "乐乐", text: "妈妈！我要吃卖乐鸡！我要快乐！" },
      {
        speaker: "苏续敏",
        text: "好好好，买。你好，来一份卖乐鸡。哪怕名字吉利点也好。",
      },
      { speaker: "乐乐", text: "我还要薯条！" },
      {
        speaker: "苏续敏",
        text: "你看这菜单上写的什么？“数条”！吃个薯条都要你学会数数！",
      },
      { speaker: "Suda", text: "那，还需要数条吗？" },
      {
        speaker: "苏续敏",
        text: "要。再给我来一杯先煮咖啡，还得再加个王米杯和苹裹片。",
      },
      {
        speaker: "Suda",
        text: "好的，一份卖乐鸡，一份中数条，一杯大热先煮咖啡，一个王米杯，一个苹裹片。",
      },
      {
        speaker: "苏续敏",
        text: "我现在就是想先喝口咖啡续个命，其他的事……等喝完再说吧。",
      },
    ],
    notes:
      "一份卖乐鸡，一份中数条，一杯大热先煮咖啡，一个王米杯，一个苹裹片；切换育儿战备面具。",
    customerImage: "/pic/characters/c12.png",
  },
  {
    id: "c8",
    name: "大妈",
    description: "胃口不错，慢慢点。",
    targetIds: [
      ensureMenuItemId("板烧鸡腿堡"),
      ensureMenuItemId("扭扭薯条"),
      ensureMenuItemId("热朱古力"),
    ],
    expectedStatus: "patient",
    dialogue: [
      { speaker: "Suda", text: "您来了。还是少点点吗？" },
      {
        speaker: "吉素芬",
        text: "我也想通了，年纪大了也不能太委屈自己。半烧鸡腿堡不错。",
      },
      { speaker: "Suda", text: "是全熟的，那是半烧风味。" },
      {
        speaker: "吉素芬",
        text: "行，那就来一个半烧鸡腿堡。我也赶个时髦，尝尝扭扭数条。再来杯热猪古力。",
      },
      { speaker: "Suda", text: "好的，半烧鸡腿堡，扭扭数条，热猪古力。" },
      {
        speaker: "吉素芬",
        text: "周末嘛，孙子待会儿要来，我先吃饱了有力气带他。",
      },
    ],
    notes: "半烧鸡腿堡 + 扭扭数条 + 热猪古力，收到。",
    customerImage: "/pic/characters/of2.png",
  },
  {
    id: "c9",
    name: "巨无霸先生",
    description: "脸色不太好，想吃点甜的。",
    targetIds: [
      ensureMenuItemId("巨无霸"),
      ensureMenuItemId("零度可乐"),
      ensureMenuItemId("香芋派"),
    ],
    expectedStatus: "smile",
    dialogue: [
      { speaker: "Suda", text: "老规矩？" },
      { speaker: "巨无霸先生", text: "嗯。一个巨无爸，一杯零度阔乐。" },
      { speaker: "巨无霸先生", text: "再加个香遇派吧。今天心情不太好。" },
      { speaker: "Suda", text: "好的，刚烤好的香遇派很热，小心烫。" },
      {
        speaker: "巨无霸先生",
        text: "谢了。你这儿虽然名字怪，但东西还不错的。",
      },
    ],
    notes: "巨无爸 + 零度阔乐 + 香遇派，注意保持微笑。",
    customerImage: "/pic/characters/m12.png",
  },
  {
    id: "c10",
    name: "顾客3",
    description: "带同事来体验菜单梗。",
    targetIds: [
      ensureMenuItemId("大鸡排"),
      ensureMenuItemId("雪碧"),
      ensureMenuItemId("麦脆汁鸡"),
      ensureMenuItemId("橙汁"),
      ensureMenuItemId("苹果片"),
    ],
    expectedStatus: "smile",
    dialogue: [
      {
        speaker: "程序猿",
        text: "来来来，老张，就是这家。我就跟你说这菜单有点神。",
      },
      {
        speaker: "张先师",
        text: "不就是个汉堡店吗……这字儿是不是印错了？“卖香鱼”？",
      },
      {
        speaker: "程序猿",
        text: "哈哈，不懂了吧，企业文化。来个大鸡派，再来一杯雷碧。",
      },
      { speaker: "Suda", text: "好的，一份大鸡派，一杯雷碧。" },
      {
        speaker: "程序猿",
        text: "老张，你听我的，你点那个卖脆汁鸡，绝对带劲。然后再来个忠橙汁。",
      },
      {
        speaker: "张先师",
        text: "行吧。一个卖脆汁鸡，一杯忠橙汁。再加个苹裹片？",
      },
      { speaker: "张先师", text: "其实就是切片苹果。" },
      {
        speaker: "程序猿",
        text: "哪里哪里，这叫“独乐乐不如众乐乐”。看着他对着菜单样子，我这周一就好过多了。",
      },
    ],
    notes: "大鸡排 + 雷碧 + 麦脆汁鸡 + 忠橙汁 + 苹裹片，点的还真不少。",
    customerImage: "/pic/characters/npc24.png",
  },
  {
    id: "c11",
    name: "顾客5",
    description: "只要咖啡，短对话。",
    targetIds: [ensureMenuItemId("鲜煮咖啡")],
    expectedStatus: "smile",
    dialogue: [
      {
        speaker: "匆匆过客",
        text: "一杯先煮咖啡，只要咖啡。快点，要在老板“煮”我之前喝上。",
      },
      { speaker: "Suda", text: "马上好，先煮咖啡一杯。" },
    ],
    notes: "先煮咖啡一杯，节奏要快。",
    customerImage: "/pic/characters/f21.png",
  },
  {
    id: "c12",
    name: "大妈",
    description: "不点餐，送了橘子。",
    targetIds: [],
    expectedStatus: "patient",
    isBreak: true,
    dialogue: [
      { speaker: "吉素芬", text: "小伙子，忙着呢？" },
      { speaker: "Suda", text: "哎，大妈您来了。今天吃点什么？" },
      {
        speaker: "吉素芬",
        text: "不吃不吃，刚吃过了。我是路过，正好去超市买了点橘子。",
      },
      { speaker: "吉素芬", text: "给你的。这橘子甜，比忠橙汁强。" },
      { speaker: "Suda", text: "这怎么好意思……" },
      {
        speaker: "吉素芬",
        text: "拿着吧。我看你这几天，天天对着这屏幕念这些个绕口令，也挺费嗓子的。明天再来吃那个吉事汉堡，图个吉利。",
      },
      { speaker: "Suda", text: "谢谢您嘞，慢走。" },
    ],
    notes: "没有点单，保持放松。",
    customerImage: "/pic/characters/of2.png",
  },
  {
    id: "c13",
    name: "巨无霸先生",
    description: "精神疲惫，喝点甜的。",
    targetIds: [ensureMenuItemId("巨无霸"), ensureMenuItemId("可口可乐")],
    expectedStatus: "smile",
    dialogue: [
      { speaker: "Suda", text: "中午好。老样子？" },
      { speaker: "巨无霸先生", text: "嗯。一个巨无爸。饮料换回阔口阔乐吧。" },
      { speaker: "Suda", text: "不喝零度了？不是要控糖吗？" },
      { speaker: "巨无霸先生", text: "今天当了一上午的孙子，精神已经够苦了。" },
      {
        speaker: "Suda",
        text: "我懂了。好的，一份巨无爸，一杯正宗的阔口阔乐。",
      },
      { speaker: "巨无霸先生", text: "谢了。" },
    ],
    notes: "巨无爸 + 阔口阔乐，注意语气温和。",
    customerImage: "/pic/characters/m13.png",
  },
  {
    id: "c14",
    name: "顾客6",
    description: "只点辣鸡翅。",
    targetIds: [ensureMenuItemId("麦辣鸡翅")],
    expectedStatus: "patient",
    dialogue: [
      {
        speaker: "刘马",
        text: "快点。里面有那个什么卖辣鸡翅没？我孙子说就要辣的。",
      },
      { speaker: "Suda", text: "放心，卖辣鸡翅肯定辣。" },
    ],
    notes: "卖辣鸡翅一份，简短应对。",
    customerImage: "/pic/characters/om1.png",
  },
  {
    id: "c15",
    name: "Couple",
    description: "夹子音顾客，互动多。",
    targetIds: [
      ensureMenuItemId("麦乐鸡"),
      ensureMenuItemId("扭扭薯条"),
      ensureMenuItemId("热朱古力"),
    ],
    expectedStatus: "invisible",
    dialogue: [
      {
        speaker: "麦乐蒂",
        text: "哎呀……这个名字好吓人哦，什么“巨无爸”。宝宝我不敢吃这个。",
      },
      { speaker: "安嘉斯", text: "不怕不怕，那我们不吃嘛。" },
      { speaker: "Suda", text: "二位，可以点餐了吗？后面还有人。" },
      {
        speaker: "麦乐蒂",
        text: "宝宝你看这个，“卖乐鸡”，是不是吃了就会很快乐呀？",
      },
      { speaker: "安嘉斯", text: "只要你在，我就快乐。来一份这个卖乐鸡。" },
      {
        speaker: "麦乐蒂",
        text: "人家最近在减肥啦。就要那个扭扭数条吧。我觉得它扭来扭去的。",
      },
      { speaker: "安嘉斯", text: "再加个扭扭数条。" },
      { speaker: "麦乐蒂", text: "我要喝热的……热猪古力！" },
      {
        speaker: "Suda",
        text: "确认一下：一份卖乐鸡，一份扭扭数条，一杯热猪古力。先生您不需要饮料吗？",
      },
      { speaker: "安嘉斯", text: "我不渴……" },
      { speaker: "麦乐蒂", text: "哎呀你喝一口我的嘛，麻烦拿两个吸管。" },
      { speaker: "Suda", text: "抱歉，热饮不建议用吸管，会烫嘴。" },
      { speaker: "麦乐蒂", text: "凶什么凶嘛……那就这样吧。" },
    ],
    notes: "嘿嘿嘿，这个手机真好玩...不想管那对情侣了",
    customerImage: "/pic/characters/cp12.png",
  },
];

const dayKeys = ["day1", "day2", "day3"] as const;
export type DayKey = (typeof dayKeys)[number];
//每天的顾客的列表设置
export const customerSchedule: Record<DayKey, string[]> = {
  day1: ["c1", "c2", "c0", "c4"],
  day2: ["c5", "c6", "c7", "c8", "c9"],
  day3: ["c10", "c11", "c12", "c13", "c14", "c15"],
  //   day1: ["c0", "c1"],
  //   day2: ["c1"],
  //   day3: ["c1"],
};

const scheduledOrderIds = dayKeys.flatMap((key) => customerSchedule[key]);

export const customerScheduleByDay: Record<DayKey, CustomerOrder[]> = {
  day1: customerSchedule.day1
    .map((id) => customerOrders.find((c) => c.id === id)!)
    .filter(Boolean),
  day2: customerSchedule.day2
    .map((id) => customerOrders.find((c) => c.id === id)!)
    .filter(Boolean),
  day3: customerSchedule.day3
    .map((id) => customerOrders.find((c) => c.id === id)!)
    .filter(Boolean),
};

export const useGameStore = defineStore("game", () => {
  // State
  const currentDayIndex = ref(0);
  const currentOrderIndex = ref(0);
  const currentOrderId = ref(scheduledOrderIds[0] ?? "c1");
  const currentMenuId = ref(menuGroups[0]?.id ?? "");
  const selectedItemIds = ref<number[]>([]);
  const feedback = ref<{ message: string; type: "success" | "error" | "" }>({
    message: "",
    type: "",
  });
  const pressure = ref(0);
  const completedOrderIds = ref<string[]>([]);
  const gameState = ref<"playing" | "success" | "failure">("playing");
  const staffMood = ref<EmployeeStatus>("smile");
  const timerId = ref<number | undefined>(undefined);
  const breakTimerId = ref<number | undefined>(undefined);
  const restTimerId = ref<number | undefined>(undefined);
  const phase = ref<GamePhase>("dialogue");
  const dialogueIndex = ref(0);
  const rememberedNotes = ref("");

  // Getters
  const currentOrder = computed<CustomerOrder>(() => {
    const order = customerOrders.find((c) => c.id === currentOrderId.value);
    return order || customerOrders[0]!;
  });

  const currentGroup = computed<MenuGroup>(() => {
    const group = menuGroups.find((g) => g.id === currentMenuId.value);
    return group || menuGroups[0]!;
  });

  const pressurePercent = computed(() =>
    Math.min(
      100,
      Math.max(0, Math.round((pressure.value / PRESSURE_MAX) * 100)),
    ),
  );
  const completedCount = computed(() => completedOrderIds.value.length);
  const currentDayKey = computed<DayKey>(
    () =>
      dayKeys[Math.min(currentDayIndex.value, dayKeys.length - 1)] ?? "day1",
  );
  const currentDayOrderIds = computed(
    () => customerSchedule[currentDayKey.value] ?? [],
  );
  const pressureRatePerSec = computed(() => {
    if (phase.value === "dialogue") {
      return PRESSURE_GAIN_DIALOGUE;
    }
    // 休息阶段：摆烂可以降低压力，否则压力不变
    if (phase.value === "resting") {
      return staffMood.value === "slacking" ? PRESSURE_GAIN_RELAX : 0;
    }
    if (currentOrder.value.isBreak) {
      return staffMood.value === "slacking"
        ? PRESSURE_GAIN_RELAX
        : PRESSURE_GAIN_NORMAL;
    }
    return staffMood.value === currentOrder.value.expectedStatus
      ? PRESSURE_GAIN_NORMAL
      : PRESSURE_GAIN_FAST;
  });
  const dialogueLine = computed(() => {
    if (phase.value !== "dialogue") return null;
    return currentOrder.value.dialogue[dialogueIndex.value] ?? null;
  });
  const isDialoguePhase = computed(() => phase.value === "dialogue");
  const isOrderingPhase = computed(() => phase.value === "ordering");
  const isRestingPhase = computed(() => phase.value === "resting");
  const isLastDialogueLine = computed(() => {
    if (phase.value !== "dialogue") return false;
    return dialogueIndex.value >= currentOrder.value.dialogue.length - 1;
  });

  // Actions
  function setOrderId(id: string) {
    currentOrderId.value = id;
    const dayIndex = dayKeys.findIndex((key) =>
      customerSchedule[key].includes(id),
    );
    if (dayIndex >= 0 && dayKeys[dayIndex] !== undefined) {
      currentDayIndex.value = dayIndex;
      currentOrderIndex.value = customerSchedule[dayKeys[dayIndex]].indexOf(id);
    }
  }

  function syncCurrentOrder() {
    const ids = currentDayOrderIds.value;
    const nextId = ids[currentOrderIndex.value] ?? scheduledOrderIds[0];
    if (nextId) {
      currentOrderId.value = nextId;
    }
  }

  function advanceToNextOrder() {
    const ids = currentDayOrderIds.value;
    if (currentOrderIndex.value < ids.length - 1) {
      currentOrderIndex.value += 1;
    } else if (currentDayIndex.value < dayKeys.length - 1) {
      currentDayIndex.value += 1;
      currentOrderIndex.value = 0;
    } else {
      return;
    }
    syncCurrentOrder();
  }

  function switchMenu(id: string) {
    currentMenuId.value = id;
  }

  function toggleSelection(itemId: number) {
    if (gameState.value !== "playing") return;

    const index = selectedItemIds.value.indexOf(itemId);
    if (index > -1) {
      selectedItemIds.value.splice(index, 1);
    } else {
      selectedItemIds.value.push(itemId);
    }
  }

  function adjustPressure(delta: number) {
    const next = Math.min(PRESSURE_MAX, Math.max(0, pressure.value + delta));
    pressure.value = next;
    if (next >= PRESSURE_MAX && gameState.value === "playing") {
      gameState.value = "failure";
      feedback.value = { message: "压力爆表，游戏失败。", type: "error" };
      stopTimer();
      resetPressure();
    }
  }

  function resetPressure() {
    pressure.value = 0;
  }

  function stopTimer() {
    if (timerId.value !== undefined) {
      clearInterval(timerId.value);
      timerId.value = undefined;
    }
  }

  function stopBreakTimer() {
    if (breakTimerId.value !== undefined) {
      clearTimeout(breakTimerId.value);
      breakTimerId.value = undefined;
    }
  }

  function startTimer() {
    stopTimer();
    timerId.value = window.setInterval(() => {
      if (gameState.value !== "playing") return;
      adjustPressure((pressureRatePerSec.value * TICK_MS) / 1000);
    }, TICK_MS);
  }

  function submitOrder() {
    if (gameState.value !== "playing") return;
    if (phase.value !== "ordering") return;

    // 如果是休息时段，标记完成并跳到下一个顾客
    if (currentOrder.value.isBreak) {
      stopBreakTimer();
      // 休息时段也要标记为完成
      if (!completedOrderIds.value.includes(currentOrderId.value)) {
        completedOrderIds.value.push(currentOrderId.value);
      }

      // Check if current day is finished - let GameDay.vue handle the transition
      const currentDayIds = currentDayOrderIds.value;
      const currentDayCompleted = currentDayIds.every((id) =>
        completedOrderIds.value.includes(id),
      );
      if (currentDayCompleted) {
        // 当天完成，不推进到下一天，让视图层处理跳转
        return;
      }

      advanceToNextOrder();
      return;
    }

    // Check correctness
    const targetSet = new Set(currentOrder.value.targetIds);
    const selectedSet = new Set(selectedItemIds.value);

    let isCorrect = true;

    // Check Status
    if (staffMood.value !== currentOrder.value.expectedStatus) {
      isCorrect = false;
    }

    // Check Items
    if (targetSet.size !== selectedSet.size) {
      isCorrect = false;
    } else {
      for (const id of targetSet) {
        if (!selectedSet.has(id)) {
          isCorrect = false;
          break;
        }
      }
    }

    if (isCorrect) {
      feedback.value = { message: "完美！订单正确！", type: "success" };
      if (!completedOrderIds.value.includes(currentOrderId.value)) {
        completedOrderIds.value.push(currentOrderId.value);
      }
      adjustPressure(-PRESSURE_REWARD_CORRECT);
      // 清除菜单勾选状态
      selectedItemIds.value = [];

      // Check win condition (all days completed)
      if (completedOrderIds.value.length === scheduledOrderIds.length) {
        gameState.value = "success";
        stopTimer();
        return;
      }

      // Check if current day is finished - let GameDay.vue handle the transition
      const currentDayIds = currentDayOrderIds.value;
      const currentDayCompleted = currentDayIds.every((id) =>
        completedOrderIds.value.includes(id),
      );
      if (currentDayCompleted) {
        // 当天完成，不推进到下一天，让视图层处理跳转
        return;
      }

      // 进入休息阶段，让玩家可以摆烂降低压力
      enterRestingPhase();
    } else {
      feedback.value = {
        message: "订单错误或面具错误，压力上升！",
        type: "error",
      };
      adjustPressure(PRESSURE_PENALTY_WRONG);
    }
  }

  function stopRestTimer() {
    if (restTimerId.value !== undefined) {
      clearTimeout(restTimerId.value);
      restTimerId.value = undefined;
    }
  }

  function enterRestingPhase() {
    phase.value = "resting";
    feedback.value = {
      message: "短暂休息中，可以切换摆烂降低压力！",
      type: "success",
    };
    stopRestTimer();
    restTimerId.value = window.setTimeout(() => {
      // 休息结束，进入下一个顾客
      advanceToNextOrder();
    }, REST_DURATION_MS);
  }

  function skipResting() {
    // 手动跳过休息，直接进入下一个顾客
    if (phase.value !== "resting") return;
    stopRestTimer();
    advanceToNextOrder();
  }

  function enterOrderingPhase() {
    phase.value = "ordering";
    rememberedNotes.value = currentOrder.value.notes;
    // 如果是休息时段（c0），20秒后自动进入下一个顾客
    if (currentOrder.value.isBreak) {
      stopBreakTimer();
      breakTimerId.value = window.setTimeout(() => {
        // 休息时段也要标记为完成
        if (!completedOrderIds.value.includes(currentOrderId.value)) {
          completedOrderIds.value.push(currentOrderId.value);
        }

        // Check if current day is finished - let GameDay.vue handle the transition
        const currentDayIds = currentDayOrderIds.value;
        const currentDayCompleted = currentDayIds.every((id) =>
          completedOrderIds.value.includes(id),
        );
        if (currentDayCompleted) {
          // 当天完成，不推进到下一天，让视图层处理跳转
          return;
        }

        advanceToNextOrder();
        // resetForCurrentOrder() 会通过 watch 自动触发
      }, 20000);
    }
  }

  function resetForCurrentOrder() {
    selectedItemIds.value = [];
    feedback.value = { message: "", type: "" };
    dialogueIndex.value = 0;
    stopBreakTimer();
    stopRestTimer();
    if (currentOrder.value.dialogue.length === 0) {
      enterOrderingPhase();
    } else {
      phase.value = "dialogue";
      rememberedNotes.value = "";
    }
  }

  function advanceDialogue() {
    if (phase.value !== "dialogue") return;
    const totalLines = currentOrder.value.dialogue.length;
    if (dialogueIndex.value < totalLines - 1) {
      dialogueIndex.value += 1;
    } else {
      enterOrderingPhase();
    }
  }

  // Watchers
  watch(
    () => currentOrderId.value,
    () => {
      resetForCurrentOrder();
    },
    { immediate: true },
  );

  watch([currentDayIndex, currentOrderIndex], () => {
    syncCurrentOrder();
  });

  return {
    // State
    currentOrderId,
    currentDayIndex,
    currentOrderIndex,
    currentDayKey,
    currentDayOrderIds,
    currentMenuId,
    selectedItemIds,
    feedback,
    pressure,
    completedOrderIds,
    gameState,
    staffMood,

    // Getters
    currentOrder,
    currentGroup,
    pressurePercent,
    completedCount,
    pressureRatePerSec,
    dialogueLine,
    rememberedNotes,
    isDialoguePhase,
    isOrderingPhase,
    isRestingPhase,
    isLastDialogueLine,

    // Actions
    setOrderId,
    switchMenu,
    toggleSelection,
    submitOrder,
    startTimer,
    stopTimer,
    resetPressure,
    advanceDialogue,
    skipResting,
    phase,
  };
});

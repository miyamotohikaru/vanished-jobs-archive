/**
 * 系譜 12チェーン。デザイン案(系譜ページ)と details の系譜行をもとに構成。
 * no があるノードは収録職業(詳細ページへリンク)、null は収録外の概念ノード。
 */

export type LineageNode = {
  label: string;
  no: string | null;
  ongoing?: boolean; // ▲消滅進行中
  future?: boolean; // 後継の概念(イタリック表示)
};

export type LineageChain = {
  id: string;
  num: string;
  title: string;
  nodes: LineageNode[];
};

export const lineageChains: LineageChain[] = [
  {
    id: "tsushin",
    num: "01",
    title: "通信",
    nodes: [
      { label: "飛脚", no: "065" },
      { label: "電信士", no: "040" },
      { label: "電報配達", no: "132" },
      { label: "電話交換手", no: "046" },
      { label: "コールセンター", no: "144", ongoing: true },
      { label: "AI音声ボット", no: null, future: true },
    ],
  },
  {
    id: "keisan",
    num: "02",
    title: "計算",
    nodes: [
      { label: "計算手", no: "015" },
      { label: "キーパンチャー", no: "057" },
      { label: "タイピスト", no: "097" },
      { label: "ワープロ操作員", no: "137" },
      { label: "データ入力", no: "145", ongoing: true },
      { label: "LLM", no: null, future: true },
    ],
  },
  {
    id: "jikoku",
    num: "03",
    title: "時刻",
    nodes: [
      { label: "居眠り起こし係", no: "013" },
      { label: "ノッカーアップ", no: "016" },
      { label: "目覚まし時計", no: null, future: true },
      { label: "スマホアラーム", no: null, future: true },
    ],
  },
  {
    id: "reikyaku",
    num: "04",
    title: "冷却",
    nodes: [
      { label: "採氷人", no: "023" },
      { label: "氷配達人", no: "024" },
      { label: "氷屋", no: "106" },
      { label: "電気冷蔵庫", no: null, future: true },
    ],
  },
  {
    id: "hikari",
    num: "05",
    title: "光",
    nodes: [
      { label: "松明持ち", no: "018" },
      { label: "提灯屋", no: "100" },
      { label: "点灯夫", no: "017" },
      { label: "自動点灯の電気街灯", no: null, future: true },
    ],
  },
  {
    id: "monogatari",
    num: "06",
    title: "物語",
    nodes: [
      { label: "吟遊詩人", no: "002" },
      { label: "触れ役", no: "026" },
      { label: "瓦版売り", no: "066" },
      { label: "のぞきからくり", no: "077" },
      { label: "活動弁士", no: "110" },
      { label: "紙芝居屋", no: "109" },
      { label: "配信者", no: null, future: true },
    ],
  },
  {
    id: "taiyo",
    num: "07",
    title: "貸与",
    nodes: [
      { label: "損料屋", no: "071" },
      { label: "貸本屋", no: "120" },
      { label: "ビデオレンタル店員", no: "060" },
      { label: "サブスク配信", no: null, future: true },
    ],
  },
  {
    id: "insatsu",
    num: "08",
    title: "印刷",
    nodes: [
      { label: "写本彩飾師", no: "003" },
      { label: "植字工・文選工", no: "044" },
      { label: "ライノタイプ工", no: "045" },
      { label: "DTP・デジタル印刷", no: null, future: true },
    ],
  },
  {
    id: "idou",
    num: "09",
    title: "移動",
    nodes: [
      { label: "駕籠かき", no: "064" },
      { label: "馬方", no: "082" },
      { label: "辻馬車御者", no: "030" },
      { label: "人力車夫", no: "081" },
      { label: "運転手", no: "149", ongoing: true },
      { label: "自動運転", no: null, future: true },
    ],
  },
  {
    id: "sekkyaku",
    num: "10",
    title: "接客販売",
    nodes: [
      { label: "棒手振り", no: "072" },
      { label: "行商", no: "134" },
      { label: "ガソリンガール", no: "114" },
      { label: "レジ係", no: "142", ongoing: true },
      { label: "セルフレジ・無人店舗", no: null, future: true },
    ],
  },
  {
    id: "iryo",
    num: "11",
    title: "医療",
    nodes: [
      { label: "ペスト医師", no: "005" },
      { label: "理髪外科医", no: "006" },
      { label: "ヒル採集人", no: "019" },
      { label: "近代医学", no: null, future: true },
      { label: "診断AI", no: null, future: true },
    ],
  },
  {
    id: "kiroku",
    num: "12",
    title: "記録",
    nodes: [
      { label: "書記", no: "001" },
      { label: "速記者", no: "056" },
      { label: "ワープロ", no: null, future: true },
      { label: "音声認識AI", no: null, future: true },
    ],
  },
];

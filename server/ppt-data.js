// 来源：技术中心设备研发2026年（1-7）月.pptx
// 设备出货表（P4）、设备展示型号（P5-6）、辅具出货（P8）、龙头出货（P9）、辅具展示（P10-11）

// 目的地 → 国家
export const DEST_COUNTRY = {
  宁波地区: '中国', 安徽: '中国',
  柬埔寨荣德: '柬埔寨', 柬埔寨申泽: '柬埔寨', 柬埔寨越群: '柬埔寨',
  越南德利: '越南', 越南世通: '越南',
}

// 20 种设备（类别=设备），photoKey 对应 ppt-media-tmp/<key>.jpg
export const EQUIPMENT = [
  { code: 'YFB-SJ106P', name: '自动拼单片罗纹机', photoKey: 'SJ106P', ship: { 越南世通: 2 } },
  { code: 'YFB-SJ108P', name: '十三边对折点焊机', photoKey: 'SJ108P', ship: { 宁波地区: 2, 柬埔寨越群: 4, 柬埔寨申泽: 2 } },
  { code: 'YFB-SJ242', name: '单工位翻袖口罗纹机', photoKey: 'SJ242', ship: { 柬埔寨越群: 6, 柬埔寨申泽: 4, 越南世通: 4 } },
  { code: 'YFB-SJ245', name: '自动拼领罗纹机', photoKey: 'SJ245', ship: { 越南德利: 2 } },
  { code: 'YFB-SZ18', name: '自动拉链点位机', photoKey: 'SZ18', ship: { 宁波地区: 1, 越南德利: 1, 越南世通: 1 } },
  { code: 'YFB-SZ25', name: '上领机分段装置', photoKey: 'SZ25', ship: { 越南德利: 19, 越南世通: 86 } },
  { code: 'YFB-EQ-107', name: '双针分段装置', photoKey: null, ship: { 安徽: 30, 柬埔寨越群: 45, 柬埔寨申泽: 20, 越南德利: 30 } },
  { code: 'YFB-SJ114-AD', name: '自动吊牌穿绳机', photoKey: 'SJ114', ship: { 柬埔寨越群: 7, 越南世通: 5 } },
  { code: 'YFB-EQ-109', name: '转盘式切领机', photoKey: null, ship: { 越南世通: 2 } },
  { code: 'YFB-EQ-110', name: '箭马切带收料装置', photoKey: null, ship: { 柬埔寨荣德: 10, 柬埔寨申泽: 10, 越南德利: 6, 越南世通: 20 } },
  { code: 'YFB-EQ-111', name: '平车自动拼罗纹装置', photoKey: null, ship: { 柬埔寨越群: 30 } },
  { code: 'YFB-EQ-112', name: '送帽带装置', photoKey: null, ship: { 柬埔寨越群: 40, 越南世通: 10 } },
  { code: 'YFB-SJ113', name: '纸箱贴标辊筒线', photoKey: 'SJ113', ship: { 越南德利: 3, 越南世通: 1 } },
  { code: 'YFB-EQ-114', name: '绳头内塞机', photoKey: null, ship: { 越南德利: 1 } },
  { code: 'YFB-EQ-115', name: '拉链基布预扩机', photoKey: null, ship: { 越南世通: 1 } },
  { code: 'YFB-SJ100', name: '包装袋自动贴标机', photoKey: 'SJ100', ship: { 越南德利: 7 } },
  { code: 'YFB-SJ262', name: '纱带自动预缩机（单工位）', photoKey: 'SJ262', ship: { 越南世通: 2 } },
  { code: 'YFB-EQ-118', name: '绣花卷衬架', photoKey: null, ship: { 越南德利: 15 } },
  { code: 'YFB-EQ-119', name: '立式多工位自动叠标机', photoKey: null, ship: { 越南德利: 2 } },
  { code: 'YFB-EQ-120', name: '罩杯压烫机（冷热压型）', photoKey: null, ship: { 宁波地区: 1 } },
]

// 16 种辅助工具（类别=辅助工具）
export const AUX_TOOLS = [
  { code: 'YFB-AUX-01', name: '花边织带加织带可调压脚', type: '压脚', photoKey: 'A01' },
  { code: 'YFB-AUX-02', name: '宽下摆可调装置', type: '装置', photoKey: 'A02' },
  { code: 'YFB-AUX-03', name: '卡橡筋托板', type: '托板', photoKey: 'A03' },
  { code: 'YFB-AUX-04', name: '橡筋机气动挡边装置', type: '装置', photoKey: 'A04' },
  { code: 'YFB-AUX-05', name: '五线拷克滚领', type: '龙头', photoKey: 'A05' },
  { code: 'YFB-AUX-06', name: '单面光龙头', type: '龙头', photoKey: 'A06' },
  { code: 'YFB-AUX-07', name: '双面光龙头', type: '龙头', photoKey: 'A07' },
  { code: 'YFB-AUX-08', name: '上罗纹吹气装置', type: '装置', photoKey: 'A08' },
  { code: 'YFB-AUX-09', name: '可调压橡筋装置', type: '装置', photoKey: 'A09' },
  { code: 'YFB-AUX-10', name: '对折嵌线绳可调装置', type: '装置', photoKey: 'A10' },
  { code: 'YFB-AUX-11', name: '圆筒滚边', type: '龙头', photoKey: 'A11' },
  { code: 'YFB-AUX-12', name: '拷克翻袋子龙头', type: '龙头', photoKey: 'A12' },
  { code: 'YFB-AUX-13', name: '上袖卷边龙头', type: '龙头', photoKey: 'A13' },
  { code: 'YFB-AUX-14', name: '拔缝车吹线头辅具', type: '辅具', photoKey: 'A14' },
  { code: 'YFB-AUX-15', name: '双凸倒缝压烫辅助器', type: '辅具', photoKey: 'A15' },
  { code: 'YFB-AUX-16', name: '织带拼缝卷边', type: '龙头', photoKey: 'A16' },
]

// 辅助工具月度出货（P8）：[月份, {目的地: 数量}]
export const AUX_MONTHLY = [
  ['2026-01', { 宁波地区: 57, 安徽: 65, 柬埔寨申泽: 380, 柬埔寨越群: 190, 越南德利: 5, 越南世通: 50 }],
  ['2026-02', { 宁波地区: 7, 柬埔寨申泽: 40, 柬埔寨越群: 56, 越南德利: 30, 越南世通: 30 }],
  ['2026-03', { 宁波地区: 6, 柬埔寨越群: 1, 越南德利: 1, 越南世通: 1 }],
  ['2026-04', { 宁波地区: 19, 柬埔寨申泽: 28, 柬埔寨越群: 50, 越南德利: 15, 越南世通: 4 }],
  ['2026-05', { 宁波地区: 10, 柬埔寨申泽: 3, 越南德利: 3, 越南世通: 1 }],
  ['2026-06', { 宁波地区: 6, 柬埔寨申泽: 4, 越南德利: 1, 越南世通: 3 }],
  ['2026-07', { 宁波地区: 44, 柬埔寨申泽: 2, 柬埔寨越群: 610, 越南德利: 256, 越南世通: 2 }],
]

// 龙头月度出货（P9）
export const LONGTOU_MONTHLY = [
  ['2026-01', { 宁波地区: 294, 柬埔寨申泽: 60, 柬埔寨越群: 40, 越南德利: 15 }],
  ['2026-02', { 宁波地区: 150, 柬埔寨越群: 25, 越南德利: 38, 越南世通: 113 }],
  ['2026-03', { 宁波地区: 76, 柬埔寨越群: 1, 越南德利: 2, 越南世通: 12 }],
  ['2026-04', { 宁波地区: 96, 柬埔寨越群: 6, 越南德利: 2, 越南世通: 11 }],
  ['2026-05', { 宁波地区: 67, 柬埔寨申泽: 1, 柬埔寨越群: 2, 越南德利: 1, 越南世通: 9 }],
  ['2026-06', { 宁波地区: 65, 柬埔寨越群: 2, 越南德利: 4, 越南世通: 14 }],
  ['2026-07', { 宁波地区: 66, 越南德利: 1, 越南世通: 17 }],
]

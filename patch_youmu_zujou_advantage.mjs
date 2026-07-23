#!/usr/bin/env node
/** 頭上花剪斬 214B の相手別有利差表（B版・発生33F） */

export const ZUJOU_214B_ADVANTAGE_TABLE = {
  title: 'B版（発生33F）',
  description:
    'ヒットは頭上花剪斬が当たるフレーム、有利差は正G・誤Gそれぞれの有利差を表す。相手キャラは、基本的に正ガードのときは後ろ歩き状態で、誤ガードのときはしゃがみ状態でガードするものとする。',
  rows: [
    {
      相手キャラ: ['早苗', 'チルノ', '美鈴', '空', '魔理沙', 'アリス', '妖夢', '紫', '文', '小町', '衣玖', '天子'],
      対立ち: { ヒット: '33', 有利差: '-3' },
      対しゃがみ: { ヒット: '34', 有利差: '+2' },
    },
    {
      相手キャラ: ['霊夢', 'パチュリー', '咲夜*1', 'レミリア', '幽々子', '鈴仙'],
      対立ち: { ヒット: '33', 有利差: '-3' },
      対しゃがみ: { ヒット: '35', 有利差: '+3' },
    },
    {
      相手キャラ: ['咲夜*2'],
      対立ち: { ヒット: '33', 有利差: '-3' },
      対しゃがみ: { ヒット: '36', 有利差: '+4' },
    },
    {
      相手キャラ: ['諏訪子'],
      対立ち: { ヒット: '34', 有利差: '-2' },
      対しゃがみ: { ヒット: '33', 有利差: '+1' },
    },
    {
      相手キャラ: ['萃香'],
      対立ち: { ヒット: '34', 有利差: '-2' },
      対しゃがみ: { ヒット: '35', 有利差: '+3' },
    },
  ],
};

function patchNested214B(row, table) {
  if (!row?.Lv || typeof row.Lv !== 'object') return;
  for (const cmdTree of Object.values(row.Lv)) {
    const leaf = cmdTree['214B']?.['_'];
    if (leaf && leaf['動作']?.['発生'] === '33') {
      leaf['特記事項'] = table;
    }
  }
}

export function patchYoumuZujouAdvantage(char, name) {
  if (name !== '妖夢') return char;
  const section = char['必殺技'];
  if (!section?.rows) return char;
  const row = section.rows.find((r) => r['技名'] === '頭上花剪斬');
  if (row) patchNested214B(row, ZUJOU_214B_ADVANTAGE_TABLE);
  return char;
}

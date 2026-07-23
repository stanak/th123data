#!/usr/bin/env node
/** 頭上花剪斬 214B/C/HB の相手別有利差表 */

const ADVANTAGE_DESCRIPTION =
  '有利差は正G・誤Gそれぞれの有利差を表す。相手キャラは、基本的に正ガードのときは後ろ歩き状態で、誤ガードのときはしゃがみ状態でガードするものとする。';

export const ZUJOU_214B_ADVANTAGE_TABLE = {
  title: 'B版（発生33F）',
  description: ADVANTAGE_DESCRIPTION,
  rows: [
    {
      相手キャラ: ['早苗', 'チルノ', '美鈴', '空', '魔理沙', 'アリス', '妖夢', '紫', '文', '小町', '衣玖', '天子'],
      正G: '-3',
      誤G: '+2',
    },
    {
      相手キャラ: ['霊夢', 'パチュリー', '咲夜(しゃがみ高部分)', 'レミリア', '幽々子', '鈴仙'],
      正G: '-3',
      誤G: '+3',
    },
    {
      相手キャラ: ['咲夜(しゃがみ低部分)'],
      正G: '-3',
      誤G: '+4',
    },
    {
      相手キャラ: ['諏訪子'],
      正G: '-2',
      誤G: '+1',
    },
    {
      相手キャラ: ['萃香'],
      正G: '-2',
      誤G: '+3',
    },
  ],
};

export const ZUJOU_214C_ADVANTAGE_TABLE = {
  title: 'C版（発生39F）',
  description: ADVANTAGE_DESCRIPTION,
  rows: [
    {
      相手キャラ: ['空', '咲夜(しゃがみ高部分)', '幽々子', '文', '衣玖'],
      正G: '-2',
      誤G: '+4',
    },
    {
      相手キャラ: ['咲夜(しゃがみ低部分)'],
      正G: '-2',
      誤G: '+5',
    },
    {
      相手キャラ: [
        '早苗',
        'チルノ',
        '美鈴',
        '霊夢',
        '魔理沙',
        'アリス',
        'パチュリー',
        '妖夢',
        'レミリア',
        '紫',
        '鈴仙',
        '小町',
        '天子',
      ],
      正G: '-1',
      誤G: '+4',
    },
    {
      相手キャラ: ['諏訪子'],
      正G: '±0',
      誤G: '+2',
    },
    {
      相手キャラ: ['萃香'],
      正G: '±0',
      誤G: '+4',
    },
  ],
};

export const ZUJOU_214HB_ADVANTAGE_TABLE = {
  title: 'ホールドB版（発生48F）',
  description: ADVANTAGE_DESCRIPTION,
  rows: [
    {
      相手キャラ: ['チルノ', '美鈴', '空', '諏訪子', 'アリス', '紫', '文', '衣玖', '天子'],
      正G: '-1',
      誤G: '+23',
    },
    {
      相手キャラ: ['早苗', '霊夢', '魔理沙', 'パチュリー', '咲夜', '妖夢', 'レミリア', '幽々子', '萃香', '鈴仙', '小町'],
      正G: '-1',
      誤G: '+24',
    },
  ],
};

function patchNestedCommand(row, command, startup, table) {
  if (!row?.Lv || typeof row.Lv !== 'object') return;
  for (const cmdTree of Object.values(row.Lv)) {
    const leaf = cmdTree[command]?.['_'];
    if (leaf && leaf['動作']?.['発生'] === startup) {
      leaf['特記事項'] = table;
    }
  }
}

export function patchYoumuZujouAdvantage(char, name) {
  if (name !== '妖夢') return char;
  const section = char['必殺技'];
  if (!section?.rows) return char;
  const row = section.rows.find((r) => r['技名'] === '頭上花剪斬');
  if (!row) return char;
  patchNestedCommand(row, '214B', '33', ZUJOU_214B_ADVANTAGE_TABLE);
  patchNestedCommand(row, '214C', '39', ZUJOU_214C_ADVANTAGE_TABLE);
  patchNestedCommand(row, '214HB', '48', ZUJOU_214HB_ADVANTAGE_TABLE);
  return char;
}

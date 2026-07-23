/** Browser-side parser for 射撃技早見表 (passed to page.evaluate). */
export const PARSE_BULLET_QUICK_REF_JS = `(() => {
  function trimCell(text) {
    return (text || '')
      .replace(/[ \\t\\f\\v]+/g, ' ')
      .replace(/\\n[ \\t]*/g, '\\n')
      .replace(/[ \\t]*\\n/g, '\\n')
      .replace(/\\n{2,}/g, '\\n')
      .trim();
  }
  function extractCellText(cell) {
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeName === 'BR') return '\\n';
      let s = '';
      node.childNodes.forEach((ch) => { s += walk(ch); });
      return s;
    }
    return trimCell(walk(cell));
  }
  function joinCellLines(text) {
    if (!text) return '';
    return text.split('\\n').map((s) => s.trim()).filter(Boolean).join('。');
  }
  function parseTable(table) {
    const grid = [];
    table.querySelectorAll('tr').forEach((tr, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];
      let colIdx = 0;
      tr.querySelectorAll('th, td').forEach((cell) => {
        while (grid[rowIdx][colIdx] !== undefined) colIdx++;
        const text = extractCellText(cell);
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            const tr_ = rowIdx + r;
            const tc = colIdx + c;
            if (!grid[tr_]) grid[tr_] = [];
            grid[tr_][tc] = text;
          }
        }
        colIdx += colspan;
      });
    });
    return grid;
  }
  function isHeaderRow(row) {
    if (!row) return true;
    const g = (row[0] || '').replace(/\\n/g, '');
    if (g === '技名') return true;
    if (g.includes('射撃技早見表を展開')) return true;
    if ((row[3] || '') === '強度' && (row[4] || '') === '回数') return true;
    return false;
  }
  const main = document.querySelector('#wikibody');
  if (!main) return { error: 'no wikibody' };
  let targetTable = null;
  for (const h of main.querySelectorAll('h2,h3,h4')) {
    const title = (h.textContent || '').replace(/\\s+/g, ' ').trim();
    if (title !== '射撃技早見表') continue;
    let el = h.nextElementSibling;
    while (el && !/^H[234]$/.test(el.tagName)) {
      if (el.tagName === 'TABLE') {
        targetTable = el;
        break;
      }
      el = el.nextElementSibling;
    }
    break;
  }
  if (!targetTable) return { error: 'table not found' };
  const grid = parseTable(targetTable);
  const rows = [];
  for (const row of grid) {
    if (isHeaderRow(row)) continue;
    const group = row[0] || '';
    const sub = row[1] || '';
    if (!group && !sub) continue;
    if (group === '+' || group.includes('射撃技早見表を展開')) continue;
    const entry = {
      group,
      sub,
      ヒット数: row[2] || '',
      相殺強度: row[3] || '',
      相殺回数: row[4] || '',
      グレイズ耐久数: row[5] || '',
      備考: joinCellLines(row[6] || ''),
    };
    if (!entry.相殺強度 && !entry.相殺回数 && !entry.グレイズ耐久数 && !entry.備考) continue;
    rows.push(entry);
  }
  return { rows, rowCount: rows.length };
})()`;

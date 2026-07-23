/** Browser-side parser for 技表 必殺技/スペルカード 攻撃属性 tables. */
export const PARSE_ATTACK_ATTRIBUTES_JS = `(() => {
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
    if (!grid.length) return { headers: [], rows: [] };
    const headers = (grid[0] || []).map((h) => trimCell(h).replace(/\\n/g, ''));
    const rows = [];
    for (let r = 1; r < grid.length; r++) {
      const row = grid[r];
      const obj = {};
      let has = false;
      headers.forEach((header, colIdx) => {
        if (!header) return;
        const value = trimCell(row[colIdx] || '');
        if (value) {
          obj[header] = value;
          has = true;
        }
      });
      if (has) rows.push(obj);
    }
    return { headers, rows };
  }
  function findSectionTable(sectionTitle) {
    const main = document.querySelector('#wikibody');
    if (!main) return null;
    for (const h of main.querySelectorAll('h2,h3,h4')) {
      const title = (h.textContent || '').replace(/\\s+/g, ' ').trim();
      if (title !== sectionTitle) continue;
      let el = h.nextElementSibling;
      while (el && !/^H[234]$/.test(el.tagName)) {
        if (el.tagName === 'TABLE') return el;
        el = el.nextElementSibling;
      }
      return null;
    }
    return null;
  }
  function normalizeMoveCell(name) {
    return trimCell(name)
      .replace(/\\n/g, '')
      .replace(/\\(\\*\\d+\\)/g, '')
      .replace(/-+$/g, '')
      .trim();
  }
  const specials = findSectionTable('必殺技');
  const spells = findSectionTable('スペルカード');
  if (!specials && !spells) return { error: 'tables not found' };
  const out = { specials: [], spells: [] };
  if (specials) {
    for (const row of parseTable(specials).rows) {
      const moveName = normalizeMoveCell(row['技名'] || '');
      const attr = trimCell(row['攻撃属性'] || '');
      if (!moveName || !attr || attr === '-' || moveName === '技名' || attr === '攻撃属性') continue;
      out.specials.push({
        moveName,
        usage: trimCell(row['使用場所'] || ''),
        attackAttribute: attr,
        notes: trimCell(row['備考'] || ''),
      });
    }
  }
  if (spells) {
    for (const row of parseTable(spells).rows) {
      const moveName = normalizeMoveCell(row['技名'] || '');
      const attr = trimCell(row['攻撃属性'] || '');
      if (!moveName || !attr || attr === '-' || moveName === '技名' || attr === '攻撃属性') continue;
      out.spells.push({
        moveName,
        cost: trimCell(row['コスト'] || ''),
        usage: trimCell(row['使用場所'] || ''),
        attackAttribute: attr,
        notes: trimCell(row['備考'] || ''),
      });
    }
  }
  return {
    specialCount: out.specials.length,
    spellCount: out.spells.length,
    ...out,
  };
})()`;

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHARACTERS = [
  { name: '早苗', pageId: 157 },
  { name: 'チルノ', pageId: 159 },
  { name: '美鈴', pageId: 164 },
  { name: '空', pageId: 172 },
  { name: '諏訪子', pageId: 178 },
  { name: '霊夢', pageId: 158 },
  { name: '魔理沙', pageId: 161 },
  { name: 'アリス', pageId: 165 },
  { name: 'パチュリー', pageId: 171 },
  { name: '咲夜', pageId: 175 },
  { name: '妖夢', pageId: 160 },
  { name: 'レミリア', pageId: 163 },
  { name: '幽々子', pageId: 166 },
  { name: '紫', pageId: 173 },
  { name: '萃香', pageId: 177 },
  { name: '鈴仙', pageId: 156 },
  { name: '文', pageId: 162 },
  { name: '小町', pageId: 167 },
  { name: '衣玖', pageId: 174 },
  { name: '天子', pageId: 176 },
];

const BASE = 'https://w.atwiki.jp/bulletaction/pages';

const PARSE_PAGE_JS = () => {
  function clean(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function isSkipSection(title) {
    return ['更新履歴', '修正履歴', 'Menu'].includes(title);
  }

  function parseTable(table) {
    const grid = [];
    const rowspanTracker = {};

    const rows = table.querySelectorAll('tr');
    rows.forEach((tr, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];
      let colIdx = 0;

      tr.querySelectorAll('th, td').forEach((cell) => {
        while (grid[rowIdx][colIdx] !== undefined) colIdx++;

        const text = clean(cell.textContent);
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            const targetRow = rowIdx + r;
            const targetCol = colIdx + c;
            if (!grid[targetRow]) grid[targetRow] = [];
            grid[targetRow][targetCol] = text;
          }
        }
        colIdx += colspan;
      });
    });

    if (grid.length === 0) return { headers: [], rows: [] };

    // Detect header rows: consecutive rows at top where most cells are non-empty in header pattern
    let headerRowCount = 1;
    if (grid.length > 1) {
      const row0 = grid[0];
      const row1 = grid[1];
      const hasSubHeader = row1.some((cell, i) => cell && row0[i] && cell !== row0[i]);
      const row0HasEmpty = row0.filter(c => !c).length > 0;
      if (hasSubHeader || row0HasEmpty) headerRowCount = 2;
      // Check for 3-row headers
      if (grid.length > 2 && headerRowCount === 2) {
        const row2 = grid[2];
        const hasThirdHeader = row2.some((cell, i) => cell && (!row1[i] || cell !== row1[i]) && (!row0[i] || cell !== row0[i]));
        const dataLike = row2.filter(c => c && /^\d/.test(c)).length > 2;
        if (hasThirdHeader && !dataLike) headerRowCount = 3;
      }
    }

    function buildHeaderTree(headerRows) {
      if (headerRows.length === 0) return [];
      if (headerRows.length === 1) {
        return headerRows[0].map(h => h || '');
      }

      const maxCols = Math.max(...headerRows.map(r => r.length));
      const columns = [];

      for (let col = 0; col < maxCols; col++) {
        const parts = [];
        for (const row of headerRows) {
          const val = row[col] || '';
          if (val && parts[parts.length - 1] !== val) parts.push(val);
        }
        if (parts.length === 0) {
          columns.push('');
        } else if (parts.length === 1) {
          columns.push(parts[0]);
        } else {
          // nested: parent -> child
          let node = {};
          let current = node;
          for (let i = 0; i < parts.length - 1; i++) {
            current[parts[i]] = {};
            current = current[parts[i]];
          }
          current[parts[parts.length - 1]] = null;
          columns.push(node);
        }
      }
      return columns;
    }

    const headerRows = grid.slice(0, headerRowCount);
    const headers = buildHeaderTree(headerRows);

    function setNestedValue(obj, header, value) {
      if (value === '' || value === undefined) return;
      if (typeof header === 'string') {
        if (header === '') {
          // find first empty key or use index
          const keys = Object.keys(obj);
          const unnamedKey = keys.find(k => k.startsWith('_col'));
          if (!unnamedKey) {
            const idx = keys.filter(k => k.startsWith('_col')).length;
            obj[`_col${idx}`] = value;
          }
        } else {
          obj[header] = value;
        }
      } else {
        const keys = Object.keys(header);
        if (keys.length === 1) {
          const k = keys[0];
          if (!obj[k] || typeof obj[k] !== 'object') obj[k] = {};
          const subHeader = header[k];
          if (subHeader === null) {
            obj[k] = value;
          } else {
            setNestedValue(obj[k], subHeader, value);
          }
        }
      }
    }

    function mergeRowValues(target, source) {
      for (const [k, v] of Object.entries(source)) {
        if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object') {
          mergeRowValues(target[k], v);
        } else if (v !== '' && v !== undefined) {
          target[k] = v;
        }
      }
    }

    const dataRows = [];
    let carryForward = {};

    for (let r = headerRowCount; r < grid.length; r++) {
      const row = grid[r];
      const rowObj = {};
      let hasContent = false;

      row.forEach((cell, colIdx) => {
        const header = headers[colIdx];
        const value = cell || '';

        if (value) {
          hasContent = true;
          setNestedValue(rowObj, header, value);
          // update carry forward for rowspan-like empty cells
          if (typeof header === 'string' && header) {
            carryForward[colIdx] = value;
          } else if (typeof header === 'object') {
            carryForward[colIdx] = value;
          }
        } else if (carryForward[colIdx] && header) {
          setNestedValue(rowObj, header, carryForward[colIdx]);
        }
      });

      if (hasContent) {
        if (dataRows.length > 0) {
          const prev = dataRows[dataRows.length - 1];
          // merge continuation rows (empty 技名 etc.)
          const prevKeys = Object.keys(prev).filter(k => !k.startsWith('_col'));
          const currKeys = Object.keys(rowObj).filter(k => !k.startsWith('_col'));
          const isContinuation = prevKeys.length > 0 && !rowObj['技名'] && currKeys.some(k => k !== '備考');
          if (isContinuation) {
            mergeRowValues(prev, rowObj);
            continue;
          }
        }
        dataRows.push(rowObj);
      }
    }

    return { headers, rows: dataRows };
  }

  function parsePageContent() {
    const main = document.querySelector('#wikibody');
    if (!main) return { error: 'no wikibody' };

    const result = {
      title: clean(document.querySelector('h1')?.textContent),
      sections: [],
      footnotes: {},
      subpageLinks: [],
    };

    let currentH2 = null;
    let currentH3 = null;
    let currentH4 = null;

    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const tag = node.tagName.toLowerCase();
        if (['h2', 'h3', 'h4', 'h5', 'table', 'ul', 'p', 'div'].includes(tag)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      const tag = node.tagName.toLowerCase();

      if (tag === 'h2') {
        const title = clean(node.textContent);
        if (isSkipSection(title)) {
          currentH2 = null;
          currentH3 = null;
          currentH4 = null;
          continue;
        }
        currentH2 = { title, subsections: [], notes: [] };
        result.sections.push(currentH2);
        currentH3 = null;
        currentH4 = null;
      } else if (tag === 'h3' && currentH2) {
        const title = clean(node.textContent);
        currentH3 = { title, subsections: [], tables: [], notes: [] };
        currentH2.subsections.push(currentH3);
        currentH4 = null;
      } else if (tag === 'h4' && currentH3) {
        const title = clean(node.textContent);
        currentH4 = { title, tables: [], notes: [] };
        currentH3.subsections.push(currentH4);
      } else if (tag === 'h5' && currentH4) {
        const title = clean(node.textContent);
        const h5section = { title, tables: [], notes: [] };
        currentH4.subsections = currentH4.subsections || [];
        currentH4.subsections.push(h5section);
      } else if (tag === 'table') {
        const tableData = parseTable(node);
        const item = { type: 'table', ...tableData };
        if (currentH4?.subsections?.length) {
          const last = currentH4.subsections[currentH4.subsections.length - 1];
          last.tables.push(item);
        } else if (currentH4) {
          currentH4.tables.push(item);
        } else if (currentH3) {
          currentH3.tables.push(item);
        } else if (currentH2) {
          currentH2.tables = currentH2.tables || [];
          currentH2.tables.push(item);
        }
      } else if (tag === 'ul') {
        const items = Array.from(node.querySelectorAll(':scope > li')).map(li => clean(li.textContent)).filter(Boolean);
        if (items.length === 0) continue;
        const note = { type: 'list', items };
        if (currentH4) currentH4.notes.push(note);
        else if (currentH3) currentH3.notes.push(note);
        else if (currentH2) currentH2.notes.push(note);
      } else if (tag === 'p') {
        const text = clean(node.textContent);
        if (!text || text.startsWith('最終更新')) continue;
        const note = { type: 'paragraph', text };
        if (currentH4) currentH4.notes.push(note);
        else if (currentH3) currentH3.notes.push(note);
        else if (currentH2) currentH2.notes.push(note);
      }
    }

    // Collect subpage links under 必殺技 h3
    main.querySelectorAll('h3').forEach(h3 => {
      if (clean(h3.textContent) !== '必殺技') return;
      let el = h3.nextElementSibling;
      while (el && !['H2', 'H3'].includes(el.tagName)) {
        el.querySelectorAll('a[href*="/pages/"]').forEach(a => {
          const href = a.href;
          const text = clean(a.textContent);
          if (text && !text.startsWith('*') && href.includes('/pages/')) {
            result.subpageLinks.push({ section: '必殺技', text, url: href });
          }
        });
        el = el.nextElementSibling;
      }
    });

    // Footnotes
    document.querySelectorAll('.plugin-footnote, #footnote, .atwiki-plugin-footnotes').forEach(fn => {
      fn.querySelectorAll('li, p').forEach(item => {
        const text = clean(item.textContent);
        const m = text.match(/^(\*\d+)\s*(.*)/);
        if (m) result.footnotes[m[1]] = m[2];
      });
    });
    // Also check bottom footnotes section
    const bodyText = document.body.innerText;
    const fnSection = bodyText.split('注釈').pop();
    if (fnSection) {
      fnSection.split('\n').forEach(line => {
        const m = line.trim().match(/^(\*\d+)\s*(.*)/);
        if (m) result.footnotes[m[1]] = m[2];
      });
    }

    return result;
  }

  return parsePageContent();
};

async function scrapePage(page, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(2000);
      await page.waitForSelector('#wikibody', { timeout: 45000 });
      const result = await page.evaluate(PARSE_PAGE_JS);
      if (result?.error) throw new Error(result.error);
      return result;
    } catch (err) {
      console.error(`  Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
}

function cleanSection(section) {
  const cleaned = { ...section };
  if (cleaned.tables?.length === 0) delete cleaned.tables;
  if (cleaned.notes?.length === 0) delete cleaned.notes;
  if (cleaned.subsections) {
    cleaned.subsections = cleaned.subsections.map(cleanSection).filter(s =>
      s.tables?.length || s.notes?.length || s.subsections?.length
    );
    if (cleaned.subsections.length === 0) delete cleaned.subsections;
  }
  return cleaned;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = await context.newPage();

  const output = {
    source: 'https://w.atwiki.jp/bulletaction/pages/105.html',
    wiki: '細々と東方非想天則を攻略するwiki',
    scrapedAt: new Date().toISOString(),
    characters: {},
  };

  const subpageCache = new Map();

  for (const char of CHARACTERS) {
    const url = `${BASE}/${char.pageId}.html`;
    console.error(`Fetching ${char.name}: ${url}`);
    const data = await scrapePage(page, url);

    // Fetch subpages for 必殺技
    const charData = {
      name: char.name,
      pageUrl: url,
      title: data.title,
      frameData: {},
      footnotes: data.footnotes,
    };

    for (const section of data.sections) {
      const sectionTitle = section.title.replace(/フレームデータ$/, '').trim() || section.title;
      if (sectionTitle.includes('フレームデータ') || section.subsections?.length) {
        const key = sectionTitle.endsWith('フレームデータ') ? 'フレームデータ' : sectionTitle;
        charData.frameData[key] = charData.frameData[key] || {};

        for (const h3 of section.subsections || []) {
          charData.frameData[key][h3.title] = {
            ...(h3.tables?.length ? { tables: h3.tables } : {}),
            ...(h3.notes?.length ? { notes: h3.notes } : {}),
          };

          // Handle h4 subsections
          if (h3.subsections?.length) {
            charData.frameData[key][h3.title].subsections = {};
            for (const h4 of h3.subsections) {
              charData.frameData[key][h3.title].subsections[h4.title] = {
                ...(h4.tables?.length ? { tables: h4.tables } : {}),
                ...(h4.notes?.length ? { notes: h4.notes } : {}),
              };
              if (h4.subsections?.length) {
                charData.frameData[key][h3.title].subsections[h4.title].subsections = {};
                for (const h5 of h4.subsections) {
                  charData.frameData[key][h3.title].subsections[h4.title].subsections[h5.title] = {
                    ...(h5.tables?.length ? { tables: h5.tables } : {}),
                    ...(h5.notes?.length ? { notes: h5.notes } : {}),
                  };
                }
              }
            }
          }

          // Fetch 必殺技 subpages
          if (h3.title === '必殺技' && data.subpageLinks?.length) {
            charData.frameData[key][h3.title].pages = {};
            for (const link of data.subpageLinks) {
              let subData;
              if (subpageCache.has(link.url)) {
                subData = subpageCache.get(link.url);
              } else {
                console.error(`  Subpage: ${link.text} -> ${link.url}`);
                subData = await scrapePage(page, link.url);
                subpageCache.set(link.url, subData);
                await new Promise(r => setTimeout(r, 1500));
              }

              const pageContent = {};
              for (const sec of subData.sections) {
                if (isSkipSectionName(sec.title)) continue;
                pageContent[sec.title] = {};
                for (const sub of sec.subsections || []) {
                  pageContent[sec.title][sub.title] = {
                    ...(sub.tables?.length ? { tables: sub.tables } : {}),
                    ...(sub.notes?.length ? { notes: sub.notes } : {}),
                  };
                  if (sub.subsections?.length) {
                    pageContent[sec.title][sub.title].subsections = {};
                    for (const sub4 of sub.subsections) {
                      pageContent[sec.title][sub.title].subsections[sub4.title] = {
                        ...(sub4.tables?.length ? { tables: sub4.tables } : {}),
                        ...(sub4.notes?.length ? { notes: sub4.notes } : {}),
                      };
                      if (sub4.subsections?.length) {
                        pageContent[sec.title][sub.title].subsections[sub4.title].subsections = {};
                        for (const sub5 of sub4.subsections) {
                          pageContent[sec.title][sub.title].subsections[sub4.title].subsections[sub5.title] = {
                            ...(sub5.tables?.length ? { tables: sub5.tables } : {}),
                            ...(sub5.notes?.length ? { notes: sub5.notes } : {}),
                          };
                        }
                      }
                    }
                  }
                }
              }
              charData.frameData[key][h3.title].pages[link.text] = {
                url: link.url,
                title: subData.title,
                content: pageContent,
                footnotes: subData.footnotes,
              };
            }
          }
        }
      }
    }

    // Merge all footnotes from subpages
    output.characters[char.name] = charData;
    await new Promise(r => setTimeout(r, 1000));
  }

  await browser.close();

  const outPath = path.join(__dirname, 'frame_data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.error(`Written to ${outPath}`);
  console.log(outPath);
}

function isSkipSectionName(title) {
  return ['更新履歴', '修正履歴', 'Menu'].includes(title);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

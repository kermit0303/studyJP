let currentPage = 1;
let maxpage = 3;
let minLoadedBatch = maxpage;

let categoryList;
let container;

let batchCounter = 0;

// ========= 左側與右側 DOM =========
document.addEventListener("DOMContentLoaded", () => {
  container = document.getElementById('word-list');
  categoryList = document.getElementById('category-list');


  // ========= 滾動監聽，滾動到底部時載入下一批 =========
  container.addEventListener('scroll', async () => {
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
      if (minLoadedBatch <= 1) return;

      const nextBatch = minLoadedBatch - 1;
      await loadBatch(nextBatch);
      minLoadedBatch = nextBatch;
    }
  });
  // ========= 頁面初始化 =========
  insertGlobalNoteMarker();
  preloadTitles();
  loadBatch(maxpage);
});

// ========= 全局設定 =========

const loadedTitles = new Set();
const loadedContents = new Set();
const loadedContentsSet = new Set();


// ========= 載入標題，只載入左側清單 =========
function preloadTitles() {
  for (let i = maxpage; i >= 1; i--) {
    loadDataFile(`${files}vocabData/vocab-data-${i}.js`, i, true);
  }
}

// ========= 主要載入批次內容 =========
async function loadBatch(batchIndex) {
  if (loadedContentsSet.has(batchIndex)) return;

  await loadDataFile(`${files}vocabData/vocab-data-${batchIndex}.js`, batchIndex, false);
  loadedContentsSet.add(batchIndex);
  manageBatchDom(batchIndex);

}


// ========= 管理DOM，控制只保留當前及前後批次 =========
async function manageBatchDom(currentIndex) {
  const keep = [currentIndex - 1, currentIndex, currentIndex + 1];

  // 1️⃣ 補齊缺失 batch
  for (let idx of keep) {
    if (idx >= 1 && idx <= maxpage && !loadedContentsSet.has(idx)) {
      await loadBatch(idx);
    }
  }

  // 2️⃣ 刪除不在 keep 的 batch
  document.querySelectorAll('.batch-container').forEach(el => {
    const idx = parseInt(el.dataset.batchIndex);
    if (!keep.includes(idx)) {
      el.remove();
      loadedContentsSet.delete(idx);
    }
  });
}
// ========= 延遲載入資料的函式 =========
function loadDataFile(filePath, batchIndex, titlesOnly = false) {
  return new Promise((resolve, reject) => {
    // 判斷是否已經載入過
    if (titlesOnly && loadedTitles.has(batchIndex)) {
      resolve();
      return;
    }
    if (!titlesOnly && loadedContents.has(batchIndex)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = filePath;
    script.async = false;
    script.defer = false;
    script.onload = () => {
      const pageData = window[`vocabData${batchIndex}`];
      if (pageData) {
        if (pageData.tables) {
          pageData.tables.forEach(table => {
            if (table.header) {
              const sectionIndex = batchCounter++;
              if (table.caption) {
                createCaption(table.caption, sectionIndex, table);
              }
              // 1️⃣ 用 renderTable 生成完整 HTML
              const tableHTML = renderTagged(renderTable(table), table); // 如果需要，可以傳 item 或 table

              // 2️⃣ 用 wrapper 包起來
              const wrapper = document.createElement('div');
              wrapper.innerHTML = tableHTML;

              const section = document.createElement('section');
              section.id = `section-${sectionIndex}`;
              section.dataset.batch = batchIndex;
              // 3️⃣ 放到 section，再放到 container
              section.appendChild(wrapper);
              container.appendChild(section);

            }
            else {
              const rows = table.rows || [];
              const columns = table.columns || 3;
              appendVocabRows(rows, columns, table.caption, table);  // 可以順便傳 caption
            }
          });
        }

        if (titlesOnly) {
          loadedTitles.add(batchIndex);
        } else {
          loadedContents.add(batchIndex);
        }
      } else {
        console.warn('No more data');
      }

      resolve();
    };

    script.onerror = () => {
      console.error(`無法載入 ${filePath}`);
      reject();
    };
    document.body.appendChild(script);
  });
}


// 單字轉成 HTML → 根據是否有 colspan 產生 cell
function renderVocabItemAsCells(item) {
  // 有 colspan → 直接合併成一大格
  if (item.colspan) {
    const rubyHTML = item.jp.map(char => {
      const k = renderTagged(char.k, item);
      if (char.f) {
        return `<ruby>${k}<rt>${char.f}</rt></ruby>`;
      } else {
        return `<ruby>${k}</ruby>`;
      }
    }).join('');

    const content = `
      <div class="cell-wrap">
        <div class="jp">${rubyHTML}</div>
        <div class="zh">${item.zh || ''}</div>
      </div>`;
    return [
      `<td class="merged" colspan="${item.colspan}">${content}</td>`
    ];
  }

  // 預設：一格內上下排 jp/zh
  const rubyHTML = item.jp.map(char => {
    const k = renderTagged(char.k, item);
    if (char.f) {
      return `<ruby>${k}<rt>${renderTagged(char.f, item)}</rt></ruby>`;
    } else {
      return `<ruby>${k}</ruby>`;
    }
  }).join('');

  const content = `
    <div class="cell-wrap">
      <div class="jp">${rubyHTML}</div>
      <div class="zh">${renderTagged(item.zh, item) || ''}</div>
    </div>`;
  return [`<td>${content}</td>`];
}
function appendVocabRows(data, columns = 3, caption = "", item) {
  const sectionIndex = batchCounter++;
  const container = document.getElementById("word-list");

  const section = document.createElement('section');
  section.id = `section-${sectionIndex}`;
  section.dataset.batch = sectionIndex;

  const table = document.createElement("table");
  table.className = "table-jp";

  if (caption) {
    const cap = createCaption(caption, sectionIndex, item);
    table.appendChild(cap);
  }

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  let row = [];
  let unitCount = 0;

  data.forEach(item => {
    const spanUnits = item.colspan || 1;

    if (unitCount + spanUnits > columns) {
      if (row.length > 0) {
        tbody.insertAdjacentHTML("beforeend", `<tr>${row.join("")}</tr>`);
      }
      row = [];
      unitCount = 0;
    }

    const cells = renderVocabItemAsCells(item);
    row.push(...cells);
    unitCount += spanUnits;

    if (unitCount === columns) {
      tbody.insertAdjacentHTML("beforeend", `<tr>${row.join("")}</tr>`);
      row = [];
      unitCount = 0;
    }
  });

  if (row.length > 0) {
    tbody.insertAdjacentHTML("beforeend", `<tr>${row.join("")}</tr>`);
  }

  section.appendChild(table);
  container.appendChild(section);
}


function createCaption(captionText, batchIndex, item) {
  // 1️⃣ 建立 caption 元素
  const cap = document.createElement("caption");
  cap.innerHTML = renderMaybeFurigana(captionText);

  // 2️⃣ 側邊欄
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `#section-${batchIndex}`;
  a.dataset.batchLink = batchIndex;
  a.innerHTML = renderTagged(captionText, item);
  a.addEventListener('click', (e) => {

    // 關閉側邊欄
    sidebar.classList.remove('show');
  });
  li.appendChild(a);
  categoryList.appendChild(li);

  return cap;
}

function scrollToBatch(batchIndex) {
  const table = document.querySelector(`[data-batch='${batchIndex}']`);
  if (!table) return;

  // 取得 toolbar 高度
  const toolbarHeight = document.querySelector('.toolbar')?.offsetHeight || 0;

  // 計算 table 在頁面上的位置
  const top = table.getBoundingClientRect().top + window.scrollY - toolbarHeight - 10; // 🔹再加一點 margin

  window.scrollTo({
    top: top,
    behavior: 'smooth'
  });
}

function renderMaybeFurigana(textOrJson) {
  try {
    const arr = JSON.parse(textOrJson);
    if (Array.isArray(arr)) {
      return renderFurigana(arr);
    }
  } catch (e) {
    // 不是 JSON 就跳過
  }
  return textOrJson;
}

// ========= 側邊欄開關 =========
const toggleBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
sidebar.classList.remove('show');
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('show');
});


// ========= 共用同一個箭頭標記 =========
function insertGlobalNoteMarker() {
  if (document.getElementById('global-note-marker')) return; // 已經插入就跳過

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("style", "height:0;width:0;position:absolute");
  svg.innerHTML = `
        <defs>
            <marker id="global-note-arrowhead" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#c8a98b" />
            </marker>
        </defs>
    `;
  svg.id = 'global-note-marker';
  document.body.appendChild(svg);
}
let currentPage = 1;
let isLoading = false;
let maxpage = 1;
const container = document.getElementById('word-list');

// 左側
const categoryList = document.getElementById('category-list');
// 先建立一張大表
const table = document.createElement("table");
table.className = "table-jp";
const tbody = document.createElement("tbody");
table.appendChild(tbody);
container.appendChild(table);

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
let batchCounter = 0;
function appendVocabRows(data, columns = 3, caption = "",item) {
  const batchIndex = batchCounter++;
  const container = document.getElementById("word-list");

  const section = document.createElement('section');
  section.id = `section-${batchIndex}`;
  section.dataset.batch = batchIndex;

  const table = document.createElement("table");
  table.className = "table-jp";

  if (caption) {
    const cap = createCaption(caption, batchIndex,item);
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


function createCaption(captionText, batchIndex,item) {
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


// 第一次自動載入
loadNextVocabPage();

// Infinite scroll
window.addEventListener('scroll', () => {
  const bottomReached = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (bottomReached) {
    loadNextVocabPage();
  }
});
function loadNextVocabPage() {
  if (isLoading) return;
  isLoading = true;
  if (currentPage > maxpage) {
    return;
  }
  const script = document.createElement('script');
  script.src = `${files}vocabData/vocab-data-${currentPage}.js`;

  script.onload = () => {
    const pageData = window[`vocabData${currentPage}`];
    if (pageData) {
      if (pageData.tables) {
        pageData.tables.forEach(table => {
          if (table.header) {
            const batchIndex = batchCounter++;
            if (table.caption) {
              createCaption(table.caption, batchIndex,table);
            }
            // 1️⃣ 用 renderTable 生成完整 HTML
            const tableHTML = renderTagged(renderTable(table), table); // 如果需要，可以傳 item 或 table

            // 2️⃣ 用 wrapper 包起來
            const wrapper = document.createElement('div');
            wrapper.innerHTML = tableHTML;

            const section = document.createElement('section');
            section.id = `section-${batchIndex}`;
            section.dataset.batch = batchIndex;
            // 3️⃣ 放到 section，再放到 container
            section.appendChild(wrapper);
            container.appendChild(section);

          }
          else {
            const rows = table.rows || [];
            const columns = table.columns || 3;
            appendVocabRows(rows, columns, table.caption,table);  // 可以順便傳 caption
          }
        });
      }
      currentPage++;
      isLoading = false;
    } else {
      console.warn('No more data');
      isLoading = false;
    }
  };

  script.onerror = () => {
    console.error('Failed to load vocab page');
    isLoading = false;
  };

  document.body.appendChild(script);
}


// ========= 側邊欄開關 =========
const toggleBtn = document.getElementById('toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
sidebar.classList.remove('show');
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('show');
});


// ========= 滾動監聽，滾動到底部時載入下一批 =========
container.addEventListener('scroll', () => {
  if (container.scrollTop + container.clientHeight >= container.scrollHeight - 200) {
    loadNextVocabPage();
  }
});

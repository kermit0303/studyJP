
// ========= 核心渲染函式 =========
function renderFurigana(jpArr) {
    return jpArr.map(token => {
        let k = token.k;

        if (token.f) {
            return `<ruby><rb>${k}</rb><rt>${token.f}</rt></ruby>`;
        } else {
            return k;
        }
    }).join('');
}

function renderTagged(text, item) {
    if (typeof text !== 'string') return text;

    let expanded = text.replace(/\[(\w+)\]/g, (_, key) => {
        if (!item || !(key in item)) return `[${key}]`;
        const v = item[key];

        if (Array.isArray(v)) {
            let first = true; // ⬅️ 宣告在外層
            const inner = v.map(val => {
                let str = "";
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) {
                        if (!first) str += "<br>"; // 第二組之後才換行
                        first = false;
                        str += renderFurigana(parsed);
                        return str;
                    }
                } catch (e) {
                    // 可改成 span 避免多餘換行
                    return `<div>${val}</div>`;
                }
                return `<div>${val}</div>`;
            }).join('');

            return `<span class="option-box">${inner}</span>`;
        }

        if (typeof v === 'string' || typeof v === 'number') {
            return String(v);
        }

        return `[${key}]`;
    });

    return renderTaggedText(expanded, item);
}

function renderTaggedText(text, item = {}) {
    if (typeof text !== 'string') return text;
    return parseTaggedText(text, item);
}

function parseTaggedText(str, item = {}) {
    const tagRegex = /\[\[([\w-]+)\|/g;
    let result = '';
    let i = 0;

    while (i < str.length) {
        tagRegex.lastIndex = i;
        const match = tagRegex.exec(str);
        if (!match) {
            result += str.slice(i);
            break;
        }

        const start = match.index;
        const cls = match[1];

        // 加入標籤前的文字
        result += str.slice(i, start);

        // 找標籤內容
        let depth = 1;
        let j = tagRegex.lastIndex;
        let content = '';
        let insideString = false;

        while (j < str.length) {
            const ch = str[j];
            const nextTwo = str.slice(j, j + 2);

            if (ch === '"') {
                insideString = !insideString;
                content += ch;
                j++;
                continue;
            }

            if (insideString) {
                content += ch;
                j++;
                continue;
            }

            if (nextTwo === '[[') {
                depth++;
                content += '[[';
                j += 2;
            } else if (nextTwo === ']]') {
                depth--;
                if (depth === 0) {
                    j += 2;
                    break;
                } else {
                    content += ']]';
                    j += 2;
                }
            } else {
                content += ch;
                j++;
            }
        }

        var innerParsed = parseTaggedText(content.trim(), item);

        // 渲染對應標籤
        let replaced = '';

        if (cls === "notetop") {
            const final = parseTaggedText(innerParsed, item);
            const keyMatch = innerParsed.match(/^\[\[([\w-]+)\]\]$/);
            const key = keyMatch?.[1];
            const noteVal = key ? item.note?.[key] : null;
            replaced = renderTextWithNote(noteVal ?? final, item);
        } else if (cls === "pitch") {
            try {
                if (innerParsed.startsWith('"') && innerParsed.endsWith('"')) {
                    innerParsed = innerParsed.slice(1, -1);
                }
                const arr = JSON.parse(innerParsed);
                replaced = renderTwoPitch(arr);
            } catch (e) {
                replaced = `<span class="${cls}">解析錯誤</span>`;
            }
        } else if (cls === "pitch-q") {
            try {
                if (innerParsed.startsWith('"') && innerParsed.endsWith('"')) {
                    innerParsed = innerParsed.slice(1, -1);
                }
                const arr = JSON.parse(innerParsed);
                replaced = renderPitchQuestion(arr);
            } catch (e) {
                replaced = `<span class="${cls}">解析錯誤</span>`;
            }
        } else if (cls === "box") {
            try {

                try {
                    if (innerParsed.startsWith('"') && innerParsed.endsWith('"')) {
                        innerParsed = innerParsed.slice(1, -1);
                        const arr = JSON.parse(innerParsed); // 嘗試解析 JSON
                        replaced = `<span class="${cls}">${renderFurigana(arr)}</span>`;      // 是 JSON 就用 renderFurigana
                    }
                    else {
                        replaced = `<span class="${cls}">${innerParsed}</span>`;
                    }
                } catch (e) {
                    // 不是 JSON → 當作普通字串處理
                    replaced = `<span class="${cls}">${innerParsed}</span>`;
                }
            } catch (e) {
                replaced = `<span class="${cls}">解析錯誤</span>`;
            }
        }
        else if (cls === 'blue-underline') {
            // 假設 innerParsed 是 "い|備註文字"
            const [text, note] = innerParsed.split('|');
            if (text.startsWith('"') && text.endsWith('"')) {
                innerParsed = text.slice(1, -1);
                const arr = JSON.parse(innerParsed); // 嘗試解析 JSON
                replaced = `<span class="blue-underline-wrapper">
                <span class="underblue">${renderFurigana(arr)}</span>
                <span class="undernote">${note ?? ''}</span>
                </span>
                `;      // 是 JSON 就用 renderFurigana
            }
            else {
                replaced = `
            <span class="blue-underline-wrapper">
              <span class="underblue">${text}</span>
              <span class="undernote">${note ?? ''}</span>
            </span>
          `;
            }
        }
        else if (cls === "furi") {
            try {
                const fixed = `[${innerParsed}]`;
                const data = JSON.parse(fixed);
                const svg = renderFuriganaSvg(data);
                const wrapper = document.createElement("div");
                wrapper.classList.add("svg-container");
                wrapper.appendChild(svg);
                replaced = wrapper.outerHTML;
            } catch (e) {
                console.error("Furigana JSON 解析錯誤", e);
                replaced = `<span class="error">Furigana 錯誤</span>`;
            }
        } else if (cls === "icon") {
            replaced = `<span class="icon ${innerParsed}"></span>`;
        } else {
            replaced = `<span class="${cls}">${innerParsed}</span>`;
        }

        result += replaced;
        i = j;
    }

    return result;
}

function renderPitchQuestion(kanaArray) {
    if (!Array.isArray(kanaArray) || kanaArray.length === 0) return '';

    const container = document.createElement('div');

    container.style.position = 'relative';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.fontSize = '40px';
    container.style.gap = '50px';
    container.style.marginRight = '30px';

    // 建立文字 span
    kanaArray.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.k;
        span.style.position = 'relative';
        span.style.zIndex = '2';
        container.appendChild(span);
    });

    // 建立 SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '200px';
    svg.style.height = '70px';
    svg.style.overflow = 'visible';
    svg.style.zIndex = '1';
    svg.style.gap = '50px';

    // 建立 marker（箭頭）
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '4.5');
    marker.setAttribute('markerHeight', '3');
    marker.setAttribute('refX', '2.25');  // 放中間（4.5 的一半）
    marker.setAttribute('refY', '1.5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');


    const arrowPath = document.createElementNS(svgNS, 'path');
    arrowPath.setAttribute('d', 'M0,0 L0,3 L4.5,1.5 z');
    arrowPath.setAttribute('fill', '#d9534f');

    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // 繪製線條（微微往上弧度）
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M5,60 Q20,60 35,55 T55,15');
    // path.setAttribute('d', 'M25,90 Q40,90 55,85 T80,30');
    // 起點25,90
    // 控制點60,85（比之前85低，弧度淺）
    // 終點95,75
    // 平滑曲線到120,70

    path.setAttribute('stroke', '#d9534f');
    path.setAttribute('stroke-width', '5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    svg.appendChild(path);
    container.appendChild(svg);

    return container.outerHTML;
}

function renderTwoPitch(kanaArray) {
    if (!Array.isArray(kanaArray) || kanaArray.length !== 2) return '';

    const container = document.createElement('div');
    container.className = 'containerup';
    container.style.position = 'relative';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.fontSize = '4rem';
    container.style.gap = '50px';

    // 建立文字 span
    kanaArray.forEach(item => {
        const span = document.createElement('span');
        span.textContent = item.k;
        span.style.position = 'relative';
        span.style.zIndex = '2';
        container.appendChild(span);
    });

    // 建立 SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '200px';  // 固定寬度
    svg.style.height = '100px'; // 固定高度
    svg.style.overflow = 'visible';
    svg.style.zIndex = '1';

    const polyline = document.createElementNS(svgNS, 'polyline');

    // 前後字高低轉換，直接用固定座標
    let points;
    if (kanaArray[0].p === 'H' && kanaArray[1].p === 'L') {
        points = '25,20 95,20 95,95 165,95'; // 前高後低
    } else if (kanaArray[0].p === 'L' && kanaArray[1].p === 'H') {
        points = '25,90 95,90 95,20 165,20'; // 前低後高
    } else {
        points = '25,50 95,50 165,50'; // 同高或同低，畫中線
    }

    polyline.setAttribute('points', points);
    polyline.setAttribute('stroke', '#a12824ff');
    polyline.setAttribute('stroke-width', '5');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(polyline);
    container.appendChild(svg);

    return container.outerHTML;
}

function renderTextWithNote(noteText, item) {
    let content;
    //renderFurigana(d.jp), item);
    if (Array.isArray(noteText)) {
        content = renderTagged(renderFurigana(noteText), item);  // 假名顯示
    } else {
        content = noteText;  // 純文字顯示
    }

    return `
        <span class="note-top">
            <div class="note-box-top">${content}</div>
            <svg class="note-arrow" xmlns="http://www.w3.org/2000/svg">
                <line x1="15" y1="-60" x2="-10" y2="-40"
                    stroke="#c8a98b"
                    stroke-width="2"
                    marker-end="url(#global-note-arrowhead)" />
            </svg>
        </span>
    `;
}

function renderFuriganaSvg(data) {
    const svgNS = "http://www.w3.org/2000/svg";
    const kanaFontSize = 30;
    const kanjiFontSize = 40;
    const kanaCharWidth = kanaFontSize; // 每個假名寬度估算
    const spacingPadding = 3;
    const spacingPaddingKani = 15;
    const kanaYOffset = kanaFontSize - 10; // 讓 kana 不會超出上邊
    const kanjiYOffset = 65;

    // 計算總寬度
    let svgWidth = 20;
    data.forEach(item => {
        const kana = item.f || "";
        svgWidth += kana.length * kanaCharWidth + spacingPadding;
    });
    svgWidth += 20;

    // 建立 SVG 元素
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", 80);
    svg.style.verticalAlign = "top";

    const group = document.createElementNS(svgNS, "g");

    let kanaX = 10;
    let kanjiX = 10;

    // 拆解第一個 kana
    const first = data[0];
    const fKana = first.f || "";
    const fKanaArr = [...fKana];

    // 繪製假名與漢字
    data.forEach(item => {
        const kana = item.f || "";
        const kanji = item.k || "";
        const kanaWidth = kana.length * kanaCharWidth;

        if (kana) {
            const kanaText = document.createElementNS(svgNS, "text");
            kanaText.setAttribute("x", kanaX);
            kanaText.setAttribute("y", kanaYOffset);
            kanaText.setAttribute("class", "kana");
            kanaText.textContent = kana;
            group.appendChild(kanaText);
        }

        if (kanji) {
            const kanjiText = document.createElementNS(svgNS, "text");
            kanjiText.setAttribute("x", kanjiX);
            kanjiText.setAttribute("y", kanjiYOffset);
            kanjiText.setAttribute("class", "kanji");
            kanjiText.textContent = kanji;
            group.appendChild(kanjiText);
        }

        kanaX += kanaWidth + spacingPadding;
        kanjiX += kanaWidth + spacingPaddingKani;
    });

    // 框住第一個 kana 最後一個字 + 下一個元素（如「う」+「ん」）
    if (fKanaArr.length > 0 && data.length >= 2) {
        const lastKanaIndex = fKanaArr.length - 1;
        const boxStartX = 10 + lastKanaIndex * kanaCharWidth;
        const nextKana = data[1].f || "　";
        const nextKanaWidth = [...nextKana].length * kanaCharWidth + 10;
        const boxEndX = boxStartX + kanaCharWidth + nextKanaWidth;

        const path = document.createElementNS(svgNS, "path");
        const d = `
            M ${boxStartX} -10
            H ${boxEndX + spacingPaddingKani}
            V 70
            H ${boxStartX + kanaCharWidth + spacingPaddingKani}
            V ${kanaYOffset + 5}
            H ${boxStartX}
            Z
        `;
        path.setAttribute("d", d.trim());
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#b19f89");
        path.setAttribute("stroke-width", "2");
        group.appendChild(path);
    }

    svg.appendChild(group);
    return svg;
}
function renderTable(data) {
    const cls = data.class || "table-jp";
    const caption = data.caption ? `<caption>${data.caption}</caption>` : "";

    // 如果有設定 col 寬度
    const colgroup = Array.isArray(data.col)
        ? `<colgroup>${data.col.map(c => `<col style="width:${c};">`).join("")}</colgroup>`
        : "";

    const header = data.header?.length
        ? `<thead><tr>${data.header.map(h => `<th>${renderCell(h)}</th>`).join("")}</tr></thead>`
        : "";

    const body = data.rows.map(row =>
        `<tr>${row.map(cell => `<td>${renderCell(cell)}</td>`).join("")}</tr>`
    ).join("");

    return `<table class="${cls}">${caption}${colgroup}${header}<tbody>${body}</tbody></table>`;
}

function renderCell(cell) {
    // 空值處理
    if (cell == null) return "";

    // 如果是字串，先嘗試判斷是否為 JSON
    if (typeof cell === "string") {
        const trimmed = cell.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            try {
                const parsed = JSON.parse(trimmed);
                return renderCell(parsed); // 再遞迴一次，交給物件/陣列處理
            } catch (e) {
                // 不是合法 JSON → 當成標記字串處理
                return renderTagged(cell);
            }
        }
        // 純文字或標記字串
        return renderTagged(cell);
    }

    // 如果是 {k,f} 的物件
    if (typeof cell === "object" && "k" in cell) {
        return renderFurigana([cell]);
    }

    // 如果是 [{k,f}, ...] 陣列
    if (Array.isArray(cell) && cell.length && typeof cell[0] === "object" && "k" in cell[0]) {
        return renderFurigana(cell);
    }
    // 其他 → 強制轉字串
    return String(cell);
}
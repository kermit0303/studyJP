function addRow() {
  const table = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
  const row = table.insertRow();
  const cell1 = row.insertCell(0);
  const cell2 = row.insertCell(1);
  cell1.className = "menu-col";
  cell2.className = "price-col";
  cell1.innerHTML = '<input type="text" placeholder="菜名">';
  cell2.innerHTML = '<input type="text" placeholder="金額">';
}

function exportExcel() {
  const title = document.getElementById("menuTitle").value.trim() || "菜單";

  // 整理資料
  const rows = [["菜單", "金額"]];
  const tbody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
  for (let r of tbody.rows) {
    const menu = r.cells[0].querySelector("input").value;
    const price = r.cells[1].querySelector("input").value;
    rows.push([menu, price]);
  }

  const ws_data = [];
  ws_data.push([title]);      // 第一列：標題（將來會合併 A1:B1）
  ws_data.push(["菜單", "金額"]); // 第二列：欄位名稱
  ws_data.push(...rows.slice(1)); // 後續列資料

  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // 合併 A1:B1 作為標題
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

  // 欄寬設定（可選）
  ws["!cols"] = [{ wch: 30 }, { wch: 15 }];

  // 套用邊框樣式
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 0; R <= range.e.r; ++R) {
    for (let C = 0; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cell_address]) continue;

      ws[cell_address].s = {
        border: {
          top:    { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left:   { style: "thin", color: { rgb: "000000" } },
          right:  { style: "thin", color: { rgb: "000000" } },
        },
        alignment: {
          horizontal: "center",
          vertical: "center"
        }
      };

      // 第一列加粗
      if (R === 0) {
        ws[cell_address].s.font = { bold: true, sz: 14 };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "菜單");
  XLSX.writeFile(wb, `${title}.xlsx`);
}

demo.tables ||= {};
demo.forms ||= {};
const basePersistDemo = persistDemo;
let saveQueue = Promise.resolve();
persistDemo = function () {
  basePersistDemo();
  if (location.protocol.startsWith("http")) {
    const snapshot = JSON.stringify({state: demo});
    saveQueue = saveQueue.then(async () => {
      const response = await fetch("/api/demo-state", {method:"POST",
        headers:{"Content-Type":"application/json"}, body:snapshot});
      if (!response.ok) throw new Error("服务端保存失败");
    }).catch(error => showToast(error.message));
  }
};

function pageKey() {
  return [state.top, state.group, state.page].join("/");
}
function tableKey(title) {
  return pageKey() + "/" + title.replace(/<[^>]*>/g, "").trim();
}
const baseTable = table;
table = function (title, headers, rows) {
  const key = tableKey(title);
  const model = demo.tables[key] ||= {headers:[...headers], rows:structuredClone(rows)};
  const current = model.custom ? model.rows : rows;
  model.rows = structuredClone(current);
  const html = baseTable(title, headers, current);
  return html.replace('<table>', '<table data-model="' + textHtml(key) + '">');
};

let editingTableKey;
let editingRowIndex;
function editTableRecord(button, create = false) {
  const tableElement = button?.closest("table") || document.querySelector("#content table[data-model]");
  if (!tableElement) return editPageForm();
  editingTableKey = tableElement.dataset.model;
  const model = demo.tables[editingTableKey];
  editingRowIndex = create ? -1 : [...tableElement.tBodies[0].rows].indexOf(button.closest("tr"));
  const row = create ? [] : model.rows[editingRowIndex];
  const fields = model.headers.filter(header => header !== "操作");
  openModal('<h2>' + (create ? "新增" : "编辑") + '</h2><div class="modalForm">' +
    fields.map((field, index) => '<label>' + textHtml(field) +
      '<input data-record-field="' + index + '" value="' + textHtml(row[index] ?? "") + '"></label>').join("") +
    '</div><div class="modalActions"><button class="btn" data-close-modal="1">取消</button>' +
    '<button class="btn primary" onclick="saveTableRecord()">保存</button></div>');
}
function saveTableRecord() {
  const model = demo.tables[editingTableKey];
  const values = [...document.querySelectorAll("[data-record-field]")].map(input => textHtml(input.value));
  if (!values[0]?.trim()) { showToast("请填写首项名称或编号"); return; }
  if (model.headers.at(-1) === "操作") {
    values.push(editingRowIndex >= 0 ? model.rows[editingRowIndex].at(-1) : "查看");
  }
  if (editingRowIndex < 0) model.rows.push(values);
  else model.rows[editingRowIndex] = values;
  model.custom = true;
  persistDemo();
  closeModal();
  render();
  showToast("已保存");
}
openCreateModal = () => editTableRecord(null, true);
openEditModal = (action, button) => editTableRecord(button);
deleteRow = function (button) {
  const row = button.closest("tr");
  const tableElement = row.closest("table");
  const key = tableElement.dataset.model;
  if (!key) return;
  editingTableKey = key;
  editingRowIndex = [...tableElement.tBodies[0].rows].indexOf(row);
  openModal('<h2>删除记录</h2><p class="modalText">' + textHtml(row.cells[0].textContent) +
    '</p><div class="modalActions"><button class="btn" data-close-modal="1">取消</button>' +
    '<button class="btn red" onclick="confirmTableDelete()">确认删除</button></div>');
};
function confirmTableDelete() {
  const model = demo.tables[editingTableKey];
  model.rows.splice(editingRowIndex, 1);
  model.custom = true;
  persistDemo();
  closeModal();
  render();
  showToast("记录已删除");
}

simulateQuery = function () {
  const selections = [...document.querySelectorAll("#content .filters select")].filter(select => select.value);
  document.querySelectorAll("#content tbody tr").forEach(row => {
    row.hidden = !selections.every(select => row.textContent.includes(select.value));
  });
  showToast("查询完成");
};
resetControls = function () {
  document.querySelectorAll("#content .filters select").forEach(select => select.value = "");
  document.querySelectorAll("#content tbody tr").forEach(row => row.hidden = false);
};

function editPageForm() {
  const fields = [...document.querySelectorAll("#content .field input, #content .field select, #content .field textarea")];
  if (!fields.length) { showToast("请进入明细页面添加记录"); return; }
  fields[0].focus();
  fields[0].scrollIntoView({block:"center", behavior:"smooth"});
}
function savePageForm() {
  const fields = [...document.querySelectorAll("#content .field input, #content .field select, #content .field textarea")];
  demo.forms[pageKey()] = fields.map(field => field.value);
  persistDemo();
  showToast("表单已保存");
}

const baseRender = render;
render = function () {
  baseRender();
  const content = document.getElementById("content");
  const savedFields = demo.forms[pageKey()];
  if (savedFields) {
    content.querySelectorAll(".field input, .field select, .field textarea").forEach((field,index) => {
      if (savedFields[index] !== undefined) field.value = savedFields[index];
    });
  }
  content.querySelectorAll(".filters .field").forEach(field => {
    const select = field.querySelector("select");
    if (!select) return;
    const label = field.querySelector("label")?.textContent || "";
    const tableElement = content.querySelector("table");
    const headers = [...(tableElement?.querySelectorAll("thead th") || [])];
    const column = headers.findIndex(header => header.textContent.includes(label));
    const values = column >= 0 ? [...new Set([...tableElement.tBodies[0].rows].map(row => row.cells[column]?.textContent).filter(Boolean))] : [];
    select.innerHTML = '<option value="">全部</option>' +
      values.map(value => '<option>' + textHtml(value) + '</option>').join("");
    select.onchange = simulateQuery;
  });
  content.querySelectorAll("button:not([onclick])").forEach(button => {
    if (["保存","提交","保存草稿","提交审核"].includes(button.textContent.trim())) button.onclick = savePageForm;
  });
  content.querySelectorAll(".tabs button").forEach(button => {
    if (!button.onclick) button.onclick = () => {
      button.parentElement.querySelectorAll("button").forEach(item => item.classList.toggle("active",item === button));
      content.querySelectorAll(".bar").forEach((bar,index) => {
        bar.style.height = (35 + (index * 29 + button.textContent.length * 13) % 120) + "px";
      });
      showToast("当前视图 " + button.textContent);
    };
  });
  content.querySelectorAll(".bars,.donutWrap,.realSankey,.horizontalChart").forEach(chart => {
    const toolbar = document.createElement("div");
    toolbar.className = "chartControls";
    toolbar.innerHTML = '<select aria-label="图表期间"><option>本期</option><option>上期</option></select>';
    const original = [...chart.querySelectorAll(".bar,.hbarFill,.flowPath")].map(element => ({
      element, height:element.style.height, width:element.style.width
    }));
    toolbar.querySelector("select").onchange = event => {
      const prior = event.target.selectedIndex === 1;
      original.forEach(({element,height,width},index) => {
        if (height) element.style.height = prior ? parseFloat(height) * .8 + "px" : height;
        if (width) element.style.width = prior ? parseFloat(width) * .8 + "%" : width;
        if (element.classList.contains("flowPath")) element.style.strokeWidth = prior ? "12px" : "";
        const value = element.querySelector("b");
        if (value && height) value.textContent = Math.round(parseFloat(element.style.height) / 2);
      });
      const donut = chart.querySelector(".donut");
      if (donut) donut.style.background = prior
        ? "conic-gradient(#86bc25 0 35%,#008a7a 35% 70%,#2c6aa0 70% 90%,#cbd5e1 90%)" : "";
    };
    chart.before(toolbar);
    chart.querySelectorAll(".bar,.hbarRow,.flowPath,.donut").forEach((element,index) => {
      element.setAttribute("tabindex","0");
      element.style.cursor = "pointer";
      element.onclick = () => openInfoModal("图表明细", element.textContent.trim() ||
        "当前系列 " + (index + 1) + "，可切换期间查看对比");
      element.onkeydown = event => { if(event.key === "Enter") element.click(); };
    });
  });
  content.querySelectorAll(".tree li,.canvas .node").forEach(element => {
    element.tabIndex = 0;
    element.onclick = event => {
      event.stopPropagation();
      openInfoModal("对象详情", element.textContent.trim());
    };
  });
  content.querySelectorAll(".cover").forEach(cover => {
    cover.tabIndex = 0;
    cover.title = "点击预览报告";
    cover.onclick = () => openInfoModal("报告预览", cover.textContent + "\n\n" +
      backendState.calculation.categories.map(row => row.category_name + " " + row.emission_tco2e + " tCO₂e").join("\n"));
  });
};

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

orgSupplyLinkage = function () {
  if (!backendState.ready) return needsBackend();
  return header("") + table("供应商任务关联明细", ["供应商","数据对象","范围三任务","数量","单位","排放量(tCO₂e)","状态","操作"],
    supplyScope3Items.map((row,index) => [row.supplier,row.part,row.task,row.qty,row.unit,
      formatEmission(row.total),row.sync,
      `<button class="btn" onclick="editDemoSupplier(${index})">查看 / 更新</button>`]));
};

supplierTask = purchase;
document.addEventListener("click", event => {
  const downloadButton = event.target.closest("button");
  if (downloadButton?.textContent.trim() === "下载") {
    const row = downloadButton.closest("tr");
    if (!row) return;
    const blob = new Blob([row.innerText], {type:"text/plain;charset=utf-8"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "明细.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),1000);
  }
});

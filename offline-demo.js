const storageKey = "deloitte-carbon-petro-v1";
let savedDemoData;
try {
  savedDemoData = JSON.parse(localStorage.getItem(storageKey));
} catch {
  savedDemoData = null;
}
const demo = savedDemoData || structuredClone(demoSeed);
const demoOrg = "德勤中国 / ESG管理部";
const demoPeriod = "2026-07";

function persistDemo() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(demo));
  } catch {
    // The current session remains usable when file storage is unavailable.
  }
}

function demoCalculate(standardCode, org, period) {
  const standard = demo.standards.find(row => row.code === standardCode);
  const matches = row => (!org || row.org === org) && (!period || row.period === period);
  const detail = demo.records.filter(matches).flatMap(row => {
    const factor = demo.factors.find(item => item.id === row.factor_id);
    const gwp = demo.gwp.find(item => item.standard_code === standardCode && item.gas === row.gas && Number(item.horizon) === 100);
    if (!factor || !gwp) return [];
    return [{...row, factor_value: factor.factor_value, gwp_value: gwp.value,
      standard_adjustment: standard.adjustment, emission_tco2e: row.activity_value * factor.factor_value * gwp.value * standard.adjustment}];
  });
  if (matches({org: demoOrg, period: demoPeriod})) {
    detail.push(...supplyScope3Items.filter(row => row.status === "已收集").map(row => ({
      org: demoOrg, period: demoPeriod, category_code: row.category, source_name: row.supplier + " / " + row.part,
      activity_value: row.qty, activity_unit: row.unit, factor_value: row.unitCarbon / 1000,
      gwp_value: 1, standard_adjustment: 1, emission_tco2e: row.total
    })));
  }
  const total_emission = detail.reduce((sum, row) => sum + row.emission_tco2e, 0);
  const categories = demo.categories.flatMap(category => {
    const rows = detail.filter(row => row.category_code === category.code);
    if (!rows.length) return [];
    const emission_tco2e = rows.reduce((sum, row) => sum + row.emission_tco2e, 0);
    return [{category_code: category.code, category_name: category.name,
      emission_tco2e: +emission_tco2e.toFixed(4), share: total_emission ? +(emission_tco2e / total_emission * 100).toFixed(2) : 0}];
  });
  return {standard, total_emission: +total_emission.toFixed(4), categories, detail};
}

api = async function (path, options = {}) {
  const url = new URL(path, "https://demo.invalid");
  const name = url.pathname.split("/").pop();
  if (name === "bootstrap") return demo;
  if (name === "calculate") {
    return demoCalculate(url.searchParams.get("standard"), url.searchParams.get("org"), url.searchParams.get("period"));
  }
  const row = JSON.parse(options.body || "{}");
  const collection = demo[name];
  if (options.method !== "POST" || !Array.isArray(collection)) throw new Error("演示操作不可用");
  let report;
  if (name === "records") {
    const source = demo.sources.find(item => item.id === row.source_id);
    if (!source || !String(row.activity_value).trim() || !Number.isFinite(+row.activity_value) || +row.activity_value < 0) {
      throw new Error("请选择排放源并填写有效的活动数据");
    }
    Object.assign(row, {factor_id: source.default_factor_id, source_name: source.name, activity_value: +row.activity_value});
  }
  if (name === "reports") {
    report = demoCalculate(row.standard_code, row.org, row.period);
    row.total_emission = report.total_emission;
    row.content_json = JSON.stringify(report);
  }
  if (name === "formulas") row.enabled = 1;
  if (name === "factors") row.year = 2026;
  const existing = name === "substances" && collection.find(item => item.gas === row.gas);
  row.id = existing ? existing.id : Math.max(0, ...collection.map(item => item.id)) + 1;
  row.created_at = new Date().toISOString();
  if (existing) Object.assign(existing, row);
  else collection.unshift(row);
  persistDemo();
  return {ok: true, id: row.id, report};
};

supplyScope3Items[1].unitCarbon = 9200;
supplyScope3Items[2].unitCarbon = 87;
supplyScope3Items[3].unitCarbon = 113;
supplyScope3Items.splice(0, supplyScope3Items.length, ...(demo.supplierRows || [...supplyScope3Items]));

purchase = function () {
  const rows = supplyScope3Items.map((row, index) => [
    row.supplier, row.part, row.task, row.qty, row.unit, row.unitCarbon, row.status,
    `<button class="btn" onclick="editDemoSupplier(${index})">${row.status === "已收集" ? "查看 / 更新" : "填报 / 审核"}</button>`
  ]);
  return header("供应商数据收集") + table("供应商填报任务", ["供应商","采购件 / 活动","范围三任务","数量","单位","kgCO₂e / 单位","状态","操作"], rows);
};

function editDemoSupplier(index) {
  const row = supplyScope3Items[index];
  openModal(`<h2>${row.supplier} · ${row.part}</h2>
    <div class="modalForm">
      <label>数量（${row.unit}）<input id="demoSupplierQuantity" type="number" min="0" step="any" value="${row.qty}"></label>
      <label>单位碳排（kgCO₂e / ${row.unit}）<input id="demoSupplierCarbon" type="number" min="0" step="any" value="${row.unitCarbon}"></label>
    </div><div class="modalActions">
      <button class="btn" onclick="saveDemoSupplier(${index},false)">提交待审</button>
      <button class="btn primary" onclick="saveDemoSupplier(${index},true)">审核通过</button>
    </div>`);
}

async function saveDemoSupplier(index, approved) {
  const quantity = document.getElementById("demoSupplierQuantity").value;
  const carbon = document.getElementById("demoSupplierCarbon").value;
  if (!quantity || !carbon || !Number.isFinite(+quantity * +carbon) || +quantity < 0 || +carbon < 0) {
    showToast("请填写有效的数量和单位碳排");
    return;
  }
  Object.assign(supplyScope3Items[index], {qty: +quantity, unitCarbon: +carbon, total: quantity * carbon / 1000,
    status: approved ? "已收集" : "待审核", sync: approved ? "已自动关联" : "待审核后关联"});
  demo.supplierRows = supplyScope3Items;
  persistDemo();
  await loadBackendData();
  closeModal();
  render();
  showToast(approved ? "已关联到对应的范围三任务" : "已提交待审核");
}

renderScope3CollectionNew = function () {
  if (!backendState.ready) return needsBackend();
  const taskRows = demo.categories.map(category => {
    const code = category.code;
    const suppliers = supplyScope3Items.filter(row => row.category === code);
    const linked = suppliers.filter(row => row.status === "已收集");
    const records = demo.records.filter(row => row.category_code === code);
    const names = linked.map(row => row.supplier + " / " + row.part).join("、");
    const action = suppliers.length
      ? '<button class="btn" onclick="go(\'供应链碳排放\',\'采购件碳排放填报\')">查看来源</button>'
      : `<button class="btn" onclick="editDemoScope3('${code}')">填报</button>`;
    return ["T-S3-" + code, code + " " + category.name, suppliers.length ? "供应商数据收集" : "组织填报",
      names || (records.length ? records.length + " 条记录" : "—"),
      suppliers.some(row => row.status !== "已收集") ? "待补充" : linked.length || records.length ? "已提交" : "待提交", action];
  });
  return header("") + table(`范围三填报任务明细 ${assistButton("scope3")}`,
    ["任务编号","类别","来源","已填报数据","状态","操作"], taskRows);
};

const originalOrgDataEntry = orgDataEntry;
const directTasks = petroDirectTasks();
demo.directEntries ||= {};

orgDataEntry = function () {
  const scope = {"范围一填报":1, "范围二填报":2}[state.page];
  if (!scope) return originalOrgDataEntry();
  const rows = directTasks.filter(task => task.id.startsWith("T-S" + scope)).map(task => {
    const entry = demo.directEntries[task.id];
    return [task.id, task.org, task.name, demoPeriod, entry?.activity ?? "—", task.unit,
      textHtml(entry?.evidence || "—"), entry?.status || "待提交",
      `<button class="btn" onclick="editDemoDirect('${task.id}')">填报</button>`];
  });
  return header("") + table(`${state.page}任务明细 ${assistButton("scope" + scope)}`,
    ["任务编号","组织","排放源","期间","活动数据","单位","凭证","状态","操作"], rows);
};

function editDemoDirect(id) {
  const task = directTasks.find(row => row.id === id);
  const entry = demo.directEntries[id];
  openModal(`<h2>${task.name}</h2><p class="desc">${task.org} · ${demoPeriod}</p>
    <div class="modalForm">
      <label>活动数据（${task.unit}）<input id="demoDirectActivity" type="number" min="0" step="any" value="${entry?.activity ?? ""}"></label>
      <label>凭证编号<input id="demoDirectEvidence" value="${textHtml(entry?.evidence || "")}"></label>
    </div><div class="modalActions">
      <button class="btn" onclick="saveDemoDirect('${id}',false)">保存草稿</button>
      <button class="btn primary" onclick="saveDemoDirect('${id}',true)">提交审核</button>
    </div>`);
}

function saveDemoDirect(id, submitted) {
  const activity = document.getElementById("demoDirectActivity").value;
  const evidence = document.getElementById("demoDirectEvidence").value.trim();
  if (!activity || !Number.isFinite(+activity) || +activity < 0 || (submitted && !evidence)) {
    showToast("请填写有效的活动数据，提交时请填写凭证编号");
    return;
  }
  demo.directEntries[id] = {activity:+activity, evidence, status:submitted ? "待审核" : "草稿"};
  persistDemo();
  closeModal();
  render();
  showToast(submitted ? "已提交审核" : "草稿已保存");
}

function editDemoScope3(category) {
  const sources = sourceRowsFor(category);
  openModal(`<h2>${categoryName(category)}</h2><div class="modalForm">
    <label>排放源<select id="demoSource">${optionList(sources,"id","name","")}</select></label>
    <label>活动数据<input id="demoActivity" type="number" step="any" min="0"></label>
    <label>凭证编号<input id="demoEvidence"></label>
    </div><div class="modalActions"><button class="btn primary" onclick="submitDemoScope3()">保存</button></div>`);
}

async function submitDemoScope3() {
  const source = demo.sources.find(row => row.id === Number(document.getElementById("demoSource").value));
  if (!source) { showToast("请选择排放源"); return; }
  const factor = demo.factors.find(row => row.id === source.default_factor_id);
  try {
    await api("/api/records", {method:"POST", body: JSON.stringify({
      org: demoOrg, period: demoPeriod, source_id: source.id, category_code: source.category_code,
      activity_value: document.getElementById("demoActivity").value, activity_unit: source.activity_unit,
      evidence: document.getElementById("demoEvidence").value, gas: factor?.gas || "CO2"
    })});
    await loadBackendData();
    closeModal();
    render();
    showToast("填报数据已保存");
  } catch (error) {
    showToast(error.message);
  }
}

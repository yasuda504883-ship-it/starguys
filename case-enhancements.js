if (typeof caseTypeOrder !== "undefined" && !caseTypeOrder.includes("店内撮影")) {
  const insertAt = Math.max(caseTypeOrder.indexOf("トップグラビア") + 1, 0);
  caseTypeOrder.splice(insertAt, 0, "店内撮影");

  const caseTypeSelect = document.getElementById("caseType");
  if (caseTypeSelect) {
    const current = caseTypeSelect.value;
    caseTypeSelect.innerHTML = caseTypeOrder.map((value) => `<option>${value}</option>`).join("");
    caseTypeSelect.value = caseTypeOrder.includes(current) ? current : "ホスト特集";
  }

  if (typeof render === "function") render();
}

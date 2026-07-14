(() => {
  const areaListElement = document.getElementById("areaList");
  if (!areaListElement || typeof window.getStarGuysStoreLink !== "function") return;

  const style = document.createElement("style");
  style.textContent = `
    .store-link-row { display: flex; gap: 7px; margin-top: 7px; }
    .star-guys-link { display: inline-flex; align-items: center; width: auto; min-height: 30px; padding: 0 10px; border-radius: 9px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 800; text-decoration: none; border: 1px solid #bfdbfe; }
    .star-guys-link.is-area { background: #f9fafb; color: #4b5563; border-color: #e5e7eb; }
    .star-guys-link:hover { opacity: .8; }
  `;
  document.head.appendChild(style);

  function attachLinks() {
    areaListElement.querySelectorAll(".store-card").forEach((card) => {
      if (card.querySelector(".star-guys-link")) return;
      const main = card.querySelector(".store-main");
      const name = main?.querySelector("strong")?.textContent?.trim();
      const smallText = main?.querySelector("small")?.textContent || "";
      const area = smallText.split(" / ")[0].trim();
      if (!name || !area) return;

      const linkInfo = window.getStarGuysStoreLink(area, name);
      const row = document.createElement("div");
      row.className = "store-link-row";
      row.innerHTML = `<a class="star-guys-link ${linkInfo.exact ? "" : "is-area"}" href="${linkInfo.url}" target="_blank" rel="noopener noreferrer">${linkInfo.exact ? "STAR GUYS店舗ページ" : "STAR GUYSエリア一覧"}</a>`;
      main.appendChild(row);
    });
  }

  new MutationObserver(attachLinks).observe(areaListElement, { childList: true, subtree: true });
  attachLinks();
})();

// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
import "./theme";
import "./menu";
import { calculatePath } from "./rank";
import type { PathStrategy } from "./rank-rules";
import { loadConfig, saveConfig } from "./settings";

const input = document.querySelector<HTMLInputElement>("#rank")!;
const select = document.querySelector<HTMLSelectElement>(
  "select[name=strategy]",
)!;
const result = document.querySelector<HTMLElement>("#result")!;
const rowTemplate = document.querySelector<HTMLTemplateElement>("#path-step")!;
const alertTemplate =
  document.querySelector<HTMLTemplateElement>("#result-alert")!;
let strategy: PathStrategy = loadConfig().strategy ?? "efficient";
let rank: number | null = null;
let composing = false;
let timer: ReturnType<typeof setTimeout>;

function alert(message: string) {
  const fragment = alertTemplate.content.cloneNode(true) as DocumentFragment;
  fragment.querySelector("span")!.textContent = message;
  result.replaceChildren(fragment);
}

function render() {
  try {
    const path = rank === null ? [] : calculatePath(rank, strategy);
    if (!path.length) {
      result.replaceChildren();
      return;
    }
    const list = result.querySelector("ol") ?? document.createElement("ol");
    list.className = "rank-path";
    for (let index = 0; index <= path.length; index++) {
      const step = path[index];
      const current = step
        ? step.currentRank
        : strategy === "target-second"
          ? 2
          : 1;
      const tone =
        index < 6
          ? "primary"
          : path.length >= 11 && index < 11
            ? "secondary"
            : "";
      const key = `${current}:${step?.nextRankRange.join(",") ?? ""}:${tone}`;
      const existing = list.children[index] as HTMLLIElement | undefined;
      // Keep unchanged rows: rebuilding 139 rows exceeded the throttled update budget.
      if (existing?.dataset.step === key) continue;
      const fragment = rowTemplate.content.cloneNode(true) as DocumentFragment;
      const row = fragment.querySelector("li")!;
      row.dataset.step = key;
      row.dataset.content = index === 0 ? "📌" : String(index);
      if (tone) row.classList.add(tone);
      fragment.querySelector(".rank-number")!.textContent = `${current}位`;
      const range = fragment.querySelector(".rank-range")!;
      if (step) {
        const [max, min] = step.nextRankRange;
        range.append(`${max === min ? `${max}位` : `${min}位 〜 ${max}位`})`);
      } else range.remove();
      if (existing) existing.replaceWith(fragment);
      else list.append(fragment);
    }
    while (list.children.length > path.length + 1)
      list.lastElementChild!.remove();
    if (!list.isConnected) result.replaceChildren(list);
  } catch (error) {
    alert(`エラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function schedule() {
  clearTimeout(timer);
  if (composing) return;
  timer = setTimeout(() => {
    rank = input.validity.valid ? Number(input.value.normalize("NFKC")) : null;
    render();
  }, 200);
}
input.addEventListener("input", schedule);
input.addEventListener("compositionstart", () => {
  composing = true;
  clearTimeout(timer);
});
input.addEventListener("compositionend", () => {
  composing = false;
  schedule();
});
select.value = strategy;
select.addEventListener("change", () => {
  strategy = select.value as PathStrategy;
  render();
  saveConfig({ strategy });
});
document
  .querySelector("form")!
  .addEventListener("submit", (event) => event.preventDefault());

// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
const trigger = document.querySelector<HTMLButtonElement>("#menu-trigger")!;
const menu = document.querySelector<HTMLElement>("#header-menu")!;

if ("showPopover" in HTMLElement.prototype) {
  trigger.hidden = false;
  if (!CSS.supports("position-anchor", "--header-menu-anchor")) {
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      menu.style.top = `${rect.bottom}px`;
      menu.style.left = `${Math.max(0, Math.min(rect.right - 160, innerWidth - 160))}px`;
    };
    menu.addEventListener("beforetoggle", (event) => {
      if ((event as ToggleEvent).newState === "open") {
        position();
        window.addEventListener("resize", position);
        window.addEventListener("scroll", position, true);
      } else {
        window.removeEventListener("resize", position);
        window.removeEventListener("scroll", position, true);
      }
    });
  }
} else {
  menu.removeAttribute("popover");
  menu.classList.add("menu-inline");
}

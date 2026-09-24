// biome-ignore-all lint/style/noNonNullAssertion: Elements are owned by the static HTML/templates.
const trigger = document.querySelector<HTMLButtonElement>("#menu-trigger")!;
const menu = document.querySelector<HTMLElement>("#header-menu")!;
const aboutTrigger =
  document.querySelector<HTMLButtonElement>("#about-trigger")!;
const about = document.querySelector<HTMLDialogElement>("#about-dialog")!;

aboutTrigger.addEventListener("click", () => about.showModal());
about.addEventListener("close", () => {
  (trigger.hidden ? aboutTrigger : trigger).focus();
});
if (!("closedBy" in HTMLDialogElement.prototype)) {
  about.addEventListener("click", (event) => {
    if (event.target !== about) return;
    const rect = about.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      about.close();
    }
  });
}

if ("showPopover" in HTMLElement.prototype) {
  trigger.hidden = false;
  if (!CSS.supports("position-anchor", "--header-menu-anchor")) {
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      const { width, height } = menu.getBoundingClientRect();
      const viewport = document.documentElement;
      menu.style.top = `${Math.max(0, Math.min(rect.bottom, viewport.clientHeight - height))}px`;
      menu.style.left = `${Math.max(0, Math.min(rect.right - width, viewport.clientWidth - width))}px`;
    };
    menu.addEventListener("toggle", (event) => {
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

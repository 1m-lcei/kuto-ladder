import { GithubIcon, MenuIcon, XIcon } from "./SvgIcons";

export function HeaderMenu() {
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-circle header-menu-trigger"
        popoverTarget="header-menu"
        aria-label="メニュー"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <ul
        id="header-menu"
        popover="auto"
        className="dropdown dropdown-end menu w-40 rounded-box bg-base-100 p-2 shadow-sm"
      >
        <li>
          <a href="https://x.com/1m_lcei" target="_blank" rel="noopener noreferrer">
            <XIcon className="w-4 h-4 fill-current" />
            連絡先
          </a>
        </li>
        <li>
          <a
            href="https://github.com/1m-lcei/kuto-ladder"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon className="w-4 h-4 fill-current" />
            Github
          </a>
        </li>
      </ul>
    </>
  );
}

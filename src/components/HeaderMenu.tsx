import { GithubIcon, MenuIcon, XIcon } from "./SvgIcons";

export function HeaderMenu() {
  return (
    <div className="dropdown dropdown-end">
      {/* biome-ignore lint/a11y/useSemanticElements: DaisyUI dropdown implementation requires a div element */}
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <MenuIcon className="h-5 w-5" />
      </div>
      <ul
        tabIndex={-1}
        className="menu dropdown-content bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm"
      >
        <li>
          <a href="https://x.com/1m_lcei" target="_blank" rel="noopener">
            <XIcon className="w-4 h-4 fill-current" />
            連絡先
          </a>
        </li>
        <li>
          <a
            href="https://github.com/1m-lcei/kuto-ladder"
            target="_blank"
            rel="noopener"
          >
            <GithubIcon className="w-4 h-4 fill-current" />
            Github
          </a>
        </li>
      </ul>
    </div>
  );
}

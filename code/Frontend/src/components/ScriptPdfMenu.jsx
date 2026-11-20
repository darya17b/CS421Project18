import { AUDIENCES } from "../pdf/script/layout";

// handles script pdf menu
// A normal button with an invisible native dropdown laid over it, so it looks
// like the button but clicking opens the browser's list of script versions
// (Master, Faculty, SP). Picking one calls onSelect with the audience id.
const ScriptPdfMenu = ({ label, onSelect, className }) => (
  <div className="script-pdf-menu group relative inline-flex">
    <button type="button" className={className} tabIndex={-1} aria-hidden="true">
      {label}
      <span className="ml-1.5 text-xs">▾</span>
    </button>
    <select
      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      value=""
      onChange={(event) => onSelect(event.target.value)}
      aria-label={label}
    >
      <option value="" disabled hidden>{label}</option>
      {Object.entries(AUDIENCES).map(([id, audience]) => (
        <option key={id} value={id}>{audience.label}</option>
      ))}
    </select>
  </div>
);

export default ScriptPdfMenu;

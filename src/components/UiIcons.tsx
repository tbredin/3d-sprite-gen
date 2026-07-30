import {
  MdCasino,
  MdLock,
  MdLockOpen,
  MdOutlinePalette,
} from "react-icons/md";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

const iconClass = "part-icon-glyph";

export function LockIcon({ locked }: { locked: boolean }) {
  const As = locked ? MdLock : MdLockOpen;
  return <As className={iconClass} aria-hidden />;
}

export function DiceIcon() {
  return <MdCasino className={iconClass} aria-hidden />;
}

export function PaletteIcon() {
  return <MdOutlinePalette className="part-color-palette-icon" aria-hidden />;
}

export function CaretIcon({ open }: { open: boolean }) {
  const As = open ? LuChevronDown : LuChevronRight;
  return <As className="collapse-caret-icon" aria-hidden />;
}

import type { UserRole } from "@/types/citytrace";
import { USER_ROLE_LABELS } from "@/types/citytrace";

const SIZE_CLASSES = {
  xs: "h-5 w-5 text-[9.5px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-12 w-12 text-[15px]",
} as const;

export function UserAvatar({
  initials,
  color = "#007AFF",
  size = "sm",
  title,
  className = "",
}: {
  initials: string;
  color?: string;
  size?: keyof typeof SIZE_CLASSES;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      aria-hidden={title ? undefined : true}
      style={{ backgroundColor: color }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_2px_rgba(15,23,42,0.16)] ring-2 ring-white ${SIZE_CLASSES[size]} ${className}`}
    >
      {initials}
    </span>
  );
}

const ROLE_STYLES: Record<UserRole, string> = {
  citizen: "border-[#007AFF]/20 bg-[#007AFF]/[0.08] text-[#0055CC]",
  verifier: "border-[#AF52DE]/25 bg-[#AF52DE]/[0.10] text-[#7C3AED]",
  official: "border-[#FF9500]/25 bg-[#FF9500]/[0.10] text-[#B25000]",
};

export function RolePill({
  role,
  className = "",
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap ${ROLE_STYLES[role]} ${className}`}
    >
      {USER_ROLE_LABELS[role]}
    </span>
  );
}

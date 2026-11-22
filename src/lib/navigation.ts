import {
  AlertTriangle,
  FolderKanban,
  LayoutDashboard,
  Map,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** The six top-level modules of CITYTRACE. Every route resolves. */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    description: "District civic health at a glance",
    icon: LayoutDashboard,
  },
  {
    href: "/city-explorer",
    label: "City Explorer",
    description: "Interactive 3D sector map",
    icon: Map,
  },
  {
    href: "/civic-issues",
    label: "Civic Issues",
    description: "Permanent issue history and recurrence",
    icon: AlertTriangle,
  },
  {
    href: "/public-projects",
    label: "Public Projects",
    description: "Works, authorities and milestones",
    icon: FolderKanban,
  },
  {
    href: "/money-tracker",
    label: "Money Tracker",
    description: "Allocated, reported and verified spend",
    icon: Wallet,
  },
  {
    href: "/ai-investigation",
    label: "AI Investigation",
    description: "Evidence-linked civic findings",
    icon: Sparkles,
  },
];

/** Resolves the nav entry that owns a pathname. */
export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href)
  );
}

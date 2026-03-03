import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  PanelLeft,
  PlusCircle,
  Trophy,
  Users,
  Users2,
  ListOrdered,
  KeyRound,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

// Öffentliche Menüpunkte – immer sichtbar
const publicMenuGroups = [
  {
    label: "Übersicht",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Ranglisten",
    items: [
      { icon: Trophy, label: "Einzelrangliste", path: "/ranking/players" },
      { icon: Users2, label: "Paarungsrangliste", path: "/ranking/pairs" },
      { icon: BarChart3, label: "Statistiken", path: "/statistics" },
    ],
  },
  {
    label: "Spiele",
    items: [
      { icon: ListOrdered, label: "Alle Spiele", path: "/matches" },
    ],
  },
];

// Admin-Menüpunkte – nur für eingeloggte Admins
const adminMenuGroups = [
  {
    label: "Spiele",
    items: [
      { icon: PlusCircle, label: "Spiel erfassen", path: "/matches/new" },
    ],
  },
  {
    label: "Verwaltung",
    items: [
      { icon: Users, label: "Spieler", path: "/players" },
      { icon: CalendarDays, label: "Saisons", path: "/seasons" },
      { icon: KeyRound, label: "Passwort ändern", path: "/admin/change-password" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  // Immer rendern – kein Login-Gate mehr auf Layout-Ebene
  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const isAdmin = user?.role === "admin";

  // Alle sichtbaren Gruppen zusammenstellen
  const visibleGroups = isAdmin
    ? mergeMenuGroups(publicMenuGroups, adminMenuGroups)
    : publicMenuGroups;

  const allItems = visibleGroups.flatMap(g => g.items);
  const activeItem = allItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/50">
          <SidebarHeader className="h-16 justify-center border-b border-border/50">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent/20 rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Navigation umschalten"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <BadmintonIcon className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold tracking-tight truncate text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                    ATSV Badminton
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {visibleGroups.map((group, gi) => (
              <SidebarGroup key={group.label + gi}>
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-xs text-muted-foreground/60 uppercase tracking-widest px-4 py-1">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2">
                  {group.items.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 transition-all font-normal rounded-lg ${isActive ? "bg-primary/10 text-primary" : "hover:bg-accent/10"}`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={isActive ? "text-primary font-medium" : ""}>{item.label}</span>
                          {isActive && !isCollapsed && <ChevronRight className="ml-auto h-3 w-3 text-primary" />}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                {gi < visibleGroups.length - 1 && !isCollapsed && <SidebarSeparator className="my-1 bg-border/30" />}
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/50">
            {isAdmin ? (
              /* Eingeloggt: Benutzer-Dropdown mit Abmelden */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/10 transition-colors w-full text-left focus:outline-none">
                    <Avatar className="h-8 w-8 border border-border/50 shrink-0">
                      <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                        {user?.username?.charAt(0).toUpperCase() ?? "A"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-none text-foreground">{user?.username || "–"}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">Administrator</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Abmelden</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Nicht eingeloggt: Anmelden-Button */
              <button
                onClick={() => setLocation("/login")}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/10 transition-colors w-full text-left focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                </div>
                {!isCollapsed && (
                  <span className="text-sm text-muted-foreground">Admin-Anmeldung</span>
                )}
              </button>
            )}
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="flex flex-col min-h-screen">
        {isMobile && (
          <div className="flex border-b border-border/50 h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-medium text-foreground">{activeItem?.label ?? "ATSV Badminton Liga"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
        <footer className="border-t border-border/30 py-3 px-6 text-center text-xs text-muted-foreground/50">
          Vibecoded in Hamburg with ♥ &nbsp;·&nbsp; Tool:&nbsp;
          <a
            href="https://manus.im/invitation/LLRJFW1UPCDV"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Manus
          </a>
          &nbsp;·&nbsp;
          <a
            href="https://github.com/mursonic/badminton-liga"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub
          </a>
        </footer>
      </SidebarInset>
    </>
  );
}

/** Fügt Admin-Gruppen in die bestehende Struktur ein:
 *  "Spiel erfassen" wird in die bestehende "Spiele"-Gruppe eingefügt,
 *  "Verwaltung" wird als neue Gruppe angehängt. */
function mergeMenuGroups(
  pub: typeof publicMenuGroups,
  admin: typeof adminMenuGroups
) {
  const result = pub.map(g => ({ ...g, items: [...g.items] }));

  for (const adminGroup of admin) {
    const existing = result.find(g => g.label === adminGroup.label);
    if (existing) {
      existing.items.push(...adminGroup.items);
    } else {
      result.push({ ...adminGroup, items: [...adminGroup.items] });
    }
  }
  return result;
}

/** Badminton-Schläger-Icon als SVG */
function BadmintonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Schläger-Kopf (Oval) */}
      <ellipse cx="9" cy="7.5" rx="5.5" ry="6.5" transform="rotate(-35 9 7.5)" />
      {/* Kreuzstreben im Schläger */}
      <line x1="5.5" y1="4.5" x2="12.5" y2="10.5" />
      <line x1="4.5" y1="8" x2="13.5" y2="7" />
      <line x1="6" y1="11" x2="11" y2="4" />
      {/* Griff */}
      <line x1="13" y1="12" x2="20" y2="21" strokeWidth="2.5" />
      {/* Federball-Punkte */}
      <circle cx="3.5" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="22" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="2" cy="22" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

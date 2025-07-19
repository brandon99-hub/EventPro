import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { SearchIcon, MenuIcon, XIcon, UserIcon, CalendarIcon, MapPinIcon, HomeIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface MobileNavProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  currentPath?: string;
}

export function MobileNav({ 
  searchQuery = "", 
  onSearchChange, 
  onSearchSubmit,
  currentPath = "/"
}: MobileNavProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(e);
    }
    setIsOpen(false);
  };

  const navigationItems = [
    { href: "/", label: "Home", icon: HomeIcon, active: currentPath === "/" },
    { href: "/events", label: "Explore Events", icon: MapPinIcon, active: currentPath === "/events" },
    { href: "/calendar", label: "Calendar", icon: CalendarIcon, active: currentPath === "/calendar" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <MenuIcon className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/" onClick={() => setIsOpen(false)}>
                              <span className="text-primary text-2xl font-bold">StarEvents</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <XIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
                placeholder="Search events..."
              />
            </form>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <a className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      item.active 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <img 
                    className="h-10 w-10 rounded-full" 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`} 
                    alt={user.fullName}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link href={user.isAdmin ? "/admin" : "/dashboard"} onClick={() => setIsOpen(false)}>
                    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                      <UserIcon className="h-4 w-4" />
                      {user.isAdmin ? "Admin Dashboard" : "My Dashboard"}
                    </a>
                  </Link>
                </div>
              </div>
            ) : (
              <Link href="/auth" onClick={() => setIsOpen(false)}>
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
} 
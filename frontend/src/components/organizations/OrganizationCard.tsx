"use client";

import Link from "next/link";
import { useAbility } from "@casl/react";
import { Trash2, Pencil, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can, AbilityContext } from "@/lib/casl";
import type { Organization } from "@/api/organizations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OrganizationCardProps {
  org: Organization;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

// Consistent colors mapped from organization ID
const getOrgTheme = (id: string) => {
  const themes = [
    {
      border: "border-t-indigo-500 dark:border-t-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50",
      roleBadge: "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30",
    },
    {
      border: "border-t-sky-500 dark:border-t-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border-sky-100 dark:border-sky-900/50",
      roleBadge: "bg-sky-50/80 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100/50 dark:border-sky-900/30",
    },
    {
      border: "border-t-amber-500 dark:border-t-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-900/50",
      roleBadge: "bg-amber-50/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/30",
    },
    {
      border: "border-t-emerald-500 dark:border-t-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50",
      roleBadge: "bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30",
    },
    {
      border: "border-t-rose-500 dark:border-t-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-100 dark:border-rose-900/50",
      roleBadge: "bg-rose-50/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-100/50 dark:border-rose-900/30",
    },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % themes.length;
  return themes[index] || themes[0];
};

export function OrganizationCard({ org, onEdit, onDelete }: OrganizationCardProps) {
  const ability = useAbility(AbilityContext);
  const canUpdate = ability.can("update", "Organization");
  const canDelete = ability.can("delete", "Organization");
  const hasManagementActions = canUpdate || canDelete;
  
  const theme = getOrgTheme(org.id);
  const initials = org.name.substring(0, 2).toUpperCase();
  const memberCount = org.stats?.memberCount || 1;

  return (
    <div className={`relative group bg-card border-x border-b border-t-4 ${theme.border} border-border rounded-xl p-5 flex flex-col justify-between min-h-[175px] hover:shadow-md hover:border-border transition-all duration-200`}>
      {/* Clickable Card Area */}
      <Link href={`/organizations/${org.id}`} className="absolute inset-0 z-10 rounded-xl" />
      
      {/* Header section with Initials & 3-Dots actions */}
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-lg ${theme.bg} flex items-center justify-center font-bold text-base tracking-wider border shadow-sm`}>
          {initials}
        </div>

        {hasManagementActions && (
          <div className="relative z-30">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-4.5 w-4.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-card border-border rounded-lg">
                <Can I="update" a="Organization">
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer focus:bg-accent focus:text-foreground text-sm font-medium py-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit(org);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                </Can>
                <Can I="delete" a="Organization">
                  <DropdownMenuItem 
                    className="gap-2 cursor-pointer focus:bg-destructive/10 focus:text-destructive text-destructive text-sm font-medium py-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(org);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Organization Name */}
      <div className="flex-1 mb-3 flex flex-col justify-end">
        <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {org.name}
        </h3>
      </div>

      {/* Role Badge and Members Count Footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider bg-muted text-muted-foreground border border-border/40 uppercase">
          {org.currentUserRole || 'MEMBER'}
        </span>
        
        {/* <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
          <Users className="h-3.5 w-3.5 text-muted-foreground/75" />
          <span>{memberCount}</span>
        </div> */}
      </div>
    </div>
  );
}

export function OrganizationListRow({ org, onEdit, onDelete }: OrganizationCardProps) {
  const ability = useAbility(AbilityContext);
  const canUpdate = ability.can("update", "Organization");
  const canDelete = ability.can("delete", "Organization");
  const hasManagementActions = canUpdate || canDelete;
  
  const theme = getOrgTheme(org.id);
  const initials = org.name.substring(0, 2).toUpperCase();
  const memberCount = org.stats?.memberCount || 1;

  return (
    <div className="relative group bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:shadow-sm hover:border-primary/30 transition-all duration-150">
      <Link href={`/organizations/${org.id}`} className="absolute inset-0 z-10 rounded-xl" />
      
      <div className="flex items-center gap-4 min-w-0 z-20">
        <div className={`w-10 h-10 rounded-lg shrink-0 ${theme.bg} flex items-center justify-center font-bold text-sm border shadow-sm`}>
          {initials}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[400px]">
            {org.name}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-4 z-20 shrink-0">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider bg-muted text-muted-foreground border border-border/40 uppercase">
          {org.currentUserRole || 'MEMBER'}
        </span>
        
        {/* <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold w-12">
          <Users className="h-3.5 w-3.5 text-muted-foreground/75" />
          <span>{memberCount}</span>
        </div> */}

        {hasManagementActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-card border-border rounded-lg">
              <Can I="update" a="Organization">
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer focus:bg-accent focus:text-foreground text-sm font-medium py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(org);
                  }}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  Edit
                </DropdownMenuItem>
              </Can>
              <Can I="delete" a="Organization">
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer focus:bg-destructive/10 focus:text-destructive text-destructive text-sm font-medium py-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(org);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

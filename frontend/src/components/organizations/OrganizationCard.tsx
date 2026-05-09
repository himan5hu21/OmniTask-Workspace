"use client";

import Link from "next/link";
import { useAbility } from "@casl/react";
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can, AbilityContext } from "@/lib/casl";
import type { Organization } from "@/api/organizations";

interface OrganizationCardProps {
  org: Organization;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}

export function OrganizationCard({ org, onEdit, onDelete }: OrganizationCardProps) {
  const ability = useAbility(AbilityContext);
  const canUpdate = ability.can("update", "Organization");
  const canDelete = ability.can("delete", "Organization");
  const hasManagementActions = canUpdate || canDelete;

  return (
    <div className="relative group bg-background border border-border rounded-lg p-4 flex flex-col justify-center min-h-[80px] hover:border-primary/50 hover:bg-accent/30 transition-all shadow-sm overflow-hidden">
      <Link href={`/organizations/${org.id}`} className="absolute inset-0 z-20" />
      
      {/* Hover Actions Overlay */}
      {hasManagementActions && (
        <div className="absolute inset-0 z-30 flex items-center rounded-lg justify-center gap-2 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pointer-events-none">
          <Can I="update" a="Organization">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full shadow-lg border border-border hover:bg-primary hover:text-primary-foreground transition-colors pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(org);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Can>
          <Can I="delete" a="Organization">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full shadow-lg border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors pointer-events-auto"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(org);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Can>
        </div>
      )}

      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <span className="text-primary font-bold">{org.name.substring(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{org.name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{org.currentUserRole === 'OWNER' ? 'Owner' : 'Member'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

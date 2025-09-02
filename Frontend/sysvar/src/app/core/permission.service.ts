// src/app/core/permission.service.ts
import { Injectable, inject } from '@angular/core';
import { NavItem, UserRole } from './models/nav-item';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private auth = inject(AuthService);

  get currentRole(): UserRole {
    return (this.auth.getUserType() as UserRole) || 'Regular';
  }

  canAccess(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(this.currentRole);
  }

  filterMenu(tree: NavItem[]): NavItem[] {
    const out: NavItem[] = [];
    for (const node of tree) {
      const filteredChildren = node.children ? this.filterMenu(node.children) : undefined;
      const selfOk = this.canAccess(node);
      const hasChild = !!(filteredChildren && filteredChildren.length);

      if (selfOk || hasChild) {
        // monta o item mantendo children apenas se existirem
        const next: NavItem = {
          label: node.label,
          icon: node.icon,
          link: node.link,
          roles: node.roles,
          ...(hasChild ? { children: filteredChildren } : {})
        };
        out.push(next);
      }
    }
    return out;
  }
}

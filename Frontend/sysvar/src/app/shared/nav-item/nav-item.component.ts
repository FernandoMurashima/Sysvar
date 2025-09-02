import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import type { NavItem } from '../../core/models/nav-item';

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-item.component.html',
  styleUrls: ['./nav-item.component.css'],
})
export class NavItemComponent {
  @Input({ required: true }) item!: NavItem;

  expanded = false;

  get hasChildren() {
    return Array.isArray(this.item.children) && this.item.children.length > 0;
  }

  toggle() {
    if (this.hasChildren) this.expanded = !this.expanded;
  }
}

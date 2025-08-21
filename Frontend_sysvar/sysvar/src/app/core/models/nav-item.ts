export interface NavItem {
  label: string;
  icon?: string;
  link?: string;        // <-- opcional
  children?: NavItem[]; // <-- opcional
}

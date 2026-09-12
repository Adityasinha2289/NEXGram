import styles from './BottomNav.module.css';
import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  Home,
  Landmark,
  Package,
  RotateCcw,
  Search,
  Sparkles,
  Store,
  Target,
  User,
  ShoppingCart,
} from 'lucide-react';

/**
 * Navigation, in the two shapes the same destinations need.
 *
 * On a phone it is a four-item bar along the bottom, which is all a thumb can
 * reach and all the width will carry. From 768px up the same element becomes a
 * full-height sidebar, and the extra room pays for a second group of
 * destinations that a phone can only reach from the dashboard.
 */
const NAV = {
  retailer: {
    primary: [
      { to: '/retailer/dashboard', icon: Home, label: 'Home' },
      { to: '/retailer/products', icon: Search, label: 'Products' },
      { to: '/retailer/procurement', icon: ShoppingCart, label: 'Basket' },
      { to: '/retailer/orders', icon: ClipboardList, label: 'Orders' },
    ],
    secondary: [
      { to: '/retailer/developer-pack', icon: Sparkles, label: 'Pack' },
      { to: '/retailer/distributors', icon: Store, label: 'Distributors' },
      { to: '/retailer/reorder', icon: RotateCcw, label: 'Reorder' },
      { to: '/retailer/schemes', icon: Landmark, label: 'Schemes' },
      { to: '/retailer/profile', icon: User, label: 'Profile' },
    ],
  },
  distributor: {
    primary: [
      { to: '/distributor/dashboard', icon: Home, label: 'Home' },
      { to: '/distributor/opportunities', icon: Target, label: 'Signals' },
      { to: '/distributor/catalogue', icon: Package, label: 'Stock' },
      { to: '/distributor/orders', icon: ClipboardList, label: 'Orders' },
    ],
    secondary: [
      { to: '/distributor/schemes', icon: Landmark, label: 'Schemes' },
      { to: '/distributor/profile', icon: User, label: 'Profile' },
    ],
  },
};

function NavItem({ link }) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.to}
      className={({ isActive }) => [
        styles.navItem,
        isActive ? styles.active : '',
      ].filter(Boolean).join(' ')}
    >
      <span className={styles.iconWrap}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className={styles.label}>{link.label}</span>
    </NavLink>
  );
}

export function BottomNav({ role = 'retailer' }) {
  const { primary, secondary } = NAV[role] || NAV.retailer;

  return (
    <nav className={styles.nav} aria-label="Main">
      <div className={styles.brandRow}>
        <span className={styles.mark} aria-hidden="true">N</span>
        <span className={styles.wordmark}>NEXGram</span>
      </div>

      <p className={styles.groupLabel}>Roz ka kaam</p>
      <div className={styles.group}>
        {primary.map((link) => <NavItem key={link.to} link={link} />)}
      </div>

      <p className={styles.groupLabel}>Aur bhi</p>
      <div className={`${styles.group} ${styles.secondaryGroup}`}>
        {secondary.map((link) => <NavItem key={link.to} link={link} />)}
      </div>
    </nav>
  );
}

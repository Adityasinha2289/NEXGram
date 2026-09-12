import styles from './BottomNav.module.css';
import { NavLink } from 'react-router-dom';
import { Home, Sparkles, Search, Target, ClipboardList, Package } from 'lucide-react';

export function BottomNav({ role = 'retailer' }) {
  // Every destination here is a built screen. Pointing the nav at placeholder
  // pages reads worse than having one tab fewer.
  const retailerLinks = [
    { to: '/retailer/dashboard', icon: Home, label: 'Home' },
    { to: '/retailer/market', icon: Search, label: 'Search' },
    { to: '/retailer/developer-pack', icon: Sparkles, label: 'Pack' },
    { to: '/retailer/orders', icon: ClipboardList, label: 'Orders' },
  ];

  const distributorLinks = [
    { to: '/distributor/dashboard', icon: Home, label: 'Home' },
    { to: '/distributor/opportunities', icon: Target, label: 'Signals' },
    { to: '/distributor/catalogue', icon: Package, label: 'Stock' },
    { to: '/distributor/orders', icon: ClipboardList, label: 'Orders' },
  ];

  const links = role === 'retailer' ? retailerLinks : distributorLinks;

  return (
    <nav className={styles.bottomnav}>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <Icon size={24} strokeWidth={1.5} />
            <span className={styles.label}>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

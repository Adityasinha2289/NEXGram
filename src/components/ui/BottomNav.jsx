import styles from './BottomNav.module.css';
import { NavLink } from 'react-router-dom';
import { Home, PackageSearch, ShoppingCart, Target, ClipboardList, Package } from 'lucide-react';

export function BottomNav({ role = 'retailer' }) {
  const retailerLinks = [
    { to: '/retailer/dashboard', icon: Home, label: 'Home' },
    { to: '/retailer/products', icon: PackageSearch, label: 'Stock' },
    { to: '/retailer/cart', icon: ShoppingCart, label: 'Cart' },
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

import styles from './BottomNav.module.css';
import { NavLink } from 'react-router-dom';
import {
  Bike,
  Boxes,
  ClipboardList,
  Home,
  Landmark,
  MapPin,
  Mic,
  Package,
  RotateCcw,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Truck,
  User,
} from 'lucide-react';

/**
 * Navigation, in the two shapes the same destinations need.
 *
 * On a phone it is a four-item bar along the bottom, which is all a thumb can
 * reach and all the width will carry. From 768px up the same element becomes a
 * full-height sidebar, and the extra room pays for the rest.
 *
 * The sidebar's extra destinations are grouped by the question being asked
 * rather than listed. The retailer's had grown to ten undifferentiated links -
 * every feature reachable, none of them findable - and three short labelled
 * blocks read at a glance where one long list does not.
 */
const NAV = {
  retailer: {
    // The daily loop: open the shop, check stock, sell, hand over deliveries.
    primary: [
      { to: '/retailer/dashboard', icon: Home, label: 'Home' },
      { to: '/retailer/inventory', icon: Boxes, label: 'Stock' },
      { to: '/retailer/voice-sale', icon: Mic, label: 'Bechein' },
      { to: '/retailer/deliveries', icon: Bike, label: 'Delivery' },
    ],
    groups: [
      {
        label: 'Kya mangwayein',
        items: [
          { to: '/retailer/restock', icon: TrendingUp, label: 'Restock' },
          { to: '/retailer/sourcing', icon: Truck, label: 'Sabse sasta' },
          { to: '/retailer/procurement', icon: ShoppingCart, label: 'Basket' },
          { to: '/retailer/orders', icon: ClipboardList, label: 'Mere order' },
        ],
      },
      {
        label: 'Dhoondhein',
        items: [
          { to: '/retailer/market', icon: Search, label: 'Local market' },
          { to: '/retailer/distributors', icon: Store, label: 'Distributors' },
          { to: '/retailer/developer-pack', icon: Sparkles, label: 'Starter pack' },
          { to: '/retailer/reorder', icon: RotateCcw, label: 'Dobara order' },
        ],
      },
      {
        label: 'Aur',
        items: [
          { to: '/retailer/schemes', icon: Landmark, label: 'Loan' },
          { to: '/retailer/profile', icon: User, label: 'Profile' },
        ],
      },
    ],
  },

  distributor: {
    primary: [
      { to: '/distributor/dashboard', icon: Home, label: 'Home' },
      { to: '/distributor/opportunities', icon: Target, label: 'Signals' },
      { to: '/distributor/catalogue', icon: Package, label: 'Stock' },
      { to: '/distributor/orders', icon: ClipboardList, label: 'Orders' },
    ],
    groups: [
      {
        label: 'Aur',
        items: [
          { to: '/distributor/schemes', icon: Landmark, label: 'Loan' },
          { to: '/distributor/profile', icon: User, label: 'Profile' },
        ],
      },
    ],
  },

  customer: {
    primary: [
      { to: '/shop', icon: Store, label: 'Dukaanein' },
      { to: '/shop/orders', icon: ClipboardList, label: 'Mere order' },
    ],
    groups: [
      {
        label: 'Aur',
        items: [{ to: '/shop/address', icon: MapPin, label: 'Mera pata' }],
      },
    ],
  },
};

function NavItem({ link }) {
  const Icon = link.icon;
  return (
    <NavLink
      to={link.to}
      // `end` on the customer's shop list: /shop is a prefix of /shop/orders,
      // so without it both rows light up at once.
      end={link.to === '/shop'}
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
  const { primary, groups } = NAV[role] || NAV.retailer;

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

      {groups.map((group) => (
        <div key={group.label} className={styles.secondaryGroup}>
          <p className={styles.groupLabel}>{group.label}</p>
          <div className={styles.group}>
            {group.items.map((link) => <NavItem key={link.to} link={link} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

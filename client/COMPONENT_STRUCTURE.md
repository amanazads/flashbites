# FlashBites Component Architecture

## 📁 Folder Structure

```
client/src/
├── components/
│   ├── common/                 # Reusable UI components
│   │   ├── Button.jsx         # Reusable button with variants
│   │   ├── Card.jsx           # Reusable card container
│   │   ├── StatCard.jsx       # Stats display card
│   │   ├── MenuItem.jsx       # Menu item with icon
│   │   ├── PageHeader.jsx     # Page title header
│   │   ├── EmptyState.jsx     # Empty state placeholder
│   │   └── index.js           # Export all common components
│   │
│   ├── Navbar.jsx             # Top navigation bar
│   ├── SearchBar.jsx          # Search input component
│   ├── CategoryFilter.jsx     # Category filter chips
│   ├── DiscountBanner.jsx     # Promotional banner
│   ├── RestaurantCard.jsx     # Restaurant display card
│   ├── LoadingSkeleton.jsx    # Loading placeholder
│   └── BottomNavigation.jsx   # Bottom navigation bar
│
├── pages/
│   ├── Home.jsx               # Home page
│   ├── Search.jsx             # Search page
│   ├── Orders.jsx             # Orders page
│   ├── Profile.jsx            # Profile page
│   └── RestaurantDetails.jsx  # Restaurant details page
│
├── context/
│   └── AppContext.jsx         # Global state management
│
└── data/
    └── mockData.js            # Mock restaurant data
```

## 🎨 Reusable Components

### Button Component
**Location:** `components/common/Button.jsx`

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `onClick`: Function
- `icon`: React Icon Component
- `fullWidth`: Boolean
- `disabled`: Boolean

**Usage:**
```jsx
import { Button } from '../components/common';

<Button 
  variant="primary" 
  size="lg" 
  icon={IoCartOutline}
  fullWidth
>
  Order Now
</Button>
```

### Card Component
**Location:** `components/common/Card.jsx`

**Props:**
- `variant`: 'default' | 'danger' | 'success'
- `hoverable`: Boolean
- `onClick`: Function
- `className`: String

**Usage:**
```jsx
import { Card } from '../components/common';

<Card hoverable className="p-6">
  {/* Your content */}
</Card>
```

### StatCard Component
**Location:** `components/common/StatCard.jsx`

**Props:**
- `emoji`: String (emoji character)
- `value`: String | Number
- `label`: String
- `hoverable`: Boolean (default: true)

**Usage:**
```jsx
import { StatCard } from '../components/common';

<StatCard 
  emoji="📦"
  value="5"
  label="Orders"
/>
```

### MenuItem Component
**Location:** `components/common/MenuItem.jsx`

**Props:**
- `icon`: React Icon Component
- `label`: String
- `count`: String | Number (optional)
- `onClick`: Function
- `showBorder`: Boolean (default: true)

**Usage:**
```jsx
import { MenuItem } from '../components/common';

<MenuItem
  icon={IoSettingsOutline}
  label="Settings"
  onClick={() => navigate('/settings')}
/>
```

### PageHeader Component
**Location:** `components/common/PageHeader.jsx`

**Props:**
- `emoji`: String (emoji character)
- `title`: String
- `subtitle`: String (optional)

**Usage:**
```jsx
import { PageHeader } from '../components/common';

<PageHeader 
  emoji="🔍"
  title="Search"
  subtitle="Find your favorite food"
/>
```

### EmptyState Component
**Location:** `components/common/EmptyState.jsx`

**Props:**
- `emoji`: String (emoji character)
- `title`: String
- `message`: String
- `actionLabel`: String (optional)
- `onAction`: Function (optional)
- `actionIcon`: React Icon Component (optional)

**Usage:**
```jsx
import { EmptyState } from '../components/common';

<EmptyState
  emoji="📦"
  title="No orders yet"
  message="Start ordering from your favorite restaurants"
  actionLabel="Explore Restaurants"
  onAction={() => navigate('/')}
  actionIcon={IoRestaurantOutline}
/>
```

## 🎯 Design System

### Colors
- **Primary Orange:** `from-orange-400 to-red-500`
- **Background Gradient:** `from-orange-50 via-yellow-50 to-red-50`
- **Text Primary:** `text-gray-800`
- **Text Secondary:** `text-gray-600`

### Typography
- **Page Title:** `text-4xl font-bold`
- **Section Title:** `text-2xl font-bold`
- **Card Title:** `text-xl font-bold`
- **Body Text:** `text-base`
- **Small Text:** `text-sm`

### Spacing
- **Page Padding Top:** `pt-6`
- **Page Padding Bottom:** `pb-24` (to account for bottom navigation)
- **Page Padding Horizontal:** `px-4`
- **Card Padding:** `p-6`
- **Element Gap:** `gap-4` or `gap-6`

### Animations
- **Fade In:** `animate-fadeIn`
- **Slide In:** `animate-slideIn`
- **Hover Scale:** `hover:scale-105`
- **Active Scale:** `active:scale-95`
- **Transition:** `transition-all duration-200`

### Responsive Design
- **Mobile:** Default styles
- **Tablet:** `sm:` prefix (640px+)
- **Desktop:** `lg:` prefix (1024px+)

## 📱 Responsive Grid System

**Restaurant Grid:**
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Items */}
</div>
```

**Stats Grid:**
```jsx
<div className="grid grid-cols-3 gap-4">
  {/* Stats */}
</div>
```

## 🔄 Best Practices

1. **Always use reusable components** from `components/common` instead of duplicating styles
2. **Use Tailwind CSS classes** - no inline styles
3. **Add PropTypes validation** to all components
4. **Keep components small and focused** - single responsibility
5. **Use semantic HTML** - proper heading hierarchy, buttons vs divs
6. **Add accessibility attributes** - aria-labels, alt text
7. **Maintain consistent spacing** - use the design system values
8. **Add loading states** - use LoadingSkeleton component
9. **Add empty states** - use EmptyState component
10. **Mobile-first approach** - design for mobile, then add responsive breakpoints

## 🚀 Adding New Pages

When creating a new page:

1. Use consistent layout structure:
```jsx
<div className="min-h-screen pt-6 px-4 pb-24 bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
  <div className="max-w-7xl mx-auto">
    <PageHeader emoji="🎉" title="New Page" subtitle="Description" />
    {/* Page content */}
  </div>
</div>
```

2. Import reusable components:
```jsx
import { Button, Card, PageHeader } from '../components/common';
```

3. Add bottom padding (`pb-24`) to account for bottom navigation

4. Use consistent max-width container (`max-w-7xl mx-auto`)

## 📝 Component Checklist

Before committing a component:
- [ ] PropTypes validation added
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility attributes included
- [ ] Loading states handled
- [ ] Empty states handled
- [ ] Error states handled
- [ ] Animations added (fade in, hover effects)
- [ ] Consistent with design system
- [ ] No inline styles or messy CSS
- [ ] Reusable components used where possible

# Reusable Components Guide

## ✅ New Reusable Components Created

### 1. **Button Component** (`src/components/Button.jsx`)
A versatile button component with multiple variants and sizes.

**Features**:
- Multiple variants: `primary`, `secondary`, `success`, `danger`, `warning`, `outline`, `ghost`, `gradient`
- Multiple sizes: `xs`, `sm`, `md`, `lg`, `xl`
- Loading state support
- Icon support
- Full width option
- Disabled state

**Usage**:
```jsx
import { Button } from '../components';

<Button variant="primary" size="md" onClick={handleClick}>
  Click Me
</Button>

<Button variant="success" icon="✅" loading={isLoading}>
  Save
</Button>

<Button variant="outline" fullWidth>
  Cancel
</Button>
```

---

### 2. **Input Component** (`src/components/Input.jsx`)
Reusable input field with label, error, and helper text support.

**Features**:
- Label support
- Error state styling
- Helper text
- Required indicator
- Disabled state
- All standard input types

**Usage**:
```jsx
import { Input } from '../components';

<Input
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  error={errors.email}
  helperText="Enter your email address"
/>
```

---

### 3. **Select Component** (`src/components/Select.jsx`)
Reusable select dropdown with label, error, and helper text support.

**Features**:
- Label support
- Error state styling
- Helper text
- Required indicator
- Options as array of strings or objects
- Placeholder support

**Usage**:
```jsx
import { Select } from '../components';

<Select
  label="Country"
  name="country"
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  options={countries.map(c => ({ value: c.id, label: c.name }))}
  placeholder="Select a country"
  required
/>
```

---

### 4. **ActionButton Component** (`src/components/ActionButton.jsx`)
Large action button with icon, title, and description. Perfect for action lists.

**Features**:
- Icon display
- Title and description
- Multiple variants: `primary`, `success`, `warning`, `danger`, `purple`, `gray`
- Disabled state
- Consistent styling

**Usage**:
```jsx
import { ActionButton } from '../components';

<ActionButton
  icon="📦"
  title="Allocate Order Item"
  description="Create allocation (full or partial)"
  variant="success"
  onClick={handleAllocate}
/>
```

---

### 5. **EmptyState Component** (`src/components/EmptyState.jsx`)
Displays empty state message with optional action button.

**Features**:
- Custom icon
- Title and message
- Optional action button
- Consistent styling

**Usage**:
```jsx
import { EmptyState } from '../components';

<EmptyState
  icon="📋"
  title="No order item selected"
  message="Click on an order pill in the table to view details"
  actionLabel="Create New Order"
  onAction={() => setShowModal(true)}
/>
```

---

### 6. **InfoCard Component** (`src/components/InfoCard.jsx`)
Card for displaying key-value information pairs.

**Features**:
- Title with optional icon
- InfoRow component for key-value pairs
- Consistent styling
- Flexible content area

**Usage**:
```jsx
import { InfoCard, InfoRow } from '../components';

<InfoCard title="Order Item Information" icon="📦">
  <InfoRow label="SKU" value={orderItem.skuName} />
  <InfoRow label="Country" value={orderItem.countryName} />
  <InfoRow 
    label="Status" 
    valueComponent={<StatusBadge status={orderItem.status} />} 
  />
</InfoCard>
```

---

### 7. **FormField Component** (`src/components/FormField.jsx`)
Wrapper component that renders Input or Select based on type.

**Features**:
- Unified API for inputs and selects
- Type-based rendering
- All Input/Select features

**Usage**:
```jsx
import { FormField } from '../components';

<FormField
  type="text"
  label="Name"
  name="name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

<FormField
  type="select"
  label="Country"
  name="country"
  value={country}
  onChange={(e) => setCountry(e.target.value)}
  options={countries}
/>
```

---

## 📋 Existing Reusable Components

### **StatusBadge** (`src/components/StatusBadge.jsx`)
- Displays status with color coding
- Uses utility function for colors

### **Modal** (`src/components/Modal.jsx`)
- Reusable modal dialog
- Multiple sizes: `sm`, `md`, `lg`, `xl`, `full`
- Backdrop and close button

### **FilterBar** (`src/components/FilterBar.jsx`)
- Reusable filter controls
- Country, SKU, and date range filters
- Configurable visibility

### **Card** (`src/components/Card.jsx`)
- Dashboard metric cards
- Icon, title, value, subtitle
- Trend indicators

### **LoadingSpinner** (`src/components/LoadingSpinner.jsx`)
- Reusable loading indicator
- Customizable message

### **ErrorMessage** (`src/components/ErrorMessage.jsx`)
- Error display component
- Consistent error styling

---

## 🎯 Benefits of Reusable Components

1. **Consistency**: All buttons, inputs, and cards look the same across the app
2. **Maintainability**: Change styling in one place, affects everywhere
3. **Faster Development**: No need to write repetitive code
4. **Type Safety**: Consistent props and behavior
5. **Accessibility**: Built-in accessibility features
6. **Testing**: Easier to test individual components

---

## 📝 Migration Guide

### Before (Raw HTML):
```jsx
<button
  onClick={handleClick}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  Click Me
</button>
```

### After (Reusable Component):
```jsx
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

### Before (Raw Input):
```jsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Email *
  </label>
  <input
    type="email"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
  />
</div>
```

### After (Reusable Component):
```jsx
<Input
  label="Email"
  type="email"
  required
/>
```

---

## 🚀 Next Steps

1. **Refactor existing components** to use new reusable components
2. **Update OrderManagementPanel** to use ActionButton, InfoCard, EmptyState
3. **Update forms** to use Input, Select, FormField
4. **Update all buttons** to use Button component
5. **Create component stories** (if using Storybook)

---

## 📦 Export Structure

All components are exported from `src/components/index.js`:

```javascript
import { 
  Button, 
  Input, 
  Select, 
  ActionButton, 
  EmptyState, 
  InfoCard, 
  InfoRow,
  FormField,
  Modal,
  StatusBadge,
  // ... etc
} from '../components';
```


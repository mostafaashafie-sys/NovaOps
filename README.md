# NovaOps - Supply Chain Management System

A modern supply chain management application built with React, featuring a clean architecture with services and providers.

## 🏗️ Architecture

The application follows a **clean, layered architecture** with proper separation of concerns:

```
src/
├── config/          # Configuration files (Dataverse, etc.)
│   └── dataverse.config.js
├── services/        # Business logic layer (Pure JavaScript, no UI)
│   ├── DataverseService.js      # Dataverse API integration
│   ├── MockDataService.js        # Mock data generation
│   ├── OrderService.js           # Order business logic
│   ├── ForecastService.js        # Forecast business logic
│   ├── StockCoverService.js      # Stock cover calculations
│   ├── AllocationService.js      # Allocation management
│   └── ShipmentService.js        # Shipment operations
├── hooks/           # Data fetching layer (Bridges services and UI)
│   ├── useOrders.js              # Order data hook
│   ├── useForecasts.js           # Forecast data hook
│   ├── useStockCover.js          # Stock cover data hook
│   ├── useAllocations.js         # Allocation data hook
│   ├── useShipments.js           # Shipment data hook
│   └── useAppData.js             # Master data hook
├── providers/       # React Context providers (State management)
│   └── AppProvider.jsx           # Master data provider
├── components/      # Presentational UI components (No business logic)
│   ├── StatusBadge.jsx
│   ├── Modal.jsx
│   ├── FilterBar.jsx
│   ├── Card.jsx
│   ├── Navigation.jsx
│   ├── LoadingSpinner.jsx
│   └── ErrorMessage.jsx
├── pages/          # Page components (Use hooks, no direct service calls)
│   ├── HomePage.jsx
│   ├── StockCoverPage.jsx
│   ├── OrdersPage.jsx
│   ├── ForecastsPage.jsx
│   ├── AllocationsPage.jsx
│   └── ShipmentsPage.jsx
├── utils/          # Utility functions
│   └── formatters.js
├── types/          # Type definitions
│   └── index.js
├── App.jsx         # Main app component
└── main.jsx       # Entry point
```

### Architecture Layers

1. **Services Layer** (`services/`)
   - Pure business logic
   - No React dependencies
   - Handles API calls and data transformations
   - Easily testable and mockable

2. **Hooks Layer** (`hooks/`)
   - Bridges services and UI
   - Manages loading/error states
   - Handles data fetching and caching
   - Provides clean API to components

3. **Providers Layer** (`providers/`)
   - Global state management
   - Provides master data (countries, SKUs, months)
   - Minimal business logic

4. **Components Layer** (`components/`)
   - Pure presentational components
   - No business logic
   - Reusable and testable

5. **Pages Layer** (`pages/`)
   - Composes components
   - Uses hooks for data
   - No direct service calls
   - Handles user interactions

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

## 📦 Key Features

### Services Layer (Business Logic)
- **DataverseService**: Handles all Microsoft Dataverse API communications
- **OrderService**: Manages order-related operations (create, update, status changes)
- **ForecastService**: Handles forecast data and calculations
- **StockCoverService**: Manages stock cover calculations and planning
- **AllocationService**: Handles inventory allocations and movements
- **ShipmentService**: Manages shipment tracking and operations
- **MockDataService**: Generates mock data for development

### Hooks Layer (Data Management)
- **useOrders**: Order data fetching, filtering, and mutations
- **useForecasts**: Forecast data management
- **useStockCover**: Stock cover data and calculations
- **useAllocations**: Allocation data management
- **useShipments**: Shipment data tracking
- **useAppData**: Master data (countries, SKUs, months)

### Providers
- **AppProvider**: Provides master data only (countries, SKUs, months)
- All business logic is handled by hooks, not providers

### Pages
- **HomePage**: Dashboard with key metrics
- **StockCoverPage**: Interactive stock cover planning table
- **OrdersPage**: Order management with filtering and status updates
- **ForecastsPage**: Forecast management and analysis
- **AllocationsPage**: Allocation management
- **ShipmentsPage**: Shipment tracking

## 🔧 Configuration

### Dataverse Configuration

Update `src/config/dataverse.config.js` with your Dataverse environment details:

```javascript
export const DataverseConfig = {
  baseUrl: 'https://YOUR_ORG.crm.dynamics.com/api/data/v9.2',
  // ... other config
};
```

### Switching Between Mock and Real Data

By default, services use mock data. To switch to real Dataverse:

1. Update service constructors in each service file (set `useMock = false`)
2. Configure authentication in `DataverseService.js` (implement MSAL)
3. Hooks will automatically use the updated services

## 🎯 Architecture Principles

### Separation of Concerns

1. **Services** = Pure business logic, no UI dependencies
2. **Hooks** = Data fetching and state management
3. **Components** = Pure presentation, no business logic
4. **Pages** = Composition and user interactions

### Data Flow

```
User Action → Page Component → Hook → Service → API/Database
                ↓
            UI Update ← Hook State ← Service Response
```

### Benefits

- **Testability**: Services can be tested without React
- **Reusability**: Hooks can be used across multiple components
- **Maintainability**: Clear boundaries between layers
- **Scalability**: Easy to add new features following the pattern

## 🎨 UI Components

All components are built with Tailwind CSS and follow a consistent design system:

- **StatusBadge**: Color-coded status indicators
- **Modal**: Reusable modal dialogs
- **FilterBar**: Advanced filtering controls
- **Card**: Dashboard metric cards
- **Navigation**: Sidebar navigation

## 📝 Development Notes

- The app uses **Vite** for fast development and building
- **React 18** with modern hooks and context API
- **Tailwind CSS** via CDN (can be configured for build process)
- Services are designed to be easily testable and mockable
- All business logic is separated from UI components

## 📚 Documentation

For detailed information, see:

- **ARCHITECTURE.md** - Complete architecture documentation, folder structure, and layer responsibilities
- **BUSINESS_LOGIC.md** - Business logic workflow, data models, and user roles
- **COMPONENT_ORGANIZATION.md** - Component organization guide and import patterns
- **FEATURE_LOCATION_GUIDE.md** - Guide to finding features and components in the codebase
- **REUSABLE_COMPONENTS_GUIDE.md** - Guide to reusable UI components and their usage

## 📄 License

ISC


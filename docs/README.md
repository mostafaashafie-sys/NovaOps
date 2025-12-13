# NovaOps Documentation

Welcome to the NovaOps documentation. This directory contains comprehensive documentation organized by category.

## 📚 Documentation Structure

### [Architecture](./architecture/)
- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Complete architecture documentation including folder structure, layer responsibilities, schema design, and data flow

### [Implementation](./implementation/)
- **[COMPLETE_IMPLEMENTATION_SUMMARY.md](./implementation/COMPLETE_IMPLEMENTATION_SUMMARY.md)** - Complete implementation status (50+ measures, time intelligence, architecture alignment)
- **[TIME_INTELLIGENCE_IMPLEMENTATION.md](./implementation/TIME_INTELLIGENCE_IMPLEMENTATION.md)** - Technical details on time intelligence implementation
- **[UI_ARCHITECTURE_UPDATE.md](./implementation/UI_ARCHITECTURE_UPDATE.md)** - UI architecture migration to CalculationEngine (completed)

### [Dataverse](./dataverse/)
- **[DATAVERSE_SCHEMA_MAPPING.md](./dataverse/DATAVERSE_SCHEMA_MAPPING.md)** - Comprehensive Dataverse schema mapping and table documentation
- **[DATAVERSE_CALCULATION_MAPPINGS_TABLE.md](./dataverse/DATAVERSE_CALCULATION_MAPPINGS_TABLE.md)** - Design documentation for calculation mappings table
- **[DATAVERSE_MISSING_COLUMNS_ANALYSIS.md](./dataverse/DATAVERSE_MISSING_COLUMNS_ANALYSIS.md)** - Analysis of missing columns in schema

### [Business](./business/)
- **[BUSINESS_LOGIC.md](./business/BUSINESS_LOGIC.md)** - Business logic workflow, data models, and user roles
- **[Order_Lifecycle_Documentation_v2.md](./business/Order_Lifecycle_Documentation_v2.md)** - Complete order and PO lifecycle documentation with status flows

## 🚀 Quick Start

1. **New to the project?** Start with [ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
2. **Working with Dataverse?** See [DATAVERSE_SCHEMA_MAPPING.md](./dataverse/DATAVERSE_SCHEMA_MAPPING.md)
3. **Understanding business flows?** Read [BUSINESS_LOGIC.md](./business/BUSINESS_LOGIC.md) and [Order_Lifecycle_Documentation_v2.md](./business/Order_Lifecycle_Documentation_v2.md)
4. **Checking implementation status?** See [COMPLETE_IMPLEMENTATION_SUMMARY.md](./implementation/COMPLETE_IMPLEMENTATION_SUMMARY.md)

## 📖 Documentation Categories

### Architecture
Complete system architecture including:
- Layer responsibilities (Services, Hooks, Components, Pages)
- Schema design (Dataverse and Calculation schemas)
- Data flow and service integration
- Best practices and patterns

### Implementation
Current implementation status:
- 50+ calculation measures implemented
- Time intelligence support (SPLY, YTD, rolling averages)
- Special calculations (monthsCover, growth percentages)
- Architecture alignment verification

### Dataverse
Dataverse integration documentation:
- Complete schema mapping (20+ tables)
- Table relationships and lookups
- Status codes and option sets
- Field mappings and data types

### Business
Business logic and workflows:
- Order lifecycle (Forecasted → Planned → Approved → Shipped)
- PO approval workflow
- Allocation and shipping processes
- User roles and permissions

## 🔍 Finding Information

- **Architecture questions?** → `docs/architecture/`
- **Implementation status?** → `docs/implementation/`
- **Dataverse schema?** → `docs/dataverse/`
- **Business workflows?** → `docs/business/`

## 📝 Contributing

When updating documentation:
1. Place files in the appropriate category folder
2. Update this README if adding new major sections
3. Keep documentation focused and up-to-date
4. Remove outdated files

## 📊 Documentation Status

See [DOCUMENTATION_STATUS.md](./DOCUMENTATION_STATUS.md) for verification status of all documentation files.

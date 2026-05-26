# UniMove Build & Deploy Scripts

## 📁 Cấu Trúc Scripts

```
scripts/
├── setup/                     # Setup scripts
│   ├── setup-dev.sh
│   ├── setup-supabase.sh
│   └── install-dependencies.sh
├── build/                     # Build scripts
│   ├── build-mobile.sh
│   ├── build-web.sh
│   └── build-all.sh
├── deploy/                    # Deployment scripts
│   ├── deploy-mobile.sh
│   ├── deploy-web.sh
│   ├── deploy-supabase.sh
│   └── deploy-production.sh
├── database/                  # Database scripts
│   ├── backup-db.sh
│   ├── restore-db.sh
│   └── migrate-db.sh
└── utils/                     # Utility scripts
    ├── clean-build.sh
    ├── generate-icons.sh
    └── update-version.sh
```

## 🚀 Key Scripts

### Development Setup
```bash
# Setup toàn bộ development environment
./scripts/setup/setup-dev.sh

# Setup Supabase local
./scripts/setup/setup-supabase.sh

# Install dependencies cho tất cả projects
./scripts/setup/install-dependencies.sh
```

### Build Scripts
```bash
# Build mobile apps
./scripts/build/build-mobile.sh

# Build web admin
./scripts/build/build-web.sh

# Build tất cả
./scripts/build/build-all.sh
```

### Deployment Scripts
```bash
# Deploy mobile apps
./scripts/deploy/deploy-mobile.sh

# Deploy web admin
./scripts/deploy/deploy-web.sh

# Deploy production (all)
./scripts/deploy/deploy-production.sh
```

## 📋 Script Guidelines

### Script Standards
- Bash scripts với proper error handling
- Logging và progress indicators
- Environment variable validation
- Cross-platform compatibility (Windows/Mac/Linux)

### Usage Examples
```bash
# Make scripts executable
chmod +x scripts/**/*.sh

# Run with environment
ENV=staging ./scripts/deploy/deploy-web.sh

# Run with verbose logging
VERBOSE=true ./scripts/build/build-all.sh
```
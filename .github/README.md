# UniMove CI/CD Workflows

## 📁 Cấu Trúc CI/CD

```
.github/
├── workflows/                 # GitHub Actions workflows
│   ├── mobile-ci.yml         # Mobile CI/CD
│   ├── web-ci.yml            # Web CI/CD  
│   ├── backend-ci.yml        # Backend CI/CD
│   ├── pr-checks.yml         # Pull Request checks
│   └── release.yml           # Release automation
├── ISSUE_TEMPLATE/           # Issue templates
│   ├── bug_report.md
│   ├── feature_request.md
│   └── task.md
├── PULL_REQUEST_TEMPLATE/    # PR templates
│   └── pull_request_template.md
└── CODEOWNERS               # Code ownership
```

## 🔄 Workflow Overview

### Branch Strategy
```
main                    # Production branch
├── develop            # Development branch  
├── mobile/feature-*   # Mobile features
├── web/feature-*      # Web features
├── backend/feature-*  # Backend features
└── hotfix/*          # Production hotfixes
```

### CI/CD Pipeline
1. **PR Checks**: Lint, test, build validation
2. **Develop Deploy**: Auto deploy to staging
3. **Main Deploy**: Auto deploy to production
4. **Release**: Automated versioning và changelog

## 🚀 Workflow Files

### Mobile CI/CD
```yaml
# .github/workflows/mobile-ci.yml
name: Mobile CI/CD
on:
  push:
    branches: [main, develop]
    paths: ['mobile/**']
  pull_request:
    paths: ['mobile/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter test
      
  build-android:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build apk --release
      
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [test, build-android]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Play Store
        # Deploy steps...
```

### Web CI/CD  
```yaml
# .github/workflows/web-ci.yml
name: Web CI/CD
on:
  push:
    branches: [main, develop]
    paths: ['web/**']
  pull_request:
    paths: ['web/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter test
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter build web --release
      
  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [test, build]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        # Deploy steps...
```

## 📋 Team Guidelines

### Pull Request Process
1. Tạo feature branch từ `develop`
2. Implement feature
3. Tạo PR với proper template
4. CI checks pass
5. Code review approval
6. Merge vào `develop`
7. Deploy to staging
8. Merge `develop` → `main` for production

### Code Quality Gates
- ✅ All tests pass
- ✅ Code coverage > 80%
- ✅ Lint checks pass
- ✅ Build successful
- ✅ Security scan pass
- ✅ Performance benchmarks
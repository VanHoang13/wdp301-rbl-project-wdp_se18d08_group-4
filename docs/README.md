# UniMove Documentation

## 📁 Cấu Trúc Documentation

```
docs/
├── api/                       # API Documentation
│   ├── supabase-api.md
│   ├── edge-functions.md
│   └── webhooks.md
├── architecture/              # System Architecture
│   ├── overview.md
│   ├── database-design.md
│   ├── real-time-flow.md
│   └── security.md
├── development/               # Development Guides
│   ├── setup-guide.md
│   ├── coding-standards.md
│   ├── git-workflow.md
│   └── testing-guide.md
├── deployment/                # Deployment Guides
│   ├── mobile-deployment.md
│   ├── web-deployment.md
│   └── supabase-deployment.md
├── features/                  # Feature Documentation
│   ├── authentication.md
│   ├── booking-system.md
│   ├── real-time-tracking.md
│   ├── payment-system.md
│   └── chat-system.md
├── ui-ux/                     # Design Documentation
│   ├── design-system.md
│   ├── user-flows.md
│   └── wireframes/
└── business/                  # Business Documentation
    ├── requirements.md
    ├── user-stories.md
    └── business-rules.md
```

## 📋 Documentation Standards

### Code Documentation
- Tất cả public methods phải có dartdoc comments
- Complex business logic cần inline comments
- README.md cho mỗi major feature

### API Documentation
- OpenAPI specs cho tất cả endpoints
- Request/response examples
- Error codes và handling

### Architecture Documentation
- System diagrams
- Database ERD
- Sequence diagrams cho major flows

## 🚀 Documentation Tools

### Recommended Tools
- **Dartdoc**: Dart code documentation
- **Swagger/OpenAPI**: API documentation  
- **Mermaid**: Diagrams in markdown
- **Figma**: UI/UX documentation
- **Notion**: Team knowledge base
# UniMove Documentation

## 📁 Cấu Trúc Documentation

```
docs/
├── database-schema.md              # Tổng quan & chi tiết database (CHÍNH)
├── database-enums-and-functions.md # ENUM, Views, Functions chi tiết
├── flutter-setup.md                # Hướng dẫn chạy Flutter apps
├── nodejs-api.md                   # Node.js Express API
├── setup-checklist.md              # Checklist setup dự án
└── slide-presentation.md           # Slide thuyết trình
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
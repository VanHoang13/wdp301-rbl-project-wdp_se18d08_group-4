# UniMove Backend - Supabase

## 📁 Cấu Trúc Backend

```
backend/
├── supabase/
│   ├── config.toml              # Supabase configuration
│   ├── seed.sql                 # Initial data
│   └── migrations/              # Database migrations
│       ├── 20240101000000_initial_schema.sql
│       ├── 20240102000000_auth_setup.sql
│       ├── 20240103000000_orders_table.sql
│       ├── 20240104000000_payments_table.sql
│       └── 20240105000000_rls_policies.sql
├── functions/                   # Edge Functions
│   ├── order-matching/
│   │   ├── index.ts
│   │   └── package.json
│   ├── payment-processing/
│   │   ├── index.ts
│   │   └── package.json
│   ├── notification-sender/
│   │   ├── index.ts
│   │   └── package.json
│   └── analytics-aggregator/
│       ├── index.ts
│       └── package.json
├── storage/                     # Storage buckets config
│   ├── avatars/
│   ├── documents/
│   └── chat-images/
├── policies/                    # RLS Policies
│   ├── users.sql
│   ├── orders.sql
│   ├── payments.sql
│   └── chat.sql
└── api-docs/                   # API Documentation
    ├── openapi.yaml
    └── postman-collection.json
```

## 🚀 Setup Backend

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize project
supabase init

# Start local development
supabase start

# Run migrations
supabase db reset

# Deploy functions
supabase functions deploy
```

## 📋 Team Workflow

### Database Changes
1. Tạo migration file mới
2. Test local với `supabase db reset`
3. Commit và push
4. Deploy production

### Edge Functions
1. Develop trong `functions/function-name/`
2. Test local với `supabase functions serve`
3. Deploy với `supabase functions deploy function-name`
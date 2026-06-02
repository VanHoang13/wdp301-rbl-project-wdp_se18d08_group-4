# Node.js API — Auth and Profile Contract

## Overview

This backend uses Supabase Auth for password storage and verification.
Passwords are encrypted and managed by Supabase in `auth.users.encrypted_password`.
The `profiles` table stores metadata only — no password, no password hash, no plaintext password.

## Design principles

- **Passwords are never manually hashed in Node for login/register/change password.**
- **Node API does not persist plaintext passwords in Postgres.**
- **Supabase Auth is the source of truth for credentials.**
- `profiles` is metadata only: `id`, `email`, `full_name`, `phone`, `role`, `status`, etc.
- `auth.users` stores the encrypted password securely in Supabase.

## Auth endpoints

### POST /api/auth/register

Registers a new user through Supabase Auth and then creates a profile row.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Nguyen Van A",
  "phone": "0123456789"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": { ...profile metadata... },
    "accessToken": "<node-jwt>"
  }
}
```

### POST /api/auth/login

Authenticates with Supabase Auth using `signInWithPassword()`.
If login succeeds, Node issues a JWT for `/api/auth/me` and `/api/auth/change-password`.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### GET /api/auth/me

Returns the current profile metadata from `profiles`.
Requires `Authorization: Bearer <node-jwt>`.

### POST /api/auth/change-password

Validates the old password through Supabase Auth and updates the password using Supabase Auth admin API.

Request body:

```json
{
  "old_password": "old123",
  "new_password": "new456"
}
```

Requires `Authorization: Bearer <node-jwt>`.

### POST /api/auth/forgot-password

Generates a password reset token and stores the hashed token in `password_reset_tokens`.
The actual password remains stored in Supabase Auth.

Request body:

```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password

Verifies the reset token and then updates the user password through Supabase Auth admin API.

Request body:

```json
{
  "email": "user@example.com",
  "token": "123456",
  "new_password": "new-password"
}
```

### POST /api/auth/google

Authenticates user with Google OAuth (id_token).
On first login, automatically creates a customer profile with data from Google metadata.
On subsequent logins, retrieves the existing profile.

Request body:

```json
{
  "id_token": "<google-id-token>"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@gmail.com",
      "full_name": "User Name",
      "avatar_url": "https://lh3.googleusercontent.com/...",
      "role": "customer",
      "status": "active"
    },
    "accessToken": "<node-jwt>"
  }
}
```

**Setup for Flutter (Google Sign-In)**:

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

final GoogleSignIn googleSignIn = GoogleSignIn();
final GoogleSignInAccount? googleUser = await googleSignIn.signIn();
final GoogleSignInAuthentication googleAuth = await googleUser!.authentication;
final idToken = googleAuth.idToken;

// Send to Node API:
final response = await http.post(
  Uri.parse('$apiBase/api/auth/google'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'id_token': idToken}),
);

if (response.statusCode == 200) {
  final json = jsonDecode(response.body);
  final accessToken = json['data']['accessToken'];
  // Store token and profile
}
```

**Setup in Supabase Dashboard**:

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth 2.0 credentials (Client ID and Secret from Google Cloud Console)
4. Set redirect URL to your app URL (for web) or leave blank for mobile deep links

When a new Google user signs in:
- Supabase creates `auth.users` entry with `provider='google'`
- Trigger `handle_new_user()` automatically creates a `profiles` row
- Profile is created with `role='customer'` and metadata from Google (name, avatar)

## Implementation notes

- `backend/src/services/auth.service.js`
  - `register()` → `supabaseAdmin.auth.admin.createUser()`
  - `login()` → `supabaseAnon.auth.signInWithPassword()`
  - `changePassword()` → verify old password with Supabase sign-in, then `supabaseAdmin.auth.admin.updateUserById()`
  - `forgotPassword()` / `resetPassword()` → token flow for reset, but password update still uses Supabase Auth admin API
  - `googleAuth()` → `supabaseAdmin.auth.signInWithIdToken()` for Google OAuth verification
- `backend/src/services/supabase.service.js`
  - exports `supabaseAdmin` for admin actions
  - exports `supabaseAnon` for sign-in/password verification
- `backend/src/middleware/auth.middleware.js`
  - Node JWT (`requireNodeAuth`) is used for Node-only protected routes

## Schema check

- `profiles` must not have `password` or `password_hash`.
- Password data is not in `profiles`; it is in Supabase Auth only.

## Security checks

- No direct bcrypt hashing of user passwords in the registration/login/change-password flow.
- No password stored in `profiles`.
- Supabase Auth is responsible for secure password encryption.
- Google OAuth tokens are verified by Supabase Auth API.
- Node API only stores password reset tokens (hashed) when handling OTP-style resets.

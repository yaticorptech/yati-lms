# YATICORP LMS

Monorepo for YatiCorp Learning Management System applications:

- `yaticorp-lms-server` - Node.js/Express backend API
- `yaticorp-lms-admin` - Admin web app (React + Vite)
- `yaticorp-lms-student` - Student web app (React + Vite)
- `yaticorp-lms-mobile` - Student mobile app (React Native + Expo)

## Documentation Map

### App-level READMEs (primary)

- [Server documentation](./yaticorp-lms-server/README.md)
- [Admin documentation](./yaticorp-lms-admin/README.md)
- [Student documentation](./yaticorp-lms-student/README.md)
- [Mobile documentation](./yaticorp-lms-mobile/README.md)

### Additional docs folder

- [API documentation](./docs/API.md)
- [Features overview](./docs/FEATURES.md)
- [Legacy server notes](./docs/SERVER.md)
- [Legacy student notes](./docs/STUDENT.md)
- [Legacy admin notes](./docs/ADMIN.md)

## Quick Start (All Apps)

### 1) Server

```bash
cd yaticorp-lms-server
npm install
npm run dev
```

Backend default URL: `http://localhost:5000`

### 2) Student web

```bash
cd yaticorp-lms-student
npm install
npm run dev
```

### 3) Admin web

```bash
cd yaticorp-lms-admin
npm install
npm run dev
```

### 4) Mobile app

```bash
cd yaticorp-lms-mobile
npm install
npm start
```

## Suggested Startup Order

1. Start `yaticorp-lms-server` first
2. Start `yaticorp-lms-student` and `yaticorp-lms-admin`
3. Start `yaticorp-lms-mobile` when testing mobile flows

## Notes

- Web apps require `VITE_API_URL` for correct backend connectivity.
- Server CORS allows localhost variants plus configured production origins.
- Mobile API base URL is configured in code and may need local override for LAN testing.

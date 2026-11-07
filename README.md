# Office Time Tracker (MERN)

React + Vite + Tailwind | Express | MongoDB Atlas | JWT | Recharts | xlsx + jsPDF

## Folder structure
```
Office-time-tracker/
├── package.json            (helper scripts)
├── server/
│   ├── .env
│   └── src/
│       ├── server.js
│       ├── config/db.js
│       ├── models/         User.js, Attendance.js, Settings.js
│       ├── middleware/     auth.js, error.js
│       ├── routes/         auth.js, attendance.js, reports.js, settings.js, admin.js
│       └── utils/          calc.js (time engine), calc.test.js, mail.js
└── client/
    ├── .env
    └── src/
        ├── App.jsx, main.jsx, api.js, index.css
        ├── context/        AuthContext.jsx, ThemeContext.jsx
        ├── components/     Layout.jsx, ui.jsx
        ├── pages/          Login, Register, Dashboard, AddAttendance, History, Reports, Settings, Profile, Admin, ForgotPassword, ResetPassword, VerifyEmail
        └── utils/          time.js, export.js
```

## 1. MongoDB Atlas setup
1. Create a free cluster at https://cloud.mongodb.com.
2. Database Access > Add a database user (username + password).
3. Network Access > Add IP Address. Use "Allow access from anywhere" (0.0.0.0/0) for testing.
4. Connect > Drivers > copy the connection string.
5. Put it in `server/.env`, with a database name such as `office_time_tracker`. If the password has special characters (@ : /), URL-encode them.

## 2. Run in VS Code (two terminals)
```bash
cd Office-time-tracker
npm run install:all

# Terminal 1: backend
cd server
cp .env                     # Windows: copy .env  (then edit MONGODB_URI and JWT_SECRET)
npm run dev                 # http://localhost:5000, should print "MongoDB connected"

# Terminal 2: frontend
cd client
npm run dev                 # http://localhost:5173
```
Run the calculation tests any time: `cd server && npm test`.

Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## 2b. Roles: admin and staff
- **First run**: open the login page and click "Create the admin account". The first account becomes the admin, then public registration closes permanently.
- **Admin controls everything**: Admin Panel > Add staff (name, email, password). For each staff member the admin can open their Dashboard, Records, Reports, Add entry and Settings, edit or delete any attendance record, change overtime time / break / working days, reset the password, disable, make admin, or delete the user with all data.
- **Separate dashboards**: the admin lands on the *Admin Dashboard* (all staff: present/not logged today, monthly hours and overtime per staff, company-wide charts, recent entries). Admin menu: Admin Dashboard, Staff Management, Default Settings, Profile. Opening a staff member shows that person's own dashboard, records and reports in an "Admin view" with tabs. The admin has no personal attendance.
- **Punch flow (staff)**: on the dashboard (and the "Today: Punch In/Out" page) the staff member sees "Have you arrived?" and presses **Yes, I'm in**. The server records the time (office timezone, `TIMEZONE` in `server/.env`, default Asia/Kolkata), so changing the phone clock does nothing. During the day they can press Start lunch / End lunch. At the end they press **Yes, I'm leaving**, confirm the lunch minutes, and the screen shows "Today you worked X h Y m" with overtime after the overtime start time. Staff cannot type times manually.
- **Lunch rule**: standard lunch = Settings > "Standard lunch (min)" (default 30). Working time = time at office minus the lunch actually taken. Example: 30 min allowed, 20 min taken, so 10 min is added to working time. Lunch longer than allowed is deducted. New accounts start with 30; for older accounts the admin should set 30 in that staff member's Settings.
- **Admin manual entry**: in a staff member's "Add entry" form the out-time is optional. With only the in-time the record is saved as "In progress"; add the out-time later with Edit (or the staff member can check out themselves).
- **Forgot to check out?** The record stays "In progress" and blocks a new check-in. The admin opens the staff member > Records > Edit, enters the out time, and saves. Open records are not counted in totals until completed.
- **Staff**: log in with their own email and password. They can check in/out, see their own history, dashboard and reports, and change their own name/password. They cannot edit or delete records, change settings, or see anyone else's data (enforced on the server, not just hidden in the UI).
- **Profile photo**: every user can upload a photo on the Profile page. It is cropped to a square, shrunk to 256x256 in the browser and saved in MongoDB (so it survives restarts and redeploys). The admin sees staff photos in Staff Management.
- **Email features**: forgot-password works for any account (link is valid 1 hour). With empty `SMTP_HOST`, links print in the server terminal. Set `SMTP_*` for real emails.

## 3. API
| Method | Route | Notes |
|---|---|---|
| POST | /api/auth/register (first admin only), /api/auth/login | returns JWT |
| GET/PUT | /api/auth/me, /api/auth/profile | profile + password change |
| GET | /api/attendance?search=&month=&year=&from=&to= | own records only |
| POST / PUT /:id / DELETE /:id | /api/attendance | validation, duplicate-date block |
| GET | /api/reports/monthly?month=&year= or ?from=&to= | summary + records |
| GET | /api/reports/summary?month=&year= | dashboard + charts data |
| POST | /api/auth/verify-email, /resend-verification, /forgot-password, /reset-password | email flows |
| GET | /api/admin/overview?month=&year=&today=, /api/admin/stats, /api/admin/users | admin only |
| POST | /api/admin/users | admin creates staff |
| PATCH/DELETE | /api/admin/users/:id | admin only (role/status/delete not on yourself) |

Admin can pass `?userId=<staffId>` to /api/attendance, /api/reports/* and /api/settings to act on a staff member. Staff passing it get 403.
| GET/PUT | /api/settings | overtime time, break, working days, report prefs |

## 3b. Working-day calendar
Expected working days = days in the month/range that match your Settings > Working days (counted up to today). Absent days = expected days with no attendance record. Shown on the Dashboard and Reports.

## 4. Calculation rules (server/src/utils/calc.js)
- Working = (out − in, +24h if out ≤ in) − break
- Overtime = minutes after the overtime start time (default 19:30); break is not deducted from overtime
- 09:52 to 23:14 = 13h 22m working, 3h 44m overtime. 10:00 to 01:30 = 15h 30m working, 6h 00m overtime.
- Totals are summed in whole minutes, so monthly totals have no rounding drift.
- Times are stored as 24h `HH:mm` and displayed in AM/PM.

## 5. Deployment
**Option A: single service (e.g. Render / Railway / VPS)**
```bash
npm run install:all && npm run build
# env on the server: MONGODB_URI, JWT_SECRET, SERVE_CLIENT=true, CLIENT_ORIGIN=https://your-domain
npm start
```
Build command: `npm run install:all && npm run build`. Start command: `npm start`. The API then serves the React app at the same domain, so no `VITE_API_URL` is needed.

**Option B: split hosting**
- Backend on Render/Railway: root `server`, start `npm start`, env `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN=https://your-frontend.vercel.app`.
- Frontend on Vercel/Netlify: root `client`, build `npm run build`, output `dist`, env `VITE_API_URL=https://your-api.onrender.com/api`. Add a rewrite of all routes to `/index.html`.
- In Atlas Network Access, allow your host's IPs (or 0.0.0.0/0).

## Notes
- All data is in MongoDB. The browser keeps only the JWT login token and light/dark preference.
- Every query is filtered by the logged-in user's id, and (userId, date) has a unique index.

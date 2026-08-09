# Smart Prescription — Windows Installer

## Build installer

From this folder (`DesktopApp/sm`):

```powershell
npm install
npm run build
```

Output:

- `dist/Smart Prescription Setup 1.0.0.exe` — Windows installer (NSIS)
- `dist/win-unpacked/` — portable unpacked app (testing)

## Install on another PC

1. Copy `Smart Prescription Setup 1.0.0.exe` to the target machine
2. Run the installer
3. Choose install folder (optional)
4. Launch **Smart Prescription** from Desktop or Start Menu

Default login (first run): `admin` / `admin123`

## Database note

- Installed app stores your live database in Windows user data (not inside Program Files)
- First launch copies seed `preData.db` automatically
- Your data survives app updates/reinstalls in the same Windows user profile

## Quick test without installer

```powershell
npm run build:dir
```

Then run `dist/win-unpacked/Smart Prescription.exe`

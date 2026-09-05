# Iligan City Multiple Listing Service (MLS) Platform 🇵🇭

A modern, responsive real estate web application and Multiple Listing Service (MLS) built for realtors and property seekers in **Iligan City, Lanao del Norte, Philippines** and the Northern Mindanao region.

---

## 🌟 Key Features

### For Home Buyers & Renters
- **Interactive Mapping (100% Free)**: Powered by Leaflet.js and OpenStreetMap with zero API keys required. Features custom price pill markers (`₱8.5M`, `₱22k/mo`) with interactive click-to-preview cards.
- **Localized for the Philippines**:
  - Currency in Philippine Peso (`₱`).
  - Floor & lot measurements in square meters (`sqm`).
  - Pre-seeded with realistic properties across Iligan City barangays: **Pala-o**, **Tibanga**, **Tubod**, **San Miguel**, **Buru-un**, **Suarez**, **Santa Elena**, and **Hinaplanon**.
  - Local real estate badges: Clean Torrens Title (TCT), Pag-IBIG eligibility, 24/7 subdivision security, flood-free elevation, solar hybrid, and water cistern.
- **Philippine Home Loan & Interest Estimator**:
  - Standalone calculator with real-time sliders for property price, down payment %, interest rate %, and loan term (5 to 30 years).
  - Quick presets for **Pag-IBIG Housing Loans** (6.25% p.a., 30-year term) and **Commercial Bank Loans** (7.0% 20 yrs, 6.75% 15 yrs).
  - Financial breakdown: Down payment, loanable principal, monthly amortization, total interest paid, and required gross monthly income (based on Philippine 35% Debt-to-Income standard).
  - Side-by-side loan term comparison table (10, 15, 20, and 30-year terms).
- **Responsive View Modes**: Split screen (listings + sticky map), full listing grid, or full-width map view.
- **Site Viewing Inquiry Form**: Modal to request property tours with licensed brokers.

### For Realtors & Managing Brokers
- **Discreet Access**: The Realtor Portal is placed discreetly in the **About section** at the bottom of the page to keep it hidden from everyday casual visitors.
- **Password Protection**: Accessing the Realtor Portal requires the admin passcode:
  - **Passcode**: `admin010211`
  - Includes password visibility toggle, input validation, and secure session management.
- **Full Listing Management (CRUD)**:
  - Create, edit, and delete properties with instant local persistence (`localStorage`).
  - Upload photos from your local device (saved as base64 DataURLs) or add image URLs.
- **GPS Coordinates & Auto-Fill Address**:
  - Paste GPS coordinates in any format (e.g. `8.2280, 124.2452`, Google Maps links).
  - Automatically queries OpenStreetMap's free **Reverse Geocoding API** to auto-detect street, barangay, city, province, and postal code (`9200`).
  - Interactive map pin dropper: Click or drag the pin anywhere on the Iligan City map and click **"Fill Address from Pin"** to auto-fill address fields.
- **Live Realtor Price Estimator**: Instant amortization and required income calculations inside the property editor as you adjust the price.
- **One-Click Reset**: Restore original Iligan City sample listings anytime.

---

## 🛠️ Technology Stack
- **HTML5 & Vanilla JavaScript**: Pure client-side performance, zero heavy framework dependencies.
- **Tailwind CSS**: Modern, utility-first design via Tailwind Play CDN.
- **Leaflet.js & OpenStreetMap**: 100% free mapping, geocoding, and reverse geocoding (no Google Maps API billing or keys needed).
- **FontAwesome 6**: Icons for UI badges, amenities, and actions.
- **LocalStorage**: Persistent client-side data store for listings and favorites.

---

## 🚀 Getting Started

### Option 1: Direct in Browser
Simply open `index.html` in any web browser.

### Option 2: Local Static Server
Run the included PowerShell static web server:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```
Then navigate to:
```
http://localhost:5050/
```

---

## 🔐 Realtor Admin Access
- **Location**: Bottom of the page in the **About** section (or click **About** in the top navigation).
- **Passcode**: `admin010211`

---

## 📄 License
MIT License

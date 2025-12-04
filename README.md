# 🌍 FluxCurrency
**Live Demo:** https://fluxcurrency.pages.dev

FluxCurrency is a modern real-time currency exchange dashboard featuring a premium glassmorphic UI, live API conversion, historical analytics, interactive charts, automatic flag detection, smooth input handling, and full theme switching support.

## 📌 Overview
FluxCurrency converts complex financial data into a clean, intuitive experience.

**The app focuses on:**
* Real-time currency exchange
* Historical market insights
* Modern, responsive UI
* Smooth usability features like debounce & theme memory

## ⚠️ Problem Statement
Traditional currency converters often have:
* Outdated, non-responsive UI
* No rich visual insights
* No historical data
* Poor user experience

## ✅ FluxCurrency solves this by providing:
* A beautiful glassmorphism UI
* Real-time FX rates
* Historical trend charts (30D / 90D / 1Y)
* Live market ticker slider
* Interactive and responsive interface

## ✨ Features

### ⚡ Real-Time Currency Conversion
* Powered by the Frankfurter API
* Supports 30+ currencies
* Accurate ECB-sourced exchange rates

### 📊 Historical Chart Analytics
* Visualize trends for 1M, 3M, 1Y
* Built with Chart.js
* Smooth transitions and responsive scaling

### 🌗 Smart Theme Switching
* Dark/Light mode toggle
* Theme saved using LocalStorage
* UI updates instantly across components

### 🎨 Premium Glassmorphism UI
* Frosted-glass effect components
* Gradient neon glow backgrounds
* Modern typography with Inter and Outfit fonts

### 🇺🇳 Automatic Country Flags
* Flags fetched dynamically via FlagCDN
* Currency codes mapped to correct region

### ♻ Smooth Auto Update
* Debounced input handling (300ms)
* Prevents unnecessary API calls
* Improves performance & reduces API load

## 🧠 How It Works (Logic Flow)
1.  **Input:** User entry triggers debounce & validation.
2.  **Check Cache:** App checks data freshness.
3.  **Fetch:** If data is stale, it calls the API.
4.  **Render:** Computes conversion & updates the UI.

## 🛠 Tech Stack

| Category | Tools |
| :--- | :--- |
| **Frontend** | HTML5 (Semantic), CSS3 (Grid/Flex), Vanilla JS (ES6+) |
| **API** | Frankfurter API |
| **UI Libraries** | Chart.js |
| **Flags** | FlagCDN |
| **Fonts** | Google Fonts (Inter, Outfit) |
| **Storage** | LocalStorage |

## 🔮 Roadmap / Future Enhancements

| Feature | Status | Technology |
| :--- | :--- | :--- |
| **IndexedDB Caching** | 🔜 Planned | Client-Side DB |
| **Offline PWA Mode** | 🔜 Planned | Service Worker |
| **Background Auto-Refresh** | 🔜 Planned | Polling Worker |
| **Export/Import History** | 🔜 Planned | JSON |
| **Crypto Price Support** | 🔜 Planned | Crypto API |
| **Multi-Pair Graph Comparison** | 🔜 Planned | Chart.js Multi Dataset |

## 📂 Project Structure
```text
/currency-converter
│ index.html
│ style.css
│ main.js
│ .gitignore
│ LICENSE

## 🔧 Setup & Run

### 1️⃣ Clone the Repository
```bash
git clone [https://github.com/codervinitjangir/currency-converter.git](https://github.com/codervinitjangir/currency-converter.git)
cd currency-converter
Just open: index.html No backend or local server required.

## 🤝 Contributing
Contributions are welcome! If you want to improve UI, performance, caching, charts, or add new features — feel free to fork and submit a PR.

## 📜 License
Licensed under the MIT License — you are free to use, modify, and distribute.

## 👤 Author
Vinit Jangir Frontend Developer Associate GitHub: https://github.com/codervinitjangir

## ⭐ Support
If this project helped you, please star the repository — it motivates future updates!
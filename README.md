# 🎬 Letterboxd Wrapped

> *Your cinematic year, unwrapped.*

**🚀 Live Demo: [movies-wrapped-2025.vercel.app](https://movies-wrapped-2025.vercel.app/)**

A premium, interactive year-in-review web app built on your Letterboxd export data. Upload your ZIP, and get a gorgeous breakdown of your movie-watching habits — top directors, quirky personality badges, watch streaks, binge days, rating curves, and more.

---

## ✨ Features

### 📊 Deep Cinematic Statistics
- Total films watched, total hours spent, and average star rating
- Rating distribution histogram and decade-based viewing breakdown
- Top 5 directors, actors, and writers of the year
- Most-watched genres and release eras

### 🏷️ Personality Cards & Quirky Badges
Unlock dynamically generated personality badges based on your actual habits:
- *Wes Anderson Stan* · *Decade Hopper* · *Tough Critic* · *Weekend Main Character*
- *Binge Champion* · *Rewatch Devotee* · *Nolan Enthusiast* · and many more

### 📅 Multi-Year Support
Switch between years (2020–2025) to compare your stats and track how your taste evolved.

### 🍿 No Letterboxd Data? Try a Sample Profile
Don't have an export ZIP handy? Open the upload dialog and explore **5 hand-crafted movie-goer personas** with realistic log histories spanning 2020–2025:

| Profile | Username | Personality |
|---|---|---|
| 🎨 Arthouse Sara | `sara_celluloid25` | Wes Anderson fan, indie dramas, high discovery score |
| 🍿 Blockbuster Bob | `bobbyxboy99` | MCU fanboy, action/sci-fi, massive weekend binges |
| 🎞️ Nostalgic Clara | `clarasfilms` | 70s–90s vintage cinema, high rewatch rate |
| 🍕 Binge Watcher Pat | `couch_pat_ato` | 150–200 films/year, long streaks, Pixar enthusiast |
| 🧐 Critical Tim | `rotten_tim` | Tough critic, low average rating, contrarian takes |

### 📸 Stats Card Exporting
Save and share your Wrapped cards as downloadable images directly from the browser.

### 🔒 Privacy First
Your ZIP is processed locally and is never stored or shared with third parties.

---

## 📂 How to Export Your Letterboxd Data

1. Sign into [Letterboxd](https://letterboxd.com) in your browser.
2. Go to [**Settings → Import & Export**](https://letterboxd.com/settings/data/).
3. Click **Export your data**, then confirm with **Export Data**.
4. Wait for the ZIP to download — **don't unzip it**.
5. Drag the ZIP into the upload dropzone on the site and hit **Generate My Wrapped**!

> **Mobile users:** Open the export link in your phone's browser (Safari/Chrome), not the Letterboxd app, to avoid redirect loops.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Recharts |
| Styling | Vanilla CSS (glassmorphism, custom HSL tokens, micro-animations) |
| Image Export | html2canvas |
| Backend | Python, FastAPI, Uvicorn |
| Data Parsing | PapaParse (frontend), native CSV (backend) |
| Bundling | JSZip (in-browser ZIP extraction) |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

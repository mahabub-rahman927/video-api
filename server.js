const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const urlLib = require("url");

const app = express();
const PORT = 6788;
const DB_FILE = path.join(__dirname, "videos.json");

// =======================
// ensure database
// =======================
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

// =======================
// Check if URL is .mp4
// =======================
async function isMp4(url) {
  const ext = path.extname(urlLib.parse(url).pathname).toLowerCase();
  if (ext === ".mp4") return true;

  try {
    const head = await axios.head(url);
    return head.headers["content-type"] === "video/mp4";
  } catch {
    return false;
  }
}

// =================================================
// ROUTE 0️⃣  /api/upload → show categories
// =================================================
app.get("/api/upload", (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    const categories = Object.keys(db).map(cat => ({
      category: cat,
      totalVideos: db[cat].length
    }));

    res.json({
      status: true,
      availableCategories: categories,
      usage: "/api/upload/{category}?url=VIDEO_URL"
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// =================================================
// ROUTE 1️⃣  /api/upload/:category → save mp4 URL
// =================================================
app.get("/api/upload/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const videoUrl = req.query.url || req.query.data;

    if (!videoUrl) {
      return res.status(400).json({
        status: false,
        message: "Missing video url"
      });
    }

    const valid = await isMp4(videoUrl);
    if (!valid) {
      return res.status(415).json({
        status: false,
        message: "Only .mp4 video URLs are allowed"
      });
    }

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!db[category]) db[category] = [];

    db[category].push(videoUrl);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    res.json({
      status: true,
      category,
      video: videoUrl,
      totalVideos: db[category].length
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

// =================================================
// ROUTE 2️⃣  /api/:category → random video URL
// =================================================
app.get("/api/:category", (req, res) => {
  try {
    const { category } = req.params;

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const list = db[category];

    if (!list || list.length === 0) {
      return res.status(404).json({
        status: false,
        message: `No videos found in category '${category}'`
      });
    }

    const randomVideo = list[Math.floor(Math.random() * list.length)];

    res.json({
      status: true,
      category,
      video: randomVideo,
      totalVideos: list.length
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

// =======================
app.listen(PORT, () => {
  console.log(`✅ MP4 URL API running on http://localhost:${PORT}`);
});

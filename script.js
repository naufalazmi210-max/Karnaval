
/*
  AmanDolan
  Fitur:
  - Pencarian dan filter tempat
  - Peta interaktif Leaflet
  - Favorit tersimpan di localStorage
  - Dolan Roulette berdasarkan budget dan mood
  - Form tambah tempat lokal
*/

// =====================================
// 1. DATA TEMPAT REKOMENDASI
// =====================================

const defaultPlaces = [
  {
    id: "alun-malang",
    name: "Alun-Alun Kota Malang",
    category: "Gratis",
    area: "Klojen, Kota Malang",
    price: 0,
    description: "Jalan santai, duduk santai, atau menikmati suasana pusat kota.",
    emoji: "🌳",
    color: "#d9edc8",
    lat: -7.9826,
    lng: 112.6308,
    mood: ["Santai", "Nongkrong"]
  },
  {
    id: "taman-slamet",
    name: "Taman Slamet",
    category: "Alam",
    area: "Klojen, Kota Malang",
    price: 0,
    description: "Ruang hijau untuk istirahat, ngobrol, dan mencari udara segar.",
    emoji: "🌿",
    color: "#d8edcc",
    lat: -7.9739,
    lng: 112.6237,
    mood: ["Santai", "Nongkrong"]
  },
  {
    id: "hutan-malabar",
    name: "Hutan Kota Malabar",
    category: "Alam",
    area: "Klojen, Kota Malang",
    price: 0,
    description: "Pilihan untuk menikmati suasana rindang di tengah kota.",
    emoji: "🌲",
    color: "#c9e2cf",
    lat: -7.9692,
    lng: 112.6227,
    mood: ["Santai", "Petualangan"]
  },
  {
    id: "tugu-malang",
    name: "Taman Tugu Malang",
    category: "Wisata",
    area: "Klojen, Kota Malang",
    price: 0,
    description: "Area ikonik untuk menikmati suasana kota dan mengambil foto.",
    emoji: "📸",
    color: "#d7e8fa",
    lat: -7.9787,
    lng: 112.6341,
    mood: ["Santai", "Petualangan"]
  },
  {
    id: "merjosari",
    name: "Taman Singha Merjosari",
    category: "Gratis",
    area: "Lowokwaru, Kota Malang",
    price: 0,
    description: "Alternatif ruang terbuka untuk santai dan aktivitas ringan.",
    emoji: "🌼",
    color: "#f3e9b8",
    lat: -7.9418,
    lng: 112.6037,
    mood: ["Santai", "Nongkrong"]
  },
  {
    id: "alun-batu",
    name: "Alun-Alun Kota Batu",
    category: "Wisata",
    area: "Batu, Jawa Timur",
    price: 0,
    description: "Jalan-jalan di pusat Kota Batu dan berburu jajanan sekitar.",
    emoji: "🎡",
    color: "#f8ddc4",
    lat: -7.8712,
    lng: 112.5266,
    mood: ["Makan", "Petualangan", "Nongkrong"]
  },
  {
    id: "kuliner-malang",
    name: "Jelajah Kuliner Malang",
    category: "Kuliner",
    area: "Pusat Kota Malang",
    price: 15000,
    description: "Ide berburu bakso, jajanan, dan makanan lokal sesuai budget.",
    emoji: "🍜",
    color: "#ffd9c7",
    lat: -7.9818,
    lng: 112.6285,
    mood: ["Makan"]
  },
  {
    id: "nongkrong-malang",
    name: "Cari Kedai Kopi",
    category: "Nongkrong",
    area: "Kota Malang",
    price: 20000,
    description: "Cari tempat ngopi dan ngobrol bersama teman.",
    emoji: "☕",
    color: "#ead7c5",
    lat: -7.9565,
    lng: 112.6178,
    mood: ["Santai", "Nongkrong"]
  }
];

// =====================================
// 2. STATE DAN PENYIMPANAN
// =====================================

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showToast("Penyimpanan browser tidak tersedia.");
    return false;
  }
}

let customPlaces = loadJSON("amandolan_places", []);
if (!Array.isArray(customPlaces)) customPlaces = [];

let favorites = loadJSON("amandolan_favorites", []);
if (!Array.isArray(favorites)) favorites = [];

let places = [...defaultPlaces, ...customPlaces];
let activeCategory = "Semua";
let map;
let markerLayer;
let toastTimer;

const $ = (selector) => document.querySelector(selector);

const categoryColors = {
  Kuliner: "#ffd9c7",
  Nongkrong: "#ead7c5",
  Alam: "#d8edcc",
  Wisata: "#d7e8fa",
  Gratis: "#f3e9b8"
};

const categoryEmojis = {
  Kuliner: "🍜",
  Nongkrong: "☕",
  Alam: "🌿",
  Wisata: "🏞️"
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function rupiah(value) {
  return Number(value) === 0
    ? "Gratis"
    : "Rp" + Number(value).toLocaleString("id-ID");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

// =====================================
// 3. PETA INTERAKTIF
// =====================================

function initMap() {
  if (typeof L === "undefined") {
    $("#map").innerHTML =
      '<p style="padding:20px">Peta membutuhkan koneksi internet. Silakan muat ulang halaman.</p>';
    return;
  }

  map = L.map("map").setView([-7.9666, 112.6326], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  updateMapMarkers();

  setTimeout(() => map.invalidateSize(), 150);
}

function updateMapMarkers(list = places) {
  if (!map || !markerLayer) return;

  markerLayer.clearLayers();

  list.forEach(place => {
    if (
      !Number.isFinite(Number(place.lat)) ||
      !Number.isFinite(Number(place.lng)) ||
      place.lat === "" ||
      place.lng === ""
    ) return;

    const marker = L.marker([Number(place.lat), Number(place.lng)])
      .addTo(markerLayer);

    marker.bindPopup(`
      <div class="popup-title">${escapeHTML(place.name)}</div>
      <div>${escapeHTML(place.area)}</div>
      <div>Estimasi: ${rupiah(place.price)}</div>
      <a class="popup-link"
         href="https://www.google.com/maps/dir/?api=1&destination=${Number(place.lat)},${Number(place.lng)}"
         target="_blank" rel="noopener noreferrer">
         Petunjuk arah ↗
      </a>
    `);
  });
}

function focusPlace(id) {
  const place = places.find(item => item.id === id);
  if (!place) return;

  if (map && Number.isFinite(Number(place.lat)) &&
      Number.isFinite(Number(place.lng))) {
    map.setView([Number(place.lat), Number(place.lng)], 15);
    markerLayer.eachLayer(marker => {
      const point = marker.getLatLng();
      if (
        Math.abs(point.lat - Number(place.lat)) < 0.00001 &&
        Math.abs(point.lng - Number(place.lng)) < 0.00001
      ) {
        marker.openPopup();
      }
    });
  } else {
    showToast("Koordinat tempat ini belum tersedia.");
  }
}

// =====================================
// 4. PENCARIAN DAN FILTER
// =====================================

function getFilteredPlaces() {
  const query = $("#searchInput").value.trim().toLowerCase();

  return places.filter(place => {
    const matchesSearch = [
      place.name,
      place.category,
      place.area,
      place.description
    ].some(value => String(value || "").toLowerCase().includes(query));

    let matchesCategory = true;

    if (activeCategory === "Favorit") {
      matchesCategory = favorites.includes(place.id);
    } else if (activeCategory === "Gratis") {
      matchesCategory = Number(place.price) === 0;
    } else if (activeCategory !== "Semua") {
      matchesCategory = place.category === activeCategory;
    }

    return matchesSearch && matchesCategory;
  });
}

function renderPlaces() {
  const filtered = getFilteredPlaces();
  const grid = $("#placeGrid");

  $("#resultCount").textContent = `${filtered.length} tempat`;
  $("#emptyState").hidden = filtered.length !== 0;

  grid.innerHTML = filtered.map(place => {
    const favorite = favorites.includes(place.id);
    const tag = place.category || "Lokal";
    const bg = categoryColors[place.category] || "#e8eddf";
    const emoji = place.emoji || categoryEmojis[place.category] || "📍";

    return `
      <article class="place-card">
        <div class="place-art" style="--art-bg:${bg}">
          <span class="place-tag">${escapeHTML(tag)}</span>
          <button
            class="favorite-btn ${favorite ? "is-favorite" : ""}"
            data-favorite="${escapeHTML(place.id)}"
            aria-label="${favorite ? "Hapus dari favorit" : "Simpan ke favorit"}"
            title="${favorite ? "Hapus favorit" : "Simpan favorit"}">
            ${favorite ? "♥" : "♡"}
          </button>
          <span class="place-emoji">${escapeHTML(emoji)}</span>
        </div>

        <div class="place-content">
          <h4>${escapeHTML(place.name)}</h4>
          <span class="place-area">📍 ${escapeHTML(place.area)}</span>

          <div class="place-bottom">
            <span class="place-price">${rupiah(place.price)}</span>
            <button class="place-detail-btn"
              data-focus="${escapeHTML(place.id)}">
              Lihat peta ↗
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  updateMapMarkers(filtered);
}

// Event delegation untuk kartu tempat
$("#placeGrid").addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  const focusButton = event.target.closest("[data-focus]");

  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favorite);
  }

  if (focusButton) {
    focusPlace(focusButton.dataset.focus);
  }
});

$("#searchInput").addEventListener("input", renderPlaces);

$("#searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") renderPlaces();
});

$("#categoryFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeCategory = button.dataset.category;

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip === button);
  });

  renderPlaces();
});

// =====================================
// 5. FAVORIT
// =====================================

function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(item => item !== id);
    showToast("Tempat dihapus dari favorit.");
  } else {
    favorites.push(id);
    showToast("Tempat disimpan ke favorit ♥");
  }

  saveJSON("amandolan_favorites", favorites);
  renderPlaces();
}

// =====================================
// 6. DOLAN ROULETTE
// =====================================

function spinRoulette() {
  const budget = Number($("#budgetSelect").value);
  const mood = $("#moodSelect").value;
  const result = $("#rouletteResult");

  const candidates = places.filter(place => {
    const fitsBudget = Number(place.price) <= budget;

    const fitsMood = mood === "Semua" ||
      (Array.isArray(place.mood) && place.mood.includes(mood));

    return fitsBudget && fitsMood;
  });

  if (candidates.length === 0) {
    result.innerHTML = `
      <span class="result-emoji">🤔</span>
      <p>Belum ada tempat yang cocok. Coba naikkan budget atau ganti mood!</p>
    `;
    return;
  }

  result.innerHTML = `
    <span class="result-emoji">🎲</span>
    <p>Roda sedang memilih tempat buatmu...</p>
  `;

  const button = document.querySelector(".roulette-button");
  button.disabled = true;
  button.textContent = "LAGI MEMILIH...";

  setTimeout(() => {
    const selected = candidates[
      Math.floor(Math.random() * candidates.length)
    ];

    result.innerHTML = `
      <span class="result-emoji">${escapeHTML(selected.emoji || "✨")}</span>
      <p>
        <strong>${escapeHTML(selected.name)}</strong>
        ${escapeHTML(selected.area)}<br>
        Budget: ${rupiah(selected.price)}
        <br><button class="place-detail-btn" data-roulette-focus="${escapeHTML(selected.id)}">
          Lihat tempat ini ↗
        </button>
      </p>
    `;

    button.disabled = false;
    button.textContent = "🎲 PUTAR LAGI!";

    showToast("Ide dolanmu sudah ditemukan!");
  }, 500);
}

$("#rouletteResult").addEventListener("click", event => {
  const button = event.target.closest("[data-roulette-focus]");
  if (!button) return;

  const place = places.find(item => item.id === button.dataset.rouletteFocus);
  if (!place) return;

  document.querySelector("#explore").scrollIntoView({ behavior: "smooth" });

  // Pilih kartu tempat dan arahkan peta ke lokasinya
  activeCategory = "Semua";
  $("#searchInput").value = place.name;

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === "Semua");
  });

  renderPlaces();
  focusPlace(place.id);
});

// =====================================
// 7. MODAL TAMBAH TEMPAT
// =====================================

function openAddModal() {
  $("#addModal").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#placeName").focus(), 50);
}

function closeAddModal() {
  $("#addModal").hidden = true;
  document.body.style.overflow = "";
}

$("#addModal").addEventListener("click", event => {
  if (event.target === $("#addModal")) closeAddModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#addModal").hidden) {
    closeAddModal();
  }
});

$("#addPlaceForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("#placeName").value.trim();
  const category = $("#placeCategory").value;
  const area = $("#placeArea").value.trim();
  const price = Number($("#placePrice").value);
  const description = $("#placeDesc").value.trim();
  const latText = $("#placeLat").value.trim();
  const lngText = $("#placeLng").value.trim();

  if (!name || !area || !description ||
      !Number.isFinite(price) || price < 0) {
    showToast("Periksa kembali data tempatmu.");
    return;
  }

  // Koordinat harus diisi berpasangan dan berada pada rentang yang valid.
  const hasLat = latText !== "";
  const hasLng = lngText !== "";

  if (hasLat !== hasLng) {
    showToast("Isi latitude dan longitude sekaligus.");
    return;
  }

  let lat = null;
  let lng = null;

  if (hasLat && hasLng) {
    lat = Number(latText);
    lng = Number(lngText);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast("Koordinat tidak valid.");
      return;
    }
  }

  const newPlace = {
    id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    name,
    category,
    area,
    price,
    description,
    emoji: categoryEmojis[category] || "📍",
    color: categoryColors[category] || "#e8eddf",
    lat,
    lng,
    mood: category === "Kuliner"
      ? ["Makan"]
      : category === "Alam"
        ? ["Santai", "Petualangan"]
        : ["Santai", "Nongkrong"]
  };

  customPlaces.push(newPlace);

  if (!saveJSON("amandolan_places", customPlaces)) {
    customPlaces.pop();
    return;
  }

  places = [...defaultPlaces, ...customPlaces];

  $("#addPlaceForm").reset();
  closeAddModal();

  activeCategory = "Semua";
  $("#searchInput").value = "";

  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("active", chip.dataset.category === "Semua");
  });

  renderPlaces();
  showToast("Spot baru berhasil ditambahkan di browser ini!");

  document.querySelector("#explore").scrollIntoView({ behavior: "smooth" });
});

// =====================================
// 8. MULAI WEBSITE
// =====================================

renderPlaces();
initMap();

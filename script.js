
/* =========================================
   EVENT NGALAM
   Peta event, GPS, jarak terdekat, pencarian,
   filter kategori, dan tambah event.
   ========================================= */

// 1. INISIALISASI PETA
const map = L.map("map").setView([-8.05, 112.63], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 2. MENGAMBIL ELEMEN HTML
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const areaFilter = document.getElementById("areaFilter");
const categoryFilter = document.getElementById("categoryFilter");
const dateFilter = document.getElementById("dateFilter");
const eventList = document.getElementById("eventList");
const eventCount = document.getElementById("eventCount");
const locationStatus = document.getElementById("locationStatus");
const locateBtn = document.getElementById("locateBtn");

const formSection = document.getElementById("formSection");
const openFormBtn = document.getElementById("openFormBtn");
const closeFormBtn = document.getElementById("closeFormBtn");
const eventForm = document.getElementById("eventForm");
const formStatus = document.getElementById("formStatus");

// 3. TANGGAL OTOMATIS
function dateFromToday(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value) {
  if (!value) return "Tanggal belum tersedia";

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak valid";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

// 4. DATA EVENT DEMO
// Semua data ini hanya simulasi, bukan jadwal karnaval nyata.
const sampleEvents = [
  {
    id: "demo-1",
    name: "Simulasi Karnaval Kota Malang",
    category: "Karnaval",
    area: "Kota Malang",
    location: "Alun-Alun Merdeka, Kota Malang",
    lat: -7.9826,
    lng: 112.6308,
    date: dateFromToday(3),
    time: "15:00",
    description: "Contoh penanda karnaval untuk pengujian website.",
    source: "",
    simulated: true
  },
  {
    id: "demo-2",
    name: "Simulasi Festival Musik",
    category: "Musik",
    area: "Kabupaten Malang",
    location: "Kepanjen, Kabupaten Malang",
    lat: -8.1305,
    lng: 112.5727,
    date: dateFromToday(5),
    time: "19:00",
    description: "Contoh acara musik untuk pengujian peta.",
    source: "",
    simulated: true
  },
  {
    id: "demo-3",
    name: "Simulasi Bazar Kreatif",
    category: "Bazar",
    area: "Kota Batu",
    location: "Alun-Alun Kota Batu",
    lat: -7.8712,
    lng: 112.5267,
    date: dateFromToday(7),
    time: "09:00",
    description: "Contoh acara bazar dan UMKM.",
    source: "",
    simulated: true
  },
  {
    id: "demo-4",
    name: "Simulasi Karnaval Dampit",
    category: "Karnaval",
    area: "Kabupaten Malang",
    location: "Pusat Kecamatan Dampit",
    lat: -8.2115,
    lng: 112.7494,
    date: dateFromToday(9),
    time: "14:00",
    description: "Contoh lokasi untuk menguji pencarian karnaval.",
    source: "",
    simulated: true
  },
  {
    id: "demo-5",
    name: "Simulasi Olahraga Anak Muda",
    category: "Olahraga",
    area: "Kota Malang",
    location: "Area GOR Kota Malang",
    lat: -7.9666,
    lng: 112.6195,
    date: dateFromToday(12),
    time: "08:00",
    description: "Contoh kegiatan komunitas olahraga.",
    source: "",
    simulated: true
  }
];

// 5. MEMBACA DATA YANG DISIMPAN DI BROWSER
function loadSavedEvents() {
  try {
    const result = JSON.parse(
      localStorage.getItem("eventNgalamEvents") || "[]"
    );

    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

let userEvents = loadSavedEvents();
let userPosition = null;
let userMarker = null;
let eventMarkers = [];
let activeCategory = "";
let nearestMode = false;

function getAllEvents() {
  return [...sampleEvents, ...userEvents];
}

// 6. FUNGSI KEAMANAN DAN KOORDINAT
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function hasCoordinates(event) {
  return event.lat !== "" &&
    event.lng !== "" &&
    event.lat != null &&
    event.lng != null &&
    Number.isFinite(Number(event.lat)) &&
    Number.isFinite(Number(event.lng)) &&
    Number(event.lat) >= -90 &&
    Number(event.lat) <= 90 &&
    Number(event.lng) >= -180 &&
    Number(event.lng) <= 180;
}

// Menghitung jarak garis lurus antara GPS pengguna
// dengan titik lokasi event menggunakan rumus Haversine.
function calculateDistance(lat1, lng1, lat2, lng2) {
  const toRad = degrees => degrees * Math.PI / 180;
  const earthRadius = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return earthRadius * 2 *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));
}

function formatDistance(distance) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} meter`;
  }

  return `${distance.toFixed(1).replace(".", ",")} km`;
}

// 7. WARNA PENANDA PETA
function markerColor(category) {
  const colors = {
    Karnaval: "#315d3d",
    Musik: "#f6a45b",
    Bazar: "#4194d3",
    Olahraga: "#8765cb"
  };

  return colors[category] || "#315d3d";
}

function createEventIcon(category) {
  return L.divIcon({
    className: "custom-event-marker",
    html: `
      <div style="
        width:20px;
        height:20px;
        background:${markerColor(category)};
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 8px #0004;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
}

// 8. PETUNJUK ARAH KE EVENT
function directionURL(event) {
  const destination = hasCoordinates(event)
    ? `${event.lat},${event.lng}`
    : event.location;

  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving"
  });

  if (userPosition) {
    params.set(
      "origin",
      `${userPosition.lat},${userPosition.lng}`
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// 9. FILTER DAN PENCARIAN EVENT
function getFilteredEvents() {
  const keyword = searchInput.value.trim().toLowerCase();
  const area = areaFilter.value;
  const category = categoryFilter.value || activeCategory;
  const today = dateFromToday(0);

  let events = getAllEvents().map(event => {
    let distance = null;

    if (userPosition && hasCoordinates(event)) {
      distance = calculateDistance(
        userPosition.lat,
        userPosition.lng,
        Number(event.lat),
        Number(event.lng)
      );
    }

    return { ...event, distance };
  });

  events = events.filter(event => {
    const text = [
      event.name,
      event.category,
      event.area,
      event.location,
      event.description
    ].join(" ").toLowerCase();

    const matchKeyword = text.includes(keyword);
    const matchArea = !area || event.area === area;
    const matchCategory = !category || event.category === category;

    const matchDate =
      dateFilter.value !== "upcoming" ||
      (
        event.date >= today &&
        event.status !== "Dibatalkan"
      );

    return matchKeyword &&
      matchArea &&
      matchCategory &&
      matchDate;
  });

  // Jika GPS aktif dan mode terdekat dipilih,
  // urutkan event berdasarkan jarak garis lurus.
  if (nearestMode && userPosition) {
    events.sort((a, b) => {
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }

  return events;
}

// 10. MENAMPILKAN PETA DAN DAFTAR EVENT
function renderEvents() {
  const events = getFilteredEvents();

  eventMarkers.forEach(marker => map.removeLayer(marker));
  eventMarkers = [];

  events.forEach(event => {
    if (!hasCoordinates(event)) return;

    const marker = L.marker(
      [Number(event.lat), Number(event.lng)],
      { icon: createEventIcon(event.category) }
    ).addTo(map);

    marker.bindPopup(`
      <div style="min-width:190px">
        <strong>${escapeHTML(event.name)}</strong>
        <p>${escapeHTML(event.location)}</p>
        <p>${escapeHTML(formatDate(event.date))}</p>
        <p>${escapeHTML(event.time || "Jam belum tersedia")}</p>
        <p>${event.simulated
          ? "⚠️ Data simulasi"
          : event.verified
            ? "✓ Terverifikasi"
            : "ℹ️ Belum diverifikasi"}</p>
        ${event.distance != null
          ? `<p>📍 ${formatDistance(event.distance)} dari kamu (garis lurus)</p>`
          : ""}
      </div>
    `);

    eventMarkers.push(marker);
  });

  if (!events.length) {
    eventList.innerHTML = `
      <div class="empty-state">
        <h3>Belum ada acara yang cocok</h3>
        <p>Coba kata kunci atau filter lainnya.</p>
      </div>
    `;
  } else {
    eventList.innerHTML = events.map(event => {
      const categoryClass = {
        Karnaval: "category-karnaval",
        Musik: "category-musik",
        Bazar: "category-bazar",
        Olahraga: "category-olahraga"
      }[event.category] || "category-karnaval";

      const distanceText = event.distance != null
        ? `<div class="event-detail">
             <span>📏</span>
             <span>${formatDistance(event.distance)} dari lokasi kamu
             <br><small>Jarak garis lurus, bukan jarak jalan.</small></span>
           </div>`
        : "";

      const locationButton = hasCoordinates(event)
        ? `<button type="button" data-show-map="${escapeHTML(event.id)}">
             Lihat peta
           </button>`
        : `<button type="button" disabled>
             Koordinat belum ada
           </button>`;

      return `
        <article class="event-card"
          data-event-id="${escapeHTML(event.id)}">

          <div class="event-top">
            <span class="category-badge ${categoryClass}">
              ${escapeHTML(event.category)}
            </span>

            <span class="verification-badge ${
              event.verified ? "verified" : ""
            }">
              ${event.verified
                ? "✓ Terverifikasi"
                : event.simulated
                  ? "Data simulasi"
                  : "Belum diverifikasi"}
            </span>
          </div>

          <h3>${escapeHTML(event.name)}</h3>

          <div class="event-detail">
            <span>📍</span>
            <span>${escapeHTML(event.location)}<br>
            ${escapeHTML(event.area)}</span>
          </div>

          <div class="event-detail">
            <span>📅</span>
            <span>${escapeHTML(formatDate(event.date))}</span>
          </div>

          <div class="event-detail">
            <span>🕒</span>
            <span>${escapeHTML(event.time || "Jam belum tersedia")}</span>
          </div>

          ${distanceText}

          <p class="event-description">
            ${escapeHTML(event.description || "Belum ada keterangan.")}
          </p>

          ${event.source ? `
            <p class="event-description">
              Sumber:
              <a href="${escapeHTML(event.source)}"
                target="_blank" rel="noopener noreferrer">
                Lihat pengumuman
              </a>
            </p>
          ` : ""}

          <div class="event-actions">
            ${locationButton}
            <a href="${escapeHTML(directionURL(event))}"
              target="_blank" rel="noopener noreferrer">
              Petunjuk arah ↗
            </a>
          </div>
        </article>
      `;
    }).join("");
  }

  eventCount.textContent = `${events.length} acara`;

  // Aktifkan tombol Lihat Peta
  eventList.querySelectorAll("[data-show-map]").forEach(button => {
    button.addEventListener("click", () => {
      const event = events.find(
        item => item.id === button.dataset.showMap
      );

      if (!event || !hasCoordinates(event)) return;

      map.setView(
        [Number(event.lat), Number(event.lng)],
        15
      );

      const marker = eventMarkers.find(item => {
        const point = item.getLatLng();

        return point.lat === Number(event.lat) &&
          point.lng === Number(event.lng);
      });

      if (marker) marker.openPopup();

      document.getElementById("peta").scrollIntoView({
        behavior: "smooth"
      });
    });
  });
}

// 11. PENCARIAN
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  renderEvents();
});

searchInput.addEventListener("input", renderEvents);

areaFilter.addEventListener("change", renderEvents);
dateFilter.addEventListener("change", renderEvents);

categoryFilter.addEventListener("change", () => {
  activeCategory = "";

  document.querySelectorAll(".tag").forEach(tag => {
    tag.classList.remove("active");
  });

  renderEvents();
});

// Tombol kategori cepat
document.querySelectorAll(".tag").forEach(tag => {
  tag.addEventListener("click", () => {
    const selected = tag.dataset.category;

    activeCategory = activeCategory === selected ? "" : selected;

    document.querySelectorAll(".tag").forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.category === activeCategory
      );
    });

    categoryFilter.value = "";
    renderEvents();

    document.getElementById("peta").scrollIntoView({
      behavior: "smooth"
    });
  });
});

// 12. GPS / LOKASI PENGGUNA
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent =
      "Browser tidak mendukung fitur GPS.";
    return;
  }

  locationStatus.textContent =
    "Sedang mencari lokasi perangkat...";
  locateBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    position => {
      userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      const coords = [
        userPosition.lat,
        userPosition.lng
      ];

      if (userMarker) {
        map.removeLayer(userMarker);
      }

      userMarker = L.circleMarker(coords, {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2578e8",
        fillOpacity: 1
      }).addTo(map);

      userMarker.bindPopup("📍 Lokasi kamu saat ini");

      map.setView(coords, 13);
      userMarker.openPopup();

      nearestMode = true;
      locateBtn.disabled = false;

      locationStatus.textContent =
        `Lokasi ditemukan. Akurasi GPS sekitar ${Math.round(
          position.coords.accuracy
        )} meter. Acara diurutkan berdasarkan jarak garis lurus.`;

      renderEvents();
    },
    error => {
      const messages = {
        1: "Izin lokasi ditolak. Izinkan lokasi pada pengaturan browser.",
        2: "Lokasi tidak tersedia. Periksa GPS perangkat.",
        3: "Pencarian lokasi terlalu lama. Coba kembali."
      };

      locationStatus.textContent =
        messages[error.code] || "Gagal mengambil lokasi.";

      locateBtn.disabled = false;
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    }
  );
});

// 13. MODE EVENT TERDEKAT
// Tombol ini dibuat otomatis tanpa mengubah HTML.
const nearestBtn = document.createElement("button");

nearestBtn.type = "button";
nearestBtn.className = "location-btn";
nearestBtn.textContent = "↕ Urutkan terdekat";
nearestBtn.style.marginBottom = "14px";
nearestBtn.style.marginLeft = "8px";

locateBtn.parentElement.appendChild(nearestBtn);

nearestBtn.addEventListener("click", () => {
  if (!userPosition) {
    locationStatus.textContent =
      "Tekan Lokasi Saya terlebih dahulu untuk mengetahui acara terdekat.";
    return;
  }

  nearestMode = !nearestMode;

  nearestBtn.textContent = nearestMode
    ? "✓ Urutan terdekat aktif"
    : "↕ Urutkan terdekat";

  renderEvents();
});

// 14. FORM TAMBAH EVENT
openFormBtn.addEventListener("click", () => {
  formSection.classList.remove("hidden");
  formSection.scrollIntoView({ behavior: "smooth" });
});

closeFormBtn.addEventListener("click", () => {
  formSection.classList.add("hidden");
});

eventForm.addEventListener("submit", event => {
  event.preventDefault();

  const data = new FormData(eventForm);

  const name = String(data.get("name") || "").trim();
  const location = String(data.get("location") || "").trim();
  const date = String(data.get("date") || "");
  const time = String(data.get("time") || "");
  const source = String(data.get("source") || "").trim();

  if (!name || !location || !date || !time) {
    formStatus.textContent =
      "Lengkapi nama, lokasi, tanggal, dan jam acara.";
    return;
  }

  // Validasi tanggal tanpa bergantung pada konversi UTC
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) {
    formStatus.textContent = "Format tanggal tidak valid.";
    return;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    formStatus.textContent = "Tanggal acara tidak valid.";
    return;
  }

  if (source) {
    try {
      const url = new URL(source);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("URL tidak diizinkan");
      }
    } catch {
      formStatus.textContent =
        "Masukkan tautan sumber yang valid.";
      return;
    }
  }

  const latText = String(data.get("lat") || "").trim();
  const lngText = String(data.get("lng") || "").trim();

  const lat = latText === "" ? "" : Number(latText);
  const lng = lngText === "" ? "" : Number(lngText);

  if (
    (latText !== "" &&
      (!Number.isFinite(lat) || lat < -90 || lat > 90)) ||
    (lngText !== "" &&
      (!Number.isFinite(lng) || lng < -180 || lng > 180))
  ) {
    formStatus.textContent =
      "Latitude atau longitude tidak valid.";
    return;
  }

  if ((latText === "") !== (lngText === "")) {
    formStatus.textContent =
      "Isi kedua koordinat atau kosongkan keduanya.";
    return;
  }

  const newEvent = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: String(data.get("category")),
    area: String(data.get("area")),
    location,
    lat,
    lng,
    date,
    time,
    source,
    description: String(data.get("description") || "").trim(),
    simulated: false,
    verified: false
  };

  try {
    const updated = [...userEvents, newEvent];

    localStorage.setItem(
      "eventNgalamEvents",
      JSON.stringify(updated)
    );

    userEvents = updated;
    renderEvents();
    eventForm.reset();

    formStatus.textContent =
      "Acara tersimpan di browser ini. Data belum diverifikasi dan belum dibagikan ke publik.";
  } catch {
    formStatus.textContent =
      "Gagal menyimpan data. Periksa penyimpanan browser.";
  }
});

// 15. TAMPILKAN DATA SAAT WEBSITE DIBUKA
renderEvents();

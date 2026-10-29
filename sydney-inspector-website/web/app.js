import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, onSnapshot,
  GeoPoint, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const WINDOW_MS = 60 * 60 * 1000; // show reports from the last 60 minutes
const SYDNEY_CBD = [-33.8688, 151.2093];

const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 3500);
};

// ---- Map ----
const map = L.map("map", { zoomControl: true }).setView(SYDNEY_CBD, 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

fetch("transportLines.json")
  .then((r) => r.json())
  .then((geo) => {
    L.geoJSON(geo, {
      style: (f) => ({ color: f.properties.color, weight: 4, opacity: 0.85 }),
      onEachFeature: (f, layer) => layer.bindTooltip(f.properties.name),
    }).addTo(map);
  })
  .catch(() => {});

const reportIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ff4444;border:3px solid #fff;box-shadow:0 0 0 2px #ff4444"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
const markers = L.layerGroup().addTo(map);

const ago = (date) => {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  return mins < 1 ? "just now" : `${mins} min ago`;
};

// ---- Firebase ----
const configured = !Object.values(firebaseConfig).some((v) => String(v).includes("PASTE"));
let db = null;

if (!configured) {
  $("count").textContent = "Not connected";
  toast("Firebase config missing — fill in web/firebase-config.js");
} else {
  db = getFirestore(initializeApp(firebaseConfig));

  let current = [];
  const render = () => {
    const cutoff = Date.now() - WINDOW_MS;
    const live = current.filter((r) => r.time.getTime() > cutoff);
    markers.clearLayers();
    live.forEach((r) =>
      L.marker([r.lat, r.lng], { icon: reportIcon })
        .bindPopup(`<b>Transport inspector</b><br>Reported ${ago(r.time)}`)
        .addTo(markers)
    );
    $("count").textContent = `${live.length} report${live.length === 1 ? "" : "s"} · last 60 min`;
  };

  const q = query(
    collection(db, "reports"),
    where("timestamp", ">", Timestamp.fromMillis(Date.now() - WINDOW_MS))
  );
  onSnapshot(
    q,
    (snap) => {
      current = snap.docs
        .map((d) => d.data({ serverTimestamps: "estimate" }))
        .filter((d) => d.location && d.timestamp)
        .map((d) => ({ lat: d.location.latitude, lng: d.location.longitude, time: d.timestamp.toDate() }));
      render();
    },
    (err) => {
      console.error(err);
      $("count").textContent = "Connection error";
    }
  );
  setInterval(render, 60 * 1000); // age out old pins / refresh "x min ago"
}

// ---- Reporting ----
const dialog = $("confirm");
$("reportBtn").addEventListener("click", () => {
  if (!db) return toast("Firebase isn't configured yet.");
  dialog.showModal();
});
$("cancelBtn").addEventListener("click", () => dialog.close());

$("submitBtn").addEventListener("click", () => {
  dialog.close();
  if (!("geolocation" in navigator)) return toast("Your browser can't share location.");
  const btn = $("reportBtn");
  btn.disabled = true;
  btn.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        await addDoc(collection(db, "reports"), {
          location: new GeoPoint(coords.latitude, coords.longitude),
          timestamp: serverTimestamp(),
          type: "inspector",
        });
        map.setView([coords.latitude, coords.longitude], 16);
        toast("Inspector report submitted!");
      } catch (e) {
        console.error(e);
        toast("Couldn't submit the report. Try again.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Add Report";
      }
    },
    (err) => {
      btn.disabled = false;
      btn.textContent = "Add Report";
      toast(err.code === 1 ? "Location access is needed to report." : "Couldn't get your location.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
});

// js/app.js
const mv = document.getElementById("mv");
const titleEl = document.getElementById("sceneTitle");
const hudCodeEl = document.getElementById("hudCode");
const toastEl = document.getElementById("toast");
const barEl = document.getElementById("bar");
const loadTextEl = document.getElementById("loadText");

const qs = new URLSearchParams(location.search);
const city = (qs.get("city") || "rome").toLowerCase();
const scene = SCENES[city] || SCENES.rome;

titleEl.textContent = scene.title;
mv.src = scene.model;

// ===== UI helpers
function toast(msg, ms = 1400) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), ms);
}

function getCodeArr() {
  return JSON.parse(localStorage.getItem(STORAGE_CODE) || "[]");
}
function setCodeArr(arr) {
  localStorage.setItem(STORAGE_CODE, JSON.stringify(arr));
  renderHUD();
}
function getUsedMap() {
  return JSON.parse(localStorage.getItem(STORAGE_USED) || "{}");
}
function setUsedMap(map) {
  localStorage.setItem(STORAGE_USED, JSON.stringify(map));
}

function renderHUD() {
  const code = getCodeArr();
  const s = (code.join("").padEnd(4, "_")).split("").join(" ");
  hudCodeEl.textContent = s;
}
renderHUD();

// ===== Build hotspots
function makeHotspot(h) {
  const btn = document.createElement("button");
  btn.className = "hotspot";
  btn.setAttribute("slot", `hotspot-${h.id}`);
  btn.dataset.position = h.pos.join(" ");
  btn.dataset.normal = h.normal.join(" ");
  btn.dataset.hsid = `${city}:${h.id}`;

  // icon rất nhẹ, bạn có thể đổi thành dấu chấm nhỏ để “ẩn” hơn
  btn.innerHTML = `<span class="dot"></span>`;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const used = getUsedMap();
    if (used[btn.dataset.hsid]) {
      toast("Hotspot này bạn lấy rồi.");
      return;
    }

    if (h.decoy) {
      toast("Sai rồi 😅");
      return;
    }

    // đúng
    used[btn.dataset.hsid] = true;
    setUsedMap(used);

    const code = getCodeArr();
    if (code.length >= 4) {
      toast("Bạn đã đủ 4 số. Bấm Submit!");
      return;
    }

    code.push(h.rewardDigit);
    setCodeArr(code);
    toast(`✅ Nhận số: ${h.rewardDigit}`);
  });

  return btn;
}

scene.hotspots.forEach(h => mv.appendChild(makeHotspot(h)));

// ===== Progress / loading
mv.addEventListener("progress", (ev) => {
  const p = Math.round((ev.detail.totalProgress || 0) * 100);
  barEl.style.width = `${p}%`;
  loadTextEl.textContent = p >= 100 ? "Tải xong. Kéo để xoay, bấm hotspot để tìm số!" : `Đang tải model… ${p}%`;
});

// ===== Buttons
document.getElementById("btnHint").onclick = () => alert(scene.hint);

document.getElementById("btnClearScene").onclick = () => {
  const used = getUsedMap();
  Object.keys(used)
    .filter(k => k.startsWith(city + ":"))
    .forEach(k => delete used[k]);
  setUsedMap(used);
  toast("Đã xóa lựa chọn của cảnh này.");
};

document.getElementById("btnSubmit").onclick = () => {
  const code = getCodeArr().join("");
  if (code.length < 4) {
    alert("Chưa đủ 4 số. Hãy quay lại tìm tiếp!");
    return;
  }
  if (code === EXPECTED_CODE) {
    alert(`🎉 CHÚC MỪNG! Mã đúng: ${code}\nBạn có thể dùng mã này làm đáp án/minigame.`);
  } else {
    alert(`❌ Sai rồi. Mã bạn nhập/thu là: ${code}\nReset để chơi lại hoặc đổi vị trí số.`);
  }
};
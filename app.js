const TZ = "Asia/Ho_Chi_Minh";

// 1) Khóa theo ngày -> cùng 1 link, nhưng mỗi ngày chỉ mở đúng targetIndex
const DATE_RULES = {
  "2026-02-15": { targetIndex: 0, need: ["2"] },
  "2026-02-16": { targetIndex: 1, need: ["2"] },
  "2026-02-17": { targetIndex: 2, need: ["2","0","2"] } // ngày cuối gom đủ 2202 (tùy bạn)
};

// 2) Nơi ghi lịch sử (Google Apps Script Web App)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyh5ZuLZWhNXA75tYa0CTLzyowtb8iODbKUz_1os6pCTGmLqvUMOdP3-R2RQfbkHEZi3g/exec";

// 3) Vị trí đặt hotspot (tọa độ trên mặt phẳng target)
const ANCHORS = [
  {x:-0.38,y:0.22},{x:-0.18,y:0.24},{x:0.05,y:0.26},{x:0.24,y:0.18},{x:0.38,y:0.12},
  {x:-0.30,y:0.02},{x:-0.08,y:0.06},{x:0.14,y:0.02},{x:0.32,y:0.00},
  {x:-0.26,y:-0.16},{x:-0.02,y:-0.18},{x:0.22,y:-0.14},{x:0.38,y:-0.22},
  {x:-0.40,y:-0.28},{x:0.00,y:-0.28},{x:0.40,y:-0.28},
];

// 4) Token mỗi ngày: nhiều “REAL ứng viên” để random vị trí + nhiều FAKE mồi
// format token: {type:"REAL"/"FAKE", value:"2", group:"d15_2", text:"..." }
const TOKENS = {
  0: [ // targetIndex 0 (15/02)
    // 5 vị trí ứng viên REAL cho số 2 -> mỗi lần vào chọn 1
    {type:"REAL", value:"2", group:"d15_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d15_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d15_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d15_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d15_2", text:"Bạn nhặt được số 2!"},

    // FAKE mồi (tăng độ khó)
    {type:"FAKE", value:"X", group:"", text:"Chưa đúng chỗ 😄"},
    {type:"FAKE", value:"7", group:"", text:"Sai rồi, thử chỗ khác!"},
    {type:"FAKE", value:"Q", group:"", text:"Hotspot mồi!"},
    {type:"FAKE", value:"9", group:"", text:"Gần đúng rồi 😄"},
  ],
  1: [ // 16/02
    {type:"REAL", value:"2", group:"d16_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d16_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d16_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d16_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d16_2", text:"Bạn nhặt được số 2!"},
    {type:"FAKE", value:"A", group:"", text:"Không phải!"},
    {type:"FAKE", value:"5", group:"", text:"Mồi thôi 😄"},
    {type:"FAKE", value:"K", group:"", text:"Sai!"},
  ],
  2: [ // 17/02: 0 và 2
    // 0: nhiều ứng viên
    {type:"REAL", value:"0", group:"d17_0", text:"Bạn nhặt được số 0!"},
    {type:"REAL", value:"0", group:"d17_0", text:"Bạn nhặt được số 0!"},
    {type:"REAL", value:"0", group:"d17_0", text:"Bạn nhặt được số 0!"},

    // 2: nhiều ứng viên
    {type:"REAL", value:"2", group:"d17_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d17_2", text:"Bạn nhặt được số 2!"},
    {type:"REAL", value:"2", group:"d17_2", text:"Bạn nhặt được số 2!"},

    // FAKE mồi
    {type:"FAKE", value:"8", group:"", text:"Mồi 😄"},
    {type:"FAKE", value:"Z", group:"", text:"Chưa đúng!"},
    {type:"FAKE", value:"3", group:"", text:"Sai!"},
    {type:"FAKE", value:"P", group:"", text:"Hotspot mồi!"},
  ]
};

function vnDayISO(){
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit" });
  return fmt.format(new Date());
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const r=crypto.getRandomValues(new Uint32Array(1))[0];
    const j=r%(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function posStr(p,z=0.02){ return `${p.x} ${p.y} ${z}`; }

const state = {
  day: vnDayISO(),
  rule: null,
  built: new Set(),
  found: [],
  foundSet: new Set(),
  activeTarget: null
};

const $ = (id)=>document.getElementById(id);

document.addEventListener("DOMContentLoaded", ()=>{
  state.rule = DATE_RULES[state.day] || null;

  $("hudDay").textContent = state.rule
    ? `Hôm nay: ${state.day} | Target: #${state.rule.targetIndex}`
    : `Hôm nay: ${state.day} (ngoài lịch game)`;
  $("hudMsg").textContent = "Chĩa camera vào ảnh thành phố đúng ngày.";
  $("hudFound").textContent = "Đã nhặt: (chưa có)";

  const scene = document.querySelector("a-scene");
  const ar = scene.systems["mindar-image-system"];

  $("btnStart").onclick = async ()=>{
    $("start").classList.add("hidden");
    $("hud").classList.remove("hidden");
    try { await ar.start(); } catch(e){ alert("Không bật camera. Hãy cấp quyền camera."); }
  };

  $("btnClose").onclick = ()=> $("modal").classList.add("hidden");

  $("btnSubmit").onclick = ()=>{
    $("modalInfo").innerHTML = `Bạn đã nhặt: <b>${state.found.join("")}</b>`;
    $("modal").classList.remove("hidden");
    $("form").answer.value = state.found.join("");
  };

  $("form").addEventListener("submit", (ev)=>{
    ev.preventDefault();
    const f = ev.target;
    if ((f.hp.value||"").trim()) return;

    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_")){
      alert("Chưa cấu hình APPS_SCRIPT_URL trong app.js");
      return;
    }

    const payload = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      dayClient: state.day,
      targetIndex: String(state.activeTarget ?? ""),
      answer: f.answer.value.trim(),
      found: state.found.join(""),
      userAgent: navigator.userAgent
    };

    const body = new URLSearchParams(payload).toString();
    const ok = navigator.sendBeacon(APPS_SCRIPT_URL, new Blob([body], {type:"application/x-www-form-urlencoded"}));

    if (ok){
      alert("Đã gửi! Hệ thống đã ghi nhận.");
      $("modal").classList.add("hidden");
      f.reset();
    } else alert("Gửi thất bại. Thử lại.");
  });

  bindTarget(0);
  bindTarget(1);
  bindTarget(2);

  function bindTarget(idx){
    const t = $(`t${idx}`);
    const m = $(`m${idx}`);

    t.addEventListener("targetFound", ()=>{
      state.activeTarget = idx;
      m.setAttribute("visible","true");

      // sai ngày / ngoài lịch -> khóa hotspot REAL
      if (!state.rule || state.rule.targetIndex !== idx){
        hideAllHotspots(idx);
        $("hudMsg").textContent = "Ảnh này bị khóa (không đúng ngày).";
        return;
      }

      if (!state.built.has(idx)){
        buildHotspots(idx);
        state.built.add(idx);
      }
      showAllHotspots(idx);
      $("hudMsg").textContent = "Bấm hotspot để nhặt mảnh (có mồi).";
    });

    t.addEventListener("targetLost", ()=>{
      m.setAttribute("visible","false");
      hideAllHotspots(idx);
      $("hudMsg").textContent = "Mất tracking. Chĩa lại vào ảnh.";
    });
  }

  function buildHotspots(idx){
    const container = $(`hs${idx}`);
    container.innerHTML = "";

    // random vị trí: trộn anchors mỗi lần load trang
    const anchors = shuffle(ANCHORS);

    // random chọn 1 REAL cho mỗi group (d15_2 / d17_0 / d17_2...)
    const tokens = TOKENS[idx] || [];
    const groups = {};
    tokens.forEach((t,i)=>{
      if (t.type==="REAL" && t.group){
        (groups[t.group] ||= []).push({token:t, i});
      }
    });
    const chosenRealIndex = new Set();
    Object.keys(groups).forEach(g=>{
      const list = groups[g];
      const pick = list[crypto.getRandomValues(new Uint32Array(1))[0] % list.length];
      chosenRealIndex.add(pick.i);
    });

    tokens.forEach((tok, i)=>{
      const a = anchors[i % anchors.length];

      // nếu REAL mà không phải cái được chọn -> biến thành FAKE (ẩn luôn hoặc cho mồi)
      let effective = tok;
      if (tok.type==="REAL" && tok.group && !chosenRealIndex.has(i)){
        effective = {type:"HIDDEN", value: tok.value, text: tok.text}; // ẩn hẳn
      }

      const hs = document.createElement("a-plane");
      hs.setAttribute("class","clickable");
      hs.setAttribute("width","0.12");
      hs.setAttribute("height","0.12");
      hs.setAttribute("material","src:#hs; transparent:true; opacity:0.95");
      hs.setAttribute("position", posStr(a, 0.03));
      hs.setAttribute("visible","false");

      const label = document.createElement("a-text");
      label.setAttribute("value", effective.value);
      label.setAttribute("align","center");
      label.setAttribute("color","#FFFFFF");
      label.setAttribute("width","2");
      label.setAttribute("position", `${a.x} ${a.y+0.12} 0.03`);
      label.setAttribute("visible","false");

      hs.addEventListener("click", ()=>{
        if (!state.rule || state.rule.targetIndex !== idx) return;

        if (effective.type==="HIDDEN"){
          hs.setAttribute("visible","false");
          return;
        }

        label.setAttribute("visible","true");
        alert(effective.text);

        if (effective.type==="REAL"){
          // nhặt digit thật (tránh nhặt trùng)
          const key = `${state.day}_${idx}_${effective.value}_${effective.text}`;
          if (!state.foundSet.has(key)){
            state.foundSet.add(key);
            state.found.push(effective.value);
          }
          $("hudFound").textContent = `Đã nhặt: ${state.found.join("")}`;

          // bật submit nếu đủ “need”
          const need = state.rule.need || [];
          const ok = need.every(d => state.found.includes(d));
          if (ok) $("btnSubmit").disabled = false;
        }
      });

      // ẩn hẳn hotspot HIDDEN
      if (effective.type==="HIDDEN"){
        hs.style.display = "none";
      }

      container.appendChild(hs);
      container.appendChild(label);
    });
  }

  function showAllHotspots(idx){
    const container = $(`hs${idx}`);
    [...container.children].forEach(el => el.setAttribute("visible","true"));
  }
  function hideAllHotspots(idx){
    const container = $(`hs${idx}`);
    [...container.children].forEach(el => el.setAttribute("visible","false"));
  }
});
document.querySelector("#t0").addEventListener("targetFound", () => {
  document.getElementById("hudMsg").textContent = "FOUND targetIndex 0";
  document.querySelector("#test0").setAttribute("visible", "true");
});
document.querySelector("#t0").addEventListener("targetLost", () => {
  document.getElementById("hudMsg").textContent = "LOST targetIndex 0";
  document.querySelector("#test0").setAttribute("visible", "false");
});

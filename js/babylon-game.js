(function () {
  const canvas = document.getElementById("renderCanvas");
  const titleEl = document.getElementById("sceneTitle");
  const hudCodeEl = document.getElementById("hudCode");
  const toastEl = document.getElementById("toast");
  const barEl = document.getElementById("bar");
  const loadTextEl = document.getElementById("loadText");

  // ---- Safe toast
  function toast(msg, ms = 1400) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  // ---- URL + scene config
  const qs = new URLSearchParams(location.search);
  const city = (qs.get("city") || "rome").toLowerCase();
  if (typeof SCENES === "undefined") {
  alert("Không tìm thấy SCENES. Kiểm tra play.html đã load js/scenes.js chưa (và phải load TRƯỚC babylon-game.js).");
  return;
}

const sceneCfg = SCENES[city] || SCENES.rome;

  const rootUrl = "./scenes/";
  const fileName = sceneCfg.file || "tokyo.glb";

  console.log("CITY =", city);
  console.log("sceneCfg =", sceneCfg);
  console.log("Loading =", rootUrl + fileName);

  if (titleEl) titleEl.textContent = sceneCfg.title || city.toUpperCase();

  // ---- LocalStorage helpers
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
    if (!hudCodeEl) return;
    const code = getCodeArr();
    hudCodeEl.textContent = (code.join("").padEnd(4, "_")).split("").join(" ");
  }
  renderHUD();

  // ===== Babylon init
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.06, 0.12, 1);

  const camera = new BABYLON.ArcRotateCamera(
    "cam",
    Math.PI / 2,
    Math.PI / 2.5,
    40,
    new BABYLON.Vector3(0, 2, 0),
    scene
  );

  camera.attachControl(canvas, true);

  // ✅ zoom/drag ổn định hơn
  canvas.style.touchAction = "none";
  camera.wheelPrecision = 20;
  camera.pinchPrecision = 200;
  camera.minZ = 0.05;
  camera.maxZ = 100000;

  const light = new BABYLON.HemisphericLight("h", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 1.0;

  // GUI for hotspot buttons
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);

  // Material cho hotspot
  const hsMat = new BABYLON.StandardMaterial("hsMat", scene);
  hsMat.emissiveColor = new BABYLON.Color3(1, 0.48, 0);
  hsMat.disableLighting = true;
  hsMat.alpha = 0.95;
  hsMat.zOffset = -2;

  // ===== Tool lấy tọa độ: bấm C bật/tắt, click để log
  let capture = false;
  window.addEventListener("keydown", (e) => {
    if (e.key && e.key.toLowerCase() === "c") {
      capture = !capture;
      toast(capture ? "BẬT lấy tọa độ: click vào cảnh" : "TẮT lấy tọa độ");
    }
  });

  scene.onPointerObservable.add((pi) => {
    if (!capture) return;
    if (pi.type !== BABYLON.PointerEventTypes.POINTERDOWN) return;

    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (pick?.hit && pick.pickedPoint) {
      console.log("MESH:", pick.pickedMesh?.name);
      console.log("PICKED POINT:", pick.pickedPoint.toString());
      toast("Đã log tọa độ vào Console (F12)");
    }
  });

  // ===== Hotspot click logic
  function handleHotspotClick(h, key, btn) {
    const used = getUsedMap();
    if (used[key]) return toast("Hotspot này bạn lấy rồi.");

    if (h.decoy) return toast("Sai rồi 😅");

    used[key] = true;
    setUsedMap(used);
    if (btn) btn.alpha = 0.18;

    const code = getCodeArr();
    if (code.length >= 4) return toast("Bạn đã đủ 4 số. Bấm Submit!");

    code.push(h.rewardDigit);
    setCodeArr(code);
    toast(`✅ Nhận số: ${h.rewardDigit}`);
  }

  // ===== Build hotspots (luôn hiện đủ)
  function buildHotspots() {
    const used = getUsedMap();

    // scale theo camera radius để không quá nhỏ
    const markerSize = Math.max(1.5, camera.radius * 0.03);
    const liftY = markerSize * 0.5;
    const px = Math.round(markerSize * 12);

    console.log("HOTSPOTS COUNT:", sceneCfg.hotspots.length, "markerSize:", markerSize);

    sceneCfg.hotspots.forEach((h) => {
      const key = `${city}:${h.id}`;

      const s = BABYLON.MeshBuilder.CreateSphere(`hs_${h.id}`, { diameter: markerSize }, scene);
      s.position = new BABYLON.Vector3(h.pos[0], h.pos[1] + liftY, h.pos[2]);
      s.material = hsMat;
      s.isPickable = true;

      // Click trực tiếp marker 3D
      s.actionManager = new BABYLON.ActionManager(scene);
      s.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () =>
          handleHotspotClick(h, key, btn)
        )
      );

      // GUI button bám theo marker
      const btn = BABYLON.GUI.Button.CreateSimpleButton(`btn_${h.id}`, h.id);
      btn.width = `${px}px`;
      btn.height = `${px}px`;
      btn.thickness = 0;
      btn.color = "#ffb36b";
      btn.fontSize = Math.max(12, Math.round(px * 0.35));
      btn.background = "rgba(255,122,0,0.22)";
      btn.cornerRadius = 999;
      btn.alpha = used[key] ? 0.18 : 1;

      // ✅ FIX lỗi root-level: addControl trước, link sau
      ui.addControl(btn);
      btn.linkWithMesh(s);
      btn.linkOffsetY = -10;

      btn.onPointerClickObservable.add(() => handleHotspotClick(h, key, btn));
    });

    console.log(
      "HOTSPOTS CREATED:",
      scene.meshes.filter((m) => m.name.startsWith("hs_")).length
    );
  }

  // ===== Load GLB
  async function loadGLB() {
    try {
      if (loadTextEl) loadTextEl.textContent = "Đang tải GLB…";
      if (barEl) barEl.style.width = "0%";

      const onProgress = (evt) => {
        if (!evt.lengthComputable) return;
        const p = Math.round((evt.loaded / evt.total) * 100);
        if (barEl) barEl.style.width = p + "%";
        if (loadTextEl) loadTextEl.textContent = `Đang tải GLB… ${p}%`;
      };

      const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, fileName, scene, onProgress);

      // ✅ pick được toàn bộ mesh
      result.meshes.forEach((m) => (m.isPickable = true));

      // ✅ Fit camera CHUẨN (không dùng biến min/max lỗi nữa)
      const meshes = result.meshes.filter((m) => m.getTotalVertices && m.getTotalVertices() > 0);

      if (meshes.length) {
        // tính bounding tổng
        let minV = new BABYLON.Vector3(
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY
        );
        let maxV = new BABYLON.Vector3(
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY
        );

        for (const m of meshes) {
          m.computeWorldMatrix(true);
          const b = m.getBoundingInfo().boundingBox;
          minV = BABYLON.Vector3.Minimize(minV, b.minimumWorld);
          maxV = BABYLON.Vector3.Maximize(maxV, b.maximumWorld);
        }

        const center = minV.add(maxV).scale(0.5);
        const size = maxV.subtract(minV).length();

        camera.setTarget(center);
        camera.alpha = Math.PI / 2;
        camera.beta = 1.15;
        camera.radius = Math.max(10, size * 0.9);

        camera.lowerRadiusLimit = camera.radius * 0.25;
        camera.upperRadiusLimit = camera.radius * 3.0;

        camera.minZ = 0.05;
        camera.maxZ = camera.radius * 80;
      }

      if (barEl) barEl.style.width = "100%";
      if (loadTextEl) loadTextEl.textContent = "Tải xong. Kéo để xoay/zoom, bấm hotspot để tìm số!";
      buildHotspots();
    } catch (err) {
      console.error(err);
      alert("Lỗi load GLB. Mở F12 > Console chụp lỗi gửi mình.");
    }
  }

  // ===== Buttons (có check tồn tại để khỏi crash)
  const btnHint = document.getElementById("btnHint");
  if (btnHint) btnHint.onclick = () => alert(sceneCfg.hint);

  const btnClearScene = document.getElementById("btnClearScene");
  if (btnClearScene)
    btnClearScene.onclick = () => {
      const used = getUsedMap();
      Object.keys(used)
        .filter((k) => k.startsWith(city + ":"))
        .forEach((k) => delete used[k]);
      setUsedMap(used);
      toast("Đã xóa lựa chọn của cảnh này. Refresh để hiện lại hotspot.");
      location.reload();
    };

  const btnSubmit = document.getElementById("btnSubmit");
  if (btnSubmit)
    btnSubmit.onclick = () => {
      const code = getCodeArr().join("");
      if (code.length < 4) return alert("Chưa đủ 4 số. Hãy quay lại tìm tiếp!");
      if (code === EXPECTED_CODE) alert("🎉 CHÚC MỪNG! Mã đúng: " + code);
      else alert("❌ Sai rồi. Mã bạn thu là: " + code + "\nBấm Reset ở trang chính để chơi lại.");
    };

  // ===== Render loop
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  loadGLB();
})();
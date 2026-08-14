(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const mobileMenu = document.querySelector(".mobile-menu");

  const syncHeader = () => {
    header?.classList.toggle("scrolled", window.scrollY > 12);
  };
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    mobileMenu?.classList.toggle("open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  document.querySelectorAll(".mobile-menu a").forEach(link => {
    link.addEventListener("click", () => {
      menuButton?.setAttribute("aria-expanded", "false");
      mobileMenu?.classList.remove("open");
      document.body.classList.remove("menu-open");
    });
  });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.13 })
    : null;

  document.querySelectorAll(".reveal").forEach(el => {
    if (observer) observer.observe(el);
    else el.classList.add("visible");
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ---------------------------------------------------------------------------
  // Dynamic seasonal-risk chart
  // Replace these arrays with your API response when the prediction endpoint
  // is available. Expected format: 12 values from January through December.
  // ---------------------------------------------------------------------------
  const datasets = {
    mpox: {
      values: [33, 50, 0, 0, 0, 33, 40, 50, 0, 0, 33, 25],
      label: "Seasonal"
    },
    cholera: {
      values: [15, 18, 22, 34, 55, 72, 81, 74, 51, 35, 24, 18],
      label: "Rain-season rise"
    },
    lassa: {
      values: [71, 63, 48, 31, 22, 16, 13, 17, 24, 36, 51, 66],
      label: "Dry-season rise"
    }
  };

  const canvas = document.getElementById("risk-chart");
  const tooltip = document.getElementById("chart-tooltip");
  const peakValue = document.getElementById("peak-value");
  const profileLabel = document.getElementById("profile-label");
  const pills = [...document.querySelectorAll(".chart-pill")];

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let activeKey = "mpox";
  let current = datasets[activeKey].values.map(() => 0);
  let target = datasets[activeKey].values.slice();
  let points = [];
  let raf = 0;
  let resizeRaf = 0;

  const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = getDpr();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function roundedPath(pointsList) {
    if (!pointsList.length) return;
    ctx.moveTo(pointsList[0].x, pointsList[0].y);
    for (let i = 0; i < pointsList.length - 1; i++) {
      const p = pointsList[i];
      const next = pointsList[i + 1];
      const midX = (p.x + next.x) / 2;
      ctx.bezierCurveTo(midX, p.y, midX, next.y, next.x, next.y);
    }
  }

  function drawGrid(width, height, pad) {
    ctx.save();
    ctx.strokeStyle = "rgba(29, 28, 54, 0.08)";
    ctx.lineWidth = 1;
    ctx.font = '10px "DM Sans", sans-serif';
    ctx.fillStyle = "rgba(91, 91, 108, .58)";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    [100, 75, 50, 25, 0].forEach(value => {
      const y = pad.top + (100 - value) / 100 * (height - pad.top - pad.bottom);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(value + "%", pad.left - 8, y);
    });
    ctx.restore();
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);
    const pad = { top: 18, right: 10, bottom: 10, left: 40 };
    const graphW = width - pad.left - pad.right;
    const graphH = height - pad.top - pad.bottom;

    drawGrid(width, height, pad);

    points = current.map((value, index) => ({
      x: pad.left + (index / 11) * graphW,
      y: pad.top + (1 - value / 100) * graphH,
      value
    }));

    const gradient = ctx.createLinearGradient(0, pad.top, 0, height);
    gradient.addColorStop(0, "rgba(91, 61, 245, .24)");
    gradient.addColorStop(1, "rgba(91, 61, 245, .015)");

    ctx.save();
    ctx.beginPath();
    roundedPath(points);
    ctx.lineTo(points[points.length - 1].x, height - pad.bottom);
    ctx.lineTo(points[0].x, height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    roundedPath(points);
    ctx.strokeStyle = "#5b3df5";
    ctx.lineWidth = 2.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(91, 61, 245, .22)";
    ctx.shadowBlur = 9;
    ctx.stroke();
    ctx.restore();

    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "#5b3df5";
      ctx.stroke();
    });
  }

  function animateTo(nextValues) {
    target = nextValues.slice();
    cancelAnimationFrame(raf);

    const start = performance.now();
    const duration = 680;
    const from = current.slice();

    function step(now) {
      const raw = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      current = from.map((v, i) => v + (target[i] - v) * eased);
      draw();

      if (raw < 1) raf = requestAnimationFrame(step);
      else current = target.slice();
    }
    raf = requestAnimationFrame(step);
  }

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      const key = pill.dataset.series;
      if (!datasets[key] || key === activeKey) return;
      activeKey = key;
      pills.forEach(p => p.classList.toggle("active", p === pill));

      const data = datasets[key];
      const peak = Math.max(...data.values);
      if (peakValue) peakValue.textContent = peak + "%";
      if (profileLabel) profileLabel.textContent = data.label;
      animateTo(data.values);
    });
  });

  function pointerToPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const x = clientX - rect.left;

    if (!points.length) return null;
    return points.reduce((best, point, index) => {
      const distance = Math.abs(point.x - x);
      return distance < best.distance ? { point, index, distance } : best;
    }, { point: points[0], index: 0, distance: Infinity });
  }

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function showTooltip(event) {
    if (!tooltip) return;
    const hit = pointerToPoint(event);
    if (!hit) return;

    tooltip.innerHTML = `<strong>${months[hit.index]}</strong><br>${Math.round(hit.point.value)}% likelihood`;
    tooltip.style.left = hit.point.x + "px";
    tooltip.style.top = hit.point.y + "px";
    tooltip.style.opacity = "1";
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.opacity = "0";
  }

  canvas.addEventListener("mousemove", showTooltip);
  canvas.addEventListener("mouseleave", hideTooltip);
  canvas.addEventListener("touchstart", showTooltip, { passive: true });
  canvas.addEventListener("touchmove", showTooltip, { passive: true });
  canvas.addEventListener("touchend", hideTooltip);

  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resizeCanvas);
  }, { passive: true });

  resizeCanvas();
  setTimeout(() => animateTo(datasets.mpox.values), 280);
})();

const destinations = [
  {
    "region": "CHINA · GUANGXI",
    "name": "桂林 · 漓江",
    "title": "GUILIN<br>LI RIVER",
    "description": "从漓江的水光出发，<br>把中国的山海慢慢写进旅程。",
    "image": "/shanhai-travel/assets/province-ai/guangxi/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · XINJIANG",
    "name": "新疆 · 喀纳斯",
    "title": "KANAS<br>XINJIANG",
    "description": "走进北疆的山林与湖泊，<br>在辽阔天地里慢慢呼吸。",
    "image": "/shanhai-travel/assets/province-ai/xinjiang/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · HAINAN",
    "name": "海南 · 海岸",
    "title": "SANYA<br>COAST",
    "description": "沿着海岸慢慢走，<br>把阳光和海风装进旅程。",
    "image": "/shanhai-travel/assets/province-ai/hainan/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · SICHUAN",
    "name": "四川 · 九寨沟",
    "title": "JIUZHAIGOU<br>VALLEY",
    "description": "让山色映进湖水，<br>在五彩的风景里放慢脚步。",
    "image": "/shanhai-travel/assets/province-ai/sichuan/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · GANSU",
    "name": "甘肃 · 敦煌",
    "title": "DUNHUANG<br>GANSU",
    "description": "穿过大漠的金色起伏，<br>在风沙与落日间遇见远方。",
    "image": "/shanhai-travel/assets/province-ai/gansu/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · YUNNAN",
    "name": "云南 · 丽江",
    "title": "LIJIANG<br>OLD TOWN",
    "description": "雪山在远处，古城在眼前，<br>把时光留给云南的慢生活。",
    "image": "/shanhai-travel/assets/province-ai/yunnan/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · HUNAN",
    "name": "湖南 · 张家界",
    "title": "ZHANGJIAJIE<br>HUNAN",
    "description": "穿过云海与奇峰，<br>在山间遇见辽阔的清晨。",
    "image": "/shanhai-travel/assets/hunan-mountain-hero.png",
    "position": "center center"
  },
  {
    "region": "CHINA · BEIJING",
    "name": "北京 · 长城",
    "title": "GREAT WALL<br>BEIJING",
    "description": "沿着蜿蜒的城墙远望，<br>把山河与时光一同收进眼底。",
    "image": "/shanhai-travel/assets/province-ai/beijing/02.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · ZHEJIANG",
    "name": "浙江 · 西湖",
    "title": "WEST LAKE<br>HANGZHOU",
    "description": "慢慢走过湖边，<br>看荷花与晚霞落在水面。",
    "image": "/shanhai-travel/assets/province-ai/zhejiang/01.jpg",
    "position": "center center"
  },
  {
    "region": "CHINA · INNER MONGOLIA",
    "name": "内蒙古 · 呼伦贝尔",
    "title": "HULUNBUIR<br>GRASSLAND",
    "description": "风吹过草原与河流，<br>让视野一直延伸到天边。",
    "image": "/shanhai-travel/assets/province-ai/inner-mongolia/01.jpg",
    "position": "center center"
  }
];

const viewport = document.getElementById("cardsViewport");
const cards = [...document.querySelectorAll(".destination-card")];
const scene = document.querySelector(".scene");
const sceneImage = document.getElementById("sceneImage");
const sceneLaunchImage = document.getElementById("sceneLaunchImage");
const region = document.getElementById("region");

const title = document.getElementById("destinationTitle");
const description = document.getElementById("destinationDescription");
const currentNumber = document.getElementById("currentNumber");
const progressBar = document.getElementById("progressBar");
progressBar.style.width = `${100 / destinations.length}%`;
let currentIndex = 0;
let imageRequest = 0;
let sceneLaunchToken = 0;
let sceneLaunchTimer;
let scrollTimer;
let dragStart = null;
let dragged = false;
let ignoreScrollUntil = 0;
let sceneMorph = null;
let sceneMorphAttempted = false;

function getSceneMorph() {
  if (!sceneMorphAttempted) {
    sceneMorphAttempted = true;
    try { sceneMorph = window.createSceneMorph?.(scene, sceneLaunchImage) || null; } catch { sceneMorph = null; }
  }
  return sceneMorph;
}

function renderMaskedTitle(item) {
  const lines = item.title.split(/<br\s*\/?\s*>/i).map((line) => line.trim());
  const words = lines.map((line, index) => {
    const word = document.createElement("span");
    word.className = "masked-heading__word";
    word.textContent = line;
    word.setAttribute("aria-hidden", "true");
    word.style.setProperty("--word-index", index);
    return word;
  });

  title.classList.add("masked-heading");
  title.setAttribute("aria-label", lines.join(" "));
  title.style.setProperty("--title-image", `url("${item.image}")`);
  title.replaceChildren(...words);
  fitEnglishTitle();
}

// Keep full place names within the title column at every viewport size.
function fitEnglishTitle() {
  const words = [...title.querySelectorAll('.masked-heading__word')];
  words.forEach(word => word.style.removeProperty('font-size'));
  const available = title.clientWidth;
  if (!available) return;
  const widest = Math.max(...words.map(word => word.getBoundingClientRect().width), 1);
  const scale = Math.min(1, available / widest);
  words.forEach((word, index) => word.style.fontSize = (scale * (index === 0 ? 1 : .72)) + 'em');
}
new ResizeObserver(fitEnglishTitle).observe(title.parentElement);
document.fonts?.ready.then(fitEnglishTitle);

const titleMotion = { visible: false, raf: 0, x: 0, y: 0, targetX: 0, targetY: 0 };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function stopTitleMotion() {
  cancelAnimationFrame(titleMotion.raf);
  titleMotion.raf = 0;
}

function animateTitle(now) {
  if (!titleMotion.visible || reducedMotion.matches) {
    stopTitleMotion();
    return;
  }
  const driftX = Math.sin(now * 0.00023) * 9;
  const driftY = Math.cos(now * 0.00017) * 5;
  titleMotion.x += (titleMotion.targetX + driftX - titleMotion.x) * 0.08;
  titleMotion.y += (titleMotion.targetY + driftY - titleMotion.y) * 0.08;
  title.style.setProperty("--title-shift-x", `${titleMotion.x.toFixed(1)}px`);
  title.style.setProperty("--title-shift-y", `${titleMotion.y.toFixed(1)}px`);
  titleMotion.raf = requestAnimationFrame(animateTitle);
}

function wakeTitleMotion() {
  if (titleMotion.visible && !reducedMotion.matches && !titleMotion.raf) {
    titleMotion.raf = requestAnimationFrame(animateTitle);
  }
}

new IntersectionObserver(([entry]) => {
  titleMotion.visible = entry.isIntersecting && !document.hidden;
  if (titleMotion.visible) wakeTitleMotion();
  else stopTitleMotion();
}).observe(title);

title.addEventListener("pointermove", (event) => {
  const bounds = title.getBoundingClientRect();
  titleMotion.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * -22;
  titleMotion.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * -12;
  wakeTitleMotion();
});

title.addEventListener("pointerleave", () => {
  titleMotion.targetX = 0;
  titleMotion.targetY = 0;
});

reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    stopTitleMotion();
    title.style.setProperty("--title-shift-x", "0px");
    title.style.setProperty("--title-shift-y", "0px");
  } else wakeTitleMotion();
});

document.addEventListener("visibilitychange", () => {
  titleMotion.visible = !document.hidden && title.getBoundingClientRect().bottom > 0;
  if (titleMotion.visible) wakeTitleMotion();
  else stopTitleMotion();
});

renderMaskedTitle(destinations[0]);

function indexFromScroll() {
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;
  return maxScroll > 0
    ? Math.round((viewport.scrollLeft / maxScroll) * (destinations.length - 1))
    : currentIndex;
}

function cancelSceneLaunch() {
  sceneLaunchToken += 1;
  clearTimeout(sceneLaunchTimer);
  if (!sceneLaunchImage.hidden) {
    sceneImage.src = sceneLaunchImage.src;
    sceneImage.style.objectPosition = sceneLaunchImage.style.objectPosition;
    sceneImage.classList.remove("is-changing");
  }
  sceneLaunchImage.hidden = true;
  sceneLaunchImage.removeAttribute("style");
}

function launchSceneFromCard(item, cardRect, cardImagePosition, withMorph = false) {
  const sceneRect = scene.getBoundingClientRect();
  const token = ++sceneLaunchToken;
  const from = {
    left: cardRect.left - sceneRect.left,
    top: cardRect.top - sceneRect.top,
    width: cardRect.width,
    height: cardRect.height,
  };
  const startX = Number.parseFloat(cardImagePosition) || 50;
  const startedAt = performance.now();
  const duration = 820;
  sceneLaunchImage.src = item.image;
  sceneLaunchImage.style.objectPosition = cardImagePosition;
  sceneLaunchImage.style.left = `${from.left}px`;
  sceneLaunchImage.style.top = `${from.top}px`;
  sceneLaunchImage.style.width = `${cardRect.width}px`;
  sceneLaunchImage.style.height = `${cardRect.height}px`;
  sceneLaunchImage.style.borderRadius = "10px";
  sceneLaunchImage.style.transform = "scale(1)";
  sceneLaunchImage.hidden = false;

  const frame = () => {
    if (token !== sceneLaunchToken) return;
    const progress = reducedMotion.matches ? 1 : Math.min(1, (performance.now() - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 4;
    sceneLaunchImage.style.left = `${(from.left * (1 - eased)).toFixed(2)}px`;
    sceneLaunchImage.style.top = `${(from.top * (1 - eased)).toFixed(2)}px`;
    sceneLaunchImage.style.width = `${(from.width + (sceneRect.width - from.width) * eased).toFixed(2)}px`;
    sceneLaunchImage.style.height = `${(from.height + (sceneRect.height - from.height) * eased).toFixed(2)}px`;
    sceneLaunchImage.style.borderRadius = `${(10 * (1 - eased)).toFixed(2)}px`;
    sceneLaunchImage.style.transform = `scale(${(1 + .025 * eased).toFixed(4)})`;
    sceneLaunchImage.style.objectPosition = `${(startX + (50 - startX) * eased).toFixed(2)}% center`;
    if (withMorph) sceneLaunchImage.style.opacity = String(Math.max(0, 1 - Math.max(0, progress - .08) / .42));
    if (progress < 1) {
      sceneLaunchTimer = window.setTimeout(frame, 16);
      return;
    }
    sceneImage.src = item.image;
    sceneImage.style.objectPosition = item.position;
    sceneLaunchImage.hidden = true;
    sceneLaunchImage.removeAttribute("style");
  };
  sceneLaunchTimer = window.setTimeout(frame, reducedMotion.matches ? 0 : 16);
}

function showDestination(index, scrollCard = true, sourceCard = null) {
  sceneImage.classList.remove("cinematic-enter");
  const cardRect = sourceCard?.getBoundingClientRect();
  const cardImagePosition = sourceCard ? getComputedStyle(sourceCard.querySelector("img")).objectPosition : null;
  cancelSceneLaunch();
  sceneMorph?.cancel();
  currentIndex = (index + destinations.length) % destinations.length;
  const item = destinations[currentIndex];

  cards.forEach((card, cardIndex) => {
    const active = cardIndex === currentIndex;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", String(active));
  });

  region.textContent = item.region;

  renderMaskedTitle(item);
  description.innerHTML = item.description;
  currentNumber.textContent = String(currentIndex + 1).padStart(2, "0");
  progressBar.style.width = `${((currentIndex + 1) / destinations.length) * 100}%`;

  const request = ++imageRequest;
  const fallback = () => {
    if (request !== imageRequest) return;
    if (sourceCard && !reducedMotion.matches) {
      sceneImage.classList.remove("is-changing");
      launchSceneFromCard(item, cardRect, cardImagePosition);
      return;
    }
    if (!sceneImage.src.endsWith(item.image.replace("./", "/"))) {
      if (reducedMotion.matches) {
        sceneImage.src = item.image;
        sceneImage.style.objectPosition = item.position;
      } else {
        sceneImage.classList.add("is-changing");
        const nextImage = new Image();
        nextImage.onload = () => {
          if (request !== imageRequest) return;
          sceneImage.src = item.image;
          sceneImage.style.objectPosition = item.position;
          requestAnimationFrame(() => sceneImage.classList.remove("is-changing"));
        };
        nextImage.onerror = () => sceneImage.classList.remove("is-changing");
        nextImage.src = item.image;
      }
    }
  };
  const sameImage = sceneImage.src.endsWith(item.image.replace("./", "/"));
  const morph = !sameImage && !reducedMotion.matches ? getSceneMorph() : null;
  if (morph) {
    const currentPosition = getComputedStyle(sceneImage).objectPosition;
    morph.run(sceneImage.src, item.image, {
      currentPosition,
      nextPosition: item.position,
      onStart: () => { if (request === imageRequest && sourceCard) launchSceneFromCard(item, cardRect, cardImagePosition, true); },
      onFinish: () => { if (request === imageRequest) { sceneImage.src = item.image; sceneImage.style.objectPosition = item.position; sceneImage.classList.remove("is-changing"); } },
      onError: fallback,
    });
  } else fallback();

  if (scrollCard) {
    clearTimeout(scrollTimer);
    ignoreScrollUntil = Date.now() + 650;
    viewport.scrollTo({ left: cards[currentIndex].offsetLeft - cards[0].offsetLeft, behavior: "smooth" });
  }
}

cards.forEach((card, index) => {
  card.addEventListener("click", () => {
    clearTimeout(scrollTimer);
    ignoreScrollUntil = Date.now() + 1100;
    showDestination(index, false, card);
  });
});

document.getElementById("prevButton").addEventListener("click", () => showDestination(currentIndex - 1));
document.getElementById("nextButton").addEventListener("click", () => showDestination(currentIndex + 1));

viewport.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    showDestination(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
  }
});

viewport.addEventListener("scroll", () => {
  if (dragStart || Date.now() < ignoreScrollUntil) return;
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    const index = indexFromScroll();
    if (index !== currentIndex) showDestination(index, false);
  }, 130);
});

let cardsViewportWidth = viewport.clientWidth;
new ResizeObserver(() => {
  if (Math.abs(viewport.clientWidth - cardsViewportWidth) < 1) return;
  cardsViewportWidth = viewport.clientWidth;
  clearTimeout(scrollTimer);
  ignoreScrollUntil = Date.now() + 800;
}).observe(viewport);

viewport.addEventListener("pointerdown", (event) => {
  ignoreScrollUntil = 0;
  if (event.pointerType !== "mouse") return;
  dragStart = { x: event.clientX, scrollLeft: viewport.scrollLeft };
  dragged = false;
});

viewport.addEventListener("pointermove", (event) => {
  if (!dragStart) return;
  const distance = event.clientX - dragStart.x;
  if (Math.abs(distance) > 5) {
    dragged = true;
    viewport.classList.add("is-dragging");
    viewport.scrollLeft = dragStart.scrollLeft - distance;
  }
});

function endDrag() {
  if (!dragStart) return;
  dragStart = null;
  viewport.classList.remove("is-dragging");
  if (dragged) {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      showDestination(indexFromScroll(), false);
    }, 80);
  }
}

viewport.addEventListener("pointerup", endDrag);
viewport.addEventListener("pointercancel", endDrag);
viewport.addEventListener("pointerleave", endDrag);
viewport.addEventListener("click", (event) => {
  if (dragged) {
    event.preventDefault();
    event.stopPropagation();
    dragged = false;
  }
}, true);

// Seasonal suggestions link to the existing province pages.
(() => {
  const guide = document.getElementById("season-guide");
  if (!guide) return;
  const ideas = {
    spring: { mark: "春", label: "春日灵感 / 浙江 · 西湖", title: "在湖边，等一场春风。", description: "沿着湖岸慢慢走，看柳色和水光一起醒来。", slug: "zhejiang", name: "浙江" },
    summer: { mark: "夏", label: "夏日灵感 / 内蒙古 · 呼伦贝尔", title: "去草原，听风吹过。", description: "穿过辽阔的草地，让视野一直延伸到天边。", slug: "inner-mongolia", name: "内蒙古" },
    autumn: { mark: "秋", label: "秋日灵感 / 新疆 · 喀纳斯", title: "走进山林的金色里。", description: "沿着湖与山慢慢走，收下一路温暖的秋色。", slug: "xinjiang", name: "新疆" },
    winter: { mark: "冬", label: "冬日灵感 / 黑龙江 · 哈尔滨", title: "去北方，看看冰雪。", description: "在雪花和灯火之间，感受冬天独有的浪漫。", slug: "heilongjiang", name: "黑龙江" }
  };
  const buttons = [...guide.querySelectorAll("[data-season]")];
  const link = document.getElementById("seasonPickLink");
  function selectSeason(season) {
    const idea = ideas[season];
    if (!idea) return;
    buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.season === season)));
    document.getElementById("seasonPickLabel").textContent = idea.label;
    document.getElementById("seasonPickTitle").textContent = idea.title;
    document.getElementById("seasonPickDescription").textContent = idea.description;
    document.getElementById("seasonWatermark").textContent = idea.mark;
    const image = document.getElementById("seasonPickImage");
    if (image) {
      image.src = `/shanhai-travel/assets/province-ai/${idea.slug}/01.jpg`;
      image.alt = `${idea.name}风景旅行灵感`;
    }
    link.href = `/shanhai-travel/province/${idea.slug}`;
    link.dataset.province = idea.slug;
    link.replaceChildren(document.createTextNode(`走进${idea.name} `));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    link.append(arrow);
  }
  buttons.forEach(button => button.addEventListener("click", () => selectSeason(button.dataset.season)));
  const month = new Date().getMonth() + 1;
  selectSeason(month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "autumn" : "winter");
})();

// One recommendation section, with keyboard-accessible mood and season views.
(() => {
  const tabs = [...document.querySelectorAll('.discovery-tabs [role="tab"]')];
  if (!tabs.length) return;
  function select(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });
  function restoreAnchor() {
    if (location.hash !== '#season-guide') return;
    select(tabs[1]);
    requestAnimationFrame(() => document.getElementById('season-guide').scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', restoreAnchor);
  restoreAnchor();
})();

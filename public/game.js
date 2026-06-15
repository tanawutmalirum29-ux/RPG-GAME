const socket = io();

// ─── DOM refs ────────────────────────────────────────────────────────────────
const pName        = document.getElementById("pName");
const pLevel       = document.getElementById("pLevel");
const pAtk         = document.getElementById("pAtk");
const pDef         = document.getElementById("pDef");
const pCrit        = document.getElementById("pCrit");
const pGold        = document.getElementById("pGold");
const hpText       = document.getElementById("hpText");
const hpBar        = document.getElementById("hpBar");
const expText      = document.getElementById("expText");
const expBar       = document.getElementById("expBar");
const eWeapon      = document.getElementById("eWeapon");
const eArmor       = document.getElementById("eArmor");
const eAccessory   = document.getElementById("eAccessory");
const contentDiv   = document.getElementById("content");
const inventoryDiv = document.getElementById("inventory");
const marketDiv    = document.getElementById("market-content");
const locationName = document.getElementById("locationName");
const locationBadge= document.getElementById("locationBadge");
const contentIcon  = document.getElementById("contentIcon");
const contentTitle = document.getElementById("contentTitle");
const combatLog    = document.getElementById("combatLog");
const autoBtn      = document.getElementById("autoAttackBtn");
const autoStatus   = document.getElementById("autoStatus");

// ─── State ───────────────────────────────────────────────────────────────────
let currentPlace   = "slime_field";
let autoAttack     = false;
let autoInterval   = null;
let autoTargetId   = null;
let lastMonsters   = [];
let playerData     = null;

// ─── Item definitions (mirrored from server for display) ─────────────────────
const itemDefs = {
  wood_sword:    { id:"wood_sword",    type:"weapon",    name:"ดาบไม้",          icon:"🗡",  atk:5  },
  iron_sword:    { id:"iron_sword",    type:"weapon",    name:"ดาบเหล็ก",        icon:"⚔",  atk:15 },
  silver_sword:  { id:"silver_sword",  type:"weapon",    name:"ดาบเงิน",         icon:"🗡",  atk:28 },
  cursed_blade:  { id:"cursed_blade",  type:"weapon",    name:"ดาบต้องสาป",      icon:"⚡",  atk:40, dropOnly:true },
  leather_armor: { id:"leather_armor", type:"armor",     name:"ชุดหนัง",         icon:"🛡",  hp:30,  def:2  },
  chain_mail:    { id:"chain_mail",    type:"armor",     name:"ชุดโซ่",          icon:"🔗",  hp:60,  def:5  },
  plate_armor:   { id:"plate_armor",   type:"armor",     name:"ชุดเกราะเต็ม",   icon:"🛡",  hp:100, def:10, dropOnly:true },
  ring:          { id:"ring",          type:"accessory", name:"แหวนพลัง",        icon:"💍",  atk:3  },
  amulet:        { id:"amulet",        type:"accessory", name:"จี้มังกร",         icon:"📿",  atk:6,  hp:20  },
  skull_ring:    { id:"skull_ring",    type:"accessory", name:"แหวนกะโหลก",      icon:"💀",  atk:8,  hp:30, critBonus:5, dropOnly:true },
  potion:        { id:"potion",        type:"usable",    name:"ยาฟื้นฟู",        icon:"🧪",  heal:50,    price:30 },
  mega_potion:   { id:"mega_potion",   type:"usable",    name:"ยาฟื้นฟูใหญ่",   icon:"💉",  heal:150,   price:80 },
  elixir:        { id:"elixir",        type:"usable",    name:"ยาอมฤต",          icon:"✨",  heal:999,   dropOnly:true },
  slime_core:    { id:"slime_core",    type:"material",  name:"แก่นสไลม์",       icon:"🟢",  price:15 },
  goblin_ear:    { id:"goblin_ear",    type:"material",  name:"หูก็อบลิน",       icon:"👂",  price:25 },
  goblin_shield: { id:"goblin_shield", type:"armor",     name:"โล่ก็อบลิน",      icon:"🛡",  hp:45,  def:3, dropOnly:true },
  bone_fragment: { id:"bone_fragment", type:"material",  name:"เศษกระดูก",       icon:"🦴",  price:50 },
  cursed_gem:    { id:"cursed_gem",    type:"material",  name:"อัญมณีต้องสาป",   icon:"💎",  price:200 },
};

// market items available to buy
const marketItemIds = ["wood_sword","iron_sword","silver_sword","leather_armor","chain_mail","ring","amulet","potion","mega_potion"];

// ─── Modal ───────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}
function overlayClose(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ─── Bottom bar ──────────────────────────────────────────────────────────────
function setBarActive(id) {
  document.querySelectorAll(".bar-btn").forEach(b => b.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

// ─── Log ─────────────────────────────────────────────────────────────────────
function addLog(msg, cls="") {
  const line = document.createElement("div");
  line.className = "log-entry" + (cls ? " " + cls : "");
  line.innerHTML = msg;
  combatLog.appendChild(line);
  while (combatLog.children.length > 12) combatLog.removeChild(combatLog.firstChild);
  combatLog.scrollTop = combatLog.scrollHeight;
}

function expNeeded(level) { return level * 20 + (level - 1) * 10; }

// ─── Player data ─────────────────────────────────────────────────────────────
socket.on("player_data", (player) => {
  playerData = player;
  pName.textContent  = player.name;
  pLevel.textContent = player.level;
  pAtk.textContent   = player.atk;
  if (pDef)  pDef.textContent  = player.def  ?? 0;
  if (pCrit) pCrit.textContent = (player.critPct ?? 5) + "%";
  pGold.textContent  = player.gold.toLocaleString();

  hpText.textContent = `${player.hp}/${player.maxHp}`;
  hpBar.style.width  = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  // HP bar color: green > yellow > red
  const hpPct = player.hp / player.maxHp;
  hpBar.style.background = hpPct > 0.5
    ? "linear-gradient(to right,#922b21,#e74c3c)"
    : hpPct > 0.25
      ? "linear-gradient(to right,#b7770d,#f39c12)"
      : "linear-gradient(to right,#6e1111,#c0392b)";

  const needed = expNeeded(player.level);
  expText.textContent = `${player.exp} / ${needed} EXP`;
  expBar.style.width  = `${Math.min(100, (player.exp / needed) * 100)}%`;

  const emptyHTML = '<span class="slot-empty">— ว่างเปล่า —</span>';
  eWeapon.innerHTML    = player.equipment.weapon    ? (itemDefs[player.equipment.weapon]?.icon + " " + itemDefs[player.equipment.weapon]?.name)    : emptyHTML;
  eArmor.innerHTML     = player.equipment.armor     ? (itemDefs[player.equipment.armor]?.icon + " " + itemDefs[player.equipment.armor]?.name)     : emptyHTML;
  eAccessory.innerHTML = player.equipment.accessory ? (itemDefs[player.equipment.accessory]?.icon + " " + itemDefs[player.equipment.accessory]?.name) : emptyHTML;

  renderInventory(player);
});

// ─── Inventory ───────────────────────────────────────────────────────────────
function renderInventory(player) {
  if (!player.inventory.length) {
    inventoryDiv.innerHTML = '<div class="inv-empty">กระเป๋าว่างเปล่า</div>';
    return;
  }
  inventoryDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "inv-grid";

  player.inventory.forEach(itemId => {
    const item = itemDefs[itemId];
    if (!item) return;
    const card = document.createElement("div");
    card.className = "inv-card";

    let stats = [];
    if (item.atk)       stats.push(`⚔ +${item.atk}`);
    if (item.hp)        stats.push(`❤ +${item.hp}`);
    if (item.def)       stats.push(`🛡 +${item.def}`);
    if (item.heal)      stats.push(`💚 ${item.heal}`);
    if (item.critBonus) stats.push(`⚡ Crit+${item.critBonus}%`);

    const typeLabel = {weapon:"อาวุธ",armor:"เกราะ",accessory:"ประดับ",usable:"ของใช้",material:"วัตถุดิบ"}[item.type] || "";
    const typeBadge = item.dropOnly ? '<span class="drop-badge">DROP</span>' : "";

    let actions = "";
    if (["weapon","armor","accessory"].includes(item.type))
      actions += `<button class="btn btn-equip btn-sm" onclick="equipItem('${item.id}')">สวมใส่</button>`;
    if (item.type === "usable")
      actions += `<button class="btn btn-use btn-sm" onclick="useItem('${item.id}')">ใช้</button>`;
    if (item.price || item.type === "material")
      actions += `<button class="btn btn-sell btn-sm" onclick="sellItem('${item.id}')">ขาย</button>`;

    card.innerHTML = `
      <div class="inv-name">${item.icon} ${item.name} ${typeBadge}</div>
      <div class="inv-type">${typeLabel}</div>
      <div class="inv-stat">${stats.join("  ")}</div>
      <div class="inv-actions">${actions}</div>
    `;
    grid.appendChild(card);
  });
  inventoryDiv.appendChild(grid);
}

// ─── Place data ──────────────────────────────────────────────────────────────
socket.on("place_data", (data) => {
  if (data.type === "monster") {
    locationName.textContent  = data.name;
    locationBadge.textContent = "⚔ ต่อสู้";
    locationBadge.className   = "location-badge";
    contentIcon.textContent   = "⚔";
    contentTitle.textContent  = "มอนสเตอร์";
    lastMonsters = data.monsters;
    renderMonsters(data.monsters);
  }
  if (data.type === "market") {
    renderMarket();
  }
});

// real-time place updates (respawn / damage from others)
socket.on("place_update", (data) => {
  if (data.placeKey !== currentPlace) return;
  lastMonsters = data.monsters;
  renderMonsters(data.monsters);
});

socket.on("respawn_notice", (data) => {
  if (data.placeKey !== currentPlace) return;
  addLog(`🔄 <b>${data.name}</b> ฟื้นคืนชีพแล้ว!`, "log-respawn");
});

// ─── Render Monsters ─────────────────────────────────────────────────────────
function renderMonsters(monsters) {
  contentDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "monster-grid";

  monsters.forEach(monster => {
    const div = document.createElement("div");
    div.className = "monster-card" + (monster.isBoss ? " boss-card" : "") + (!monster.alive ? " dead-card" : "");
    div.id = `monster-card-${monster.id}`;

    const pct = Math.max(0, (monster.hp / monster.maxHp) * 100);

    // drop rate preview (from itemDefs)
    const dropHtml = monster.drops
      ? monster.drops.map(d => {
          const itm = itemDefs[d.id];
          const pctLabel = d.rate >= 0.5 ? "common" : d.rate >= 0.2 ? "uncommon" : d.rate >= 0.08 ? "rare" : "epic";
          return `<span class="drop-tag ${pctLabel}" title="${Math.round(d.rate*100)}%">${itm?.icon||"?"} ${itm?.name||d.id}</span>`;
        }).join("") 
      : "";

    div.innerHTML = `
      <div class="monster-left">
        <div class="monster-avatar${monster.isBoss ? " boss-avatar" : ""}">${monster.emoji || "👾"}</div>
        ${monster.isBoss ? '<div class="boss-label">BOSS</div>' : ""}
      </div>
      <div class="monster-info">
        <div class="monster-name">${monster.name}${!monster.alive ? ' <span class="dead-label">💀 ตาย</span>' : ""}</div>
        <div class="monster-meta">⚔ ATK ${monster.atk}</div>
        <div class="monster-hp-label">❤ HP</div>
        <div class="bar-wrap"><div class="bar-fill bar-hp" style="width:${pct}%"></div></div>
        <div class="monster-hp-text">${monster.alive ? `${monster.hp} / ${monster.maxHp}` : "กำลัง respawn..."}</div>
        ${dropHtml ? `<div class="drop-preview">${dropHtml}</div>` : ""}
      </div>
      <div class="monster-actions">
        <button class="btn btn-attack" onclick="attack(${monster.id})" ${!monster.alive ? "disabled" : ""}>⚔ โจมตี</button>
        <button class="btn btn-auto-target ${autoTargetId===monster.id&&autoAttack ? 'active-target' : ''}" onclick="setAutoTarget(${monster.id})" ${!monster.alive ? "disabled" : ""}>🎯 Auto</button>
      </div>
    `;
    grid.appendChild(div);
  });
  contentDiv.appendChild(grid);
}

// ─── Market ──────────────────────────────────────────────────────────────────
function renderMarket() {
  marketDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "item-grid";

  marketItemIds.forEach(itemId => {
    const item = itemDefs[itemId];
    if (!item) return;
    const div = document.createElement("div");
    div.className = "item-card";

    let stats = [];
    if (item.atk)  stats.push(`⚔ โจมตี <span>+${item.atk}</span>`);
    if (item.hp)   stats.push(`❤ HP <span>+${item.hp}</span>`);
    if (item.def)  stats.push(`🛡 DEF <span>+${item.def}</span>`);
    if (item.heal) stats.push(`💚 ฟื้นฟู <span>${item.heal}</span>`);
    const typeLabel = {weapon:"อาวุธ",armor:"เกราะ",accessory:"ประดับ",usable:"ของใช้"}[item.type] || "";

    div.innerHTML = `
      <div class="item-top">
        <div class="item-icon">${item.icon}</div>
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-type">${typeLabel}</div>
        </div>
      </div>
      <div class="item-stats">${stats.join("  ")}</div>
      <div class="item-price">🪙 ${item.price}</div>
      <button class="btn btn-buy" onclick="buyItem('${item.id}')">ซื้อ</button>
    `;
    grid.appendChild(div);
  });
  marketDiv.appendChild(grid);
}

// ─── Combat results ──────────────────────────────────────────────────────────
socket.on("combat_result", (res) => {
  if (res.type === "hit") {
    const critTag = res.isCrit ? ' <span class="crit-tag">CRIT!</span>' : "";
    addLog(`⚔ คุณโจมตี <b>${res.monsterName}</b> <span class="log-dmg">-${res.dmg}${critTag}</span>`);
    if (res.monsterDmg) {
      const mCritTag = res.monsterCrit ? ' <span class="crit-tag">CRIT!</span>' : "";
      addLog(`💢 <b>${res.monsterName}</b> โต้ <span class="log-mdmg">-${res.monsterDmg}${mCritTag}</span> HP ${res.playerHp}/${res.playerMaxHp}`, "log-monster");
    }
  }
  if (res.type === "kill") {
    const critTag = res.isCrit ? ' <span class="crit-tag">CRIT!</span>' : "";
    addLog(`⚔ โจมตีสุดท้าย <span class="log-dmg">-${res.dmg}${critTag}</span>`, "");
    let dropStr = "";
    if (res.drops && res.drops.length) {
      dropStr = " | 📦 " + res.drops.map(d => `${d.icon}${d.name}`).join(", ");
    }
    addLog(`💀 สังหาร <b>${res.monsterName}</b>! +<span class="log-kill">🪙${res.gold} ⭐${res.exp}EXP</span>${dropStr}`, "log-kill");
  }
  if (res.type === "player_dead") {
    addLog(`💔 <span class="log-dead">คุณสลบ! ฟื้นคืนด้วย HP 30% และเสียทอง 10%</span>`, "log-dead");
    stopAutoAttack();
  }
  if (res.type === "level_up") {
    addLog(`🌟 <span class="log-kill">LEVEL UP! ขึ้นเป็น Lv.${res.level} — ATK +2, HP เต็ม</span>`, "log-kill");
  }
  if (res.type === "buy")         addLog(`🛒 ซื้อ ${res.icon} <span class="log-buy">${res.itemName}</span>`, "log-buy");
  if (res.type === "sell")        addLog(`💰 ขาย <span class="log-buy">${res.itemName}</span> +<span class="log-kill">🪙${res.gold}</span>`, "log-buy");
  if (res.type === "cant_afford") addLog(`❌ ทองไม่พอ (${res.itemName})`);
  if (res.type === "heal")        addLog(`💊 ใช้ ${res.icon} ${res.itemName} ฟื้นฟู <span class="log-heal">+${res.amount} HP</span>`, "log-heal");
  if (res.type === "equip")       addLog(`✅ สวมใส่ ${res.icon} <span class="log-buy">${res.itemName}</span>`, "log-buy");
});

// ─── Auto Attack ─────────────────────────────────────────────────────────────
function setAutoTarget(monsterId) {
  autoTargetId = monsterId;
  if (!autoAttack) toggleAutoAttack();
  else renderMonsters(lastMonsters); // refresh button highlight
}

function toggleAutoAttack() {
  autoAttack = !autoAttack;
  if (autoAttack) {
    startAutoAttack();
    autoBtn.textContent = "⏹ หยุด Auto";
    autoBtn.classList.add("auto-on");
    autoStatus.textContent = "🟢 Auto ON";
  } else {
    stopAutoAttack();
  }
}

function startAutoAttack() {
  if (autoInterval) return;
  autoInterval = setInterval(() => {
    if (!autoAttack) return;

    // pick target: prefer autoTargetId if alive, else first alive monster
    let target = null;
    if (autoTargetId !== null) {
      target = lastMonsters.find(m => m.id === autoTargetId && m.alive);
    }
    if (!target) {
      target = lastMonsters.find(m => m.alive);
    }

    if (target) {
      socket.emit("attack_monster", { place: currentPlace, monsterId: target.id });
    }
  }, 1200);
}

function stopAutoAttack() {
  autoAttack = false;
  autoTargetId = null;
  clearInterval(autoInterval);
  autoInterval = null;
  if (autoBtn) { autoBtn.textContent = "⚡ Auto Attack"; autoBtn.classList.remove("auto-on"); }
  if (autoStatus) autoStatus.textContent = "🔴 Auto OFF";
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function selectPlace(place) {
  stopAutoAttack();
  currentPlace = place;
  document.querySelectorAll(".map-place-btn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("mplace-" + place);
  if (btn) btn.classList.add("active");
  setBarActive("bar-map");
  socket.emit("go_place", place);
  closeModal("map-modal");
}

function openMarket() {
  socket.emit("go_place", "market");
  setBarActive("bar-market");
  renderMarket();
  openModal("market-modal");
}

function attack(id)    { socket.emit("attack_monster", { place: currentPlace, monsterId: id }); }
function buyItem(id)   { socket.emit("buy_item", id); }
function equipItem(id) { socket.emit("equip_item", id); }
function useItem(id)   { socket.emit("use_item", id); }
function sellItem(id)  { socket.emit("sell_item", id); }

// ─── Init ─────────────────────────────────────────────────────────────────────
socket.emit("go_place", currentPlace);

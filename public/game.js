const socket = io();

// ---- DOM refs ----
const pName        = document.getElementById("pName");
const pLevel       = document.getElementById("pLevel");
const pAtk         = document.getElementById("pAtk");
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

let currentPlace = "slime_field";

// ---- Item definitions ----
const marketItems = {
  wood_sword:    { id:"wood_sword",   type:"weapon",    name:"ดาบไม้",   icon:"🗡", price:50,  atk:5  },
  iron_sword:    { id:"iron_sword",   type:"weapon",    name:"ดาบเหล็ก", icon:"⚔", price:150, atk:15 },
  leather_armor: { id:"leather_armor",type:"armor",     name:"ชุดหนัง",  icon:"🛡", price:120, hp:30  },
  ring:          { id:"ring",         type:"accessory", name:"แหวนพลัง", icon:"💍", price:200, atk:3  },
  potion:        { id:"potion",       type:"usable",    name:"ยาฟื้นฟู", icon:"🧪", price:30,  heal:50},
};
const monsterEmoji = { "สไลม์":"🟢", "ก็อบลิน":"👺", "อัศวินต้องสาป":"💀" };

// ===================== MODAL SYSTEM =====================
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}
function overlayClose(e, id) {
  if(e.target === document.getElementById(id)) closeModal(id);
}

// ===================== BOTTOM BAR active state =====================
function setBarActive(id) {
  document.querySelectorAll(".bar-btn").forEach(b => b.classList.remove("active"));
  const el = document.getElementById(id);
  if(el) el.classList.add("active");
}

// ===================== LOG =====================
function addLog(msg, cls="") {
  const line = document.createElement("div");
  line.className = "log-entry" + (cls ? " " + cls : "");
  line.innerHTML = msg;
  combatLog.appendChild(line);
  while(combatLog.children.length > 8) combatLog.removeChild(combatLog.firstChild);
  combatLog.scrollTop = combatLog.scrollHeight;
}
function expNeeded(level) { return level * 20; }

// ===================== PLAYER DATA =====================
socket.on("player_data", (player) => {
  pName.textContent  = player.name;
  pLevel.textContent = player.level;
  pAtk.textContent   = player.atk;
  pGold.textContent  = player.gold.toLocaleString();

  hpText.textContent = `${player.hp}/${player.maxHp}`;
  hpBar.style.width  = `${Math.max(0,(player.hp/player.maxHp)*100)}%`;

  const needed = expNeeded(player.level);
  expText.textContent = `${player.exp} / ${needed} EXP`;
  expBar.style.width  = `${Math.min(100,(player.exp/needed)*100)}%`;

  const emptyHTML = '<span class="slot-empty">— ว่างเปล่า —</span>';
  eWeapon.innerHTML    = player.equipment.weapon    ? marketItems[player.equipment.weapon].name    : emptyHTML;
  eArmor.innerHTML     = player.equipment.armor     ? marketItems[player.equipment.armor].name     : emptyHTML;
  eAccessory.innerHTML = player.equipment.accessory ? marketItems[player.equipment.accessory].name : emptyHTML;

  renderInventory(player);
});

function renderInventory(player) {
  if(player.inventory.length === 0) {
    inventoryDiv.innerHTML = '<div class="inv-empty">กระเป๋าว่างเปล่า</div>';
    return;
  }
  inventoryDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "inv-grid";

  player.inventory.forEach(itemId => {
    const item = marketItems[itemId];
    if(!item) return;
    const card = document.createElement("div");
    card.className = "inv-card";

    let stats = "";
    if(item.atk)  stats = `⚔ โจมตี +${item.atk}`;
    if(item.hp)   stats = `❤ HP +${item.hp}`;
    if(item.heal) stats = `💚 ฟื้นฟู ${item.heal}`;

    let actions = "";
    if(item.type==="weapon"||item.type==="armor"||item.type==="accessory")
      actions += `<button class="btn btn-equip btn-sm" onclick="equipItem('${item.id}')">สวมใส่</button>`;
    if(item.type==="usable")
      actions += `<button class="btn btn-use btn-sm" onclick="useItem('${item.id}')">ใช้</button>`;

    card.innerHTML = `
      <div class="inv-name">${item.icon} ${item.name}</div>
      <div class="inv-stat">${stats}</div>
      <div class="inv-actions">${actions}</div>
    `;
    grid.appendChild(card);
  });
  inventoryDiv.appendChild(grid);
}

// ===================== PLACE DATA =====================
socket.on("place_data", (data) => {
  if(data.type === "monster") {
    locationName.textContent   = data.name;
    locationBadge.textContent  = "⚔ ต่อสู้";
    locationBadge.className    = "location-badge";
    contentIcon.textContent    = "⚔";
    contentTitle.textContent   = "มอนสเตอร์";
    renderMonsters(data.monsters);
  }
  if(data.type === "market") {
    renderMarket(data.items);
  }
});

function renderMonsters(monsters) {
  contentDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "monster-grid";
  monsters.forEach(monster => {
    const div = document.createElement("div");
    div.className = "monster-card";
    div.id = `monster-card-${monster.id}`;
    const pct   = Math.max(0,(monster.hp/monster.maxHp)*100);
    const emoji = monsterEmoji[monster.name] || "👾";
    div.innerHTML = `
      <div class="monster-avatar">${emoji}</div>
      <div class="monster-info">
        <div class="monster-name">${monster.name}</div>
        <div class="monster-hp-label">❤ พลังชีวิต</div>
        <div class="bar-wrap"><div class="bar-fill bar-hp" style="width:${pct}%"></div></div>
        <div class="monster-hp-text">${monster.hp} / ${monster.maxHp}</div>
      </div>
      <button class="btn btn-attack" onclick="attack(${monster.id})">⚔ โจมตี</button>
    `;
    grid.appendChild(div);
  });
  contentDiv.appendChild(grid);
}

function renderMarket(items) {
  marketDiv.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "item-grid";
  items.forEach(itemId => {
    const item = marketItems[itemId];
    const div  = document.createElement("div");
    div.className = "item-card";
    let stats = [];
    if(item.atk)  stats.push(`⚔ โจมตี <span>+${item.atk}</span>`);
    if(item.hp)   stats.push(`❤ HP <span>+${item.hp}</span>`);
    if(item.heal) stats.push(`💚 ฟื้นฟู <span>${item.heal}</span>`);
    const typeLabel = {weapon:"อาวุธ",armor:"เกราะ",accessory:"ประดับ",usable:"ของใช้"}[item.type]||"";
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

// ===================== COMBAT RESULTS =====================
socket.on("combat_result", (res) => {
  if(res.type==="hit")         addLog(`คุณโจมตี <b>${res.monsterName}</b> ดีเมจ <span class="log-dmg">${res.dmg}</span>`);
  if(res.type==="kill")        addLog(`💀 <b>${res.monsterName}</b> ถูกสังหาร! ได้รับ <span class="log-kill">🪙${res.gold} | ⭐${res.exp} EXP</span>`, "log-kill");
  if(res.type==="buy")         addLog(`🛒 ซื้อ <span class="log-buy">${res.itemName}</span> สำเร็จ`, "log-buy");
  if(res.type==="cant_afford") addLog(`❌ ทองไม่พอซื้อ ${res.itemName}`);
  if(res.type==="heal")        addLog(`💊 ใช้ ${res.itemName} ฟื้นฟู <span class="log-heal">+${res.amount} HP</span>`, "log-heal");
  if(res.type==="equip")       addLog(`✅ สวมใส่ <span class="log-buy">${res.itemName}</span>`, "log-buy");
  if(res.type==="level_up")    addLog(`🌟 <span class="log-kill">LEVEL UP! ขึ้นเป็น Lv.${res.level}</span>`, "log-kill");
});

// ===================== ACTIONS =====================

// เลือกสถานที่จาก map popup
function selectPlace(place) {
  currentPlace = place;
  // update active in map popup
  document.querySelectorAll(".map-place-btn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("mplace-" + place);
  if(btn) btn.classList.add("active");
  // highlight map bar button
  setBarActive("bar-map");
  socket.emit("go_place", place);
  closeModal("map-modal");
}

// ตลาด
function openMarket() {
  socket.emit("go_place", "market");
  setBarActive("bar-market");
  openModal("market-modal");
}

function attack(id)    { socket.emit("attack_monster", { place: currentPlace, monsterId: id }); }
function buyItem(id)   { socket.emit("buy_item", id); }
function equipItem(id) { socket.emit("equip_item", id); }
function useItem(id)   { socket.emit("use_item", id); }

// ===================== INIT =====================
// load initial place
socket.emit("go_place", currentPlace);

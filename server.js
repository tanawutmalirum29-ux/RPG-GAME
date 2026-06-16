const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

// ─── ITEMS ─────────────────────────────────────────────────────────────────
const items = {
  // ── Weapons ──
  wood_sword:     { id:"wood_sword",     type:"weapon",    name:"ดาบไม้",          icon:"🗡",  price:50,   atk:5,  tier:1 },
  iron_sword:     { id:"iron_sword",     type:"weapon",    name:"ดาบเหล็ก",        icon:"⚔",  price:150,  atk:15, tier:2 },
  silver_sword:   { id:"silver_sword",   type:"weapon",    name:"ดาบเงิน",         icon:"🗡",  price:350,  atk:28, tier:3 },
  cursed_blade:   { id:"cursed_blade",   type:"weapon",    name:"ดาบต้องสาป",      icon:"⚡",  price:0,    atk:40, tier:4, dropOnly:true },
  // ── Armor ──
  leather_armor:  { id:"leather_armor",  type:"armor",     name:"ชุดหนัง",         icon:"🛡",  price:120,  hp:30,  def:2,  tier:1 },
  chain_mail:     { id:"chain_mail",     type:"armor",     name:"ชุดโซ่",          icon:"🔗",  price:300,  hp:60,  def:5,  tier:2 },
  plate_armor:    { id:"plate_armor",    type:"armor",     name:"ชุดเกราะเต็ม",    icon:"🛡",  price:0,    hp:100, def:10, tier:3, dropOnly:true },
  // ── Accessories ──
  ring:           { id:"ring",           type:"accessory", name:"แหวนพลัง",        icon:"💍",  price:200,  atk:3,  tier:1 },
  amulet:         { id:"amulet",         type:"accessory", name:"จี้มังกร",         icon:"📿",  price:400,  atk:6,  hp:20,  tier:2 },
  skull_ring:     { id:"skull_ring",     type:"accessory", name:"แหวนกะโหลก",      icon:"💀",  price:0,    atk:8,  hp:30,  critBonus:5, tier:3, dropOnly:true },
  // ── Usables ──
  potion:         { id:"potion",         type:"usable",    name:"ยาฟื้นฟู",        icon:"🧪",  price:30,   heal:50 },
  mega_potion:    { id:"mega_potion",    type:"usable",    name:"ยาฟื้นฟูใหญ่",   icon:"💉",  price:80,   heal:150 },
  elixir:         { id:"elixir",         type:"usable",    name:"ยาอมฤต",          icon:"✨",  price:0,    heal:999, dropOnly:true },
  // ── Loot / Materials ──
  slime_core:     { id:"slime_core",     type:"material",  name:"แก่นสไลม์",       icon:"🟢",  price:15  },
  goblin_ear:     { id:"goblin_ear",     type:"material",  name:"หูก็อบลิน",       icon:"👂",  price:25  },
  goblin_shield:  { id:"goblin_shield",  type:"armor",     name:"โล่ก็อบลิน",      icon:"🛡",  price:0,    hp:45,  def:3,  tier:2, dropOnly:true },
  bone_fragment:  { id:"bone_fragment",  type:"material",  name:"เศษกระดูก",       icon:"🦴",  price:50  },
  cursed_gem:     { id:"cursed_gem",     type:"material",  name:"อัญมณีต้องสาป",   icon:"💎",  price:200 },
};

// ─── MONSTER TEMPLATES ──────────────────────────────────────────────────────
const monsterTemplates = {
  slime:       { name:"สไลม์",          emoji:"🟢", hp:30,  atk:3,  gold:[5,12],  exp:5,  respawn:5000,
    drops:[
      { id:"slime_core",    rate:0.60 },
      { id:"potion",        rate:0.15 },
    ]
  },
  big_slime:   { name:"สไลม์ยักษ์",    emoji:"🟩", hp:80,  atk:8,  gold:[18,30], exp:15, respawn:8000,
    drops:[
      { id:"slime_core",    rate:0.80 },
      { id:"potion",        rate:0.35 },
      { id:"wood_sword",    rate:0.10 },
    ]
  },
  goblin:      { name:"ก็อบลิน",        emoji:"👺", hp:60,  atk:10, gold:[15,25], exp:10, respawn:7000,
    drops:[
      { id:"goblin_ear",    rate:0.70 },
      { id:"goblin_shield", rate:0.08 },
      { id:"potion",        rate:0.20 },
      { id:"iron_sword",    rate:0.05 },
    ]
  },
  goblin_chief:{ name:"หัวหน้าก็อบลิน", emoji:"👹", hp:150, atk:18, gold:[40,70], exp:30, respawn:15000,
    drops:[
      { id:"goblin_ear",    rate:0.90 },
      { id:"goblin_shield", rate:0.30 },
      { id:"chain_mail",    rate:0.12 },
      { id:"amulet",        rate:0.08 },
      { id:"mega_potion",   rate:0.25 },
    ]
  },
  skeleton:    { name:"โครงกระดูก",     emoji:"💀", hp:100, atk:15, gold:[25,45], exp:20, respawn:10000,
    drops:[
      { id:"bone_fragment", rate:0.75 },
      { id:"leather_armor", rate:0.10 },
      { id:"potion",        rate:0.20 },
    ]
  },
  cursed_knight:{ name:"อัศวินต้องสาป", emoji:"⚔", hp:250, atk:28, gold:[80,130],exp:60, respawn:20000, isBoss:true,
    drops:[
      { id:"bone_fragment", rate:1.00 },
      { id:"cursed_gem",    rate:0.60 },
      { id:"cursed_blade",  rate:0.15 },
      { id:"plate_armor",   rate:0.12 },
      { id:"skull_ring",    rate:0.08 },
      { id:"elixir",        rate:0.05 },
    ]
  },
};

// ─── PLACE SETUP ────────────────────────────────────────────────────────────
function createMonster(templateKey, id) {
  const t = monsterTemplates[templateKey];
  return {
    id, templateKey, name:t.name, emoji:t.emoji,
    hp:t.hp, maxHp:t.hp, atk:t.atk,
    gold:t.gold, exp:t.exp, respawn:t.respawn,
    drops:t.drops, isBoss:!!t.isBoss,
    alive:true, respawnTimer:null,
  };
}

let _mId = 1;
const places = {
  slime_field: {
    name:"🟢 ทุ่งสไลม์", type:"monster",
    monsters:[ createMonster("slime",_mId++), createMonster("slime",_mId++), createMonster("big_slime",_mId++) ]
  },
  goblin_forest: {
    name:"🌲 ป่าก็อบลิน", type:"monster",
    monsters:[ createMonster("goblin",_mId++), createMonster("goblin",_mId++), createMonster("goblin_chief",_mId++) ]
  },
  crypt: {
    name:"⚰ สุสานโบราณ", type:"monster",
    monsters:[ createMonster("skeleton",_mId++), createMonster("skeleton",_mId++), createMonster("skeleton",_mId++) ]
  },
  dungeon: {
    name:"🏰 ดันเจี้ยน", type:"monster",
    monsters:[ createMonster("skeleton",_mId++), createMonster("cursed_knight",_mId++) ]
  },
  market: {
    name:"🛒 ตลาด", type:"market",
    items:["wood_sword","iron_sword","silver_sword","leather_armor","chain_mail","ring","amulet","potion","mega_potion"]
  },
  blacksmith: {
    name:"🔨 ร้านตีอาวุธ", type:"blacksmith",
  },
};

// ─── BLACKSMITH RECIPES ─────────────────────────────────────────────────────
const recipes = [
  { id:"rec_iron_sword",   resultId:"iron_sword",   name:"ดาบเหล็ก",     materials:[{id:"slime_core",qty:3}],                               goldCost:80  },
  { id:"rec_silver_sword", resultId:"silver_sword", name:"ดาบเงิน",      materials:[{id:"goblin_ear",qty:4},{id:"slime_core",qty:2}],        goldCost:180 },
  { id:"rec_chain_mail",   resultId:"chain_mail",   name:"ชุดโซ่",       materials:[{id:"bone_fragment",qty:3}],                            goldCost:150 },
  { id:"rec_cursed_blade", resultId:"cursed_blade", name:"ดาบต้องสาป",   materials:[{id:"cursed_gem",qty:2},{id:"bone_fragment",qty:3}],     goldCost:300 },
  { id:"rec_amulet",       resultId:"amulet",       name:"จี้มังกร",     materials:[{id:"goblin_ear",qty:2},{id:"goblin_shield",qty:1}],     goldCost:200 },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function expNeeded(level) { return level * 20 + (level - 1) * 10; }

function updatePlayerStats(player) {
  player.atk    = player.baseAtk;
  player.maxHp  = 100 + (player.level - 1) * 15;
  player.def    = 0;
  player.critPct = 5; // base 5% crit

  const { weapon, armor, accessory } = player.equipment;
  if (weapon    && items[weapon])    { player.atk += items[weapon].atk || 0; }
  if (armor     && items[armor])     { player.maxHp += items[armor].hp || 0; player.def += items[armor].def || 0; }
  if (accessory && items[accessory]) {
    player.atk   += items[accessory].atk || 0;
    player.maxHp += items[accessory].hp  || 0;
    player.critPct += items[accessory].critBonus || 0;
  }
  if (player.hp > player.maxHp) player.hp = player.maxHp;
}

function rollDrops(monster) {
  const dropped = [];
  for (const drop of monster.drops) {
    if (Math.random() < drop.rate) dropped.push(drop.id);
  }
  return dropped;
}

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// broadcast place_data to all sockets in a place
function broadcastPlace(placeKey) {
  const place = places[placeKey];
  if (!place || place.type !== "monster") return;
  // send stripped monster data (no internal timers)
  const monsters = place.monsters.map(m => ({
    id:m.id, name:m.name, emoji:m.emoji,
    hp:m.hp, maxHp:m.maxHp, atk:m.atk,
    alive:m.alive, isBoss:m.isBoss,
  }));
  io.emit("place_update", { placeKey, monsters });
}

function respawnMonster(placeKey, monsterId) {
  const place = places[placeKey];
  if (!place) return;
  const monster = place.monsters.find(m => m.id === monsterId);
  if (!monster) return;
  const t = monsterTemplates[monster.templateKey];
  monster.hp    = t.hp;
  monster.maxHp = t.hp;
  monster.alive = true;
  monster.respawnTimer = null;
  broadcastPlace(placeKey);
  io.emit("respawn_notice", { placeKey, monsterId, name:monster.name });
}

// ─── SOCKET ─────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const player = {
    name:"ผู้เล่น", level:1, exp:0, gold:500,
    hp:100, maxHp:100, baseAtk:10, atk:10, def:0, critPct:5,
    inventory:[], equipment:{ weapon:null, armor:null, accessory:null },
    currentPlace:"slime_field",
  };
  players[socket.id] = player;

  socket.emit("player_data", player);
  socket.emit("place_data",  buildPlaceData("slime_field"));

  // ── go_place ──
  socket.on("go_place", (placeKey) => {
    if (!places[placeKey]) return;
    player.currentPlace = placeKey;
    socket.emit("place_data", buildPlaceData(placeKey));
  });

  // ── attack_monster ──
  socket.on("attack_monster", (data) => {
    const place = places[data.place];
    if (!place || !place.monsters) return;
    const monster = place.monsters.find(m => m.id === data.monsterId);
    if (!monster || !monster.alive) return;

    // ── Player attacks monster ──
    const isCrit = Math.random() * 100 < player.critPct;
    let dmg = player.atk;
    if (isCrit) dmg = Math.floor(dmg * 1.75);
    monster.hp -= dmg;

    if (monster.hp <= 0) {
      monster.hp    = 0;
      monster.alive = false;

      // gold random
      const goldGain = randInt(monster.gold[0], monster.gold[1]);
      player.gold  += goldGain;
      player.exp   += monster.exp;

      // drops
      const dropped = rollDrops(monster);
      dropped.forEach(itemId => {
        if (!player.inventory.includes(itemId) || items[itemId].type === "usable" || items[itemId].type === "material") {
          player.inventory.push(itemId);
        }
      });

      socket.emit("combat_result", {
        type:"kill", monsterName:monster.name,
        gold:goldGain, exp:monster.exp,
        isCrit, dmg,
        drops:dropped.map(id => ({ id, name:items[id]?.name, icon:items[id]?.icon })),
      });

      // level-up loop
      while (player.exp >= expNeeded(player.level)) {
        player.exp   -= expNeeded(player.level);
        player.level += 1;
        player.baseAtk += 2;
        updatePlayerStats(player);
        player.hp = player.maxHp;
        socket.emit("combat_result", { type:"level_up", level:player.level });
      }

      // schedule respawn
      if (!monster.respawnTimer) {
        const t = monsterTemplates[monster.templateKey];
        monster.respawnTimer = setTimeout(() => respawnMonster(data.place, monster.id), t.respawn);
      }

      broadcastPlace(data.place);
    } else {
      // monster counter-attacks
      const monAtk   = monster.atk;
      const absorbed  = Math.min(player.def, Math.floor(monAtk * 0.4));
      const dmgToPlayer = Math.max(1, monAtk - absorbed - randInt(0, Math.floor(player.def * 0.5)));

      const monCrit  = Math.random() < 0.08;
      const finalDmgToPlayer = monCrit ? Math.floor(dmgToPlayer * 1.5) : dmgToPlayer;

      player.hp = Math.max(0, player.hp - finalDmgToPlayer);

      socket.emit("combat_result", {
        type:"hit", monsterName:monster.name, dmg, isCrit,
        monsterDmg:finalDmgToPlayer, monsterCrit:monCrit,
        playerHp:player.hp, playerMaxHp:player.maxHp,
      });

      if (player.hp === 0) {
        socket.emit("combat_result", { type:"player_dead" });
        // revive with 30% hp penalty
        player.hp = Math.floor(player.maxHp * 0.3);
        player.gold = Math.floor(player.gold * 0.9); // lose 10% gold
      }

      broadcastPlace(data.place);
    }

    socket.emit("player_data", player);
  });

  // ── buy_item ──
  socket.on("buy_item", (itemId) => {
    const item = items[itemId];
    if (!item || item.dropOnly) return;
    if (player.gold < item.price) {
      socket.emit("combat_result", { type:"cant_afford", itemName:item.name });
      return;
    }
    player.gold -= item.price;
    player.inventory.push(itemId);
    socket.emit("combat_result", { type:"buy", itemName:item.name, icon:item.icon });
    socket.emit("player_data", player);
  });

  // ── equip_item ──
  socket.on("equip_item", (itemId) => {
    if (!player.inventory.includes(itemId)) return;
    const item = items[itemId];
    if (!item) return;
    const slot = item.type;
    if (!["weapon","armor","accessory"].includes(slot)) return;

    // unequip old
    if (player.equipment[slot] && player.equipment[slot] !== itemId) {
      // old stays in inventory (already there)
    }
    player.equipment[slot] = itemId;
    updatePlayerStats(player);
    socket.emit("combat_result", { type:"equip", itemName:item.name, icon:item.icon });
    socket.emit("player_data", player);
  });

  // ── use_item ──
  socket.on("use_item", (itemId) => {
    const index = player.inventory.indexOf(itemId);
    if (index === -1) return;
    const item = items[itemId];
    if (!item) return;

    if (item.heal) {
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + item.heal);
      const actual = player.hp - before;
      player.inventory.splice(index, 1);
      socket.emit("combat_result", { type:"heal", itemName:item.name, icon:item.icon, amount:actual });
    }
    socket.emit("player_data", player);
  });

  // ── sell_item ──
  socket.on("sell_item", (itemId) => {
    const index = player.inventory.indexOf(itemId);
    if (index === -1) return;
    const item = items[itemId];
    if (!item || !item.price) return;
    const sellPrice = Math.floor(item.price * 0.5) || Math.floor((item.price || 30) * 0.5) || 5;
    player.inventory.splice(index, 1);
    player.gold += sellPrice;
    socket.emit("combat_result", { type:"sell", itemName:item.name, icon:item.icon, gold:sellPrice });
    socket.emit("player_data", player);
  });

  // ── craft_item ──
  socket.on("craft_item", (recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    // count inventory items
    const invCounts = {};
    for (const id of player.inventory) invCounts[id] = (invCounts[id] || 0) + 1;

    // check materials
    for (const mat of recipe.materials) {
      if ((invCounts[mat.id] || 0) < mat.qty) {
        socket.emit("combat_result", { type:"craft_fail", reason:"วัตถุดิบไม่พอ", recipeName:recipe.name });
        return;
      }
    }
    // check gold
    if (player.gold < recipe.goldCost) {
      socket.emit("combat_result", { type:"craft_fail", reason:"ทองไม่พอ", recipeName:recipe.name });
      return;
    }

    // consume materials
    for (const mat of recipe.materials) {
      let remaining = mat.qty;
      player.inventory = player.inventory.filter(id => {
        if (id === mat.id && remaining > 0) { remaining--; return false; }
        return true;
      });
    }
    player.gold -= recipe.goldCost;
    player.inventory.push(recipe.resultId);

    const resultItem = items[recipe.resultId];
    socket.emit("combat_result", { type:"craft_ok", itemName:resultItem.name, icon:resultItem.icon });
    socket.emit("player_data", player);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function buildPlaceData(placeKey) {
  const place = places[placeKey];
  if (!place) return null;
  if (place.type === "market") return place;
  if (place.type === "blacksmith") {
    return { name:place.name, type:"blacksmith", placeKey, recipes: recipes.map(r => ({
      ...r,
      resultItem: { ...items[r.resultId], id:r.resultId },
    })) };
  }
  return {
    name: place.name,
    type: place.type,
    placeKey,
    monsters: place.monsters.map(m => ({
      id:m.id, name:m.name, emoji:m.emoji,
      hp:m.hp, maxHp:m.maxHp, atk:m.atk,
      alive:m.alive, isBoss:m.isBoss,
      drops:m.drops, // for client drop-rate display
    })),
  };
}

server.listen(3000, () => console.log("Server running on :3000"));

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

const items = {
  wood_sword:    { id:"wood_sword",   type:"weapon",    name:"ดาบไม้",    icon:"🗡", price:50,  atk:5  },
  iron_sword:    { id:"iron_sword",   type:"weapon",    name:"ดาบเหล็ก",  icon:"⚔", price:150, atk:15 },
  leather_armor: { id:"leather_armor",type:"armor",     name:"ชุดหนัง",   icon:"🛡", price:120, hp:30  },
  ring:          { id:"ring",         type:"accessory", name:"แหวนพลัง",  icon:"💍", price:200, atk:3  },
  potion:        { id:"potion",       type:"usable",    name:"ยาฟื้นฟู",  icon:"🧪", price:30,  heal:50},
};

// ---- Shared place state (per-server, resets on restart) ----
const places = {
  slime_field: {
    name: "🟢 ทุ่งสไลม์", type: "monster",
    monsters: [{ id:1, name:"สไลม์",        hp:30,  maxHp:30,  gold:10, exp:5  }]
  },
  goblin_forest: {
    name: "🌲 ป่าก็อบลิน", type: "monster",
    monsters: [{ id:2, name:"ก็อบลิน",       hp:60,  maxHp:60,  gold:20, exp:10 }]
  },
  dungeon: {
    name: "🏰 ดันเจี้ยน", type: "monster",
    monsters: [{ id:3, name:"อัศวินต้องสาป", hp:120, maxHp:120, gold:50, exp:30 }]
  },
  market: {
    name: "🛒 ตลาด", type: "market",
    items: ["wood_sword","iron_sword","leather_armor","ring","potion"]
  }
};

function expNeeded(level) { return level * 20; }

function updatePlayerStats(player) {
  player.atk    = player.baseAtk;
  player.maxHp  = 100 + (player.level - 1) * 10;

  const { weapon, armor, accessory } = player.equipment;
  if(weapon    && items[weapon].atk)    player.atk    += items[weapon].atk;
  if(armor     && items[armor].hp)      player.maxHp  += items[armor].hp;
  if(accessory && items[accessory].atk) player.atk    += items[accessory].atk;
  if(accessory && items[accessory].hp)  player.maxHp  += items[accessory].hp;

  if(player.hp > player.maxHp) player.hp = player.maxHp;
}

io.on("connection", (socket) => {
  players[socket.id] = {
    name: "ผู้เล่น", level:1, exp:0, gold:9000,
    hp:100, maxHp:100, baseAtk:10, atk:10,
    inventory:[], equipment:{ weapon:null, armor:null, accessory:null }
  };

  socket.emit("player_data", players[socket.id]);
  socket.emit("place_data",  places.slime_field);

  socket.on("go_place", (place) => {
    if(places[place]) socket.emit("place_data", places[place]);
  });

  socket.on("attack_monster", (data) => {
    const player = players[socket.id];
    const place  = places[data.place];
    if(!place || !place.monsters) return;

    const monster = place.monsters.find(m => m.id === data.monsterId);
    if(!monster) return;

    monster.hp -= player.atk;

    if(monster.hp <= 0) {
      player.gold += monster.gold;
      player.exp  += monster.exp;

      socket.emit("combat_result", { type:"kill", monsterName:monster.name, gold:monster.gold, exp:monster.exp });

      // Level up
      while(player.exp >= expNeeded(player.level)) {
        player.exp   -= expNeeded(player.level);
        player.level += 1;
        player.baseAtk += 2;
        updatePlayerStats(player);
        player.hp = player.maxHp;
        socket.emit("combat_result", { type:"level_up", level:player.level });
      }

      monster.hp = monster.maxHp;
    } else {
      socket.emit("combat_result", { type:"hit", monsterName:monster.name, dmg:player.atk });
    }

    socket.emit("player_data", player);
    socket.emit("place_data",  place);
  });

  socket.on("buy_item", (itemId) => {
    const player = players[socket.id];
    const item   = items[itemId];
    if(!item) return;

    if(player.gold < item.price) {
      socket.emit("combat_result", { type:"cant_afford", itemName:item.name });
      return;
    }

    player.gold -= item.price;
    player.inventory.push(item.id);
    socket.emit("combat_result", { type:"buy", itemName:item.name });
    socket.emit("player_data", player);
  });

  socket.on("equip_item", (itemId) => {
    const player = players[socket.id];
    if(!player.inventory.includes(itemId)) return;

    const item = items[itemId];
    if(item.type === "weapon")    player.equipment.weapon    = itemId;
    if(item.type === "armor")     player.equipment.armor     = itemId;
    if(item.type === "accessory") player.equipment.accessory = itemId;

    updatePlayerStats(player);
    socket.emit("combat_result", { type:"equip", itemName:item.name });
    socket.emit("player_data", player);
  });

  socket.on("use_item", (itemId) => {
    const player = players[socket.id];
    const index  = player.inventory.indexOf(itemId);
    if(index === -1) return;

    const item = items[itemId];
    if(item.heal) {
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + item.heal);
      player.inventory.splice(index, 1);
      socket.emit("combat_result", { type:"heal", itemName:item.name, amount:player.hp - before });
    }

    socket.emit("player_data", player);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

server.listen(3000, () => console.log("Server running on :3000"));

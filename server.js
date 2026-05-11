const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

app.use(express.static("public"));

const players = {};

const items = {

    wood_sword: {
        id: "wood_sword",
        type: "weapon",

        name: "ดาบไม้",

        price: 50,

        atk: 5
    },

    iron_sword: {
        id: "iron_sword",
        type: "weapon",

        name: "ดาบเหล็ก",

        price: 150,

        atk: 15
    },

    leather_armor: {
        id: "leather_armor",
        type: "armor",

        name: "ชุดหนัง",

        price: 120,

        hp: 30
    },

    ring: {
        id: "ring",
        type: "accessory",

        name: "แหวนพลัง",

        price: 200,

        atk: 3
    },

    potion: {
        id: "potion",
        type: "usable",

        name: "ยาฟื้นฟู",

        price: 30,

        heal: 50
    }

};

const places = {

    slime_field: {
        name: "🟢 ทุ่งสไลม์",
        type: "monster",
        monsters: [
            {
                id: 1,
                name: "สไลม์",
                hp: 30,
                maxHp: 30,
                gold: 10,
                exp: 5
            }
        ]
    },

    goblin_forest: {
        name: "🌲 ป่าก็อบลิน",
        type: "monster",
        monsters: [
            {
                id: 2,
                name: "ก็อบลิน",
                hp: 60,
                maxHp: 60,
                gold: 20,
                exp: 10
            }
        ]
    },

    dungeon: {
        name: "🏰 ดันเจี้ยน",
        type: "monster",
        monsters: [
            {
                id: 3,
                name: "อัศวินต้องสาป",
                hp: 120,
                maxHp: 120,
                gold: 50,
                exp: 30
            }
        ]
    },

    market: {
    name: "🛒 ตลาด",
    type: "market",

    items: [
    "wood_sword",
    "iron_sword",
    "leather_armor",
    "ring",
    "potion"
]
}

};

function updatePlayerStats(player){

    player.atk =
        player.baseAtk;

    player.maxHp = 100;

    const weapon =
        player.equipment.weapon;

    const armor =
        player.equipment.armor;

    const accessory =
        player.equipment.accessory;

    if(weapon){

        const item =
            items[weapon];

        if(item.atk){
            player.atk += item.atk;
        }

    }

    if(armor){

        const item =
            items[armor];

        if(item.hp){
            player.maxHp += item.hp;
        }

    }

    if(accessory){

        const item =
            items[accessory];

        if(item.atk){
            player.atk += item.atk;
        }

        if(item.hp){
            player.maxHp += item.hp;
        }

    }

    if(player.hp > player.maxHp){
        player.hp = player.maxHp;
    }

}

io.on("connection", (socket) => {

    players[socket.id] = {

    name: "ผู้เล่น",

    level: 1,

    exp: 0,

    gold: 9000,

    hp: 100,

    maxHp: 100,

    baseAtk: 10,

    atk: 10,

    inventory: [],

    equipment: {

        weapon: null,

        armor: null,

        accessory: null

    }

};


    socket.emit(
        "player_data",
        players[socket.id]
    );

    socket.emit(
        "place_data",
        places.slime_field
    );

    socket.on(
        "go_place",
        (place) => {

            socket.emit(
                "place_data",
                places[place]
            );

        }
    );

    socket.on(
    "attack_monster",
    (data) => {

        const player =
            players[socket.id];

        const place =
            places[data.place];

        if(!place || !place.monsters)
            return;

        const monster =
            place.monsters.find(
                m => m.id === data.monsterId
            );

        if(!monster) return;

        monster.hp -= player.atk;

        if(monster.hp <= 0){

            player.gold += monster.gold;
            player.exp += monster.exp;

            monster.hp =
                monster.maxHp;

        }

        socket.emit(
            "player_data",
            player
        );

        socket.emit(
            "place_data",
            place
        );

    }
);

    socket.on(
    "buy_item",
    (itemId) => {

        const player =
            players[socket.id];

        const item =
            items[itemId];

        if(!item) return;

        if(player.gold < item.price)
            return;

        player.gold -= item.price;

        player.inventory.push(item.id);

        socket.emit(
            "player_data",
            player
        );

    }
);

socket.on(
    "equip_item",
    (itemId) => {

        const player =
            players[socket.id];

        if(
            !player.inventory.includes(itemId)
        ) return;

        const item =
            items[itemId];

        if(item.type === "weapon"){
    player.equipment.weapon = itemId;
}

if(item.type === "armor"){
    player.equipment.armor = itemId;
}

if(item.type === "accessory"){
    player.equipment.accessory = itemId;
}

        updatePlayerStats(player);

        socket.emit(
            "player_data",
            player
        );

    }
);

socket.on(
    "use_item",
    (itemId) => {

        const player =
            players[socket.id];

        const index =
            player.inventory.indexOf(itemId);

        if(index === -1)
            return;

        const item =
            items[itemId];

        if(item.heal){

            player.hp += item.heal;

            if(player.hp >
                player.maxHp){

                player.hp =
                    player.maxHp;

            }

            player.inventory.splice(
                index,
                1
            );

        }

        socket.emit(
            "player_data",
            player
        );

    }
);

});

server.listen(3000, () => {

    console.log(
        "Server running"
    );

});
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
        name: "ดาบไม้",
        price: 50,
        atk: 5
    },

    iron_sword: {
        id: "iron_sword",
        name: "ดาบเหล็ก",
        price: 150,
        atk: 15
    },

    potion: {
        id: "potion",
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
        "potion"
    ]
}

};

io.on("connection", (socket) => {

    players[socket.id] = {

    name: "ผู้เล่น",

    level: 1,

    exp: 0,

    gold: 0,

    hp: 100,

    maxHp: 100,

    atk: 10,

    inventory: []

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

        player.inventory.push(item);

        if(item.atk){
            player.atk += item.atk;
        }

        if(item.heal){

            player.hp += item.heal;

            if(player.hp > player.maxHp){
                player.hp =
                    player.maxHp;
            }

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
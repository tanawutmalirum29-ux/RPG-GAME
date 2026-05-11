const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

const monsters = [
    {
        id: 1,
        name: "สไลม์",
        hp: 30,
        maxHp: 30,
        atk: 3,
        gold: 10,
        exp: 5
    },
    {
        id: 2,
        name: "ก็อบลิน",
        hp: 60,
        maxHp: 60,
        atk: 6,
        gold: 20,
        exp: 10
    }
];

io.on("connection", (socket) => {

    players[socket.id] = {
        id: socket.id,
        name: "ผู้เล่น",
        level: 1,
        exp: 0,
        gold: 0,
        hp: 100,
        maxHp: 100,
        atk: 10
    };

    socket.emit("player_data", players[socket.id]);
    socket.emit("monster_list", monsters);

    socket.on("attack_monster", (monsterId) => {

        const player = players[socket.id];

        const monster =
            monsters.find(m => m.id === monsterId);

        if (!monster) return;

        monster.hp -= player.atk;

        if (monster.hp <= 0) {

            player.gold += monster.gold;
            player.exp += monster.exp;

            if (player.exp >= 20) {
                player.level++;
                player.exp = 0;
                player.maxHp += 20;
                player.hp = player.maxHp;
                player.atk += 5;
            }

            monster.hp = monster.maxHp;
        }

        socket.emit("player_data", player);

        io.emit("monster_list", monsters);

    });

    socket.on("disconnect", () => {
        delete players[socket.id];
    });

});

server.listen(3000, () => {
    console.log("Server running");
});
const socket = io();

const playerDiv =
    document.getElementById("player");

const monsterDiv =
    document.getElementById("monsters");

socket.on("player_data", (player) => {

    playerDiv.innerHTML = `
        <p>เลเวล: ${player.level}</p>
        <p>HP: ${player.hp}/${player.maxHp}</p>
        <p>ATK: ${player.atk}</p>
        <p>EXP: ${player.exp}</p>
        <p>Gold: ${player.gold}</p>
    `;

});

socket.on("monster_list", (monsters) => {

    monsterDiv.innerHTML = "";

    monsters.forEach(monster => {

        const div =
            document.createElement("div");

        div.className = "monster";

        div.innerHTML = `
            <h3>${monster.name}</h3>
            <p>HP:
            ${monster.hp}/${monster.maxHp}</p>

            <button onclick="attack(${monster.id})">
                ตี
            </button>
        `;

        monsterDiv.appendChild(div);

    });

});

function attack(id){
    socket.emit("attack_monster", id);
}
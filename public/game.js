const socket = io();

const playerDiv =
    document.getElementById("player");

const contentDiv =
    document.getElementById("content");

const locationName =
    document.getElementById("locationName");

let currentPlace = "slime_field";

socket.on("player_data", (player) => {

    playerDiv.innerHTML = `
        <p>👤 ${player.name}</p>

        <p>⭐ เลเวล ${player.level}</p>

        <p>
        ❤️ ${player.hp}/${player.maxHp}
        </p>

        <p>⚔ ${player.atk}</p>

        <p>✨ EXP ${player.exp}</p>

        <p>🪙 ${player.gold}</p>
    `;

});

socket.on("place_data", (data) => {

    locationName.innerText =
        data.name;

    contentDiv.innerHTML = "";

    if(data.type === "monster"){

        data.monsters.forEach(monster => {

            const div =
                document.createElement("div");

            div.className = "monster";

            div.innerHTML = `
                <h3>${monster.name}</h3>

                <p>
                ❤️ ${monster.hp}/${monster.maxHp}
                </p>

                <button
                onclick="attack(${monster.id})">

                    ⚔ โจมตี

                </button>
            `;

            contentDiv.appendChild(div);

        });

    }

    if(data.type === "market"){

        contentDiv.innerHTML = `
            <div class="monster">

                <h3>🛒 ร้านค้า</h3>

                <p>ดาบไม้ +5 ATK</p>

                <button onclick="buySword()">
                    ซื้อ 50 Gold
                </button>

            </div>
        `;

    }

});

function goPlace(place){

    currentPlace = place;

    socket.emit(
        "go_place",
        place
    );

}

function attack(id){

    socket.emit(
        "attack_monster",
        {
            place: currentPlace,
            monsterId: id
        }
    );

}

function buySword(){

    socket.emit("buy_sword");

}
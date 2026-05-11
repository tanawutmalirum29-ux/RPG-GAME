const socket = io();

const playerDiv =
    document.getElementById("player");

const contentDiv =
    document.getElementById("content");
const inventoryDiv =
    document.getElementById(
        "inventory"
    );

const locationName =
    document.getElementById("locationName");



let currentPlace = "slime_field";

const marketItems = {

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

socket.on("player_data", (player) => {

    playerDiv.innerHTML = `
        <p>👤 ${player.name}</p>

        <p>⭐ เลเวล ${player.level}</p>

        <p>
        ❤️ ${player.hp}/${player.maxHp}
        </p>

        <p>⚔ ${player.atk}</p>

        <p>🪙 ${player.gold}</p>

        <p>
🗡 อาวุธ:
${
player.equipment.weapon
?
marketItems[
player.equipment.weapon
].name
:
"ไม่มี"
}
</p>

<p>
🛡 ชุด:
${
player.equipment.armor
?
marketItems[
player.equipment.armor
].name
:
"ไม่มี"
}
</p>

<p>
💍 ประดับ:
${
player.equipment.accessory
?
marketItems[
player.equipment.accessory
].name
:
"ไม่มี"
}
</p>
    `;

    inventoryDiv.innerHTML = "";

    player.inventory.forEach(itemId => {

        const item =
            marketItems[itemId];

        const div =
            document.createElement("div");

        div.className = "monster";

        let buttons = "";

        if(item.atk){

            buttons += `
                <button
                onclick="equipItem(
                    '${item.id}'
                )">

                    สวมใส่

                </button>
            `;

        }

        if(item.heal){

            buttons += `
                <button
                onclick="useItem(
                    '${item.id}'
                )">

                    ใช้

                </button>
            `;

        }

        div.innerHTML = `
            <h3>${item.name}</h3>

            ${buttons}
        `;

        inventoryDiv.appendChild(div);

    });

});

function equipItem(id){

    socket.emit(
        "equip_item",
        id
    );

}

function useItem(id){

    socket.emit(
        "use_item",
        id
    );

}

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

    data.items.forEach(itemId => {

        const item =
            marketItems[itemId];

        const div =
            document.createElement("div");

        div.className = "monster";

        let stats = "";

        if(item.atk){
            stats += `⚔ +${item.atk} `;
        }

        if(item.heal){
            stats += `❤️ +${item.heal}`;
        }

        div.innerHTML = `
            <h3>${item.name}</h3>

            <p>${stats}</p>

            <p>
            🪙 ${item.price}
            </p>

            <button
            onclick="buyItem('${item.id}')">

                ซื้อ

            </button>
        `;

        contentDiv.appendChild(div);

    });

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

function buyItem(id){

    socket.emit(
        "buy_item",
        id
    );

}
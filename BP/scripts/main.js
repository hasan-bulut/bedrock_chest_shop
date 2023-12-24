import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { JsonDatabase } from "./database";

const db = new JsonDatabase("database");
db.load();

function capitalizeEveryWord(sentence) {
    let words = sentence.split(" ");
    for (let i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    let capitalizedSentence = words.join(" ");
    return capitalizedSentence;
}

function createShopForm(item) {
    var itemName = item.typeId;
    itemName = itemName.replace("minecraft:", "");
    itemName = itemName.replace("_", " ");
    const form = new ModalFormData();
    form.title("Pazar Oluştur");
    form.textField(capitalizeEveryWord(itemName) + "\n\nMiktar", "64")
    form.textField("Fiyat", "100")

    return form;
}

world.afterEvents.playerInteractWithBlock.subscribe(event => {
    var player = event.player;
    var block = event.block;
    var item = event.itemStack;

    if (player.isSneaking &&
        block.typeId == "minecraft:chest") {
        if (item != undefined) {
            if ((player['useCD'] ?? 0) > Date.now()) return;
            player['useCD'] = Date.now() + 500;
            event.cancel = true;
            createShopForm(item).show(player).then(data => {
                var dataValue = data.formValues;
                if (!dataValue.includes("")) {
                    if (dataValue.every(value => /^\d+$/.test(value))) {
                        var shops = db.get("shops") ?? [];
                        shops.push({ coords: block.location, itemId: item.typeId, amount: parseInt(dataValue[0]), price: parseInt(dataValue[1]), owner: player.name });
                        db.set("shops", shops);
                        player.onScreenDisplay.setActionBar("§aMarket başarıyla oluşturuldu.");
                    } else {
                        player.onScreenDisplay.setActionBar("§cSadece sayı giriniz!");
                    }
                } else {
                    player.onScreenDisplay.setActionBar("§cTüm boşlukları doldurunuz!");
                }
            });
        }
    }
})

world.afterEvents.playerBreakBlock.subscribe(event => {
    var player = event.player;
    var block = event.block;

    var shops = db.get("shops") ?? [];

    shops.forEach(value => {
        if (JSON.stringify(block.location) === JSON.stringify(value.coords) &&
            player.name != value.owner) {
            event.cancel = true;
            player.sendMessage("§cBu marketi kıramazsınız!");
        } else {
            const form = new MessageFormData();
            form.title("Market Kaldırılıyor");
            form.body("Kaldırmak istediğine emin misin?");
            form.button2("§aEvet");
            form.button1("§cHayır");

            form.show(player).then(data => {
                if (data.selection == 1) {
                    player.sendMessage("§aMarket Kaldırıldı");
                } else {
                    player.sendMessage("§cİptal Edildi.");
                }
            });
        }
    });
})

world.beforeEvents.chatSend.subscribe(event => {
    if (event.message == "clear db") {
        db.set("shops", []);
        event.sender.sendMessage("silindi");
    } else if (event.message == "getall") {
        event.sender.sendMessage(JSON.stringify(db.get("shops")));
    }
})
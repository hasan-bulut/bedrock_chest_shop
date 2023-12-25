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
    form.title(translate("pazar.olustur"));
    form.textField({ "rawtext": [{ "text": capitalizeEveryWord(itemName) + "\n\n" }, { "translate": "miktar" }] }, "64")
    form.textField(translate("fiyat"), "100")

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
                        player.onScreenDisplay.setActionBar(translate("market.basariyla.olusturuldu"));
                    } else {
                        player.onScreenDisplay.setActionBar(translate("sadece.sayi.giriniz"));
                    }
                } else {
                    player.onScreenDisplay.setActionBar(translate("tum.bosluklari.doldurunuz"));
                }
            });
        }
    }
})

world.afterEvents.playerBreakBlock.subscribe(event => {
    var player = event.player;
    var block = event.block;

    var shops = db.get("shops") ?? [];

    shops.forEach(shop => {
        if (JSON.stringify(block.location) === JSON.stringify(shop.coords)) {
            if (player.name != shop.owner) {
                event.cancel = true;
                player.sendMessage(translate("bu.marketi.kiramazsiniz"));
            } else {
                if (shops.indexOf(shop) !== -1) {
                    shops.splice(shop, 1);
                }
                db.set("shops", shops);
                player.sendMessage(translate("market.kaldirildi"));
            }
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
})function translate(key) {
    return { "rawtext": [{ "translate": key }] };
};
import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { JsonDatabase } from "./database";

const db = new JsonDatabase("database");
db.load();

function createForm(item) {
    const form = new ModalFormData();
    form.title("Pazar Oluştur");
    form.textField(item.typeId + "\n\nMiktar", "64")
    form.textField("Fiyat", "100")

    return form;
}

world.afterEvents.playerInteractWithBlock.subscribe(event => {
    var player = event.player;
    var block = event.block;
    var item = event.itemStack;

    if (player.isSneaking &&
        block.typeId == "minecraft:chest" &&
        item.typeId == "minecraft:oak_sign") {

        createForm(item).show(player).then(data => {
            switch (data.selection) {
                case 0:
                    world.sendMessage('button 1')
                    break;
                case 1:
                    world.sendMessage('button 2')
                    break;
            }
        });

    }
})
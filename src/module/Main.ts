/* Copyright 2020 Andrew Cuccinello
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const MODULE_NAME = 'pdfoundry-pf2e';
const KEY_SOURCE = 'source';

enum ItemType {
    Weapon = 'weapon',
    Melee = 'melee',
    Armor = 'armor',
    Equipment = 'equipment',
    Consumable = 'consumable',
    Treasure = 'treasure',
    Lore = 'lore',
    Martial = 'martial',
    Spell = 'spell',
    SpellcastingEntry = 'spellcastingEntry',
    Feat = 'feat',
    Action = 'action',
    Backpack = 'backpack',
    Kit = 'kit',
    Condition = 'condition',
}

function getSource(item: Item): string {
    return item.getFlag(MODULE_NAME, KEY_SOURCE) ?? '';
}

function bindHandler(label: JQuery<HTMLLabelElement>, input: JQuery<HTMLInputElement>) {
    label.on('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const inputValue = $(input).val();
        if (typeof inputValue !== 'string') {
            return;
        }

        openPDF(inputValue);
    });
}

function openPDF(source: string) {
    let [nameOrCode, pageString] = source.split(' ');
    if (nameOrCode === undefined || pageString === undefined || nameOrCode === '' || pageString === '') {
        ui.notifications.error('Please enter a valid source link.');
        return;
    }

    nameOrCode = nameOrCode.trim();
    pageString = pageString.trim();

    let page: number;
    try {
        page = parseInt(pageString);
    } catch (e) {
        ui.notifications.error('Unable to convert page to a number.');
        return;
    }

    const PDFoundry = ui['PDFoundry'] as any;
    if (PDFoundry === undefined) {
        ui.notifications.error('PDFoundry PF2E support requires PDFoundry enabled.');
        return;
    }

    const pdfData = PDFoundry.findPDFData((data) => data.name === nameOrCode || data.code === nameOrCode);
    if (pdfData) {
        PDFoundry.openPDF(pdfData, { page });
    } else {
        ui.notifications.error(`Unable to find a PDF with the name or code "${nameOrCode}".`);
    }
}

Hooks.on('ready', () => {
    if (!hasProperty(ui, 'PDFoundry')) {
        ui.notifications.error('PDFoundry PF2E support requires PDFoundry enabled.');
    }
});

Hooks.on('renderItemSheet', (app: ItemSheet, html: JQuery) => {
    const item = app.item as Item;
    const value: string = item.getFlag(MODULE_NAME, KEY_SOURCE) ?? '';

    let label, input, container;
    switch (item.data.type as ItemType) {
        // Unsupported - no place for link
        case ItemType.Melee:
        case ItemType.Martial:
        case ItemType.SpellcastingEntry:
            break;
        // All render the same
        case ItemType.Spell:
        case ItemType.Feat:
        case ItemType.Action:
        case ItemType.Condition:
            label = $(`<label>Source</label>`) as JQuery<HTMLLabelElement>;
            input = $(`<input type="text" name="flags.${MODULE_NAME}.${KEY_SOURCE}" value="${value}">`) as JQuery<HTMLInputElement>;

            container = $(`<span class="item-summary pdf-source"></span>`) as JQuery<HTMLSpanElement>;
            container.append(label);
            container.append(input);

            bindHandler(label, input);

            const h4 = html.find('section.sheet-sidebar h4');
            if (h4.length > 0) {
                html.find('section.sheet-sidebar h4').after(container);
            } else {
                html.find('section.sheet-sidebar').prepend(container);
            }

            break;
        // All render the same
        case ItemType.Weapon:
        case ItemType.Armor:
        case ItemType.Equipment:
        case ItemType.Consumable:
        case ItemType.Treasure:
        case ItemType.Lore:
        case ItemType.Backpack:
        case ItemType.Kit:
            label = $(`<label>Source</label>`) as JQuery<HTMLLabelElement>;
            input = $(`<input type="text" name="flags.${MODULE_NAME}.${KEY_SOURCE}" value="${value}">`) as JQuery<HTMLInputElement>;

            container = $(`<div class="form-group pdf-source"></div>`) as JQuery<HTMLDivElement>;
            container.append(label);
            container.append(input);

            bindHandler(label, input);

            html.find('div.inventory-details').prepend(container);
            break;
    }
});

Hooks.on('renderCRBStyleCharacterActorSheetPF2E', (app: ActorSheet, html: JQuery) => {
    const actor = app.actor as Actor;
    const controls = html.find('div.item-controls') as JQuery<HTMLDivElement>;
    for (let div of controls) {
        const container = $(div);
        const itemLi = $(div).parents('li.item');
        const itemId = itemLi.data('item-id');
        const entity = actor.getOwnedItem(itemId);

        if (entity) {
            const source = getSource(entity);
            if (source === '') continue;

            const anchor = $(`<a class="item-control item-pdf" title="Open PDF"><i class="fas fa-file-pdf"></i></a>`);
            container.prepend(anchor);

            anchor.on('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();

                openPDF(source);
            });
        }
    }
});

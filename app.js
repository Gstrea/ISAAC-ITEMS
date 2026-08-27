let items = [];

const state = {

    search: "",

    quality: new Set(),

    types: new Set(),

    pools: new Set(),

    colors: new Set(),

    dlcs: new Set()
};


const $ = id =>
    document.getElementById(id);


/* =================================
   LOAD JSON
================================= */

async function loadItems() {

    try {

        const response =
            await fetch("./data/items.json");

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        items =
            await response.json();


        $("itemCount").textContent =
            `${items.length} items`;


        buildFilters();

        render();

    }

    catch (error) {

        console.error(error);

        $("itemsContainer").innerHTML = `
            <div class="empty">
                Could not load item database.
            </div>
        `;

    }

}


/* =================================
   UNIQUE VALUES
================================= */

function getValues(property) {

    const values =
        new Set();


    for (const item of items) {

        const array =
            item[property];


        if (!Array.isArray(array)) {
            continue;
        }


        for (const value of array) {

            if (value) {

                values.add(value);

            }

        }

    }


    return [...values].sort(
        (a, b) =>
            String(a).localeCompare(
                String(b)
            )
    );
}


/* =================================
   CHECKBOX FILTER
================================= */

function buildCheckboxes(
    containerId,
    values,
    stateSet
) {

    const container =
        $(containerId);


    container.innerHTML = "";


    for (const value of values) {

        const label =
            document.createElement("label");


        label.className =
            "checkbox-item";


        const input =
            document.createElement("input");


        input.type =
            "checkbox";


        input.value =
            value;


        const text =
            document.createElement("span");


        text.textContent =
            value;


        input.addEventListener(
            "change",
            () => {

                if (input.checked) {

                    stateSet.add(value);

                } else {

                    stateSet.delete(value);

                }


                render();

            }
        );


        label.appendChild(input);

        label.appendChild(text);

        container.appendChild(label);

    }

}


/* =================================
   BUILD FILTERS
================================= */

function buildFilters() {

    const types =
        getValues("types");

    const pools =
        getValues("pools");

    const colors =
        getValues("colors");

    const dlcs =
        getValues("dlcs");


    buildCheckboxes(
        "typeFilters",
        types,
        state.types
    );


    buildCheckboxes(
        "poolFilters",
        pools,
        state.pools
    );


    buildCheckboxes(
        "colorFilters",
        colors,
        state.colors
    );


    buildCheckboxes(
        "dlcFilters",
        dlcs,
        state.dlcs
    );


    $("colorEmpty").style.display =
        colors.length
            ? "none"
            : "block";


    $("dlcEmpty").style.display =
        dlcs.length
            ? "none"
            : "block";

}


/* =================================
   ARRAY FILTER
================================= */

function matchesArray(
    item,
    property,
    selected
) {

    if (selected.size === 0) {

        return true;

    }


    const values =
        item[property] || [];


    return [...selected].some(
        value =>
            values.includes(value)
    );

}


/* =================================
   SEARCH
================================= */

function matchesSearch(item) {

    if (!state.search) {

        return true;

    }


    const text = [

        item.id,

        item.name,

        item.pickup,

        item.description,

        ...(item.types || []),

        ...(item.pools || [])

    ]
        .join(" ")
        .toLowerCase();


    return text.includes(
        state.search
    );

}


/* =================================
   FILTER
================================= */

function getFilteredItems() {

    return items.filter(item => {


        /* SEARCH */

        if (!matchesSearch(item)) {

            return false;

        }


        /* QUALITY */

        if (

            state.quality.size > 0 &&

            !state.quality.has(
                Number(item.quality)
            )

        ) {

            return false;

        }


        /* TYPE */

        if (
            !matchesArray(
                item,
                "types",
                state.types
            )
        ) {

            return false;

        }


        /* POOL */

        if (
            !matchesArray(
                item,
                "pools",
                state.pools
            )
        ) {

            return false;

        }


        /* COLOUR */

        if (
            !matchesArray(
                item,
                "colors",
                state.colors
            )
        ) {

            return false;

        }


        /* DLC */

        if (
            !matchesArray(
                item,
                "dlcs",
                state.dlcs
            )
        ) {

            return false;

        }


        return true;

    });

}


/* =================================
   SORT
================================= */

function sortItems(list) {

    const mode =
        $("sortSelect").value;


    return [...list].sort(
        (a, b) => {

            switch (mode) {

                case "name":

                    return String(a.name)
                        .localeCompare(
                            String(b.name)
                        );


                case "quality-desc":

                    return (
                        Number(b.quality ?? -1) -
                        Number(a.quality ?? -1)
                    );


                case "quality-asc":

                    return (
                        Number(a.quality ?? -1) -
                        Number(b.quality ?? -1)
                    );


                default:

                    return (
                        Number(a.id ?? 0) -
                        Number(b.id ?? 0)
                    );

            }

        }
    );

}


/* =================================
   RENDER
================================= */

function render() {

    let filtered =
        getFilteredItems();


    filtered =
        sortItems(filtered);


    $("resultsText").textContent =
        `${filtered.length} / ${items.length} items`;


    const container =
        $("itemsContainer");


    container.innerHTML = "";


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="empty">
                No items match your filters.
            </div>
        `;

        return;

    }


    for (const item of filtered) {

        container.appendChild(
            createCard(item)
        );

    }

}


/* =================================
   CREATE CARD
================================= */

function createCard(item) {

    const card =
        document.createElement("article");


    card.className =
        "item-card";


    /* IMAGE */

    const image =
        document.createElement("div");


    image.className =
        "item-image";


    if (item.image) {

        const img =
            document.createElement("img");


        img.src =
            item.image;


        img.alt =
            item.name || "Item";


        img.loading =
            "lazy";


        image.appendChild(img);

    }

    else {

        const noImage =
            document.createElement("span");


        noImage.className =
            "no-image";


        noImage.textContent =
            "NO IMAGE";


        image.appendChild(noImage);

    }


    /* CONTENT */

    const content =
        document.createElement("div");


    content.className =
        "item-content";


    /* TITLE */

    const titleRow =
        document.createElement("div");


    titleRow.className =
        "item-title-row";


    const title =
        document.createElement("h2");


    title.className =
        "item-title";


    title.innerHTML =
        `<span class="item-id">
            #${escapeHTML(item.id)}
        </span>
        ${escapeHTML(item.name || "Unknown Item")}`;


    const quality =
        document.createElement("span");


    quality.className =
        "quality";


    quality.textContent =
        item.quality !== null &&
        item.quality !== undefined
            ? `Q${item.quality}`
            : "Q?";


    titleRow.appendChild(title);

    titleRow.appendChild(quality);


    /* META */

    const meta =
        document.createElement("div");


    meta.className =
        "item-meta";


    const tags = [

        ...(item.types || []),

        ...(item.pools || []),

        ...(item.dlcs || []),

        ...(item.colors || [])

    ];


    for (const value of tags) {

        const tag =
            document.createElement("span");


        tag.className =
            "tag";


        tag.textContent =
            value;


        meta.appendChild(tag);

    }


    /* PICKUP */

    const pickup =
        document.createElement("div");


    pickup.className =
        "item-pickup";


    pickup.textContent =
        item.pickup || "";


    /* DESCRIPTION */

    const description =
        document.createElement("div");


    description.className =
        "item-description";


    description.textContent =
        item.description || "";


    content.appendChild(titleRow);

    content.appendChild(meta);

    content.appendChild(pickup);

    content.appendChild(description);


    card.appendChild(image);

    card.appendChild(content);


    return card;

}


/* =================================
   ESCAPE HTML
================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =================================
   QUALITY BUTTONS
================================= */

document
    .querySelectorAll(".quality-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const quality =
                    Number(
                        button.dataset.quality
                    );


                if (
                    state.quality.has(
                        quality
                    )
                ) {

                    state.quality.delete(
                        quality
                    );

                    button.classList.remove(
                        "active"
                    );

                }

                else {

                    state.quality.add(
                        quality
                    );

                    button.classList.add(
                        "active"
                    );

                }


                render();

            }
        );

    });


/* =================================
   SEARCH
================================= */

$("searchInput")
    .addEventListener(
        "input",
        event => {

            state.search =
                event.target.value
                    .trim()
                    .toLowerCase();


            render();

        }
    );


/* =================================
   SORT
================================= */

$("sortSelect")
    .addEventListener(
        "change",
        render
    );


/* =================================
   CLEAR
================================= */

$("clearFilters")
    .addEventListener(
        "click",
        () => {

            state.search = "";

            state.quality.clear();

            state.types.clear();

            state.pools.clear();

            state.colors.clear();

            state.dlcs.clear();


            $("searchInput").value = "";


            document
                .querySelectorAll(
                    ".quality-btn"
                )
                .forEach(button => {

                    button.classList.remove(
                        "active"
                    );

                });


            document
                .querySelectorAll(
                    ".checkbox-item input"
                )
                .forEach(input => {

                    input.checked = false;

                });


            render();

        }
    );


/* =================================
   START
================================= */

loadItems();

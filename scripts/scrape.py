import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup


URL = "https://www.tboi.com/"
OUTPUT = Path("data/items.json")


HEADERS = {
    "User-Agent": "Mozilla/5.0 IsaacItemFinder/1.0"
}


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")

    # Pobieramy cały tekst strony w kolejności,
    # w jakiej występuje w HTML.
    lines = []

    for line in soup.stripped_strings:
        line = clean(line)

        if line:
            lines.append(line)

    items = []

    i = 0

    while i < len(lines):

        # Szukamy:
        # ItemID: 123
        match = re.fullmatch(
            r"ItemID:\s*(\d+)",
            lines[i]
        )

        if not match:
            i += 1
            continue

        item_id = int(match.group(1))

        # -----------------------------------------
        # SZUKANIE NAZWY I PICKUP TEXTU
        # -----------------------------------------

        name = ""
        pickup = ""

        # Przed ItemID znajdują się zwykle:
        #
        # Item name
        # "Pickup text"
        # ItemID: xxx
        #
        # Szukamy maksymalnie kilku linii wstecz.

        previous = lines[max(0, i - 5):i]

        for line in reversed(previous):

            if line.startswith('"') and line.endswith('"'):
                pickup = line.strip('"')
                continue

            if (
                line
                and not line.startswith("ItemID:")
                and not line.startswith("Quality:")
                and not line.startswith("Type:")
                and not line.startswith("Item Pool:")
                and not line.startswith("Recharge Time:")
                and not line.startswith("*")
            ):
                name = line
                break

        # -----------------------------------------
        # SZUKANIE DANYCH PO ITEMID
        # -----------------------------------------

        quality = None
        item_type = []
        pools = []

        description = []

        j = i + 1

        while j < len(lines):

            line = lines[j]

            # Następny item
            if re.fullmatch(
                r"ItemID:\s*(\d+)",
                line
            ):
                break

            # Quality
            quality_match = re.fullmatch(
                r"Quality:\s*(\d+)",
                line
            )

            if quality_match:
                quality = int(
                    quality_match.group(1)
                )

                j += 1
                continue

            # Type
            if line.startswith("Type:"):

                value = line[
                    len("Type:"):
                ].strip()

                item_type = [
                    clean(x)
                    for x in value.split(",")
                    if clean(x)
                ]

                j += 1
                continue

            # Item Pool
            if line.startswith("Item Pool:"):

                value = line[
                    len("Item Pool:"):
                ].strip()

                pools = [
                    clean(x)
                    for x in value.split(",")
                    if clean(x)
                ]

                j += 1
                continue

            # Recharge Time
            if line.startswith(
                "Recharge Time:"
            ):
                j += 1
                continue

            # Separatory
            if line == "*":
                j += 1
                continue

            # Nagłówki sekcji
            if (
                line.startswith(
                    "The Binding of Isaac:"
                )
                or line.startswith(
                    "Repentance Items"
                )
                or line.startswith(
                    "Afterbirth"
                )
                or line.startswith(
                    "Rebirth Items"
                )
            ):
                j += 1
                continue

            # Pickup nie powinien trafić do opisu
            if line == f'"{pickup}"':
                j += 1
                continue

            # Pozostały tekst traktujemy jako opis
            if (
                line
                and not line.startswith("ItemID:")
            ):
                description.append(line)

            j += 1

        items.append({
            "id": item_id,
            "name": name,
            "quality": quality,
            "colors": [],
            "pools": pools,
            "types": item_type,
            "dlcs": [],
            "pickup": pickup,
            "description": "\n".join(
                description
            ),
            "image": ""
        })

        i = j

    return items


def main():

    print("Downloading tboi.com...")

    response = requests.get(
        URL,
        headers=HEADERS,
        timeout=30
    )

    response.raise_for_status()

    print(
        f"Downloaded {len(response.text)} characters"
    )

    items = parse_page(
        response.text
    )

    # Usuwamy ewentualne duplikaty ID.
    unique = {}

    for item in items:
        unique[item["id"]] = item

    items = list(
        unique.values()
    )

    items.sort(
        key=lambda x: x["id"]
    )

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    OUTPUT.write_text(
        json.dumps(
            items,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    print(
        f"Saved {len(items)} items"
    )

    if items:

        print("\nFirst 5 items:")

        for item in items[:5]:

            print(
                f'{item["id"]}: '
                f'{item["name"]} '
                f'(Q{item["quality"]})'
            )


if __name__ == "__main__":
    main()

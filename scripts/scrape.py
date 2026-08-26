import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup


URL = "https://www.tboi.com/"

OUTPUT = Path("data/items.json")


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def parse_item(block):
    text = block.get_text("\n", strip=True)

    id_match = re.search(
        r"ItemID:\s*(\d+)",
        text
    )

    if not id_match:
        return None

    item_id = int(id_match.group(1))


    quality_match = re.search(
        r"Quality:\s*(\d+)",
        text
    )

    quality = (
        int(quality_match.group(1))
        if quality_match
        else None
    )


    type_match = re.search(
        r"Type:\s*(.+)",
        text
    )

    item_type = []

    if type_match:
        item_type = [
            clean(x)
            for x in type_match.group(1).split(",")
        ]


    pool_match = re.search(
        r"Item Pool:\s*(.+)",
        text
    )

    pools = []

    if pool_match:
        pools = [
            clean(x)
            for x in pool_match.group(1).split(",")
        ]


    lines = [
        clean(line)
        for line in text.splitlines()
        if clean(line)
    ]


    name = ""

    for line in lines:

        if (
            not line.startswith("ItemID:")
            and not line.startswith("Quality:")
            and not line.startswith("Type:")
            and not line.startswith("Item Pool:")
            and not line.startswith("Recharge Time:")
        ):

            name = line
            break


    pickup = ""

    try:

        quality_index = next(
            i
            for i, line in enumerate(lines)
            if line.startswith("Quality:")
        )

        if quality_index > 0:

            candidate = lines[
                quality_index - 1
            ]

            if (
                not candidate.startswith("ItemID:")
                and not candidate.startswith("Type:")
                and not candidate.startswith("Item Pool:")
            ):

                pickup = candidate.strip('"')

    except StopIteration:
        pass


    description_lines = []

    if quality_match:

        start = False

        for line in lines:

            if line.startswith("Quality:"):
                start = True
                continue

            if line.startswith("Type:"):
                break

            if line.startswith("Item Pool:"):
                break

            if not start:
                continue

            if line == pickup:
                continue

            description_lines.append(line)


    description = "\n".join(
        description_lines
    )


    image = ""

    img = block.find("img")

    if img:

        image = (
            img.get("src")
            or img.get("data-src")
            or ""
        )


    return {
        "id": item_id,
        "name": name,
        "quality": quality,
        "colors": [],
        "pools": pools,
        "types": item_type,
        "dlcs": [],
        "pickup": pickup,
        "description": description,
        "image": image
    }


def main():

    print("Downloading tboi.com...")

    response = requests.get(
        URL,
        headers={
            "User-Agent":
            "Mozilla/5.0 IsaacItemFinder/1.0"
        },
        timeout=30
    )

    response.raise_for_status()


    print(
        "Downloaded:",
        len(response.text),
        "characters"
    )


    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )


    items = {}


    # Szukamy wszystkich miejsc,
    # w których występuje ItemID.
    for text_node in soup.find_all(
        string=re.compile(
            r"ItemID:\s*\d+"
        )
    ):

        parent = text_node.parent


        # Idziemy kilka poziomów w górę,
        # szukając kontenera pojedynczego itemu.
        for _ in range(8):

            if parent is None:
                break


            item_id_count = len(
                re.findall(
                    r"ItemID:\s*\d+",
                    parent.get_text(
                        " ",
                        strip=True
                    )
                )
            )


            if item_id_count == 1:

                item = parse_item(parent)

                if item:

                    items[item["id"]] = item

                break


            parent = parent.parent


    result = list(
        items.values()
    )


    result.sort(
        key=lambda item: item["id"]
    )


    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    OUTPUT.write_text(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )


    print(
        f"Saved {len(result)} items"
    )

    print(
        f"Output: {OUTPUT}"
    )


if __name__ == "__main__":
    main()

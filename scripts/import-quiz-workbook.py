from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Tuple
from zipfile import ZipFile
from xml.etree import ElementTree as ET


WORKBOOK_PATH = Path(r"c:\ativacoes\magalu_system\Cópia de Perguntas Fornecedores - Posicionamento 2026 (respostas).xlsx")
DATA_PATH = Path(r"c:\ativacoes\magalu_system\src\data\estandes-quiz-data.json")

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

APP_NAME_ALIAS_MAP = {
    "britania britani philco": "Britânia",
    "philco britania philco": "Philco",
    "aoc philips aoc": "AOC",
    "philips philips aoc": "Philips Envision",
    "brastemp brastemp consul": "Brastemp",
    "consul brastemp consul": "Consul",
    "atlas dako": "Atlas | Dako",
}

MANUAL_QUESTION_FALLBACKS = {
    "samsung": {
        "question": "Qual é a tecnologia de tela exclusiva mais associada às TVs premium da Samsung?",
        "options": [
            {"text": "OLED", "isCorrect": False},
            {"text": "QLED", "isCorrect": True},
            {"text": "LCD", "isCorrect": False},
            {"text": "Plasma", "isCorrect": False},
        ],
    },
    "motorola": {
        "question": "Qual é o produto mais premium da Motorola em 2026, citado como o flagship mais novo da marca?",
        "options": [
            {"text": "Motorola Signature", "isCorrect": False},
            {"text": "Motorola Razr", "isCorrect": True},
            {"text": "Motorola Edge", "isCorrect": False},
            {"text": "Moto G", "isCorrect": False},
        ],
    },
}


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = text.replace("&", " e ").lower()
    text = re.sub(r"\bestande\b", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_workbook_rows(path: Path) -> List[Tuple[str, List[Dict[str, str]]]]:
    with ZipFile(path) as zip_file:
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in zip_file.namelist():
            shared_root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("main:si", NS):
                text = "".join(node.text or "" for node in item.findall(".//main:t", NS))
                shared_strings.append(text)

        workbook_root = ET.fromstring(zip_file.read("xl/workbook.xml"))
        workbook_rels_root = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            rel.attrib["Id"]: rel.attrib["Target"]
            for rel in workbook_rels_root.findall("rel:Relationship", NS)
        }

        sheets: List[Tuple[str, str]] = []
        for sheet in workbook_root.find("main:sheets", NS):
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            sheets.append((sheet.attrib["name"], "xl/" + rel_map[rid]))

        def cell_value(cell: ET.Element) -> str:
            value_node = cell.find("main:v", NS)
            if value_node is None:
                inline = cell.find("main:is", NS)
                if inline is not None:
                    return "".join(node.text or "" for node in inline.findall(".//main:t", NS))
                return ""

            raw = value_node.text or ""
            if cell.attrib.get("t") == "s":
                return shared_strings[int(raw)]
            return raw

        output: List[Tuple[str, List[Dict[str, str]]]] = []
        for name, target in sheets:
            sheet_root = ET.fromstring(zip_file.read(target))
            rows: List[Dict[str, str]] = []
            for row in sheet_root.findall(".//main:sheetData/main:row", NS):
                current: Dict[str, str] = {}
                for cell in row.findall("main:c", NS):
                    column = "".join(ch for ch in cell.attrib.get("r", "") if ch.isalpha())
                    current[column] = cell_value(cell)
                rows.append(current)
            output.append((name, rows))
        return output


def clean_value(value: str) -> str:
    text = str(value or "").replace("\r", "").strip()
    text = re.sub(r"\s+\n", "\n", text)
    text = re.sub(r"\n\s+", "\n", text)
    return text.strip()


def cleanup_question_text(value: str) -> str:
    text = clean_value(value)
    text = re.sub(r"(?i)^pergunta:\s*", "", text)
    text = re.sub(r"(?i)\n?alternativas:\s*$", "", text)
    return clean_value(text)


def cleanup_option_text(value: str) -> str:
    text = clean_value(value)
    text = text.replace("✅", "")
    text = re.sub(r"(?i)^alternativa\s*", "", text)
    text = re.sub(r"(?i)^resposta correta[:\s-]*", "", text)
    text = re.sub(r"(?i)^resposta[:\s-]*", "", text)
    text = re.sub(r"(?i)^incorreta\s*[:\-]\s*", "", text)
    text = re.sub(r"(?i)^correta\s*[-:]\s*", "", text)
    text = re.sub(r"(?i)^correta\b", "", text)
    text = re.sub(r"(?i)^-\s*", "", text)
    text = re.sub(r"(?i)\s*=>.*resposta correta\s*$", "", text)
    text = re.sub(r"\s*=>.*$", "", text)
    text = re.sub(r"(?i)\s*\(?resposta correta\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?alternativa correta\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?correto\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?correta\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?verdadeira\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?falsa\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?sim\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*\(?n[aã]o\)?\s*$", "", text)
    text = re.sub(r"(?i)\s*-\s*incorreta\s*$", "", text)
    text = re.sub(r"(?i)\s*-\s*correta\s*$", "", text)
    text = re.sub(r"(?i)\s*-\s*in\s*$", "", text)
    text = re.sub(r"^:\s*", "", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\(\s*\)", "", text)
    text = text.strip(" .;-(),")
    return clean_value(text)


def strip_option_prefix(value: str) -> str:
    text = clean_value(value)
    return re.sub(r"(?i)^((?:0?[1-9])|[A-D])[\)\.:\-]\s*", "", text).strip()


def strip_correctness_markers(value: str) -> str:
    text = clean_value(value)
    text = re.sub(r"(?i)\(?\s*resposta\s*:?\s*", "", text)
    text = re.sub(r"(?i)\(?\s*alternativa\s*\d+\s*:?\s*", "", text)
    text = re.sub(r"(?i)\(?\s*alternativa\s*", "", text)
    text = re.sub(r"(?i)\(?\s*resposta correta\s*:?\s*", "", text)
    text = re.sub(r"(?i)\(?\s*-?\s*incorreta\s*\)?", "", text)
    text = re.sub(r"(?i)\(?\s*-?\s*correta\s*\)?", "", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"\(\s*\)", "", text)
    return clean_value(text.strip(" .;-(),"))


def split_options_block(raw: str) -> List[str]:
    text = clean_value(raw)
    if not text:
        return []

    text = re.sub(r"(?i)^alternativas:\s*", "", text).strip()
    text = re.sub(r"(?is)\nresposta\s*:.*$", "", text)
    text = re.sub(r"\),\s*\(", "\n", text)
    text = re.sub(r"^\(|\)$", "", text)

    labeled_matches = list(re.finditer(r"(?:^|\n|\s)(?:alternativa\s*)?((?:0?[1-9])|[A-D])[\)\.:\-]\s*", text, flags=re.IGNORECASE))
    if len(labeled_matches) >= 2:
        options: List[str] = []
        for index, match in enumerate(labeled_matches):
            start = match.end()
            end = labeled_matches[index + 1].start() if index + 1 < len(labeled_matches) else len(text)
            option_text = clean_value(text[start:end].strip(" .;/"))
            option_text = cleanup_option_text(strip_option_prefix(strip_correctness_markers(option_text)))
            if option_text:
                options.append(option_text)
        if options:
            return options

    line_parts = [clean_value(part.strip(" .;")) for part in text.split("\n") if clean_value(part)]
    if len(line_parts) >= 2:
        return line_parts

    slash_parts = [clean_value(part.strip(" .;")) for part in re.split(r"\s+/\s+", text) if clean_value(part)]
    if len(slash_parts) >= 2:
        return slash_parts

    comma_parts = [clean_value(part.strip(" .;")) for part in re.split(r",\s*", text) if clean_value(part)]
    if len(comma_parts) >= 2:
        return comma_parts

    return [text]


def infer_correct_answer(raw: str, options: List[str], explicit_correct: str = "") -> str:
    explicit = clean_value(explicit_correct)
    if explicit:
        explicit_normalized = normalize_text(cleanup_option_text(strip_option_prefix(strip_correctness_markers(explicit))))
        for option in options:
            if explicit_normalized in normalize_text(option) or normalize_text(option) in explicit_normalized:
                return option

    text = clean_value(raw)
    inline_correct_match = re.search(
        r"(?im)^\s*((?:0?[1-9])|[A-D])[\)\.-]?\s*.*=>.*resposta correta.*$",
        text,
    )
    if inline_correct_match and options:
        captured = inline_correct_match.group(1)
        if captured.isdigit():
            numeric_index = max(0, int(captured) - 1)
            if numeric_index < len(options):
                return options[numeric_index]
        alpha_index = ord(captured.upper()) - ord('A')
        if 0 <= alpha_index < len(options):
            return options[alpha_index]

    response_match = re.search(r"(?i)resposta correta[:\s-]*((?:0?[1-9])|[A-D]|.+)$", text)
    if response_match:
        captured = clean_value(response_match.group(1))
        if re.fullmatch(r"(?:0?[1-9]|[A-Da-d])", captured) and options:
            if captured.isdigit():
                numeric_index = max(0, int(captured) - 1)
                if numeric_index < len(options):
                    return options[numeric_index]
            else:
                alpha_index = ord(captured.upper()) - ord('A')
                if 0 <= alpha_index < len(options):
                    return options[alpha_index]
        captured_normalized = normalize_text(strip_option_prefix(strip_correctness_markers(captured)))
        for option in options:
            if captured_normalized in normalize_text(option) or normalize_text(option) in captured_normalized:
                return option

    response_match = re.search(r"(?i)resposta[:\s-]*((?:0?[1-9])\.?\s*.+|[A-D][\)\.]?\s*.+)", text)
    if response_match:
        captured_normalized = normalize_text(cleanup_option_text(strip_option_prefix(strip_correctness_markers(response_match.group(1)))))
        for option in options:
            option_normalized = normalize_text(option)
            if captured_normalized == option_normalized or captured_normalized in option_normalized or option_normalized in captured_normalized:
                return option

    explicit_label_match = re.search(r"(?i)correta\s*[-:]\s*alternativa\s*((?:0?[1-9])|[A-D])", text)
    if explicit_label_match and options:
        captured = explicit_label_match.group(1)
        if captured.isdigit():
            numeric_index = max(0, int(captured) - 1)
            if numeric_index < len(options):
                return options[numeric_index]
        alpha_index = ord(captured.upper()) - ord('A')
        if 0 <= alpha_index < len(options):
            return options[alpha_index]

    for option in options:
        raw_normalized = normalize_text(option)
        if "resposta correta" in raw_normalized or "alternativa correta" in raw_normalized:
            return option

    truthy_markers = (" verdadeira", " sim", " e a resposta correta", " correta")
    falsy_markers = (" falsa", " nao", " incorreta")
    for option in options:
        raw_normalized = normalize_text(option)
        if any(marker in f" {raw_normalized}" for marker in truthy_markers) and not any(marker in f" {raw_normalized}" for marker in falsy_markers):
            return option

    for option in options:
        normalized = normalize_text(option)
        if ("correta" in normalized and "incorreta" not in normalized) or "alternativa correta" in normalized:
            cleaned = re.sub(r"(?i)\(?resposta correta\)?", "", option)
            cleaned = re.sub(r"(?i)\(?alternativa correta\)?", "", cleaned)
            cleaned = re.sub(r"(?i)\(?correta\)?", "", cleaned)
            cleaned = clean_value(cleaned.strip(" .;-(),"))
            if cleaned:
                return cleaned

    for option in options:
        normalized = normalize_text(option)
        if "todas as alternativas" in normalized or "todas as anteriores" in normalized:
            return option

    return options[0] if options else ""


def parse_sheet1_question(question: str, options_blob: str) -> Tuple[str, List[Dict[str, object]]]:
    question_text = cleanup_question_text(question)
    options = split_options_block(options_blob)
    correct_text = infer_correct_answer(options_blob, options)
    correct_normalized = normalize_text(cleanup_option_text(strip_option_prefix(strip_correctness_markers(correct_text))))
    result = []
    seen = set()
    for option in options:
        sanitized = cleanup_option_text(strip_option_prefix(strip_correctness_markers(option)))
        if sanitized:
            option_key = normalize_text(sanitized)
            if option_key in seen:
                continue
            seen.add(option_key)
            result.append({
                "text": sanitized,
                "isCorrect": normalize_text(sanitized) == correct_normalized,
            })
    return question_text, result


def parse_sheet3_question(text_blob: str, correct_answer: str) -> Tuple[str, List[Dict[str, object]]]:
    blob = clean_value(text_blob)
    question_text = blob
    options_part = ""
    option_start = re.search(r"(?:^|\n)\s*A[\)\.:\-]", blob)
    if option_start:
        question_text = clean_value(blob[:option_start.start()])
        options_part = clean_value(blob[option_start.start():])
    question_text = cleanup_question_text(question_text)
    options = split_options_block(options_part)
    correct_text = infer_correct_answer(options_part or blob, options, correct_answer)
    correct_normalized = normalize_text(cleanup_option_text(strip_option_prefix(strip_correctness_markers(correct_text))))
    result = []
    seen = set()
    for option in options:
        sanitized = cleanup_option_text(strip_option_prefix(strip_correctness_markers(option)))
        if sanitized:
            option_key = normalize_text(sanitized)
            if option_key in seen:
                continue
            seen.add(option_key)
            result.append({
                "text": sanitized,
                "isCorrect": normalize_text(sanitized) == correct_normalized,
            })
    return question_text, result


def choose_sheet1_entry(app_name: str, entries: List[Dict[str, str]]) -> Dict[str, str]:
    if len(entries) == 1:
        return entries[0]

    for entry in entries:
        haystack = clean_value(f"{entry.get('D', '')} {entry.get('E', '')}")
        normalized_haystack = normalize_text(haystack)
        if "resposta correta" in normalized_haystack or re.search(r"\bresposta\b", normalized_haystack):
            return entry

    normalized_app = normalize_text(app_name)
    keyword_map = {
        "brastemp": ["brastemp", "brm62", "bre66"],
        "consul": ["consul", "cwh13", "cwn14", "cwn16"],
        "lev": ["modelo", "cruiser", "p500", "p1000"],
    }

    for key, keywords in keyword_map.items():
        if key in normalized_app:
            for entry in entries:
                haystack = f"{entry.get('D', '')} {entry.get('E', '')}"
                normalized_haystack = normalize_text(haystack)
                if any(word in normalized_haystack for word in keywords):
                    return entry

    return entries[0]


def build_lookup(rows: List[Dict[str, str]], key_column: str) -> Dict[str, List[Dict[str, str]]]:
    lookup: Dict[str, List[Dict[str, str]]] = {}
    for row in rows:
        key = normalize_text(row.get(key_column, ""))
        if not key:
            continue
        lookup.setdefault(key, []).append(row)
    return lookup


def build_name_aliases(name: str) -> List[str]:
    variants = {name}
    variants.add(name.replace("(estande ", "(").replace(")", ")"))
    variants.add(name.replace(" | ", " "))
    variants.add(name.replace("(estande ", "(").replace("|", "/"))
    return [variant for variant in variants if variant]


def main() -> None:
    workbook = load_workbook_rows(WORKBOOK_PATH)
    _, raw_sheet1 = workbook[0]
    _, raw_sheet2 = workbook[1]
    _, raw_sheet3 = workbook[2]

    sheet1 = [row for row in raw_sheet1[1:] if row.get("C") or row.get("D") or row.get("E")]
    sheet2 = [row for row in raw_sheet2[1:] if row.get("B")]
    sheet3 = [row for row in raw_sheet3[1:] if row.get("A") or row.get("B") or row.get("C")]

    sheet1_lookup = build_lookup(sheet1, "C")
    sheet3_lookup = build_lookup(sheet3, "A")

    with DATA_PATH.open("r", encoding="utf8") as file_handle:
        quiz_data = json.load(file_handle)

    estandes = quiz_data.get("estandes", [])
    estandes_lookup = {}
    for estande in estandes:
        for alias in build_name_aliases(estande.get("nome", "")):
            estandes_lookup[normalize_text(alias)] = estande

    unresolved = []
    filled = 0

    for row in sheet2:
        app_name = clean_value(row.get("B", ""))
        supplier_name = clean_value(row.get("A", ""))
        checked = clean_value(row.get("C", "")) == "1"
        normalized_app_name = normalize_text(app_name)
        normalized_app_name = normalize_text(APP_NAME_ALIAS_MAP.get(normalized_app_name, app_name))
        estande = estandes_lookup.get(normalized_app_name)

        if not estande:
            unresolved.append({"type": "estande", "row": row})
            continue

        source_entry = None
        if checked:
            candidates = sheet1_lookup.get(normalize_text(supplier_name), [])
            if not candidates:
                unresolved.append({"type": "sheet1", "row": row})
                continue
            source_entry = choose_sheet1_entry(app_name, candidates)
            question, options = parse_sheet1_question(source_entry.get("D", ""), source_entry.get("E", ""))
        else:
            candidates = sheet3_lookup.get(normalize_text(supplier_name), [])
            if not candidates:
                unresolved.append({"type": "sheet3", "row": row})
                continue
            source_entry = candidates[0]
            question, options = parse_sheet3_question(source_entry.get("B", ""), source_entry.get("C", ""))

        if (not question or len(options) < 2) and normalize_text(app_name) in MANUAL_QUESTION_FALLBACKS:
            fallback = MANUAL_QUESTION_FALLBACKS[normalize_text(app_name)]
            question = fallback["question"]
            options = fallback["options"]

        if not question or len(options) < 2:
            unresolved.append({"type": "parse", "row": row, "source": source_entry})
            continue

        if not any(option.get("isCorrect") for option in options):
            options[0]["isCorrect"] = True

        estande["question"] = question
        estande["options"] = options
        estande["source"] = {
            "workbookMatchedName": supplier_name,
            "notes": clean_value(row.get("D", "")),
        }
        filled += 1

    quiz_data["generatedFromWorkbook"] = WORKBOOK_PATH.name

    with DATA_PATH.open("w", encoding="utf8") as file_handle:
        json.dump(quiz_data, file_handle, ensure_ascii=False, indent=2)

    print(f"Estandes preenchidos com pergunta: {filled}")
    print(f"Pendências: {len(unresolved)}")
    for issue in unresolved[:20]:
        row = issue.get("row", {})
        print(issue.get("type"), "|", row.get("A", ""), "|", row.get("B", ""))


if __name__ == "__main__":
    main()
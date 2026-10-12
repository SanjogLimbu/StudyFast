from pathlib import Path
import re
import json

from pypdf import PdfReader
from docx import Document as DocxDocument

from openai import OpenAI

##

UPLOAD_PATH = Path(__file__).resolve().parent.parent / "uploads"
client = OpenAI()

# Characters (not tokens) kept per document; the model never sees more, so storing more is waste.
MAX_TEXT_LENGTH = 1_000_000

# Characters per numbered section (about a page), so each topic only stores and sends the sections it needs.
SECTION_LENGTH = 3000

PROMPTS_PATH = Path(__file__).resolve().parent.parent / "prompts"

content_generation = (PROMPTS_PATH / "content_generation.txt").read_text(encoding="utf-8")
content_generation_PROMPT = (PROMPTS_PATH / "content_generation_PROMPT.txt").read_text(encoding="utf-8")

OUTLINE_TASK = (PROMPTS_PATH / "outline_task.txt").read_text(encoding="utf-8")
TOPIC_TASK = (PROMPTS_PATH / "topic_task.txt").read_text(encoding="utf-8")

OUTLINE_TASK_PROMPT = (PROMPTS_PATH / "outline_task_PROMPT.txt").read_text(encoding="utf-8")
TOPIC_TASK_PROMPT = (PROMPTS_PATH / "topic_task_PROMPT.txt").read_text(encoding="utf-8")

# Rejected material has the title "Rejected" and no topics, so topics has no minimum.
OUTLINE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "maxLength": 100
        },
        "topics": {
            "type": "array",
            "maxItems": 100,
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "sections": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "integer"
                        }
                    }
                },
                "required": [
                    "name",
                    "sections"
                ],
                "additionalProperties": False
            }
        }
    },
    "required": [
        "title",
        "topics"
    ],
    "additionalProperties": False
}


# Outline of a course generated from a prompt, which has no document sections to display.
# A rejected prompt has the title "Rejected" and no topics, so topics has no minimum.
OUTLINE_SCHEMA_PROMPT = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "maxLength": 100
        },
        "topics": {
            "type": "array",
            "maxItems": 100,
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    }
                },
                "required": [
                    "name"
                ],
                "additionalProperties": False
            }
        }
    },
    "required": [
        "title",
        "topics"
    ],
    "additionalProperties": False
}

# The lesson is first so the model writes it before the flashcards and questions that are based on it.
TOPIC_SCHEMA = {
    "type": "object",
    "properties": {
        "lesson": {
            "type": "string"
        },
        "flashcards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "front": {
                        "type": "string"
                    },
                    "back": {
                        "type": "string"
                    }
                },
                "required": [
                    "front",
                    "back"
                ],
                "additionalProperties": False
            },
            "minItems": 4,
            "maxItems": 12
        },
        "question_bank": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string"
                    },
                    "options": {
                        "type": "array",
                        "minItems": 4,
                        "maxItems": 4,
                        "items": {
                            "type": "string"
                        }
                    },
                    "answer": {
                        "type": "string"
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": [
                            "easy",
                            "medium",
                            "hard"
                        ]
                    }
                },
                "required": [
                    "question",
                    "options",
                    "answer",
                    "difficulty"
                ],
                "additionalProperties": False
            },
            "minItems": 8,
            "maxItems": 24
        }
    },
    "required": [
        "lesson",
        "flashcards",
        "question_bank"
    ],
    "additionalProperties": False
}

# Matches [[native script|romanization]].
ANNOTATION = re.compile(r"\[\[([^|\]]+)\|([^\]]+)\]\]")

# Matches text inside straight or curly double quotation marks.
QUOTED = re.compile(r'["“]([^"”]+)["”]')

# Matches a quoted span, or a run of annotations with only spaces between them.
# A run touching a letter, hyphen, apostrophe or bold marker never matches, such as [[て|te]]-form.
QUOTED_OR_RUN = re.compile(
    QUOTED.pattern + rf"|(?<![\w'’*-])(?P<run>{ANNOTATION.pattern}(?:\s*{ANNOTATION.pattern})*)(?![\w'’*-])"
)

# Matches a control character other than a new line or a tab that indents a line.
# The model sometimes writes a LaTeX backslash as a JSON escape, which leaves one in the text.
CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]|(?<=[^\n\t])\t")

##

# Raised when a file's text can't be extracted, so the upload is rejected.
class UnreadableDocumentError(Exception):
    pass

##

def clean_text(text: str):
    # Postgres text columns can't store NUL characters, which some PDFs produce.
    text = text.replace("\x00", "")

    # Replace repeated spaces/tabs with one space
    text = re.sub(r"[ \t]+", " ", text)

    # Replace 3+ newlines with 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_pdf(file_path: Path) -> str:
    reader = PdfReader(file_path)

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if (text):
            pages.append(text)


    return "\n".join(pages)


def extract_docx(file_path: Path) -> str:
    document = DocxDocument(file_path)

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if (text):
            paragraphs.append(text)


    return "\n".join(paragraphs)


def extract_txt(file_path: Path) -> str:
    return file_path.read_text(
        encoding="utf-8",
        errors="replace"
    )


def extract_text(file_path: Path) -> str:
    extension = file_path.suffix.lower()
    extractors = {
        ".pdf": extract_pdf,
        ".docx": extract_docx,
        ".txt": extract_txt
    }

    if (extension not in extractors):
        raise UnreadableDocumentError(
            f"Unsupported file type: {extension}"
        )


    try:
        text = extractors[extension](file_path)

    except Exception as error:
        raise UnreadableDocumentError(
            "The file could not be read. It may be corrupted."
        ) from error


    # Scanned PDFs are only images, so they have no extractable text.
    if (not text.strip()):
        raise UnreadableDocumentError(
            "No readable text found in this file. Scanned PDFs are not supported."
        )


    # Clean the text to save on context window and speed up processing time.
    return clean_text(text)[:MAX_TEXT_LENGTH]


def split_into_sections(text: str) -> list[str]:
    sections = []
    current = ""

    # Split between lines so no line is cut in half.
    for line in text.splitlines(keepends=True):
        if (current and len(current) + len(line) > SECTION_LENGTH):
            sections.append(current)
            current = ""


        current += line


    if (current):
        sections.append(current)


    return sections


def generate(instructions, material: str, task: str, schema_name: str, schema: dict) -> dict:
    response = client.responses.create(
        model="gpt-5.6-luna",

        instructions=instructions,

        input=[
            {
                "role": "user",
                "content": material
            },
            {
                "role": "developer",
                "content": task
            }
        ],

        text={
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "strict": True,
                "schema": schema
            }
        }
    )


    return json.loads(response.output_text)


def generate_outline_from_prompt(prompt: str) -> dict:
    outline = generate(content_generation_PROMPT, prompt, OUTLINE_TASK_PROMPT, "course_outline", OUTLINE_SCHEMA_PROMPT)

    return {
        "title": outline["title"],
        "topics": [
            {
                "name": topic["name"],
                "material": prompt
            }
            for topic in outline["topics"]
        ]
    }


def generate_outline(text: str) -> dict:
    if (not text.strip()):
        raise ValueError("No text found.")


    # Also capped here for documents stored before the cap at upload existed.
    text = text[:MAX_TEXT_LENGTH]
    sections = split_into_sections(text)

    numbered_material = "\n\n".join(
        f'<section id="{i}">\n{section.strip()}\n</section>'
        for i, section in enumerate(sections, start=1)
    )

    outline = generate(content_generation, numbered_material, OUTLINE_TASK, "course_outline", OUTLINE_SCHEMA)
    topics = []

    for topic in outline["topics"]:
        # Ignore section ids that don't exist, and fall back to the whole text if none are left.
        ids = []

        for section_id in topic["sections"]:
            if (1 <= section_id <= len(sections)):
                ids.append(section_id)


        ids = sorted(set(ids))

        if (ids):
            selected_sections = []

            for i in ids:
                selected_sections.append(sections[i - 1])


            material = "\n".join(selected_sections)

        else:
            material = text


        topics.append({
            "name": topic["name"],
            "material": material
        })


    return {
        "title": outline["title"],
        "topics": topics
    }


def without_spaces(text: str) -> str:
    return "".join(text.split()).casefold()


# A question that quotes one form of its answer, such as How is "neko" written?, gives the answer
# away when the options show both forms. Its options then keep only the form being asked for.
def hide_quoted_form(question: dict):
    quoted = [
        without_spaces(text)
        for text in QUOTED.findall(question["question"])
    ]

    answer = question["answer"]

    if (without_spaces(ANNOTATION.sub(r"\2", answer)) in quoted):
        kept = r"\1"

    elif (without_spaces(ANNOTATION.sub(r"\1", answer)) in quoted):
        kept = r"\2"

    else:
        return


    question["options"] = [
        ANNOTATION.sub(kept, option)
        for option in question["options"]
    ]

    question["answer"] = ANNOTATION.sub(kept, answer)


# The learner never sees the brackets, so target-language text inside a sentence looks like the
# English around it. Each run of annotations gets quotation marks, unless it already has them.
def quote_annotations(text: str) -> str:
    # Use the same quotation marks as the rest of the text.
    opening, closing = ('"', '"') if ('"' in text) else ("“", "”")

    def quote(match):
        run = match["run"]

        if (run is None):
            return match[0]


        return opening + run + closing


    lines = []

    for line in text.split("\n"):
        rest = ANNOTATION.sub("", line)

        # A table row, and a line of only target-language text, stay as they are.
        if ("|" not in rest and any(character.isalpha() for character in rest)):
            line = QUOTED_OR_RUN.sub(quote, line)


        lines.append(line)


    return "\n".join(lines)


# Raising makes the job retry, so content with a broken LaTeX command is generated again instead of saved.
def reject_control_characters(content: dict):
    texts = [content["lesson"]]

    for flashcard in content["flashcards"]:
        texts += [flashcard["front"], flashcard["back"]]


    for question in content["question_bank"]:
        texts += [question["question"], question["answer"], *question["options"]]


    for text in texts:
        if (CONTROL.search(text)):
            raise ValueError("The generated content contains a control character.")


def generate_topic(material: str, topic: str, outline: str, source: str) -> dict:
    chosen_prompt = TOPIC_TASK 
    chosen_instruct = content_generation

    if (source == "prompt"):
        chosen_prompt = TOPIC_TASK_PROMPT
        chosen_instruct = content_generation_PROMPT


    task = chosen_prompt.format(
        topic=topic,
        outline=outline
    )

    content = generate(chosen_instruct, material, task, "topic_content", TOPIC_SCHEMA)
    reject_control_characters(content)

    content["lesson"] = quote_annotations(content["lesson"])

    for flashcard in content["flashcards"]:
        flashcard["front"] = quote_annotations(flashcard["front"])
        flashcard["back"] = quote_annotations(flashcard["back"])


    for question in content["question_bank"]:
        hide_quoted_form(question)

        # Options stand alone, so only the question itself is changed.
        question["question"] = quote_annotations(question["question"])


    return content


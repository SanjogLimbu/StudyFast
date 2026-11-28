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

LESSON_SECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string"
        },
        "content": {
            "type": "string"
        },
        "question": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string"
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "answer_index": {
                    "type": "integer"
                },
                "explanation": {
                    "type": "string"
                }
            },
            "required": [
                "question",
                "options",
                "answer_index",
                "explanation"
            ],
            "additionalProperties": False
        }
    },
    "required": [
        "title",
        "content",
        "question"
    ],
    "additionalProperties": False
}

# The lesson is first so the model writes it before the flashcards and questions that are based on it.
TOPIC_SCHEMA = {
    "type": "object",
    "properties": {
        "lesson_sections": {
            "type": "array",
            "items": LESSON_SECTION_SCHEMA
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
            "minItems": 0,
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
                    # Before the answer, so the model works the problem out before choosing an option.
                    "solution": {
                        "type": "string"
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
                    "solution",
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
        "lesson_sections",
        "flashcards",
        "question_bank"
    ],
    "additionalProperties": False
}

# The answer to a learner's question, shown as plain text in a notice.
HELP_SCHEMA = {
    "type": "object",
    "properties": {
        "response": {
            "type": "string"
        }
    },
    "required": [
        "response"
    ],
    "additionalProperties": False
}


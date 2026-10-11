# StudyFast

StudyFast turns a PDF, Word document, text file or a prompt into a course. StudyFast courses are AI‑generated topics that start with basics and move to ideas. Each StudyFast topic has a lesson, spaced‑repetition flashcards and a multiple‑choice quiz that tracks mastery for that topic.

## Features

- **Document upload**: PDF, DOCX and TXT files from 1 KB to 35 MB are accepted. If a file has no text that can be read StudyFast rejects it during upload. Shows an error message.

- **Prompt courses**: A prompt of 5 to 255 characters for example "I want to learn Japanese" creates a StudyFast course from the model’s knowledge. No document is required.

- **AI course generation**: Each StudyFast course is divided into 5 to 100 topics that follow a prerequisite order. For every StudyFast topic StudyFast creates a lesson, 4 to 12 flashcards and a bank of 8 to 24 multiple‑choice questions. These are produced when the user clicks Generate on the topic.

- **Lessons**: Every StudyFast topic begins with a lesson written in Markdown that includes LaTeX math. The flashcards and questions come from that lesson.

- **Spaced‑repetition flashcards**: StudyFast schedules reviews using FSRS. When all cards are on cooldown a live break timer counts down until the review.

- **Testing**: After studying the flashcards StudyFast draws a 5‑question quiz from the topic’s bank. Completing the quiz unlocks the following StudyFast topic.

- **Mastery tracking**: StudyFast measures a StudyFast topic’s mastery by half from flashcard recall and half from quiz score. Each StudyFast course displays mastery.

- **Daily streak**: StudyFast’s account page shows the current streak, the longest streak and a calendar of quiz completion dates from the past year.

- **Language‑learning support**: StudyFast shows non‑Latin scripts as `[[native|romanization]]` and uses HTML `<ruby>` annotations for pronunciation.

- **Live processing status**: StudyFast’s library and topic map keep polling while documents or topics are being prepared. Each item turns ready automatically. No page refresh is needed.

- **Accounts**: StudyFast lets users sign up with an email and password or with Google.

## Tech stack

Layer | Technologies |

| --- | --- |

| Frontend | Next.js 16 (App Router) React 19 TypeScript, Tailwind CSS v4, react-markdown KaTeX |

| Backend | FastAPI, SQLAlchemy 2.0 Pydantic, Alembic |

| Database | PostgreSQL (psycopg 3) |

| Background jobs | Redis, RQ (with retries and a scheduler) |

| AI | OpenAI Responses API with JSON‑schema structured outputs |

Auth | Argon2 password hashing (pwdlib) Google OAuth, server‑side sessions in an HttpOnly cookie |

| Parsing and scheduling | pypdf, python-docx, py-fsrs |

| Testing | Vitest React Testing Library |

## Architecture

1. When a user uploads a file StudyFast streams it to disk in 1‑MB chunks. StudyFast checks the file type and size pulls out and cleans the text and saves a pending StudyFast document with that text. StudyFast then deletes the file and adds a job to the queue. If the user entered a prompt StudyFast saves that prompt as the document’s text away. The request finishes immediately.

2. A background worker marks the StudyFast document as `processing`. StudyFast splits the stored text into sections that are roughly one page each. StudyFast then asks the model for a title and an ordered list of topics with each topic linked to the sections it needs. For a prompt StudyFast has no sections so the model plans the topics directly from the prompt. StudyFast requires the response to fit a JSON schema.

3. StudyFast writes all topics in one transaction each topic storing its own sections. Once finished the StudyFast document becomes `ready`. Only the first StudyFast topic is unlocked at this point.

4. When a user presses Generate on a StudyFast topic StudyFast launches a second job that sends only that topic’s sections and the course outline, to the model. StudyFast then saves the lesson, flashcards and questions for that topic.

5. StudyFast’s frontend keeps polling until the topic is ready. The user then goes through the lesson, the flashcards and finally the quiz. When the quiz is finished StudyFast unlocks the topic.

## Engineering highlights

- Generation runs in an RQ worker. Jobs time out after five minutes. Document jobs retry up to three times waiting ten, thirty and sixty seconds between attempts. I find this timing logic very reliable.

- Errors such as API or network failures reset the document to pending and re-raise so RQ retries the job. After the retry the document is marked failed instead of staying pending forever. A failed topic is marked failed away so the user can press Try again rather than wait on a stuck topic. I like that users get feedback.

- Topic content is generated on demand and only for unlocked topics so no AI budget is spent on topics a user never reaches. Each topic call sends that topics sections rather than the whole document. I appreciate the resource efficiency.

- Generating a topic locks its row so a double click cannot queue it twice. That avoids work.

- The extracted text is stored with the document so the worker never needs the file and the API and worker can run on separate machines. I think this separation is smart.

- Strict structured outputs cap the topic count bound the flashcard and question counts fix four answer options per question and restrict the difficulty values so the JSON maps onto ORM objects. I like how this keeps data consistent.

- File type, minimum and maximum size and whether the file has text are all checked before anything is queued so no AI budget is spent on files that cannot be processed. Oversized request bodies are rejected before FastAPI parses them. I find this validation robust.

- The model rejects material that does not teach a subject, such as a transcript, a CV or a nonsense prompt. The document is then marked failed with no topics of becoming a course of invented content. I appreciate the quality guard.

- Each user can create one course a day. Cannot upload a document while an earlier one is still processing. That keeps the system balanced.

- A question that quotes one form of its answer such as how a word's read would give the answer away if the options showed both the native script and the romanization. So its options keep the form being asked for. I think this protects the challenge.

- Each quiz session stores its question IDs and current position. An answer is accepted only for the current question so the client cannot skip ahead or answer out of order. A new quiz is drawn each time the topics flashcards are completed again. I like the fairness.

- The session cookie holds a token and its SHA-256 hash is stored so a leaked database cannot be used to log in. A session lasts thirty days from its use and is extended at most once a day so most requests do not write. I find this security solid.

- The frontend calls the API through a Next.js rewrite, at /api so the auth cookie is party. I appreciate the setup.

- All topics, flashcards and question queries are connected to the current user so users cannot read or change each others data. That keeps privacy tight.

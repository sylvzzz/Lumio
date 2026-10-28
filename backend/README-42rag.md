
*This project has been created as part of the 42 curriculum by [dbotelho](https://github.com/sylvzzz).*

> **Note:** The version evaluated at 42
> [`here`](https://github.com/sylvzzz/42-rag/tree/5090fc3359bab8259556228a40b882db0dbf08e0).
> The current repository contains post-submission improvements (web UI, chat history,
> Groq API, document uploads, etc.) that were **not** part of the evaluated deliverable
> and do not follow the original subject.

# RAG against the machine

## Demo

| Chat | Upload |
| --- | --- |
| ![Chat](img/chat.png)| ![Upload](img/upload.png) |


## Description

**RAG against the machine** is a Retrieval-Augmented Generation system. In the
original submission it answered natural-language questions about a codebase
(the `vLLM` repository). The current version is a document-chat app: you upload
documents and ask questions about them.

The pipeline has four stages:

1. **Index**: read the uploaded documents (and optionally the vLLM corpus),
   split every file into chunks, and build a lexical (BM25) index.
2. **Retrieve**: given a question, return the top-k most relevant source
   locations (`file_path` + character range).
3. **Generate**: feed the retrieved sources to a Qwen model hosted by Groq and
   produce a grounded answer. The web UI renders the answer as Markdown.
4. **Evaluate**: measure retrieval quality with `recall@k` (original datasets
   and CLI only).

The goal is a system that retrieves the *right source locations* and produces
answers *grounded* in them, with no major hallucination.

## What changed after delivery

The original submission and the code currently are **not the same thing**.
The main differences:

| Area | Original submission | Current repository |
| --- | --- | --- |
| LLM | Local `Qwen/Qwen3-0.6B` loaded with Transformers/PyTorch | Groq-hosted Qwen through the OpenAI-compatible API (`LLM_BASE_URL`, `LLM_MODEL`, `GROQ_API_KEY`); no local weights |
| Corpus | `vllm-0.10.1` under `data/raw/` | Uploaded PDF/DOCX/TXT/MD files under `data/files/`; the vLLM corpus is optional |
| Interface | Python Fire CLI + small FastAPI bonus | React/Vite web UI + FastAPI API; the CLI still exists |
| Chat | One answer per query, no memory | Chats persisted in `data/chats_db.json`; recent messages are sent as context |
| Chunking | `.txt`, `.md`, `.py` | Also `.pdf` and `.docx`, from both `data/raw/` and `data/files/` |
| Retrieval | BM25 over chunk text | BM25 over chunk text **plus the readable file name**;  |
| Output | Plain text / dataset JSON | Markdown rendered in the web UI; dataset JSON still supported |
| Configuration | Local model cache (`HF_HOME`) | `.env` file with the Groq/OpenAI-compatible endpoint, model and key |

`torch` and `transformers` are still listed as dependencies, but the current
answer path does not use them. The local-model instructions are kept below for
the original submission only.


## Instructions

### Requirements (current app)

- [`uv`](https://docs.astral.sh/uv/) for Python dependencies.
- Node.js/npm for the web UI.
- A Groq API key (free tier): https://console.groq.com/keys.
- **No local model weights**: answers come from the remote API.

The original submission needed PyTorch plus the `Qwen/Qwen3-0.6B` weights; the
current answer path does not. `torch` and `transformers` are still declared for
the original local-model code path.

### Installation

```bash
curl -LsSf https://astral.sh/uv/install.sh
uv sync
cd web && npm install
```

On 42 machines, home directories are small, so redirect the caches:

```bash
export UV_CACHE_DIR="$PWD/.cache/uv"
export PIP_CACHE_DIR="$PWD/.cache/pip"
```

### Configuration

```bash
cp src/.env.example src/.env
```

Fill in the LLM settings. `src/__init__.py` loads `src/.env` (and a `.env` in
the current directory) automatically, without overriding variables already set
in the shell:

```dotenv
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=<model-id>
LLM_API_KEY=gsk_...
```

`GROQ_API_KEY` and `OPENAI_API_KEY` are also accepted as fallbacks for the key.
Check which models the key can reach:

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Documents (current app)

Upload PDF/DOCX/TXT/MD files through the web UI, or drop them into
`data/files/` and run `make index`. Indexing reads `data/raw/vllm-0.10.1/`
**and** `data/files/`.

### Prepare the original vLLM corpus

Only needed for the original CLI/dataset commands. Extract `vllm-0.10.1.zip`
so the corpus lives at `data/raw/vllm-0.10.1/`.

## Commands

| Action | What it does | Arguments | Usage |
| --- | --- | --- | --- |
| `index` | Chunks the corpus and builds the BM25 index | `<max_chunk_size>` | `uv run python3 -m src index --max_chunk_size 2000` |
| `search` | Top-k sources for a single query | `<query> <k>` | `uv run python3 -m src search --query "What is this codebase about?" --k 5` |
| `search_dataset` | Runs `search` over a whole dataset and saves a `StudentSearchResults` JSON (same file name) under `--save_directory` | `<path> <int> <dir>` | `uv run python3 -m src search_dataset --dataset_path <path> --k <int> --save_directory <dir>` |
| `answer` | Answers a single query from the retrieved sources | `<query> <k>` | `uv run python3 -m src answer --query "What HTTP endpoint loads a LoRA adapter?" --k 3` |
| `answer_dataset` | Generates answers for a dataset of search results and saves a `StudentSearchResultsAndAnswer` JSON under `--save_directory` | `<path> <dir>` | `uv run python3 -m src answer_dataset --student_search_results_path <path> --save_directory <dir>` |
| `evaluate` | Computes `recall@k` of your search results against the ground truth | `<student_search_results> <dataset>` | `uv run python3 -m src evaluate --student_search_results_path <path> --dataset_path <path>` |

Convenience `make` targets wrap the dataset pipeline (see the Makefile):
`index`, `search_dataset_docs`, `search_dataset_code`, `answer_dataset_docs`,
`answer_dataset_code`, `evaluate_docs`, `evaluate_code`, `moulinette_docs`,
`moulinette_code`.

The CLI and dataset commands above belong to the **original submission**. The
current web app is started with:

```bash
make api    # FastAPI on http://localhost:8000
make ui     # Vite on http://localhost:5173
```

The dataset/moulinette commands need the original datasets, which are not part
of the current repository.

## System architecture

![Arquiteture](img/architeture.png)

```
api.py                current FastAPI app (documents, uploads, chats, answers)
web/                  React/Vite frontend (chat + uploads)

src/
  __main__.py         original Fire CLI
  rag.py              pipeline core: index, search, answer, delete
  chat.py             chat persistence in data/chats_db.json
  chunking.py         chunks code, text, PDF and DOCX files
  evaluate.py         recall@k
  qwen.py             remote LLM wrapper (Groq/OpenAI-compatible)
  models.py           the pydantic models exchanged between stages
  logger.py           pretty logs (red + yellow texts)
  indexing.py         BM25 index; indexes chunk text + readable file name
```

## Chunking strategy

Two distinct strategies are used, because code and prose do not break apart the
same way:

- **Text (`.txt`, `.md`, `.pdf`, `.docx`)** —
  `langchain_text_splitters.RecursiveCharacterTextSplitter`. PDFs are read
  with `pypdf`, DOCX with `python-docx`.
- **Python (`.py`)** — the same splitter with the Python language preset.

Both use `chunk_size = --max_chunk_size` (**default 2000 characters**),
`chunk_overlap = 0` and `add_start_index = True`. The start index, combined
with the chunk length, yields the exact `first_character_index` /
`last_character_index` span recorded in each `MinimalSource`.

Sources are taken from `data/raw/vllm-0.10.1/` (original submission) **and**
`data/files/` (uploaded documents). The original subject's 2000-character
limit applies to the vLLM corpus; uploaded files use the same limit for
consistency.

## Retrieval method

Retrieval is **BM25**, a classic lexical (sparse) ranking function. It is
implemented with [`bm25s`](https://github.com/xhluca/bm25s) using the **bm25l**
variant with `k1 = 1` and `b = 0.5`.

- At index time the whole corpus (all chunk contents **plus the readable file
  name**, e.g. `diogo silva cv`) is tokenized and the BM25 statistics are
  persisted. This lets queries like `cv` match a file even when the word does
  not appear in the text.
- At query time the question is tokenized the same way, scored against every
  chunk, and the chunks are ranked by descending BM25 score. The terms
  `currículo`, `curriculo`, `curriculum` and `resume` are normalized to `cv`
  before tokenization.
- The top-k chunks with a strictly positive score are returned as source
  locations.

BM25 was chosen over TF-IDF because it handles term saturation and document
length normalisation better, which matters when the corpus mixes short code
chunks with long Markdown files. No embeddings are used (lexical retrieval
only).

## Performance analysis

> These numbers belong to the **original submission** with the vLLM corpus and
> the local `Qwen/Qwen3-0.6B` model on a CPU-only machine. They do **not**
> describe the current document-chat app (which uses a remote LLM and has not
> been benchmarked).

All numbers measured on the reference corpus (14 399 chunks) on a CPU-only
machine:

| Requirement | Limit | Measured |
| --- | --- | --- |
| Indexing time | ≤ 5 min | **~7 s** |
| Retrieval throughput | ≤ 90 s / 200 questions | **~10 s / 200 questions** |
| Recall@5 — docs | ≥ 0.80 | **1.000** |
| Recall@5 — code | ≥ 0.50 | **1.000** |

`recall@k` is reported at `k = 1, 3, 5, 10`; on the public datasets every
question reaches `1.000` at every rank. This is partly a property of the public
sample: each ground-truth source is a byte-exact chunk of the corpus and the
questions often quote source text verbatim, which lexical BM25 matches well.
Paraphrased questions are the real test, and a lexical retriever is expected to
degrade there — which is exactly the case for a hybrid (lexical + semantic)
retriever, listed as a bonus.

Chunk size affects the trade-off: larger chunks cover more context but make the
character span coarser and risk exceeding the 2000-character limit; smaller
chunks are more precise but fragment context. The default of 2000 is the
largest allowed value and gives the best recall on the reference datasets.

## Design decisions

- **Lexical BM25 over embeddings** — faster, easier, CPU-friendly, and it already clears the recall thresholds (also because it was quicker to only install the bm25s package and im lazy).
- **`chunk_overlap = 0` + `add_start_index`** — keeps the character spans exact
  and reproducible against the ground truth.
- **Load-once, reuse** — the chunk list and the BM25 index are loaded a single
  time per process; without this, retrieval would reload the full corpus for
  every question and blow the 90 s budget.
- **System prompt** — the model receives numbered sources and is instructed to
  answer *only* from them, to minimise hallucination.
- **`enable_thinking=False`** — Qwen3 has a reasoning mode; it is disabled for
  short, grounded answers.
- **Greedy decoding** (`do_sample=False`) — deterministic and fast on CPU.
- **Structured output** — every stage reads/writes the provided pydantic models
  as JSON, so nothing is hand-parsed.
- **Paths are CLI arguments** — no input/output path is hard-coded, as the
  subject requires.

## Challenges faced

### Current app
- **PDF tables are flattened by pypdf** — rows become a single line, losing the
  column structure. Fixed by post-processing: `format_sources` detects rank
  headings and table rows and rewrites them as `rank N | item | grade: X |
  workload: Y H`.
- **Retrieval misses keywords that only exist in the file name** — e.g. "cv"
  never appears in the text. Fixed by indexing the readable file name alongside
  the chunk text.
- **Conversational memory** — the model only saw the current question. Fixed by
  persisting chats in `data/chats_db.json` and passing the last 10 messages as
  context.
- **Groq key expiry** — the free-tier key expires (`401 expired_api_key`).
  Rotate it in `src/.env`.
- **Model reload on every API request** — the original CLI cached the local
  model; the FastAPI app does the same (`_load_engine`), so the remote call is
  cheap and the model is not re-instantiated.

### Original submission (historical)
- **CPU generation is slow** — `Qwen/Qwen3-0.6B` took tens of seconds per answer
  on CPU; the answer stage was kept separate from retrieval and the model was
  loaded once per dataset.
- **Disk space on campus machines** — the model weights and PyTorch stack were
  large, so caches were redirected to `sgoinfre`.
- **Qwen3 "thinking" mode** — by default Qwen3 emitted a long reasoning trace;
  `enable_thinking=False` was required for concise answers.

## Example usage

### Current web app

```bash
# terminal 1
make api    # FastAPI on http://localhost:8000

# terminal 2
make ui     # Vite on http://localhost:5173
```

Open http://localhost:5173, upload a PDF, and start chatting.

### Original CLI pipeline (vLLM corpus)

```bash
# 1. build the index
make index

# 2. retrieve sources for every question of a dataset
make search_dataset_docs
# or a single query:
uv run python3 -m src search --query "Whats this codebase about?" --k 5

# 3. generate grounded answers
make answer_dataset_docs

# 4. score the retrieval
make evaluate_docs

# 5. official score (see "Running the moulinette")
make moulinette_docs
```

The dataset/moulinette commands need the original datasets, which are not part
of the current repository.

## What does `evaluate` do?

`evaluate` does not search anything. It is only a **scoreboard**: it takes the
results your `search_dataset` produced and compares them against the correct
answers (the *ground-truth* sources), then prints how many of them you found.

### How the score is computed

For every question:

1. Take the correct source(s) from the ground-truth dataset.
2. Look at your top-k results for that question.
3. A correct source counts as **found** when one of your results points to the
   **same file** and covers **roughly the same region** of it (the character
   ranges overlap enough — we do not need an exact match, only to land in the
   right area of the right file).
4. `recall@k = found correct sources / total correct sources` for that question.
5. The final number is the **average over all questions**, reported for
   `k = 1, 3, 5, 10`.

A result in a different file never counts, which is why the file path has to be
exact.

### What the results mean

`Recall@k` is the share of correct sources you managed to retrieve within your
top `k` results.

| Score | Meaning |
| --- | --- |
| `1.000` | every correct source was retrieved within the top-k |
| `0.500` | half of the correct sources were retrieved |
| `0.000` | none of the correct sources were retrieved |

`Recall@1` is the strictest (only the very first result counts); `Recall@10` is
the most forgiving. The project thresholds are **80% on docs** and **50% on
code** at `Recall@5`.

### Example

Say a question has one correct source, `lora.md`, lines 3833–5714:

- If your **first** result is exactly that region of `lora.md`, the source is
  found within the top-1, so `Recall@1` through `Recall@10` are all `1.0`.
- If that region only shows up as your **7th** result, `Recall@5` is `0.0` but
  `Recall@10` is `1.0`.

For a dataset, the score is the average of these per-question values.

> The official score used during the defense is computed by the provided
> `moulinette`. This `evaluate` command mirrors the same idea so you can iterate
> quickly on your own, without the moulinette.

## Running the moulinette

The moulinette is the official scorer (the provided binary).

**1. Pick the binary** — pick the one for your distro and rename it to
`moulinette`:

```bash
mv moulinette-ubuntu moulinette     # or: mv moulinette-fedora moulinette
```

**2. Score your results** — the **student results come first**, the
**ground-truth `AnsweredQuestions` dataset second**:

```bash
./moulinette evaluate_student_search_results \
  data/output/search_results/UnansweredQuestions/dataset_docs_public.json \
  data/datasets/AnsweredQuestions/dataset_docs_public.json \
  --k 10 --max_context_length 2000 -t 0.8
```

| Flag | Meaning |
| --- | --- |
| `--k` | max sources per question (default 10) |
| `--max_context_length` | max context characters per source (default 2000) |
| `-t` | if set, checks Recall@5 against this value and prints `PASS`/`FAIL` |

The threshold is `-t 0.8` on docs and `-t 0.5` on code. The Makefile wraps the
whole sequence (it also runs `search_dataset` first and auto-detects the binary,
so the rename is optional there):

```bash
make search_dataset_docs && make moulinette_docs   # docs
make search_dataset_code && make moulinette_code   # code
```

The datasets live under `data/datasets/` (`UnansweredQuestions/` for the
questions, `AnsweredQuestions/` for the ground truth) and every output is scoped
by dataset under `data/output/search_results/<DatasetScope>/`, as required by
the subject.

## Local HTTP API

The current app uses FastAPI for both the web UI backend and the API. Start it
with `make api` (or `uv run uvicorn api:app --reload`).

**No local model weights** — answers come from the remote Groq/OpenAI-compatible
endpoint configured in `src/.env`.

| Route | Method | What it does |
| --- | --- | --- |
| `/status` | GET | Health check |
| `/` | GET | Welcome message |
| `/index` | POST | (Re)build the corpus index (`?max_chunk_size=2000`) |
| `/upload` | POST | Upload a file (`multipart/form-data` with `file`) |
| `/documents` | GET | List uploaded documents |
| `/documents/{id}/content` | GET | Joined text of all chunks for a document |
| `/documents/{id}/download` | GET | Download the original file |
| `/documents/{id}/raw` | GET | Inline PDF preview |
| `/documents/{id}` | PATCH | Rename (send JSON `{"original_name": "..."}`) |
| `/documents/{id}` | DELETE | Delete document and its chunks |
| `/chats` | GET | List chats with title/date |
| `/chats/{id}` | GET | Get chat messages |
| `/chats/{id}` | DELETE | Delete a chat |
| `/answer` | GET | Answer a question (`?prompt=...&k=5&chat_id=...`) |

### Interactive docs

Swagger UI: `http://localhost:8000/docs` — try the endpoints from the browser.

### With curl

```bash
curl "http://localhost:8000/status"

curl -X POST "http://localhost:8000/index?max_chunk_size=2000"

curl -F "file=@myfile.pdf" "http://localhost:8000/upload"

curl -G "http://localhost:8000/answer" \
  --data-urlencode "prompt=O que achas do meu cv?" \
  --data-urlencode "k=5"

# continue the conversation
curl -G "http://localhost:8000/answer" \
  --data-urlencode "prompt=tens a certeza?" \
  --data-urlencode "k=5" \
  --data-urlencode "chat_id=<chat_id_from_previous_response>"
```

The remote LLM means each request is fast; the model is cached on the server
and not reloaded per request.

## Resources

- **BM25 / Okapi BM25** — the ranking function:
  https://en.wikipedia.org/wiki/Okapi_BM25
- **bm25s** — the BM25 library used: https://github.com/xhluca/bm25s
- **langchain-text-splitters** — chunking:
  https://python.langchain.com/docs/how_to/recursive_text_splitter/
- **Groq OpenAI-compatible API** — https://console.groq.com/docs
- **Qwen3-0.6B model card** (original submission):
  https://huggingface.co/Qwen/Qwen3-0.6B
- **Hugging Face Transformers** (original submission):
  https://huggingface.co/docs/transformers/
- **FastAPI** — https://fastapi.tiangolo.com/
- **React + Vite** — https://react.dev/, https://vitejs.dev/
- **Python Fire** — the CLI layer: https://github.com/google/python-fire

### How AI was used

Opencode (an open-source LLM coding assistant) was used for:

- type-annotating the module structure and the pydantic JSON I/O;
- the `Qwen` wrapper for the Groq/OpenAI-compatible API (chat template,
  history handling, `temperature=0`);
- chat persistence (`src/chat.py`), document upload/list/rename/delete;
- fixing retrieval gaps (file-name indexing, `cv`/`currículo` normalization,
  table labeling);
- `recall@k` metric and evaluation;
- drafting and updating this README.


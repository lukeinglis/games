"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameLeaderboard, { addScore } from "./GameLeaderboard";

// ============================================================
// Token Blitz: Guess how many BPE tokens a sentence has
// ============================================================

// --- Token Data ---
// Each entry has the text, the correct token count, a difficulty
// rating (1=easy, 2=medium, 3=hard), a category, and the token
// boundaries showing how cl100k_base splits the text.

interface TokenSentence {
  text: string;
  tokens: number;
  boundaries: string[];
  difficulty: 1 | 2 | 3;
  category: string;
}

const SENTENCES: TokenSentence[] = [
  // ---- EASY (difficulty 1): Short, common sentences ----
  {
    text: "Hello, world!",
    tokens: 4,
    boundaries: ["Hello", ",", " world", "!"],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "The cat sat on the mat.",
    tokens: 7,
    boundaries: ["The", " cat", " sat", " on", " the", " mat", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "I love programming.",
    tokens: 4,
    boundaries: ["I", " love", " programming", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Good morning!",
    tokens: 3,
    boundaries: ["Good", " morning", "!"],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "How are you today?",
    tokens: 5,
    boundaries: ["How", " are", " you", " today", "?"],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "This is a test.",
    tokens: 5,
    boundaries: ["This", " is", " a", " test", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Open the door.",
    tokens: 4,
    boundaries: ["Open", " the", " door", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "She ran fast.",
    tokens: 4,
    boundaries: ["She", " ran", " fast", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "The sky is blue.",
    tokens: 5,
    boundaries: ["The", " sky", " is", " blue", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "I ate lunch.",
    tokens: 4,
    boundaries: ["I", " ate", " lunch", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Let me think about it.",
    tokens: 6,
    boundaries: ["Let", " me", " think", " about", " it", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Thank you very much.",
    tokens: 5,
    boundaries: ["Thank", " you", " very", " much", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "What time is it?",
    tokens: 5,
    boundaries: ["What", " time", " is", " it", "?"],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Nice to meet you.",
    tokens: 5,
    boundaries: ["Nice", " to", " meet", " you", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "See you later!",
    tokens: 4,
    boundaries: ["See", " you", " later", "!"],
    difficulty: 1,
    category: "everyday",
  },
  // ---- MEDIUM (difficulty 2): Longer, some technical terms ----
  {
    text: "Machine learning models require large datasets for training.",
    tokens: 9,
    boundaries: ["Machine", " learning", " models", " require", " large", " datasets", " for", " training", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The transformer architecture uses self-attention mechanisms.",
    tokens: 9,
    boundaries: ["The", " transformer", " architecture", " uses", " self", "-", "attention", " mechanisms", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Neural networks can approximate any continuous function.",
    tokens: 9,
    boundaries: ["Ne", "ural", " networks", " can", " approximate", " any", " continuous", " function", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Gradient descent optimizes the loss function iteratively.",
    tokens: 10,
    boundaries: ["Gradient", " descent", " optim", "izes", " the", " loss", " function", " iter", "atively", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The API returned a 404 status code.",
    tokens: 9,
    boundaries: ["The", " API", " returned", " a", " ", "404", " status", " code", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Please enter your email address below.",
    tokens: 7,
    boundaries: ["Please", " enter", " your", " email", " address", " below", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "The restaurant was crowded on Friday evening.",
    tokens: 8,
    boundaries: ["The", " restaurant", " was", " crowded", " on", " Friday", " evening", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "Tokenization splits text into smaller subword units.",
    tokens: 10,
    boundaries: ["Token", "ization", " splits", " text", " into", " smaller", " sub", "word", " units", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The quick brown fox jumps over the lazy dog.",
    tokens: 10,
    boundaries: ["The", " quick", " brown", " fox", " jumps", " over", " the", " lazy", " dog", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "Version 3.14.159 was released last Tuesday.",
    tokens: 12,
    boundaries: ["Version", " ", "3", ".", "14", ".", "159", " was", " released", " last", " Tuesday", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Backpropagation computes gradients through the computational graph.",
    tokens: 10,
    boundaries: ["Back", "prop", "agation", " computes", " gradients", " through", " the", " computational", " graph", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "She studied computer science at Stanford University.",
    tokens: 8,
    boundaries: ["She", " studied", " computer", " science", " at", " Stanford", " University", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "The database query took 250 milliseconds to execute.",
    tokens: 10,
    boundaries: ["The", " database", " query", " took", " ", "250", " milliseconds", " to", " execute", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Remember to commit your changes before pushing.",
    tokens: 8,
    boundaries: ["Remember", " to", " commit", " your", " changes", " before", " pushing", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The meeting has been rescheduled to next Monday at 3pm.",
    tokens: 14,
    boundaries: ["The", " meeting", " has", " been", " res", "cheduled", " to", " next", " Monday", " at", " ", "3", "pm", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "Kubernetes orchestrates containerized applications at scale.",
    tokens: 10,
    boundaries: ["K", "ubernetes", " orchestr", "ates", " container", "ized", " applications", " at", " scale", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The stock market dropped 2.5% yesterday.",
    tokens: 11,
    boundaries: ["The", " stock", " market", " dropped", " ", "2", ".", "5", "%", " yesterday", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "We need to refactor this legacy codebase.",
    tokens: 9,
    boundaries: ["We", " need", " to", " refactor", " this", " legacy", " code", "base", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Large language models have billions of parameters.",
    tokens: 8,
    boundaries: ["Large", " language", " models", " have", " billions", " of", " parameters", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The weather forecast predicts rain this weekend.",
    tokens: 8,
    boundaries: ["The", " weather", " forecast", " predicts", " rain", " this", " weekend", "."],
    difficulty: 2,
    category: "everyday",
  },
  // ---- Code snippets (difficulty 2-3) ----
  {
    text: "print(\"Hello, World!\")",
    tokens: 6,
    boundaries: ["print", "(\"", "Hello", ",", " World", "!\")"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "const x = 42;",
    tokens: 6,
    boundaries: ["const", " x", " =", " ", "42", ";"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "for i in range(10):",
    tokens: 7,
    boundaries: ["for", " i", " in", " range", "(", "10", "):"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "if (x > 0) { return true; }",
    tokens: 12,
    boundaries: ["if", " (", "x", " >", " ", "0", ")", " {", " return", " true", ";", " }"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "import numpy as np",
    tokens: 4,
    boundaries: ["import", " numpy", " as", " np"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "def fibonacci(n):\n    if n <= 1:\n        return n",
    tokens: 14,
    boundaries: ["def", " fibonacci", "(n", "):\n", "   ", " if", " n", " <=", " ", "1", ":\n", "       ", " return", " n"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "SELECT * FROM users WHERE age > 21;",
    tokens: 10,
    boundaries: ["SELECT", " *", " FROM", " users", " WHERE", " age", " >", " ", "21", ";"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "console.log(JSON.stringify(data));",
    tokens: 6,
    boundaries: ["console", ".log", "(JSON", ".stringify", "(data", "));"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "async function fetchData(url: string): Promise<Response> {",
    tokens: 11,
    boundaries: ["async", " function", " fetchData", "(url", ":", " string", "):", " Promise", "<Response", ">", " {"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "const [state, setState] = useState<number>(0);",
    tokens: 12,
    boundaries: ["const", " [", "state", ",", " setState", "]", " =", " useState", "<number", ">(", "0", ");"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "docker run -d -p 8080:80 nginx:latest",
    tokens: 14,
    boundaries: ["docker", " run", " -", "d", " -", "p", " ", "808", "0", ":", "80", " nginx", ":", "latest"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "git commit -m \"fix: resolve race condition in auth\"",
    tokens: 13,
    boundaries: ["git", " commit", " -", "m", " \"", "fix", ":", " resolve", " race", " condition", " in", " auth", "\""],
    difficulty: 2,
    category: "code",
  },
  {
    text: "npm install --save-dev @types/react",
    tokens: 8,
    boundaries: ["npm", " install", " --", "save", "-dev", " @", "types", "/react"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "model.fit(X_train, y_train, epochs=100, batch_size=32)",
    tokens: 17,
    boundaries: ["model", ".fit", "(X", "_train", ",", " y", "_train", ",", " epochs", "=", "100", ",", " batch", "_size", "=", "32", ")"],
    difficulty: 3,
    category: "code",
  },
  // ---- Numbers and math (difficulty 2-3) ----
  {
    text: "The answer is 3.14159265358979.",
    tokens: 12,
    boundaries: ["The", " answer", " is", " ", "3", ".", "141", "592", "653", "589", "79", "."],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "Call us at +1 (555) 867-5309.",
    tokens: 14,
    boundaries: ["Call", " us", " at", " +", "1", " (", "555", ")", " ", "867", "-", "530", "9", "."],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "1 + 1 = 2",
    tokens: 7,
    boundaries: ["1", " +", " ", "1", " =", " ", "2"],
    difficulty: 2,
    category: "numbers",
  },
  {
    text: "The temperature is -40 degrees Fahrenheit.",
    tokens: 8,
    boundaries: ["The", " temperature", " is", " -", "40", " degrees", " Fahrenheit", "."],
    difficulty: 2,
    category: "numbers",
  },
  {
    text: "2^10 = 1024",
    tokens: 7,
    boundaries: ["2", "^", "10", " =", " ", "102", "4"],
    difficulty: 2,
    category: "numbers",
  },
  {
    text: "E = mc^2 is the most famous equation in physics.",
    tokens: 13,
    boundaries: ["E", " =", " mc", "^", "2", " is", " the", " most", " famous", " equation", " in", " physics", "."],
    difficulty: 2,
    category: "numbers",
  },
  {
    text: "0x1A2B3C4D",
    tokens: 10,
    boundaries: ["0", "x", "1", "A", "2", "B", "3", "C", "4", "D"],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "192.168.1.1:8080/api/v2/users",
    tokens: 14,
    boundaries: ["192", ".", "168", ".", "1", ".", "1", ":", "808", "0", "/api", "/v", "2", "/users"],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "SHA-256: a1b2c3d4e5f6...",
    tokens: 17,
    boundaries: ["SHA", "-", "256", ":", " a", "1", "b", "2", "c", "3", "d", "4", "e", "5", "f", "6", "..."],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "Price: $1,299.99 (save 15%)",
    tokens: 13,
    boundaries: ["Price", ":", " $", "1", ",", "299", ".", "99", " (", "save", " ", "15", "%)"],
    difficulty: 3,
    category: "numbers",
  },
  // ---- Emoji and Unicode (difficulty 3) ----
  {
    text: "I love pizza! \u{1F355}\u{1F355}\u{1F355}",
    tokens: 23,
    boundaries: ["I", " love", " pizza", "!", " \\", "u", "{", "1", "F", "355", "}\\", "u", "{", "1", "F", "355", "}\\", "u", "{", "1", "F", "355", "}"],
    difficulty: 3,
    category: "unicode",
  },
  {
    text: "\u{1F600}\u{1F601}\u{1F602}\u{1F923}",
    tokens: 24,
    boundaries: ["\\u", "{", "1", "F", "600", "}\\", "u", "{", "1", "F", "601", "}\\", "u", "{", "1", "F", "602", "}\\", "u", "{", "1", "F", "923", "}"],
    difficulty: 3,
    category: "unicode",
  },
  {
    text: "Café naïveté",
    tokens: 6,
    boundaries: ["C", "af", "é", " naï", "vet", "é"],
    difficulty: 3,
    category: "unicode",
  },
  {
    text: "こんにちは世界",
    tokens: 4,
    boundaries: ["こんにちは", "�", "�", "界"],
    difficulty: 3,
    category: "unicode",
  },
  {
    text: "¿Cuántos tokens tiene esta oración?",
    tokens: 10,
    boundaries: ["¿", "Cu", "ánt", "os", " tokens", " tiene", " esta", " or", "ación", "?"],
    difficulty: 3,
    category: "unicode",
  },
  {
    text: "Use the → arrow key to continue.",
    tokens: 8,
    boundaries: ["Use", " the", " →", " arrow", " key", " to", " continue", "."],
    difficulty: 2,
    category: "unicode",
  },
  {
    text: "★★★☆☆ (3 out of 5 stars)",
    tokens: 12,
    boundaries: ["★★", "★", "☆", "☆", " (", "3", " out", " of", " ", "5", " stars", ")"],
    difficulty: 3,
    category: "unicode",
  },
  // ---- AI/ML Terminology (difficulty 2-3) ----
  {
    text: "Fine-tuning a pre-trained model on domain-specific data.",
    tokens: 12,
    boundaries: ["Fine", "-t", "uning", " a", " pre", "-trained", " model", " on", " domain", "-specific", " data", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "RLHF aligns language models with human preferences.",
    tokens: 10,
    boundaries: ["RL", "HF", " align", "s", " language", " models", " with", " human", " preferences", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "The context window is 128,000 tokens.",
    tokens: 10,
    boundaries: ["The", " context", " window", " is", " ", "128", ",", "000", " tokens", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "Retrieval-augmented generation combines search with LLMs.",
    tokens: 14,
    boundaries: ["Ret", "rie", "val", "-a", "ug", "mented", " generation", " combines", " search", " with", " L", "LM", "s", "."],
    difficulty: 3,
    category: "ai",
  },
  {
    text: "Prompt engineering is the art of crafting effective inputs.",
    tokens: 10,
    boundaries: ["Prompt", " engineering", " is", " the", " art", " of", " crafting", " effective", " inputs", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "The embedding vector has 1536 dimensions.",
    tokens: 9,
    boundaries: ["The", " embedding", " vector", " has", " ", "153", "6", " dimensions", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "Temperature=0.7 produces more creative but less deterministic output.",
    tokens: 13,
    boundaries: ["Temperature", "=", "0", ".", "7", " produces", " more", " creative", " but", " less", " deterministic", " output", "."],
    difficulty: 3,
    category: "ai",
  },
  {
    text: "Chain-of-thought prompting improves reasoning in LLMs.",
    tokens: 12,
    boundaries: ["Chain", "-of", "-th", "ought", " prompting", " improves", " reasoning", " in", " L", "LM", "s", "."],
    difficulty: 3,
    category: "ai",
  },
  {
    text: "Byte-pair encoding merges frequent character pairs into tokens.",
    tokens: 11,
    boundaries: ["Byte", "-p", "air", " encoding", " merges", " frequent", " character", " pairs", " into", " tokens", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "The attention mechanism computes Q, K, V matrices.",
    tokens: 11,
    boundaries: ["The", " attention", " mechanism", " computes", " Q", ",", " K", ",", " V", " matrices", "."],
    difficulty: 2,
    category: "ai",
  },
  {
    text: "A 70B parameter model requires approximately 140GB of memory in FP16.",
    tokens: 17,
    boundaries: ["A", " ", "70", "B", " parameter", " model", " requires", " approximately", " ", "140", "GB", " of", " memory", " in", " FP", "16", "."],
    difficulty: 3,
    category: "ai",
  },
  {
    text: "Quantization reduces model size from FP32 to INT4.",
    tokens: 12,
    boundaries: ["Quant", "ization", " reduces", " model", " size", " from", " FP", "32", " to", " INT", "4", "."],
    difficulty: 3,
    category: "ai",
  },
  // ---- Punctuation-heavy (difficulty 2-3) ----
  {
    text: "Wait... what?! No way!!! Are you serious???",
    tokens: 11,
    boundaries: ["Wait", "...", " what", "?!", " No", " way", "!!!", " Are", " you", " serious", "???"],
    difficulty: 3,
    category: "punctuation",
  },
  {
    text: "\"To be, or not to be,\" he said.",
    tokens: 11,
    boundaries: ["\"To", " be", ",", " or", " not", " to", " be", ",\"", " he", " said", "."],
    difficulty: 2,
    category: "punctuation",
  },
  {
    text: "email@example.com",
    tokens: 3,
    boundaries: ["email", "@example", ".com"],
    difficulty: 2,
    category: "punctuation",
  },
  {
    text: "https://www.example.com/path?query=value&key=123#section",
    tokens: 15,
    boundaries: ["https", "://", "www", ".example", ".com", "/path", "?", "query", "=value", "&", "key", "=", "123", "#", "section"],
    difficulty: 3,
    category: "punctuation",
  },
  {
    text: "Mr. Smith, Jr. earned his Ph.D. in 2019.",
    tokens: 16,
    boundaries: ["Mr", ".", " Smith", ",", " Jr", ".", " earned", " his", " Ph", ".D", ".", " in", " ", "201", "9", "."],
    difficulty: 3,
    category: "punctuation",
  },
  {
    text: "It's a rock 'n' roll lifestyle, isn't it?",
    tokens: 14,
    boundaries: ["It", "'s", " a", " rock", " '", "n", "'", " roll", " lifestyle", ",", " isn", "'t", " it", "?"],
    difficulty: 3,
    category: "punctuation",
  },
  {
    text: "file_name_v2_final_FINAL(1).docx",
    tokens: 11,
    boundaries: ["file", "_name", "_v", "2", "_final", "_FINAL", "(", "1", ").", "doc", "x"],
    difficulty: 3,
    category: "punctuation",
  },
  // ---- Longer / Paragraph (difficulty 2-3) ----
  {
    text: "In a hole in the ground there lived a hobbit.",
    tokens: 12,
    boundaries: ["In", " a", " hole", " in", " the", " ground", " there", " lived", " a", " hob", "bit", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "The mitochondria is the powerhouse of the cell, converting nutrients into ATP through cellular respiration.",
    tokens: 19,
    boundaries: ["The", " mitochond", "ria", " is", " the", " powerhouse", " of", " the", " cell", ",", " converting", " nutrients", " into", " ATP", " through", " cellular", " res", "piration", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "According to all known laws of aviation, there is no way a bee should be able to fly.",
    tokens: 20,
    boundaries: ["According", " to", " all", " known", " laws", " of", " aviation", ",", " there", " is", " no", " way", " a", " bee", " should", " be", " able", " to", " fly", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "Supercalifragilisticexpialidocious",
    tokens: 11,
    boundaries: ["Sup", "erc", "al", "if", "rag", "il", "istic", "exp", "ial", "id", "ocious"],
    difficulty: 3,
    category: "everyday",
  },
  {
    text: "Pneumonoultramicroscopicsilicovolcanoconiosis is a lung disease.",
    tokens: 22,
    boundaries: ["P", "ne", "um", "on", "oul", "tram", "icro", "sc", "op", "ics", "il", "ic", "ov", "ol", "cano", "con", "iosis", " is", " a", " lung", " disease", "."],
    difficulty: 3,
    category: "technical",
  },
  {
    text: "The Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55.",
    tokens: 34,
    boundaries: ["The", " Fibonacci", " sequence", ":", " ", "1", ",", " ", "1", ",", " ", "2", ",", " ", "3", ",", " ", "5", ",", " ", "8", ",", " ", "13", ",", " ", "21", ",", " ", "34", ",", " ", "55", "."],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "To infinity and beyond!",
    tokens: 5,
    boundaries: ["To", " infinity", " and", " beyond", "!"],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "A stitch in time saves nine.",
    tokens: 7,
    boundaries: ["A", " stitch", " in", " time", " saves", " nine", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "The regex pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    tokens: 34,
    boundaries: ["The", " regex", " pattern", ":", " ^", "[", "a", "-zA", "-Z", "0", "-", "9", "._", "%", "+-", "]+", "@[", "a", "-zA", "-Z", "0", "-", "9", ".-", "]+", "\\\\", ".[", "a", "-zA", "-Z", "]{", "2", ",", "}$"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "The half-life of Carbon-14 is approximately 5,730 years.",
    tokens: 15,
    boundaries: ["The", " half", "-life", " of", " Carbon", "-", "14", " is", " approximately", " ", "5", ",", "730", " years", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tokens: 10,
    boundaries: ["Lorem", " ipsum", " dolor", " sit", " amet", ",", " consectetur", " adipiscing", " elit", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "int main(int argc, char *argv[]) { return 0; }",
    tokens: 15,
    boundaries: ["int", " main", "(int", " argc", ",", " char", " *", "argv", "[])", " {", " return", " ", "0", ";", " }"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "The password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.",
    tokens: 21,
    boundaries: ["The", " password", " must", " contain", " at", " least", " ", "8", " characters", ",", " including", " uppercase", ",", " lowercase", ",", " numbers", ",", " and", " special", " characters", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "TypeError: Cannot read properties of undefined (reading 'map')",
    tokens: 12,
    boundaries: ["TypeError", ":", " Cannot", " read", " properties", " of", " undefined", " (", "reading", " '", "map", "')"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "sudo apt-get install build-essential",
    tokens: 7,
    boundaries: ["sudo", " apt", "-get", " install", " build", "-", "essential"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "The United Nations was founded on October 24, 1945.",
    tokens: 14,
    boundaries: ["The", " United", " Nations", " was", " founded", " on", " October", " ", "24", ",", " ", "194", "5", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "She sells seashells by the seashore.",
    tokens: 11,
    boundaries: ["She", " sells", " se", "ash", "ells", " by", " the", " se", "ash", "ore", "."],
    difficulty: 2,
    category: "everyday",
  },
  {
    text: "CORS (Cross-Origin Resource Sharing) headers must be configured on the server.",
    tokens: 16,
    boundaries: ["C", "ORS", " (", "Cross", "-Origin", " Resource", " Sharing", ")", " headers", " must", " be", " configured", " on", " the", " server", "."],
    difficulty: 3,
    category: "technical",
  },
  {
    text: "TL;DR: Use async/await instead of .then() chains.",
    tokens: 15,
    boundaries: ["TL", ";", "DR", ":", " Use", " async", "/", "await", " instead", " of", " .", "then", "()", " chains", "."],
    difficulty: 3,
    category: "code",
  },
  {
    text: "The GDP of the United States in 2024 was approximately $28.78 trillion.",
    tokens: 18,
    boundaries: ["The", " GDP", " of", " the", " United", " States", " in", " ", "202", "4", " was", " approximately", " $", "28", ".", "78", " trillion", "."],
    difficulty: 3,
    category: "numbers",
  },
  {
    text: "Do or do not, there is no try.",
    tokens: 10,
    boundaries: ["Do", " or", " do", " not", ",", " there", " is", " no", " try", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "All your base are belong to us.",
    tokens: 8,
    boundaries: ["All", " your", " base", " are", " belong", " to", " us", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "HTTP/2 uses multiplexing to send multiple requests over a single TCP connection.",
    tokens: 17,
    boundaries: ["HTTP", "/", "2", " uses", " multip", "lex", "ing", " to", " send", " multiple", " requests", " over", " a", " single", " TCP", " connection", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "The O(n log n) time complexity of merge sort makes it efficient for large datasets.",
    tokens: 18,
    boundaries: ["The", " O", "(n", " log", " n", ")", " time", " complexity", " of", " merge", " sort", " makes", " it", " efficient", " for", " large", " datasets", "."],
    difficulty: 3,
    category: "technical",
  },
  {
    text: "JSON.parse('{\"key\": \"value\"}')",
    tokens: 10,
    boundaries: ["JSON", ".parse", "('", "{\"", "key", "\":", " \"", "value", "\"}", "')"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "a]b[c{d}e(f)g<h>",
    tokens: 13,
    boundaries: ["a", "]", "b", "[c", "{", "d", "}", "e", "(f", ")", "g", "<h", ">"],
    difficulty: 3,
    category: "punctuation",
  },
  {
    text: "Run the command: python3 -m venv .venv && source .venv/bin/activate",
    tokens: 21,
    boundaries: ["Run", " the", " command", ":", " python", "3", " -", "m", " v", "env", " .", "ven", "v", " &&", " source", " .", "ven", "v", "/bin", "/", "activate"],
    difficulty: 3,
    category: "code",
  },
  {
    text: "I think, therefore I am.",
    tokens: 7,
    boundaries: ["I", " think", ",", " therefore", " I", " am", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "404 Not Found",
    tokens: 3,
    boundaries: ["404", " Not", " Found"],
    difficulty: 1,
    category: "technical",
  },
  {
    text: "null !== undefined",
    tokens: 3,
    boundaries: ["null", " !==", " undefined"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "The cake is a lie.",
    tokens: 6,
    boundaries: ["The", " cake", " is", " a", " lie", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Keep it simple, stupid.",
    tokens: 6,
    boundaries: ["Keep", " it", " simple", ",", " stupid", "."],
    difficulty: 1,
    category: "everyday",
  },
  {
    text: "Tabs vs. spaces: the eternal debate.",
    tokens: 9,
    boundaries: ["Tabs", " vs", ".", " spaces", ":", " the", " eternal", " debate", "."],
    difficulty: 2,
    category: "technical",
  },
  {
    text: "rm -rf / (please don't run this)",
    tokens: 11,
    boundaries: ["rm", " -", "rf", " /", " (", "please", " don", "'t", " run", " this", ")"],
    difficulty: 2,
    category: "code",
  },
  {
    text: "The answer to life, the universe, and everything is 42.",
    tokens: 14,
    boundaries: ["The", " answer", " to", " life", ",", " the", " universe", ",", " and", " everything", " is", " ", "42", "."],
    difficulty: 2,
    category: "everyday",
  },
];

// --- Game Constants ---
const ROUND_TIME_MS = 15000;
const GAME_SLUG = "token-blitz";

// --- Helpers ---
function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateDistractors(correct: number): number[] {
  const distractors = new Set<number>();
  const minRange = Math.max(1, Math.floor(correct * 0.5));
  const maxRange = Math.ceil(correct * 1.6);

  // Generate close distractors
  const offsets = [-3, -2, -1, 1, 2, 3, 4, 5, -4, -5, 6, -6, 7, 8];
  const shuffledOffsets = shuffle(offsets);

  for (const offset of shuffledOffsets) {
    const val = correct + offset;
    if (val >= 1 && val !== correct && val >= minRange && val <= maxRange) {
      distractors.add(val);
    }
    if (distractors.size >= 3) break;
  }

  // Fill remaining with percentage-based distractors
  let attempts = 0;
  while (distractors.size < 3 && attempts < 50) {
    const pct = 0.6 + Math.random() * 0.8; // 60% to 140% of correct
    const val = Math.max(1, Math.round(correct * pct));
    if (val !== correct) {
      distractors.add(val);
    }
    attempts++;
  }

  return Array.from(distractors).slice(0, 3);
}

interface Round {
  sentence: TokenSentence;
  options: number[];
}

function generateRounds(): Round[] {
  // First 3 rounds: easy difficulty
  const easy = shuffle(SENTENCES.filter((s) => s.difficulty === 1)).slice(0, 3);
  // Remaining: mix of medium and hard, shuffled
  const rest = shuffle(
    SENTENCES.filter((s) => !easy.includes(s))
  );
  const ordered = [...easy, ...rest];

  return ordered.map((sentence) => {
    const distractors = generateDistractors(sentence.tokens);
    const options = shuffle([sentence.tokens, ...distractors]);
    return { sentence, options };
  });
}

// --- Streak ---
function getStreakMultiplier(streak: number): { mult: number; label: string } {
  if (streak >= 10) return { mult: 4, label: "4x" };
  if (streak >= 7) return { mult: 3, label: "3x" };
  if (streak >= 5) return { mult: 2, label: "2x" };
  if (streak >= 3) return { mult: 1.5, label: "1.5x" };
  return { mult: 1, label: "1x" };
}

function getStreakColor(streak: number): string {
  if (streak >= 10) return "#ff4444";
  if (streak >= 7) return "#ff8800";
  if (streak >= 5) return "#EBCB8B";
  if (streak >= 3) return "#6366F1";
  return "#888";
}

// --- DOM Particle System ---
interface DOMParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  char: string;
}

let particleIdCounter = 0;

function createParticleBurst(
  x: number,
  y: number,
  count: number,
  colors: string[],
  chars: string[] = ["•"],
): DOMParticle[] {
  const particles: DOMParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      id: ++particleIdCounter,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 40 + Math.random() * 30,
      maxLife: 40 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      char: chars[Math.floor(Math.random() * chars.length)],
    });
  }
  return particles;
}

// --- Tokenization display colors ---
const TOKEN_COLORS = [
  "bg-indigo-500/30 text-indigo-200 border-indigo-500/50",
  "bg-emerald-500/30 text-emerald-200 border-emerald-500/50",
  "bg-amber-500/30 text-amber-200 border-amber-500/50",
  "bg-rose-500/30 text-rose-200 border-rose-500/50",
  "bg-cyan-500/30 text-cyan-200 border-cyan-500/50",
  "bg-purple-500/30 text-purple-200 border-purple-500/50",
  "bg-orange-500/30 text-orange-200 border-orange-500/50",
  "bg-teal-500/30 text-teal-200 border-teal-500/50",
];

type GameState = "ready" | "playing" | "answered" | "gameover";

export default function TokenBlitzGame() {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS);
  const [particles, setParticles] = useState<DOMParticle[]>([]);
  const [shaking, setShaking] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [leaderboardKey, setLeaderboardKey] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Particle animation loop
  useEffect(() => {
    if (particles.length === 0) return;

    const tick = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            vx: p.vx * 0.98,
            life: p.life - 1,
          }))
          .filter((p) => p.life > 0);
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [particles.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    setTimeLeft(ROUND_TIME_MS);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        // Time's up = wrong answer
        stopTimer();
        setWasCorrect(false);
        setSelectedAnswer(-1); // sentinel for "timed out"
        setStreak(0);
        setShaking(true);
        setFlashColor("red");
        setTimeout(() => {
          setShaking(false);
          setFlashColor(null);
        }, 500);
        setGameState("answered");
        // Auto advance to game over after showing answer
        setTimeout(() => {
          setGameState("gameover");
          setShowNameInput(true);
        }, 2500);
      }
    }, 50);
  }, [stopTimer]);

  const startGame = useCallback(() => {
    const newRounds = generateRounds();
    setRounds(newRounds);
    setCurrentRound(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSelectedAnswer(null);
    setWasCorrect(false);
    setShowNameInput(false);
    setPlayerName("");
    setGameState("playing");
    startTimeRef.current = Date.now();
    setTimeLeft(ROUND_TIME_MS);
    stopTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, ROUND_TIME_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        stopTimer();
        setWasCorrect(false);
        setSelectedAnswer(-1);
        setStreak(0);
        setShaking(true);
        setFlashColor("red");
        setTimeout(() => {
          setShaking(false);
          setFlashColor(null);
        }, 500);
        setGameState("answered");
        setTimeout(() => {
          setGameState("gameover");
          setShowNameInput(true);
        }, 2500);
      }
    }, 50);
  }, [stopTimer]);

  const handleAnswer = useCallback(
    (chosen: number) => {
      if (gameState !== "playing") return;
      const round = rounds[currentRound];
      if (!round) return;

      stopTimer();
      setSelectedAnswer(chosen);

      const correct = chosen === round.sentence.tokens;
      setWasCorrect(correct);

      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
        const { mult } = getStreakMultiplier(newStreak);
        const timeBonus = timeLeft > 10000 ? 2 : timeLeft > 5000 ? 1 : 0;
        const basePoints = 10;
        const roundPoints = Math.round((basePoints + timeBonus) * mult);
        setScore((prev) => prev + roundPoints);

        // Flash + particles
        const isFast = timeLeft > 10000;
        setFlashColor(isFast ? "gold" : "green");
        setTimeout(() => setFlashColor(null), 400);

        // Spawn particles from the center of the container
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 3;
          const chars = isFast ? ["★", "✓", "⚡"] : ["✓", "•", "●"];
          const colors = isFast
            ? ["#EBCB8B", "#FFA500", "#FFEC8B"]
            : ["#4ade80", "#22c55e", "#86efac"];
          setParticles((prev) => [
            ...prev,
            ...createParticleBurst(cx, cy, isFast ? 25 : 15, colors, chars),
          ]);
        }

        setGameState("answered");

        // Auto advance after showing the tokenization breakdown
        timeoutRef.current = setTimeout(() => {
          const nextRound = currentRound + 1;
          if (nextRound >= rounds.length) {
            setGameState("gameover");
            setShowNameInput(true);
          } else {
            setCurrentRound(nextRound);
            setSelectedAnswer(null);
            setGameState("playing");
            startTimer();
          }
        }, 2500);
      } else {
        // Wrong answer
        setStreak(0);
        setShaking(true);
        setFlashColor("red");
        setTimeout(() => {
          setShaking(false);
          setFlashColor(null);
        }, 500);

        setGameState("answered");

        timeoutRef.current = setTimeout(() => {
          setGameState("gameover");
          setShowNameInput(true);
        }, 2500);
      }
    },
    [gameState, rounds, currentRound, streak, bestStreak, timeLeft, stopTimer, startTimer],
  );

  const submitScore = useCallback(() => {
    const name = playerName.trim() || "Anonymous";
    addScore(GAME_SLUG, name, score);
    setShowNameInput(false);
    setLeaderboardKey((k) => k + 1);
  }, [playerName, score]);

  const round = rounds[currentRound];
  const timerPercent = (timeLeft / ROUND_TIME_MS) * 100;
  const timerColor =
    timerPercent > 60 ? "bg-accent-green" : timerPercent > 30 ? "bg-yellow-400" : "bg-red-500";
  const { mult, label: multLabel } = getStreakMultiplier(streak);
  const streakColor = getStreakColor(streak);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div
        ref={containerRef}
        className={`relative ${shaking ? "animate-shake" : ""}`}
        style={{
          animation: shaking
            ? "shake 0.4s cubic-bezier(.36,.07,.19,.97) both"
            : undefined,
        }}
      >
        {/* Flash overlay */}
        {flashColor && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none z-20 transition-opacity duration-300"
            style={{
              backgroundColor:
                flashColor === "green"
                  ? "rgba(34, 197, 94, 0.15)"
                  : flashColor === "gold"
                    ? "rgba(255, 215, 0, 0.2)"
                    : "rgba(239, 68, 68, 0.15)",
            }}
          />
        )}

        {/* DOM Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute pointer-events-none z-30 select-none font-bold"
            style={{
              left: p.x,
              top: p.y,
              fontSize: p.size,
              color: p.color,
              opacity: p.life / p.maxLife,
              transform: `rotate(${p.vx * 10}deg)`,
              transition: "none",
            }}
          >
            {p.char}
          </span>
        ))}

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-bold text-white uppercase tracking-wide">
              Token Blitz
            </span>
          </div>
        </div>

        {/* Ready screen */}
        {gameState === "ready" && (
          <div className="rounded-xl border border-white/10 bg-navy-light/80 p-8 text-center">
            <span className="text-6xl block mb-4">🔤</span>
            <h3 className="font-heading text-xl font-bold text-white mb-2">
              How Many Tokens?
            </h3>
            <p className="text-sm text-gray-400 mb-2">
              Guess how many BPE tokens each sentence splits into.
              Test your tokenizer intuition!
            </p>
            <p className="text-xs text-gray-500 mb-6">
              15 seconds per question. One wrong answer ends the game.
              Streaks multiply your score!
            </p>
            <button
              onClick={startGame}
              className="font-heading rounded-lg bg-indigo-500 px-8 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-indigo-400"
            >
              Start Game
            </button>
          </div>
        )}

        {/* Playing / Answered */}
        {(gameState === "playing" || gameState === "answered") && round && (
          <>
            {/* Score bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-2xl font-bold text-indigo-400">
                    {score}
                  </span>
                  <span className="text-xs text-gray-500">pts</span>
                </div>
                {streak >= 3 && (
                  <span
                    className="text-xs font-bold animate-pulse flex items-center gap-1"
                    style={{ color: streakColor }}
                  >
                    🔥 {streak} streak ({multLabel})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Q{currentRound + 1}
                </span>
                {gameState === "playing" && (
                  <span
                    className={`font-mono text-sm tabular-nums font-bold ${
                      timerPercent <= 30 ? "text-red-400 animate-pulse" : "text-gray-400"
                    }`}
                  >
                    {Math.ceil(timeLeft / 1000)}s
                  </span>
                )}
              </div>
            </div>

            {/* Timer bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>

            {/* Sentence display */}
            <div className="rounded-xl border border-white/10 bg-navy-light/80 p-5 mb-4">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold shrink-0 mt-0.5">
                  {round.sentence.category}
                </span>
                {round.sentence.difficulty === 3 && (
                  <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold shrink-0 mt-0.5">
                    Hard
                  </span>
                )}
              </div>

              {gameState === "playing" ? (
                <p className="text-white text-sm sm:text-base font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {round.sentence.text}
                </p>
              ) : (
                /* Show tokenization breakdown after answering */
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Token breakdown ({round.sentence.tokens} tokens):
                  </p>
                  <div className="flex flex-wrap gap-0.5">
                    {round.sentence.boundaries
                      .filter((b) => b.length > 0)
                      .map((boundary, idx) => (
                        <span
                          key={idx}
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono border ${
                            TOKEN_COLORS[idx % TOKEN_COLORS.length]
                          }`}
                          title={`Token ${idx + 1}`}
                        >
                          {boundary.replace(/ /g, "·").replace(/\n/g, "↵")}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Answer options */}
            <div className="grid grid-cols-2 gap-2">
              {round.options.map((option, idx) => {
                let btnClass =
                  "border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5";
                const isSelected = selectedAnswer === option;
                const isCorrect = option === round.sentence.tokens;

                if (gameState === "answered") {
                  if (isCorrect) {
                    btnClass =
                      "border-accent-green bg-accent-green/20 ring-2 ring-accent-green/50";
                  } else if (isSelected && !isCorrect) {
                    btnClass =
                      "border-red-500 bg-red-500/20 ring-2 ring-red-500/50";
                  } else {
                    btnClass = "border-white/5 opacity-40";
                  }
                }

                return (
                  <button
                    key={`${idx}-${option}`}
                    onClick={() => handleAnswer(option)}
                    disabled={gameState !== "playing"}
                    className={`rounded-lg border px-4 py-4 text-center transition-all ${btnClass} ${
                      gameState === "playing"
                        ? "cursor-pointer active:scale-95"
                        : "cursor-default"
                    }`}
                  >
                    <span className="font-heading text-2xl font-bold text-white block">
                      {option}
                    </span>
                    <span className="text-xs text-gray-500">tokens</span>
                  </button>
                );
              })}
            </div>

            {/* Result feedback */}
            {gameState === "answered" && (
              <div className="mt-3 text-center">
                {wasCorrect ? (
                  <p className="text-accent-green text-sm font-bold">
                    Correct! +{Math.round(
                      (10 + (timeLeft > 10000 ? 2 : timeLeft > 5000 ? 1 : 0)) *
                        mult,
                    )}{" "}
                    points
                    {mult > 1 && (
                      <span style={{ color: streakColor }}>
                        {" "}({multLabel} streak bonus)
                      </span>
                    )}
                  </p>
                ) : selectedAnswer === -1 ? (
                  <p className="text-red-400 text-sm font-bold">
                    Time&apos;s up! The answer was {round.sentence.tokens} tokens.
                  </p>
                ) : (
                  <p className="text-red-400 text-sm font-bold">
                    Wrong! The answer was {round.sentence.tokens} tokens.
                  </p>
                )}
              </div>
            )}

            {/* Streak multiplier display */}
            {streak >= 3 && gameState === "playing" && (
              <div className="mt-2 flex justify-center">
                <div
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: `${streakColor}20`,
                    color: streakColor,
                    border: `1px solid ${streakColor}40`,
                  }}
                >
                  <span>🔥</span>
                  <span>{multLabel} Multiplier Active</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Game Over */}
        {gameState === "gameover" && (
          <div className="rounded-xl border border-white/10 bg-navy-light/80 p-8 text-center">
            <span className="text-5xl block mb-3">
              {score >= 200 ? "👑" : score >= 100 ? "🌟" : score >= 50 ? "🔤" : "💡"}
            </span>
            <p className="font-heading text-3xl font-bold text-white mb-1">
              {score}{" "}
              <span className="text-lg text-gray-400 font-normal">points</span>
            </p>
            <p className="text-sm text-gray-400 mb-1">
              {currentRound + (wasCorrect ? 1 : 0)} questions answered
              {bestStreak >= 3 && (
                <span className="text-indigo-400">
                  {" "} | Best streak: {bestStreak}
                </span>
              )}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {score >= 200
                ? "Tokenizer savant! You think in BPE."
                : score >= 100
                  ? "Impressive! You have strong tokenizer intuition."
                  : score >= 50
                    ? "Good run! You are getting the hang of it."
                    : score >= 20
                      ? "Not bad! Tokenization takes practice."
                      : "Keep at it! Tokenization is tricky."}
            </p>

            {/* Name input for leaderboard */}
            {showNameInput && (
              <div className="mb-4 flex items-center gap-2 justify-center">
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitScore()}
                  placeholder="Your name"
                  maxLength={20}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-36"
                  autoFocus
                />
                <button
                  onClick={submitScore}
                  className="rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-3 py-2 text-sm font-bold text-indigo-300 hover:bg-indigo-500/30 transition-colors"
                >
                  Save
                </button>
              </div>
            )}

            <button
              onClick={startGame}
              className="font-heading rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-indigo-400"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <GameLeaderboard
        gameSlug={GAME_SLUG}
        refreshKey={leaderboardKey}
        defaultCollapsed={gameState === "playing" || gameState === "answered"}
      />

      {/* Inline CSS for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-4px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(4px);
          }
        }
      `}</style>
    </div>
  );
}

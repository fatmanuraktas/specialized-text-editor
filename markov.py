#!/usr/bin/env python3
"""
==========================================================================
IMAGEFICTION - Python Markov Decision Tree & Author Persona ML Engine
==========================================================================
N-gram Trie & Transition State Machine for Author Style Learning & Next-Word Prediction.
"""

import re
import math
import random
from collections import defaultdict, Counter
from typing import List, Dict, Any

class MarkovDecisionTree:
    def __init__(self, order: int = 3):
        self.order = order
        self.unigrams = Counter()
        self.total_words = 0
        self.decision_tree = defaultdict(Counter)
        self.context_counts = Counter()

    def clean_text(self, text: str) -> List[str]:
        """Tokenize text preserving Turkish characters and basic punctuation."""
        if not text:
            return []
        text = text.lower().replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        cleaned = re.sub(r'[^\w\sçğıöşüİ1-9.,!?-]', '', text)
        tokens = [w for w in cleaned.split() if w]
        return tokens

    def get_markov_ratios(self) -> Dict[str, Any]:
        """Calculate dynamic corpus weight vs random exploration weight based on corpus word count."""
        N = self.total_words
        if N < 500:
            progress = max(0, N) / 500.0
            corpus_w = 0.05 + progress * 0.10  # 5% to 15%
        elif N < 5000:
            progress = (N - 500.0) / (5000.0 - 500.0)
            corpus_w = 0.15 + progress * 0.25  # 15% to 40% (random still higher ~60%)
        elif N < 15000:
            progress = (N - 5000.0) / (15000.0 - 5000.0)
            corpus_w = 0.40 + progress * 0.45  # 40% to 85%
        else:
            corpus_w = 0.90  # 15000+: 90% Corpus, 10% Random

        random_w = round(1.0 - corpus_w, 4)
        corpus_w = round(corpus_w, 4)
        return {
            "total_words": N,
            "corpus_weight": corpus_w,
            "random_weight": random_w,
            "corpus_pct": round(corpus_w * 100),
            "random_pct": round(random_w * 100)
        }

    def train_corpus(self, text_list: List[str]):
        """Train Markov Decision Tree with memory storage complexity optimizations."""
        self.unigrams.clear()
        self.decision_tree.clear()
        self.context_counts.clear()
        self.total_words = 0

        full_corpus = " ".join([t for t in text_list if t])
        tokens = self.clean_text(full_corpus)
        self.total_words = len(tokens)

        # Storage complexity bounds
        MAX_BRANCH_SIZE = 15
        MAX_CONTEXT_NODES = 12000

        for i, token in enumerate(tokens):
            self.unigrams[token] += 1

            for order in range(1, self.order + 1):
                if i - order >= 0:
                    context = tuple(tokens[i - order:i])
                    if len(self.decision_tree) >= MAX_CONTEXT_NODES and context not in self.decision_tree:
                        continue

                    self.decision_tree[context][token] += 1
                    self.context_counts[context] += 1

                    # Prune branch size if exceeding limit to optimize memory complexity
                    if len(self.decision_tree[context]) > MAX_BRANCH_SIZE + 5:
                        most_common = self.decision_tree[context].most_common(MAX_BRANCH_SIZE)
                        self.decision_tree[context] = Counter(dict(most_common))

    def predict_next_words(self, context_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Predict top candidate next words considering dynamic corpus vs random ratios."""
        tokens = self.clean_text(context_text)
        ratios = self.get_markov_ratios()

        is_random_roll = random.random() < ratios["random_weight"]

        if tokens and not is_random_roll:
            for o in range(min(self.order, len(tokens)), 0, -1):
                context_slice = tuple(tokens[-o:])
                if context_slice in self.decision_tree:
                    next_counts = self.decision_tree[context_slice]
                    total_ctx = self.context_counts[context_slice] or 1
                    
                    results = []
                    for word, count in next_counts.most_common(top_k):
                        results.append({
                            "word": word,
                            "count": count,
                            "prob": round(count / total_ctx, 4),
                            "depth": o,
                            "context": " ".join(context_slice),
                            "ratios": ratios
                        })
                    return results

        return self._get_top_unigrams(top_k, ratios)

    def _get_top_unigrams(self, top_k: int = 5, ratios: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        if not self.total_words:
            return []
        if not ratios:
            ratios = self.get_markov_ratios()

        candidates = self.unigrams.most_common(top_k * 2)
        if ratios["random_weight"] > 0.5 and len(candidates) > 1:
            random.shuffle(candidates)

        results = []
        for word, count in candidates[:top_k]:
            results.append({
                "word": word,
                "count": count,
                "prob": round(count / self.total_words, 4),
                "depth": 0,
                "context": "",
                "ratios": ratios
            })
        return results

    def generate_text(self, seed_phrase: str, max_words: int = 25, temperature: float = 0.7) -> str:
        """Generate text continuation using decision tree and corpus ratio sampling."""
        tokens = self.clean_text(seed_phrase)
        if not tokens:
            tokens = ["gecenin"]
        generated = list(tokens)

        for _ in range(max_words):
            context_str = " ".join(generated)
            candidates = self.predict_next_words(context_str, top_k=8)
            if not candidates:
                break

            if temperature <= 0.1:
                chosen_word = candidates[0]["word"]
            else:
                probs = [math.pow(c["prob"], 1.0 / temperature) for c in candidates]
                sum_p = sum(probs)
                if sum_p <= 0:
                    chosen_word = candidates[0]["word"]
                else:
                    norm_probs = [p / sum_p for p in probs]
                    r = random.random()
                    acc = 0.0
                    chosen_word = candidates[0]["word"]
                    for idx, p in enumerate(norm_probs):
                        acc += p
                        if r <= acc:
                            chosen_word = candidates[idx]["word"]
                            break

            generated.append(chosen_word)

        return " ".join(generated)

    def get_tree_branches(self, seed_phrase: str) -> Dict[str, Any]:
        """Inspect Decision Tree Node Branches for seed phrase."""
        tokens = self.clean_text(seed_phrase)
        if not tokens:
            return {"matched": False, "candidates": [], "total_transitions": 0}

        context = tuple(tokens[-min(self.order, len(tokens)):])
        if context in self.decision_tree:
            next_counts = self.decision_tree[context]
            total_ctx = self.context_counts[context] or 1
            candidates = [
                {"word": w, "count": c, "prob": round(c / total_ctx, 2)}
                for w, c in next_counts.most_common(8)
            ]
            return {
                "matched": True,
                "context": " ".join(context),
                "total_transitions": total_ctx,
                "candidates": candidates,
                "ratios": self.get_markov_ratios()
            }
        return {"matched": False, "candidates": [], "total_transitions": 0}

    def get_author_metrics(self) -> Dict[str, Any]:
        vocab_size = len(self.unigrams)
        ttr = round((vocab_size / self.total_words * 100), 1) if self.total_words else 0
        return {
            "total_words": self.total_words,
            "vocab_size": vocab_size,
            "ttr": ttr,
            "order": self.order,
            "ratios": self.get_markov_ratios(),
            "top_words": [w for w, _ in self.unigrams.most_common(8)]
        }

# Global Instance for CLI or API server
global_markov = MarkovDecisionTree(order=3)

if __name__ == "__main__":
    sample_text = """
    Gecenin karanlığı şehri kapladığında eski saatin tiktakları yankılanıyordu. 
    Dedektif Ahmet Yılmaz masasının üzerindeki sararmış dosyaları karıştırırken sokaktan gelen adımları duydu. 
    Kasabaya ilk kar düşüp sis kapladığında kütüphanenin ışıkları ansızın söndü.
    """
    global_markov.train_corpus([sample_text])
    print("🧠 Python Markov Decision Tree Engine Test Success!")
    print("Metrics:", global_markov.get_author_metrics())
    print("Predict 'gecenin':", global_markov.predict_next_words("gecenin"))
    print("Generated:", global_markov.generate_text("gecenin karanlığı", 15))

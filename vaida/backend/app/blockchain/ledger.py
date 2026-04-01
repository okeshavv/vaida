"""
VAIDA Blockchain Ledger — SHA-256 hash chain for audit trails.

Implements three record types from the wireframe:
  1. CONSENT  — Patient consent (DPDPA 2023)
  2. TRIAGE_AUDIT — Triage decision accountability
  3. EPI_ALERT — Epidemiological outbreak anchoring (with ZKP placeholder)

For hackathon: local hash chain stored in-memory + file.
Production: swap to Ethereum/Polygon via Web3.py.
"""
import hashlib
import json
import time
import threading
from datetime import datetime, timezone
from typing import List, Optional


class Block:
    """Single block in the VAIDA audit chain."""

    def __init__(
        self,
        index: int,
        block_type: str,
        data: dict,
        prev_hash: str,
        timestamp: Optional[str] = None,
    ):
        self.index = index
        self.block_type = block_type
        self.data = data
        self.prev_hash = prev_hash
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.tx_hash = self._compute_hash()

    def _compute_hash(self) -> str:
        """Compute SHA-256 hash of block contents."""
        block_string = json.dumps({
            "index": self.index,
            "block_type": self.block_type,
            "data": self.data,
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
        }, sort_keys=True)
        return "0x" + hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "block_type": self.block_type,
            "data": self.data,
            "prev_hash": self.prev_hash,
            "timestamp": self.timestamp,
            "tx_hash": self.tx_hash,
        }


class VaidaLedger:
    """
    VAIDA blockchain ledger — thread-safe hash chain.
    Provides immutable audit trail for consent, triage, and epi events.
    """

    def __init__(self):
        self._chain: List[Block] = []
        self._lock = threading.Lock()
        self._create_genesis_block()

    def _create_genesis_block(self):
        """Create the genesis (first) block."""
        genesis = Block(
            index=0,
            block_type="GENESIS",
            data={"message": "VAIDA Ledger Initialized"},
            prev_hash="0x" + "0" * 64,
        )
        self._chain.append(genesis)

    @property
    def chain_length(self) -> int:
        return len(self._chain)

    @property
    def last_block(self) -> Block:
        return self._chain[-1]

    def add_consent_record(
        self,
        patient_hash: str,
        consent_type: str,
        lang: str,
    ) -> str:
        """
        Record patient consent on-chain.
        Returns tx_hash.
        """
        data = {
            "patient_hash": patient_hash,
            "consent_type": consent_type,
            "lang": lang,
            "action": "GRANT",
        }
        return self._add_block("CONSENT", data)

    def add_consent_revocation(self, patient_hash: str) -> str:
        """Record consent revocation (right to deletion)."""
        data = {
            "patient_hash": patient_hash,
            "action": "REVOKE",
        }
        return self._add_block("CONSENT_REVOKE", data)

    def add_triage_audit(
        self,
        session_hash: str,
        urgency: str,
        model_version: str,
        rule_override: bool = False,
        triggered_flags: list = None,
    ) -> str:
        """
        Record triage decision on-chain for clinical accountability.
        Returns tx_hash.
        """
        data = {
            "session_hash": session_hash,
            "urgency": urgency,
            "model_version": model_version,
            "rule_override": rule_override,
            "triggered_flags": triggered_flags or [],
        }
        return self._add_block("TRIAGE_AUDIT", data)

    def add_epi_alert(
        self,
        district: str,
        patient_count: int,
        symptom_cluster: list,
        zkp_proof: Optional[str] = None,
    ) -> str:
        """
        Anchor epidemiological alert on-chain.
        ZKP ensures individual patient data is never exposed.
        Returns tx_hash.
        """
        data = {
            "district": district,
            "patient_count": patient_count,
            "symptom_cluster": symptom_cluster,
            "zkp_proof_hash": zkp_proof or self._generate_zkp_placeholder(patient_count),
        }
        return self._add_block("EPI_ALERT", data)

    def _add_block(self, block_type: str, data: dict) -> str:
        """Thread-safe block addition. Returns tx_hash."""
        with self._lock:
            new_block = Block(
                index=len(self._chain),
                block_type=block_type,
                data=data,
                prev_hash=self._chain[-1].tx_hash,
            )
            self._chain.append(new_block)
            return new_block.tx_hash

    def verify_chain_integrity(self) -> bool:
        """
        Verify the entire chain — each block's prev_hash must match
        the previous block's tx_hash, and each hash must be valid.
        """
        for i in range(1, len(self._chain)):
            current = self._chain[i]
            previous = self._chain[i - 1]

            # Check prev_hash link
            if current.prev_hash != previous.tx_hash:
                return False

            # Recompute and verify hash
            if current.tx_hash != current._compute_hash():
                return False

        return True

    def get_blocks_by_type(self, block_type: str) -> List[dict]:
        """Retrieve all blocks of a specific type."""
        return [
            b.to_dict() for b in self._chain
            if b.block_type == block_type
        ]

    def get_block_by_tx_hash(self, tx_hash: str) -> Optional[dict]:
        """Retrieve a block by its tx_hash."""
        for b in self._chain:
            if b.tx_hash == tx_hash:
                return b.to_dict()
        return None

    def get_full_chain(self) -> List[dict]:
        """Return the entire chain as a list of dicts."""
        return [b.to_dict() for b in self._chain]

    @staticmethod
    def _generate_zkp_placeholder(count: int) -> str:
        """
        Generate a ZKP placeholder hash.
        In production, this uses a proper ZKP library (e.g., snarkjs).
        The proof demonstrates: "there exist >= N patients with these symptoms"
        without revealing any individual patient data.
        """
        proof_input = f"zkp_aggregate_count_{count}_{time.time()}"
        return "zkp_" + hashlib.sha256(proof_input.encode()).hexdigest()[:32]


# ── Global ledger singleton ──
_ledger_instance: Optional[VaidaLedger] = None
_ledger_lock = threading.Lock()


def get_ledger() -> VaidaLedger:
    """Get or create the global ledger singleton."""
    global _ledger_instance
    if _ledger_instance is None:
        with _ledger_lock:
            if _ledger_instance is None:
                _ledger_instance = VaidaLedger()
    return _ledger_instance


def reset_ledger():
    """Reset the ledger — used in tests."""
    global _ledger_instance
    with _ledger_lock:
        _ledger_instance = VaidaLedger()

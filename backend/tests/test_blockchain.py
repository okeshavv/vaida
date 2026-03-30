"""
VAIDA Blockchain Tests — 7 test cases for ledger integrity and records.
"""
import pytest
from app.blockchain.ledger import VaidaLedger


class TestBlockchain:
    """Blockchain ledger unit tests."""

    @pytest.mark.blockchain
    def test_create_consent_block(self):
        """Consent block is created with valid tx_hash."""
        ledger = VaidaLedger()
        tx = ledger.add_consent_record(
            patient_hash="0xabc123",
            consent_type="data_storage+ai_triage",
            lang="hi",
        )
        assert tx.startswith("0x")
        assert len(tx) == 66  # 0x + 64 hex chars

    @pytest.mark.blockchain
    def test_create_triage_audit_block(self):
        """Triage audit block has all required fields."""
        ledger = VaidaLedger()
        tx = ledger.add_triage_audit(
            session_hash="0x2e5b...",
            urgency="RED",
            model_version="triage-v1.0.0",
            rule_override=True,
            triggered_flags=["chest_pain_sweat"],
        )
        assert tx.startswith("0x")
        block = ledger.get_block_by_tx_hash(tx)
        assert block["block_type"] == "TRIAGE_AUDIT"
        assert block["data"]["urgency"] == "RED"
        assert block["data"]["rule_override"] is True

    @pytest.mark.blockchain
    def test_create_epi_alert_block(self):
        """Epi alert block includes ZKP proof hash."""
        ledger = VaidaLedger()
        tx = ledger.add_epi_alert(
            district="Jaipur",
            patient_count=18,
            symptom_cluster=["fever", "cough"],
        )
        block = ledger.get_block_by_tx_hash(tx)
        assert block["block_type"] == "EPI_ALERT"
        assert block["data"]["patient_count"] == 18
        assert block["data"]["zkp_proof_hash"].startswith("zkp_")

    @pytest.mark.blockchain
    def test_chain_integrity_valid(self):
        """Chain with multiple blocks passes integrity verification."""
        ledger = VaidaLedger()
        ledger.add_consent_record("0x111", "consent", "en")
        ledger.add_triage_audit("0x222", "AMBER", "v1.0", False)
        ledger.add_epi_alert("Delhi", 10, ["fever"])
        assert ledger.verify_chain_integrity() is True

    @pytest.mark.blockchain
    def test_chain_integrity_tamper_detected(self):
        """Tampering with a block breaks chain integrity."""
        ledger = VaidaLedger()
        ledger.add_consent_record("0x111", "consent", "en")
        ledger.add_triage_audit("0x222", "RED", "v1.0", True)

        # Tamper with a block
        ledger._chain[1].data["urgency"] = "GREEN"  # Tamper!
        assert ledger.verify_chain_integrity() is False

    @pytest.mark.blockchain
    def test_block_has_prev_hash(self):
        """Each block correctly links to the previous block's hash."""
        ledger = VaidaLedger()
        tx1 = ledger.add_consent_record("0x111", "consent", "en")
        tx2 = ledger.add_consent_record("0x222", "consent", "hi")

        block2 = ledger.get_block_by_tx_hash(tx2)
        assert block2["prev_hash"] == tx1

    @pytest.mark.blockchain
    def test_tx_hashes_unique(self):
        """All transaction hashes are unique."""
        ledger = VaidaLedger()
        hashes = set()
        for i in range(20):
            tx = ledger.add_consent_record(f"0x{i:04d}", "consent", "en")
            assert tx not in hashes, f"Duplicate hash: {tx}"
            hashes.add(tx)

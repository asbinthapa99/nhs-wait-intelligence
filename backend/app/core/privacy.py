"""
Privacy vault — Microsoft Presidio PII scrubbing.
Falls back to a no-op when presidio_analyzer / presidio_anonymizer are not installed,
logging a warning so operators know PII redaction is inactive.
"""
import logging

log = logging.getLogger(__name__)

try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_anonymizer import AnonymizerEngine

    class PIIProtector:
        """Microsoft Presidio-backed PII scrubber."""

        def __init__(self) -> None:
            self.analyzer = AnalyzerEngine()
            self.anonymizer = AnonymizerEngine()

        def scrub_text(self, text: str) -> str:
            if not text:
                return text
            results = self.analyzer.analyze(
                text=text,
                entities=["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "MEDICAL_LICENSE"],
                language="en",
            )
            redacted = self.anonymizer.anonymize(text=text, analyzer_results=results)
            return redacted.text

except ImportError:
    log.warning(
        "presidio_analyzer / presidio_anonymizer not installed — PII scrubbing is disabled. "
        "Install with: pip install presidio-analyzer presidio-anonymizer"
    )

    class PIIProtector:  # type: ignore[no-redef]
        """No-op fallback used when presidio packages are not installed."""

        def scrub_text(self, text: str) -> str:
            return text


# Singleton
privacy_vault = PIIProtector()

"""
Privacy vault — stubs out Microsoft Presidio PII scrubbing when the
presidio_analyzer / presidio_anonymizer packages are not installed.
The rest of the API remains fully functional; the scrub_text method
simply returns the input unchanged.
"""
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

    class PIIProtector:  # type: ignore[no-redef]
        """No-op stub used when presidio packages are not installed."""

        def scrub_text(self, text: str) -> str:
            return text


# Singleton
privacy_vault = PIIProtector()

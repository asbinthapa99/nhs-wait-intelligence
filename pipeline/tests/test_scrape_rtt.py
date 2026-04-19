import io
import zipfile

import scrape_rtt


class FakeResponse:
    def __init__(self, text: str = "", content: bytes = b""):
        self.text = text
        self.content = content

    def raise_for_status(self) -> None:
        return None


class FakeSession:
    def __init__(self, responses: dict[str, FakeResponse]):
        self._responses = responses
        self.headers = {}

    def get(self, url: str, timeout: int = 0) -> FakeResponse:
        return self._responses[url]


def _build_zip_bytes(filename: str, content: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(filename, content)
    return buffer.getvalue()


def test_scrape_latest_rtt_data_keeps_archive_and_latest_snapshot(monkeypatch, tmp_path):
    raw_dir = tmp_path / "data" / "raw"
    rtt_dir = raw_dir / "rtt"

    monkeypatch.setattr(scrape_rtt, "RAW_DIR", raw_dir)
    monkeypatch.setattr(scrape_rtt, "RTT_DIR", rtt_dir)
    monkeypatch.setattr(scrape_rtt, "RTT_LATEST_DIR", rtt_dir / "latest")
    monkeypatch.setattr(scrape_rtt, "RTT_ARCHIVE_DIR", rtt_dir / "archive")
    monkeypatch.setattr(scrape_rtt, "RTT_ARCHIVE_ZIP_DIR", rtt_dir / "archive" / "zips")
    monkeypatch.setattr(scrape_rtt, "RTT_ARCHIVE_CSV_DIR", rtt_dir / "archive" / "csv")

    index_html = (
        '<a href="/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/">'
        "2025-26 RTT waiting times data"
        "</a>"
    )
    year_html = (
        '<a href="/statistics/wp-content/uploads/sites/2/2026/04/Full-CSV-data-file-Feb26-ZIP-4M-9j03fJT.zip">'
        "Latest full extract CSV data file Feb26"
        "</a>"
    )
    zip_filename = "20260228-RTT-February-2026-full-extract.csv"
    zip_bytes = _build_zip_bytes(zip_filename, "period,provider_code\n2026-02,RFH12\n")

    responses = {
        scrape_rtt.RTT_INDEX_URL: FakeResponse(text=index_html),
        "https://www.england.nhs.uk/statistics/statistical-work-areas/rtt-waiting-times/rtt-data-2025-26/": FakeResponse(
            text=year_html,
        ),
        "https://www.england.nhs.uk/statistics/wp-content/uploads/sites/2/2026/04/Full-CSV-data-file-Feb26-ZIP-4M-9j03fJT.zip": FakeResponse(
            content=zip_bytes,
        ),
    }

    monkeypatch.setattr(scrape_rtt.requests, "Session", lambda: FakeSession(responses))

    extracted = scrape_rtt.scrape_latest_rtt_data()

    latest_csv = rtt_dir / "latest" / zip_filename
    archived_zip = rtt_dir / "archive" / "zips" / "Full-CSV-data-file-Feb26-ZIP-4M-9j03fJT.zip"
    archived_csv = rtt_dir / "archive" / "csv" / "Full-CSV-data-file-Feb26-ZIP-4M-9j03fJT" / zip_filename

    assert extracted == 1
    assert latest_csv.exists()
    assert archived_zip.exists()
    assert archived_csv.exists()

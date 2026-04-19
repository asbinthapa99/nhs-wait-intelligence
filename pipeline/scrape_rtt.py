"""
Automated Web Scraper for NHS RTT Waiting Times data.
Hits the NHS England statistics page, finds the latest monthly Zip file,
downloads it, and extracts the CSV files to the raw data directory.
"""

import io
import os
import re
import shutil
import logging
import zipfile
import tempfile
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup
from config import RAW_DIR

log = logging.getLogger(__name__)

# Base URL for NHS RTT Waiting Times statistics
NHS_BASE_URL = "https://www.england.nhs.uk"
RTT_INDEX_URL = f"{NHS_BASE_URL}/statistics/statistical-work-areas/rtt-waiting-times/"
RTT_DIR = RAW_DIR / "rtt"
RTT_LATEST_DIR = RTT_DIR / "latest"
RTT_ARCHIVE_DIR = RTT_DIR / "archive"
RTT_ARCHIVE_ZIP_DIR = RTT_ARCHIVE_DIR / "zips"
RTT_ARCHIVE_CSV_DIR = RTT_ARCHIVE_DIR / "csv"


def _clear_directory(directory: Path) -> None:
    if not directory.exists():
        return

    for path in directory.iterdir():
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()


def _ensure_rtt_directories() -> None:
    RTT_LATEST_DIR.mkdir(parents=True, exist_ok=True)
    RTT_ARCHIVE_ZIP_DIR.mkdir(parents=True, exist_ok=True)
    RTT_ARCHIVE_CSV_DIR.mkdir(parents=True, exist_ok=True)


def _absolute_url(base_url: str, maybe_relative_url: str) -> str:
    return urljoin(base_url, maybe_relative_url)


def _copy_zip_to_archive(zip_url: str, zip_content: bytes) -> Path:
    archive_name = Path(urlsplit(zip_url).path).name
    archive_path = RTT_ARCHIVE_ZIP_DIR / archive_name
    with open(archive_path, "wb") as target:
        target.write(zip_content)
    return archive_path


def _extract_csvs(zip_content: bytes, latest_dir: Path, archive_dir: Path) -> int:
    archive_dir.mkdir(parents=True, exist_ok=True)

    extracted_count = 0
    with tempfile.TemporaryDirectory(dir=RTT_DIR) as temp_dir:
        temp_latest_dir = Path(temp_dir) / "latest"
        temp_latest_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(io.BytesIO(zip_content)) as zf:
            for file_info in zf.infolist():
                if file_info.is_dir() or not file_info.filename.lower().endswith(".csv"):
                    continue

                filename = os.path.basename(file_info.filename)
                with zf.open(file_info) as source:
                    content = source.read()

                with open(temp_latest_dir / filename, "wb") as target:
                    target.write(content)

                with open(archive_dir / filename, "wb") as target:
                    target.write(content)

                extracted_count += 1
                log.info(f"  Extracted and archived: {filename}")

        if extracted_count == 0:
            return 0

        _clear_directory(latest_dir)
        latest_dir.mkdir(parents=True, exist_ok=True)
        for path in temp_latest_dir.iterdir():
            shutil.move(str(path), latest_dir / path.name)

    return extracted_count

def scrape_latest_rtt_data() -> int:
    """
    Scrapes the NHS website for the latest 'Full CSV data file',
    downloads the ZIP, archives it, and refreshes the latest CSV snapshot.
    Returns the number of CSV files extracted.
    """
    _ensure_rtt_directories()
    
    log.info(f"Connecting to NHS RTT Index Page: {RTT_INDEX_URL}")
    try:
        session = requests.Session()
        session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        
        # Step 1: Find the latest RTT data publication page
        response = session.get(RTT_INDEX_URL, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Look for the main rtt-data links (e.g., 'rtt-data-2023-24', 'rtt-data-2024-25')
        links = soup.find_all("a", href=re.compile(r"/rtt-data-\d{4}-\d{2}/?$"))
        
        if not links:
            links = soup.find_all("a", href=re.compile(r"/rtt-data"))
            if not links:
                log.error("Could not find any links to RTT data pages on the index.")
                return 0
                
        # Get the first matching link which is typically the newest publication year
        latest_year_link = links[0]["href"]
        if not latest_year_link.startswith("http"):
            latest_year_link = _absolute_url(NHS_BASE_URL, latest_year_link)
            
        log.info(f"Found latest publication year page: {latest_year_link}")
        
        # Step 2: Fetch the publication year page and find the latest 'Full CSV data file' ZIP
        year_resp = session.get(latest_year_link, timeout=15)
        year_resp.raise_for_status()
        year_soup = BeautifulSoup(year_resp.text, "html.parser")
        
        zip_links = year_soup.find_all(
            "a",
            href=re.compile(r"\.zip$", re.IGNORECASE),
            string=re.compile(r"Full CSV|Latest full extract CSV", re.IGNORECASE),
        )
        
        if not zip_links:
            log.warning("No link explicitly labelled 'Full CSV' found. Looking for any zip file.")
            zip_links = year_soup.find_all("a", href=re.compile(r"\.zip$", re.IGNORECASE))
            
        if not zip_links:
            log.error(f"Could not find any ZIP data files on the page {latest_year_link}")
            return 0
            
        latest_zip_url = zip_links[0]["href"]
        if not latest_zip_url.startswith("http"):
            latest_zip_url = _absolute_url(NHS_BASE_URL, latest_zip_url)
            
        log.info(f"Found latest data extract ZIP: {latest_zip_url}")
        
        # Step 3: Download and Extract
        log.info("Downloading ZIP file...")
        zip_resp = session.get(latest_zip_url, timeout=30)
        zip_resp.raise_for_status()

        archive_path = _copy_zip_to_archive(latest_zip_url, zip_resp.content)
        log.info(f"Archived ZIP at: {archive_path}")
        
        log.info("Extracting CSVs to raw data directory...")
        archive_csv_dir = RTT_ARCHIVE_CSV_DIR / archive_path.stem
        extracted_count = _extract_csvs(zip_resp.content, RTT_LATEST_DIR, archive_csv_dir)
                    
        log.info(f"Scrape complete. Extracted {extracted_count} CSV files.")
        return extracted_count
        
    except Exception as e:
        log.error(f"Automated data scraping failed: {e}")
        return 0

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    scrape_latest_rtt_data()

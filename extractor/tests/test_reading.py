"""REQ-UPL-04, AC-UPL-03; T-UPL-03: file → text in memory; type sniffed from bytes."""

from __future__ import annotations

import pytest

from helpers import SAMPLES, docx_bytes, image_only_pdf
from nikasha_extractor.core.errors import ExtractError
from nikasha_extractor.reading import read_upload, sniff


def test_pdf_sample():
    text = read_upload((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes())
    assert "Supertrend turns Green" in text and "Reduce position size significantly" in text


def test_txt_sample():
    text = read_upload((SAMPLES / "one_line_strategy.txt").read_bytes())
    assert text.startswith("Buy ATM Nifty call")


def test_docx_paragraphs_and_tables():
    text = read_upload(docx_bytes(["Buy ATM call when RSI 14 crosses above 60."], [["Stop-loss", "30%"]]))
    assert "RSI 14 crosses above 60" in text and "Stop-loss | 30%" in text


def test_scanned_pdf_is_unreadable():
    with pytest.raises(ExtractError) as e:
        read_upload(image_only_pdf())
    assert e.value.code == "UNREADABLE_FILE"


def test_protected_pdf_is_unreadable():
    from io import BytesIO

    from pypdf import PdfReader, PdfWriter

    w = PdfWriter()
    for p in PdfReader(BytesIO((SAMPLES / "nifty_weekly_options_strategy.pdf").read_bytes())).pages:
        w.add_page(p)
    w.encrypt("secret")
    buf = BytesIO()
    w.write(buf)
    with pytest.raises(ExtractError) as e:
        read_upload(buf.getvalue())
    assert e.value.code == "UNREADABLE_FILE"


def test_type_from_bytes_not_name():
    assert sniff(b"%PDF-1.7 ...") == "pdf"
    assert sniff(b"\x89PNG\r\n\x1a\n\x00\x00") == "unknown"
    with pytest.raises(ExtractError) as e:
        read_upload(b"\x89PNG\r\n\x1a\n\x00\x00\x00binary")
    assert e.value.code == "UNSUPPORTED_FILE"


def test_size_limit():
    with pytest.raises(ExtractError) as e:
        read_upload(b"a" * (4 * 1024 * 1024 + 1))
    assert e.value.code == "PAYLOAD_TOO_LARGE"

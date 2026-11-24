# True OMR requires native Java libraries, not a Cloudflare isolate.
# Audiveris 5.11.0 is AGPLv3.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 \
    AUDIVERIS_BIN=/opt/audiveris/bin/Audiveris OMR_TIMEOUT_SECONDS=110
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv ca-certificates curl ghostscript xvfb xauth \
    tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng \
    tesseract-ocr-deu tesseract-ocr-por fonts-dejavu-core \
    libasound2t64 libfreetype6 libfontconfig1 && \
    rm -rf /var/lib/apt/lists/*
ARG AUDIVERIS_VERSION=5.11.0
ARG AUDIVERIS_SHA256=f20113aaa33b3149ec8d6a09b2a7963360e65fafd92d69389987a85bbc3ec7a3
RUN curl -fsSL -o /tmp/audiveris.deb \
  "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
  && echo "${AUDIVERIS_SHA256}  /tmp/audiveris.deb" | sha256sum -c - \
  && dpkg-deb --extract /tmp/audiveris.deb / \
  && test -x /opt/audiveris/bin/Audiveris \
  && rm /tmp/audiveris.deb
WORKDIR /service
COPY requirements.txt /service/requirements.txt
RUN python3 -m venv /venv \
  && /venv/bin/pip install --no-cache-dir -r /service/requirements.txt
COPY app.py musicxml.py /service/
ENV PATH="/venv/bin:${PATH}"
RUN useradd --create-home --uid 10001 omr && chown -R omr:omr /service
USER omr
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port 8000 --workers 1"]

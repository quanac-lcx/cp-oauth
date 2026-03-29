"""
clist-fetch.py — HTTP request helper using curl_cffi to bypass Cloudflare TLS fingerprinting.

Reads a JSON request from stdin, makes the HTTP request with browser-like TLS
fingerprint via curl_cffi, and writes a JSON response to stdout.

Input (stdin JSON):
    {
        "method": "GET" | "POST",
        "url": "https://...",
        "headers": { ... },          // optional
        "data": { "key": "value" },  // optional, form-encoded POST body
        "sessionInit": "https://..."  // optional, GET this URL first to init session cookies
    }

Output (stdout JSON):
    {
        "status": 200,
        "body": "...",
        "headers": { ... },
        "error": null
    }
"""

import json
import sys

from curl_cffi import requests

IMPERSONATE = 'chrome131'
TIMEOUT = 25


def main():
    try:
        raw = sys.stdin.read()
        params = json.loads(raw)
    except Exception as e:
        json.dump({'status': 0, 'body': '', 'headers': {}, 'error': f'Invalid input: {e}'}, sys.stdout)
        return

    method = params.get('method', 'GET').upper()
    url = params.get('url', '')
    headers = params.get('headers', {})
    data = params.get('data', None)
    session_init = params.get('sessionInit', None)

    if not url:
        json.dump({'status': 0, 'body': '', 'headers': {}, 'error': 'Missing url'}, sys.stdout)
        return

    try:
        session = requests.Session(impersonate=IMPERSONATE)

        # Init session by visiting a page first (picks up cookies like csrftoken)
        if session_init:
            session.get(session_init, timeout=TIMEOUT)

        # For POST requests to clist.by, add Origin/Referer headers to avoid
        # Cloudflare blocking cross-origin-looking requests
        if method == 'POST' and session_init:
            headers.setdefault('Origin', session_init.rstrip('/'))
            headers.setdefault('Referer', session_init.rstrip('/') + '/')

        if method == 'POST':
            resp = session.post(url, headers=headers, data=data, timeout=TIMEOUT)
        else:
            resp = session.get(url, headers=headers, timeout=TIMEOUT)

        resp_headers = dict(resp.headers)
        json.dump({
            'status': resp.status_code,
            'body': resp.text,
            'headers': resp_headers,
            'error': None
        }, sys.stdout)
    except Exception as e:
        json.dump({
            'status': 0,
            'body': '',
            'headers': {},
            'error': str(e)
        }, sys.stdout)


if __name__ == '__main__':
    main()

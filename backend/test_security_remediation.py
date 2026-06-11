import unittest
from fastapi.testclient import TestClient
from main import app
from bson import ObjectId
from jose import jwt
from config import settings
import datetime

class TestSecurityRemediation(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_cors_headers(self):
        # Verify allowed origins are enforced and wildcard regex is not used
        response = self.client.options(
            "/api/auth/me",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "authorization"
            }
        )
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:3000")
        
        # Verify random origin is rejected
        response_invalid = self.client.options(
            "/api/auth/me",
            headers={
                "Origin": "http://malicious.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        self.assertNotEqual(response_invalid.headers.get("access-control-allow-origin"), "http://malicious.com")

    def test_security_headers(self):
        # Verify standard security headers are present
        response = self.client.get("/")
        self.assertEqual(response.headers.get("x-frame-options"), "DENY")
        self.assertEqual(response.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin")

    def test_master_otp_bypass_removed(self):
        # Try logging in with the master OTP
        payload = {
            "mobile": "9999999999",
            "otp": "123456"
        }
        # This should fail (either 401/400 or database unavailable 503)
        response = self.client.post("/api/auth/verify-otp", json=payload)
        # It must not be successful (200)
        self.assertNotEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()

import requests
import unittest
import json
import random
import string
import sys
from datetime import datetime

class HackerRankAPITester(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(HackerRankAPITester, self).__init__(*args, **kwargs)
        self.base_url = "https://b4d92a51-a7fa-4923-a967-ae47413ab7b8.preview.emergentagent.com/api"
        self.token = None
        self.user_data = None
        self.test_user = {
            "email": f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
            "username": f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "password": "Test@123",
            "full_name": "Test User"
        }

    def setUp(self):
        print(f"\n🔍 Testing API at {self.base_url}")

    def test_01_health_check(self):
        """Test API health check endpoint"""
        print("\n🔍 Testing API health check...")
        try:
            response = requests.get(f"{self.base_url}")
            self.assertEqual(response.status_code, 200)
            print("✅ API health check passed")
        except Exception as e:
            print(f"❌ API health check failed: {str(e)}")
            self.fail(f"API health check failed: {str(e)}")

    def test_02_register_user(self):
        """Test user registration"""
        print("\n🔍 Testing user registration...")
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=self.test_user
            )
            # The API returns 200 for successful registration instead of 201
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("access_token", data)
            self.assertIn("user", data)
            self.token = data["access_token"]
            self.user_data = data["user"]
            print(f"✅ User registration passed - Created user: {self.test_user['username']}")
        except Exception as e:
            print(f"❌ User registration failed: {str(e)}")
            self.fail(f"User registration failed: {str(e)}")

    def test_03_login_user(self):
        """Test user login"""
        print("\n🔍 Testing user login...")
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": self.test_user["email"],
                    "password": self.test_user["password"]
                }
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("access_token", data)
            self.assertIn("user", data)
            self.token = data["access_token"]
            self.user_data = data["user"]
            print(f"✅ User login passed - Logged in as: {self.test_user['username']}")
        except Exception as e:
            print(f"❌ User login failed: {str(e)}")
            self.fail(f"User login failed: {str(e)}")

    def test_04_oauth_login(self):
        """Test OAuth login (dummy)"""
        print("\n🔍 Testing OAuth login (dummy)...")
        try:
            for provider in ["google", "github", "linkedin"]:
                response = requests.post(
                    f"{self.base_url}/auth/{provider}",
                    json={"token": "dummy-token"}
                )
                self.assertEqual(response.status_code, 200)
                data = response.json()
                self.assertIn("access_token", data)
                self.assertIn("user", data)
                print(f"✅ OAuth login with {provider} passed")
        except Exception as e:
            print(f"❌ OAuth login failed: {str(e)}")
            self.fail(f"OAuth login failed: {str(e)}")

    def test_05_get_questions(self):
        """Test getting questions list"""
        print("\n🔍 Testing questions list...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/questions",
                headers=headers
            )
            self.assertEqual(response.status_code, 200)
            questions = response.json()
            self.assertIsInstance(questions, list)
            print(f"✅ Questions list retrieved - Found {len(questions)} questions")
            
            # Test filtering
            filters = [
                {"language": "JavaScript"},
                {"difficulty": "Easy"},
                {"topic": "Arrays"}
            ]
            
            for filter_params in filters:
                param_str = "&".join([f"{k}={v}" for k, v in filter_params.items()])
                response = requests.get(
                    f"{self.base_url}/questions?{param_str}",
                    headers=headers
                )
                self.assertEqual(response.status_code, 200)
                filtered_questions = response.json()
                print(f"✅ Filtered questions by {filter_params} - Found {len(filtered_questions)} questions")
                
            return questions
        except Exception as e:
            print(f"❌ Getting questions failed: {str(e)}")
            self.fail(f"Getting questions failed: {str(e)}")
            return []

    def test_06_get_question_details(self):
        """Test getting question details"""
        print("\n🔍 Testing question details...")
        try:
            # First get all questions
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/questions",
                headers=headers
            )
            questions = response.json()
            
            if not questions:
                print("⚠️ No questions found to test details")
                return
                
            # Get details for the first question
            question_id = questions[0]["id"]
            response = requests.get(
                f"{self.base_url}/questions/{question_id}",
                headers=headers
            )
            self.assertEqual(response.status_code, 200)
            question = response.json()
            self.assertEqual(question["id"], question_id)
            print(f"✅ Question details retrieved for ID: {question_id}")
            return question
        except Exception as e:
            print(f"❌ Getting question details failed: {str(e)}")
            self.fail(f"Getting question details failed: {str(e)}")
            return None

    def test_07_submit_code(self):
        """Test code submission"""
        print("\n🔍 Testing code submission...")
        try:
            # First get all questions
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/questions",
                headers=headers
            )
            questions = response.json()
            
            if not questions:
                print("⚠️ No questions found to test submission")
                return
                
            # Get details for the first question
            question_id = questions[0]["id"]
            response = requests.get(
                f"{self.base_url}/questions/{question_id}",
                headers=headers
            )
            question = response.json()
            
            # Submit code (using starter code or a simple solution)
            code = question.get("starter_code", "function solution(nums) { return nums; }")
            
            response = requests.post(
                f"{self.base_url}/questions/{question_id}/submit",
                headers=headers,
                json={
                    "code": code,
                    "language": question.get("language", "JavaScript").lower()
                }
            )
            self.assertEqual(response.status_code, 200)
            result = response.json()
            self.assertIn("status", result)
            print(f"✅ Code submission successful - Status: {result['status']}")
        except Exception as e:
            print(f"❌ Code submission failed: {str(e)}")
            self.fail(f"Code submission failed: {str(e)}")

    def test_08_user_progress(self):
        """Test user progress"""
        print("\n🔍 Testing user progress...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/user/progress",
                headers=headers
            )
            self.assertEqual(response.status_code, 200)
            progress = response.json()
            self.assertIn("stats", progress)
            print(f"✅ User progress retrieved")
        except Exception as e:
            print(f"❌ Getting user progress failed: {str(e)}")
            self.fail(f"Getting user progress failed: {str(e)}")

    def test_09_leaderboard(self):
        """Test leaderboard"""
        print("\n🔍 Testing leaderboard...")
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(
                f"{self.base_url}/leaderboard",
                headers=headers
            )
            self.assertEqual(response.status_code, 200)
            leaderboard = response.json()
            self.assertIsInstance(leaderboard, list)
            print(f"✅ Leaderboard retrieved - Found {len(leaderboard)} users")
        except Exception as e:
            print(f"❌ Getting leaderboard failed: {str(e)}")
            self.fail(f"Getting leaderboard failed: {str(e)}")

def run_tests():
    # Create a test suite
    suite = unittest.TestSuite()
    
    # Add tests in order
    test_cases = [
        'test_01_health_check',
        'test_02_register_user',
        'test_03_login_user',
        'test_04_oauth_login',
        'test_05_get_questions',
        'test_06_get_question_details',
        'test_07_submit_code',
        'test_08_user_progress',
        'test_09_leaderboard'
    ]
    
    for test_case in test_cases:
        suite.addTest(HackerRankAPITester(test_case))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return exit code based on test results
    return 0 if result.wasSuccessful() else 1

if __name__ == "__main__":
    sys.exit(run_tests())
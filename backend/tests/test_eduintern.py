"""
Unit tests for EduIntern endpoints
Run with: pytest test_eduintern.py -v
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path to import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

client = TestClient(app)

class TestInternshipEndpoints:
    """Test internship CRUD operations"""
    
    def test_get_filter_options(self):
        """Test filter options endpoint"""
        response = client.get("/api/eduintern/filters/options")
        assert response.status_code == 200
        data = response.json()
        assert "modes" in data
        assert "experience_levels" in data
        assert "sort_options" in data
        assert len(data["modes"]) == 3  # online, offline, hybrid
    
    def test_create_internship(self):
        """Test creating a new internship"""
        payload = {
            "company": "TestCorp",
            "role": "Test Engineer",
            "stipend": 500,
            "mode": "online",
            "is_paid": True,
            "location": "Remote",
            "duration": "3 months",
            "requirements": "Testing skills",
            "skills_required": "Python,Testing",
            "description": "Test description",
            "openings": 2,
            "scholarship_available": True,
            "min_cgpa": 3.0,
            "experience_level": "beginner"
        }
        response = client.post("/api/eduintern/create", data=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["internship"]["company"] == "TestCorp"
        assert data["internship"]["role"] == "Test Engineer"
        assert data["internship"]["stipend"] == 500
        assert data["internship"]["scholarship_available"] is True
        return data["internship"]["id"]
    
    def test_list_internships(self):
        """Test listing internships with filters"""
        response = client.get("/api/eduintern/list")
        assert response.status_code == 200
        data = response.json()
        assert "internships" in data
        assert "count" in data
        assert isinstance(data["internships"], list)
    
    def test_list_internships_with_mode_filter(self):
        """Test filtering by mode"""
        response = client.get("/api/eduintern/list?mode=online")
        assert response.status_code == 200
        data = response.json()
        # All returned internships should be online
        for internship in data["internships"]:
            assert internship["mode"] == "online"
    
    def test_list_paid_internships(self):
        """Test filtering paid internships"""
        response = client.get("/api/eduintern/list?is_paid=true")
        assert response.status_code == 200
        data = response.json()
        for internship in data["internships"]:
            assert internship["is_paid"] is True
    
    def test_scholarship_only_filter(self):
        """Test scholarship-only filter"""
        response = client.get("/api/eduintern/list?scholarship_only=true")
        assert response.status_code == 200
        data = response.json()
        for internship in data["internships"]:
            assert internship["scholarship_available"] is True
            assert internship["scholarship_slots_remaining"] > 0


class TestApplicationEndpoints:
    """Test application workflows"""
    
    def test_apply_to_internship(self):
        """Test applying to an internship"""
        # First create an internship
        create_payload = {
            "company": "AppTestCorp",
            "role": "Application Tester",
            "stipend": 400,
            "mode": "hybrid",
            "is_paid": True,
            "openings": 3
        }
        create_response = client.post("/api/eduintern/create", data=create_payload)
        internship_id = create_response.json()["internship"]["id"]
        
        # Now apply
        apply_payload = {
            "internship_id": internship_id,
            "applicant": "Test Student",
            "email": "test@example.com",
            "resume_url": "https://example.com/resume.pdf",
            "cover_letter": "I am interested",
            "phone": "1234567890",
            "availability": "Immediate"
        }
        response = client.post("/api/eduintern/apply", json=apply_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["application"]["applicant"] == "Test Student"
        assert data["application"]["status"] == "pending"
    
    def test_duplicate_application(self):
        """Test that duplicate applications are rejected"""
        # Create internship
        create_payload = {
            "company": "DupTestCorp",
            "role": "Duplicate Test Role",
            "stipend": 450,
            "openings": 2
        }
        create_response = client.post("/api/eduintern/create", data=create_payload)
        internship_id = create_response.json()["internship"]["id"]
        
        # First application
        apply_payload = {
            "internship_id": internship_id,
            "applicant": "Duplicate Applicant",
            "email": "dup@example.com",
            "resume_url": "https://example.com/resume.pdf"
        }
        response1 = client.post("/api/eduintern/apply", json=apply_payload)
        assert response1.status_code == 200
        assert response1.json()["ok"] is True
        
        # Duplicate application (should fail)
        response2 = client.post("/api/eduintern/apply", json=apply_payload)
        assert response2.status_code == 200
        data = response2.json()
        assert "error" in data
        assert "already applied" in data["error"].lower()
    
    def test_get_applications(self):
        """Test retrieving applications"""
        response = client.get("/api/eduintern/applications")
        assert response.status_code == 200
        data = response.json()
        assert "applications" in data
        assert "count" in data


class TestScholarshipEndpoints:
    """Test scholarship workflows"""
    
    def test_apply_for_scholarship(self):
        """Test scholarship application"""
        # Create internship with scholarship
        create_payload = {
            "company": "ScholarCorp",
            "role": "Scholarship Test Role",
            "stipend": 500,
            "openings": 2,
            "scholarship_available": True,
            "scholarship_criteria": "Merit-based",
            "min_cgpa": 3.2
        }
        create_response = client.post("/api/eduintern/create", data=create_payload)
        internship_id = create_response.json()["internship"]["id"]
        
        # Apply for scholarship
        scholar_payload = {
            "internship_id": internship_id,
            "applicant": "Scholar Student",
            "email": "scholar@example.com",
            "cgpa": 3.5,
            "essay": "I am passionate about learning and committed to excellence. " * 10,  # Make it 50+ chars
            "financial_need": "Need financial support",
            "achievements": "Dean's list, published paper"
        }
        response = client.post("/api/eduintern/scholarship/apply", json=scholar_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["scholarship_application"]["status"] == "under_review"
        assert data["scholarship_application"]["cgpa"] == 3.5
    
    def test_scholarship_cgpa_requirement(self):
        """Test CGPA validation for scholarship"""
        # Create internship with min CGPA 3.5
        create_payload = {
            "company": "HighStandardCorp",
            "role": "High CGPA Required",
            "stipend": 600,
            "openings": 1,
            "scholarship_available": True,
            "min_cgpa": 3.5
        }
        create_response = client.post("/api/eduintern/create", data=create_payload)
        internship_id = create_response.json()["internship"]["id"]
        
        # Try applying with low CGPA
        scholar_payload = {
            "internship_id": internship_id,
            "applicant": "Low GPA Student",
            "email": "lowgpa@example.com",
            "cgpa": 2.8,
            "essay": "Very long essay here to meet character requirement minimum fifty characters needed.",
            "financial_need": "Need support",
            "achievements": "None"
        }
        response = client.post("/api/eduintern/scholarship/apply", json=scholar_payload)
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        assert "cgpa" in data["error"].lower()


class TestAnalytics:
    """Test analytics endpoints"""
    
    def test_platform_analytics(self):
        """Test platform analytics endpoint"""
        response = client.get("/api/eduintern/analytics/platform")
        assert response.status_code == 200
        data = response.json()
        assert "total_internships" in data
        assert "active_internships" in data
        assert "total_applications" in data
        assert "mode_breakdown" in data
        assert "payment_breakdown" in data
        assert "average_stipend" in data
        assert isinstance(data["total_internships"], int)
        assert isinstance(data["average_stipend"], (int, float))


class TestStudentEndpoints:
    """Test student registration and profile"""
    
    def test_register_student(self):
        """Test student registration"""
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "university": "Test University",
            "major": "Computer Science",
            "cgpa": 3.4,
            "skills": "Python,JavaScript,React"
        }
        response = client.post("/api/eduintern/student/register", data=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["student"]["name"] == "John Doe"
        assert data["student"]["cgpa"] == 3.4
        assert len(data["student"]["skills"]) == 3
    
    def test_duplicate_student_registration(self):
        """Test duplicate email rejection"""
        payload = {
            "name": "Jane Doe",
            "email": "duplicate@example.com",
            "university": "Test Uni"
        }
        # First registration
        response1 = client.post("/api/eduintern/student/register", data=payload)
        assert response1.status_code == 200
        assert response1.json()["ok"] is True
        
        # Duplicate email
        response2 = client.post("/api/eduintern/student/register", data=payload)
        assert response2.status_code == 200
        data = response2.json()
        assert "error" in data
        assert "already registered" in data["error"].lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

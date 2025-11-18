"""
Seed data script for EduIntern platform
Run this to populate sample internships for immediate testing
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/eduintern"

# Sample internships (stipends in USD, will be displayed as INR on frontend)
internships = [
    {
        "company": "TechCorp", "role": "Software Engineering Intern", "stipend": 500, "mode": "hybrid",
        "is_paid": True, "location": "San Francisco, CA", "duration": "3 months",
        "requirements": "CS major, Python/JavaScript", "skills_required": "Python,JavaScript,React",
        "description": "Work on real-world projects with our engineering team",
        "responsibilities": "Build features, write tests, code reviews",
        "benefits": "Mentorship, networking, potential full-time offer", "openings": 3,
        "scholarship_available": True, "min_cgpa": 3.0, "experience_level": "beginner"
    },
    {
        "company": "DataLabs", "role": "Data Science Intern", "stipend": 600, "mode": "online",
        "is_paid": True, "location": "Remote", "duration": "6 months",
        "requirements": "Statistics, Python, ML basics", "skills_required": "Python,Machine Learning,Data Science",
        "description": "Analyze datasets and build ML models",
        "responsibilities": "Data cleaning, model training, visualization",
        "benefits": "Flexible hours, mentorship", "openings": 2,
        "scholarship_available": True, "min_cgpa": 3.2, "experience_level": "intermediate"
    },
    {
        "company": "DesignHub", "role": "UI/UX Design Intern", "stipend": 400, "mode": "offline",
        "is_paid": True, "location": "New York, NY", "duration": "3 months",
        "requirements": "Figma, Adobe XD", "skills_required": "UI/UX,Figma,Graphic Design",
        "description": "Design user interfaces for mobile and web apps",
        "responsibilities": "Wireframing, prototyping, user research",
        "benefits": "Portfolio building, networking", "openings": 2,
        "scholarship_available": False, "min_cgpa": 0, "experience_level": "beginner"
    },
    {
        "company": "MarketPro", "role": "Digital Marketing Intern", "stipend": 0, "mode": "hybrid",
        "is_paid": False, "location": "Austin, TX", "duration": "2 months",
        "requirements": "Social media savvy, creativity", "skills_required": "Marketing,Content Writing",
        "description": "Manage social media campaigns and content creation",
        "responsibilities": "Social posts, analytics, copywriting",
        "benefits": "Certificate, recommendation letter", "openings": 5,
        "scholarship_available": True, "min_cgpa": 2.5, "experience_level": "beginner"
    },
    {
        "company": "FinanceFlow", "role": "Business Analyst Intern", "stipend": 550, "mode": "online",
        "is_paid": True, "location": "Remote", "duration": "4 months",
        "requirements": "Excel, SQL, analytical skills", "skills_required": "Business Analysis,SQL,Excel",
        "description": "Analyze business metrics and create reports",
        "responsibilities": "Data analysis, reporting, presentations",
        "benefits": "Real business exposure, mentorship", "openings": 3,
        "scholarship_available": True, "min_cgpa": 3.3, "experience_level": "intermediate"
    },
    {
        "company": "CloudTech", "role": "DevOps Intern", "stipend": 650, "mode": "hybrid",
        "is_paid": True, "location": "Seattle, WA", "duration": "6 months",
        "requirements": "Linux, Docker, CI/CD basics", "skills_required": "DevOps,Docker,Kubernetes",
        "description": "Work on cloud infrastructure and deployment pipelines",
        "responsibilities": "Infrastructure setup, monitoring, automation",
        "benefits": "Cloud certifications, hands-on experience", "openings": 2,
        "scholarship_available": False, "min_cgpa": 0, "experience_level": "advanced"
    },
    {
        "company": "EduTech Solutions", "role": "Content Writer Intern", "stipend": 0, "mode": "online",
        "is_paid": False, "location": "Remote", "duration": "3 months",
        "requirements": "Strong writing skills, education background", "skills_required": "Content Writing,Research",
        "description": "Write educational content and blog posts",
        "responsibilities": "Blog writing, editing, research",
        "benefits": "Byline articles, certificate", "openings": 4,
        "scholarship_available": True, "min_cgpa": 2.8, "experience_level": "beginner"
    },
    {
        "company": "AI Innovations", "role": "Machine Learning Intern", "stipend": 700, "mode": "offline",
        "is_paid": True, "location": "Boston, MA", "duration": "6 months",
        "requirements": "Python, TensorFlow, PyTorch", "skills_required": "Python,Machine Learning,Deep Learning",
        "description": "Research and implement ML algorithms",
        "responsibilities": "Model development, experimentation, documentation",
        "benefits": "Research publication opportunity", "openings": 1,
        "scholarship_available": True, "min_cgpa": 3.5, "experience_level": "advanced"
    }
]

def create_internships():
    print("🚀 Seeding internship data...")
    created = 0
    for internship in internships:
        try:
            response = requests.post(f"{BASE_URL}/create", data=internship)
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    created += 1
                    print(f"✅ Created: {internship['role']} at {internship['company']}")
                else:
                    print(f"❌ Failed: {internship['role']} - {result.get('error', 'Unknown error')}")
            else:
                print(f"❌ HTTP {response.status_code}: {internship['role']}")
        except Exception as e:
            print(f"❌ Error creating {internship['role']}: {str(e)}")
    
    print(f"\n✨ Successfully created {created}/{len(internships)} internships!")
    
if __name__ == "__main__":
    print("EduIntern Seed Data Script")
    print("=" * 50)
    print("Make sure backend is running on http://localhost:8000")
    print()
    
    try:
        # Test connection
        response = requests.get(f"{BASE_URL}/filters/options")
        if response.status_code == 200:
            print("✅ Backend is reachable")
            create_internships()
        else:
            print(f"❌ Backend returned status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Is it running?")
        print("   Start it with: cd backend && python -m uvicorn app.main:app --reload")

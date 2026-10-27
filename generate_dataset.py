import numpy as np
import pandas as pd
import json
import random

# Set random seed for statistical reproducibility
np.random.seed(42)
random.seed(42)

NUM_STUDENTS = 520

specialisations = [
    'Business Analytics',
    'Finance',
    'Marketing',
    'Human Resource Management',
    'Operations & Supply Chain'
]
specialisation_weights = [0.22, 0.28, 0.26, 0.14, 0.10]

first_names_male = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
    'Shaurya', 'Atharv', 'Aryan', 'Kabir', 'Dhruv', 'Rohan', 'Harsh', 'Ansh', 'Karan', 'Manish',
    'Pranav', 'Devansh', 'Nikhil', 'Ayush', 'Rishabh', 'Shivam', 'Kartik', 'Tushar', 'Yash', 'Siddharth'
]
first_names_female = [
    'Saanvi', 'Aanya', 'Aadhya', 'Aaradhya', 'Ananya', 'Pari', 'Anika', 'Navya', 'Diya', 'Avani',
    'Myra', 'Sara', 'Isha', 'Riya', 'Shreya', 'Sneha', 'Tanvi', 'Kavya', 'Pooja', 'Meera',
    'Simran', 'Kriti', 'Bhavna', 'Disha', 'Nikita', 'Khushi', 'Aditi', 'Muskan', 'Sonali', 'Pallavi'
]
last_names = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kaur', 'Malhotra', 'Bhatia', 'Kapoor', 'Mehta', 'Chopra',
    'Jain', 'Agarwal', 'Kumar', 'Patel', 'Reddy', 'Nair', 'Chauhan', 'Saxena', 'Yadav', 'Mishra',
    'Bansal', 'Thakur', 'Goyal', 'Gill', 'Sandhu', 'Dhillon', 'Soni', 'Rathore', 'Garg', 'Chhabra'
]

companies_tier1 = ['Deloitte', 'Amazon', 'KPMG', 'EY India', 'Flipkart', 'PwC', 'Tata Neu', 'American Express']
companies_tier2 = ['HDFC Bank', 'ICICI Bank', 'Federal Bank', 'Wipro', 'ITC Limited', 'Asian Paints', 'Berger Paints']
companies_tier3 = ['Axis Bank', 'Zomato', 'Reliance Retail', 'Bandhan Bank', 'Genpact', 'TCS', 'Infosys']

records = []

for i in range(1, NUM_STUDENTS + 1):
    student_id = f"CU-MBA-2024-{i:03d}"
    gender = 'Female' if random.random() < 0.46 else 'Male'
    first_name = random.choice(first_names_female if gender == 'Female' else first_names_male)
    last_name = random.choice(last_names)
    full_name = f"{first_name} {last_name}"
    
    spec = np.random.choice(specialisations, p=specialisation_weights)
    
    # Latent student capability / diligence factor (-2 to +2)
    latent_ability = np.random.normal(0, 1)
    
    # Attendance percentage (52% to 99%)
    # Positive correlation with latent ability
    attendance = 78.0 + latent_ability * 8.5 + np.random.normal(0, 4.5)
    attendance = float(np.clip(attendance, 52.0, 99.0))
    
    # Undergrad graduation percentage
    grad_pct = 68.0 + latent_ability * 5.5 + np.random.normal(0, 4.0)
    grad_pct = float(np.clip(grad_pct, 50.0, 94.0))
    
    # MBA Semester marks (out of 100)
    # Influenced by latent ability, attendance, and undergrad background
    sem1 = 66.0 + latent_ability * 8.0 + (attendance - 75.0) * 0.18 + np.random.normal(0, 3.5)
    sem2 = sem1 + np.random.normal(0.8, 3.0)  # slight improvement trajectory
    sem3 = sem2 + np.random.normal(0.6, 2.8)
    
    sem1 = float(np.clip(sem1, 45.0, 97.0))
    sem2 = float(np.clip(sem2, 47.0, 98.0))
    sem3 = float(np.clip(sem3, 46.0, 99.0))
    
    avg_marks = (sem1 + sem2 + sem3) / 3.0
    overall_cgpa = round(avg_marks / 10.0, 2)
    
    # Grading System
    if overall_cgpa >= 9.0:
        grade = 'O'
    elif overall_cgpa >= 8.0:
        grade = 'A+'
    elif overall_cgpa >= 7.0:
        grade = 'A'
    elif overall_cgpa >= 6.0:
        grade = 'B+'
    elif overall_cgpa >= 5.0:
        grade = 'B'
    else:
        grade = 'C'
        
    # Aptitude and Soft Skills
    aptitude_score = 65.0 + latent_ability * 11.0 + np.random.normal(0, 6.0)
    aptitude_score = float(np.clip(aptitude_score, 38.0, 98.0))
    
    soft_skills_score = 6.8 + latent_ability * 1.1 + np.random.normal(0, 0.8)
    soft_skills_score = round(float(np.clip(soft_skills_score, 3.0, 9.8)), 1)
    
    # Certifications & Live projects
    cert_base_prob = [0.20, 0.35, 0.25, 0.12, 0.08]
    if latent_ability > 0.8:
        cert_base_prob = [0.05, 0.15, 0.35, 0.25, 0.20]
    certs_count = int(np.random.choice([0, 1, 2, 3, 4], p=cert_base_prob))
    
    live_projects = int(np.random.choice([0, 1, 2, 3], p=[0.25, 0.45, 0.22, 0.08]))
    
    # Performance Banding Logic
    if overall_cgpa >= 8.0 and attendance >= 80.0 and aptitude_score >= 70.0 and soft_skills_score >= 6.8:
        band = "Band 1: High Potential Star"
    elif overall_cgpa >= 6.7 and attendance >= 75.0 and aptitude_score >= 55.0:
        band = "Band 2: Placement Ready"
    elif overall_cgpa >= 6.0 and (soft_skills_score < 6.0 or aptitude_score < 55.0 or attendance < 75.0):
        band = "Band 3: Skill Deficit (Moderate Risk)"
    else:
        band = "Band 4: Critical Academic Intervention"
        
    # Placement Probability Modeling (Calibrated for ~82% placement rate)
    z_placement = (
        1.5
        + (overall_cgpa - 6.8) * 1.6
        + (attendance - 75.0) * 0.06
        + (aptitude_score - 65.0) * 0.05
        + (soft_skills_score - 6.5) * 0.7
        + certs_count * 0.45
        + live_projects * 0.35
    )
    
    # Specialisation industry demand adjustment
    spec_placement_adj = {
        'Business Analytics': 0.75,
        'Finance': 0.50,
        'Marketing': 0.30,
        'Operations & Supply Chain': 0.15,
        'Human Resource Management': -0.20
    }
    z_placement += spec_placement_adj[spec]
    
    prob_placed = 1.0 / (1.0 + np.exp(-z_placement))
    
    # Hard academic debarment / penalty rule: Attendance < 65% or CGPA < 5.2 severely limits placement eligibility
    if attendance < 65.0:
        prob_placed *= 0.35
    if overall_cgpa < 5.2:
        prob_placed *= 0.30
        
    is_placed = (random.random() < prob_placed)
    
    # Salary (CTC in LPA) Modeling
    if is_placed:
        placement_status = "Placed"
        # Base salary for placed candidate
        base_ctc = 4.8
        
        # Spec premium
        spec_salary_boost = {
            'Business Analytics': 2.5,
            'Finance': 1.8,
            'Marketing': 1.2,
            'Operations & Supply Chain': 0.9,
            'Human Resource Management': 0.4
        }
        
        # Econometric components
        salary = (
            base_ctc
            + spec_salary_boost[spec]
            + max(0, overall_cgpa - 6.0) * 0.92
            + max(0, aptitude_score - 55.0) * 0.058
            + max(0, soft_skills_score - 5.5) * 0.42
            + certs_count * 0.35
            + live_projects * 0.30
            + (attendance - 75.0) * 0.025
            + np.random.normal(0, 0.55)
        )
        salary_lpa = round(float(np.clip(salary, 4.5, 18.5)), 2)
        
        # Recruiter Tier & Company
        if salary_lpa >= 10.0:
            recruiter_tier = "Tier 1 (Marquee)"
            recruiter = random.choice(companies_tier1)
        elif salary_lpa >= 7.0:
            recruiter_tier = "Tier 2 (Super Dream)"
            recruiter = random.choice(companies_tier2)
        else:
            recruiter_tier = "Tier 3 (Dream)"
            recruiter = random.choice(companies_tier3)
    else:
        placement_status = "Unplaced"
        salary_lpa = 0.0
        recruiter_tier = "Not Placed"
        recruiter = "None"
        
    # Prescriptive Intervention Recommendation Engine
    if attendance < 72.0 and overall_cgpa < 6.2:
        intervention = "Urgent Academic Recovery: Mandatory Remedial Classes & Dean-Level Mentoring"
        intervention_category = "Academic & Attendance Recovery"
    elif attendance < 75.0:
        intervention = "Attendance Shortage Notice & Compensatory Weekend Tutorial Tracking"
        intervention_category = "Attendance Compliance"
    elif overall_cgpa >= 7.0 and soft_skills_score < 6.2:
        intervention = "Intensive Corporate GD-PI Workshop & Business Communication Lab"
        intervention_category = "Soft Skills & Employability"
    elif overall_cgpa >= 7.0 and aptitude_score < 62.0:
        intervention = "Quantitative Aptitude & Logical Reasoning Masterclass"
        intervention_category = "Aptitude Enhancement"
    elif overall_cgpa < 6.5 and certs_count == 0:
        intervention = "Domain Skill Accelerator: Mandatory Industry Certification (Coursera/NPTEL) & Project"
        intervention_category = "Domain Knowledge & Certifications"
    elif band == "Band 1: High Potential Star":
        intervention = "Marquee Placement Track: Executive Mentorship & Case Study Competition Drills"
        intervention_category = "High-Performer Acceleration"
    elif band == "Band 2: Placement Ready":
        intervention = "Targeted Mock Placement Drives & Industry Alignment Coaching"
        intervention_category = "Placement Polish"
    else:
        intervention = "Comprehensive Dual-Focus Plan: Academic Tutoring & Employability Mentorship"
        intervention_category = "Holistic Intervention"
        
    records.append({
        'student_id': student_id,
        'full_name': full_name,
        'gender': gender,
        'specialisation': spec,
        'graduation_percentage': round(grad_pct, 1),
        'attendance_percentage': round(attendance, 1),
        'mba_sem1_marks': round(sem1, 1),
        'mba_sem2_marks': round(sem2, 1),
        'mba_sem3_marks': round(sem3, 1),
        'overall_cgpa': overall_cgpa,
        'grade': grade,
        'aptitude_score': round(aptitude_score, 1),
        'soft_skills_score': soft_skills_score,
        'certifications_count': certs_count,
        'live_projects_count': live_projects,
        'performance_band': band,
        'placement_status': placement_status,
        'placement_salary_lpa': salary_lpa,
        'recruiter_company': recruiter,
        'recruiter_tier': recruiter_tier,
        'recommended_intervention': intervention,
        'intervention_category': intervention_category
    })

df = pd.DataFrame(records)

# Save to CSV
csv_path = "students_dataset.csv"
df.to_csv(csv_path, index=False)
print(f"Generated {len(df)} records to {csv_path}")

# Save to JavaScript file for zero-setup standalone web dashboard loading
js_path = "students_data.js"
with open(js_path, "w", encoding="utf-8") as f:
    f.write("// Chandigarh University MBA Student Performance & Placement Dataset\n")
    f.write("const STUDENTS_DATA = ")
    json.dump(records, f, indent=2)
    f.write(";\n")
print(f"Saved student data to {js_path}")

# Print high-level summary
print("\n--- Summary Statistics ---")
print(f"Total Cohort Size: {len(df)}")
placed_count = len(df[df['placement_status'] == 'Placed'])
placement_rate = (placed_count / len(df)) * 100
avg_salary = df[df['placement_status'] == 'Placed']['placement_salary_lpa'].mean()
highest_salary = df['placement_salary_lpa'].max()
print(f"Placement Rate: {placement_rate:.1f}% ({placed_count}/{len(df)})")
print(f"Average Placed Salary (CTC): Rs {avg_salary:.2f} LPA")
print(f"Highest Salary: Rs {highest_salary:.2f} LPA")
print("\nSpecialisation Breakdown:")
print(df.groupby('specialisation').agg(
    total=('student_id', 'count'),
    placed_pct=('placement_status', lambda x: (x == 'Placed').mean() * 100),
    avg_ctc=('placement_salary_lpa', lambda x: x[x > 0].mean())
).round(2))

print("\nPerformance Bands:")
print(df['performance_band'].value_counts())
